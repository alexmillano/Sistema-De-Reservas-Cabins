import { useEffect, useState } from 'react';
import api, { mensajeError } from '../api/client';
import Modal from '../components/Modal';
import { maxNacimiento } from '../utils/fechas';
import { ModalEliminar, ModalReactivar, ModalSuspender } from '../components/AccionesCuenta';

const FILTROS = [
  { clave: 'activos', texto: 'Activos' },
  { clave: 'suspendidos', texto: 'Suspendidos' },
  { clave: 'todos', texto: 'Todos' }
];
const VACIO = {
  nombre: '', apellido: '', dni: '', telefono: '', email: '', usuario: '', password: '',
  fecha_nacimiento: '', llave_maestra: ''
};
const MAX_FOTO_MB = 5;

const obtenerDatos = async () => {
  try {
    const [admins, cabanas] = await Promise.all([api.get('/admins'), api.get('/cabanas/panel')]);
    if (!Array.isArray(admins.data)) throw new Error('formato');
    admins.data = admins.data.filter((a) => !a.es_superadmin);
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
    ? { ...VACIO, nombre: admin.nombre, apellido: admin.apellido, email: admin.email, usuario: admin.usuario, telefono: admin.telefono || '' }
    : VACIO);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [fotos, setFotos] = useState({ frente: null, dorso: null });

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password && form.password.length < 8) {
      return setError('La contraseña debe tener al menos 8 caracteres.');
    }
    if (!editando) {
      if (!/^[0-9]{7,8}$/.test(form.dni)) return setError('El DNI debe tener 7 u 8 números, sin puntos.');
      if (!form.fecha_nacimiento || form.fecha_nacimiento > maxNacimiento()) return setError('Ingresá la fecha de nacimiento: tiene que ser mayor de 18 años.');
      if (!fotos.frente || !fotos.dorso) return setError('Subí la foto del DNI por delante y por detrás.');
      for (const f of [fotos.frente, fotos.dorso]) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return setError('Las fotos del DNI deben ser JPG, PNG o WEBP.');
        if (f.size > MAX_FOTO_MB * 1024 * 1024) return setError(`Cada foto del DNI no puede pesar más de ${MAX_FOTO_MB} MB.`);
      }
    }
    setEnviando(true);
    try {
      if (editando) {
        const cuerpo = { nombre: form.nombre, apellido: form.apellido, email: form.email, usuario: form.usuario };
        if (form.telefono) cuerpo.telefono = form.telefono;
        if (form.password) cuerpo.password = form.password;
        const { data } = await api.put(`/admins/${admin.id}`, cuerpo);
        await onListo(data.message);
      } else {
        const datos = new FormData();
        for (const campo of ['nombre', 'apellido', 'dni', 'telefono', 'email', 'usuario', 'password', 'llave_maestra']) {
          datos.append(campo, form[campo]);
        }
        datos.append('fecha_nacimiento', form.fecha_nacimiento);
        datos.append('dni_frente', fotos.frente);
        datos.append('dni_dorso', fotos.dorso);
        const { data } = await api.post('/admins', datos);
        await onListo(data.message);
      }
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  };

  return (
    <Modal titulo={editando ? 'Editar dueño' : 'Crear dueño'} onCerrar={onCerrar}>
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
        {!editando && (
          <div className="campo">
            <label htmlFor="a-dni">DNI (solo números)</label>
            <input id="a-dni" name="dni" inputMode="numeric" maxLength={8} value={form.dni}
              onChange={(e) => setForm({ ...form, dni: e.target.value.replace(/\D/g, '') })} required />
          </div>
        )}
        <div className="campo">
          <label htmlFor="a-tel">Teléfono</label>
          <input id="a-tel" name="telefono" type="tel" maxLength={25} placeholder="+54 11 5555-1234"
            value={form.telefono} onChange={cambiar} required={!editando} />
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
              <label htmlFor="a-nac">Fecha de nacimiento (mayor de 18 años)</label>
              <input id="a-nac" name="fecha_nacimiento" type="date" min="1900-01-01" max={maxNacimiento()}
                value={form.fecha_nacimiento} onChange={cambiar} required />
            </div>
            <div className="form-fila">
              <div className="campo">
                <label htmlFor="a-dni-f">Foto del DNI (frente)</label>
                <input id="a-dni-f" type="file" accept="image/jpeg,image/png,image/webp" required
                  onChange={(e) => setFotos({ ...fotos, frente: e.target.files?.[0] || null })} />
              </div>
              <div className="campo">
                <label htmlFor="a-dni-d">Foto del DNI (dorso)</label>
                <input id="a-dni-d" type="file" accept="image/jpeg,image/png,image/webp" required
                  onChange={(e) => setFotos({ ...fotos, dorso: e.target.files?.[0] || null })} />
              </div>
            </div>
            <small className="texto-suave">Las fotos se guardan en un espacio privado; solo las ve el superadmin.</small>
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
            {enviando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear dueño'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Fotos del DNI: se piden al servidor al abrir (enlaces temporales de 10 minutos)
function ModalDni({ admin, onCerrar }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    api.get(`/admins/${admin.id}/dni`)
      .then(({ data }) => activo && setDatos(data))
      .catch((err) => activo && setError(mensajeError(err)));
    return () => { activo = false; };
  }, [admin.id]);

  return (
    <Modal titulo={`DNI de ${admin.nombre} ${admin.apellido}`} onCerrar={onCerrar}>
      {error && <div className="mensaje-error">{error}</div>}
      {!datos && !error && <p>Cargando...</p>}
      {datos && (
        <>
          <p><strong>Número:</strong> {datos.dni}</p>
          <div className="dni-fotos">
            {datos.frente ? <img src={datos.frente} alt="DNI, frente" /> : <p className="texto-suave">Frente no disponible</p>}
            {datos.dorso ? <img src={datos.dorso} alt="DNI, dorso" /> : <p className="texto-suave">Dorso no disponible</p>}
          </div>
          <small className="texto-suave">Los enlaces son temporales (10 minutos). Es información confidencial.</small>
        </>
      )}
      <div className="modal-botones">
        <button type="button" className="btn" onClick={onCerrar}>Cerrar</button>
      </div>
    </Modal>
  );
}

export default function Duenos() {
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
          <h1>Dueños</h1>
          <p className="texto-suave">Cuentas de los dueños de cabañas de la plataforma.</p>
        </div>
        <button type="button" className="btn" onClick={() => setAccion({ tipo: 'crear' })}>
          + Crear dueño
        </button>
      </div>

      <div className="kpis">
        <div className="tarjeta kpi">
          <span className="kpi-titulo">Total de dueños</span>
          <strong className="kpi-valor">{admins.length}</strong>
          <span className="texto-suave">{cuenta.activos} activos · {suspendidos} suspendidos</span>
        </div>
        <div className="tarjeta kpi">
          <span className="kpi-titulo">Cabañas gestionadas</span>
          <strong className="kpi-valor">{Object.values(cabanasPorAdmin).reduce((a, n) => a + n, 0)}</strong>
          <span className="texto-suave">En toda la plataforma</span>
        </div>
      </div>

      <div className="campo">
        <input type="search" aria-label="Buscar dueños" placeholder="Buscá por nombre, usuario o email..."
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
      {cargando && <p>Cargando dueños...</p>}
      {!cargando && error && <div className="mensaje-error">{error}</div>}
      {!cargando && !error && visibles.length === 0 && (
        <div className="tarjeta centrado"><p>No hay dueños en esta sección.</p></div>
      )}

      {visibles.map((a) => (
        <article key={a.id} className={`tarjeta fila-cuenta${a.baneado ? ' cuenta-suspendida' : ''}`}>
          <div className="cuenta-datos">
            <strong>{a.nombre} {a.apellido}</strong>
            {a.es_superadmin && <span className="estado estado-completada">Superadmin</span>}
            <span className="texto-suave">@{a.usuario} · {a.email}</span>
            {(a.dni || a.telefono) && (
              <span className="texto-suave">
                {a.dni && <>DNI {a.dni}</>}{a.dni && a.telefono && ' · '}{a.telefono && <>Tel. {a.telefono}</>}
              </span>
            )}
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
                {a.tiene_dni_fotos && (
                  <button type="button" className="btn btn-secundario" onClick={() => setAccion({ tipo: 'dni', admin: a })}>Ver DNI</button>
                )}
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
      {accion?.tipo === 'dni' && <ModalDni admin={accion.admin} onCerrar={() => setAccion(null)} />}
      {accion?.tipo === 'suspender' && <ModalSuspender base="/admins" cuenta={accion.admin} onCerrar={() => setAccion(null)} onListo={terminar} />}
      {accion?.tipo === 'reactivar' && <ModalReactivar base="/admins" cuenta={accion.admin} onCerrar={() => setAccion(null)} onListo={terminar} />}
      {accion?.tipo === 'eliminar' && (
        <ModalEliminar base="/admins" cuenta={accion.admin} onCerrar={() => setAccion(null)} onListo={terminarEliminacion}
          consecuencias="Sus reservas vigentes se cancelan, las cabañas sin reservas se borran y las que tienen historial se desactivan." />
      )}
    </section>
  );
}
