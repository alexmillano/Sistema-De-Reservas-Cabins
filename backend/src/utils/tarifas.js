// Porcentajes vigentes. Cada reserva guarda el que se usó al pagarla.
const COMISION_PCT = 10;          // se descuenta al dueño sobre el alojamiento
const TARIFA_SERVICIO_PCT = 5;    // se suma al pago del huésped, como línea aparte

const redondear = (n) => Math.round(n * 100) / 100;
const montoDe = (base, pct) => redondear((base * pct) / 100);

module.exports = { COMISION_PCT, TARIFA_SERVICIO_PCT, redondear, montoDe };
