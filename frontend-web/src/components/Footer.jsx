import { Link } from 'react-router-dom';
import Logo from './Logo';
import Icono from './Iconos';
import '../pages/Inicio.css';

export default function Footer() {
  return (
    <footer className="pie">
      <div className="pie-grid">
        <div>
          <Logo alto={28} />
          <p style={{ marginTop: '0.9rem' }}>
            Viví la experiencia única de desconectar en cabañas auténticas, rodeadas de la naturaleza
            más imponente de Argentina: desde los bosques patagónicos hasta las quebradas del norte.
          </p>
          <div className="redes">
            <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram"><Icono nombre="instagram" tam={18} /></a>
            <a href="https://www.facebook.com/" target="_blank" rel="noreferrer" aria-label="Facebook"><Icono nombre="facebook" tam={18} /></a>
          </div>
        </div>

        <div>
          <h4>Links rápidos</h4>
          <ul>
            <li><Icono nombre="chevron" tam={14} /><Link to="/">Inicio</Link></li>
            <li><Icono nombre="chevron" tam={14} /><Link to="/reservas">Cabañas</Link></li>
            <li><Icono nombre="chevron" tam={14} /><a href="/#donde-estamos">Provincias</a></li>
            <li><Icono nombre="chevron" tam={14} /><Link to="/ayuda">Preguntas frecuentes</Link></li>
          </ul>
        </div>

        <div>
          <h4>Contacto</h4>
          <ul>
            <li><Icono nombre="casa" tam={16} />Atención personalizada al huésped</li>
            <li><Icono nombre="mail" tam={16} /><a href="mailto:contacto@cabins.com">contacto@cabins.com</a></li>
            <li><Icono nombre="chat" tam={16} />Soporte por chat desde tu cuenta</li>
            <li><Icono nombre="reloj" tam={16} />Respuesta en el día</li>
          </ul>
        </div>

        <div>
          <h4>Medios de pago</h4>
          <p>Transacciones protegidas con estándares de seguridad bancaria.</p>
          <ul className="pagos">
            <li><Icono nombre="tarjeta" tam={16} />Tarjetas Visa / Mastercard</li>
            <li><Icono nombre="billete" tam={16} />Mercado Pago</li>
            <li><Icono nombre="banco" tam={16} />Transferencia bancaria</li>
          </ul>
          <div className="seguro"><Icono nombre="escudo" tam={16} />Reservas 100% verificadas y seguras</div>
        </div>
      </div>
      <div className="pie-fin">
        <div>
          <span>© 2026 Cabins Argentina. Todos los derechos reservados.</span>
          <Link to="/login"><Icono nombre="candado" tam={14} />Acceso administración</Link>
        </div>
      </div>
    </footer>
  );
}
