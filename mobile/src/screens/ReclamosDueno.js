import { useCallback, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, { mensajeError } from '../api/client';
import { Aviso } from '../components/Ui';
import { colores } from '../theme/colores';
import { formatearFechaCorta } from '../utils/fechas';

const FILTROS = [['', 'Todos'], ['nuevo', 'Nuevos'], ['en_proceso', 'En proceso'], ['finalizado', 'Finalizados']];
const ETIQUETA = { nuevo: 'Nuevo', en_proceso: 'En proceso', finalizado: 'Finalizado' };
const COLOR = { nuevo: '#b3261e', en_proceso: '#AF8606', finalizado: '#6f6558' };

export default function ReclamosDueno({ navigation }) {
  const [filtro, setFiltro] = useState('');
  const [lista, setLista] = useState({ cargando: true, error: '', reclamos: [] });

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get('/reclamos');
      setLista({ cargando: false, error: '', reclamos: Array.isArray(data) ? data : [] });
    } catch (err) {
      setLista({ cargando: false, error: mensajeError(err), reclamos: [] });
    }
  }, []);

  // Se recarga al volver a la pestaña y cada 15 segundos mientras está a la vista
  useFocusEffect(useCallback(() => {
    cargar();
    const t = setInterval(() => { if (AppState.currentState === 'active') cargar(); }, 15000);
    return () => clearInterval(t);
  }, [cargar]));

  const { cargando, error, reclamos } = lista;
  const visibles = reclamos.filter((r) => !filtro || r.estado === filtro);
  const cuenta = (k) => reclamos.filter((r) => !k || r.estado === k).length;

  return (
    <ScrollView style={{ backgroundColor: colores.fondo }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} />}>
      <Text style={estilos.titulo}>Reclamos</Text>
      <Text style={estilos.suave}>Chats con los huéspedes de tus cabañas.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginVertical: 12 }}>
        {FILTROS.map(([k, t]) => (
          <Pressable key={k || 'todos'} onPress={() => setFiltro(k)} style={[estilos.chip, filtro === k && estilos.chipActivo]}>
            <Text style={[estilos.chipTexto, filtro === k && { color: '#fff' }]}>{t} ({cuenta(k)})</Text>
          </Pressable>
        ))}
      </ScrollView>

      {cargando && <ActivityIndicator color={colores.primario} style={{ marginTop: 20 }} />}
      <Aviso texto={error} />
      {!cargando && !error && visibles.length === 0 && (
        <View style={estilos.vacio}><Text style={estilos.suave}>No hay reclamos en esta sección.</Text></View>
      )}
      {visibles.map((r) => (
        <Pressable key={r.id} style={estilos.reclamo} onPress={() => navigation.navigate('ChatReclamo', { id: r.id, asunto: r.asunto })}>
          <View style={estilos.fila}>
            <Text style={estilos.asunto} numberOfLines={1}>{r.asunto}</Text>
            {Number(r.no_leidos) > 0 && <View style={estilos.badge}><Text style={estilos.badgeTexto}>{r.no_leidos}</Text></View>}
          </View>
          <Text style={estilos.huesped}>{r.usuario_nombre} {r.usuario_apellido}</Text>
          <Text style={estilos.suave}>
            {r.cabana_nombre ? `${r.cabana_nombre} · Reserva #${r.reserva_id}` : 'Sin reserva asociada'}
            {r.fecha_checkin ? ` (${formatearFechaCorta(r.fecha_checkin)} al ${formatearFechaCorta(r.fecha_checkout)})` : ''}
          </Text>
          {r.ultimo_mensaje ? <Text style={estilos.ultimo} numberOfLines={1}>{r.ultimo_mensaje}</Text> : null}
          <View style={[estilos.estado, { backgroundColor: COLOR[r.estado] }]}><Text style={estilos.estadoTexto}>{ETIQUETA[r.estado]}</Text></View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: 24, fontWeight: '800', color: colores.primario },
  suave: { color: colores.textoSuave, fontSize: 13 },
  chip: { backgroundColor: colores.chip, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  chipActivo: { backgroundColor: colores.primario },
  chipTexto: { color: colores.primario, fontWeight: '700', fontSize: 13 },
  vacio: { backgroundColor: colores.tarjeta, borderRadius: 14, borderWidth: 1, borderColor: colores.borde, padding: 24, alignItems: 'center' },
  reclamo: { backgroundColor: colores.tarjeta, borderRadius: 14, borderWidth: 1, borderColor: colores.borde, padding: 14, marginBottom: 12, gap: 3 },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  asunto: { flex: 1, fontSize: 16, fontWeight: '800', color: colores.texto },
  huesped: { color: colores.nav, fontWeight: '700', fontSize: 13 },
  ultimo: { color: colores.texto, fontSize: 13, marginTop: 2 },
  badge: { backgroundColor: colores.error, borderRadius: 11, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeTexto: { color: '#fff', fontWeight: '800', fontSize: 12 },
  estado: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3, marginTop: 6 },
  estadoTexto: { color: '#fff', fontWeight: '800', fontSize: 11 }
});
