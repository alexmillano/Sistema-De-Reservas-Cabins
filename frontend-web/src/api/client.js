import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
});

// Cada pedido lleva el token guardado, si hay sesión
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si el servidor dice que la sesión ya no sirve (token vencido, cuenta suspendida
// o eliminada), se cierra la sesión. Un 403 por rol incorrecto NO la cierra.
const MENSAJES_SESION_INVALIDA = ['Token inválido o expirado', 'Token inválido', 'Tu cuenta está suspendida'];

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const mensaje = error.response?.data?.message;
    const esLogin = (error.config?.url || '').includes('/auth/login');
    const sesionInvalida = status === 401 || (status === 403 && MENSAJES_SESION_INVALIDA.includes(mensaje));

    if (sesionInvalida && localStorage.getItem('token') && !esLogin) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.assign('/login');
    }
    return Promise.reject(error);
  }
);

export const mensajeError = (error) =>
  error.response?.data?.message || 'No se pudo conectar con el servidor. Revisá que esté en marcha.';

export default api;