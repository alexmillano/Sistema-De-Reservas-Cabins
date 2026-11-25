import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './screens/Login';
import Registro from './screens/Registro';
import RecuperarClave from './screens/RecuperarClave';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Inicio from './screens/Inicio';
import Catalogo from './screens/Catalogo';
import DetalleCabana from './screens/DetalleCabana';
import Perfil from './screens/Perfil';
import Carrito from './screens/Carrito';
import Checkout from './screens/Checkout';
import MisReservas from './screens/MisReservas';
import Soporte from './screens/Soporte';
import ChatReclamo from './screens/ChatReclamo';
import MisCabanas from './screens/MisCabanas';
import FormularioCabana from './screens/FormularioCabana';
import GestionarReservas from './screens/GestionarReservas';
import ReclamosDueno from './screens/ReclamosDueno';
import CalificacionesDueno from './screens/CalificacionesDueno';
import OpinionesDueno from './screens/OpinionesDueno';
import Notificaciones from './screens/Notificaciones';
import Mas from './screens/Mas';
import FinanzasDueno from './screens/FinanzasDueno';
import Planes from './screens/Planes';
import api from './api/client';
import Pendiente from './screens/Pendiente';
import { colores } from './theme/colores';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const ICONOS = { Inicio: '🏠', Catalogo: '🔎', Reservas: '📅', Carrito: '🛒', Soporte: '💬', Perfil: '👤', Más: '☰', Cabañas: '🏡', Reclamos: '💬', Finanzas: '📊', Panel: '🛡️' };
const TITULOS = { Catalogo: 'Catálogo' };

const opcionesTab = ({ route }) => ({
  headerStyle: { backgroundColor: colores.nav },
  headerTintColor: '#fff',
  headerTitle: 'Cabins',
  headerTitleAlign: 'center',
  headerTitleStyle: { fontWeight: '800', fontSize: 20, letterSpacing: 0.5 },
  tabBarLabel: TITULOS[route.name] || route.name,
  tabBarHideOnKeyboard: true,
  tabBarActiveTintColor: colores.primario,
  tabBarLabelStyle: { fontSize: 11 },
  tabBarIcon: () => <Text style={{ fontSize: 18 }}>{ICONOS[route.name]}</Text>
});

const PerfilEnPila = () => <Perfil enStack />;
const PendSuper = () => <Pendiente titulo="Panel del superadmin" texto="Administradores, usuarios y finanzas de la plataforma llegan en un próximo lote." />;

// Panel del dueño de las cabañas
function PanelDueno() {
  const [noLeidas, setNoLeidas] = useState(0);

  // Cantidad de notificaciones sin leer, para el globito de la pestaña Más
  useEffect(() => {
    let activo = true;
    const pedir = () => api.get('/notificaciones', { params: { leida: 'false', limite: 1 } })
      .then(({ data }) => { if (activo) setNoLeidas(data.no_leidas || 0); }).catch(() => {});
    pedir();
    const t = setInterval(pedir, 30000);
    return () => { activo = false; clearInterval(t); };
  }, []);

  return (
    <Tabs.Navigator screenOptions={opcionesTab}>
      <Tabs.Screen name="Cabañas" component={MisCabanas} />
      <Tabs.Screen name="Reservas" component={GestionarReservas} />
      <Tabs.Screen name="Reclamos" component={ReclamosDueno} />
      <Tabs.Screen name="Finanzas" component={FinanzasDueno} />
      <Tabs.Screen name="Más" options={{ tabBarBadge: noLeidas > 0 ? noLeidas : undefined }}>
        {(props) => <Mas {...props} noLeidas={noLeidas} />}
      </Tabs.Screen>
    </Tabs.Navigator>
  );
}

// Panel del superadmin (solo consulta)
function PanelSuperadmin() {
  return (
    <Tabs.Navigator screenOptions={opcionesTab}>
      <Tabs.Screen name="Panel" component={PendSuper} />
      <Tabs.Screen name="Perfil" component={Perfil} />
    </Tabs.Navigator>
  );
}

function Principal() {
  return (
    <Tabs.Navigator
      screenOptions={opcionesTab}
    >
      <Tabs.Screen name="Inicio" component={Inicio} />
      <Tabs.Screen name="Catalogo" component={Catalogo} />
      <Tabs.Screen name="Reservas" component={MisReservas} />
      <Tabs.Screen name="Carrito" component={Carrito} />
      <Tabs.Screen name="Soporte" component={Soporte} />
      <Tabs.Screen name="Perfil" component={Perfil} />
    </Tabs.Navigator>
  );
}

function Rutas() {
  const { user, cargando } = useAuth();

  if (cargando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colores.fondo }}>
        <ActivityIndicator size="large" color={colores.primario} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: 'center', headerTintColor: colores.primarioOscuro, contentStyle: { backgroundColor: colores.fondo } }}>
      {user && user.rol === 'admin' ? (
        <>
          <Stack.Screen name="Principal" component={user.es_superadmin ? PanelSuperadmin : PanelDueno} options={{ headerShown: false }} />
          <Stack.Screen name="FormularioCabana" component={FormularioCabana}
            options={{ title: 'Cabaña', headerStyle: { backgroundColor: colores.nav }, headerTintColor: '#fff' }} />
          <Stack.Screen name="Planes" component={Planes} options={{ title: 'Planes', headerStyle: { backgroundColor: colores.nav }, headerTintColor: '#fff' }} />
          <Stack.Screen name="Notificaciones" component={Notificaciones} options={{ title: 'Notificaciones', headerStyle: { backgroundColor: colores.nav }, headerTintColor: '#fff' }} />
          <Stack.Screen name="Calificaciones" component={CalificacionesDueno} options={{ title: 'Calificaciones', headerStyle: { backgroundColor: colores.nav }, headerTintColor: '#fff' }} />
          <Stack.Screen name="Opiniones" component={OpinionesDueno} options={{ title: 'Opiniones', headerStyle: { backgroundColor: colores.nav }, headerTintColor: '#fff' }} />
          <Stack.Screen name="PerfilAdmin" component={PerfilEnPila} options={{ title: 'Mi perfil', headerStyle: { backgroundColor: colores.nav }, headerTintColor: '#fff' }} />
          <Stack.Screen name="ChatReclamo" component={ChatReclamo}
            options={({ route }) => ({ title: route.params?.asunto || 'Reclamo', headerStyle: { backgroundColor: colores.nav }, headerTintColor: '#fff' })} />
        </>
      ) : user ? (
        <>
          <Stack.Screen name="Principal" component={Principal} options={{ headerShown: false }} />
          <Stack.Screen name="ChatReclamo" component={ChatReclamo}
            options={({ route }) => ({ title: route.params?.asunto || 'Reclamo', headerStyle: { backgroundColor: colores.nav }, headerTintColor: '#fff' })} />
          <Stack.Screen name="Checkout" component={Checkout}
            options={{ title: 'Pago', headerStyle: { backgroundColor: colores.nav }, headerTintColor: '#fff' }} />
          <Stack.Screen name="DetalleCabana" component={DetalleCabana}
            options={{ title: 'Cabaña', headerStyle: { backgroundColor: colores.nav }, headerTintColor: '#fff' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
          <Stack.Screen name="Registro" component={Registro} options={{ title: 'Crear cuenta' }} />
          <Stack.Screen name="RecuperarClave" component={RecuperarClave} options={{ title: 'Recuperar contraseña' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
        <AuthProvider>
          <NavigationContainer>
            <Rutas />
            <StatusBar style="dark" />
          </NavigationContainer>
        </AuthProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
