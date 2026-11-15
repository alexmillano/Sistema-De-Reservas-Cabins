import { Link } from 'react-router-dom';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <Logo alto={28} />
          <p>Vive la experiencia única de desconectar en cabañas auténticas rodeadas de la naturaleza más imponente de Argentina, desde los bosques patagónicos hasta las quebradas del norte</p>
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
          <p>Visa</p>
          <p>Mastercard</p>
          <p>MercadoPago</p>
        </div>
      </div>
      <div className="footer-copy">© 2026 Cabins. Todos los derechos reservados.</div>
    </footer>
  );
}