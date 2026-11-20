import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

const CLAVE_TOKEN = 'cabins_token';
const CLAVE_USUARIO = 'cabins_user';

// Se llama desde el contexto para enterarse cuando el servidor cierra la sesión
let alSesionInvalida = null;
export const registrarSesionInvalida = (fn) => { alSesionInvalida = fn; };

export const guardarSesion = async (token, user) => {
  await SecureStore.setItemAsync(CLAVE_TOKEN, token);
  await SecureStore.setItemAsync(CLAVE_USUARIO, JSON.stringify(user));
};

export const guardarUsuario = async (user) => {
  await SecureStore.setItemAsync(CLAVE_USUARIO, JSON.stringify(user));
};

export const leerSesion = async () => {
  const token = await SecureStore.getItemAsync(CLAVE_TOKEN);
  const user = await SecureStore.getItemAsync(CLAVE_USUARIO);
  if (!token || !user) return null;
  try { return { token, user: JSON.parse(user) }; } catch { return null; }
};

export const borrarSesion = async () => {
  await SecureStore.deleteItemAsync(CLAVE_TOKEN);
  await SecureStore.deleteItemAsync(CLAVE_USUARIO);
};

const api = axios.create({ baseURL: API_URL, timeout: 30000 });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(CLAVE_TOKEN);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const MENSAJES_SESION_INVALIDA = ['Token inválido o expirado', 'Token inválido', 'Tu cuenta está suspendida'];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error.response?.status;
    const mensaje = error.response?.data?.message;
    const esLogin = (error.config?.url || '').includes('/auth/login');
    const invalida = status === 401 || (status === 403 && MENSAJES_SESION_INVALIDA.includes(mensaje));
    if (invalida && !esLogin && alSesionInvalida) {
      await alSesionInvalida(
        mensaje === 'Tu cuenta está suspendida'
          ? 'Tu usuario se encuentra inactivo, contactate para solucionar'
          : 'Tu sesión venció. Iniciá sesión de nuevo.'
      );
    }
    return Promise.reject(error);
  }
);

// Mensaje legible para mostrar al usuario
export const mensajeError = (err) => {
  if (err.response?.data?.message) return err.response.data.message;
  if (err.code === 'ECONNABORTED') return 'El servidor tardó demasiado. Probá de nuevo en unos segundos.';
  if (err.message === 'Network Error') return 'No pudimos conectarnos. Revisá tu internet o probá de nuevo (el servidor puede estar despertando).';
  return 'Ocurrió un error inesperado';
};

export default api;
