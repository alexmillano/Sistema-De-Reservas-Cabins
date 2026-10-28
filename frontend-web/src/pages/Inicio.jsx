import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const SERVICIOS = [
  { titulo: 'Catálogo con filtros', texto: 'Buscá por provincia, localidad, precio y valoración.' },
  { titulo: 'Reserva y pago online', texto: 'Elegí fechas y personas, y pagá en pocos pasos (pago simulado en esta versión).' },
  { titulo: 'Soporte por chat', texto: 'Hablá directamente con el equipo de Cabins si tenés un inconveniente.' },
  { titulo: 'Opiniones reales', texto: 'Solo califican quienes completaron una estadía.' }
];

const PASOS = [
  'Creá tu cuenta o iniciá sesión.',
  'Elegí la cabaña, las fechas y la cantidad de personas.',
  'Pagá de forma segura.',
  'Seguí tu reserva desde Mis Reservas.'
];

export default function Inicio() {
  const { user } = useAuth();
  const [provincias, setProvincias] = useState([]);

  useEffect(() => {
    api.get('/provincias')
      .then(({ data }) => setProvincias(data))
      .catch(() => {});
  }, []);

  // El botón principal cambia según quién esté mirando la página
  const cta = !user
    ? { texto: 'Iniciá sesión para reservar', to: '/login' }
    : user.rol === 'admin'
      ? { texto: 'Ir al panel', to: '/admin/reservas' }
      : { texto: 'Explorar cabañas', to: '/reservas' };

  return (
    <>
      <section className="hero">
        <h1>Desconectá en la naturaleza de Argentina</h1>
        <p>Cabañas para escaparte del ritmo de la ciudad, en las provincias de todo el país.</p>
        <Link to={cta.to} className="btn btn-claro">{cta.texto}</Link>
      </section>

      <section className="seccion">
        <h2>Quiénes somos</h2>
        <p>
          Cabins es una plataforma que reúne cabañas de toda la Argentina en un solo lugar.
          Queremos que reservar una escapada sea simple, seguro y sin vueltas, con atención
          directa y opiniones de personas que realmente se hospedaron.
        </p>
      </section>

      <section className="seccion">
        <h2>Nuestros servicios</h2>
        <div className="grilla">
          {SERVICIOS.map((s) => (
            <div className="tarjeta" key={s.titulo}>
              <h3>{s.titulo}</h3>
              <p>{s.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="seccion centrado">
        <h2>Dónde estamos</h2>
        <p>Tenemos cabañas en las provincias de todo el país.</p>
        <div className="chips">
          {provincias.map((p) => <span className="chip" key={p.id}>{p.nombre}</span>)}
        </div>
      </section>

      <section className="seccion">
        <h2>¿Cómo alquilar?</h2>
        <div className="grilla">
          {PASOS.map((texto, i) => (
            <div className="tarjeta" key={texto}>
              <div className="paso-numero">{i + 1}</div>
              <p>{texto}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}