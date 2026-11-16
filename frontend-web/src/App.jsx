import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Inicio from './pages/Inicio';
import Login from './pages/Login';
import Registro from './pages/Registro';
import Reservas from './pages/Reservas';
import DetalleCabana from './pages/DetalleCabana';
import Carrito from './pages/Carrito';
import Checkout from './pages/Checkout';
import MisReservas from './pages/MisReservas';
import Perfil from './pages/Perfil';
import Ayuda from './pages/Ayuda';
import MisCabanas from './pages/MisCabanas';
import FormularioCabana from './pages/FormularioCabana';
import GestionarReservas from './pages/GestionarReservas';
import Notificaciones from './pages/Notificaciones';
import Pendiente, { NoEncontrada } from './pages/Pendiente';

// Pantallas que se construyen más adelante; se van reemplazando una por una
const RUTAS_USUARIO = [
  ['reclamos', 'Reclamos']
];

const RUTAS_ADMIN = [
  ['admin/finanzas', 'Finanzas'],
  ['admin/reclamos', 'Reclamos'],
  ['admin/calificaciones', 'Calificaciones'],
  ['admin/opiniones', 'Opiniones']
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
              <Route path="carrito" element={<Carrito />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="mis-reservas" element={<MisReservas />} />
              {rutasPendientes(RUTAS_USUARIO)}
            </Route>

            <Route element={<ProtectedRoute roles={['admin']} dueno />}>
              <Route path="admin/crear-cabana" element={<FormularioCabana />} />
              <Route path="admin/cabanas/:id/editar" element={<FormularioCabana />} />
            </Route>

            <Route element={<ProtectedRoute roles={['admin']} />}>
              <Route path="admin/cabanas" element={<MisCabanas />} />
              <Route path="admin/reservas" element={<GestionarReservas />} />
              <Route path="admin/notificaciones" element={<Notificaciones />} />
              {rutasPendientes(RUTAS_ADMIN)}
            </Route>

            <Route element={<ProtectedRoute roles={['admin']} superadmin />}>
              {rutasPendientes(RUTAS_SUPERADMIN)}
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="perfil" element={<Perfil />} />
              <Route path="ayuda" element={<Ayuda />} />
            </Route>

            <Route path="*" element={<NoEncontrada />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}