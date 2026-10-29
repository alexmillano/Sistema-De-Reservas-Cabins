import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Inicio from './pages/Inicio';
import Login from './pages/Login';
import Registro from './pages/Registro';
import Reservas from './pages/Reservas';
import DetalleCabana from './pages/DetalleCabana';
import Pendiente, { NoEncontrada } from './pages/Pendiente';

// Pantallas que se construyen más adelante; se van reemplazando una por una
const RUTAS_USUARIO = [
  ['mis-reservas', 'Mis Reservas'],
  ['carrito', 'Carrito'],
  ['reclamos', 'Reclamos']
];

const RUTAS_ADMIN = [
  ['admin/crear-cabana', 'Crear Cabaña'],
  ['admin/reservas', 'Gestionar Reservas'],
  ['admin/finanzas', 'Finanzas'],
  ['admin/reclamos', 'Reclamos'],
  ['admin/calificaciones', 'Calificaciones'],
  ['admin/opiniones', 'Opiniones'],
  ['admin/notificaciones', 'Notificaciones']
];

const RUTAS_SUPERADMIN = [
  ['admin/admins', 'Administradores'],
  ['admin/usuarios', 'Usuarios']
];

const rutasPendientes = (lista) =>
  lista.map(([ruta, titulo]) => (
    <Route key={ruta} path={ruta} element={<Pendiente titulo={titulo} />} />
  ));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Inicio />} />
            <Route path="login" element={<Login />} />
            <Route path="registro" element={<Registro />} />

            <Route element={<ProtectedRoute roles={['usuario']} />}>
              <Route path="reservas" element={<Reservas />} />
              <Route path="cabanas/:id" element={<DetalleCabana />} />
              {rutasPendientes(RUTAS_USUARIO)}
            </Route>

            <Route element={<ProtectedRoute roles={['admin']} />}>
              {rutasPendientes(RUTAS_ADMIN)}
            </Route>

            <Route element={<ProtectedRoute roles={['admin']} superadmin />}>
              {rutasPendientes(RUTAS_SUPERADMIN)}
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="perfil" element={<Pendiente titulo="Perfil" />} />
              <Route path="ayuda" element={<Pendiente titulo="Ayuda" />} />
            </Route>

            <Route path="*" element={<NoEncontrada />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}