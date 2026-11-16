import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { mensajeError } from '../api/client';
import { formatearPrecio } from '../utils/formato';
import { contarNoches, formatearFechaCorta, hoyArgentina } from '../utils/fechas';

const PESTANAS = [
  { clave: 'activas', texto: 'Activas', estados: ['pendiente', 'confirmada'] },
  { clave: 'historial', texto: 'Historial', estados: ['completada'] },
  { clave: 'canceladas', texto: 'Canceladas', estados: ['cancelada'] }
];

const ETIQUETA_ESTADO = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada: 'Cancelada'
};

const obtenerDatos = async () => {
  try {
    const [reservas, pendientes] = await Promise.all([
      api.get('/reservas/mis-reservas'),
      api.get('/calificaciones/pendientes')
    ]);
    return {
      cargando: false,
      error: '',
      reservas: reservas.data,
      porCalificar: pendientes.data.map((p) => p.cabana_id)
    };
  } catch (err) {
    return { cargando: false, error: mensajeError(err), reservas: [], porCalificar: [] };
  }
};

// Ventana genérica con título, error y botones
function Modal({ titulo, onCerrar, children }) {
  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal modal-ancho" onClick={(e) => e.stopPropagation()}>
        <h3>{titulo}</h3>
        {children}
      </div>
    </div>
  );
}

function ModalModificar({ reserva, onCerrar, onListo }) {
  const hoy = hoyArgentina();
  const nochesActuales = contarNoches(reserva.fecha_checkin, reserva.fecha_checkout);
  const precioNoche = nochesActuales > 0 ? reserva.precio_total / nochesActuales : 0;
  const [form, setForm] = useState({
    fecha_checkin: reserva.fecha_checkin,
    fecha_checkout: reserva.fecha_checkout,
    cantidad_personas: reserva.cantidad_personas
  });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const noches = contarNoches(form.fecha_checkin, form.fecha_checkout);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    const personas = Number(form.cantidad_personas);
    if (!form.fecha_checkin || !form.fecha_checkout) return setError('Elegí las dos fechas.');
    if (form.fecha_checkin < hoy) return setError('El check-in no puede ser anterior a hoy.');
    if (form.fecha_checkout <= form.fecha_checkin) {
      return setError('El check-out tiene que ser posterior al check-in.');
    }
    if (!Number.isInteger(personas) || personas < 1) return setError('Indicá la cantidad de personas.');

    setEnviando(true);
    try {
      await api.put(`/reservas/${reserva.id}`, {
        fecha_checkin: form.fecha_checkin,
        fecha_checkout: form.fecha_checkout,
        cantidad_personas: personas
      });
      await onListo('Reserva modificada correctamente.');
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  };

  return (
    <Modal titulo={`Modificar reserva · ${reserva.cabana_nombre}`} onCerrar={onCerrar}>
      <form onSubmit={guardar}>
        <div className="form-fila">
          <div className="campo">
            <label htmlFor="m-checkin">Check-in</label>
            <input id="m-checkin" name="fecha_checkin" type="date" min={hoy}
              value={form.fecha_checkin} onChange={cambiar} required />
          </div>
          <div className="campo">
            <label htmlFor="m-checkout">Check-out</label>
            <input id="m-checkout" name="fecha_checkout" type="date"
              min={form.fecha_checkin || hoy}
              value={form.fecha_checkout} onChange={cambiar} required />
          </div>
        </div>
        <div className="campo">
          <label htmlFor="m-personas">Cantidad de personas</label>
          <input id="m-personas" name="cantidad_personas" type="number" min="1"
            value={form.cantidad_personas} onChange={cambiar} required />
        </div>
        {noches > 0 && (
          <p className="nuevo-total">
            Nuevo total estimado: <strong>{formatearPrecio(noches * precioNoche)}</strong>
          </p>
        )}
        {error && <div className="mensaje-error">{error}</div>}
        <div className="modal-botones">
          <button type="button" className="btn btn-secundario" onClick={onCerrar}>Cancelar</button>
          <button type="submit" className="btn" disabled={enviando}>
            {enviando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ModalCancelar({ reserva, onCerrar, onListo }) {
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cancelar = async () => {
    setEnviando(true);
    setError('');
    try {
      await api.delete(`/reservas/${reserva.id}`);
      await onListo('La reserva fue cancelada.');
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  };

  return (
    <Modal titulo="Cancelar reserva" onCerrar={onCerrar}>
      <p>¿Querés cancelar tu reserva en <strong>{reserva.cabana_nombre}</strong> del{' '}
        {formatearFechaCorta(reserva.fecha_checkin)} al {formatearFechaCorta(reserva.fecha_checkout)}?</p>
      <p className="texto-suave">Esta acción no se puede deshacer. Si necesitás coordinar un reembolso,
        hacelo desde un reclamo sobre esta reserva.</p>
      {error && <div className="mensaje-error">{error}</div>}
      <div className="modal-botones">
        <button type="button" className="btn btn-secundario" onClick={onCerrar}>Volver</button>
        <button type="button" className="btn btn-peligro" onClick={cancelar} disabled={enviando}>
          {enviando ? 'Cancelando...' : 'Cancelar reserva'}
        </button>
      </div>
    </Modal>
  );
}

function ModalCalificar({ reserva, onCerrar, onListo }) {
  const [puntaje, setPuntaje] = useState(0);
  const [opinion, setOpinion] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    if (puntaje < 1) return setError('Elegí un puntaje de 1 a 5 estrellas.');
    setEnviando(true);
    setError('');
    try {
      await api.post('/calificaciones', { cabana_id: reserva.cabana_id, puntaje, opinion });
      await onListo('¡Gracias por tu calificación!');
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  };

  return (
    <Modal titulo={`Calificar · ${reserva.cabana_nombre}`} onCerrar={onCerrar}>
      <form onSubmit={enviar}>
        <div className="campo">
          <label>Puntuación general</label>
          <div className="selector-estrellas" role="radiogroup" aria-label="Puntaje">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={puntaje === n}
                aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
                className={n <= puntaje ? 'estrella llena' : 'estrella'}
                onClick={() => setPuntaje(n)}>★</button>
            ))}
          </div>
        </div>
        <div className="campo">
          <label htmlFor="m-opinion">Tu reseña (opcional)</label>
          <textarea id="m-opinion" rows="4" maxLength={1000} value={opinion}
            onChange={(e) => setOpinion(e.target.value)}
            placeholder="Contanos tu experiencia..." />
        </div>
        {error && <div className="mensaje-error">{error}</div>}
        <div className="modal-botones">
          <button type="button" className="btn btn-secundario" onClick={onCerrar}>Cancelar</button>
          <button type="submit" className="btn" disabled={enviando}>
            {enviando ? 'Enviando...' : 'Enviar calificación'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ModalReclamo({ reserva, onCerrar, onListo }) {
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    if (!asunto.trim()) return setError('Escribí el asunto del reclamo.');
    setEnviando(true);
    setError('');
    try {
      await api.post('/reclamos', { reserva_id: reserva.id, asunto, mensaje });
      await onListo('Reclamo enviado. El dueño de la cabaña fue avisado.');
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  };

  return (
    <Modal titulo={`Hacer un reclamo · ${reserva.cabana_nombre}`} onCerrar={onCerrar}>
      <p className="texto-suave">
        Reserva #{reserva.id} · {formatearFechaCorta(reserva.fecha_checkin)} al{' '}
        {formatearFechaCorta(reserva.fecha_checkout)}
      </p>
      <form onSubmit={enviar}>
        <div className="campo">
          <label htmlFor="r-asunto">Asunto</label>
          <input id="r-asunto" maxLength={200} value={asunto}
            onChange={(e) => setAsunto(e.target.value)} required />
        </div>
        <div className="campo">
          <label htmlFor="r-mensaje">Contanos qué pasó (opcional)</label>
          <textarea id="r-mensaje" rows="4" maxLength={2000} value={mensaje}
            onChange={(e) => setMensaje(e.target.value)} />
        </div>
        {error && <div className="mensaje-error">{error}</div>}
        <div className="modal-botones">
          <button type="button" className="btn btn-secundario" onClick={onCerrar}>Cancelar</button>
          <button type="submit" className="btn" disabled={enviando}>
            {enviando ? 'Enviando...' : 'Enviar reclamo'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TarjetaReserva({ reserva, puedeCalificar, onAccion }) {
  const [imagenRota, setImagenRota] = useState(false);
  const hoy = hoyArgentina();
  const noches = contarNoches(reserva.fecha_checkin, reserva.fecha_checkout);
  const vigente = ['pendiente', 'confirmada'].includes(reserva.estado);
  const modificable = vigente && reserva.fecha_checkin >= hoy;

  return (
    <article className="item-carrito tarjeta reserva-card">
      {reserva.imagen_url && !imagenRota ? (
        <img className="cabana-img" src={reserva.imagen_url} alt={reserva.cabana_nombre}
          onError={() => setImagenRota(true)} />
      ) : (
        <div className="cabana-img cabana-sin-imagen">Sin imagen</div>
      )}

      <div className="item-cuerpo">
        <div className="reserva-cabecera">
          <div>
            <span className="codigo-reserva">Reserva #{reserva.id}</span>
            <h3>{reserva.cabana_nombre}</h3>
            <p className="cabana-ubicacion">📍 {reserva.localidad}, {reserva.provincia}</p>
          </div>
          <div className="reserva-derecha">
            <span className={`estado estado-${reserva.estado}`}>{ETIQUETA_ESTADO[reserva.estado]}</span>
            <strong className={reserva.estado === 'cancelada' ? 'precio-tachado' : 'precio'}>
              {formatearPrecio(reserva.precio_total)}
            </strong>
          </div>
        </div>

        <div className="item-datos">
          <span><strong>Check-in:</strong> {formatearFechaCorta(reserva.fecha_checkin)}</span>
          <span><strong>Check-out:</strong> {formatearFechaCorta(reserva.fecha_checkout)}</span>
          <span><strong>Personas:</strong> {reserva.cantidad_personas}</span>
          <span><strong>Noches:</strong> {noches}</span>
        </div>

        <div className="item-acciones">
          {modificable && (
            <button type="button" className="btn btn-secundario" onClick={() => onAccion('modificar', reserva)}>
              Modificar
            </button>
          )}
          {vigente && (
            <button type="button" className="btn btn-secundario" onClick={() => onAccion('cancelar', reserva)}>
              Cancelar
            </button>
          )}
          {puedeCalificar && (
            <button type="button" className="btn" onClick={() => onAccion('calificar', reserva)}>
              ★ Calificar
            </button>
          )}
          <button type="button" className="btn btn-secundario" onClick={() => onAccion('reclamo', reserva)}>
            Hacer un reclamo
          </button>
        </div>
      </div>
    </article>
  );
}

export default function MisReservas() {
  const [datos, setDatos] = useState({ cargando: true, error: '', reservas: [], porCalificar: [] });
  const [pestana, setPestana] = useState('activas');
  const [accion, setAccion] = useState(null); // { tipo, reserva }
  const [aviso, setAviso] = useState('');

  const recargar = useCallback(async () => setDatos(await obtenerDatos()), []);

  useEffect(() => {
    let activo = true;
    obtenerDatos().then((nuevo) => {
      if (activo) setDatos(nuevo);
    });
    return () => {
      activo = false;
    };
  }, []);

  const abrir = (tipo, reserva) => setAccion({ tipo, reserva });
  const cerrar = () => setAccion(null);
  const terminar = async (mensaje) => {
    setAviso(mensaje);
    cerrar();
    await recargar();
  };

  const { cargando, error, reservas, porCalificar } = datos;
  const actual = PESTANAS.find((p) => p.clave === pestana);
  const lista = reservas.filter((r) => actual.estados.includes(r.estado));
  const cuenta = (p) => reservas.filter((r) => p.estados.includes(r.estado)).length;

  return (
    <section className="seccion">
      <h1>Mis Reservas</h1>
      <p className="texto-suave">Gestioná tus próximas escapadas y consultá tus estadías anteriores.</p>

      <div className="pestanas" role="tablist">
        {PESTANAS.map((p) => (
          <button key={p.clave} type="button" role="tab" aria-selected={pestana === p.clave}
            className={pestana === p.clave ? 'activa' : ''} onClick={() => setPestana(p.clave)}>
            {p.texto} ({cuenta(p)})
          </button>
        ))}
      </div>

      {aviso && <div className="mensaje-exito" role="status">{aviso}</div>}
      {cargando && <p>Cargando reservas...</p>}
      {!cargando && error && <div className="mensaje-error">{error}</div>}
      {!cargando && !error && lista.length === 0 && (
        <div className="tarjeta centrado">
          <p>No tenés reservas en esta sección.</p>
          {pestana === 'activas' && <Link to="/reservas" className="btn">Explorar cabañas</Link>}
        </div>
      )}

      {lista.map((r) => (
        <TarjetaReserva key={r.id} reserva={r} onAccion={abrir}
          puedeCalificar={r.estado === 'completada' && porCalificar.includes(r.cabana_id)} />
      ))}

      {accion?.tipo === 'modificar' && <ModalModificar reserva={accion.reserva} onCerrar={cerrar} onListo={terminar} />}
      {accion?.tipo === 'cancelar' && <ModalCancelar reserva={accion.reserva} onCerrar={cerrar} onListo={terminar} />}
      {accion?.tipo === 'calificar' && <ModalCalificar reserva={accion.reserva} onCerrar={cerrar} onListo={terminar} />}
      {accion?.tipo === 'reclamo' && <ModalReclamo reserva={accion.reserva} onCerrar={cerrar} onListo={terminar} />}
    </section>
  );
}
