import { useEffect, useState } from 'react';
import api, { mensajeError } from '../api/client';
import { ModalEliminar, ModalReactivar, ModalSuspender } from '../components/AccionesCuenta';

const LIMITE = 10;
const FILTROS = [
  { clave: '', texto: 'Todos' },
  { clave: 'false', texto: 'Activos' },
  { clave: 'true', texto: 'Suspendidos' }
];

const fecha = (iso) =>
  new Date(iso).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });

const obtener = async (baneado, buscar, pagina) => {
  try {
    const { data } = await api.get('/usuarios', {
      params: { baneado: baneado || undefined, buscar: buscar || undefined, pagina, limite: LIMITE }
    });
    if (!Array.isArray(data?.usuarios)) throw new Error('formato');
    return { cargando: false, error: '', total: data.total, usuarios: data.usuarios };
  } catch (err) {
    return {
      cargando: false, total: 0, usuarios: [],
      error: err.message === 'formato'
        ? 'La respuesta del servidor no es la esperada. Revisá que el backend esté actualizado.'
        : mensajeError(err)
    };
  }
};

export default function Usuarios() {
  const [filtro, setFiltro] = useState('');
  const [texto, setTexto] = useState('');
  const [buscar, setBuscar] = useState('');
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState({ cargando: true, error: '', total: 0, usuarios: [] });
  const [aviso, setAviso] = useState('');
  const [accion, setAccion] = useState(null); // { tipo, usuario }

  useEffect(() => {
    let activo = true;
    obtener(filtro, buscar, pagina).then((nuevo) => {
      if (activo) setDatos(nuevo);
    });
    return () => {
      activo = false;
    };
  }, [filtro, buscar, pagina]);

  const terminar = async (mensaje, resultado) => {
    setAviso(resultado
      ? `${mensaje}. Se borraron ${resultado.reservas_eliminadas} reservas y ${resultado.reclamos_eliminados} reclamos.`
      : mensaje);
    setAccion(null);
    setDatos(await obtener(filtro, buscar, pagina));
  };

  const buscarAhora = (e) => {
    e.preventDefault();
    setPagina(1);
    setBuscar(texto.trim());
  };

  const { cargando, error, total, usuarios } = datos;
  const paginas = Math.max(1, Math.ceil(total / LIMITE));

  return (
    <section className="seccion">
      <h1>Usuarios</h1>
      <p className="texto-suave">Cuentas de los huéspedes registrados. Para eliminar una cuenta, primero hay que suspenderla.</p>

      <form className="ayuda-buscador buscador-izq" onSubmit={buscarAhora}>
        <input type="search" aria-label="Buscar usuarios" placeholder="Buscá por nombre, usuario o email..."
          value={texto} onChange={(e) => setTexto(e.target.value)} />
        <button type="submit" className="btn">Buscar</button>
        {buscar && (
          <button type="button" className="btn btn-secundario"
            onClick={() => { setTexto(''); setBuscar(''); setPagina(1); }}>Limpiar</button>
        )}
      </form>

      <div className="pestanas" role="tablist">
        {FILTROS.map((f) => (
          <button key={f.clave || 'todos'} type="button" role="tab" aria-selected={filtro === f.clave}
            className={filtro === f.clave ? 'activa' : ''}
            onClick={() => { setFiltro(f.clave); setPagina(1); }}>
            {f.texto}
          </button>
        ))}
      </div>

      {aviso && <div className="mensaje-exito" role="status">{aviso}</div>}
      {cargando && <p>Cargando usuarios...</p>}
      {!cargando && error && <div className="mensaje-error">{error}</div>}
      {!cargando && !error && usuarios.length === 0 && (
        <div className="tarjeta centrado"><p>No hay usuarios para mostrar.</p></div>
      )}

      {usuarios.map((u) => (
        <article key={u.id} className={`tarjeta fila-cuenta${u.baneado ? ' cuenta-suspendida' : ''}`}>
          <div className="cuenta-datos">
            <strong>{u.nombre} {u.apellido}</strong>
            <span className="texto-suave">@{u.usuario} · {u.email}</span>
            <span className="texto-suave">Registrado el {fecha(u.created_at)}</span>
            {u.baneado && (
              <span className="motivo-baneo">Suspendido{u.motivo_baneo ? `: “${u.motivo_baneo}”` : ''}</span>
            )}
          </div>
          <div className="item-acciones">
            <span className={`estado ${u.baneado ? 'estado-cancelada' : 'estado-confirmada'}`}>
              {u.baneado ? 'Suspendido' : 'Activo'}
            </span>
            {u.baneado ? (
              <>
                <button type="button" className="btn btn-secundario" onClick={() => setAccion({ tipo: 'reactivar', usuario: u })}>Reactivar</button>
                <button type="button" className="btn btn-peligro" onClick={() => setAccion({ tipo: 'eliminar', usuario: u })}>Eliminar</button>
              </>
            ) : (
              <button type="button" className="btn btn-secundario" onClick={() => setAccion({ tipo: 'suspender', usuario: u })}>Suspender</button>
            )}
          </div>
        </article>
      ))}

      {total > LIMITE && (
        <div className="paginacion">
          <button type="button" className="btn btn-secundario" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>Anterior</button>
          <span>Página {pagina} de {paginas} · {total} usuarios</span>
          <button type="button" className="btn btn-secundario" disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)}>Siguiente</button>
        </div>
      )}

      {accion?.tipo === 'suspender' && <ModalSuspender base="/usuarios" cuenta={accion.usuario} onCerrar={() => setAccion(null)} onListo={terminar} />}
      {accion?.tipo === 'reactivar' && <ModalReactivar base="/usuarios" cuenta={accion.usuario} onCerrar={() => setAccion(null)} onListo={terminar} />}
      {accion?.tipo === 'eliminar' && (
        <ModalEliminar base="/usuarios" cuenta={accion.usuario} onCerrar={() => setAccion(null)} onListo={terminar}
          consecuencias="Se borran para siempre sus reservas, calificaciones, opiniones, reclamos y carrito." />
      )}
    </section>
  );
}
