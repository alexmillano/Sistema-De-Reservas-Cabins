// Fecha de hoy en Argentina (AAAA-MM-DD), sin depender de la zona horaria de la PC
export const hoyArgentina = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

export const contarNoches = (desde, hasta) => {
  if (!desde || !hasta) return 0;
  const noches = (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000;
  return Number.isFinite(noches) && noches > 0 ? noches : 0;
};

// '2027-02-10' -> '10/02/2027' (sin pasar por Date, para que la zona horaria no corra el día)
export const formatearFechaCorta = (iso) => {
  if (!iso) return '';
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
};
// Fecha máxima de nacimiento para ser mayor de 18 años hoy (AAAA-MM-DD)
export const maxNacimiento = () => {
  const h = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${h.getFullYear() - 18}-${p(h.getMonth() + 1)}-${p(h.getDate())}`;
};
