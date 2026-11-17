import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { mensajeError } from '../api/client';

export default function RecuperarClave() {
  const [email, setEmail] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [enviado, setEnviado] = useState('');

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const { data } = await api.post('/auth/olvide-clave', { email: email.trim() });
      setEnviado(data.message);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-pagina">
      <div className="login-tarjeta">
        <h1 className="login-titulo">Recuperar contraseña</h1>
        {enviado ? (
          <>
            <div className="mensaje-exito" role="status">{enviado}</div>
            <p className="login-pie">El enlace vence en 1 hora.</p>
          </>
        ) : (
          <>
            <p className="login-subtitulo">Ingresá el email de tu cuenta y te enviamos un enlace para elegir una contraseña nueva.</p>
            {error && <div className="mensaje-error" role="alert">{error}</div>}
            <form onSubmit={enviar}>
              <div className="login-campo">
                <label htmlFor="rec-email">Email</label>
                <div className="login-input">
                  <input id="rec-email" type="email" value={email} maxLength={150} autoComplete="email"
                    placeholder="tu@email.com" onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
              <button className="login-boton" type="submit" disabled={cargando}>
                {cargando ? 'Enviando...' : 'Enviar enlace'}
              </button>
            </form>
          </>
        )}
        <p className="login-pie"><Link to="/login">‹ Volver a iniciar sesión</Link></p>
      </div>
    </div>
  );
}
