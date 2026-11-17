import { formatearPrecio } from '../utils/formato';

// Subtotal de alojamiento, tarifa de servicio (línea aparte) y total a pagar
export default function ResumenTotales({ subtotal, tarifa, pct, total, etiquetaTotal = 'Total' }) {
  return (
    <>
      <div className="linea-resumen">
        <span>Subtotal alojamiento</span>
        <span>{formatearPrecio(subtotal)}</span>
      </div>
      <div className="linea-resumen">
        <span>Tarifa de servicio ({pct}%)</span>
        <span>{formatearPrecio(tarifa)}</span>
      </div>
      <div className="linea-resumen total">
        <span>{etiquetaTotal}</span>
        <strong>{formatearPrecio(total)}</strong>
      </div>
    </>
  );
}
