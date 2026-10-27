// Una cabaña es visible si está activa y su admin no está suspendido.
// Se usa en las consultas donde la tabla cabana tiene el alias "c".
const CABANA_VISIBLE = `(c.activa = TRUE AND NOT EXISTS (
  SELECT 1 FROM admin a WHERE a.id = c.admin_id AND a.baneado = TRUE
))`;

module.exports = { CABANA_VISIBLE };