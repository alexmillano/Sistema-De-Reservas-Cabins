// Valida formato AAAA-MM-DD y que la fecha exista (rechaza 2026-02-31)
const esFechaValida = (valor) => {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !isNaN(fecha) && fecha.toISOString().slice(0, 10) === valor;
};

// Fecha de hoy en Argentina (AAAA-MM-DD), sin depender de la zona horaria del servidor
const hoy = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

// true si la cabaña ya tiene una reserva activa que se superpone con el rango.
// Dos rangos se superponen si: inicio_existente < fin_nuevo Y fin_existente > inicio_nuevo
// (el día de check-out queda libre para el siguiente huésped).
// "executor" puede ser el pool (db) o un client dentro de una transacción.
const estaOcupada = async (executor, cabanaId, checkin, checkout, excluirReservaId = null) => {
  const result = await executor.query(
    `SELECT 1 FROM reserva
     WHERE cabana_id = $1
       AND estado IN ('pendiente', 'confirmada')
       AND fecha_checkin < $3
       AND fecha_checkout > $2
       AND ($4::int IS NULL OR id <> $4)
     LIMIT 1`,
    [cabanaId, checkin, checkout, excluirReservaId]
  );
  return result.rows.length > 0;
};

module.exports = { esFechaValida, hoy, estaOcupada };