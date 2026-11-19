import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { borrarSesion, guardarSesion, leerSesion, registrarSesionInvalida } from '../api/client';

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

  const logout = useCallback(async () => {
    await borrarSesion();
    setUser(null);
  }, []);

  const valor = useMemo(
    () => ({ user, cargando, aviso, setAviso, login, logout }),
    [user, cargando, aviso, login, logout]
  );
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
