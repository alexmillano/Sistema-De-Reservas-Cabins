import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mensajeError } from '../api/client';

// Íconos simples (trazos de 24x24) para no sumar librerías
const ICONOS = {
  casa: 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6',
  persona: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6',
  escudo: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3zM9 12l2 2 4-4',
  sobre: 'M3 6h18v12H3zM3 7l9 7 9-7',
  credencial: 'M3 5h18v14H3zM7 10h4M7 14h6M15 10h2',
  candado: 'M6 11h12v9H6zM8 11V8a4 4 0 118 0v3',
  ojo: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  ojoTachado: 'M3 3l18 18M10.6 6.1A9.8 9.8 0 0112 6c6 0 10 6 10 6a17 17 0 01-3.2 3.8M6.5 7.5A17 17 0 002 12s4 7 10 7c1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 004.2 4.2'
};

function Icono({ d, tam = 18 }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export default function Login() {
  const { user, login, loginAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [modo, setModo] = useState('usuario');
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(() => {
    try {
      const aviso = sessionStorage.getItem('aviso_login') || '';
      sessionStorage.removeItem('aviso_login');
      return aviso;
    } catch {
      return '';
    }
  });
  const [cargando, setCargando] = useState(false);
  const [verClave, setVerClave] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      if (modo === 'admin') await loginAdmin(identificador.trim(), password);
      else await login(identificador.trim(), password);
      navigate('/');
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  const esAdmin = modo === 'admin';
  const cambiarModo = (nuevo) => {
    setModo(nuevo);
    setError('');
  };

  return (
    <div className={`login-pagina${esAdmin ? ' login-admin' : ''}`}>
      <span className="login-lateral login-lateral-izq" aria-hidden="true">Patagonia · Cuyo · Norte</span>
      <span className="login-lateral login-lateral-der" aria-hidden="true">Cabins Argentina</span>

      {esAdmin && (
        <div className="login-cabecera">
          <Link to="/" className="login-volver">← Volver al portal público</Link>
          <span className="login-pildora">● Acceso seguro</span>
        </div>
      )}

      <div className="login-tarjeta">
        {esAdmin ? (
          <div className="login-insignia"><Icono d={ICONOS.escudo} /> Acceso restringido</div>
        ) : (
          <div className="login-icono"><Icono d={ICONOS.casa} tam={26} /></div>
        )}
        <h1 className="login-titulo">Iniciar sesión</h1>
        <p className="login-subtitulo">
          {esAdmin
            ? 'Acceso exclusivo para el panel de administración de CABINS.'
            : 'Ingresá a tu cuenta para gestionar tus reservas en toda Argentina.'}
        </p>

        <div className="login-selector" role="tablist">
          <button type="button" role="tab" aria-selected={!esAdmin} className={!esAdmin ? 'activa' : ''}
            onClick={() => cambiarModo('usuario')}>
            <Icono d={ICONOS.persona} /> Usuario
          </button>
          <button type="button" role="tab" aria-selected={esAdmin} className={esAdmin ? 'activa' : ''}
            onClick={() => cambiarModo('admin')}>
            <Icono d={ICONOS.escudo} /> Administrador
          </button>
        </div>

        {location.state?.registrado && (
          <div className="mensaje-exito">Cuenta creada. Ya podés iniciar sesión.</div>
        )}
        {error && <div className="mensaje-error" role="alert">{error}</div>}

        <form onSubmit={enviar}>
          <div className="login-campo">
            <label htmlFor="identificador">{esAdmin ? 'Usuario o email corporativo' : 'Usuario o email'}</label>
            <div className="login-input">
              <Icono d={esAdmin ? ICONOS.credencial : ICONOS.sobre} />
              <input id="identificador" value={identificador} autoComplete="username"
                placeholder={esAdmin ? 'admin@cabins.com.ar' : 'ej. viajero@cabins.com.ar o tu_usuario'}
                onChange={(e) => setIdentificador(e.target.value)} required />
            </div>
          </div>

          <div className="login-campo">
            <div className="login-etiqueta-fila">
              <label htmlFor="password">{esAdmin ? 'Contraseña de administrador' : 'Contraseña'}</label>
              {esAdmin
                ? <Link to="/recuperar-contrasena" className="login-enlace-chico">¿Olvidaste tu contraseña?</Link>
                : <span className="login-portal">● Portal huésped</span>}
            </div>
            <div className="login-input">
              <Icono d={ICONOS.candado} />
              <input id="password" type={verClave ? 'text' : 'password'} value={password}
                autoComplete="current-password" placeholder="••••••••••••"
                onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" className="login-ojo" onClick={() => setVerClave(!verClave)}
                aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                <Icono d={verClave ? ICONOS.ojoTachado : ICONOS.ojo} />
              </button>
            </div>
          </div>

          {!esAdmin && (
            <div className="login-olvido">
              <Link to="/recuperar-contrasena" className="login-enlace-chico">¿Olvidaste tu contraseña?</Link>
            </div>
          )}

          <button className="login-boton" type="submit" disabled={cargando}>
            {cargando ? 'Ingresando...' : esAdmin ? 'Ingresar al panel →' : 'Ingresar →'}
          </button>
        </form>

        {esAdmin ? (
          <>
            <div className="login-aviso">
              <Icono d={ICONOS.escudo} />
              <span>Conexión segura con cifrado HTTPS. Tus datos de acceso viajan protegidos.</span>
            </div>
            <p className="login-pie">Las cuentas de administrador las crea el equipo de CABINS.</p>
            <button type="button" className="login-enlace-boton" onClick={() => cambiarModo('usuario')}>
              ⇄ Volver al acceso general de huéspedes
            </button>
          </>
        ) : (
          <>
            <div className="login-separador"><span>o</span></div>
            <p className="login-pie">¿No tenés cuenta? <Link to="/registro">Registrate ›</Link></p>
          </>
        )}
      </div>

      {!esAdmin && (
        <p className="login-seguro"><Icono d={ICONOS.escudo} tam={14} /> Conexión cifrada de alta seguridad</p>
      )}
    </div>
  );
}
