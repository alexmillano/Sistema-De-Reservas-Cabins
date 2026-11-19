// Argentina no tiene horario de verano: siempre UTC-3. Se calcula a mano para no depender de Intl.
export const hoyArgentina = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);

export const contarNoches = (desde, hasta) => {
  if (!desde || !hasta) return 0;
  const n = (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000;
  return Number.isFinite(n) && n > 0 ? n : 0;
};

// '2027-02-10' -> '10/02/2027'
export const formatearFechaCorta = (iso) => {
  if (!iso) return '';
  const [anio, mes, dia] = String(iso).slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
};

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const aIso = (anio, mes, dia) =>
  `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

// mm:ss de una cuenta regresiva
export const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
