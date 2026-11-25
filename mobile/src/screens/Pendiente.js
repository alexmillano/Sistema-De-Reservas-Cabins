import { StyleSheet, Text, View } from 'react-native';
import { colores } from '../theme/colores';

// Pantalla provisoria de las secciones que llegan en los próximos lotes
export default function Pendiente({ titulo, texto }) {
  return (
    <View style={estilos.caja}>
      <Text style={estilos.icono}>🛠️</Text>
      <Text style={estilos.titulo}>{titulo}</Text>
      <Text style={estilos.texto}>{texto || 'Esta sección llega en el próximo lote de la app.'}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colores.fondo },
  icono: { fontSize: 40, marginBottom: 10 },
  titulo: { fontSize: 20, fontWeight: '800', color: colores.primario, textAlign: 'center' },
  texto: { color: colores.textoSuave, textAlign: 'center', marginTop: 8 }
});
