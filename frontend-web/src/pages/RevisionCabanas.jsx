import { useCallback, useEffect, useState } from 'react';
import api, { mensajeError } from '../api/client';
import Modal from '../components/Modal';
import { TIPOS_DOCUMENTO } from '../utils/documentos';
import { formatearPrecio } from '../utils/formato';

const PESTANAS = [
  { clave: 'pendiente', texto: 'Pendientes' },
  { clave: 'aprobada', texto: 'Aprobadas' },
  { clave: 'rechazada', texto: 'Rechazadas' }
];

function TarjetaRevision({ cabana, onDecidir }) {
  const [docs, setDocs] = useState(null);
  const [errorDocs, setErrorDocs] = useState('');
  const fotos = Array.isArray(cabana.imagenes) ? cabana.imagenes : [];

  const verDocs = async () => {
    setErrorDocs('');
    try {
      const { data } = await api.get(`/cabanas/${cabana.id}/documentos`);
      setDocs(data);
    } catch (err) {
      setErrorDocs(mensajeError(err));
    }
  };

  return (
    <article className="tarjeta revision-tarjeta">
      <div className="reserva-cabecera">
        <div>
          <span className="codigo-reserva">Cabaña #{cabana.id}</span>
          <h3>{cabana.nombre}</h3>
          <p className="cabana-ubicacion">📍 {cabana.localidad}, {cabana.provincia}</p>
          <p className="texto-suave">
            Dueño: {cabana.dueno_nombre} {cabana.dueno_apellido} · {cabana.dueno_email}
          </p>
        </div>
        <div className="reserva-derecha">
          <strong className="precio">{formatearPrecio(cabana.precio_por_noche)}<small> / noche</small></strong>
          <small className="texto-suave">Hasta {cabana.capacidad_personas} personas</small>
        </div>
      </div>

      <p>{cabana.descripcion}</p>

      {fotos.length > 0 && (
        <div className="revision-fotos">
          {fotos.map((url) => <img key={url} src={url} alt={`Foto de ${cabana.nombre}`} loading="lazy" />)}
        </div>
      )}

      {cabana.estado_aprobacion === 'rechazada' && cabana.motivo_rechazo && (
        <div className="mensaje-error">Motivo del rechazo: {cabana.motivo_rechazo}</div>
      )}

      <div className="revision-docs">
        <strong>Documentación ({cabana.total_documentos})</strong>
        {cabana.total_documentos === 0 && <span className="texto-suave"> — el dueño no cargó documentos.</span>}
        {cabana.total_documentos > 0 && docs === null && (
          <button type="button" className="btn btn-secundario" onClick={verDocs}>Ver documentos</button>
        )}
        {docs && docs.map((d) => (
          <div key={d.id} className="documento-fila">
            <span>📄 {TIPOS_DOCUMENTO[d.tipo]} <small className="texto-suave">{d.nombre_original}</small></span>
            {d.url
              ? <a className="btn btn-secundario" href={d.url} target="_blank" rel="noopener noreferrer">Abrir</a>
              : <small className="texto-suave">No disponible</small>}
          </div>
        ))}
        {docs && <small className="texto-suave">Los enlaces son temporales (10 minutos).</small>}
        {errorDocs && <div className="mensaje-error">{errorDocs}</div>}
      </div>

      {cabana.estado_aprobacion !== 'aprobada' && (
        <div className="item-acciones">
          <button type="button" className="btn" onClick={() => onDecidir(cabana, 'aprobar')}>Aprobar</button>
          {cabana.estado_aprobacion === 'pendiente' && (
            <button type="button" className="btn btn-secundario" onClick={() => onDecidir(cabana, 'rechazar')}>Rechazar</button>
          )}
        </div>
      )}
    </article>
  );
}

export default function RevisionCabanas() {
  const [estado, setEstado] = useState('pendiente');
  const [datos, setDatos] = useState({ cargando: true, error: '', cabanas: [] });
  const [aviso, setAviso] = useState('');
  const [decidiendo, setDecidiendo] = useState(null); // { cabana, decision }
  const [motivo, setMotivo] = useState('');
  const [errorModal, setErrorModal] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async (e) => {
    try {
      const { data } = await api.get('/cabanas/revision', { params: { estado: e } });
      return { cargando: false, error: '', cabanas: data };
    } catch (err) {
      return { cargando: false, error: mensajeError(err), cabanas: [] };
    }
  }, []);

  useEffect(() => {
    let activo = true;
    cargar(estado).then((nuevo) => { if (activo) setDatos(nuevo); });
    return () => { activo = false; };
  }, [estado, cargar]);

  const cambiarPestana = (clave) => {
    setDatos({ cargando: true, error: '', cabanas: [] });
    setEstado(clave);
  };

  const abrir = (cabana, decision) => {
    setMotivo('');
    setErrorModal('');
    setDecidiendo({ cabana, decision });
  };

  const confirmar = async () => {
    const { cabana, decision } = decidiendo;
    if (decision === 'rechazar' && motivo.trim().length < 5) {
      return setErrorModal('Escribí el motivo del rechazo (mínimo 5 caracteres).');
    }
    setEnviando(true);
    setErrorModal('');
    try {
      await api.put(`/cabanas/${cabana.id}/revision`, { decision, motivo: motivo.trim() });
      setAviso(decision === 'aprobar'
        ? `"${cabana.nombre}" fue aprobada y ya se muestra en el catálogo.`
        : `"${cabana.nombre}" fue rechazada. El dueño recibió el motivo.`);
      setDecidiendo(null);
      setDatos(await cargar(estado));
    } catch (err) {
      setErrorModal(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="seccion">
      <h1>Revisión de cabañas</h1>
      <p className="texto-suave">
        Las cabañas nuevas se publican recién cuando las aprobás. Revisá los datos, las fotos y la documentación del dueño.
      </p>

      <div className="pestanas" role="tablist">
        {PESTANAS.map((p) => (
          <button key={p.clave} type="button" role="tab" aria-selected={estado === p.clave}
            className={estado === p.clave ? 'activa' : ''} onClick={() => cambiarPestana(p.clave)}>
            {p.texto}
          </button>
        ))}
      </div>

      {aviso && <div className="mensaje-exito" role="status">{aviso}</div>}
      {datos.cargando && <p>Cargando...</p>}
      {!datos.cargando && datos.error && <div className="mensaje-error">{datos.error}</div>}
      {!datos.cargando && !datos.error && datos.cabanas.length === 0 && (
        <div className="tarjeta centrado"><p>No hay cabañas en este estado.</p></div>
      )}
      {datos.cabanas.map((c) => <TarjetaRevision key={c.id} cabana={c} onDecidir={abrir} />)}

      {decidiendo && (
        <Modal titulo={decidiendo.decision === 'aprobar' ? 'Aprobar cabaña' : 'Rechazar cabaña'} onCerrar={() => setDecidiendo(null)}>
          {decidiendo.decision === 'aprobar' ? (
            <p>"{decidiendo.cabana.nombre}" se publicará en el catálogo y el dueño recibirá un aviso.</p>
          ) : (
            <div className="campo">
              <label htmlFor="motivo">Motivo del rechazo (se le informa al dueño)</label>
              <textarea id="motivo" rows="3" maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </div>
          )}
          {errorModal && <div className="mensaje-error">{errorModal}</div>}
          <div className="modal-botones">
            <button type="button" className="btn btn-secundario" onClick={() => setDecidiendo(null)}>Volver</button>
            <button type="button" className="btn" onClick={confirmar} disabled={enviando}>
              {enviando ? 'Guardando...' : 'Confirmar'}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
