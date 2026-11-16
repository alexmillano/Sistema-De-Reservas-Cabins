import { useEffect, useState } from 'react';
import api, { mensajeError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { estrellas } from '../utils/formato';

const LIMITE = 10;

const fecha = (iso) =>
  new Date(iso).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });

const obtener = async (cabanaId, pagina) => {
  try {
    const { data } = await api.get('/calificaciones', {
      params: { cabana_id: cabanaId || undefined, pagina, limite: LIMITE }
    });
    if (!Array.isArray(data?.calificaciones) || !Array.isArray(data?.resumen)) throw new Error('formato');
    return { cargando: false, error: '', ...data };
  } catch (err) {
    return {
      cargando: false, total: 0, resumen: [], calificaciones: [],
      error: err.message === 'formato'
        ? 'La respuesta del servidor no es la esperada. Revisá que el backend esté actualizado.'
        : mensajeError(err)
    };
  }
};

export default function Calificaciones() {
  const { user } = useAuth();
  const [cabanas, setCabanas] = useState([]);
  const [cabanaId, setCabanaId] = useState('');
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState({ cargando: true, error: '', total: 0, resumen: [], calificaciones: [] });

  // Lista de cabañas para el filtro
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

  const { cargando, error, total, resumen, calificaciones } = datos;
  const paginas = Math.max(1, Math.ceil(total / LIMITE));

  return (
    <section className="seccion">
      <div className="catalogo-barra">
        <div>
          <h1>Calificaciones</h1>
          <p className="texto-suave">
            {user.es_superadmin ? 'Calificaciones de todas las cabañas.' : 'Cómo calificaron los huéspedes tus cabañas.'}
          </p>
        </div>
        <div className="campo campo-orden">
          <label htmlFor="k-cabana">Cabaña</label>
          <select id="k-cabana" value={cabanaId}
            onChange={(e) => { setCabanaId(e.target.value); setPagina(1); }}>
            <option value="">Todas</option>
            {cabanas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
      </div>

      {cargando && <p>Cargando calificaciones...</p>}
      {!cargando && error && <div className="mensaje-error">{error}</div>}

      {!cargando && !error && resumen.length > 0 && (
        <div className="kpis">
          {resumen.map((r) => (
            <div className="tarjeta kpi" key={r.cabana_id}>
              <span className="kpi-titulo">{r.nombre}</span>
              <strong className="kpi-valor">{r.promedio}</strong>
              <span className="estrellas">{estrellas(r.promedio)} <small>({r.total})</small></span>
            </div>
          ))}
        </div>
      )}

      {!cargando && !error && calificaciones.length === 0 && (
        <div className="tarjeta centrado"><p>Todavía no hay calificaciones.</p></div>
      )}

      {calificaciones.map((k) => (
        <article className="tarjeta fila-resena" key={k.id}>
          <div>
            <strong>{k.usuario_nombre} {k.usuario_apellido}</strong>
            <p className="texto-suave">{k.cabana_nombre} · {fecha(k.created_at)}</p>
          </div>
          <span className="estrellas" title={`${k.puntaje} de 5`}>{estrellas(k.puntaje)} <small>{k.puntaje}/5</small></span>
        </article>
      ))}

      {total > LIMITE && (
        <div className="paginacion">
          <button type="button" className="btn btn-secundario" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>Anterior</button>
          <span>Página {pagina} de {paginas} · {total} calificaciones</span>
          <button type="button" className="btn btn-secundario" disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)}>Siguiente</button>
        </div>
      )}
    </section>
  );
}
