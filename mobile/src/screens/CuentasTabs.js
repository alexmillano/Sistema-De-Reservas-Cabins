import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import CuentasSuper from './CuentasSuper';
import { colores } from '../theme/colores';

// Una sola pestaña para las cuentas, con un selector entre dueños y huéspedes
export default function CuentasTabs() {
  const [tipo, setTipo] = useState('admins');
  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <View style={estilos.selector}>
        {[['admins', 'Dueños'], ['usuarios', 'Huéspedes']].map(([k, t]) => (
          <Pressable key={k} onPress={() => setTipo(k)} style={[estilos.opcion, tipo === k && estilos.activa]}>
            <Text style={[estilos.texto, tipo === k && { color: '#fff' }]}>{t}</Text>
          </Pressable>
        ))}
      </View>
      <CuentasSuper key={tipo} tipo={tipo} />
    </View>
  );
}

const estilos = StyleSheet.create({
  selector: { flexDirection: 'row', margin: 12, marginBottom: 0, backgroundColor: colores.chip, borderRadius: 12, padding: 4 },
  opcion: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
  activa: { backgroundColor: colores.primario },
  texto: { color: colores.primario, fontWeight: '800' }
});
