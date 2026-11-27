import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, { mensajeError } from '../api/client';
import { Aviso, Boton } from '../components/Ui';
import { colores } from '../theme/colores';

const ICONO = { pago_aprobado: '💳', cancelacion: '❌', reclamo: '💬', opinion: '⭐', checkout: '🚪', plan: '🏷️', revision: '📝', revision_pendiente: '🕵️' };

// Hora de Argentina sin depender de Intl
const fecha = (iso) => {
  const d = new Date(new Date(iso).getTime() - 3 * 3600 * 1000);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
};

export default function Notificaciones() {
  const [datos, setDatos] = useState({ cargando: true, error: '', noLeidas: 0, lista: [] });
  const [marcando, setMarcando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get('/notificaciones');
      setDatos({ cargando: false, error: '', noLeidas: data.no_leidas, lista: data.notificaciones });
    } catch (err) {
      setDatos((d) => ({ ...d, cargando: false, error: mensajeError(err) }));
    }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const leer = async (n) => {
    if (n.leida) return;
    setDatos((d) => ({ ...d, noLeidas: Math.max(0, d.noLeidas - 1), lista: d.lista.map((x) => (x.id === n.id ? { ...x, leida: true } : x)) }));
    try { await api.put(`/notificaciones/${n.id}/leer`); } catch { cargar(); }
  };

  const leerTodas = async () => {
    setMarcando(true);
    try { await api.put('/notificaciones/leer-todas'); await cargar(); } catch (err) { setDatos((d) => ({ ...d, error: mensajeError(err) })); } finally { setMarcando(false); }
  };

  const { cargando, error, noLeidas, lista } = datos;

  return (
    <ScrollView style={{ backgroundColor: colores.fondo }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} />}>
      <Text style={estilos.suave}>{noLeidas > 0 ? `Tenés ${noLeidas} sin leer.` : 'Estás al día.'}</Text>
      {noLeidas > 0 && <View style={{ marginTop: 8 }}><Boton titulo="Marcar todas como leídas" onPress={leerTodas} cargando={marcando} secundario /></View>}
      <Aviso texto={error} />
      {cargando && <ActivityIndicator color={colores.primario} style={{ marginVertical: 20 }} />}
      {!cargando && !error && lista.length === 0 && (
        <View style={estilos.vacio}><Text style={estilos.suave}>No tenés notificaciones.</Text></View>
      )}
      {lista.map((n) => (
        <Pressable key={n.id} onPress={() => leer(n)} style={[estilos.item, !n.leida && estilos.sinLeer]}>
          <Text style={estilos.icono}>{ICONO[n.tipo] || '🔔'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[estilos.mensaje, !n.leida && { fontWeight: '800' }]}>{n.mensaje}</Text>
            <Text style={estilos.suave}>{fecha(n.created_at)}{n.reserva_id ? ` · Reserva #${n.reserva_id}` : ''}</Text>
          </View>
          {!n.leida && <View style={estilos.punto} />}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  suave: { color: colores.textoSuave, fontSize: 12.5 },
  vacio: { backgroundColor: colores.tarjeta, borderRadius: 14, borderWidth: 1, borderColor: colores.borde, padding: 24, alignItems: 'center', marginTop: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colores.tarjeta, borderRadius: 12, borderWidth: 1, borderColor: colores.borde, padding: 12, marginTop: 10 },
  sinLeer: { backgroundColor: colores.chip, borderColor: colores.dorado },
  icono: { fontSize: 24 },
  mensaje: { color: colores.texto, fontSize: 14, lineHeight: 20 },
  punto: { width: 10, height: 10, borderRadius: 5, backgroundColor: colores.error }
});
