import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Boton } from '../components/Ui';
import { colores } from '../theme/colores';

// Provisorio: el perfil completo llega en un próximo lote
export default function Perfil() {
  const { user, logout } = useAuth();
  return (
    <View style={estilos.caja}>
      <Text style={estilos.nombre}>{user.nombre} {user.apellido}</Text>
      <Text style={estilos.dato}>@{user.usuario}</Text>
      <Text style={estilos.dato}>{user.email}</Text>
      <View style={{ marginTop: 24 }}><Boton titulo="Cerrar sesión" onPress={logout} secundario /></View>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { flex: 1, padding: 24, backgroundColor: colores.fondo },
  nombre: { fontSize: 24, fontWeight: '800', color: colores.texto },
  dato: { color: colores.textoSuave, marginTop: 4 }
});
