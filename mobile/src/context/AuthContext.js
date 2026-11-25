import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { borrarSesion, guardarSesion, guardarUsuario, leerSesion, registrarSesionInvalida } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    registrarSesionInvalida(async (mensaje) => {
      await borrarSesion();
      setUser(null);
      setAviso(mensaje);
    });
    leerSesion()
      .then((s) => { if (s) setUser(s.user); })
      .finally(() => setCargando(false));
  }, []);

  const login = useCallback(async (identificador, password) => {
    const { data } = await api.post('/auth/login', { identificador, password });
    await guardarSesion(data.token, data.user);
    setAviso('');
    setUser(data.user);
  }, []);

  const loginAdmin = useCallback(async (identificador, password) => {
    const { data } = await api.post('/auth/login-admin', { identificador, password });
    await guardarSesion(data.token, data.user);
    setAviso('');
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await borrarSesion();
    setUser(null);
  }, []);

  // Después de editar el perfil: actualiza los datos guardados de la sesión
  const actualizarUsuario = useCallback(async (cambios) => {
    setUser((actual) => {
      const nuevo = { ...actual, ...cambios };
      guardarUsuario(nuevo).catch(() => {});
      return nuevo;
    });
  }, []);

  const valor = useMemo(
    () => ({ user, cargando, aviso, setAviso, login, loginAdmin, logout, actualizarUsuario }),
    [user, cargando, aviso, login, loginAdmin, logout, actualizarUsuario]
  );
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
