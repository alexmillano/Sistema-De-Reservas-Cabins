import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import api, { mensajeError } from '../api/client';
import { Aviso, Boton, Campo, Enlace } from '../components/Ui';
import { colores } from '../theme/colores';
import AvoidTeclado from '../components/AvoidTeclado';
import { esMayorDeEdad } from '../utils/fechas';

const VACIO = { nombre: '', apellido: '', dni: '', email: '', usuario: '', password: '', confirmar: '', fecha_nacimiento: '' };

export default function Registro({ navigation }) {
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const enviar = async () => {
    setError('');
    const { nombre, apellido, dni, email, usuario, password, confirmar, fecha_nacimiento } = form;
    if (!nombre.trim() || !apellido.trim() || !email.trim() || !usuario.trim() || !password) {
      setError('Nombre, apellido, email, usuario y contraseña son obligatorios');
      return;
    }
    if (!/^[0-9]{7,8}$/.test(dni)) { setError('El DNI debe tener 7 u 8 números, sin puntos'); return; }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }
    if (password !== confirmar) { setError('Las contraseñas no coinciden'); return; }
    if (!esMayorDeEdad(fecha_nacimiento)) {
      setError('Ingresá tu fecha de nacimiento (AAAA-MM-DD). Tenés que ser mayor de 18 años');
      return;
    }
    setCargando(true);
    try {
      await api.post('/auth/register', {
        nombre: nombre.trim(), apellido: apellido.trim(), dni, email: email.trim(),
        usuario: usuario.trim(), password, fecha_nacimiento
      });
      navigation.navigate('Login', { registrado: true });
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <AvoidTeclado>
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <Aviso texto={error} />
        <Campo etiqueta="Nombre" value={form.nombre} onChangeText={set('nombre')} autoCapitalize="words" />
        <Campo etiqueta="Apellido" value={form.apellido} onChangeText={set('apellido')} autoCapitalize="words" />
        <Campo etiqueta="DNI (solo números)" value={form.dni} onChangeText={(v) => set('dni')(v.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={8} />
        <Campo etiqueta="Email" value={form.email} onChangeText={set('email')} keyboardType="email-address" />
        <Campo etiqueta="Usuario" value={form.usuario} onChangeText={set('usuario')} />
        <Campo etiqueta="Fecha de nacimiento (AAAA-MM-DD, mayor de 18)" value={form.fecha_nacimiento}
          onChangeText={set('fecha_nacimiento')} placeholder="1999-05-21" keyboardType="numbers-and-punctuation" />
        <Campo etiqueta="Contraseña (mínimo 8 caracteres)" value={form.password} onChangeText={set('password')} secureTextEntry />
        <Campo etiqueta="Repetir contraseña" value={form.confirmar} onChangeText={set('confirmar')} secureTextEntry />
        <Boton titulo="Crear cuenta" onPress={enviar} cargando={cargando} />
        <Enlace texto="Ya tengo cuenta" onPress={() => navigation.navigate('Login')} />
      </ScrollView>
    </AvoidTeclado>
  );
}

const estilos = StyleSheet.create({ contenido: { padding: 24 } });
