import { useState } from 'react';
import { FlatList, Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colores } from '../theme/colores';

// Fotos de la cabaña: se deslizan de costado, con un contador
export default function GaleriaDetalle({ fotos }) {
  const { width } = useWindowDimensions();
  const [actual, setActual] = useState(0);

  if (!fotos.length) {
    return <View style={[estilos.foto, estilos.sin, { width }]}><Text style={{ color: colores.textoSuave }}>Sin imagen</Text></View>;
  }
  return (
    <View>
      <FlatList
        data={fotos} keyExtractor={(u) => u} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setActual(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => <Image source={{ uri: item }} style={[estilos.foto, { width }]} />}
      />
      {fotos.length > 1 && <View style={estilos.contador}><Text style={estilos.contadorTexto}>{actual + 1} / {fotos.length}</Text></View>}
    </View>
  );
}

const estilos = StyleSheet.create({
  foto: { height: 240 },
  sin: { backgroundColor: colores.chip, alignItems: 'center', justifyContent: 'center' },
  contador: { position: 'absolute', right: 12, bottom: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  contadorTexto: { color: '#fff', fontSize: 12, fontWeight: '700' }
});
