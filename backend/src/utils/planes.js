// Planes de visibilidad. Los precios y requisitos viven solo acá (el cliente nunca los manda).
const DIAS_PLAN = 30;
const PLANES = {
  free:    { clave: 'free',    nombre: 'Free',    precio: 0,     nivel: 1 },
  plus:    { clave: 'plus',    nombre: 'Plus',    precio: 15000, nivel: 2, minValoracion: 3.7 },
  premium: { clave: 'premium', nombre: 'Premium', precio: 30000, nivel: 3, minValoracion: 4.3, minCalificaciones: 5 }
};

const num = (n) => Number(n).toFixed(1).replace('.', ',');

// ¿La cabaña cumple los requisitos del plan? m = { valoracion, total, reclamos_sin_responder }
// Plus: promedio mínimo (una cabaña sin calificaciones todavía puede entrar).
// Premium: promedio mínimo, calificaciones suficientes y sin reclamos sin responder.
const evaluarRequisitos = (plan, m) => {
  if (plan === 'plus') {
    const ok = m.total === 0 || m.valoracion >= PLANES.plus.minValoracion;
    return { ok, motivo: ok ? '' : `Su promedio (${num(m.valoracion)}) está por debajo de ${num(PLANES.plus.minValoracion)}` };
  }
  if (plan === 'premium') {
    const faltas = [];
    if (m.total < PLANES.premium.minCalificaciones) {
      faltas.push(`necesita al menos ${PLANES.premium.minCalificaciones} calificaciones (tiene ${m.total})`);
    }
    if (m.valoracion < PLANES.premium.minValoracion) {
      faltas.push(`necesita un promedio de ${num(PLANES.premium.minValoracion)} o más (tiene ${num(m.valoracion)})`);
    }
    if (m.reclamos_sin_responder > 0) {
      faltas.push(`tiene ${m.reclamos_sin_responder} ${m.reclamos_sin_responder === 1 ? 'reclamo' : 'reclamos'} sin responder`);
    }
    const motivo = faltas.join('; ');
    return { ok: faltas.length === 0, motivo: motivo ? motivo.charAt(0).toUpperCase() + motivo.slice(1) : '' };
  }
  return { ok: true, motivo: '' };
};

// ---- Fragmentos de SQL (la tabla cabana tiene el alias "c" y calificacion el alias "cal") ----
const HOY = "(NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date";

// Plan contratado y vigente hoy (el que vence más tarde)
const JOIN_PLAN = `LEFT JOIN LATERAL (
  SELECT pc.plan, to_char(pc.inicio, 'YYYY-MM-DD') AS inicio, to_char(pc.vencimiento, 'YYYY-MM-DD') AS vencimiento
  FROM plan_cabana pc
  WHERE pc.cabana_id = c.id AND pc.inicio <= ${HOY} AND pc.vencimiento >= ${HOY}
  ORDER BY pc.vencimiento DESC LIMIT 1
) pa ON TRUE`;

const RECLAMOS_SIN_RESPONDER = `(SELECT COUNT(*)::int FROM reclamo rc JOIN reserva rr ON rr.id = rc.reserva_id
  WHERE rr.cabana_id = c.id AND rc.estado = 'nuevo')`;

// Plan con el que se muestra la cabaña hoy: si no cumple los requisitos, el plan se pausa y sale como free
const PLAN_EFECTIVO = `(CASE
  WHEN pa.plan = 'premium'
       AND COUNT(cal.id) >= ${PLANES.premium.minCalificaciones}
       AND ROUND(AVG(cal.puntaje), 1) >= ${PLANES.premium.minValoracion}
       AND ${RECLAMOS_SIN_RESPONDER} = 0 THEN 'premium'
  WHEN pa.plan = 'plus'
       AND (COUNT(cal.id) = 0 OR ROUND(AVG(cal.puntaje), 1) >= ${PLANES.plus.minValoracion}) THEN 'plus'
  ELSE 'free' END)`;

const PLAN_NIVEL = `(CASE ${PLAN_EFECTIVO} WHEN 'premium' THEN 3 WHEN 'plus' THEN 2 ELSE 1 END)`;

// Métricas de una cabaña y su plan vigente (para evaluar requisitos y avisar)
const leerCabanaConPlan = async (executor, cabanaId) => {
  const r = await executor.query(
    `SELECT c.id, c.nombre, c.admin_id, c.activa,
            ROUND(COALESCE(AVG(cal.puntaje), 0), 1)::float AS valoracion,
            COUNT(cal.id)::int AS total,
            ${RECLAMOS_SIN_RESPONDER} AS reclamos_sin_responder,
            pa.plan AS plan_contratado, pa.inicio, pa.vencimiento
     FROM cabana c
     LEFT JOIN calificacion cal ON cal.cabana_id = c.id
     ${JOIN_PLAN}
     WHERE c.id = $1
     GROUP BY c.id, pa.plan, pa.inicio, pa.vencimiento`,
    [cabanaId]
  );
  return r.rows[0] || null;
};

// Si el plan vigente de la cabaña dejó de cumplir los requisitos, avisa una vez al dueño.
// Va dentro de un SAVEPOINT: si algo falla, no arruina la operación principal.
const avisarPlanPausado = async (client, cabanaId) => {
  await client.query('SAVEPOINT aviso_plan');
  try {
    const cab = await leerCabanaConPlan(client, cabanaId);
    if (cab && cab.plan_contratado && cab.admin_id) {
      const { ok, motivo } = evaluarRequisitos(cab.plan_contratado, cab);
      if (!ok) {
        const mensaje = `El plan ${PLANES[cab.plan_contratado].nombre} de "${cab.nombre}" está pausado: ${motivo}. Se muestra como Free hasta que lo recuperes.`.slice(0, 500);
        const yaAvisado = await client.query(
          `SELECT 1 FROM notificacion WHERE admin_id = $1 AND tipo = 'plan' AND mensaje = $2 AND leida = FALSE`,
          [cab.admin_id, mensaje]
        );
        if (yaAvisado.rows.length === 0) {
          await client.query(`INSERT INTO notificacion (admin_id, tipo, mensaje) VALUES ($1, 'plan', $2)`, [cab.admin_id, mensaje]);
        }
      }
    }
    await client.query('RELEASE SAVEPOINT aviso_plan');
  } catch (error) {
    console.error('No se pudo evaluar el aviso de plan:', error.message);
    await client.query('ROLLBACK TO SAVEPOINT aviso_plan');
  }
};

module.exports = {
  PLANES, DIAS_PLAN, HOY, JOIN_PLAN, PLAN_EFECTIVO, PLAN_NIVEL,
  evaluarRequisitos, leerCabanaConPlan, avisarPlanPausado
};
