const formatoPesos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0
});

export const formatearPrecio = (valor) => formatoPesos.format(valor);

// 4.6 -> ★★★★★ (se redondea al entero más cercano)
export const estrellas = (valoracion) => {
  const llenas = Math.min(5, Math.max(0, Math.round(valoracion)));
  return '★'.repeat(llenas) + '☆'.repeat(5 - llenas);
};