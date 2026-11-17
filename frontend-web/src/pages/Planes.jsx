import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { mensajeError } from '../api/client';
import Modal from '../components/Modal';
import { formatearPrecio, estrellas } from '../utils/formato';

const POSICION = {
  free: 'Aparece al final de los catálogos.',
  plus: 'Aparece en la zona media del catálogo, y entre las primeras si hay pocas Premium.',
  premium: 'Aparece primera en los catálogos y en las destacadas del inicio.'
};

const requisitosTexto = (p) => {
  if (p.clave === 'plus') return `Promedio de ${String(p.min_valoracion).replace('.', ',')} o más (o sin calificaciones todavía).`;
  if (p.clave === 'premium') {
    return `Promedio de ${String(p.min_valoracion).replace('.', ',')} o más, al menos ${p.min_calificaciones} calificaciones y ningún reclamo sin responder.`;
  }
  return 'Sin requisitos.';
};

const fechaLarga = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

const obtener = async () => {
  try {
    const { data } = await api.get('/planes');
    if (!Array.isArray(data?.planes) || !Array.isArray(data?.cabanas)) throw new Error('formato');
    return { cargando: false, error: '', planes: data.planes, cabanas: data.cabanas };
  } catch (err) {
    return {
      cargando: false, planes: [], cabanas: [],
      error: err.message === 'formato'
        ? 'La respuesta del servidor no es la esperada. Revisá que el backend esté actualizado.'
        : mensajeError(err)
    };
  }
};

const ETIQUETA_ESTADO = {
  sin_plan: { texto: 'Free', clase: 'estado' },
  activo: { texto: 'Plan activo', clase: 'estado estado-confirmada' },
  pausado: { texto: 'Plan pausado', clase: 'estado estado-cancelada' }
};

export default function Planes() {
  const [datos, setDatos] = useState({ cargando: true, error: '', planes: [], cabanas: [] });
  const [aviso, setAviso] = useState('');
  const [compra, setCompra] = useState(null); // { cabana, plan }
  const [errorCompra, setErrorCompra] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let activo = true;
    obtener().then((nuevo) => {
      if (activo) setDatos(nuevo);
    });
    return () => {
      activo = false;
    };
  }, []);

  const confirmar = async () => {
    setEnviando(true);
    setErrorCompra('');
    try {
      const { data } = await api.post(`/planes/cabanas/${compra.cabana.id}/contratar`, { plan: compra.plan.clave });
      setAviso(`${data.message}. Vigente hasta el ${fechaLarga(data.vencimiento)}.`);
      setCompra(null);
      setDatos(await obtener());
    } catch (err) {
      setErrorCompra(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  const { cargando, error, planes, cabanas } = datos;
  const pagos = planes.filter((p) => p.precio > 0);

  return (
    <section className="seccion">
      <h1>Planes de visibilidad</h1>
      <p className="texto-suave">
        El plan se contrata por cabaña y dura 30 días. Cuanto mejor plan y mejor calificación, más arriba aparece tu cabaña.
      </p>

      <div className="planes-grilla">
        {planes.map((p) => (
          <div key={p.clave} className={`tarjeta plan plan-${p.clave}`}>
            <h2>Plan {p.nombre}</h2>
            <p className="plan-precio">{p.precio === 0 ? 'Gratis' : <>{formatearPrecio(p.precio)} <small>/ mes</small></>}</p>
            <p>{POSICION[p.clave]}</p>
            <p className="texto-suave"><strong>Requisitos:</strong> {requisitosTexto(p)}</p>
          </div>
        ))}
      </div>

      <div className="mensaje-info">
        Si la calificación o los reclamos de una cabaña dejan de cumplir los requisitos, su plan se <strong>pausa</strong>:
        se muestra como Free y no perdés lo pagado. Cuando vuelve a cumplirlos, el plan se reactiva solo hasta su vencimiento.
      </div>

      {aviso && <div className="mensaje-exito" role="status">{aviso}</div>}
      {cargando && <p>Cargando tus cabañas...</p>}
      {!cargando && error && <div className="mensaje-error">{error}</div>}
      {!cargando && !error && cabanas.length === 0 && (
        <div className="tarjeta centrado">
          <p>Todavía no tenés cabañas.</p>
          <Link to="/admin/crear-cabana" className="btn">Crear mi primera cabaña</Link>
        </div>
      )}

      {cabanas.map((c) => {
        const estado = ETIQUETA_ESTADO[c.estado];
        return (
          <article key={c.id} className={`tarjeta plan-cabana${c.estado === 'pausado' ? ' cuenta-suspendida' : ''}`}>
            <div className="plan-cabana-cab">
              <div>
                <h3>{c.nombre}</h3>
                <span className="texto-suave">
                  {c.total_calificaciones > 0
                    ? <>{estrellas(c.valoracion)} {c.valoracion.toFixed(1)} ({c.total_calificaciones})</>
                    : 'Sin calificaciones todavía'}
                  {' · '}{c.reclamos_sin_responder} {c.reclamos_sin_responder === 1 ? 'reclamo sin responder' : 'reclamos sin responder'}
                </span>
              </div>
              <div className="item-acciones">
                <span className={estado.clase}>{estado.texto}</span>
                {c.plan_contratado && (
                  <span className="estado estado-completada">Plan {c.plan_contratado === 'premium' ? 'Premium' : 'Plus'}</span>
                )}
              </div>
            </div>

            {c.plan_contratado && (
              <p className="texto-suave">
                Vence el {fechaLarga(c.vence)} ({c.dias_restantes} {c.dias_restantes === 1 ? 'día' : 'días'}).
                {c.estado === 'pausado' && <> Se muestra como Free: <strong>{c.motivo_pausa}</strong>.</>}
              </p>
            )}
            {!c.activa && <p className="texto-suave">Esta cabaña está desactivada: activala para contratar un plan.</p>}

            <div className="plan-botones">
              {pagos.map((p) => {
                const req = c.puede[p.clave];
                const mismo = c.plan_contratado === p.clave;
                return (
                  <div key={p.clave} className="plan-opcion">
                    <button type="button" className={mismo ? 'btn btn-secundario' : 'btn'}
                      disabled={!req.ok || !c.activa}
                      onClick={() => { setErrorCompra(''); setCompra({ cabana: c, plan: p, renueva: mismo }); }}>
                      {mismo ? `Renovar ${p.nombre}` : c.plan_contratado ? `Cambiar a ${p.nombre}` : `Contratar ${p.nombre}`} · {formatearPrecio(p.precio)}
                    </button>
                    {!req.ok && <small className="texto-suave">{req.motivo}</small>}
                  </div>
                );
              })}
            </div>
          </article>
        );
      })}

      {compra && (
        <Modal titulo={`${compra.renueva ? 'Renovar' : 'Contratar'} plan ${compra.plan.nombre}`} onCerrar={() => setCompra(null)}>
          <p>
            Cabaña: <strong>{compra.cabana.nombre}</strong><br />
            Plan {compra.plan.nombre} por {compra.plan.dias} días: <strong>{formatearPrecio(compra.plan.precio)}</strong>
          </p>
          {compra.cabana.plan_contratado && !compra.renueva && (
            <p className="texto-suave">Tu plan actual se reemplaza desde hoy y no se devuelve lo ya pagado.</p>
          )}
          <p className="texto-suave">Pago simulado: en esta versión no se cobra dinero real.</p>
          {errorCompra && <div className="mensaje-error">{errorCompra}</div>}
          <div className="modal-botones">
            <button type="button" className="btn btn-secundario" onClick={() => setCompra(null)}>Cancelar</button>
            <button type="button" className="btn" onClick={confirmar} disabled={enviando}>
              {enviando ? 'Procesando...' : 'Confirmar'}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
