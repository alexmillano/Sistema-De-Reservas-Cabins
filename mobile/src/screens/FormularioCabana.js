import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import api, { mensajeError } from '../api/client';
import { Aviso, Boton, Campo, Stepper } from '../components/Ui';
import Selector from '../components/Selector';
import AvoidTeclado from '../components/AvoidTeclado';
import GaleriaEditor from '../components/GaleriaEditor';
import { colores } from '../theme/colores';
import { formatearPrecio } from '../utils/formato';

const MEDIOS_PAGO = ['Efectivo', 'Tarjeta', 'MercadoPago'];
const MAX_DESCRIPCION = 1000;
const VACIO = { nombre: '', descripcion: '', provincia_id: '', localidad_id: '', precio_por_noche: '', capacidad_personas: 2, imagenes: [], medios: [] };

export default function FormularioCabana({ navigation, route }) {
  const id = route.params?.id;
  const editando = Boolean(id);
  const [form, setForm] = useState(VACIO);
  const [provincias, setProvincias] = useState([]);
  const [localidades, setLocalidades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: editando ? 'Editar cabaña' : 'Nueva cabaña' });
  }, [navigation, editando]);

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
              precio_por_noche: String(c.precio_por_noche), capacidad_personas: Number(c.capacidad_personas),
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
    return () => { activo = false; };
  }, [id, editando]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const elegirProvincia = async (provinciaId) => {
    setForm((f) => ({ ...f, provincia_id: String(provinciaId), localidad_id: '' }));
    setLocalidades([]);
    try {
      const { data } = await api.get(`/provincias/${provinciaId}/localidades`);
      setLocalidades(data);
    } catch (err) {
      setError(mensajeError(err));
    }
  };

  const alternarMedio = (m) => setForm((f) => ({ ...f, medios: f.medios.includes(m) ? f.medios.filter((x) => x !== m) : [...f.medios, m] }));

  const enviar = async () => {
    setError('');
    if (!form.nombre.trim()) return setError('Ingresá el nombre de la cabaña.');
    if (!form.descripcion.trim()) return setError('Ingresá una descripción.');
    if (form.precio_por_noche.includes(',')) return setError('El precio debe usar punto como separador decimal (ejemplo: 45000.50).');
    const precio = Number(form.precio_por_noche);
    if (!Number.isFinite(precio) || precio <= 0) return setError('Ingresá un precio válido mayor a cero.');
    const capacidad = Number(form.capacidad_personas);
    if (!Number.isInteger(capacidad) || capacidad < 1 || capacidad > 50) return setError('La capacidad debe ser un número entero entre 1 y 50.');
    if (!form.localidad_id) return setError('Elegí la provincia y la localidad.');

    const cuerpo = {
      nombre: form.nombre.trim(), descripcion: form.descripcion.trim(),
      localidad_id: Number(form.localidad_id), precio_por_noche: precio, capacidad_personas: capacidad,
      imagen_url: form.imagenes[0] || null, imagenes: form.imagenes, metodos_pago: form.medios.join(', ') || null
    };

    setEnviando(true);
    try {
      if (editando) await api.put(`/cabanas/${id}`, cuerpo);
      else await api.post('/cabanas', cuerpo);
      navigation.navigate('Principal', { screen: 'Cabañas', params: { aviso: editando ? 'Cabaña actualizada correctamente.' : 'Cabaña creada correctamente.', t: Date.now() } });
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  };

  if (cargando) return <ActivityIndicator color={colores.primario} style={{ marginTop: 60 }} />;
  if (errorCarga) return <View style={{ padding: 20 }}><Aviso texto={errorCarga} /></View>;

  const localidadNombre = localidades.find((l) => String(l.id) === form.localidad_id)?.nombre;
  const provinciaNombre = provincias.find((p) => String(p.id) === form.provincia_id)?.nombre;
  const precioNumero = Number(form.precio_por_noche);

  return (
    <AvoidTeclado>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <Text style={estilos.seccion}>Información principal</Text>
        <Campo etiqueta="Nombre de la cabaña" value={form.nombre} onChangeText={set('nombre')} autoCapitalize="sentences" maxLength={150} />
        <Campo etiqueta={`Descripción (${form.descripcion.length}/${MAX_DESCRIPCION})`} value={form.descripcion} onChangeText={set('descripcion')}
          autoCapitalize="sentences" multiline maxLength={MAX_DESCRIPCION} style={{ minHeight: 110, textAlignVertical: 'top' }} />

        <Text style={estilos.seccion}>Ubicación</Text>
        <Selector etiqueta="Provincia" valor={form.provincia_id} opciones={provincias} onElegir={elegirProvincia} placeholder="Elegí una provincia" />
        <Selector etiqueta="Localidad" valor={form.localidad_id} opciones={localidades} onElegir={(v) => set('localidad_id')(String(v))}
          placeholder={form.provincia_id ? 'Elegí una localidad' : 'Primero elegí una provincia'} deshabilitado={!form.provincia_id} />

        <Text style={estilos.seccion}>Tarifa y capacidad</Text>
        <Campo etiqueta="Precio por noche (ARS, con punto decimal)" value={form.precio_por_noche} onChangeText={set('precio_por_noche')} keyboardType="decimal-pad" placeholder="45000" />
        <View style={estilos.fila}>
          <Text style={estilos.etiqueta}>Capacidad (personas)</Text>
          <Stepper valor={form.capacidad_personas} min={1} max={50} onChange={set('capacidad_personas')} />
        </View>

        <Text style={estilos.seccion}>Fotos de la cabaña (opcional, hasta 10)</Text>
        <GaleriaEditor fotos={form.imagenes} onCambio={(fotos) => setForm((f) => ({ ...f, imagenes: fotos }))} />

        <Text style={estilos.seccion}>Medios de pago aceptados</Text>
        <View style={estilos.medios}>
          {MEDIOS_PAGO.map((m) => (
            <Pressable key={m} onPress={() => alternarMedio(m)} style={[estilos.medio, form.medios.includes(m) && estilos.medioActivo]}>
              <Text style={[estilos.medioTexto, form.medios.includes(m) && { color: '#fff' }]}>{form.medios.includes(m) ? '✓ ' : ''}{m}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={estilos.seccion}>Vista previa en el catálogo</Text>
        <View style={estilos.previa}>
          {form.imagenes[0]
            ? <Image source={{ uri: form.imagenes[0] }} style={estilos.previaImg} />
            : <View style={[estilos.previaImg, estilos.sinImagen]}><Text style={{ color: colores.textoSuave }}>Sin imagen</Text></View>}
          <View style={{ padding: 12 }}>
            <Text style={estilos.previaNombre}>{form.nombre || 'Nombre de la cabaña'}</Text>
            <Text style={estilos.previaDato}>📍 {localidadNombre ? `${localidadNombre}, ${provinciaNombre}` : 'Ubicación'}</Text>
            <Text style={estilos.previaDato}>Hasta {form.capacidad_personas || '–'} personas</Text>
            <Text style={estilos.previaPrecio}>{precioNumero > 0 ? formatearPrecio(precioNumero) : '$ –'} <Text style={estilos.previaDato}>/ noche</Text></Text>
          </View>
        </View>

        <Aviso texto={error} />
        <Boton titulo={editando ? 'Guardar cambios' : 'Confirmar'} onPress={enviar} cargando={enviando} />
        <Boton titulo="Cancelar" onPress={() => navigation.goBack()} secundario />
      </ScrollView>
    </AvoidTeclado>
  );
}

const estilos = StyleSheet.create({
  seccion: { fontSize: 17, fontWeight: '800', color: colores.primario, marginTop: 14, marginBottom: 10 },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  etiqueta: { color: colores.texto, fontWeight: '600' },
  imagenCaja: { marginBottom: 10 },
  imagen: { width: '100%', height: 180, borderRadius: 12 },
  sinImagen: { backgroundColor: colores.chip, alignItems: 'center', justifyContent: 'center' },
  subiendo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  quitar: { color: colores.error, textAlign: 'center', fontWeight: '600', paddingVertical: 8 },
  medios: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  medio: { backgroundColor: colores.chip, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9 },
  medioActivo: { backgroundColor: colores.primario },
  medioTexto: { color: colores.primario, fontWeight: '700' },
  previa: { backgroundColor: colores.tarjeta, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colores.borde, marginBottom: 14 },
  previaImg: { width: '100%', height: 130 },
  previaNombre: { fontSize: 17, fontWeight: '800', color: colores.texto },
  previaDato: { color: colores.textoSuave, fontSize: 13, marginTop: 2 },
  previaPrecio: { fontSize: 17, fontWeight: '800', color: colores.primario, marginTop: 6 }
});
