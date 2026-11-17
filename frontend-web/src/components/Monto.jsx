import { formatearPrecio } from '../utils/formato';

// Plata con color: verde lo que entra al bolsillo, rojo lo que se descuenta, negro si es cero.
// tipo: 'ingreso' (+ verde), 'egreso' (− rojo) o 'saldo' (verde si es positivo, rojo si es negativo)
export default function Monto({ valor, tipo = 'ingreso' }) {
  if (!valor) return <span className="monto-neutro">{formatearPrecio(0)}</span>;

  const entra = tipo === 'saldo' ? valor > 0 : tipo === 'ingreso';
  return (
    <span className={entra ? 'monto-positivo' : 'monto-negativo'}>
      {entra ? '+' : '−'} {formatearPrecio(Math.abs(valor))}
    </span>
  );
}
