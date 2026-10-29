import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { mensajeError } from '../api/client';
import { formatearPrecio } from '../utils/formato';

// Fecha de hoy en Argentina (AAAA-MM-DD), sin depender de la zona horaria de la PC
const hoyArgentina = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

const contarNoches = (desde, hasta) => {
  if (!desde || !hasta) return 0;
  const noches = (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86400000;
  return Number.isFinite(noches) && noches > 0 ? noches : 0;
};

export default function FormularioReserva({ cabana }) {
  const [form, setForm] = useState({ fecha_checkin: '', fecha_checkout: '', cantidad_personas: 1 });
  const [error, setError] = useState('');
  const [agregada, setAgregada] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const hoy = hoyArgentina();
  const noches = contarNoches(form.fecha_checkin, form.fecha_checkout);
  const total = noches * cabana.precio_por_noche;

  const cambiar = (e) => {
    setAgregada(false);
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setAgregada(false);

    const personas = Number(form.cantidad_personas);
    if (!form.fecha_checkin || !form.fecha_checkout) {
      setError('Elegí las fechas de check-in y check-out.');
      return;
    }
    if (form.fecha_checkin < hoy) {
      setError('El check-in no puede ser anterior a hoy.');
      return;
    }
    if (form.fecha_checkout <= form.fecha_checkin) {
      setError('El check-out tiene que ser posterior al check-in.');
      return;
    }
    if (!Number.isInteger(personas) || personas < 1) {
      setError('Indicá la cantidad de personas.');
      return;
    }
    if (personas > cabana.capacidad_personas) {
      setError(`Esta cabaña admite hasta ${cabana.capacidad_personas} personas.`);
      return;
    }

    setEnviando(true);
    try {
      await api.post('/carrito', {
        cabana_id: cabana.id,
        cantidad_personas: personas,
        fecha_checkin: form.fecha_checkin,
        fecha_checkout: form.fecha_checkout
      });
      setAgregada(true);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="tarjeta panel-reserva" onSubmit={enviar}>
      <div className="precio">
        {formatearPrecio(cabana.precio_por_noche)} <small>/ noche</small>
      </div>

      <div className="campo">
        <label htmlFor="fecha_checkin">Check-in</label>
        <input
          id="fecha_checkin" name="fecha_checkin" type="date" min={hoy}
          value={form.fecha_checkin} onChange={cambiar} required
        />
      </div>
      <div className="campo">
        <label htmlFor="fecha_checkout">Check-out</label>
        <input
          id="fecha_checkout" name="fecha_checkout" type="date" min={form.fecha_checkin || hoy}
          value={form.fecha_checkout} onChange={cambiar} required
        />
      </div>
      <div className="campo">
        <label htmlFor="cantidad_personas">Personas (máximo {cabana.capacidad_personas})</label>
        <input
          id="cantidad_personas" name="cantidad_personas" type="number"
          min="1" max={cabana.capacidad_personas}
          value={form.cantidad_personas} onChange={cambiar} required
        />
      </div>

      {noches > 0 && (
        <div className="resumen-reserva">
          <span>{noches} {noches === 1 ? 'noche' : 'noches'} × {formatearPrecio(cabana.precio_por_noche)}</span>
          <strong>{formatearPrecio(total)}</strong>
        </div>
      )}

      {error && <div className="mensaje-error">{error}</div>}
      {agregada && (
        <div className="mensaje-exito">
          Cabaña agregada al carrito. <Link to="/carrito">Ver carrito</Link>
        </div>
      )}

      <button className="btn" type="submit" disabled={enviando} style={{ width: '100%' }}>
        {enviando ? 'Agregando...' : 'Agregar al carrito'}
      </button>
      <p className="texto-chico">El total es estimado: el sistema lo confirma al pagar.</p>
    </form>
  );
}