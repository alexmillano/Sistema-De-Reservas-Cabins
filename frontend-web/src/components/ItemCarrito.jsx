import { useState } from 'react';
import api, { mensajeError } from '../api/client';
import { formatearPrecio } from '../utils/formato';
import { contarNoches, formatearFechaCorta, hoyArgentina } from '../utils/fechas';

export default function ItemCarrito({ item, onCambio, onQuitar }) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ fecha_checkin: '', fecha_checkout: '', cantidad_personas: 1 });
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [imagenRota, setImagenRota] = useState(false);

  const hoy = hoyArgentina();
  const fechasPasadas = item.fecha_checkin < hoy;
  const mostrarImagen = item.imagen_url && !imagenRota;
  const nochesNuevas = contarNoches(form.fecha_checkin, form.fecha_checkout);

  const abrirEdicion = () => {
    setForm({
      fecha_checkin: item.fecha_checkin,
      fecha_checkout: item.fecha_checkout,
      cantidad_personas: item.cantidad_personas
    });
    setError('');
    setEditando(true);
  };

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    const personas = Number(form.cantidad_personas);

    if (!form.fecha_checkin || !form.fecha_checkout) {
      setError('Elegí las dos fechas.');
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
    if (personas > item.capacidad_personas) {
      setError(`Esta cabaña admite hasta ${item.capacidad_personas} personas.`);
      return;
    }

    setGuardando(true);
    try {
      await api.put(`/carrito/${item.id}`, {
        fecha_checkin: form.fecha_checkin,
        fecha_checkout: form.fecha_checkout,
        cantidad_personas: personas
      });
      setEditando(false);
      await onCambio();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <article className="item-carrito tarjeta">
      {mostrarImagen ? (
        <img
          className="cabana-img"
          src={item.imagen_url}
          alt={item.nombre}
          onError={() => setImagenRota(true)}
        />
      ) : (
        <div className="cabana-img cabana-sin-imagen">Sin imagen</div>
      )}

      <div className="item-cuerpo">
        <h3>{item.nombre}</h3>
        <p className="cabana-ubicacion">📍 {item.localidad}, {item.provincia}</p>

        {!item.activa && (
          <div className="mensaje-error">
            Esta cabaña ya no está disponible. Quitala del carrito para poder pagar.
          </div>
        )}
        {item.activa && fechasPasadas && (
          <div className="mensaje-error">Las fechas ya pasaron. Actualizalas o quitá la cabaña.</div>
        )}

        {editando ? (
          <form onSubmit={guardar}>
            <div className="form-fila">
              <div className="campo">
                <label htmlFor={`checkin-${item.id}`}>Check-in</label>
                <input
                  id={`checkin-${item.id}`} name="fecha_checkin" type="date" min={hoy}
                  value={form.fecha_checkin} onChange={cambiar} required
                />
              </div>
              <div className="campo">
                <label htmlFor={`checkout-${item.id}`}>Check-out</label>
                <input
                  id={`checkout-${item.id}`} name="fecha_checkout" type="date"
                  min={form.fecha_checkin || hoy}
                  value={form.fecha_checkout} onChange={cambiar} required
                />
              </div>
              <div className="campo">
                <label htmlFor={`personas-${item.id}`}>Personas (máx. {item.capacidad_personas})</label>
                <input
                  id={`personas-${item.id}`} name="cantidad_personas" type="number"
                  min="1" max={item.capacidad_personas}
                  value={form.cantidad_personas} onChange={cambiar} required
                />
              </div>
            </div>

            {nochesNuevas > 0 && (
              <p>
                {nochesNuevas} {nochesNuevas === 1 ? 'noche' : 'noches'} ×{' '}
                {formatearPrecio(item.precio_por_noche)} ={' '}
                <strong>{formatearPrecio(nochesNuevas * item.precio_por_noche)}</strong>
              </p>
            )}
            {error && <div className="mensaje-error">{error}</div>}

            <div className="item-acciones">
              <button className="btn" type="submit" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button className="btn btn-secundario" type="button" onClick={() => setEditando(false)}>
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="item-datos">
              <span><strong>Check-in:</strong> {formatearFechaCorta(item.fecha_checkin)}</span>
              <span><strong>Check-out:</strong> {formatearFechaCorta(item.fecha_checkout)}</span>
              <span><strong>Personas:</strong> {item.cantidad_personas}</span>
              <span><strong>Noches:</strong> {item.noches}</span>
            </div>
            <p>
              {formatearPrecio(item.precio_por_noche)} × {item.noches} ={' '}
              <strong>{formatearPrecio(item.subtotal)}</strong>
            </p>
            <div className="item-acciones">
              {item.activa && (
                <button type="button" className="btn btn-secundario" onClick={abrirEdicion}>
                  Editar
                </button>
              )}
              <button type="button" className="btn btn-secundario" onClick={() => onQuitar(item)}>
                Quitar
              </button>
            </div>
          </>
        )}
      </div>
    </article>
  );
}