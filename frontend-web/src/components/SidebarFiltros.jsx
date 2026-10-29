import { useEffect, useState } from 'react';
import api from '../api/client';

export default function SidebarFiltros({ filtros, setFiltros, onAplicar, onLimpiar, error }) {
  const [provincias, setProvincias] = useState([]);
  const [localidades, setLocalidades] = useState([]);

  useEffect(() => {
    api.get('/provincias')
      .then(({ data }) => setProvincias(data))
      .catch(() => {});
  }, []);

  const cambiar = (e) => setFiltros({ ...filtros, [e.target.name]: e.target.value });

  // Al elegir una provincia se cargan sus localidades y se borra la localidad elegida antes
  const cambiarProvincia = async (e) => {
    const id = e.target.value;
    setFiltros({ ...filtros, provincia_id: id, localidad_id: '' });
    if (!id) {
      setLocalidades([]);
      return;
    }
    try {
      const { data } = await api.get(`/provincias/${id}/localidades`);
      setLocalidades(data);
    } catch {
      setLocalidades([]);
    }
  };

  const localidadesVisibles = filtros.provincia_id ? localidades : [];

  return (
    <aside className="sidebar tarjeta">
      <h3>Filtros</h3>

      <div className="campo">
        <label htmlFor="provincia_id">Provincia</label>
        <select id="provincia_id" name="provincia_id" value={filtros.provincia_id} onChange={cambiarProvincia}>
          <option value="">Todas</option>
          {provincias.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>

      <div className="campo">
        <label htmlFor="localidad_id">Localidad</label>
        <select
          id="localidad_id" name="localidad_id" value={filtros.localidad_id}
          onChange={cambiar} disabled={!filtros.provincia_id}
        >
          <option value="">{filtros.provincia_id ? 'Todas' : 'Elegí una provincia'}</option>
          {localidadesVisibles.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
        </select>
      </div>

      <div className="campo">
        <label htmlFor="precio_min">Precio por noche</label>
        <div className="fila-precio">
          <input
            id="precio_min" name="precio_min" type="number" min="0" placeholder="Mínimo"
            value={filtros.precio_min} onChange={cambiar}
          />
          <input
            name="precio_max" type="number" min="0" placeholder="Máximo" aria-label="Precio máximo"
            value={filtros.precio_max} onChange={cambiar}
          />
        </div>
      </div>

      <div className="campo">
        <label htmlFor="valoracion_min">Valoración mínima</label>
        <select id="valoracion_min" name="valoracion_min" value={filtros.valoracion_min} onChange={cambiar}>
          <option value="">Cualquiera</option>
          <option value="4">4 estrellas o más</option>
          <option value="3">3 estrellas o más</option>
          <option value="2">2 estrellas o más</option>
          <option value="1">1 estrella o más</option>
        </select>
      </div>

      {error && <div className="mensaje-error">{error}</div>}

      <button type="button" className="btn" style={{ width: '100%' }} onClick={onAplicar}>
        Aplicar filtros
      </button>
      <button
        type="button" className="btn btn-secundario"
        style={{ width: '100%', marginTop: '0.5rem' }} onClick={onLimpiar}
      >
        Limpiar
      </button>
    </aside>
  );
}