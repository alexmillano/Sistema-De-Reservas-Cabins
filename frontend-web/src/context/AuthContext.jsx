import { createContext, useContext, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

const leerUsuarioGuardado = () => {
  try {
    const guardado = localStorage.getItem('user');
    return guardado && localStorage.getItem('token') ? JSON.parse(guardado) : null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(leerUsuarioGuardado);

  const guardarSesion = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const login = async (identificador, password) => {
    const { data } = await api.post('/auth/login', { identificador, password });
    guardarSesion(data);
    return data.user;
  };

  const loginAdmin = async (identificador, password) => {
    const { data } = await api.post('/auth/login-admin', { identificador, password });
    guardarSesion(data);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);