import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PREGUNTAS = [
  { p: '¿Cómo reservo una cabaña?',
    r: 'Entrá a Reservas, filtrá por provincia, localidad, precio o valoración, elegí una cabaña, indicá las fechas y la cantidad de personas y agregala al carrito. Desde el carrito seguí hasta el pago.' },
  { p: '¿Puedo modificar o cancelar mi reserva?',
    r: 'Sí. En Mis Reservas podés modificar las fechas o la cantidad de personas de una reserva pendiente o confirmada (si el check-in todavía no pasó) y cancelarla. Las reservas completadas o canceladas ya no se pueden cambiar.' },
  { p: '¿Cómo funciona el reembolso?',
    r: 'Los reembolsos se coordinan con el dueño de la cabaña a través de un reclamo asociado a tu reserva. Desde Mis Reservas, tocá "Hacer un reclamo" y contá tu caso.' },
  { p: '¿Qué medios de pago puedo usar?',
    r: 'En el pago ingresás los datos de tu tarjeta. En esta versión del sistema el pago es simulado: se valida el formato de la tarjeta, pero no se guarda ni se cobra nada.' },
  { p: '¿Qué pasa si otra persona está pagando la misma cabaña?',
    r: 'Mientras alguien está en el pago, esa cabaña queda bloqueada para esas fechas por unos minutos. Si no completa el pago, se libera sola y podés reservarla.' },
  { p: '¿Cómo califico una cabaña?',
    r: 'Cuando tu estadía figura como completada, aparece el botón "Calificar" en Mis Reservas. Podés dar de 1 a 5 estrellas y, si querés, dejar una opinión. Solo se puede calificar una vez por cabaña.' },
  { p: '¿Cómo hago un reclamo?',
    r: 'Todo reclamo se hace sobre una reserva tuya. Se abre un chat con el dueño de la cabaña: ves cuando leyó tus mensajes y el reclamo queda abierto hasta que el dueño lo finaliza.' }
];

const PASOS = [
  ['Explorá el catálogo', 'Filtrá por provincia, localidad, rango de precios y valoración.'],
  ['Agregá al carrito', 'Elegí las fechas y verificá la disponibilidad.'],
  ['Completá el pago', 'Ingresá los datos de tu tarjeta (pago simulado).'],
  ['Seguí tu reserva', 'Consultala, modificala o cancelala desde Mis Reservas.']
];

export default function Ayuda() {
  const { user } = useAuth();
  const [busqueda, setBusqueda] = useState('');
  const [abierta, setAbierta] = useState(0);

  const termino = busqueda.trim().toLowerCase();
  const visibles = PREGUNTAS.filter(
    (x) => !termino || x.p.toLowerCase().includes(termino) || x.r.toLowerCase().includes(termino)
  );

  return (
    <section className="seccion ayuda">
      <div className="centrado">
        <h1>Centro de Ayuda y Preguntas Frecuentes</h1>
        <p>Encontrá respuestas rápidas sobre cómo reservar, cancelar y reclamar.</p>
        <div className="ayuda-buscador">
          <input type="search" aria-label="Buscar en la ayuda" placeholder="Buscá por palabra clave (ej. cancelar, pago, reclamo)..."
            value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setAbierta(null); }} />
          {busqueda && (
            <button type="button" className="btn btn-secundario" onClick={() => setBusqueda('')}>Limpiar</button>
          )}
        </div>
      </div>

      <h2>Preguntas frecuentes</h2>
      {visibles.length === 0 && <p>No encontramos resultados para "{busqueda}".</p>}
      <div className="faq">
        {visibles.map((x, i) => {
          const abiertaEsta = termino ? true : abierta === i;
          return (
            <div className="tarjeta faq-item" key={x.p}>
              <button type="button" className="faq-pregunta" aria-expanded={abiertaEsta}
                onClick={() => setAbierta(abiertaEsta ? null : i)}>
                <span>{x.p}</span><span aria-hidden="true">{abiertaEsta ? '▴' : '▾'}</span>
              </button>
              {abiertaEsta && <p className="faq-respuesta">{x.r}</p>}
            </div>
          );
        })}
      </div>

      <h2>¿Cómo reservar en CABINS?</h2>
      <div className="grilla">
        {PASOS.map(([titulo, texto], i) => (
          <div className="tarjeta" key={titulo}>
            <span className="paso-numero">{i + 1}</span>
            <h3>{titulo}</h3>
            <p>{texto}</p>
          </div>
        ))}
      </div>

      <div className="tarjeta ayuda-contacto">
        <div>
          <h2>¿No encontraste lo que buscabas?</h2>
          <p>Escribinos a <strong>contacto@cabins.com</strong>
            {user?.rol === 'usuario' && ' o hacé un reclamo sobre alguna de tus reservas'}.</p>
        </div>
        {user?.rol === 'usuario' && <Link to="/mis-reservas" className="btn">Ir a Mis Reservas</Link>}
      </div>
    </section>
  );
}
