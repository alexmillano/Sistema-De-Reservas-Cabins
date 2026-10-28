import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout() {
  const { user } = useAuth();

  return (
    <div className="app" data-rol={user?.rol || 'invitado'}>
      <Navbar />
      <main className="contenido"><Outlet /></main>
      <Footer />
    </div>
  );
}