import { useState } from 'react';

// Foto grande con tiras de miniaturas y flechas, para el detalle de la cabaña
export default function GaleriaDetalle({ fotos, nombre }) {
  const [actual, setActual] = useState(0);
  const [rotas, setRotas] = useState({});
  const validas = fotos.filter((u) => !rotas[u]);

  if (validas.length === 0) return <div className="detalle-img cabana-sin-imagen">Sin imagen</div>;
  const i = Math.min(actual, validas.length - 1);
  const ir = (d) => setActual((i + d + validas.length) % validas.length);

  return (
    <div className="galeria-detalle">
      <div className="galeria-principal">
        <img className="detalle-img" src={validas[i]} alt={`${nombre} - foto ${i + 1}`}
          onError={() => setRotas((r) => ({ ...r, [validas[i]]: true }))} />
        {validas.length > 1 && (
          <>
            <button type="button" className="galeria-flecha izq" onClick={() => ir(-1)} aria-label="Foto anterior">‹</button>
            <button type="button" className="galeria-flecha der" onClick={() => ir(1)} aria-label="Foto siguiente">›</button>
            <span className="galeria-contador">{i + 1} / {validas.length}</span>
          </>
        )}
      </div>
      {validas.length > 1 && (
        <div className="galeria-miniaturas">
          {validas.map((u, k) => (
            <button type="button" key={u} className={k === i ? 'activa' : ''} onClick={() => setActual(k)} aria-label={`Ver foto ${k + 1}`}>
              <img src={u} alt="" onError={() => setRotas((r) => ({ ...r, [u]: true }))} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
