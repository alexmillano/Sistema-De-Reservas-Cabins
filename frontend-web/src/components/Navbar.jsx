import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import Logo from './Logo';


const MENU_USUARIO = [
  { texto: 'Reservas', to: '/reservas' },
  { texto: 'Mis Reservas', to: '/mis-reservas' },
  { texto: 'Reclamos', to: '/reclamos' },
  { texto: 'Ayuda', to: '/ayuda' }
];

const MENU_ADMIN = [
  { texto: 'Reservas', hijos: [
    { texto: 'Mis Cabañas', to: '/admin/cabanas' },
    { texto: 'Crear Cabaña', to: '/admin/crear-cabana' },
    { texto: 'Gestionar Reservas', to: '/admin/reservas' }
  ] },
  { texto: 'Finanzas', hijos: [
    { texto: 'Ganancias', to: '/admin/finanzas' },
    { texto: 'Planes', to: '/admin/planes' },
    { texto: 'Reclamos', to: '/admin/reclamos' }
  ] },
  { texto: 'Comunidad', hijos: [
    { texto: 'Calificaciones', to: '/admin/calificaciones' },
    { texto: 'Opiniones', to: '/admin/opiniones' }
  ] },
  { texto: 'Ayuda', to: '/ayuda' }
];

const MENU_SUPERADMIN = { texto: 'Administración', hijos: [
  { texto: 'Administradores', to: '/admin/admins' },
  { texto: 'Usuarios', to: '/admin/usuarios' }
] };

const claseActiva = ({ isActive }) => (isActive ? 'nav-link activo' : 'nav-link');

function Enlaces({ items }) {
  return (
    <>
      {items.map((item) =>
        item.hijos ? (
          <div className="nav-item" key={item.texto} tabIndex={0}>
            <span className="nav-link">{item.texto} ▾</span>
            <div className="submenu">
              {item.hijos.map((h) => (
                <NavLink key={h.to} to={h.to} className="submenu-link">{h.texto}</NavLink>
              ))}
            </div>
          </div>
        ) : (
          <NavLink key={item.to} to={item.to} className={claseActiva}>
            {item.texto}
            {item.badge > 0 && <span className="badge badge-inline-nav" title="Mensajes sin leer">{item.badge}</span>}
          </NavLink>
        )
      )}
    </>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuAbierto, setMenuAbierto] = useState(false);
  // Menú hamburguesa (pantallas chicas): se guarda en qué pantalla se abrió, así se cierra solo al navegar
  const [panelEn, setPanelEn] = useState(null);
  const panelAbierto = panelEn === location.pathname;
  const [confirmando, setConfirmando] = useState(false);
  const [noLeidas, setNoLeidas] = useState(0);
  const [reclamosSinLeer, setReclamosSinLeer] = useState(0);
  const menuRef = useRef(null);

  // El menú del usuario se cierra al hacer clic afuera
  useEffect(() => {
    const cerrarAlClickAfuera = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuAbierto(false);
    };
    document.addEventListener('mousedown', cerrarAlClickAfuera);
    return () => document.removeEventListener('mousedown', cerrarAlClickAfuera);
  }, []);

  // Contadores de la barra. Se actualizan al cambiar de pantalla, cada 20 segundos
  // y cuando una pantalla avisa que algo cambió (por ejemplo, al leer un chat).
  useEffect(() => {
    if (!user) return;
    const actualizar = () => {
      if (document.hidden) return;
      if (user.rol === 'admin') {
        api.get('/notificaciones', { params: { limite: 1 } })
          .then(({ data }) => setNoLeidas(data.no_leidas))
          .catch(() => {});
      } else {
        api.get('/reclamos/no-leidos')
          .then(({ data }) => setReclamosSinLeer(data.no_leidos))
          .catch(() => {});
      }
    };
    actualizar();
    const id = setInterval(actualizar, 20000);
    window.addEventListener('notificaciones-cambio', actualizar);
    window.addEventListener('reclamos-cambio', actualizar);
    return () => {
      clearInterval(id);
      window.removeEventListener('notificaciones-cambio', actualizar);
      window.removeEventListener('reclamos-cambio', actualizar);
    };
  }, [user, location.pathname]);

  const cerrarSesion = () => {
    logout();
    setConfirmando(false);
    navigate('/');
  };

  // Invitado: logo centrado y botones de acceso a la derecha
  if (!user) {
    return (
      <header className="nav nav-invitado">
        <div className="nav-inner">
          <Logo alto={28} />
          <div className="nav-acciones">
            <Link to="/login" className="nav-link">Iniciar sesión</Link>
            <Link to="/registro" className="btn btn-claro">Registrarse</Link>
          </div>
        </div>
      </header>
    );
  }

  // El superadmin solo consulta: no ve "Crear Cabaña"
  const menuSuperadmin = MENU_ADMIN.map((item) =>
    item.hijos ? { ...item, hijos: item.hijos.filter((h) => h.to !== '/admin/crear-cabana' && h.to !== '/admin/planes') } : item
  );
  const items = user.rol === 'admin'
    ? (user.es_superadmin ? [...menuSuperadmin, MENU_SUPERADMIN] : MENU_ADMIN)
    : MENU_USUARIO.map((item) => (item.to === '/reclamos' ? { ...item, badge: reclamosSinLeer } : item));

  return (
    <header className="nav">
      <div className="nav-inner">
        <Logo alto={28} />

        <nav id="menu-principal" className={`nav-links${panelAbierto ? ' abierto' : ''}`}><Enlaces items={items} /></nav>

        <div className="nav-acciones">
          {user.rol === 'usuario' && (
            <NavLink to="/carrito" className={claseActiva} title="Carrito">🛒</NavLink>
          )}
          {user.rol === 'admin' && (
            <NavLink to="/admin/notificaciones" className={claseActiva} title="Notificaciones">
              🔔{noLeidas > 0 && <span className="badge">{noLeidas}</span>}
            </NavLink>
          )}

          <div className="menu-usuario" ref={menuRef}>
            <button type="button" className="boton-usuario" onClick={() => setMenuAbierto(!menuAbierto)}>
              {user.usuario} ▾
            </button>
            {menuAbierto && (
              <div className="menu-desplegable">
                <Link to="/perfil" onClick={() => setMenuAbierto(false)}>Ver perfil</Link>
                <button type="button" onClick={() => { setMenuAbierto(false); setConfirmando(true); }}>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>

          <button type="button" className="nav-hamburguesa" aria-label={panelAbierto ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={panelAbierto} aria-controls="menu-principal" onClick={() => setPanelEn(panelAbierto ? null : location.pathname)}>
            <span /><span /><span />
          </button>
        </div>
      </div>

      {confirmando && (
        <div className="modal-fondo" onClick={() => setConfirmando(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Cerrar sesión</h3>
            <p>¿Estás seguro que querés cerrar sesión?</p>
            <div className="modal-botones">
              <button type="button" className="btn btn-secundario" onClick={() => setConfirmando(false)}>
                Cancelar
              </button>
              <button type="button" className="btn" onClick={cerrarSesion}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}