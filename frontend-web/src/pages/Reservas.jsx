import { useEffect, useState } from 'react';
import api, { mensajeError } from '../api/client';
import SidebarFiltros from '../components/SidebarFiltros';
import CabanaCard from '../components/CabanaCard';

const FILTROS_VACIOS = {
  provincia_id: '', localidad_id: '', precio_min: '', precio_max: '', valoracion_min: ''
};

const ORDENES = [
  { valor: 'recientes', texto: 'Más recientes' },
  { valor: 'precio_asc', texto: 'Menor precio' },
  { valor: 'precio_desc', texto: 'Mayor precio' },
  { valor: 'valoracion', texto: 'Mayor valoración' }
];

// Solo se mandan al servidor los filtros que tienen valor
const armarConsulta = (filtros, orden) => {
  const consulta = { orden };
  Object.entries(filtros).forEach(([clave, valor]) => {
    if (valor !== '') consulta[clave] = valor;
  });
  return consulta;
};

export default function Reservas() {
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [errorFiltro, setErrorFiltro] = useState('');
  const [consulta, setConsulta] = useState({ orden: 'recientes' });
  const [resultado, setResultado] = useState({ consulta: null, cabanas: [], error: '' });

  // Si llega una respuesta vieja después de una consulta nueva, se descarta
  useEffect(() => {
    let activo = true;
    api.get('/cabanas', { params: consulta })
      .then(({ data }) => {
        if (activo) setResultado({ consulta, cabanas: data, error: '' });
      })
      .catch((err) => {
        if (activo) setResultado({ consulta, cabanas: [], error: mensajeError(err) });
      });
    return () => { activo = false; };
  }, [consulta]);

  const cargando = resultado.consulta !== consulta;

  const aplicar = () => {
    const min = filtros.precio_min === '' ? null : Number(filtros.precio_min);
    const max = filtros.precio_max === '' ? null : Number(filtros.precio_max);

    const invalido = (n) => n !== null && (!Number.isFinite(n) || n < 0);
    if (invalido(min) || invalido(max)) {
      setErrorFiltro('Los precios tienen que ser números positivos.');
      return;
    }
    if (min !== null && max !== null && min > max) {
      setErrorFiltro('El precio mínimo no puede ser mayor al máximo.');
      return;
    }

    setErrorFiltro('');
    setConsulta(armarConsulta(filtros, consulta.orden));
  };

  const limpiar = () => {
    setFiltros(FILTROS_VACIOS);
    setErrorFiltro('');
    setConsulta({ orden: consulta.orden });
  };

  const cambiarOrden = (e) => setConsulta({ ...consulta, orden: e.target.value });

  return (
    <div className="catalogo">
      <SidebarFiltros
        filtros={filtros}
        setFiltros={setFiltros}
        onAplicar={aplicar}
        onLimpiar={limpiar}
        error={errorFiltro}
      />

      <section>
        <div className="catalogo-barra">
          <h2>
            Reservas{' '}
            {!cargando && !resultado.error && <small>({resultado.cabanas.length})</small>}
          </h2>
          <div className="campo campo-orden">
            <label htmlFor="orden">Ordenar por</label>
            <select id="orden" value={consulta.orden} onChange={cambiarOrden}>
              {ORDENES.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
            </select>
          </div>
        </div>

        {cargando && <p>Cargando cabañas...</p>}
        {!cargando && resultado.error && <div className="mensaje-error">{resultado.error}</div>}
        {!cargando && !resultado.error && resultado.cabanas.length === 0 && (
          <div className="tarjeta centrado">
            <p>No hay cabañas con esos filtros. Probá cambiarlos.</p>
          </div>
        )}

        <div className="lista-cabanas">
          {!cargando && resultado.cabanas.map((c) => <CabanaCard key={c.id} cabana={c} />)}
        </div>
      </section>
    </div>
  );
}