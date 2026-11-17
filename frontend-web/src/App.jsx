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
import Reclamos from './pages/Reclamos';
import Finanzas from './pages/Finanzas';
import Calificaciones from './pages/Calificaciones';
import Opiniones from './pages/Opiniones';
import Administradores from './pages/Administradores';
import Usuarios from './pages/Usuarios';
import Planes from './pages/Planes';
import Pendiente, { NoEncontrada } from './pages/Pendiente';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Inicio />} />
            <Route path="login" element={<Login />} />
            <Route path="registro" element={<Registro />} />
            <Route path="recuperar-contrasena" element={<Pendiente titulo="Recuperar contraseña" />} />

            <Route element={<ProtectedRoute roles={['usuario']} />}>
              <Route path="reservas" element={<Reservas />} />
              <Route path="cabanas/:id" element={<DetalleCabana />} />
              <Route path="carrito" element={<Carrito />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="mis-reservas" element={<MisReservas />} />
              <Route path="reclamos" element={<Reclamos />} />
            </Route>

            <Route element={<ProtectedRoute roles={['admin']} dueno />}>
              <Route path="admin/crear-cabana" element={<FormularioCabana />} />
              <Route path="admin/cabanas/:id/editar" element={<FormularioCabana />} />
              <Route path="admin/planes" element={<Planes />} />
            </Route>

            <Route element={<ProtectedRoute roles={['admin']} />}>
              <Route path="admin/cabanas" element={<MisCabanas />} />
              <Route path="admin/reservas" element={<GestionarReservas />} />
              <Route path="admin/notificaciones" element={<Notificaciones />} />
              <Route path="admin/reclamos" element={<Reclamos />} />
              <Route path="admin/finanzas" element={<Finanzas />} />
              <Route path="admin/calificaciones" element={<Calificaciones />} />
              <Route path="admin/opiniones" element={<Opiniones />} />
            </Route>

            <Route element={<ProtectedRoute roles={['admin']} superadmin />}>
              <Route path="admin/admins" element={<Administradores />} />
              <Route path="admin/usuarios" element={<Usuarios />} />
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