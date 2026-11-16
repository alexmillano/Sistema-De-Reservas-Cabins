import { useCallback, useEffect, useRef, useState } from 'react';
import api, { mensajeError } from '../api/client';
import Modal from './Modal';
import { formatearFechaCorta } from '../utils/fechas';

const INTERVALO_MS = 4000;
const MAX_MENSAJE = 2000;

const ETIQUETA_ESTADO = { nuevo: 'Nuevo', en_proceso: 'En proceso', finalizado: 'Finalizado' };

const hora = (iso) =>
  new Date(iso).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  });

// rol: 'usuario' | 'dueno' | 'superadmin'
// El superadmin solo lee: no ve el cuadro de escritura ni el botón de finalizar.
export default function ChatReclamo({ reclamoId, rol, onActividad }) {
  const [reclamo, setReclamo] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [vistoHasta, setVistoHasta] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');
  const [confirmandoCierre, setConfirmandoCierre] = useState(false);
  const [errorCierre, setErrorCierre] = useState('');
  const ultimoId = useRef(0);
  const fin = useRef(null);
  const miTipo = rol === 'usuario' ? 'usuario' : rol === 'dueno' ? 'admin' : null;

  const agregar = useCallback((nuevos) => {
    if (nuevos.length === 0) return;
    setMensajes((actuales) => {
      const conocidos = new Set(actuales.map((m) => m.id));
      const sumar = nuevos.filter((m) => !conocidos.has(m.id));
      return sumar.length ? [...actuales, ...sumar] : actuales;
    });
    ultimoId.current = Math.max(ultimoId.current, ...nuevos.map((m) => m.id));
  }, []);

  // Pide los mensajes nuevos. Al pedirlos, el servidor marca como vistos los del otro lado.
  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get(`/reclamos/${reclamoId}/mensajes`, {
        params: { despues_de: ultimoId.current }
      });
      agregar(data.mensajes);
      setReclamo(data.reclamo);
      setVistoHasta(data.visto_hasta);
      setError('');
      return data.mensajes.length;
    } catch (err) {
      setError(mensajeError(err));
      return 0;
    } finally {
      setCargando(false);
    }
  }, [reclamoId, agregar]);

  // Avisa a la lista y a la barra superior que los contadores pueden haber cambiado
  const avisar = useCallback(() => {
    onActividad?.();
    window.dispatchEvent(new Event('reclamos-cambio'));
    window.dispatchEvent(new Event('notificaciones-cambio'));
  }, [onActividad]);

  useEffect(() => {
    cargar().then(() => avisar());
    const id = setInterval(async () => {
      // Con la pestaña oculta no se pide nada: así no se marcan mensajes como vistos sin que se lean
      if (document.hidden) return;
      const nuevos = await cargar();
      if (nuevos > 0) avisar();
    }, INTERVALO_MS);
    return () => clearInterval(id);
  }, [cargar, avisar]);

  useEffect(() => {
    fin.current?.scrollIntoView?.({ block: 'end' });
  }, [mensajes.length]);

  const enviar = async (e) => {
    e?.preventDefault();
    const mensaje = texto.trim();
    if (!mensaje || enviando) return;
    setEnviando(true);
    setErrorEnvio('');
    try {
      const { data } = await api.post(`/reclamos/${reclamoId}/mensajes`, { mensaje });
      agregar([data]);
      setTexto('');
      await cargar(); // actualiza el estado (por ejemplo "En proceso")
      avisar();
    } catch (err) {
      setErrorEnvio(mensajeError(err));
      await cargar();
    } finally {
      setEnviando(false);
    }
  };

  const teclado = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) enviar(e);
  };

  const finalizar = async () => {
    setErrorCierre('');
    try {
      await api.put(`/reclamos/${reclamoId}/cerrar`);
      setConfirmandoCierre(false);
      await cargar();
      avisar();
    } catch (err) {
      setErrorCierre(mensajeError(err));
    }
  };

  if (cargando) return <div className="tarjeta"><p>Cargando chat...</p></div>;
  if (error && !reclamo) return <div className="mensaje-error">{error}</div>;

  const finalizado = reclamo.estado === 'finalizado';
  const puedeEscribir = miTipo !== null && !finalizado;

  return (
    <div className="chat tarjeta">
      <header className="chat-cabecera">
        <div>
          <h2>{reclamo.asunto}</h2>
          <p className="texto-suave">
            {reclamo.cabana_nombre
              ? <>{reclamo.cabana_nombre} · Reserva #{reclamo.reserva_id} ({formatearFechaCorta(reclamo.fecha_checkin)} al {formatearFechaCorta(reclamo.fecha_checkout)})</>
              : 'Reclamo sin reserva asociada'}
          </p>
          {rol !== 'usuario' && (
            <p className="texto-suave">Huésped: {reclamo.usuario_nombre} {reclamo.usuario_apellido}</p>
          )}
        </div>
        <div className="reserva-derecha">
          <span className={`estado estado-reclamo-${reclamo.estado}`}>{ETIQUETA_ESTADO[reclamo.estado]}</span>
          {rol === 'dueno' && !finalizado && (
            <button type="button" className="btn btn-secundario" onClick={() => { setErrorCierre(''); setConfirmandoCierre(true); }}>
              Finalizar reclamo
            </button>
          )}
        </div>
      </header>

      <div className="chat-mensajes" aria-live="polite">
        {mensajes.length === 0 && <p className="texto-suave centrado">Todavía no hay mensajes.</p>}
        {mensajes.map((m) => {
          const propio = m.remitente_tipo === miTipo;
          const visto = vistoHasta !== null && m.id <= vistoHasta;
          return (
            <div key={m.id} className={`burbuja-fila${propio ? ' propio' : ''}`}>
              <div className={`burbuja${propio ? ' propia' : ''}`}>
                {miTipo === null && (
                  <strong className="burbuja-autor">{m.remitente_tipo === 'usuario' ? 'Huésped' : 'Dueño'}</strong>
                )}
                <p>{m.mensaje}</p>
                <span className="burbuja-pie">
                  {hora(m.created_at)}
                  {propio && (
                    <span className={visto ? 'tilde visto' : 'tilde'} title={visto ? 'Visto' : 'Enviado'}>
                      {visto ? '✓✓' : '✓'}
                    </span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={fin} />
      </div>

      {error && <div className="mensaje-error">{error}</div>}

      {finalizado && <p className="aviso-chat">Este reclamo está finalizado: ya no se pueden enviar mensajes.</p>}
      {miTipo === null && !finalizado && (
        <p className="aviso-chat">Modo consulta: el superadmin puede leer el chat pero no responder.</p>
      )}

      {puedeEscribir && (
        <form className="chat-form" onSubmit={enviar}>
          <textarea rows="2" maxLength={MAX_MENSAJE} value={texto} placeholder="Escribí tu mensaje..."
            aria-label="Mensaje" onChange={(e) => setTexto(e.target.value)} onKeyDown={teclado} />
          <button className="btn" type="submit" disabled={enviando || !texto.trim()}>
            {enviando ? 'Enviando...' : 'Enviar'}
          </button>
        </form>
      )}
      {errorEnvio && <div className="mensaje-error">{errorEnvio}</div>}

      {confirmandoCierre && (
        <Modal titulo="Finalizar reclamo" onCerrar={() => setConfirmandoCierre(false)}>
          <p>Al finalizar el reclamo ya no se podrán enviar más mensajes. ¿Confirmás?</p>
          {errorCierre && <div className="mensaje-error">{errorCierre}</div>}
          <div className="modal-botones">
            <button type="button" className="btn btn-secundario" onClick={() => setConfirmandoCierre(false)}>Volver</button>
            <button type="button" className="btn" onClick={finalizar}>Finalizar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
