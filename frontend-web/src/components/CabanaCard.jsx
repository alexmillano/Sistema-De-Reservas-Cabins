import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatearPrecio, estrellas } from '../utils/formato';

export default function CabanaCard({ cabana }) {
  const [imagenRota, setImagenRota] = useState(false);
  const mostrarImagen = cabana.imagen_url && !imagenRota;

  return (
    <article className="cabana-card">
      {mostrarImagen ? (
        <img
          className="cabana-img"
          src={cabana.imagen_url}
          alt={cabana.nombre}
          onError={() => setImagenRota(true)}
        />
      ) : (
        <div className="cabana-img cabana-sin-imagen">Sin imagen</div>
      )}

      <div className="cabana-info">
        <h3>{cabana.nombre}</h3>
        <p className="cabana-ubicacion">📍 {cabana.localidad}, {cabana.provincia}</p>
        <p className="cabana-descripcion">{cabana.descripcion}</p>
        <p className="cabana-datos">Hasta {cabana.capacidad_personas} personas</p>

        <div className="cabana-pie">
          <div>
            {cabana.total_calificaciones > 0 ? (
              <span className="estrellas" title={`${cabana.valoracion} de 5`}>
                {estrellas(cabana.valoracion)}{' '}
                <small>{cabana.valoracion.toFixed(1)} ({cabana.total_calificaciones})</small>
              </span>
            ) : (
              <small>Sin calificaciones todavía</small>
            )}
            <div className="precio">
              {formatearPrecio(cabana.precio_por_noche)} <small>/ noche</small>
            </div>
          </div>
          <Link to={`/cabanas/${cabana.id}`} className="btn">Ver detalle</Link>
        </div>
      </div>
    </article>
  );
}