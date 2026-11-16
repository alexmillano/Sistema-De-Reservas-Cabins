import { useEffect, useState } from 'react';
import api, { mensajeError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { estrellas } from '../utils/formato';

const LIMITE = 10;

const fecha = (iso) =>
  new Date(iso).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });

const obtener = async (cabanaId, pagina) => {
  try {
    const { data } = await api.get('/opiniones', {
      params: { cabana_id: cabanaId || undefined, pagina, limite: LIMITE }
    });
    if (!Array.isArray(data?.opiniones)) throw new Error('formato');
    return { cargando: false, error: '', ...data };
  } catch (err) {
    return {
      cargando: false, total: 0, opiniones: [],
      error: err.message === 'formato'
        ? 'La respuesta del servidor no es la esperada. Revisá que el backend esté actualizado.'
        : mensajeError(err)
    };
  }
};

export default function Opiniones() {
  const { user } = useAuth();
  const [cabanas, setCabanas] = useState([]);
  const [cabanaId, setCabanaId] = useState('');
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [datos, setDatos] = useState({ cargando: true, error: '', total: 0, opiniones: [] });

  useEffect(() => {
    api.get('/cabanas/panel').then(({ data }) => setCabanas(data)).catch(() => {});
  }, []);

  useEffect(() => {
    let activo = true;
    obtener(cabanaId, pagina).then((nuevo) => {
      if (activo) setDatos(nuevo);
    });
    return () => {
      activo = false;
    };
  }, [cabanaId, pagina]);

  const { cargando, error, total, opiniones } = datos;
  const paginas = Math.max(1, Math.ceil(total / LIMITE));
  // La búsqueda filtra las opiniones de la página que se está viendo
  const termino = busqueda.trim().toLowerCase();
  const visibles = opiniones.filter(
    (o) => !termino || `${o.contenido} ${o.usuario_nombre} ${o.usuario_apellido}`.toLowerCase().includes(termino)
  );

  return (
    <section className="seccion">
      <div className="catalogo-barra">
        <div>
          <h1>Opiniones</h1>
          <p className="texto-suave">
            {user.es_superadmin ? 'Opiniones de todas las cabañas.' : 'Lo que escribieron los huéspedes de tus cabañas.'}
          </p>
        </div>
        <div className="campo campo-orden">
          <label htmlFor="o-cabana">Cabaña</label>
          <select id="o-cabana" value={cabanaId}
            onChange={(e) => { setCabanaId(e.target.value); setPagina(1); }}>
            <option value="">Todas</option>
            {cabanas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
      </div>

      <div className="campo">
        <input type="search" aria-label="Buscar opiniones" placeholder="Buscá una palabra o un huésped..."
          value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </div>

      {cargando && <p>Cargando opiniones...</p>}
      {!cargando && error && <div className="mensaje-error">{error}</div>}
      {!cargando && !error && visibles.length === 0 && (
        <div className="tarjeta centrado"><p>No hay opiniones para mostrar.</p></div>
      )}

      {visibles.map((o) => (
        <article className="tarjeta opinion-admin" key={o.id}>
          <div className="reserva-cabecera">
            <div>
              <strong>{o.usuario_nombre} {o.usuario_apellido}</strong>
              <p className="texto-suave">{o.cabana_nombre} · {fecha(o.created_at)}</p>
            </div>
            {o.puntaje && (
              <span className="estrellas" title={`${o.puntaje} de 5`}>{estrellas(o.puntaje)} <small>{o.puntaje}/5</small></span>
            )}
          </div>
          <p className="opinion-texto">“{o.contenido}”</p>
        </article>
      ))}

      {total > LIMITE && (
        <div className="paginacion">
          <button type="button" className="btn btn-secundario" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>Anterior</button>
          <span>Página {pagina} de {paginas} · {total} opiniones</span>
          <button type="button" className="btn btn-secundario" disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)}>Siguiente</button>
        </div>
      )}
    </section>
  );
}
