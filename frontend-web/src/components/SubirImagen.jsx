import { useRef, useState } from 'react';
import api, { mensajeError } from '../api/client';

const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 5;

// Zona para arrastrar una foto (o elegirla con un clic). Sube la imagen al servidor
// y devuelve la URL pública con onCambio. También permite pegar un enlace.
export default function SubirImagen({ valor, onCambio }) {
  const inputRef = useRef(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const [verUrl, setVerUrl] = useState(false);

  const subir = async (archivo) => {
    setError('');
    if (!archivo) return;
    if (!TIPOS.includes(archivo.type)) return setError('Solo se aceptan imágenes JPG, PNG o WEBP.');
    if (archivo.size > MAX_MB * 1024 * 1024) return setError(`La imagen no puede pesar más de ${MAX_MB} MB.`);
    const datos = new FormData();
    datos.append('imagen', archivo);
    setSubiendo(true);
    try {
      const { data } = await api.post('/imagenes', datos);
      onCambio(data.url);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const soltar = (e) => {
    e.preventDefault();
    setArrastrando(false);
    subir(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="subir-imagen">
      <div
        className={`subir-zona${arrastrando ? ' arrastrando' : ''}${subiendo ? ' subiendo' : ''}`}
        role="button" tabIndex={0} data-testid="zona-imagen"
        onClick={() => !subiendo && inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inputRef.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={soltar}
      >
        {subiendo ? <span>Subiendo imagen…</span> : (
          <>
            <strong>Arrastrá una foto acá</strong>
            <span>o hacé clic para elegirla · JPG, PNG o WEBP · hasta {MAX_MB} MB</span>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden
          data-testid="input-archivo" onChange={(e) => subir(e.target.files?.[0])} />
      </div>

      {error && <div className="mensaje-error" role="alert">{error}</div>}

      {valor && (
        <button type="button" className="btn-enlace" onClick={() => { onCambio(''); setError(''); }}>
          Quitar imagen
        </button>
      )}

      <button type="button" className="btn-enlace" onClick={() => setVerUrl(!verUrl)}>
        {verUrl ? 'Ocultar enlace' : 'o pegá un enlace de imagen'}
      </button>
      {verUrl && (
        <input type="url" maxLength={500} placeholder="https://..." aria-label="Enlace de la imagen"
          value={valor} onChange={(e) => onCambio(e.target.value)} />
      )}
    </div>
  );
}
