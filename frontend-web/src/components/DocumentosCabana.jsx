import { useCallback, useEffect, useRef, useState } from 'react';
import api, { mensajeError } from '../api/client';
import { TIPOS_DOCUMENTO } from '../utils/documentos';

const MAX_DOCS = 5;
const MAX_MB = 8;

// Documentos de la propiedad (opcionales). Sin cabanaId (alta): quedan en una lista local que sube el formulario
// al guardar. Con cabanaId (edición): se suben y se borran al instante.
export default function DocumentosCabana({ cabanaId, pendientes, onPendientes }) {
  const [existentes, setExistentes] = useState([]);
  const [tipo, setTipo] = useState('titularidad');
  const [error, setError] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const inputRef = useRef(null);

  const cargar = useCallback(async () => {
    if (!cabanaId) return;
    try {
      const { data } = await api.get(`/cabanas/${cabanaId}/documentos`);
      setExistentes(data);
    } catch (err) {
      setError(mensajeError(err));
    }
  }, [cabanaId]);

  useEffect(() => {
    // La carga es asíncrona: el estado se actualiza cuando llega la respuesta
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
  }, [cargar]);

  const total = existentes.length + pendientes.length;

  const agregar = async () => {
    setError('');
    const archivo = inputRef.current?.files?.[0];
    if (!archivo) return setError('Elegí un archivo (PDF o imagen).');
    if (archivo.size > MAX_MB * 1024 * 1024) return setError(`El archivo no puede pesar más de ${MAX_MB} MB.`);
    if (total >= MAX_DOCS) return setError(`Podés cargar hasta ${MAX_DOCS} documentos.`);

    if (!cabanaId) {
      onPendientes([...pendientes, { tipo, archivo }]);
      inputRef.current.value = '';
      return;
    }
    setTrabajando(true);
    try {
      const datos = new FormData();
      datos.append('tipo', tipo);
      datos.append('archivo', archivo);
      await api.post(`/cabanas/${cabanaId}/documentos`, datos);
      inputRef.current.value = '';
      await cargar();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setTrabajando(false);
    }
  };

  const quitarExistente = async (doc) => {
    setError('');
    try {
      await api.delete(`/cabanas/${cabanaId}/documentos/${doc.id}`);
      await cargar();
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  return (
    <fieldset className="documentos-cabana">
      <legend>Documentación de la propiedad (opcional)</legend>
      <p className="texto-suave">
        Ayuda al equipo de Cabins a verificar tu cabaña más rápido. Podés subir hasta {MAX_DOCS} archivos (PDF, JPG, PNG o WEBP,
        máx. {MAX_MB} MB). Se guardan en un espacio privado: solo los ve el equipo de revisión.
      </p>

      {existentes.map((d) => (
        <div key={d.id} className="documento-fila">
          <span>📄 <strong>{TIPOS_DOCUMENTO[d.tipo]}</strong> <small className="texto-suave">{d.nombre_original}</small></span>
          <button type="button" className="btn btn-secundario" onClick={() => quitarExistente(d)}>Quitar</button>
        </div>
      ))}
      {pendientes.map((p, i) => (
        <div key={`${p.archivo.name}-${i}`} className="documento-fila">
          <span>📄 <strong>{TIPOS_DOCUMENTO[p.tipo]}</strong> <small className="texto-suave">{p.archivo.name} · se sube al guardar</small></span>
          <button type="button" className="btn btn-secundario" onClick={() => onPendientes(pendientes.filter((_, j) => j !== i))}>Quitar</button>
        </div>
      ))}

      {total < MAX_DOCS && (
        <div className="documento-nuevo">
          <select aria-label="Tipo de documento" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {Object.entries(TIPOS_DOCUMENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input ref={inputRef} type="file" aria-label="Archivo" accept="application/pdf,image/jpeg,image/png,image/webp" />
          <button type="button" className="btn btn-secundario" onClick={agregar} disabled={trabajando}>
            {trabajando ? 'Subiendo...' : 'Agregar'}
          </button>
        </div>
      )}
      {error && <div className="mensaje-error" role="alert">{error}</div>}
    </fieldset>
  );
}
