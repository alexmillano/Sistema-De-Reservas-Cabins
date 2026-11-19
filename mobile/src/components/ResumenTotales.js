import { StyleSheet, Text, View } from 'react-native';
import { colores } from '../theme/colores';
import { formatearPrecio } from '../utils/formato';

// Subtotal de alojamiento, tarifa de servicio (línea aparte) y total
export default function ResumenTotales({ subtotal, tarifa, pct, total, etiquetaTotal = 'Total a pagar' }) {
  return (
    <View style={estilos.caja}>
      <View style={estilos.linea}><Text style={estilos.texto}>Subtotal alojamiento</Text><Text style={estilos.monto}>{formatearPrecio(subtotal)}</Text></View>
      <View style={estilos.linea}><Text style={estilos.texto}>Tarifa de servicio ({pct}%)</Text><Text style={estilos.monto}>{formatearPrecio(tarifa)}</Text></View>
      <View style={[estilos.linea, estilos.total]}>
        <Text style={estilos.totalTexto}>{etiquetaTotal}</Text>
        <Text style={estilos.totalMonto}>{formatearPrecio(total)}</Text>
      </View>
      <Text style={estilos.ars}>ARS · Moneda nacional</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { backgroundColor: colores.chip, borderRadius: 14, padding: 14, marginVertical: 12 },
  linea: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  texto: { color: colores.texto },
  monto: { color: colores.texto, fontWeight: '600' },
  total: { borderTopWidth: 1, borderTopColor: colores.borde, marginTop: 8, paddingTop: 10, alignItems: 'center' },
  totalTexto: { fontWeight: '800', color: colores.texto, fontSize: 16 },
  totalMonto: { fontWeight: '800', color: colores.primario, fontSize: 24 },
  ars: { textAlign: 'right', color: colores.textoSuave, fontSize: 11, marginTop: 2 }
});
