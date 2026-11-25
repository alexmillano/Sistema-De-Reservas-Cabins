import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colores } from '../theme/colores';

export default function Mas({ navigation, noLeidas = 0 }) {
  const { user, logout } = useAuth();

  const opciones = [
    { icono: '🔔', titulo: 'Notificaciones', texto: 'Pagos, cancelaciones, reclamos y opiniones.', ir: 'Notificaciones', badge: noLeidas },
    { icono: '🏷️', titulo: 'Planes', texto: 'Destacá tus cabañas en el catálogo.', ir: 'Planes' },
    { icono: '⭐', titulo: 'Calificaciones', texto: 'Puntajes de tus cabañas.', ir: 'Calificaciones' },
    { icono: '📝', titulo: 'Opiniones', texto: 'Comentarios de los huéspedes.', ir: 'Opiniones' },
    { icono: '👤', titulo: 'Mi perfil', texto: 'Tus datos y contraseña.', ir: 'PerfilAdmin' }
  ];

  const cerrarSesion = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro que querés cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: logout }
    ]);
  };

  return (
    <ScrollView style={{ backgroundColor: colores.fondo }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Text style={estilos.hola}>Hola, {user.nombre} 👋</Text>
      <Text style={estilos.suave}>Panel del dueño</Text>
      {opciones.map((o) => (
        <Pressable key={o.ir} onPress={() => navigation.navigate(o.ir)} style={({ pressed }) => [estilos.item, pressed && { opacity: 0.8 }]}>
          <Text style={estilos.icono}>{o.icono}</Text>
          <View style={{ flex: 1 }}>
            <Text style={estilos.titulo}>{o.titulo}</Text>
            <Text style={estilos.suave}>{o.texto}</Text>
          </View>
          {o.badge > 0 && <View style={estilos.badge}><Text style={estilos.badgeTexto}>{o.badge}</Text></View>}
          <Text style={estilos.flecha}>›</Text>
        </Pressable>
      ))}
      <Pressable onPress={cerrarSesion} style={estilos.cerrar}><Text style={estilos.cerrarTexto}>⎋  Cerrar sesión</Text></Pressable>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  hola: { fontSize: 22, fontWeight: '800', color: colores.primario },
  suave: { color: colores.textoSuave, fontSize: 13 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colores.tarjeta, borderRadius: 14, borderWidth: 1, borderColor: colores.borde, padding: 14, marginTop: 12 },
  icono: { fontSize: 26 },
  titulo: { fontSize: 16, fontWeight: '800', color: colores.texto },
  flecha: { fontSize: 24, color: colores.textoSuave },
  badge: { backgroundColor: colores.error, borderRadius: 11, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeTexto: { color: '#fff', fontWeight: '800', fontSize: 12 },
  cerrar: { marginTop: 24, borderWidth: 1, borderColor: colores.error, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  cerrarTexto: { color: colores.error, fontWeight: '800' }
});
