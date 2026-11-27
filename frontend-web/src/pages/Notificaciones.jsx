import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { mensajeError } from '../api/client';

const TIPOS = {
  nueva_reserva: { texto: 'Nueva reserva', icono: '🏡', destino: '/admin/reservas', accion: 'Ver reservas' },
  pago_aprobado: { texto: 'Pago aprobado', icono: '💳', destino: '/admin/reservas', accion: 'Ver reservas' },
  cancelacion: { texto: 'Cancelación', icono: '🗓️', destino: '/admin/reservas', accion: 'Ver reservas' },
  checkout: { texto: 'Check-out', icono: '🧳', destino: '/admin/reservas', accion: 'Ver reservas' },
  reclamo: { texto: 'Reclamo', icono: '⚠️', destino: '/admin/reclamos', accion: 'Ver reclamos' },
  opinion: { texto: 'Opinión', icono: '⭐', destino: '/admin/opiniones', accion: 'Ver opiniones' },
  revision_pendiente: { texto: 'Cabaña para revisar', icono: '🕵️', destino: '/admin/revision', accion: 'Ir a revisión' },
  revision: { texto: 'Revisión de cabaña', icono: '📝', destino: '/admin/cabanas', accion: 'Ver mis cabañas' },
  plan: { texto: 'Plan pausado', icono: '⏸️', destino: '/admin/planes', accion: 'Ver planes' }
};

const FILTROS = [
  { clave: 'todas', texto: 'Todas' },
  { clave: 'false', texto: 'No leídas' },
  { clave: 'true', texto: 'Leídas' }
];

// Avisa a la barra superior que el contador de no leídas cambió
const avisarCambio = () => window.dispatchEvent(new Event('notificaciones-cambio'));

const cuando = (iso) => {
  const f = new Date(iso);
  const minutos = Math.round((Date.now() - f.getTime()) / 60000);
  if (minutos < 1) return 'Hace instantes';
  if (minutos < 60) return `Hace ${minutos} min`;
  if (minutos < 1440) return `Hace ${Math.round(minutos / 60)} h`;
  return f.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
};

const obtener = async (filtro) => {
  try {
    const { data } = await api.get('/notificaciones', {
      params: { limite: 100, leida: filtro === 'todas' ? undefined : filtro }
    });
    return { cargando: false, error: '', ...data };
  } catch (err) {
    return { cargando: false, error: mensajeError(err), no_leidas: 0, notificaciones: [] };
  }
};

export default function Notificaciones() {
  const [filtro, setFiltro] = useState('todas');
  const [datos, setDatos] = useState({ cargando: true, error: '', no_leidas: 0, notificaciones: [] });
  const [errorAccion, setErrorAccion] = useState('');

  useEffect(() => {
    let activo = true;
    obtener(filtro).then((nuevo) => {
      if (activo) setDatos(nuevo);
    });
    return () => {
      activo = false;
    };
  }, [filtro]);

  const recargar = async () => {
    setDatos(await obtener(filtro));
    avisarCambio();
  };

  const marcarLeida = async (id) => {
    setErrorAccion('');
    try {
      await api.put(`/notificaciones/${id}/leer`);
      await recargar();
    } catch (err) {
      setErrorAccion(mensajeError(err));
    }
  };

  const marcarTodas = async () => {
    setErrorAccion('');
    try {
      await api.put('/notificaciones/leer-todas');
      await recargar();
    } catch (err) {
      setErrorAccion(mensajeError(err));
    }
  };

  const { cargando, error, no_leidas: noLeidas, notificaciones } = datos;

  return (
    <section className="seccion">
      <div className="catalogo-barra">
        <div>
          <h1>Notificaciones</h1>
          <p className="texto-suave">{noLeidas > 0 ? `Tenés ${noLeidas} sin leer.` : 'Estás al día.'}</p>
        </div>
        <button type="button" className="btn btn-secundario" disabled={noLeidas === 0} onClick={marcarTodas}>
          Marcar todas como leídas
        </button>
      </div>

      <div className="pestanas" role="tablist">
        {FILTROS.map((f) => (
          <button key={f.clave} type="button" role="tab" aria-selected={filtro === f.clave}
            className={filtro === f.clave ? 'activa' : ''} onClick={() => setFiltro(f.clave)}>
            {f.texto}
          </button>
        ))}
      </div>

      {errorAccion && <div className="mensaje-error">{errorAccion}</div>}
      {cargando && <p>Cargando notificaciones...</p>}
      {!cargando && error && <div className="mensaje-error">{error}</div>}
      {!cargando && !error && notificaciones.length === 0 && (
        <div className="tarjeta centrado"><p>No hay notificaciones.</p></div>
      )}

      {notificaciones.map((n) => {
        const tipo = TIPOS[n.tipo] || { texto: n.tipo, icono: '🔔' };
        return (
          <article key={n.id} className={`tarjeta notificacion${n.leida ? ' leida' : ''}`}>
            <span className="notificacion-icono" aria-hidden="true">{tipo.icono}</span>
            <div className="notificacion-cuerpo">
              <div className="notificacion-meta">
                <strong>{tipo.texto}</strong>
                <span className="texto-suave">{cuando(n.created_at)}</span>
                {!n.leida && <span className="punto-nueva">Nueva</span>}
              </div>
              <p>{n.mensaje}</p>
              <div className="item-acciones">
                {tipo.destino && <Link to={tipo.destino} className="btn btn-secundario">{tipo.accion}</Link>}
                {!n.leida && (
                  <button type="button" className="btn btn-secundario" onClick={() => marcarLeida(n.id)}>
                    Marcar como leída
                  </button>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
