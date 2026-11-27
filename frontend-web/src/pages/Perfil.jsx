import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { mensajeError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { contarNoches, formatearFechaCorta, maxNacimiento } from '../utils/fechas';

const CAMPOS_VACIOS = { email: '', usuario: '', fecha_nacimiento: '', telefono: '', dni: '' };

const aFormulario = (p) => ({
  email: p.email, usuario: p.usuario, fecha_nacimiento: p.fecha_nacimiento || '',
  telefono: p.telefono || '', dni: p.dni || ''
});

export default function Perfil() {
  const { user, logout, actualizarUsuario } = useAuth();
  const navigate = useNavigate();
  const [perfil, setPerfil] = useState(null);
  const [estadisticas, setEstadisticas] = useState(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [pestana, setPestana] = useState('datos');
  const [form, setForm] = useState(CAMPOS_VACIOS);
  const [msg, setMsg] = useState({ tipo: '', texto: '' });
  const [guardando, setGuardando] = useState(false);
  const [pass, setPass] = useState({ password_actual: '', password_nueva: '', repetir: '' });
  const [msgPass, setMsgPass] = useState({ tipo: '', texto: '' });
  const [cambiandoPass, setCambiandoPass] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [msgFoto, setMsgFoto] = useState('');
  const inputFoto = useRef(null);

  useEffect(() => {
    let activo = true;
    api.get('/perfil')
      .then(({ data }) => {
        if (!activo) return;
        setPerfil(data);
        setForm(aFormulario(data));
      })
      .catch((err) => activo && setErrorCarga(mensajeError(err)));

    if (user?.rol === 'usuario') {
      api.get('/reservas/mis-reservas')
        .then(({ data }) => {
          if (!activo) return;
          const hechas = data.filter((r) => r.estado === 'completada');
          setEstadisticas({
            estadias: hechas.length,
            noches: hechas.reduce((a, r) => a + contarNoches(r.fecha_checkin, r.fecha_checkout), 0)
          });
        })
        .catch(() => {});
    }
    return () => {
      activo = false;
    };
  }, [user?.rol]);

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const guardar = async (e) => {
    e.preventDefault();
    setMsg({ tipo: '', texto: '' });
    setGuardando(true);
    try {
      // Nombre, apellido y DNI ya cargado no se editan: solo se envía lo que se puede cambiar
      const cuerpo = { email: form.email, usuario: form.usuario };
      if (!perfil.fecha_nacimiento && form.fecha_nacimiento) cuerpo.fecha_nacimiento = form.fecha_nacimiento;
      if (perfil.rol === 'admin' && form.telefono) cuerpo.telefono = form.telefono;
      if (!perfil.dni && form.dni) cuerpo.dni = form.dni;
      const { data } = await api.put('/perfil', cuerpo);
      setPerfil(data.perfil);
      setForm(aFormulario(data.perfil));
      actualizarUsuario({ email: data.perfil.email, usuario: data.perfil.usuario });
      setMsg({ tipo: 'exito', texto: 'Datos actualizados correctamente.' });
    } catch (err) {
      setMsg({ tipo: 'error', texto: mensajeError(err) });
    } finally {
      setGuardando(false);
    }
  };

  const cambiarPassword = async (e) => {
    e.preventDefault();
    setMsgPass({ tipo: '', texto: '' });
    if (pass.password_nueva.length < 8) {
      return setMsgPass({ tipo: 'error', texto: 'La contraseña nueva debe tener al menos 8 caracteres.' });
    }
    if (pass.password_nueva !== pass.repetir) {
      return setMsgPass({ tipo: 'error', texto: 'Las contraseñas nuevas no coinciden.' });
    }
    setCambiandoPass(true);
    try {
      await api.put('/perfil/password', {
        password_actual: pass.password_actual,
        password_nueva: pass.password_nueva
      });
      setPass({ password_actual: '', password_nueva: '', repetir: '' });
      setMsgPass({ tipo: 'exito', texto: 'Contraseña actualizada correctamente.' });
    } catch (err) {
      setMsgPass({ tipo: 'error', texto: mensajeError(err) });
    } finally {
      setCambiandoPass(false);
    }
  };

  const elegirFoto = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    setMsgFoto('');
    if (!archivo) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)) return setMsgFoto('Solo se aceptan imágenes JPG, PNG o WEBP.');
    if (archivo.size > 5 * 1024 * 1024) return setMsgFoto('La imagen no puede pesar más de 5 MB.');
    const datos = new FormData();
    datos.append('imagen', archivo);
    setSubiendoFoto(true);
    try {
      const { data } = await api.put('/perfil/foto', datos);
      setPerfil((p) => ({ ...p, foto_url: data.foto_url }));
      actualizarUsuario({ foto_url: data.foto_url });
    } catch (err) {
      setMsgFoto(mensajeError(err));
    } finally {
      setSubiendoFoto(false);
    }
  };

  const quitarFoto = async () => {
    setMsgFoto('');
    setSubiendoFoto(true);
    try {
      await api.delete('/perfil/foto');
      setPerfil((p) => ({ ...p, foto_url: null }));
      actualizarUsuario({ foto_url: null });
    } catch (err) {
      setMsgFoto(mensajeError(err));
    } finally {
      setSubiendoFoto(false);
    }
  };

  const cerrarSesion = () => {
    logout();
    navigate('/');
  };

  if (errorCarga) return <section className="seccion"><div className="mensaje-error">{errorCarga}</div></section>;
  if (!perfil) return <section className="seccion"><p>Cargando perfil...</p></section>;

  const rolTexto = perfil.es_superadmin ? 'Superadministrador'
    : perfil.rol === 'admin' ? 'Dueño de cabañas' : 'Huésped';

  return (
    <section className="seccion perfil">
      <div className="tarjeta perfil-cabecera centrado">
        <div className="avatar" aria-hidden="true">
          {perfil.foto_url
            ? <img src={perfil.foto_url} alt="" className="avatar-img" />
            : <>{perfil.nombre[0]}{perfil.apellido[0]}</>}
        </div>
        <div className="avatar-acciones">
          <input ref={inputFoto} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={elegirFoto} data-testid="input-foto" />
          <button type="button" className="btn btn-secundario" disabled={subiendoFoto} onClick={() => inputFoto.current?.click()}>
            {subiendoFoto ? 'Subiendo...' : perfil.foto_url ? 'Cambiar foto' : 'Subir foto'}
          </button>
          {perfil.foto_url && (
            <button type="button" className="boton-texto" disabled={subiendoFoto} onClick={quitarFoto}>Quitar</button>
          )}
        </div>
        {msgFoto && <div className="mensaje-error" role="status">{msgFoto}</div>}
        <h1>{perfil.nombre} {perfil.apellido}</h1>
        <p>{perfil.email}</p>
        <p className="texto-suave">@{perfil.usuario} · {rolTexto}</p>
        <p className="texto-suave">Miembro desde {formatearFechaCorta(String(perfil.created_at).slice(0, 10))}</p>
        {estadisticas && (
          <div className="perfil-stats">
            <div><strong>{estadisticas.estadias}</strong><span>Estadías</span></div>
            <div><strong>{estadisticas.noches}</strong><span>Noches</span></div>
          </div>
        )}
      </div>

      <div className="pestanas" role="tablist">
        <button type="button" role="tab" aria-selected={pestana === 'datos'}
          className={pestana === 'datos' ? 'activa' : ''} onClick={() => setPestana('datos')}>
          Mis datos
        </button>
        <button type="button" role="tab" aria-selected={pestana === 'seguridad'}
          className={pestana === 'seguridad' ? 'activa' : ''} onClick={() => setPestana('seguridad')}>
          Seguridad
        </button>
      </div>

      {pestana === 'datos' && (
        <form className="tarjeta" onSubmit={guardar}>
          <h2>Información personal</h2>
          <div className="form-fila">
            <div className="campo">
              <label htmlFor="p-nombre">Nombre</label>
              <input id="p-nombre" value={perfil.nombre} disabled readOnly />
            </div>
            <div className="campo">
              <label htmlFor="p-apellido">Apellido</label>
              <input id="p-apellido" value={perfil.apellido} disabled readOnly />
            </div>
          </div>
          <div className="campo">
            <label htmlFor="p-dni">DNI</label>
            {perfil.dni ? (
              <input id="p-dni" value={perfil.dni} disabled readOnly />
            ) : (
              <input id="p-dni" name="dni" inputMode="numeric" maxLength={8} placeholder="Cargalo una sola vez"
                value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value.replace(/\D/g, '') })} />
            )}
            <small className="texto-suave">
              {perfil.dni ? 'Nombre, apellido, DNI y fecha de nacimiento no se pueden modificar. Si hay un error, contactá a soporte.'
                : 'Una vez cargado, el DNI no se puede modificar.'}
            </small>
          </div>
          <div className="campo">
            <label htmlFor="p-email">Correo electrónico</label>
            <input id="p-email" name="email" type="email" maxLength={150} value={form.email} onChange={cambiar} required />
          </div>
          {perfil.rol === 'admin' && (
            <div className="campo">
              <label htmlFor="p-tel">Teléfono</label>
              <input id="p-tel" name="telefono" type="tel" maxLength={25} placeholder="+54 11 5555-1234"
                value={form.telefono} onChange={cambiar} />
            </div>
          )}
          <div className="form-fila">
            <div className="campo">
              <label htmlFor="p-usuario">Usuario</label>
              <input id="p-usuario" name="usuario" maxLength={50} value={form.usuario} onChange={cambiar} required />
            </div>
            <div className="campo">
              <label htmlFor="p-nac">Fecha de nacimiento</label>
              {perfil.fecha_nacimiento ? (
                <input id="p-nac" type="date" value={perfil.fecha_nacimiento} disabled readOnly />
              ) : (
                <input id="p-nac" name="fecha_nacimiento" type="date" min="1900-01-01" max={maxNacimiento()}
                  value={form.fecha_nacimiento} onChange={cambiar} />
              )}
            </div>
          </div>
          {msg.texto && <div className={msg.tipo === 'exito' ? 'mensaje-exito' : 'mensaje-error'} role="status">{msg.texto}</div>}
          <button className="btn" type="submit" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      )}

      {pestana === 'seguridad' && (
        <form className="tarjeta" onSubmit={cambiarPassword}>
          <h2>Cambiar contraseña</h2>
          <div className="campo">
            <label htmlFor="s-actual">Contraseña actual</label>
            <input id="s-actual" type="password" autoComplete="current-password"
              value={pass.password_actual}
              onChange={(e) => setPass({ ...pass, password_actual: e.target.value })} required />
          </div>
          <div className="campo">
            <label htmlFor="s-nueva">Contraseña nueva (mínimo 8 caracteres)</label>
            <input id="s-nueva" type="password" autoComplete="new-password"
              value={pass.password_nueva}
              onChange={(e) => setPass({ ...pass, password_nueva: e.target.value })} required />
          </div>
          <div className="campo">
            <label htmlFor="s-repetir">Repetir contraseña nueva</label>
            <input id="s-repetir" type="password" autoComplete="new-password"
              value={pass.repetir}
              onChange={(e) => setPass({ ...pass, repetir: e.target.value })} required />
          </div>
          {msgPass.texto && <div className={msgPass.tipo === 'exito' ? 'mensaje-exito' : 'mensaje-error'} role="status">{msgPass.texto}</div>}
          <button className="btn" type="submit" disabled={cambiandoPass}>
            {cambiandoPass ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </form>
      )}

      <button type="button" className="btn-cerrar-sesion" onClick={() => setConfirmando(true)}>
        Cerrar sesión
      </button>

      {confirmando && (
        <div className="modal-fondo" onClick={() => setConfirmando(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Cerrar sesión</h3>
            <p>¿Estás seguro que querés cerrar sesión?</p>
            <div className="modal-botones">
              <button type="button" className="btn btn-secundario" onClick={() => setConfirmando(false)}>
                Cancelar
              </button>
              <button type="button" className="btn" onClick={cerrarSesion}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
