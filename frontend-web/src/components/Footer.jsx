import { Link } from 'react-router-dom';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <div className="logo-link"><Logo /><span>CABINS</span></div>
          <p>Cabañas en toda la Argentina, para reservar en pocos pasos.</p>
        </div>
        <div>
          <h4>Links rápidos</h4>
          <Link to="/">Inicio</Link>
          <Link to="/reservas">Reservas</Link>
          <Link to="/ayuda">Ayuda</Link>
        </div>
        <div>
          <h4>Contacto</h4>
          <p>contacto@cabins.com</p>
          <p>Instagram · Facebook</p>
        </div>
        <div>
          <h4>Medios de pago</h4>
          <p>Visa · Mastercard · MercadoPago</p>
          <p>(simulados en esta versión)</p>
        </div>
      </div>
      <div className="footer-copy">© 2026 Cabins. Todos los derechos reservados.</div>
    </footer>
  );
}