import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api, { mensajeError } from '../api/client';

export default function RestablecerClave() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [repetir, setRepetir] = useState('');
  const [ver, setVer] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres');
    if (password !== repetir) return setError('Las contraseñas no coinciden');
    setCargando(true);
    try {
      await api.post('/auth/restablecer-clave', { token, password });
      navigate('/login', { state: { registrado: false, clave_cambiada: true } });
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-pagina">
      <div className="login-tarjeta">
        <h1 className="login-titulo">Nueva contraseña</h1>
        {!token ? (
          <div className="mensaje-error" role="alert">El enlace no es válido. Pedí uno nuevo desde "¿Olvidaste tu contraseña?".</div>
        ) : (
          <>
            <p className="login-subtitulo">Elegí una contraseña de al menos 8 caracteres.</p>
            {error && <div className="mensaje-error" role="alert">{error}</div>}
            <form onSubmit={enviar}>
              <div className="login-campo">
                <label htmlFor="nc-pass">Contraseña nueva</label>
                <div className="login-input">
                  <input id="nc-pass" type={ver ? 'text' : 'password'} value={password} minLength={8}
                    autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} required />
                </div>
              </div>
              <div className="login-campo">
                <label htmlFor="nc-rep">Repetir contraseña</label>
                <div className="login-input">
                  <input id="nc-rep" type={ver ? 'text' : 'password'} value={repetir}
                    autoComplete="new-password" onChange={(e) => setRepetir(e.target.value)} required />
                </div>
              </div>
              <label className="login-ver-clave">
                <input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} /> Mostrar contraseñas
              </label>
              <button className="login-boton" type="submit" disabled={cargando}>
                {cargando ? 'Guardando...' : 'Cambiar contraseña'}
              </button>
            </form>
          </>
        )}
        <p className="login-pie"><Link to="/recuperar-contrasena">Pedir un enlace nuevo</Link> · <Link to="/login">Iniciar sesión</Link></p>
      </div>
    </div>
  );
}
