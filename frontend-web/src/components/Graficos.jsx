import { formatearPrecio } from '../utils/formato';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const NOMBRES_MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Abrevia los montos del eje: 1.200.000 -> $1,2 M
const abreviar = (n) => {
  if (n >= 1e6) return `$${(n / 1e6).toLocaleString('es-AR', { maximumFractionDigits: 1 })} M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)} mil`;
  return `$${Math.round(n)}`;
};

// Barras verticales: ingresos de los 12 meses. datos = [{ mes: 1..12, ingresos, reservas }]
export function BarrasMensuales({ datos }) {
  const ancho = 600;
  const alto = 240;
  const margen = { arriba: 16, abajo: 28, izq: 56, der: 8 };
  const max = Math.max(...datos.map((d) => d.ingresos), 0);
  const techo = max > 0 ? max : 1;
  const area = { w: ancho - margen.izq - margen.der, h: alto - margen.arriba - margen.abajo };
  const paso = area.w / 12;
  const lineas = [0, 0.5, 1];

  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className="grafico" role="img"
      aria-label="Ingresos por mes">
      {lineas.map((f) => {
        const y = margen.arriba + area.h * (1 - f);
        return (
          <g key={f}>
            <line x1={margen.izq} x2={ancho - margen.der} y1={y} y2={y} className="grafico-grilla" />
            <text x={margen.izq - 6} y={y + 4} textAnchor="end" className="grafico-texto">
              {abreviar(techo * f)}
            </text>
          </g>
        );
      })}
      {datos.map((d, i) => {
        const h = (d.ingresos / techo) * area.h;
        const x = margen.izq + i * paso + paso * 0.15;
        return (
          <g key={d.mes}>
            <rect x={x} y={margen.arriba + area.h - h} width={paso * 0.7} height={Math.max(h, d.ingresos > 0 ? 2 : 0)}
              rx="3" className="grafico-barra">
              <title>{`${NOMBRES_MESES[i]}: ${formatearPrecio(d.ingresos)} (${d.reservas} ${d.reservas === 1 ? 'reserva' : 'reservas'})`}</title>
            </rect>
            <text x={x + paso * 0.35} y={alto - 8} textAnchor="middle" className="grafico-texto">{MESES[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

// Barras horizontales con etiqueta y valor. items = [{ clave, etiqueta, detalle, valor, texto }]
export function BarrasHorizontales({ items }) {
  const max = Math.max(...items.map((i) => i.valor), 0) || 1;
  return (
    <ol className="barras-h">
      {items.map((i, n) => (
        <li key={i.clave}>
          <div className="barras-h-linea">
            <span><span className="ranking">{n + 1}</span> {i.etiqueta} <small>{i.detalle}</small></span>
            <strong>{i.texto}</strong>
          </div>
          <div className="barras-h-fondo">
            <div className="barras-h-relleno" style={{ width: `${(i.valor / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

// Dona hecha con CSS. partes = [{ clave, etiqueta, valor, color }]
export function Dona({ partes, centro, subcentro }) {
  const total = partes.reduce((a, p) => a + p.valor, 0);
  let acumulado = 0;
  const tramos = partes
    .filter((p) => p.valor > 0)
    .map((p) => {
      const desde = (acumulado / total) * 100;
      acumulado += p.valor;
      return `${p.color} ${desde}% ${(acumulado / total) * 100}%`;
    });
  const fondo = total > 0 ? `conic-gradient(${tramos.join(', ')})` : 'var(--borde)';

  return (
    <div className="dona-caja">
      <div className="dona" style={{ background: fondo }} role="img"
        aria-label={partes.map((p) => `${p.etiqueta}: ${p.valor}`).join(', ')}>
        <div className="dona-centro">
          <strong>{centro}</strong>
          <span>{subcentro}</span>
        </div>
      </div>
      <ul className="dona-leyenda">
        {partes.map((p) => (
          <li key={p.clave}>
            <span className="punto" style={{ background: p.color }} />
            <span>{p.etiqueta}</span>
            <strong>{p.valor}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
