import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { mensajeError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import ChatReclamo from '../components/ChatReclamo';

const FILTROS = [
  { clave: '', texto: 'Todos' },
  { clave: 'nuevo', texto: 'Nuevos' },
  { clave: 'en_proceso', texto: 'En proceso' },
  { clave: 'finalizado', texto: 'Finalizados' }
];
const ETIQUETA_ESTADO = { nuevo: 'Nuevo', en_proceso: 'En proceso', finalizado: 'Finalizado' };

// Una sola pantalla para las dos vistas: el usuario ve sus reclamos y el dueño (o el superadmin) los de sus cabañas
export default function Reclamos() {
  const { user } = useAuth();
  const rol = user.rol === 'usuario' ? 'usuario' : user.es_superadmin ? 'superadmin' : 'dueno';
  const ruta = rol === 'usuario' ? '/reclamos/mis-reclamos' : '/reclamos';

  const [filtro, setFiltro] = useState('');
  const [lista, setLista] = useState({ cargando: true, error: '', reclamos: [] });
  const [abierto, setAbierto] = useState(null);

  const cargarLista = useCallback(async () => {
    try {
      const { data } = await api.get(ruta);
      setLista({ cargando: false, error: '', reclamos: data });
    } catch (err) {
      setLista({ cargando: false, error: mensajeError(err), reclamos: [] });
    }
  }, [ruta]);

  useEffect(() => {
    let activo = true;
    api.get(ruta)
      .then(({ data }) => activo && setLista({ cargando: false, error: '', reclamos: data }))
      .catch((err) => activo && setLista({ cargando: false, error: mensajeError(err), reclamos: [] }));
    // La lista se refresca sola para que los contadores de "sin leer" se mantengan al día
    const id = setInterval(() => {
      if (!document.hidden) cargarLista();
    }, 15000);
    return () => {
      activo = false;
      clearInterval(id);
    };
  }, [ruta, cargarLista]);

  const { cargando, error, reclamos } = lista;
  const visibles = reclamos.filter((r) => !filtro || r.estado === filtro);

  return (
    <section className="seccion">
      <h1>Reclamos</h1>
      <p className="texto-suave">
        {rol === 'usuario' && 'Tus reclamos sobre reservas. Para abrir uno nuevo, andá a Mis Reservas.'}
        {rol === 'dueno' && 'Reclamos de los huéspedes de tus cabañas.'}
        {rol === 'superadmin' && 'Vista de consulta de todos los reclamos del sistema.'}
      </p>

      <div className="reclamos-grid">
        <aside className={abierto ? 'reclamos-lista oculta-movil' : 'reclamos-lista'}>
          <div className="pestanas pestanas-wrap" role="tablist">
            {FILTROS.map((f) => (
              <button key={f.clave || 'todos'} type="button" role="tab" aria-selected={filtro === f.clave}
                className={filtro === f.clave ? 'activa' : ''} onClick={() => setFiltro(f.clave)}>
                {f.texto}
              </button>
            ))}
          </div>

          {cargando && <p>Cargando reclamos...</p>}
          {!cargando && error && <div className="mensaje-error">{error}</div>}
          {!cargando && !error && visibles.length === 0 && (
            <div className="tarjeta centrado">
              <p>No hay reclamos en esta sección.</p>
              {rol === 'usuario' && <Link to="/mis-reservas" className="btn">Ir a Mis Reservas</Link>}
            </div>
          )}

          {visibles.map((r) => (
            <button key={r.id} type="button"
              className={`tarjeta reclamo-item${abierto === r.id ? ' seleccionado' : ''}`}
              onClick={() => setAbierto(r.id)}>
              <div className="reclamo-item-cabecera">
                <strong>{r.asunto}</strong>
                {r.no_leidos > 0 && <span className="badge-inline" title="Mensajes sin leer">{r.no_leidos}</span>}
              </div>
              <span className="texto-suave">
                {r.cabana_nombre ? `${r.cabana_nombre} · Reserva #${r.reserva_id}` : 'Sin reserva asociada'}
              </span>
              {rol !== 'usuario' && <span className="texto-suave">{r.usuario_nombre} {r.usuario_apellido}</span>}
              {r.ultimo_mensaje && <span className="reclamo-ultimo">{r.ultimo_mensaje}</span>}
              <span className={`estado estado-reclamo-${r.estado}`}>{ETIQUETA_ESTADO[r.estado]}</span>
            </button>
          ))}
        </aside>

        <div className={abierto ? 'reclamos-chat' : 'reclamos-chat oculta-movil'}>
          {abierto ? (
            <>
              <button type="button" className="btn btn-secundario solo-movil" onClick={() => setAbierto(null)}>
                ← Volver a la lista
              </button>
              <ChatReclamo key={abierto} reclamoId={abierto} rol={rol} onActividad={cargarLista} />
            </>
          ) : (
            <div className="tarjeta centrado"><p>Elegí un reclamo para ver la conversación.</p></div>
          )}
        </div>
      </div>
    </section>
  );
}
