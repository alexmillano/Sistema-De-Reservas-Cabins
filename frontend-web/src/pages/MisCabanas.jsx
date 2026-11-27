import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api, { mensajeError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { estrellas, formatearPrecio } from '../utils/formato';

const FILTROS = [
  { clave: 'todas', texto: 'Todas' },
  { clave: 'activas', texto: 'Activas' },
  { clave: 'inactivas', texto: 'Inactivas' }
];

const obtenerCabanas = async () => {
  try {
    const { data } = await api.get('/cabanas/panel');
    return { cargando: false, error: '', cabanas: data };
  } catch (err) {
    return { cargando: false, error: mensajeError(err), cabanas: [] };
  }
};

function TarjetaCabana({ cabana, esDueno, onEditar, onCambiarEstado }) {
  const [imagenRota, setImagenRota] = useState(false);

  return (
    <article className={`item-carrito tarjeta${cabana.activa ? '' : ' cabana-inactiva'}`}>
      {cabana.imagen_url && !imagenRota ? (
        <img className="cabana-img" src={cabana.imagen_url} alt={cabana.nombre}
          onError={() => setImagenRota(true)} />
      ) : (
        <div className="cabana-img cabana-sin-imagen">Sin imagen</div>
      )}
      <div className="item-cuerpo">
        <div className="reserva-cabecera">
          <div>
            <span className="codigo-reserva">Cabaña #{cabana.id}</span>
            <h3>{cabana.nombre}</h3>
            <p className="cabana-ubicacion">📍 {cabana.localidad}, {cabana.provincia}</p>
            {!esDueno && cabana.dueno_nombre && (
              <p className="texto-suave">Dueño: {cabana.dueno_nombre} {cabana.dueno_apellido}</p>
            )}
          </div>
          <div className="reserva-derecha">
            <span className={`estado ${cabana.activa ? 'estado-confirmada' : 'estado-cancelada'}`}>
              {cabana.activa ? 'Activa' : 'Inactiva'}
            </span>
            {cabana.estado_aprobacion !== 'aprobada' && (
              <span className={`estado ${cabana.estado_aprobacion === 'pendiente' ? 'estado-pendiente' : 'estado-cancelada'}`}>
                {cabana.estado_aprobacion === 'pendiente' ? 'En revisión' : 'Rechazada'}
              </span>
            )}
            <strong className="precio">{formatearPrecio(cabana.precio_por_noche)}<small> / noche</small></strong>
          </div>
        </div>

        <div className="item-datos">
          <span><strong>Capacidad:</strong> hasta {cabana.capacidad_personas} personas</span>
          <span className="estrellas">
            {cabana.total_calificaciones > 0
              ? <>{estrellas(cabana.valoracion)} <small>{cabana.valoracion} ({cabana.total_calificaciones})</small></>
              : <small>Sin calificaciones</small>}
          </span>
          {cabana.metodos_pago && <span><strong>Pagos:</strong> {cabana.metodos_pago}</span>}
        </div>

        {cabana.estado_aprobacion === 'pendiente' && (
          <p className="texto-suave">⏳ En revisión: se publicará en el catálogo cuando el equipo de Cabins la apruebe.</p>
        )}
        {cabana.estado_aprobacion === 'rechazada' && (
          <div className="mensaje-error">
            Rechazada: {cabana.motivo_rechazo || 'sin motivo indicado'}. Corregila desde «Editar» y se enviará de nuevo a revisión.
          </div>
        )}

        {esDueno && (
          <div className="item-acciones">
            <button type="button" className="btn btn-secundario" onClick={() => onEditar(cabana)}>Editar</button>
            <button type="button" className="btn btn-secundario" onClick={() => onCambiarEstado(cabana)}>
              {cabana.activa ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export default function MisCabanas() {
  const { user } = useAuth();
  const esDueno = !user.es_superadmin;
  const navigate = useNavigate();
  const location = useLocation();
  const [datos, setDatos] = useState({ cargando: true, error: '', cabanas: [] });
  const [filtro, setFiltro] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [aviso, setAviso] = useState(location.state?.aviso || '');
  const [confirmando, setConfirmando] = useState(null);
  const [errorModal, setErrorModal] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let activo = true;
    obtenerCabanas().then((nuevo) => {
      if (activo) setDatos(nuevo);
    });
    return () => {
      activo = false;
    };
  }, []);

  const cambiarEstado = async () => {
    const c = confirmando;
    setEnviando(true);
    setErrorModal('');
    try {
      // La API actualiza la cabaña completa, por eso se reenvían todos sus datos
      await api.put(`/cabanas/${c.id}`, {
        nombre: c.nombre, descripcion: c.descripcion, localidad_id: c.localidad_id,
        precio_por_noche: c.precio_por_noche, capacidad_personas: c.capacidad_personas,
        imagen_url: c.imagen_url, metodos_pago: c.metodos_pago, activa: !c.activa
      });
      setAviso(c.activa ? `"${c.nombre}" quedó inactiva y ya no se muestra en el catálogo.`
        : `"${c.nombre}" está activa de nuevo.`);
      setConfirmando(null);
      setDatos(await obtenerCabanas());
    } catch (err) {
      setErrorModal(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  const { cargando, error, cabanas } = datos;
  const termino = busqueda.trim().toLowerCase();
  const visibles = cabanas.filter((c) => {
    if (filtro === 'activas' && !c.activa) return false;
    if (filtro === 'inactivas' && c.activa) return false;
    return !termino || `${c.nombre} ${c.localidad} ${c.provincia}`.toLowerCase().includes(termino);
  });
  const cuenta = (f) => cabanas.filter((c) => (f === 'todas' ? true : f === 'activas' ? c.activa : !c.activa)).length;

  return (
    <section className="seccion">
      <div className="catalogo-barra">
        <div>
          <h1>{esDueno ? 'Mis Cabañas' : 'Todas las cabañas'}</h1>
          <p className="texto-suave">
            {esDueno ? 'Administrá tu inventario de propiedades.' : 'Vista de consulta de todas las cabañas del sistema.'}
          </p>
        </div>
        {esDueno && <Link to="/admin/crear-cabana" className="btn">+ Nueva cabaña</Link>}
      </div>

      <div className="campo">
        <input type="search" aria-label="Buscar cabañas" placeholder="Buscá por nombre, provincia o localidad..."
          value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </div>

      <div className="pestanas" role="tablist">
        {FILTROS.map((f) => (
          <button key={f.clave} type="button" role="tab" aria-selected={filtro === f.clave}
            className={filtro === f.clave ? 'activa' : ''} onClick={() => setFiltro(f.clave)}>
            {f.texto} ({cuenta(f.clave)})
          </button>
        ))}
      </div>

      {aviso && <div className="mensaje-exito" role="status">{aviso}</div>}
      {cargando && <p>Cargando cabañas...</p>}
      {!cargando && error && <div className="mensaje-error">{error}</div>}
      {!cargando && !error && visibles.length === 0 && (
        <div className="tarjeta centrado">
          <p>{cabanas.length === 0 ? 'Todavía no hay cabañas cargadas.' : 'No hay cabañas que coincidan.'}</p>
          {esDueno && cabanas.length === 0 && <Link to="/admin/crear-cabana" className="btn">Crear mi primera cabaña</Link>}
        </div>
      )}

      {visibles.map((c) => (
        <TarjetaCabana key={c.id} cabana={c} esDueno={esDueno}
          onEditar={(x) => navigate(`/admin/cabanas/${x.id}/editar`)}
          onCambiarEstado={(x) => { setErrorModal(''); setConfirmando(x); }} />
      ))}

      {confirmando && (
        <Modal titulo={confirmando.activa ? 'Desactivar cabaña' : 'Activar cabaña'} onCerrar={() => setConfirmando(null)}>
          <p>
            {confirmando.activa
              ? `"${confirmando.nombre}" dejará de mostrarse en el catálogo y no se podrá reservar. Las reservas existentes no se modifican.`
              : `"${confirmando.nombre}" volverá a mostrarse en el catálogo.`}
          </p>
          {errorModal && <div className="mensaje-error">{errorModal}</div>}
          <div className="modal-botones">
            <button type="button" className="btn btn-secundario" onClick={() => setConfirmando(null)}>Volver</button>
            <button type="button" className="btn" onClick={cambiarEstado} disabled={enviando}>
              {enviando ? 'Guardando...' : 'Confirmar'}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
