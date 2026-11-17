const db = require('../config/db');
const { hoy } = require('../utils/reservas');
const { paginar } = require('../utils/paginacion');
const { HOY, JOIN_PLAN, PLANES, evaluarRequisitos, leerCabanaConPlan } = require('../utils/planes');

const redondear = (n) => Math.round(n * 100) / 100;
const CON_INGRESO = "('confirmada', 'completada')";
// Fecha (en Argentina) en que se pagó el plan
const FECHA_COMPRA = "((pc.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Argentina/Buenos_Aires')::date";

// Devuelve el año pedido (o el actual), o null si no es válido
const leerAnio = (query) => {
  const texto = query.anio === undefined ? hoy().slice(0, 4) : String(query.anio);
  if (!/^\d{4}$/.test(texto) || Number(texto) < 2000 || Number(texto) > 2100) return null;
  return Number(texto);
};
const MENSAJE_ANIO = 'El año debe tener 4 dígitos (entre 2000 y 2100)';

// El dueño ve solo lo suyo: lo que le entra, la comisión y el plan. La tarifa de servicio
// es del superadmin y no se le envía. El superadmin ve todo en detalle.
const getResumen = async (req, res) => {
  const anio = leerAnio(req.query);
  if (anio === null) return res.status(400).json({ message: MENSAJE_ANIO });

  const esSuper = Boolean(req.user.es_superadmin);
  const dueno = esSuper ? null : req.user.id;

  try {
    const [estados, meses, planesMes, cabanas] = await Promise.all([
      db.query(
        `SELECT
           COALESCE(SUM(r.precio_total) FILTER (WHERE r.estado IN ${CON_INGRESO}), 0)::float AS alojamiento,
           COALESCE(SUM(r.comision_monto) FILTER (WHERE r.estado IN ${CON_INGRESO}), 0)::float AS comisiones,
           COALESCE(SUM(r.tarifa_servicio_monto) FILTER (WHERE r.estado IN ${CON_INGRESO}), 0)::float AS tarifas,
           COUNT(*) FILTER (WHERE r.estado = 'pendiente')::int  AS pendientes,
           COUNT(*) FILTER (WHERE r.estado = 'confirmada')::int AS confirmadas,
           COUNT(*) FILTER (WHERE r.estado = 'completada')::int AS completadas,
           COUNT(*) FILTER (WHERE r.estado = 'cancelada')::int  AS canceladas
         FROM reserva r
         JOIN cabana c ON c.id = r.cabana_id
         WHERE r.fecha_checkin >= make_date($1::int, 1, 1)
           AND r.fecha_checkin <  make_date($1::int + 1, 1, 1)
           AND ($2::int IS NULL OR c.admin_id = $2)`,
        [anio, dueno]
      ),

      // Por mes (cada reserva suma en el mes de su check-in); los meses sin reservas salen en cero
      db.query(
        `SELECT m AS mes,
                COALESCE(SUM(x.precio_total), 0)::float AS alojamiento,
                COALESCE(SUM(x.comision_monto), 0)::float AS comisiones,
                COALESCE(SUM(x.tarifa_servicio_monto), 0)::float AS tarifas,
                COUNT(x.id)::int AS reservas
         FROM generate_series(1, 12) AS m
         LEFT JOIN (
           SELECT r.id, r.precio_total, r.comision_monto, r.tarifa_servicio_monto, r.fecha_checkin
           FROM reserva r
           JOIN cabana c ON c.id = r.cabana_id
           WHERE r.estado IN ${CON_INGRESO}
             AND r.fecha_checkin >= make_date($1::int, 1, 1)
             AND r.fecha_checkin <  make_date($1::int + 1, 1, 1)
             AND ($2::int IS NULL OR c.admin_id = $2)
         ) x ON EXTRACT(MONTH FROM x.fecha_checkin) = m
         GROUP BY m
         ORDER BY m`,
        [anio, dueno]
      ),

      // Planes pagados por mes (en el mes de la compra)
      db.query(
        `SELECT EXTRACT(MONTH FROM ${FECHA_COMPRA})::int AS mes, SUM(pc.precio)::float AS total
         FROM plan_cabana pc
         JOIN cabana c ON c.id = pc.cabana_id
         WHERE ${FECHA_COMPRA} >= make_date($1::int, 1, 1)
           AND ${FECHA_COMPRA} <  make_date($1::int + 1, 1, 1)
           AND ($2::int IS NULL OR c.admin_id = $2)
         GROUP BY 1`,
        [anio, dueno]
      ),

      db.query(
        `SELECT c.id AS cabana_id, c.nombre,
                l.nombre AS localidad, p.nombre AS provincia,
                COUNT(r.id)::int AS reservas,
                COALESCE(SUM(r.fecha_checkout - r.fecha_checkin), 0)::int AS noches_reservadas,
                COALESCE(SUM(r.precio_total), 0)::float AS ingresos,
                ROUND(
                  COALESCE(SUM(r.fecha_checkout - r.fecha_checkin), 0) * 100.0
                  / (make_date($1::int + 1, 1, 1) - make_date($1::int, 1, 1)),
                1)::float AS ocupacion_pct
         FROM cabana c
         JOIN localidad l ON c.localidad_id = l.id
         JOIN provincia p ON l.provincia_id = p.id
         LEFT JOIN reserva r
           ON r.cabana_id = c.id
          AND r.estado IN ${CON_INGRESO}
          AND r.fecha_checkin >= make_date($1::int, 1, 1)
          AND r.fecha_checkin <  make_date($1::int + 1, 1, 1)
         WHERE ($2::int IS NULL OR c.admin_id = $2)
         GROUP BY c.id, l.id, p.id
         HAVING c.activa = TRUE OR COUNT(r.id) > 0
         ORDER BY reservas DESC, c.nombre`,
        [anio, dueno]
      )
    ]);

    const e = estados.rows[0];
    const planPorMes = Object.fromEntries(planesMes.rows.map((f) => [f.mes, f.total]));
    const planesTotal = redondear(planesMes.rows.reduce((acc, f) => acc + f.total, 0));
    const reservasConIngreso = e.confirmadas + e.completadas;
    const totalReservas = e.pendientes + e.confirmadas + e.completadas + e.canceladas;
    const alojamiento = redondear(e.alojamiento);
    const comisiones = redondear(e.comisiones);
    const ocupacionGeneral = cabanas.rows.length > 0
      ? redondear(cabanas.rows.reduce((acc, c) => acc + c.ocupacion_pct, 0) / cabanas.rows.length)
      : 0;

    const respuesta = {
      anio,
      alcance: esSuper ? 'todas' : 'propias',
      estados: {
        pendientes: e.pendientes,
        confirmadas: e.confirmadas,
        completadas: e.completadas,
        canceladas: e.canceladas,
        tasa_cancelacion_pct: totalReservas > 0 ? redondear((e.canceladas * 100) / totalReservas) : 0
      },
      ocupacion_por_cabana: cabanas.rows
    };

    if (!esSuper) {
      // ---- Dueño: ingresa el alojamiento; egresan la comisión y el plan ----
      const planesPorCabana = await db.query(
        `SELECT c.id AS cabana_id, c.nombre, COALESCE(pa.plan, 'free') AS plan,
                COALESCE((SELECT SUM(pc.precio) FROM plan_cabana pc
                          WHERE pc.cabana_id = c.id
                            AND ${FECHA_COMPRA} >= make_date($1::int, 1, 1)
                            AND ${FECHA_COMPRA} <  make_date($1::int + 1, 1, 1)), 0)::float AS gasto
         FROM cabana c
         ${JOIN_PLAN}
         WHERE c.admin_id = $2
         ORDER BY c.nombre`,
        [anio, dueno]
      );

      respuesta.indicadores = {
        ingresos_totales: alojamiento,
        comisiones_totales: comisiones,
        planes_total: planesTotal,
        resultado_neto: redondear(alojamiento - comisiones - planesTotal),
        reservas_con_ingreso: reservasConIngreso,
        ingreso_promedio: reservasConIngreso > 0 ? redondear(alojamiento / reservasConIngreso) : 0,
        ocupacion_general_pct: ocupacionGeneral
      };
      respuesta.ingresos_por_mes = meses.rows.map((f) => ({ mes: f.mes, ingresos: f.alojamiento, reservas: f.reservas }));
      respuesta.planes_por_cabana = planesPorCabana.rows;
      return res.json(respuesta);
    }

    // ---- Superadmin: todo en detalle ----
    const tarifas = redondear(e.tarifas);
    const [planesDetalle, porDueno] = await Promise.all([
      db.query(
        `SELECT pc.id, pc.plan, pc.precio::float AS precio, c.id AS cabana_id, c.nombre AS cabana,
                a.nombre AS dueno_nombre, a.apellido AS dueno_apellido,
                to_char(pc.inicio, 'YYYY-MM-DD') AS inicio,
                to_char(pc.vencimiento, 'YYYY-MM-DD') AS vencimiento,
                to_char(${FECHA_COMPRA}, 'YYYY-MM-DD') AS comprado,
                CASE WHEN pc.vencimiento < ${HOY} THEN 'vencido'
                     WHEN pc.inicio > ${HOY} THEN 'programado'
                     ELSE 'vigente' END AS estado
         FROM plan_cabana pc
         JOIN cabana c ON c.id = pc.cabana_id
         LEFT JOIN admin a ON a.id = c.admin_id
         WHERE ${FECHA_COMPRA} >= make_date($1::int, 1, 1)
           AND ${FECHA_COMPRA} <  make_date($1::int + 1, 1, 1)
         ORDER BY pc.created_at DESC, pc.id DESC
         LIMIT 200`,
        [anio]
      ),
      db.query(
        `SELECT a.id, a.nombre, a.apellido, a.usuario,
                (SELECT COUNT(*)::int FROM cabana c WHERE c.admin_id = a.id) AS cabanas,
                COALESCE(rr.reservas, 0)::int AS reservas,
                COALESCE(rr.alojamiento, 0)::float AS alojamiento,
                COALESCE(rr.comision, 0)::float AS comision,
                COALESCE(pp.planes, 0)::float AS planes
         FROM admin a
         LEFT JOIN LATERAL (
           SELECT COUNT(*) AS reservas, SUM(r.precio_total) AS alojamiento, SUM(r.comision_monto) AS comision
           FROM reserva r JOIN cabana c ON c.id = r.cabana_id
           WHERE c.admin_id = a.id AND r.estado IN ${CON_INGRESO}
             AND r.fecha_checkin >= make_date($1::int, 1, 1)
             AND r.fecha_checkin <  make_date($1::int + 1, 1, 1)
         ) rr ON TRUE
         LEFT JOIN LATERAL (
           SELECT SUM(pc.precio) AS planes
           FROM plan_cabana pc JOIN cabana c ON c.id = pc.cabana_id
           WHERE c.admin_id = a.id
             AND ${FECHA_COMPRA} >= make_date($1::int, 1, 1)
             AND ${FECHA_COMPRA} <  make_date($1::int + 1, 1, 1)
         ) pp ON TRUE
         WHERE a.es_superadmin = FALSE
         ORDER BY alojamiento DESC, a.nombre`,
        [anio]
      )
    ]);

    // Los planes vigentes se marcan "pausado" si la cabaña ya no cumple los requisitos
    const planes = [];
    for (const p of planesDetalle.rows) {
      let estado = p.estado;
      if (estado === 'vigente') {
        const cab = await leerCabanaConPlan(db, p.cabana_id);
        if (cab && !evaluarRequisitos(p.plan, cab).ok) estado = 'pausado';
      }
      planes.push({ ...p, estado });
    }
    const resumenPlanes = ['plus', 'premium'].map((clave) => {
      const delPlan = planes.filter((p) => p.plan === clave);
      return {
        plan: clave,
        nombre: PLANES[clave].nombre,
        compras: delPlan.length,
        vigentes: delPlan.filter((p) => p.estado === 'vigente' || p.estado === 'pausado').length,
        ingresos: redondear(delPlan.reduce((acc, p) => acc + p.precio, 0))
      };
    });

    respuesta.indicadores = {
      total_reservas: totalReservas,
      reservas_con_ingreso: reservasConIngreso,
      ingresos_totales: alojamiento,
      comisiones_totales: comisiones,
      tarifas_totales: tarifas,
      planes_total: planesTotal,
      ingresos_plataforma: redondear(comisiones + tarifas + planesTotal),
      cobrado_huespedes: redondear(alojamiento + tarifas),
      pagos_a_duenos: redondear(alojamiento - comisiones),
      ingreso_promedio: reservasConIngreso > 0 ? redondear(alojamiento / reservasConIngreso) : 0,
      ocupacion_general_pct: ocupacionGeneral
    };
    // Lo que gana la plataforma cada mes: comisión + tarifa + planes cobrados
    respuesta.ingresos_por_mes = meses.rows.map((f) => ({
      mes: f.mes,
      ingresos: redondear(f.comisiones + f.tarifas + (planPorMes[f.mes] || 0)),
      reservas: f.reservas
    }));
    respuesta.planes_detalle = planes;
    respuesta.resumen_planes = resumenPlanes;
    respuesta.por_dueno = porDueno.rows;
    res.json(respuesta);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// ---------- SUPERADMIN: detalle de cada reserva del año (paginado) ----------
const getDetalleReservas = async (req, res) => {
  const anio = leerAnio(req.query);
  if (anio === null) return res.status(400).json({ message: MENSAJE_ANIO });
  const { pagina, limite, offset } = paginar(req.query);

  try {
    const filtro = `r.fecha_checkin >= make_date($1::int, 1, 1) AND r.fecha_checkin < make_date($1::int + 1, 1, 1)`;
    const total = await db.query(`SELECT COUNT(*)::int AS total FROM reserva r WHERE ${filtro}`, [anio]);
    const result = await db.query(
      `SELECT r.id, r.estado,
              to_char(r.fecha_checkin, 'YYYY-MM-DD') AS fecha_checkin,
              to_char(r.fecha_checkout, 'YYYY-MM-DD') AS fecha_checkout,
              u.nombre AS huesped_nombre, u.apellido AS huesped_apellido,
              c.nombre AS cabana, a.nombre AS dueno_nombre, a.apellido AS dueno_apellido,
              r.precio_total::float AS alojamiento,
              r.comision_pct::float AS comision_pct, r.comision_monto::float AS comision,
              r.tarifa_servicio_pct::float AS tarifa_pct, r.tarifa_servicio_monto::float AS tarifa,
              (r.precio_total + r.tarifa_servicio_monto)::float AS total_cobrado
       FROM reserva r
       JOIN usuario u ON u.id = r.usuario_id
       JOIN cabana c ON c.id = r.cabana_id
       LEFT JOIN admin a ON a.id = c.admin_id
       WHERE ${filtro}
       ORDER BY r.fecha_checkin DESC, r.id DESC
       LIMIT $2 OFFSET $3`,
      [anio, limite, offset]
    );
    res.json({ anio, total: total.rows[0].total, pagina, limite, reservas: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

module.exports = { getResumen, getDetalleReservas };
