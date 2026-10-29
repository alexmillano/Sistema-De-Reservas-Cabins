import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { mensajeError } from '../api/client';
import FormularioReserva from '../components/FormularioReserva';
import { estrellas } from '../utils/formato';

const POR_PAGINA = 5;

const formatearFecha = (iso) =>
  new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

function Detalle({ id }) {
  const [estado, setEstado] = useState({
    id: null, cabana: null, opiniones: [], hayMas: false, error: '', noExiste: false
  });
  const [pagina, setPagina] = useState(1);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [errorMas, setErrorMas] = useState('');
  const [imagenRota, setImagenRota] = useState(false);

  useEffect(() => {
    let activo = true;
    Promise.all([
      api.get(`/cabanas/${id}`),
      api.get(`/opiniones/cabana/${id}`, { params: { pagina: 1, limite: POR_PAGINA } })
    ])
      .then(([cab, op]) => {
        if (!activo) return;
        setEstado({
          id,
          cabana: cab.data,
          opiniones: op.data.opiniones,
          hayMas: op.data.opiniones.length === POR_PAGINA,
          error: '',
          noExiste: false
        });
      })
      .catch((err) => {
        if (!activo) return;
        setEstado({
          id, cabana: null, opiniones: [], hayMas: false,
          error: mensajeError(err), noExiste: err.response?.status === 404
        });
      });
    return () => { activo = false; };
  }, [id]);

  const cargando = estado.id !== id;

  const verMas = async () => {
    setCargandoMas(true);
    setErrorMas('');
    try {
      const siguiente = pagina + 1;
      const { data } = await api.get(`/opiniones/cabana/${id}`, {
        params: { pagina: siguiente, limite: POR_PAGINA }
      });
      setEstado((e) => ({
        ...e,
        opiniones: [...e.opiniones, ...data.opiniones],
        hayMas: data.opiniones.length === POR_PAGINA
      }));
      setPagina(siguiente);
    } catch (err) {
      setErrorMas(mensajeError(err));
    } finally {
      setCargandoMas(false);
    }
  };

  if (cargando) {
    return <section className="seccion"><p>Cargando cabaña...</p></section>;
  }

  if (!estado.cabana) {
    return (
      <section className="seccion centrado">
        <h2>{estado.noExiste ? 'Cabaña no encontrada' : 'No se pudo cargar la cabaña'}</h2>
        <p>{estado.noExiste ? 'Puede que ya no esté disponible.' : estado.error}</p>
        <Link to="/reservas" className="btn">Volver al catálogo</Link>
      </section>
    );
  }

  const { cabana, opiniones, hayMas } = estado;
  const mostrarImagen = cabana.imagen_url && !imagenRota;
  const metodos = cabana.metodos_pago
    ? cabana.metodos_pago.split(',').map((m) => m.trim()).filter(Boolean)
    : [];

  return (
    <div className="detalle">
      <Link to="/reservas" className="volver">← Volver al catálogo</Link>

      <div className="detalle-grid">
        <div>
          {mostrarImagen ? (
            <img
              className="detalle-img"
              src={cabana.imagen_url}
              alt={cabana.nombre}
              onError={() => setImagenRota(true)}
            />
          ) : (
            <div className="detalle-img cabana-sin-imagen">Sin imagen</div>
          )}

          <h1>{cabana.nombre}</h1>
          <p className="cabana-ubicacion">📍 {cabana.localidad}, {cabana.provincia}</p>
          <p>
            {cabana.total_calificaciones > 0 ? (
              <span className="estrellas">
                {estrellas(cabana.valoracion)}{' '}
                <small>{cabana.valoracion.toFixed(1)} ({cabana.total_calificaciones})</small>
              </span>
            ) : (
              <small>Sin calificaciones todavía</small>
            )}
          </p>
          <p className="cabana-datos">Hasta {cabana.capacidad_personas} personas</p>

          <h2>Descripción</h2>
          <p className="descripcion-completa">{cabana.descripcion}</p>

          {metodos.length > 0 && (
            <>
              <h2>Medios de pago</h2>
              <div className="chips chips-izq">
                {metodos.map((m) => <span className="chip" key={m}>{m}</span>)}
              </div>
            </>
          )}

          <h2>Opiniones</h2>
          {opiniones.length === 0 ? (
            <p>Todavía no hay opiniones.</p>
          ) : (
            <div className="lista-opiniones">
              {opiniones.map((o) => (
                <article className="opinion tarjeta" key={o.id}>
                  <div className="opinion-cabecera">
                    <strong>{o.autor}</strong>
                    {o.puntaje && <span className="estrellas">{estrellas(o.puntaje)}</span>}
                  </div>
                  <p>{o.contenido}</p>
                  <small>{formatearFecha(o.created_at)}</small>
                </article>
              ))}
            </div>
          )}

          {errorMas && <div className="mensaje-error">{errorMas}</div>}
          {hayMas && (
            <button type="button" className="btn btn-secundario" onClick={verMas} disabled={cargandoMas}>
              {cargandoMas ? 'Cargando...' : 'Ver más opiniones'}
            </button>
          )}
        </div>

        <aside className="detalle-lateral">
          <FormularioReserva cabana={cabana} />
        </aside>
      </div>
    </div>
  );
}

// La clave hace que, al cambiar de cabaña, la pantalla arranque de cero
export default function DetalleCabana() {
  const { id } = useParams();
  return <Detalle key={id} id={id} />;
}