import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { mensajeError } from '../api/client';

const VACIO = {
  nombre: '', apellido: '', email: '', usuario: '',
  password: '', confirmar: '', fecha_nacimiento: ''
};

export default function Registro() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmar) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setCargando(true);
    try {
      await api.post('/auth/register', {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: form.email.trim(),
        usuario: form.usuario.trim(),
        password: form.password,
        fecha_nacimiento: form.fecha_nacimiento || undefined
      });
      navigate('/login', { state: { registrado: true } });
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="tarjeta formulario">
      <h2>Crear cuenta</h2>
      {error && <div className="mensaje-error">{error}</div>}

      <form onSubmit={enviar}>
        <div className="campo">
          <label htmlFor="nombre">Nombre</label>
          <input id="nombre" name="nombre" value={form.nombre} onChange={cambiar} required />
        </div>
        <div className="campo">
          <label htmlFor="apellido">Apellido</label>
          <input id="apellido" name="apellido" value={form.apellido} onChange={cambiar} required />
        </div>
        <div className="campo">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" value={form.email} onChange={cambiar} required />
        </div>
        <div className="campo">
          <label htmlFor="usuario">Nombre de usuario</label>
          <input id="usuario" name="usuario" value={form.usuario} onChange={cambiar} required />
        </div>
        <div className="campo">
          <label htmlFor="fecha_nacimiento">Fecha de nacimiento (opcional)</label>
          <input
            id="fecha_nacimiento" name="fecha_nacimiento" type="date"
            value={form.fecha_nacimiento} onChange={cambiar}
          />
        </div>
        <div className="campo">
          <label htmlFor="password">Contraseña (mínimo 6 caracteres)</label>
          <input
            id="password" name="password" type="password" minLength={6}
            value={form.password} onChange={cambiar} required
          />
        </div>
        <div className="campo">
          <label htmlFor="confirmar">Repetir contraseña</label>
          <input
            id="confirmar" name="confirmar" type="password"
            value={form.confirmar} onChange={cambiar} required
          />
        </div>
        <button className="btn" type="submit" disabled={cargando} style={{ width: '100%' }}>
          {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>

      <p className="texto-chico">¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link></p>
    </div>
  );
}