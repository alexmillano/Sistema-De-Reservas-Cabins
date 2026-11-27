import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { mensajeError } from '../api/client';
import { formatearPrecio } from '../utils/formato';
import GaleriaEditor from '../components/GaleriaEditor';
import DocumentosCabana from '../components/DocumentosCabana';

const MEDIOS_PAGO = ['Efectivo', 'Tarjeta', 'MercadoPago'];
const MAX_DESCRIPCION = 1000;
const VACIO = {
  nombre: '', descripcion: '', provincia_id: '', localidad_id: '',
  precio_por_noche: '', capacidad_personas: '2', imagenes: [], medios: []
};

export default function FormularioCabana() {
  const { id } = useParams(); // si hay id, se edita; si no, se crea
  const editando = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(VACIO);
  const [provincias, setProvincias] = useState([]);
  const [localidades, setLocalidades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [docsPendientes, setDocsPendientes] = useState([]);

  // Provincias, y la cabaña a editar si corresponde
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const [prov, panel] = await Promise.all([
          api.get('/provincias'),
          editando ? api.get('/cabanas/panel') : Promise.resolve(null)
        ]);
        if (!activo) return;
        setProvincias(prov.data);

        if (editando) {
          const c = panel.data.find((x) => String(x.id) === String(id));
          if (!c) {
            setErrorCarga('No encontramos esa cabaña entre tus propiedades.');
          } else {
            const locs = await api.get(`/provincias/${c.provincia_id}/localidades`);
            if (!activo) return;
            setLocalidades(locs.data);
            setForm({
              nombre: c.nombre, descripcion: c.descripcion,
              provincia_id: String(c.provincia_id), localidad_id: String(c.localidad_id),
              precio_por_noche: String(c.precio_por_noche), capacidad_personas: String(c.capacidad_personas),
              imagenes: Array.isArray(c.imagenes) && c.imagenes.length ? c.imagenes : (c.imagen_url ? [c.imagen_url] : []),
              medios: (c.metodos_pago || '').split(',').map((m) => m.trim()).filter(Boolean)
            });
          }
        }
      } catch (err) {
        if (activo) setErrorCarga(mensajeError(err));
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [id, editando]);

  const cambiar = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const elegirProvincia = async (e) => {
    const provinciaId = e.target.value;
    setForm({ ...form, provincia_id: provinciaId, localidad_id: '' });
    setLocalidades([]);
    if (!provinciaId) return;
    try {
      const { data } = await api.get(`/provincias/${provinciaId}/localidades`);
      setLocalidades(data);
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  const alternarMedio = (medio) => {
    const medios = form.medios.includes(medio)
      ? form.medios.filter((m) => m !== medio)
      : [...form.medios, medio];
    setForm({ ...form, medios });
  };

  const enviar = async (e) => {
    e.preventDefault();
    setError('');

    if (form.precio_por_noche.includes(',')) {
      return setError('El precio debe usar punto como separador decimal (ejemplo: 45000.50).');
    }
    const precio = Number(form.precio_por_noche);
    if (!Number.isFinite(precio) || precio <= 0) return setError('Ingresá un precio válido mayor a cero.');
    const capacidad = Number(form.capacidad_personas);
    if (!Number.isInteger(capacidad) || capacidad < 1 || capacidad > 50) {
      return setError('La capacidad debe ser un número entero entre 1 y 50.');
    }
    if (!form.localidad_id) return setError('Elegí la provincia y la localidad.');

    const cuerpo = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      localidad_id: Number(form.localidad_id),
      precio_por_noche: precio,
      capacidad_personas: capacidad,
      imagen_url: form.imagenes[0] || null,
      imagenes: form.imagenes,
      metodos_pago: form.medios.join(', ') || null
    };

    setEnviando(true);
    try {
      let aviso = 'Cabaña actualizada correctamente.';
      if (editando) {
        await api.put(`/cabanas/${id}`, cuerpo);
      } else {
        const { data } = await api.post('/cabanas', cuerpo);
        aviso = 'Cabaña enviada a revisión. Se publicará cuando el equipo de Cabins la apruebe.';
        // La documentación se sube una vez creada la cabaña; si alguno falla, se avisa y se puede reintentar al editar
        let fallidos = 0;
        for (const doc of docsPendientes) {
          try {
            const datos = new FormData();
            datos.append('tipo', doc.tipo);
            datos.append('archivo', doc.archivo);
            await api.post(`/cabanas/${data.id}/documentos`, datos);
          } catch {
            fallidos += 1;
          }
        }
        if (fallidos > 0) aviso += ` ${fallidos} documento(s) no se pudieron subir: agregalos desde «Editar».`;
      }
      navigate('/admin/cabanas', { state: { aviso } });
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  };

  if (cargando) return <section className="seccion"><p>Cargando...</p></section>;
  if (errorCarga) return <section className="seccion"><div className="mensaje-error">{errorCarga}</div></section>;

  const localidadNombre = localidades.find((l) => String(l.id) === form.localidad_id)?.nombre;
  const provinciaNombre = provincias.find((p) => String(p.id) === form.provincia_id)?.nombre;
  const precioNumero = Number(form.precio_por_noche);

  return (
    <section className="seccion formulario-cabana">
      <h1>{editando ? 'Editar cabaña' : 'Crear cabaña'}</h1>

      <form className="tarjeta" onSubmit={enviar}>
        <h2>Información principal</h2>
        <div className="campo">
          <label htmlFor="c-nombre">Nombre de la cabaña</label>
          <input id="c-nombre" name="nombre" maxLength={150} value={form.nombre} onChange={cambiar} required />
        </div>
        <div className="campo">
          <label htmlFor="c-desc">Descripción ({form.descripcion.length}/{MAX_DESCRIPCION})</label>
          <textarea id="c-desc" name="descripcion" rows="4" maxLength={MAX_DESCRIPCION}
            value={form.descripcion} onChange={cambiar} required />
        </div>

        <h2>Ubicación</h2>
        <div className="form-fila">
          <div className="campo">
            <label htmlFor="c-prov">Provincia</label>
            <select id="c-prov" value={form.provincia_id} onChange={elegirProvincia} required>
              <option value="">Elegí una provincia</option>
              {provincias.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="c-loc">Localidad</label>
            <select id="c-loc" name="localidad_id" value={form.localidad_id} onChange={cambiar}
              disabled={!form.provincia_id} required>
              <option value="">{form.provincia_id ? 'Elegí una localidad' : 'Primero elegí una provincia'}</option>
              {localidades.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
            </select>
          </div>
        </div>

        <h2>Tarifa y capacidad</h2>
        <div className="form-fila">
          <div className="campo">
            <label htmlFor="c-precio">Precio por noche (ARS, con punto decimal)</label>
            <input id="c-precio" name="precio_por_noche" type="number" min="0.01" step="0.01"
              value={form.precio_por_noche} onChange={cambiar} required />
          </div>
          <div className="campo">
            <label htmlFor="c-cap">Capacidad (personas)</label>
            <input id="c-cap" name="capacidad_personas" type="number" min="1" max="50"
              value={form.capacidad_personas} onChange={cambiar} required />
          </div>
        </div>
        <div className="campo">
          <label>Fotos de la cabaña (opcional, hasta 10)</label>
          <GaleriaEditor fotos={form.imagenes} onCambio={(fotos) => setForm((f) => ({ ...f, imagenes: fotos }))} />
        </div>

        <DocumentosCabana cabanaId={editando ? id : null} pendientes={docsPendientes} onPendientes={setDocsPendientes} />

        <fieldset className="medios-pago">
          <legend>Medios de pago aceptados</legend>
          {MEDIOS_PAGO.map((m) => (
            <label key={m} className="check">
              <input type="checkbox" checked={form.medios.includes(m)} onChange={() => alternarMedio(m)} /> {m}
            </label>
          ))}
        </fieldset>

        <h2>Vista previa en el catálogo</h2>
        <article className="item-carrito tarjeta vista-previa">
          {form.imagenes[0] ? (
            <img className="cabana-img" src={form.imagenes[0]} alt="Vista previa" />
          ) : (
            <div className="cabana-img cabana-sin-imagen">Sin imagen</div>
          )}
          <div className="item-cuerpo">
            <h3>{form.nombre || 'Nombre de la cabaña'}</h3>
            <p className="cabana-ubicacion">
              📍 {localidadNombre ? `${localidadNombre}, ${provinciaNombre}` : 'Ubicación'}
            </p>
            <p className="cabana-datos">Hasta {form.capacidad_personas || '–'} personas</p>
            <p className="precio">
              {precioNumero > 0 ? formatearPrecio(precioNumero) : '$ –'} <small>/ noche</small>
            </p>
          </div>
        </article>

        {error && <div className="mensaje-error" role="alert">{error}</div>}
        <div className="btn-fila">
          <button type="button" className="btn btn-secundario" onClick={() => navigate('/admin/cabanas')}>
            Cancelar
          </button>
          <button type="submit" className="btn" disabled={enviando}>
            {enviando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Confirmar'}
          </button>
        </div>
      </form>
    </section>
  );
}
