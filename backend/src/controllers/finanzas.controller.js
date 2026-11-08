const db = require('../config/db');
const { hoy } = require('../utils/reservas');

const redondear = (n) => Math.round(n * 100) / 100;

// Cada dueño ve las finanzas de sus propias cabañas; el superadmin ve el total.
const getResumen = async (req, res) => {
  const anioTexto = req.query.anio === undefined ? hoy().slice(0, 4) : String(req.query.anio);
  if (!/^\d{4}$/.test(anioTexto) || Number(anioTexto) < 2000 || Number(anioTexto) > 2100) {
    return res.status(400).json({ message: 'El año debe tener 4 dígitos (entre 2000 y 2100)' });
  }
  const anio = Number(anioTexto);
  const dueno = req.user.es_superadmin ? null : req.user.id;

  try {
    const [estados, meses, cabanas] = await Promise.all([
      // Totales por estado e ingresos del año
      db.query(
        `SELECT
           COALESCE(SUM(r.precio_total) FILTER (WHERE r.estado IN ('confirmada', 'completada')), 0)::float AS ingresos_totales,
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

      // Ingresos de los 12 meses (los meses sin reservas salen en cero)
      db.query(
        `SELECT m AS mes,
                COALESCE(SUM(x.precio_total), 0)::float AS ingresos,
                COUNT(x.id)::int AS reservas
         FROM generate_series(1, 12) AS m
         LEFT JOIN (
           SELECT r.id, r.precio_total, r.fecha_checkin
           FROM reserva r
           JOIN cabana c ON c.id = r.cabana_id
           WHERE r.estado IN ('confirmada', 'completada')
             AND r.fecha_checkin >= make_date($1::int, 1, 1)
             AND r.fecha_checkin <  make_date($1::int + 1, 1, 1)
             AND ($2::int IS NULL OR c.admin_id = $2)
         ) x ON EXTRACT(MONTH FROM x.fecha_checkin) = m
         GROUP BY m
         ORDER BY m`,
        [anio, dueno]
      ),

      // Ocupación por cabaña: reservas, noches ocupadas e ingresos del año
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
          AND r.estado IN ('confirmada', 'completada')
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
    const reservasConIngreso = e.confirmadas + e.completadas;
    const totalReservas = e.pendientes + e.confirmadas + e.completadas + e.canceladas;
    const ingresosTotales = redondear(e.ingresos_totales);

    const ocupacionGeneral = cabanas.rows.length > 0
      ? redondear(cabanas.rows.reduce((acc, c) => acc + c.ocupacion_pct, 0) / cabanas.rows.length)
      : 0;

    res.json({
      anio,
      alcance: dueno === null ? 'todas' : 'propias',
      indicadores: {
        ingresos_totales: ingresosTotales,
        reservas_con_ingreso: reservasConIngreso,
        ingreso_promedio: reservasConIngreso > 0 ? redondear(ingresosTotales / reservasConIngreso) : 0,
        ocupacion_general_pct: ocupacionGeneral
      },
      estados: {
        pendientes: e.pendientes,
        confirmadas: e.confirmadas,
        completadas: e.completadas,
        canceladas: e.canceladas,
        tasa_cancelacion_pct: totalReservas > 0 ? redondear((e.canceladas * 100) / totalReservas) : 0
      },
      ingresos_por_mes: meses.rows,
      ocupacion_por_cabana: cabanas.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

module.exports = { getResumen };
