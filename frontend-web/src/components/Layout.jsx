import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';
import Footer from './Footer';
import ErrorBoundary from './ErrorBoundary';

export default function Layout() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  return (
    <div className="app" data-rol={user?.rol || 'invitado'}>
      <Navbar />
      <main className="contenido">
        {/* El key reinicia el aviso de error al cambiar de pantalla */}
        <ErrorBoundary key={pathname}><Outlet /></ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}