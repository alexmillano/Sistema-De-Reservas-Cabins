import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { mensajeError } from '../api/client';
import { Aviso, Boton, Campo, Enlace } from '../components/Ui';
import { colores } from '../theme/colores';
import AvoidTeclado from '../components/AvoidTeclado';

export default function Login({ navigation, route }) {
  const { login, loginAdmin, aviso } = useAuth();
  const [modo, setModo] = useState('usuario');
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const exito = route.params?.registrado
    ? 'Cuenta creada. Ya podés iniciar sesión.'
    : route.params?.claveCambiada ? 'Contraseña actualizada. Iniciá sesión.' : '';

  const entrar = async () => {
    setError('');
    if (!identificador.trim() || !password) {
      setError('Usuario o email y contraseña son obligatorios');
      return;
    }
    setCargando(true);
    try {
      if (modo === 'admin') await loginAdmin(identificador.trim(), password);
      else await login(identificador.trim(), password);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <AvoidTeclado>
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <Text style={estilos.logo}>Cabins</Text>
        <Text style={estilos.sub}>Encontrá tu cabaña en toda Argentina</Text>

        <View style={estilos.pestanas}>
          {[['usuario', 'Usuario'], ['admin', 'Administrador']].map(([k, t]) => (
            <Pressable key={k} onPress={() => { setModo(k); setError(''); }} style={[estilos.pestana, modo === k && estilos.pestanaActiva]}>
              <Text style={[estilos.pestanaTexto, modo === k && { color: '#fff' }]}>{t}</Text>
            </Pressable>
          ))}
        </View>

        <Aviso tipo="exito" texto={exito} />
        <Aviso texto={error || aviso} />

        <Campo etiqueta="Usuario o email" value={identificador} onChangeText={setIdentificador}
          keyboardType="email-address" autoComplete="username" />
        <Campo etiqueta="Contraseña" value={password} onChangeText={setPassword}
          secureTextEntry autoComplete="password" />

        <Boton titulo="Iniciar sesión" onPress={entrar} cargando={cargando} />
        {modo === 'usuario' ? (
          <>
            <Enlace texto="¿Olvidaste tu contraseña?" onPress={() => navigation.navigate('RecuperarClave')} />
            <Enlace texto="¿No tenés cuenta? Registrate" onPress={() => navigation.navigate('Registro')} />
          </>
        ) : (
          <Text style={estilos.nota}>Las cuentas de administrador las crea el superadmin de Cabins.</Text>
        )}
      </ScrollView>
    </AvoidTeclado>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: 24, paddingTop: 72 },
  logo: { fontSize: 36, fontWeight: '800', color: colores.primario, textAlign: 'center' },
  sub: { color: colores.textoSuave, textAlign: 'center', marginBottom: 20, marginTop: 4 },
  pestanas: { flexDirection: 'row', backgroundColor: colores.chip, borderRadius: 12, padding: 4, marginBottom: 18 },
  pestana: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  pestanaActiva: { backgroundColor: colores.primario },
  pestanaTexto: { fontWeight: '700', color: colores.primario },
  nota: { color: colores.textoSuave, textAlign: 'center', marginTop: 14, fontSize: 13 }
});
