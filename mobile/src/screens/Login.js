import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { mensajeError } from '../api/client';
import { Aviso, Boton, Campo, Enlace } from '../components/Ui';
import { colores } from '../theme/colores';

export default function Login({ navigation, route }) {
  const { login, aviso } = useAuth();
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
      await login(identificador.trim(), password);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colores.fondo }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <Text style={estilos.logo}>Cabins</Text>
        <Text style={estilos.sub}>Encontrá tu cabaña en toda Argentina</Text>

        <Aviso tipo="exito" texto={exito} />
        <Aviso texto={error || aviso} />

        <Campo etiqueta="Usuario o email" value={identificador} onChangeText={setIdentificador}
          keyboardType="email-address" autoComplete="username" />
        <Campo etiqueta="Contraseña" value={password} onChangeText={setPassword}
          secureTextEntry autoComplete="password" />

        <Boton titulo="Iniciar sesión" onPress={entrar} cargando={cargando} />
        <Enlace texto="¿Olvidaste tu contraseña?" onPress={() => navigation.navigate('RecuperarClave')} />
        <Enlace texto="¿No tenés cuenta? Registrate" onPress={() => navigation.navigate('Registro')} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: 24, paddingTop: 72 },
  logo: { fontSize: 36, fontWeight: '800', color: colores.primario, textAlign: 'center' },
  sub: { color: colores.textoSuave, textAlign: 'center', marginBottom: 28, marginTop: 4 }
});
