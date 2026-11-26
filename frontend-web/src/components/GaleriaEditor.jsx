import { useRef, useState } from 'react';
import api, { mensajeError } from '../api/client';

const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 5;
export const MAX_FOTOS = 10;

// Galería de la cabaña: hasta 10 fotos. La primera es la portada del catálogo.
// Cada foto se sube al servidor y se guarda su URL pública.
export default function GaleriaEditor({ fotos, onCambio }) {
  const inputRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');

  const agregar = async (archivos) => {
    setError('');
    const lista = Array.from(archivos || []);
    if (lista.length === 0) return;
    const lugar = MAX_FOTOS - fotos.length;
    if (lugar <= 0) return setError(`Ya cargaste el máximo de ${MAX_FOTOS} fotos.`);
    const elegidas = lista.slice(0, lugar);
    const avisos = [];
    if (lista.length > lugar) avisos.push(`Solo entran ${lugar} fotos más: se descartaron ${lista.length - lugar}.`);

    setSubiendo(true);
    const nuevas = [];
    for (const archivo of elegidas) {
      if (!TIPOS.includes(archivo.type)) { avisos.push(`«${archivo.name}»: solo se aceptan JPG, PNG o WEBP.`); continue; }
      if (archivo.size > MAX_MB * 1024 * 1024) { avisos.push(`«${archivo.name}»: pesa más de ${MAX_MB} MB.`); continue; }
      try {
        const datos = new FormData();
        datos.append('imagen', archivo);
        const { data } = await api.post('/imagenes', datos);
        nuevas.push(data.url);
      } catch (err) {
        avisos.push(`«${archivo.name}»: ${mensajeError(err)}`);
      }
    }
    if (nuevas.length) onCambio([...fotos, ...nuevas]);
    if (avisos.length) setError(avisos.join(' '));
    setSubiendo(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const quitar = (i) => onCambio(fotos.filter((_, k) => k !== i));
  const hacerPortada = (i) => onCambio([fotos[i], ...fotos.filter((_, k) => k !== i)]);
  const mover = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= fotos.length) return;
    const copia = [...fotos];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    onCambio(copia);
  };

  return (
    <div className="galeria-editor">
      <div className="galeria-grilla">
        {fotos.map((url, i) => (
          <div className="galeria-foto" key={url}>
            <img src={url} alt={`Foto ${i + 1}`} />
            {i === 0 && <span className="galeria-portada">Portada</span>}
            <div className="galeria-acciones">
              <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Mover a la izquierda">‹</button>
              <button type="button" onClick={() => mover(i, 1)} disabled={i === fotos.length - 1} aria-label="Mover a la derecha">›</button>
              {i > 0 && <button type="button" onClick={() => hacerPortada(i)}>Portada</button>}
              <button type="button" className="quitar" onClick={() => quitar(i)} aria-label="Quitar foto">✕</button>
            </div>
          </div>
        ))}
        {fotos.length < MAX_FOTOS && (
          <button type="button" className="galeria-agregar" disabled={subiendo} onClick={() => inputRef.current?.click()} data-testid="agregar-fotos">
            {subiendo ? 'Subiendo…' : <><strong>+</strong><span>Agregar fotos</span></>}
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
        data-testid="input-galeria" onChange={(e) => agregar(e.target.files)} />
      <p className="texto-suave">{fotos.length} de {MAX_FOTOS} fotos · JPG, PNG o WEBP · hasta {MAX_MB} MB cada una. La primera es la portada.</p>
      {error && <div className="mensaje-error" role="alert">{error}</div>}
    </div>
  );
}
