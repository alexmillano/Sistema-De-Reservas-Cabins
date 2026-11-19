import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import api, { mensajeError } from '../api/client';
import { Aviso, Boton, Campo } from '../components/Ui';
import CabanaCard from '../components/CabanaCard';
import { colores } from '../theme/colores';

const VACIOS = { provincia_id: '', localidad_id: '', precio_min: '', precio_max: '', valoracion_min: '' };
const ORDENES = [
  { valor: 'recomendado', texto: 'Recomendadas' },
  { valor: 'recientes', texto: 'Más recientes' },
  { valor: 'precio_asc', texto: 'Menor precio' },
  { valor: 'precio_desc', texto: 'Mayor precio' },
  { valor: 'valoracion', texto: 'Mayor valoración' }
];
const VALORACIONES = [
  { valor: '', texto: 'Todas' }, { valor: '3', texto: '3+ ★' }, { valor: '4', texto: '4+ ★' }, { valor: '4.5', texto: '4.5+ ★' }
];

function Chip({ texto, activo, onPress }) {
  return (
    <Pressable onPress={onPress} style={[estilos.chip, activo && estilos.chipActivo]}>
      <Text style={[estilos.chipTexto, activo && { color: '#fff' }]}>{texto}</Text>
    </Pressable>
  );
}

export default function Catalogo({ navigation }) {
  const [filtros, setFiltros] = useState(VACIOS);       // los aplicados
  const [borrador, setBorrador] = useState(VACIOS);     // lo que se edita en el panel
  const [orden, setOrden] = useState('recomendado');
  const [panel, setPanel] = useState(false);
  const [provincias, setProvincias] = useState([]);
  const [localidades, setLocalidades] = useState([]);
  const [cabanas, setCabanas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [errorFiltro, setErrorFiltro] = useState('');

  useEffect(() => {
    api.get('/provincias').then(({ data }) => setProvincias(data)).catch(() => {});
  }, []);

  // Las localidades dependen de la provincia elegida en el panel
  useEffect(() => {
    if (!borrador.provincia_id) { setLocalidades([]); return; }
    let activo = true;
    api.get(`/provincias/${borrador.provincia_id}/localidades`)
      .then(({ data }) => { if (activo) setLocalidades(data); })
      .catch(() => { if (activo) setLocalidades([]); });
    return () => { activo = false; };
  }, [borrador.provincia_id]);

  // Si llega una respuesta vieja después de una consulta nueva, se descarta
  useEffect(() => {
    let activo = true;
    setCargando(true);
    const params = { orden };
    Object.entries(filtros).forEach(([k, v]) => { if (v !== '') params[k] = v; });
    api.get('/cabanas', { params })
      .then(({ data }) => { if (activo) { setCabanas(data); setError(''); } })
      .catch((err) => { if (activo) { setCabanas([]); setError(mensajeError(err)); } })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [filtros, orden]);

  const aplicar = () => {
    const min = borrador.precio_min === '' ? null : Number(borrador.precio_min);
    const max = borrador.precio_max === '' ? null : Number(borrador.precio_max);
    const malo = (n) => n !== null && (!Number.isFinite(n) || n < 0);
    if (malo(min) || malo(max)) { setErrorFiltro('Los precios tienen que ser números positivos.'); return; }
    if (min !== null && max !== null && min > max) { setErrorFiltro('El precio mínimo no puede ser mayor al máximo.'); return; }
    setErrorFiltro('');
    setFiltros(borrador);
    setPanel(false);
  };

  const limpiar = () => { setBorrador(VACIOS); setFiltros(VACIOS); setErrorFiltro(''); setPanel(false); };
  const cantidad = Object.values(filtros).filter((v) => v !== '').length;
  const num = (k) => (v) => setBorrador((b) => ({ ...b, [k]: v.replace(/[^0-9]/g, '') }));

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <View style={estilos.barra}>
        <Pressable style={estilos.botonFiltro} onPress={() => { setBorrador(filtros); setPanel(true); }}>
          <Text style={estilos.botonFiltroTexto}>⚙︎ Filtros{cantidad > 0 ? ` (${cantidad})` : ''}</Text>
        </Pressable>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {ORDENES.map((o) => <Chip key={o.valor} texto={o.texto} activo={orden === o.valor} onPress={() => setOrden(o.valor)} />)}
        </ScrollView>
      </View>

      {cargando ? (
        <ActivityIndicator color={colores.primario} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={cabanas}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ padding: 16 }}
          ListHeaderComponent={
            <>
              <Aviso texto={error} />
              {!error && <Text style={estilos.cuenta}>{cabanas.length} {cabanas.length === 1 ? 'cabaña disponible' : 'cabañas disponibles'}</Text>}
            </>
          }
          ListEmptyComponent={!error && <Text style={estilos.vacio}>No hay cabañas con esos filtros. Probá cambiarlos.</Text>}
          renderItem={({ item }) => (
            <CabanaCard cabana={item} onPress={() => navigation.navigate('DetalleCabana', { id: item.id })} />
          )}
        />
      )}

      <Modal visible={panel} animationType="slide" onRequestClose={() => setPanel(false)}>
        <View style={{ flex: 1, backgroundColor: colores.fondo }}>
          <View style={estilos.panelCab}>
            <Text style={estilos.panelTitulo}>Personalizá tu estadía</Text>
            <Pressable onPress={() => setPanel(false)} hitSlop={10}><Text style={estilos.cerrar}>✕</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            <Aviso texto={errorFiltro} />

            <Text style={estilos.etiqueta}>PROVINCIA</Text>
            <View style={estilos.chips}>
              <Chip texto="Todas" activo={borrador.provincia_id === ''} onPress={() => setBorrador((b) => ({ ...b, provincia_id: '', localidad_id: '' }))} />
              {provincias.map((p) => (
                <Chip key={p.id} texto={p.nombre} activo={String(borrador.provincia_id) === String(p.id)}
                  onPress={() => setBorrador((b) => ({ ...b, provincia_id: String(p.id), localidad_id: '' }))} />
              ))}
            </View>

            {localidades.length > 0 && (
              <>
                <Text style={estilos.etiqueta}>LOCALIDAD</Text>
                <View style={estilos.chips}>
                  <Chip texto="Todas" activo={borrador.localidad_id === ''} onPress={() => setBorrador((b) => ({ ...b, localidad_id: '' }))} />
                  {localidades.map((l) => (
                    <Chip key={l.id} texto={l.nombre} activo={String(borrador.localidad_id) === String(l.id)}
                      onPress={() => setBorrador((b) => ({ ...b, localidad_id: String(l.id) }))} />
                  ))}
                </View>
              </>
            )}

            <Text style={estilos.etiqueta}>PRECIO POR NOCHE</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}><Campo etiqueta="Mínimo" value={borrador.precio_min} onChangeText={num('precio_min')} keyboardType="number-pad" placeholder="0" /></View>
              <View style={{ flex: 1 }}><Campo etiqueta="Máximo" value={borrador.precio_max} onChangeText={num('precio_max')} keyboardType="number-pad" placeholder="Sin tope" /></View>
            </View>

            <Text style={estilos.etiqueta}>VALORACIÓN MÍNIMA</Text>
            <View style={estilos.chips}>
              {VALORACIONES.map((v) => (
                <Chip key={v.valor} texto={v.texto} activo={borrador.valoracion_min === v.valor}
                  onPress={() => setBorrador((b) => ({ ...b, valoracion_min: v.valor }))} />
              ))}
            </View>

            <View style={{ marginTop: 20 }}>
              <Boton titulo="Aplicar filtros" onPress={aplicar} />
              <Boton titulo="Reiniciar" onPress={limpiar} secundario />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: { paddingHorizontal: 16, paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: colores.borde, backgroundColor: colores.fondo },
  botonFiltro: { alignSelf: 'flex-start', backgroundColor: colores.chip, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  botonFiltroTexto: { color: colores.primario, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { backgroundColor: colores.chip, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  chipActivo: { backgroundColor: colores.primario },
  chipTexto: { color: colores.primario, fontSize: 13, fontWeight: '600' },
  cuenta: { color: colores.textoSuave, marginBottom: 12, fontWeight: '600' },
  vacio: { textAlign: 'center', color: colores.textoSuave, marginTop: 30 },
  panelCab: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 48, backgroundColor: colores.nav },
  panelTitulo: { color: '#fff', fontSize: 18, fontWeight: '800' },
  cerrar: { color: '#fff', fontSize: 20 },
  etiqueta: { fontSize: 12, letterSpacing: 0.6, color: colores.textoSuave, fontWeight: '700', marginBottom: 8, marginTop: 6 }
});
