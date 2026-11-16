import { useCallback, useEffect, useState } from 'react';
import api, { mensajeError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { formatearPrecio } from '../utils/formato';
import { contarNoches, formatearFechaCorta, hoyArgentina } from '../utils/fechas';

const LIMITE = 10;
const FILTROS = [
  { clave: '', texto: 'Todas' },
  { clave: 'pendiente', texto: 'Pendientes' },
  { clave: 'confirmada', texto: 'Confirmadas' },
  { clave: 'completada', texto: 'Completadas' },
  { clave: 'cancelada', texto: 'Canceladas' }
];
const ETIQUETA = { pendiente: 'Pendiente', confirmada: 'Confirmada', completada: 'Completada', cancelada: 'Cancelada' };

const obtener = async (estado, pagina) => {
  try {
    const { data } = await api.get('/reservas', { params: { estado: estado || undefined, pagina, limite: LIMITE } });
    return { cargando: false, error: '', ...data };
  } catch (err) {
    return { cargando: false, error: mensajeError(err), total: 0, reservas: [] };
  }
};

export default function GestionarReservas() {
  const { user } = useAuth();
  const esDueno = !user.es_superadmin;
  const [estado, setEstado] = useState('');
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState({ cargando: true, error: '', total: 0, reservas: [] });
  const [aviso, setAviso] = useState('');
  const [cambio, setCambio] = useState(null); // { reserva, nuevo }
  const [errorModal, setErrorModal] = useState('');
  const [enviando, setEnviando] = useState(false);

  const recargar = useCallback(async () => setDatos(await obtener(estado, pagina)), [estado, pagina]);

  useEffect(() => {
    let activo = true;
    obtener(estado, pagina).then((nuevo) => {
      if (activo) setDatos(nuevo);
    });
    return () => {
      activo = false;
    };
  }, [estado, pagina]);

  const elegirFiltro = (clave) => {
    setEstado(clave);
    setPagina(1);
    setAviso('');
  };

  const confirmarCambio = async () => {
    setEnviando(true);
    setErrorModal('');
    try {
      await api.put(`/reservas/${cambio.reserva.id}/estado`, { estado: cambio.nuevo });
      setAviso(`La reserva #${cambio.reserva.id} pasó a "${ETIQUETA[cambio.nuevo]}".`);
      setCambio(null);
      await recargar();
    } catch (err) {
      setErrorModal(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  const { cargando, error, total, reservas } = datos;
  const paginas = Math.max(1, Math.ceil(total / LIMITE));
  const hoy = hoyArgentina();

  const acciones = (r) => {
    if (!esDueno) return null;
    if (r.estado === 'pendiente') {
      return (
        <>
          <button type="button" className="btn" onClick={() => setCambio({ reserva: r, nuevo: 'confirmada' })}>Confirmar</button>
          <button type="button" className="btn btn-secundario" onClick={() => setCambio({ reserva: r, nuevo: 'cancelada' })}>Cancelar</button>
        </>
      );
    }
    if (r.estado === 'confirmada') {
      const puedeCompletar = r.fecha_checkout <= hoy;
      return (
        <>
          <button type="button" className="btn" disabled={!puedeCompletar}
            title={puedeCompletar ? '' : 'Se puede completar a partir del día del check-out'}
            onClick={() => setCambio({ reserva: r, nuevo: 'completada' })}>Marcar completada</button>
          <button type="button" className="btn btn-secundario" onClick={() => setCambio({ reserva: r, nuevo: 'cancelada' })}>Cancelar</button>
        </>
      );
    }
    return null;
  };

  return (
    <section className="seccion">
      <h1>Gestionar Reservas</h1>
      <p className="texto-suave">
        {esDueno ? 'Reservas de tus cabañas.' : 'Vista de consulta de todas las reservas del sistema.'}
      </p>

      <div className="pestanas" role="tablist">
        {FILTROS.map((f) => (
          <button key={f.clave || 'todas'} type="button" role="tab" aria-selected={estado === f.clave}
            className={estado === f.clave ? 'activa' : ''} onClick={() => elegirFiltro(f.clave)}>
            {f.texto}
          </button>
        ))}
      </div>

      {aviso && <div className="mensaje-exito" role="status">{aviso}</div>}
      {cargando && <p>Cargando reservas...</p>}
      {!cargando && error && <div className="mensaje-error">{error}</div>}
      {!cargando && !error && reservas.length === 0 && (
        <div className="tarjeta centrado"><p>No hay reservas en esta sección.</p></div>
      )}

      {reservas.map((r) => (
        <article className="tarjeta reserva-admin" key={r.id}>
          <div className="reserva-cabecera">
            <div>
              <span className="codigo-reserva">Reserva #{r.id}</span>
              <h3>{r.cabana_nombre}</h3>
              <p className="cabana-ubicacion">📍 {r.localidad}, {r.provincia}</p>
              {!esDueno && r.dueno_nombre && (
                <p className="texto-suave">Dueño: {r.dueno_nombre} {r.dueno_apellido}</p>
              )}
            </div>
            <div className="reserva-derecha">
              <span className={`estado estado-${r.estado}`}>{ETIQUETA[r.estado]}</span>
              <strong className={r.estado === 'cancelada' ? 'precio-tachado' : 'precio'}>{formatearPrecio(r.precio_total)}</strong>
            </div>
          </div>
          <div className="item-datos">
            <span><strong>Huésped:</strong> {r.usuario_nombre} {r.usuario_apellido}</span>
            <span><strong>Email:</strong> {r.usuario_email}</span>
            <span><strong>Check-in:</strong> {formatearFechaCorta(r.fecha_checkin)}</span>
            <span><strong>Check-out:</strong> {formatearFechaCorta(r.fecha_checkout)}</span>
            <span><strong>Noches:</strong> {contarNoches(r.fecha_checkin, r.fecha_checkout)}</span>
            <span><strong>Personas:</strong> {r.cantidad_personas}</span>
          </div>
          <div className="item-acciones">{acciones(r)}</div>
        </article>
      ))}

      {total > LIMITE && (
        <div className="paginacion">
          <button type="button" className="btn btn-secundario" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>Anterior</button>
          <span>Página {pagina} de {paginas} · {total} reservas</span>
          <button type="button" className="btn btn-secundario" disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)}>Siguiente</button>
        </div>
      )}

      {cambio && (
        <Modal titulo={`${cambio.nuevo === 'cancelada' ? 'Cancelar' : cambio.nuevo === 'confirmada' ? 'Confirmar' : 'Completar'} reserva`}
          onCerrar={() => setCambio(null)}>
          <p>
            Reserva #{cambio.reserva.id} de {cambio.reserva.usuario_nombre} {cambio.reserva.usuario_apellido} en{' '}
            <strong>{cambio.reserva.cabana_nombre}</strong> pasará a <strong>{ETIQUETA[cambio.nuevo]}</strong>.
          </p>
          {cambio.nuevo === 'cancelada' && <p className="texto-suave">Esta acción no se puede deshacer.</p>}
          {errorModal && <div className="mensaje-error">{errorModal}</div>}
          <div className="modal-botones">
            <button type="button" className="btn btn-secundario" onClick={() => setCambio(null)}>Volver</button>
            <button type="button" className={cambio.nuevo === 'cancelada' ? 'btn btn-peligro' : 'btn'}
              onClick={confirmarCambio} disabled={enviando}>
              {enviando ? 'Guardando...' : 'Confirmar'}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
