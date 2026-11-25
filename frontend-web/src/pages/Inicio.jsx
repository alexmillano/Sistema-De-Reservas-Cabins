import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import HeroBanner from '../components/HeroBanner';
import CabanaCard from '../components/CabanaCard';
import Icono from '../components/Iconos';
import escenaDesktop from '../assets/hero-cabins-desktop.svg';
import './Inicio.css';

const SERVICIOS = [
  { icono: 'filtros', titulo: 'Catálogo con filtros', texto: 'Encontrá la cabaña ideal filtrando por provincia, localidad, precio y valoración.', link: 'Explorar cabañas', to: '/reservas' },
  { icono: 'tarjeta', titulo: 'Reserva y pago online', texto: 'Elegí fechas y personas, y pagá en pocos pasos con tarjeta (pago simulado en esta versión).', link: 'Ver cómo se paga', to: '#como-alquilar' },
  { icono: 'chat', titulo: 'Soporte por chat', texto: 'Si tenés un inconveniente con una reserva, hablá directamente con el dueño desde tu cuenta.', link: 'Centro de ayuda', to: '/ayuda' },
  { icono: 'estrella', titulo: 'Opiniones reales', texto: 'Solo califican quienes completaron una estadía, así elegís con total tranquilidad.', link: 'Comunidad confiable', to: '/reservas' }
];

const PASOS = [
  { eyebrow: 'Primer paso', titulo: 'Creá tu cuenta o iniciá sesión', texto: 'Registrate en segundos para acceder al catálogo completo y guardar tus cabañas en el carrito.', nota: 'Acceso inmediato', icono: 'usuario' },
  { eyebrow: 'Segundo paso', titulo: 'Elegí la cabaña, las fechas y la cantidad de personas', texto: 'El sistema verifica la disponibilidad al instante y calcula el total de tu estadía.', nota: 'Calendario sincronizado', icono: 'calendario' },
  { eyebrow: 'Tercer paso', titulo: 'Pagá de forma segura', texto: 'Confirmá el pago con tu tarjeta. Mientras pagás, las fechas quedan reservadas para vos unos minutos.', nota: 'Datos protegidos', icono: 'escudo' },
  { eyebrow: 'Cuarto paso', titulo: 'Seguí tu reserva desde Mis Reservas', texto: 'Consultá el estado, modificá las fechas o cancelá, y calificá tu estadía al terminar.', nota: 'Todo en un solo lugar', icono: 'check' }
];

// Foto de «Quiénes somos»: si existe el archivo src/assets/quienes-somos.(jpg|jpeg|png|webp) se usa ese;
// si no, la de una cabaña destacada y, en último caso, la ilustración del banner.
const fotosPropias = import.meta.glob('../assets/quienes-somos.{jpg,jpeg,png,webp}', { eager: true, import: 'default' });
const fotoPropia = Object.values(fotosPropias)[0];

export default function Inicio() {
  const { user } = useAuth();
  const [provincias, setProvincias] = useState([]);
  const [destacadas, setDestacadas] = useState([]);
  const [mejores, setMejores] = useState([]);

  useEffect(() => {
    api.get('/provincias').then(({ data }) => setProvincias(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/cabanas/destacadas').then(({ data }) => setDestacadas(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/cabanas/mejores').then(({ data }) => setMejores(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  // El botón principal cambia según quién esté mirando la página
  const cta = !user
    ? { texto: 'Iniciá sesión para reservar', to: '/login' }
    : user.rol === 'admin'
      ? { texto: 'Ir al panel', to: '/admin/reservas' }
      : { texto: 'Explorar cabañas', to: '/reservas' };

  const totalCabanas = provincias.reduce((s, p) => s + (p.cabanas || 0), 0);
  const conCabanas = provincias.filter((p) => p.cabanas > 0);
  const fotoSomos = fotoPropia || destacadas.find((c) => c.imagen_url)?.imagen_url;

  return (
    <div className="portada">
      <HeroBanner cta={cta} anclaSecundaria="como-alquilar" />

      {destacadas.length > 0 && (
        <section className="seccion">
          <h2>Cabañas destacadas</h2>
          <div className="lista-cabanas">
            {destacadas.map((c) => <CabanaCard key={c.id} cabana={c} />)}
          </div>
        </section>
      )}

      {/* Quiénes somos */}
      <section className="bloque somos-fondo" id="quienes-somos">
        <div className="bloque-inner">
          <div className="somos">
            <div>
              <span className="eyebrow">Nuestra historia y compromiso</span>
              <h2 className="titulo-sec">Quiénes somos</h2>
              <p>
                En Cabins nacimos con una premisa clara: ser el puente entre quienes buscan serenidad
                auténtica y los rincones más impactantes del suelo argentino. Reunimos cabañas de toda
                la Argentina en un solo lugar, para que reservar una escapada sea simple, seguro y sin vueltas.
              </p>
              <p>
                Cada dueño publica y gestiona sus propias cabañas, y vos reservás con atención directa y
                opiniones de personas que realmente se hospedaron, con total transparencia.
              </p>
              <div className="somos-cifras">
                <div><strong>{totalCabanas}</strong><span>Cabañas publicadas</span></div>
                <div><strong>{conCabanas.length}</strong><span>Provincias con cabañas</span></div>
                <div><strong>100%</strong><span>Reserva y pago online</span></div>
              </div>
            </div>
            <div className="somos-foto">
              <img src={fotoSomos || escenaDesktop} alt="Cabaña de Cabins" />
              <div className="somos-sello">
                <span className="ico"><Icono nombre="escudo" tam={18} /></span>
                <div><b>Reservas seguras</b><small>Pago y fechas protegidos</small></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Nuestros servicios */}
      <section className="bloque" id="servicios">
        <div className="bloque-inner">
          <div className="cab-centro">
            <span className="eyebrow centro">Experiencia sin fricciones</span>
            <h2 className="titulo-sec">Nuestros servicios</h2>
            <p className="bajada-sec">Diseñamos herramientas para que planificar tu escapada a la montaña sea tan placentero y relajante como el viaje mismo.</p>
          </div>
          <div className="servicios">
            {SERVICIOS.map((s) => (
              <div className="servicio" key={s.titulo}>
                <span className="ico"><Icono nombre={s.icono} /></span>
                <h3>{s.titulo}</h3>
                <p>{s.texto}</p>
                {s.to.startsWith('#')
                  ? <a href={s.to}>{s.link} <Icono nombre="flecha" tam={14} /></a>
                  : <Link to={s.to}>{s.link} <Icono nombre="flecha" tam={14} /></Link>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dónde estamos */}
      <section className="bloque donde-fondo" id="donde-estamos">
        <div className="bloque-inner">
          <div className="cab-centro">
            <span className="eyebrow centro">Presencia federal</span>
            <h2 className="titulo-sec">Dónde estamos</h2>
            <p className="bajada-sec">Tenemos cabañas en las provincias de todo el país.</p>
          </div>
          <div className="provincias-chips">
            {provincias.map((p) => (
              <span className={`prov-chip${p.cabanas ? '' : ' vacia'}`} key={p.id}>
                <Icono nombre="pin" tam={14} />{p.nombre}
                {p.cabanas > 0 && <em>{p.cabanas} {p.cabanas === 1 ? 'cabaña' : 'cabañas'}</em>}
              </span>
            ))}
          </div>
          {mejores.length > 0 && (
            <>
              <h3 className="mejores-titulo">Las cabañas mejor valoradas</h3>
              <div className="regiones">
                {mejores.map((c) => (
                  <Link to={`/cabanas/${c.id}`} className="mejor" key={c.id}>
                    {c.imagen_url
                      ? <img src={c.imagen_url} alt={c.nombre} />
                      : <div className="mejor-sin">Sin imagen</div>}
                    <div className="mejor-velo" />
                    <div className="mejor-info">
                      <small>{c.localidad}, {c.provincia}</small>
                      <h3>{c.nombre}</h3>
                      <span>
                        {c.total_calificaciones > 0 ? `★ ${c.valoracion.toFixed(1)} (${c.total_calificaciones})` : 'Nueva en Cabins'}
                        {' · '}Hasta {c.capacidad_personas} personas
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Cómo alquilar */}
      <section className="bloque" id="como-alquilar">
        <div className="bloque-inner">
          <div className="cab-centro">
            <span className="eyebrow centro">Paso a paso</span>
            <h2 className="titulo-sec">¿Cómo alquilar?</h2>
            <p className="bajada-sec">Tu próximo descanso en cuatro pasos claros, rápidos y transparentes.</p>
          </div>
          <div className="pasosc">
            {PASOS.map((p, i) => (
              <div className="pasoc" key={p.titulo}>
                <div className="pasoc-num">{i + 1}</div>
                <div className="eyebrow-paso">{p.eyebrow}</div>
                <h3>{p.titulo}</h3>
                <p>{p.texto}</p>
                <div className="nota"><Icono nombre={p.icono} tam={16} />{p.nota}</div>
              </div>
            ))}
          </div>

          <div className="cta-final">
            <div>
              <h3>¿Listo para tu próxima escapada?</h3>
              <p>Explorá todas las opciones de cabañas disponibles ahora mismo{!user && ' o registrate gratis'}.</p>
            </div>
            <div className="botones">
              {!user ? (
                <>
                  <Link to="/registro" className="claro">Registrate gratis</Link>
                  <Link to="/login" className="borde">Iniciá sesión</Link>
                </>
              ) : user.rol === 'admin' ? (
                <Link to="/admin/reservas" className="claro">Ir al panel</Link>
              ) : (
                <Link to="/reservas" className="claro">Explorar cabañas</Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
