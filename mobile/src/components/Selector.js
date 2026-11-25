import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Hoja from './Hoja';
import { colores } from '../theme/colores';

const normalizar = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Campo que abre una ventana con opciones (y buscador) para elegir una
export default function Selector({ etiqueta, valor, opciones, onElegir, placeholder = 'Elegí una opción', deshabilitado }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const elegida = opciones.find((o) => String(o.id) === String(valor));
  const termino = normalizar(busqueda);
  const visibles = opciones.filter((o) => !termino || normalizar(o.nombre).includes(termino)).slice(0, 120);

  return (
    <View style={estilos.campo}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <Pressable onPress={() => !deshabilitado && setAbierto(true)} style={[estilos.input, deshabilitado && { opacity: 0.5 }]}>
        <Text style={[estilos.valor, !elegida && { color: colores.textoSuave }]} numberOfLines={1}>{elegida ? elegida.nombre : placeholder}</Text>
        <Text style={{ color: colores.primario }}>▾</Text>
      </Pressable>
      <Hoja visible={abierto} titulo={etiqueta} onCerrar={() => { setAbierto(false); setBusqueda(''); }}>
        <TextInput style={estilos.buscador} value={busqueda} onChangeText={setBusqueda} placeholder="Buscar..."
          placeholderTextColor={colores.textoSuave} autoCapitalize="none" />
        {visibles.length === 0 && <Text style={{ color: colores.textoSuave }}>No hay resultados.</Text>}
        {visibles.map((o) => (
          <Pressable key={o.id} onPress={() => { onElegir(o.id); setAbierto(false); setBusqueda(''); }}
            style={[estilos.opcion, String(o.id) === String(valor) && { backgroundColor: colores.chip }]}>
            <Text style={estilos.opcionTexto}>{o.nombre}</Text>
          </Pressable>
        ))}
        {opciones.length > visibles.length && !termino && <Text style={estilos.nota}>Escribí para buscar entre las {opciones.length} opciones.</Text>}
      </Hoja>
    </View>
  );
}

const estilos = StyleSheet.create({
  campo: { marginBottom: 14 },
  etiqueta: { color: colores.texto, fontWeight: '600', marginBottom: 6 },
  input: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colores.tarjeta, borderWidth: 1, borderColor: colores.borde, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 13 },
  valor: { flex: 1, fontSize: 16, color: colores.texto },
  buscador: { backgroundColor: colores.tarjeta, borderWidth: 1, borderColor: colores.borde, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colores.texto, marginBottom: 10 },
  opcion: { paddingVertical: 12, paddingHorizontal: 10, borderRadius: 8 },
  opcionTexto: { fontSize: 16, color: colores.texto },
  nota: { color: colores.textoSuave, marginTop: 8, textAlign: 'center', fontSize: 12 }
});
