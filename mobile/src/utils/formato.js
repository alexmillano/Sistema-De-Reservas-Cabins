// "$ 61.000" sin depender de Intl (más seguro en celulares)
export const formatearPrecio = (valor) => {
  const n = Math.round(Number(valor) || 0);
  return '$ ' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export const estrellas = (valoracion) => {
  const llenas = Math.min(5, Math.max(0, Math.round(Number(valoracion) || 0)));
  return '★'.repeat(llenas) + '☆'.repeat(5 - llenas);
};

export const formatearFecha = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
};
