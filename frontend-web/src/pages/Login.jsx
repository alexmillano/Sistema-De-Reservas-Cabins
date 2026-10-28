import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mensajeError } from '../api/client';

export default function Login() {
  const { user, login, loginAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [modo, setModo] = useState('usuario');
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

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

  return (
    <div className={`tarjeta formulario ${modo === 'admin' ? 'modo-admin' : ''}`}>
      <h2>Iniciar sesión</h2>

      <div className="pestanas">
        <button type="button" className={modo === 'usuario' ? 'activa' : ''} onClick={() => setModo('usuario')}>
          Usuario
        </button>
        <button type="button" className={modo === 'admin' ? 'activa' : ''} onClick={() => setModo('admin')}>
          Administrador
        </button>
      </div>

      {location.state?.registrado && (
        <div className="mensaje-exito">Cuenta creada. Ya podés iniciar sesión.</div>
      )}
      {error && <div className="mensaje-error">{error}</div>}

      <form onSubmit={enviar}>
        <div className="campo">
          <label htmlFor="identificador">Usuario o email</label>
          <input
            id="identificador"
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
            required
          />
        </div>
        <div className="campo">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button className="btn" type="submit" disabled={cargando} style={{ width: '100%' }}>
          {cargando ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>

      {modo === 'usuario' && (
        <p className="texto-chico">¿No tenés cuenta? <Link to="/registro">Registrate</Link></p>
      )}
    </div>
  );
}