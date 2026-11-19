import { ActivityIndicator, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './screens/Login';
import Registro from './screens/Registro';
import RecuperarClave from './screens/RecuperarClave';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Inicio from './screens/Inicio';
import Catalogo from './screens/Catalogo';
import DetalleCabana from './screens/DetalleCabana';
import Perfil from './screens/Perfil';
import Proximamente from './screens/Proximamente';
import { colores } from './theme/colores';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

const ICONOS = { Inicio: '🏠', Catalogo: '🔎', Reservas: '📅', Carrito: '🛒', Soporte: '💬', Perfil: '👤' };
const TITULOS = { Catalogo: 'Catálogo' };

function Principal() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colores.nav },
        headerTintColor: '#fff',
        title: TITULOS[route.name] || route.name,
        tabBarActiveTintColor: colores.primario,
        tabBarLabelStyle: { fontSize: 11 },
        tabBarIcon: () => <Text style={{ fontSize: 18 }}>{ICONOS[route.name]}</Text>
      })}
    >
      <Tabs.Screen name="Inicio" component={Inicio} />
      <Tabs.Screen name="Catalogo" component={Catalogo} />
      <Tabs.Screen name="Reservas" component={Proximamente} />
      <Tabs.Screen name="Carrito" component={Proximamente} />
      <Tabs.Screen name="Soporte" component={Proximamente} />
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
    <Stack.Navigator screenOptions={{ headerTintColor: colores.primarioOscuro, contentStyle: { backgroundColor: colores.fondo } }}>
      {user ? (
        <>
          <Stack.Screen name="Principal" component={Principal} options={{ headerShown: false }} />
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
      <AuthProvider>
        <NavigationContainer>
          <Rutas />
          <StatusBar style="dark" />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
