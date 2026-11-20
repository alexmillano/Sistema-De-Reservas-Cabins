import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import api, { mensajeError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Aviso, Boton, Campo } from '../components/Ui';
import { colores } from '../theme/colores';
import { contarNoches, formatearFechaCorta } from '../utils/fechas';

const aFormulario = (p) => ({
  nombre: p.nombre, apellido: p.apellido, email: p.email, usuario: p.usuario,
  fecha_nacimiento: p.fecha_nacimiento ? String(p.fecha_nacimiento).slice(0, 10) : ''
});

export default function Perfil() {
  const { logout, actualizarUsuario } = useAuth();
  const [perfil, setPerfil] = useState(null);
  const [stats, setStats] = useState(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [pestana, setPestana] = useState('datos');
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState({ tipo: '', texto: '' });
  const [guardando, setGuardando] = useState(false);
  const [pass, setPass] = useState({ actual: '', nueva: '', repetir: '' });
  const [msgPass, setMsgPass] = useState({ tipo: '', texto: '' });
  const [cambiando, setCambiando] = useState(false);

  useEffect(() => {
    let activo = true;
    api.get('/perfil')
      .then(({ data }) => { if (activo) { setPerfil(data); setForm(aFormulario(data)); } })
      .catch((err) => activo && setErrorCarga(mensajeError(err)));
    api.get('/reservas/mis-reservas')
      .then(({ data }) => {
        if (!activo) return;
        const hechas = data.filter((r) => r.estado === 'completada');
        setStats({ estadias: hechas.length, noches: hechas.reduce((a, r) => a + contarNoches(r.fecha_checkin, r.fecha_checkout), 0) });
      })
      .catch(() => {});
    return () => { activo = false; };
  }, []);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const guardar = async () => {
    setMsg({ tipo: '', texto: '' });
    if (form.fecha_nacimiento && !/^\d{4}-\d{2}-\d{2}$/.test(form.fecha_nacimiento)) {
      return setMsg({ tipo: 'error', texto: 'La fecha de nacimiento debe tener el formato AAAA-MM-DD' });
    }
    setGuardando(true);
    try {
      const { data } = await api.put('/perfil', { ...form, fecha_nacimiento: form.fecha_nacimiento || null });
      setPerfil(data.perfil);
      setForm(aFormulario(data.perfil));
      await actualizarUsuario({ nombre: data.perfil.nombre, apellido: data.perfil.apellido, email: data.perfil.email, usuario: data.perfil.usuario });
      setMsg({ tipo: 'exito', texto: 'Datos actualizados correctamente.' });
    } catch (err) {
      setMsg({ tipo: 'error', texto: mensajeError(err) });
    } finally {
      setGuardando(false);
    }
  };

  const cambiarPassword = async () => {
    setMsgPass({ tipo: '', texto: '' });
    if (pass.nueva.length < 8) return setMsgPass({ tipo: 'error', texto: 'La contraseña nueva debe tener al menos 8 caracteres.' });
    if (pass.nueva !== pass.repetir) return setMsgPass({ tipo: 'error', texto: 'Las contraseñas nuevas no coinciden.' });
    setCambiando(true);
    try {
      await api.put('/perfil/password', { password_actual: pass.actual, password_nueva: pass.nueva });
      setPass({ actual: '', nueva: '', repetir: '' });
      setMsgPass({ tipo: 'exito', texto: 'Contraseña actualizada correctamente.' });
    } catch (err) {
      setMsgPass({ tipo: 'error', texto: mensajeError(err) });
    } finally {
      setCambiando(false);
    }
  };

  const cerrarSesion = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro que querés cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: logout }
    ]);
  };

  if (errorCarga) return <View style={{ padding: 20 }}><Aviso texto={errorCarga} /></View>;
  if (!perfil || !form) return <ActivityIndicator color={colores.primario} style={{ marginTop: 60 }} />;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colores.fondo }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={estilos.cabecera}>
          <View style={estilos.avatar}><Text style={estilos.avatarTexto}>{perfil.nombre[0]}{perfil.apellido[0]}</Text></View>
          <Text style={estilos.nombre}>{perfil.nombre} {perfil.apellido}</Text>
          <Text style={estilos.dato}>{perfil.email}</Text>
          <Text style={estilos.suave}>@{perfil.usuario} · Huésped</Text>
          <Text style={estilos.suave}>Miembro desde {formatearFechaCorta(String(perfil.created_at).slice(0, 10))}</Text>
          {stats && (
            <View style={estilos.stats}>
              <View style={estilos.stat}><Text style={estilos.statNum}>{stats.estadias}</Text><Text style={estilos.statEt}>ESTADÍAS</Text></View>
              <View style={estilos.stat}><Text style={estilos.statNum}>{stats.noches}</Text><Text style={estilos.statEt}>NOCHES</Text></View>
            </View>
          )}
        </View>

        <View style={estilos.pestanas}>
          {[['datos', 'Mis datos'], ['seguridad', 'Seguridad']].map(([k, t]) => (
            <Pressable key={k} onPress={() => setPestana(k)} style={[estilos.pestana, pestana === k && estilos.pestanaActiva]}>
              <Text style={[estilos.pestanaTexto, pestana === k && { color: '#fff' }]}>{t}</Text>
            </Pressable>
          ))}
        </View>

        {pestana === 'datos' && (
          <View style={estilos.tarjeta}>
            <Text style={estilos.subtitulo}>Información personal</Text>
            <Campo etiqueta="Nombre" value={form.nombre} onChangeText={set('nombre')} autoCapitalize="words" maxLength={100} />
            <Campo etiqueta="Apellido" value={form.apellido} onChangeText={set('apellido')} autoCapitalize="words" maxLength={100} />
            <Campo etiqueta="Correo electrónico" value={form.email} onChangeText={set('email')} keyboardType="email-address" maxLength={150} />
            <Campo etiqueta="Usuario" value={form.usuario} onChangeText={set('usuario')} maxLength={50} />
            <Campo etiqueta="Fecha de nacimiento (opcional, AAAA-MM-DD)" value={form.fecha_nacimiento} onChangeText={set('fecha_nacimiento')}
              placeholder="1999-05-21" keyboardType="numbers-and-punctuation" />
            <Aviso tipo={msg.tipo === 'exito' ? 'exito' : 'error'} texto={msg.texto} />
            <Boton titulo="Guardar cambios" onPress={guardar} cargando={guardando} />
          </View>
        )}

        {pestana === 'seguridad' && (
          <View style={estilos.tarjeta}>
            <Text style={estilos.subtitulo}>Cambiar contraseña</Text>
            <Campo etiqueta="Contraseña actual" value={pass.actual} onChangeText={(v) => setPass((p) => ({ ...p, actual: v }))} secureTextEntry />
            <Campo etiqueta="Contraseña nueva (mínimo 8 caracteres)" value={pass.nueva} onChangeText={(v) => setPass((p) => ({ ...p, nueva: v }))} secureTextEntry />
            <Campo etiqueta="Repetir contraseña nueva" value={pass.repetir} onChangeText={(v) => setPass((p) => ({ ...p, repetir: v }))} secureTextEntry />
            <Aviso tipo={msgPass.tipo === 'exito' ? 'exito' : 'error'} texto={msgPass.texto} />
            <Boton titulo="Actualizar contraseña" onPress={cambiarPassword} cargando={cambiando} />
          </View>
        )}

        <Pressable onPress={cerrarSesion} style={estilos.cerrar}><Text style={estilos.cerrarTexto}>⎋  Cerrar sesión</Text></Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  cabecera: { backgroundColor: colores.tarjeta, borderRadius: 16, borderWidth: 1, borderColor: colores.borde, padding: 18, alignItems: 'center', marginBottom: 14 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: colores.primario, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  avatarTexto: { color: '#fff', fontSize: 26, fontWeight: '800' },
  nombre: { fontSize: 22, fontWeight: '800', color: colores.texto },
  dato: { color: colores.texto, marginTop: 2 },
  suave: { color: colores.textoSuave, fontSize: 12, marginTop: 2 },
  stats: { flexDirection: 'row', gap: 12, marginTop: 14, backgroundColor: colores.chip, borderRadius: 12, padding: 12, alignSelf: 'stretch', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: colores.primario },
  statEt: { fontSize: 10, letterSpacing: 0.5, color: colores.textoSuave, fontWeight: '700' },
  pestanas: { flexDirection: 'row', backgroundColor: colores.chip, borderRadius: 24, padding: 4, marginBottom: 14 },
  pestana: { flex: 1, paddingVertical: 9, borderRadius: 20, alignItems: 'center' },
  pestanaActiva: { backgroundColor: colores.primario },
  pestanaTexto: { color: colores.primario, fontWeight: '700' },
  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: 16, borderWidth: 1, borderColor: colores.borde, padding: 16 },
  subtitulo: { fontSize: 18, fontWeight: '800', color: colores.texto, marginBottom: 12 },
  cerrar: { marginTop: 18, backgroundColor: colores.errorFondo, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cerrarTexto: { color: colores.error, fontWeight: '800', fontSize: 16 }
});
