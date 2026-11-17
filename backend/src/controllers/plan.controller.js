const db = require('../config/db');
const {
  PLANES, DIAS_PLAN, HOY, JOIN_PLAN, evaluarRequisitos, leerCabanaConPlan
} = require('../utils/planes');

const DEFINICIONES = Object.values(PLANES).map((p) => ({
  clave: p.clave,
  nombre: p.nombre,
  precio: p.precio,
  dias: p.precio > 0 ? DIAS_PLAN : null,
  min_valoracion: p.minValoracion ?? null,
  min_calificaciones: p.minCalificaciones ?? null
}));

// Arma lo que ve el dueño de una cabaña: plan contratado, plan que se muestra hoy y si puede contratar cada uno
const describirCabana = (c, hoy) => {
  const contratado = c.plan_contratado;
  const evaluacion = contratado ? evaluarRequisitos(contratado, c) : null;
  const dias = contratado
    ? Math.round((new Date(`${c.vencimiento}T00:00:00Z`) - new Date(`${hoy}T00:00:00Z`)) / 86400000)
    : null;

  return {
    id: c.id,
    nombre: c.nombre,
    imagen_url: c.imagen_url,
    activa: c.activa,
    valoracion: c.valoracion,
    total_calificaciones: c.total,
    reclamos_sin_responder: c.reclamos_sin_responder,
    plan_contratado: contratado,
    vence: c.vencimiento || null,
    dias_restantes: dias,
    estado: !contratado ? 'sin_plan' : evaluacion.ok ? 'activo' : 'pausado',
    plan_actual: contratado && evaluacion.ok ? contratado : 'free',
    motivo_pausa: evaluacion && !evaluacion.ok ? evaluacion.motivo : '',
    puede: {
      plus: evaluarRequisitos('plus', c),
      premium: evaluarRequisitos('premium', c)
    }
  };
};

// ---------- DUEÑO: sus cabañas con el estado de cada plan ----------
const getMisPlanes = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.id, c.nombre, c.imagen_url, c.activa,
              ROUND(COALESCE(AVG(cal.puntaje), 0), 1)::float AS valoracion,
              COUNT(cal.id)::int AS total,
              (SELECT COUNT(*)::int FROM reclamo rc JOIN reserva rr ON rr.id = rc.reserva_id
                WHERE rr.cabana_id = c.id AND rc.estado = 'nuevo') AS reclamos_sin_responder,
              pa.plan AS plan_contratado, pa.inicio, pa.vencimiento,
              to_char(${HOY}, 'YYYY-MM-DD') AS hoy
       FROM cabana c
       LEFT JOIN calificacion cal ON cal.cabana_id = c.id
       ${JOIN_PLAN}
       WHERE c.admin_id = $1
       GROUP BY c.id, pa.plan, pa.inicio, pa.vencimiento
       ORDER BY c.nombre`,
      [req.user.id]
    );
    res.json({
      planes: DEFINICIONES,
      cabanas: result.rows.map((c) => describirCabana(c, c.hoy))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// ---------- DUEÑO: contratar, cambiar o renovar el plan de una cabaña (pago simulado) ----------
const contratarPlan = async (req, res) => {
  const { id } = req.params;
  const { plan } = req.body || {};

  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ message: 'El id debe ser un número entero' });
  }
  if (!['plus', 'premium'].includes(plan)) {
    return res.status(400).json({ message: 'El plan debe ser plus o premium' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    // Se bloquea la cabaña: dos clics seguidos no pueden cobrar dos veces
    const propia = await client.query(
      'SELECT id FROM cabana WHERE id = $1 AND admin_id = $2 FOR UPDATE',
      [id, req.user.id]
    );
    if (propia.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Cabaña no encontrada' });
    }

    const cab = await leerCabanaConPlan(client, id);
    if (!cab.activa) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'La cabaña está desactivada. Activala para contratar un plan' });
    }

    const requisitos = evaluarRequisitos(plan, cab);
    if (!requisitos.ok) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: `No cumple los requisitos del plan ${PLANES[plan].nombre}. ${requisitos.motivo}` });
    }

    let renovacion = false;
    let nueva;
    if (cab.plan_contratado === plan) {
      // Mismo plan: se extiende desde el vencimiento actual
      renovacion = true;
      nueva = await client.query(
        `INSERT INTO plan_cabana (cabana_id, plan, precio, inicio, vencimiento)
         VALUES ($1, $2, $3, $4::date, $4::date + $5::int)
         RETURNING to_char(inicio, 'YYYY-MM-DD') AS inicio, to_char(vencimiento, 'YYYY-MM-DD') AS vencimiento`,
        [id, plan, PLANES[plan].precio, cab.vencimiento, DIAS_PLAN]
      );
    } else {
      // Otro plan: el vigente se cierra y el nuevo arranca hoy
      if (cab.plan_contratado) {
        await client.query(
          `UPDATE plan_cabana SET vencimiento = ${HOY} - 1
           WHERE cabana_id = $1 AND inicio <= ${HOY} AND vencimiento >= ${HOY}`,
          [id]
        );
      }
      nueva = await client.query(
        `INSERT INTO plan_cabana (cabana_id, plan, precio, inicio, vencimiento)
         VALUES ($1, $2, $3, ${HOY}, ${HOY} + $4::int)
         RETURNING to_char(inicio, 'YYYY-MM-DD') AS inicio, to_char(vencimiento, 'YYYY-MM-DD') AS vencimiento`,
        [id, plan, PLANES[plan].precio, DIAS_PLAN]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({
      message: `${renovacion ? 'Plan renovado' : 'Plan contratado'}: ${PLANES[plan].nombre} para "${cab.nombre}"`,
      plan,
      precio: PLANES[plan].precio,
      inicio: nueva.rows[0].inicio,
      vencimiento: nueva.rows[0].vencimiento
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  } finally {
    client.release();
  }
};

module.exports = { getMisPlanes, contratarPlan };
