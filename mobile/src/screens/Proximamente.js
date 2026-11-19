import { StyleSheet, Text, View } from 'react-native';
import { colores } from '../theme/colores';

export default function Proximamente({ route }) {
  return (
    <View style={estilos.caja}>
      <Text style={estilos.titulo}>{route.name}</Text>
      <Text style={estilos.texto}>Esta pantalla llega en los próximos lotes 🚧</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.fondo },
  titulo: { fontSize: 22, fontWeight: '800', color: colores.primario },
  texto: { color: colores.textoSuave, marginTop: 6 }
});
