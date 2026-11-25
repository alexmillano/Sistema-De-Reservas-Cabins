import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import api, { mensajeError } from '../api/client';
import { Aviso, Boton, Campo, Enlace } from '../components/Ui';
import { colores } from '../theme/colores';
import AvoidTeclado from '../components/AvoidTeclado';

export default function RecuperarClave({ navigation }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [cargando, setCargando] = useState(false);

  const enviar = async () => {
    setError(''); setOk('');
    if (!email.trim()) { setError('Ingresá tu email'); return; }
    setCargando(true);
    try {
      const { data } = await api.post('/auth/olvide-clave', { email: email.trim() });
      setOk(data.message || 'Te enviamos un enlace para restablecer tu contraseña.');
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <AvoidTeclado><ScrollView style={{ backgroundColor: colores.fondo }} contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
      <Text style={estilos.texto}>
        Ingresá el email de tu cuenta y te mandamos un enlace para crear una contraseña nueva. El enlace se abre en el navegador.
      </Text>
      <Aviso texto={error} />
      <Aviso tipo="exito" texto={ok} />
      <Campo etiqueta="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <Boton titulo="Enviar enlace" onPress={enviar} cargando={cargando} />
      <Enlace texto="Volver a iniciar sesión" onPress={() => navigation.navigate('Login')} />
    </ScrollView></AvoidTeclado>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: 24 },
  texto: { color: colores.textoSuave, marginBottom: 18, lineHeight: 20 }
});
