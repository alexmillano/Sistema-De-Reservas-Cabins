import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import api, { mensajeError } from '../api/client';
import { Aviso, Boton } from '../components/Ui';
import { colores } from '../theme/colores';

const LIMITE = 20;

// Lista de dueños (tipo="admins") o de huéspedes (tipo="usuarios") con suspender y reactivar
export default function CuentasSuper({ tipo }) {
  const esAdmins = tipo === 'admins';
  const [lista, setLista] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [buscar, setBuscar] = useState('');
  const [consulta, setConsulta] = useState('');
  const [estado, setEstado] = useState('');
  const [cargando, setCargando] = useState(true);
  const [masCargando, setMasCargando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(async (pag) => {
    if (pag === 1) setError('');
    try {
      const { data } = await api.get(`/${tipo}`, {
        params: esAdmins ? {} : { buscar: consulta || undefined, baneado: estado || undefined, pagina: pag, limite: LIMITE }
      });
      if (esAdmins) {
        setLista(data); setTotal(data.length);
      } else {
        setTotal(data.total); setPagina(pag);
        setLista((prev) => (pag === 1 ? data.usuarios : [...prev, ...data.usuarios]));
      }
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false); setMasCargando(false);
    }
  }, [tipo, esAdmins, consulta, estado]);

  useEffect(() => { setCargando(true); cargar(1); }, [cargar]);

  const cambiarEstado = (c) => {
    const suspender = !c.baneado;
    Alert.alert(
      suspender ? 'Suspender cuenta' : 'Reactivar cuenta',
      suspender
        ? `${c.nombre} ${c.apellido} no va a poder iniciar sesión hasta que la reactives. ¿Confirmás?`
        : `${c.nombre} ${c.apellido} va a poder volver a ingresar. ¿Confirmás?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', style: suspender ? 'destructive' : 'default', onPress: async () => {
          setError(''); setAviso('');
          try {
            const { data } = await api.put(`/${tipo}/${c.id}/${suspender ? 'banear' : 'desbanear'}`);
            setAviso(data.message || 'Listo');
            await cargar(1);
          } catch (err) {
            setError(mensajeError(err));
          }
        } }
      ]
    );
  };

  const FILTROS = [['', 'Todos'], ['false', 'Activos'], ['true', 'Suspendidos']];

  return (
    <ScrollView style={{ backgroundColor: colores.fondo }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={false} onRefresh={() => cargar(1)} />}>
      <Text style={estilos.titulo}>{esAdmins ? 'Dueños de cabañas' : 'Huéspedes'}</Text>
      <Text style={estilos.suave}>{total} {esAdmins ? 'cuentas' : 'usuarios'}</Text>

      {!esAdmins && (
        <>
          <TextInput style={estilos.buscar} value={buscar} onChangeText={setBuscar} placeholder="Buscar por nombre, usuario o email"
            placeholderTextColor={colores.textoSuave} autoCapitalize="none" returnKeyType="search" onSubmitEditing={() => setConsulta(buscar.trim())} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
            {FILTROS.map(([k, t]) => (
              <Pressable key={k || 'todos'} onPress={() => setEstado(k)} style={[estilos.chip, estado === k && estilos.chipActivo]}>
                <Text style={[estilos.chipTexto, estado === k && { color: '#fff' }]}>{t}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}

      <Aviso texto={error} />
      {!!aviso && <Text style={estilos.ok}>✓ {aviso}</Text>}
      {cargando && <ActivityIndicator color={colores.primario} style={{ marginVertical: 20 }} />}
      {!cargando && !error && lista.length === 0 && <View style={estilos.vacio}><Text style={estilos.suave}>No hay resultados.</Text></View>}

      {lista.map((c) => (
        <View key={c.id} style={estilos.item}>
          <View style={estilos.fila}>
            <Text style={estilos.nombre}>{c.nombre} {c.apellido}</Text>
            <View style={[estilos.estado, { backgroundColor: c.baneado ? colores.error : '#2e7d32' }]}>
              <Text style={estilos.estadoTexto}>{c.baneado ? 'Suspendido' : 'Activo'}</Text>
            </View>
          </View>
          <Text style={estilos.suave}>@{c.usuario} · {c.email}</Text>
          {c.es_superadmin ? <Text style={estilos.super}>🛡️ Superadmin</Text> : null}
          {c.baneado && c.motivo_baneo ? <Text style={estilos.motivo}>Motivo: {c.motivo_baneo}</Text> : null}
          {!c.es_superadmin && (
            <View style={{ marginTop: 8 }}>
              <Boton titulo={c.baneado ? 'Reactivar' : 'Suspender'} secundario onPress={() => cambiarEstado(c)} />
            </View>
          )}
        </View>
      ))}
      {!esAdmins && !cargando && lista.length < total && (
        <Boton titulo={`Ver más (${lista.length} de ${total})`} cargando={masCargando} secundario
          onPress={() => { setMasCargando(true); cargar(pagina + 1); }} />
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: 22, fontWeight: '800', color: colores.primario },
  suave: { color: colores.textoSuave, fontSize: 13 },
  buscar: { marginTop: 10, marginBottom: 10, backgroundColor: colores.tarjeta, borderWidth: 1, borderColor: colores.borde, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: colores.texto },
  chip: { backgroundColor: colores.chip, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  chipActivo: { backgroundColor: colores.primario },
  chipTexto: { color: colores.primario, fontWeight: '700', fontSize: 13 },
  ok: { backgroundColor: '#e6f4ea', color: '#1e6b32', padding: 10, borderRadius: 10, marginBottom: 10, fontWeight: '700' },
  vacio: { backgroundColor: colores.tarjeta, borderRadius: 14, borderWidth: 1, borderColor: colores.borde, padding: 24, alignItems: 'center' },
  item: { backgroundColor: colores.tarjeta, borderRadius: 12, borderWidth: 1, borderColor: colores.borde, padding: 12, marginTop: 10, gap: 2 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  nombre: { flex: 1, fontWeight: '800', color: colores.texto, fontSize: 15 },
  estado: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  estadoTexto: { color: '#fff', fontWeight: '800', fontSize: 11 },
  super: { color: colores.nav, fontWeight: '700', fontSize: 12.5 },
  motivo: { color: colores.error, fontSize: 12.5 }
});
