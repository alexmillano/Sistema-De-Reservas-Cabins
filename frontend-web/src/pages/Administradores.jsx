import { useEffect, useState } from 'react';
import api, { mensajeError } from '../api/client';
import Modal from '../components/Modal';
import { ModalEliminar, ModalReactivar, ModalSuspender } from '../components/AccionesCuenta';

const FILTROS = [
  { clave: 'activos', texto: 'Activos' },
  { clave: 'suspendidos', texto: 'Suspendidos' },
  { clave: 'todos', texto: 'Todos' }
];
const VACIO = { nombre: '', apellido: '', email: '', usuario: '', password: '', fecha_nacimiento: '', llave_maestra: '' };

const obtenerDatos = async () => {
  try {
    const [admins, cabanas] = await Promise.all([api.get('/admins'), api.get('/cabanas/panel')]);
    if (!Array.isArray(admins.data)) throw new Error('formato');
    const porAdmin = {};
    for (const c of cabanas.data) porAdmin[c.admin_id] = (porAdmin[c.admin_id] || 0) + 1;
    return { cargando: false, error: '', admins: admins.data, cabanasPorAdmin: porAdmin };
  } catch (err) {
    return {
      cargando: false, admins: [], cabanasPorAdmin: {},
      error: err.message === 'formato'
        ? 'La respuesta del servidor no es la esperada. Revisá que el backend esté actualizado.'
        : mensajeError(err)
    };
  }
};

// Alta y edición comparten el formulario; en edición no se pide la llave y la contraseña es opcional
function ModalFormulario({ admin, onCerrar, onListo }) {
  const editando = Boolean(admin);
  const [form, setForm] = useState(editando
    ? { ...VACIO, nombre: admin.nombre, apellido: admin.apellido, email: admin.email, usuario: admin.usuario }
    : VACIO);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password && form.password.length < 8) {
      return setError('La contraseña debe tener al menos 8 caracteres.');
    }
    setEnviando(true);
    try {
      if (editando) {
        const cuerpo = { nombre: form.nombre, apellido: form.apellido, email: form.email, usuario: form.usuario };
        if (form.password) cuerpo.password = form.password;
        const { data } = await api.put(`/admins/${admin.id}`, cuerpo);
        await onListo(data.message);
      } else {
        const { data } = await api.post('/admins', {
          nombre: form.nombre, apellido: form.apellido, email: form.email, usuario: form.usuario,
          password: form.password, llave_maestra: form.llave_maestra,
          fecha_nacimiento: form.fecha_nacimiento || undefined
        });
        await onListo(data.message);
      }
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  };

  return (
    <Modal titulo={editando ? 'Editar administrador' : 'Crear administrador'} onCerrar={onCerrar}>
      <form onSubmit={enviar}>
        <div className="form-fila">
          <div className="campo">
            <label htmlFor="a-nombre">Nombre</label>
            <input id="a-nombre" name="nombre" maxLength={100} value={form.nombre} onChange={cambiar} required />
          </div>
          <div className="campo">
            <label htmlFor="a-apellido">Apellido</label>
            <input id="a-apellido" name="apellido" maxLength={100} value={form.apellido} onChange={cambiar} required />
          </div>
        </div>
        <div className="campo">
          <label htmlFor="a-email">Correo electrónico</label>
          <input id="a-email" name="email" type="email" maxLength={150} value={form.email} onChange={cambiar} required />
        </div>
        <div className="campo">
          <label htmlFor="a-usuario">Usuario</label>
          <input id="a-usuario" name="usuario" maxLength={50} value={form.usuario} onChange={cambiar} required />
        </div>
        <div className="campo">
          <label htmlFor="a-pass">{editando ? 'Contraseña nueva (opcional)' : 'Contraseña (mínimo 8 caracteres)'}</label>
          <input id="a-pass" name="password" type="password" autoComplete="new-password"
            value={form.password} onChange={cambiar} required={!editando} />
        </div>
        {!editando && (
          <>
            <div className="campo">
              <label htmlFor="a-nac">Fecha de nacimiento (opcional)</label>
              <input id="a-nac" name="fecha_nacimiento" type="date" min="1900-01-01"
                value={form.fecha_nacimiento} onChange={cambiar} />
            </div>
            <div className="campo">
              <label htmlFor="a-llave">Tu llave maestra</label>
              <input id="a-llave" name="llave_maestra" type="password" autoComplete="off"
                value={form.llave_maestra} onChange={cambiar} required />
              <small className="texto-suave">Se pide para confirmar que vos autorizás el alta.</small>
            </div>
          </>
        )}
        {error && <div className="mensaje-error">{error}</div>}
        <div className="modal-botones">
          <button type="button" className="btn btn-secundario" onClick={onCerrar}>Cancelar</button>
          <button type="submit" className="btn" disabled={enviando}>
            {enviando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear administrador'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Administradores() {
  const [datos, setDatos] = useState({ cargando: true, error: '', admins: [], cabanasPorAdmin: {} });
  const [filtro, setFiltro] = useState('activos');
  const [busqueda, setBusqueda] = useState('');
  const [aviso, setAviso] = useState('');
  const [accion, setAccion] = useState(null); // { tipo, admin }

  useEffect(() => {
    let activo = true;
    obtenerDatos().then((nuevo) => {
      if (activo) setDatos(nuevo);
    });
    return () => {
      activo = false;
    };
  }, []);

  const terminar = async (mensaje) => {
    setAviso(mensaje);
    setAccion(null);
    setDatos(await obtenerDatos());
  };

  const terminarEliminacion = async (mensaje, resultado) => {
    await terminar(
      `${mensaje}. Cabañas eliminadas: ${resultado.cabanas_eliminadas}, desactivadas: ${resultado.cabanas_desactivadas}, reservas canceladas: ${resultado.reservas_canceladas}.`
    );
  };

  const { cargando, error, admins, cabanasPorAdmin } = datos;
  const termino = busqueda.trim().toLowerCase();
  const suspendidos = admins.filter((a) => a.baneado).length;
  const cuenta = { activos: admins.length - suspendidos, suspendidos, todos: admins.length };
  const visibles = admins.filter((a) => {
    if (filtro === 'activos' && a.baneado) return false;
    if (filtro === 'suspendidos' && !a.baneado) return false;
    return !termino || `${a.nombre} ${a.apellido} ${a.usuario} ${a.email}`.toLowerCase().includes(termino);
  });

  return (
    <section className="seccion">
      <div className="catalogo-barra">
        <div>
          <h1>Administradores</h1>
          <p className="texto-suave">Cuentas de los dueños de cabañas y administradores del sistema.</p>
        </div>
        <button type="button" className="btn" onClick={() => setAccion({ tipo: 'crear' })}>
          + Crear administrador
        </button>
      </div>

      <div className="kpis">
        <div className="tarjeta kpi">
          <span className="kpi-titulo">Total de administradores</span>
          <strong className="kpi-valor">{admins.length}</strong>
          <span className="texto-suave">{cuenta.activos} activos · {suspendidos} suspendidos</span>
        </div>
        <div className="tarjeta kpi">
          <span className="kpi-titulo">Cabañas gestionadas</span>
          <strong className="kpi-valor">{Object.values(cabanasPorAdmin).reduce((a, n) => a + n, 0)}</strong>
          <span className="texto-suave">Entre todos los dueños</span>
        </div>
      </div>

      <div className="campo">
        <input type="search" aria-label="Buscar administradores" placeholder="Buscá por nombre, usuario o email..."
          value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </div>

      <div className="pestanas" role="tablist">
        {FILTROS.map((f) => (
          <button key={f.clave} type="button" role="tab" aria-selected={filtro === f.clave}
            className={filtro === f.clave ? 'activa' : ''} onClick={() => setFiltro(f.clave)}>
            {f.texto} ({cuenta[f.clave]})
          </button>
        ))}
      </div>

      {aviso && <div className="mensaje-exito" role="status">{aviso}</div>}
      {cargando && <p>Cargando administradores...</p>}
      {!cargando && error && <div className="mensaje-error">{error}</div>}
      {!cargando && !error && visibles.length === 0 && (
        <div className="tarjeta centrado"><p>No hay administradores en esta sección.</p></div>
      )}

      {visibles.map((a) => (
        <article key={a.id} className={`tarjeta fila-cuenta${a.baneado ? ' cuenta-suspendida' : ''}`}>
          <div className="cuenta-datos">
            <strong>{a.nombre} {a.apellido}</strong>
            {a.es_superadmin && <span className="estado estado-completada">Superadmin</span>}
            <span className="texto-suave">@{a.usuario} · {a.email}</span>
            <span className="texto-suave">
              {cabanasPorAdmin[a.id] || 0} {(cabanasPorAdmin[a.id] || 0) === 1 ? 'cabaña' : 'cabañas'}
            </span>
            {a.baneado && (
              <span className="motivo-baneo">
                Suspendido{a.motivo_baneo ? `: “${a.motivo_baneo}”` : ''}
                {(cabanasPorAdmin[a.id] || 0) > 0 && ' · Sus cabañas están ocultas del catálogo'}
              </span>
            )}
          </div>
          <div className="item-acciones">
            <span className={`estado ${a.baneado ? 'estado-cancelada' : 'estado-confirmada'}`}>
              {a.baneado ? 'Suspendido' : 'Activo'}
            </span>
            {!a.es_superadmin && (
              <>
                <button type="button" className="btn btn-secundario" onClick={() => setAccion({ tipo: 'editar', admin: a })}>Editar</button>
                {a.baneado ? (
                  <>
                    <button type="button" className="btn btn-secundario" onClick={() => setAccion({ tipo: 'reactivar', admin: a })}>Reactivar</button>
                    <button type="button" className="btn btn-peligro" onClick={() => setAccion({ tipo: 'eliminar', admin: a })}>Eliminar</button>
                  </>
                ) : (
                  <button type="button" className="btn btn-secundario" onClick={() => setAccion({ tipo: 'suspender', admin: a })}>Suspender</button>
                )}
              </>
            )}
          </div>
        </article>
      ))}

      {accion?.tipo === 'crear' && <ModalFormulario onCerrar={() => setAccion(null)} onListo={terminar} />}
      {accion?.tipo === 'editar' && <ModalFormulario admin={accion.admin} onCerrar={() => setAccion(null)} onListo={terminar} />}
      {accion?.tipo === 'suspender' && <ModalSuspender base="/admins" cuenta={accion.admin} onCerrar={() => setAccion(null)} onListo={terminar} />}
      {accion?.tipo === 'reactivar' && <ModalReactivar base="/admins" cuenta={accion.admin} onCerrar={() => setAccion(null)} onListo={terminar} />}
      {accion?.tipo === 'eliminar' && (
        <ModalEliminar base="/admins" cuenta={accion.admin} onCerrar={() => setAccion(null)} onListo={terminarEliminacion}
          consecuencias="Sus reservas vigentes se cancelan, las cabañas sin reservas se borran y las que tienen historial se desactivan." />
      )}
    </section>
  );
}
