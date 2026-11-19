import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import api, { mensajeError } from '../api/client';
import { Aviso, Boton, Campo, Enlace } from '../components/Ui';
import { colores } from '../theme/colores';

const VACIO = { nombre: '', apellido: '', email: '', usuario: '', password: '', confirmar: '', fecha_nacimiento: '' };

export default function Registro({ navigation }) {
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const enviar = async () => {
    setError('');
    const { nombre, apellido, email, usuario, password, confirmar, fecha_nacimiento } = form;
    if (!nombre.trim() || !apellido.trim() || !email.trim() || !usuario.trim() || !password) {
      setError('Nombre, apellido, email, usuario y contraseña son obligatorios');
      return;
    }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }
    if (password !== confirmar) { setError('Las contraseñas no coinciden'); return; }
    if (fecha_nacimiento && !/^\d{4}-\d{2}-\d{2}$/.test(fecha_nacimiento)) {
      setError('La fecha de nacimiento debe tener el formato AAAA-MM-DD');
      return;
    }
    setCargando(true);
    try {
      await api.post('/auth/register', {
        nombre: nombre.trim(), apellido: apellido.trim(), email: email.trim(),
        usuario: usuario.trim(), password, fecha_nacimiento: fecha_nacimiento || undefined
      });
      navigation.navigate('Login', { registrado: true });
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colores.fondo }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <Aviso texto={error} />
        <Campo etiqueta="Nombre" value={form.nombre} onChangeText={set('nombre')} autoCapitalize="words" />
        <Campo etiqueta="Apellido" value={form.apellido} onChangeText={set('apellido')} autoCapitalize="words" />
        <Campo etiqueta="Email" value={form.email} onChangeText={set('email')} keyboardType="email-address" />
        <Campo etiqueta="Usuario" value={form.usuario} onChangeText={set('usuario')} />
        <Campo etiqueta="Fecha de nacimiento (opcional, AAAA-MM-DD)" value={form.fecha_nacimiento}
          onChangeText={set('fecha_nacimiento')} placeholder="1999-05-21" keyboardType="numbers-and-punctuation" />
        <Campo etiqueta="Contraseña (mínimo 8 caracteres)" value={form.password} onChangeText={set('password')} secureTextEntry />
        <Campo etiqueta="Repetir contraseña" value={form.confirmar} onChangeText={set('confirmar')} secureTextEntry />
        <Boton titulo="Crear cuenta" onPress={enviar} cargando={cargando} />
        <Enlace texto="Ya tengo cuenta" onPress={() => navigation.navigate('Login')} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({ contenido: { padding: 24 } });
