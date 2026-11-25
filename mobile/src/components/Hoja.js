import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colores } from '../theme/colores';

// Ventana que sube desde abajo, con título y contenido que se puede desplazar
export default function Hoja({ visible, titulo, onCerrar, children }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <KeyboardAvoidingView style={estilos.fondo} behavior="padding">
        <Pressable style={{ flex: 1 }} onPress={onCerrar} />
        <View style={[estilos.hoja, { paddingBottom: 16 + insets.bottom }]}>
          <View style={estilos.cab}>
            <Text style={estilos.titulo} numberOfLines={2}>{titulo}</Text>
            <Pressable onPress={onCerrar} hitSlop={10}><Text style={estilos.cerrar}>✕</Text></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 12 }}>{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  hoja: { backgroundColor: colores.fondo, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '88%' },
  cab: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10 },
  titulo: { flex: 1, fontSize: 18, fontWeight: '800', color: colores.primario },
  cerrar: { fontSize: 20, color: colores.textoSuave }
});
