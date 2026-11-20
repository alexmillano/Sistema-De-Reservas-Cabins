import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import api, { mensajeError } from '../api/client';
import { Aviso } from '../components/Ui';
import { colores } from '../theme/colores';
import { formatearFechaCorta } from '../utils/fechas';

const INTERVALO_MS = 4000;
const ETIQUETA = { nuevo: 'Nuevo', en_proceso: 'En proceso', finalizado: 'Finalizado' };

// Hora de Argentina (UTC-3, sin horario de verano), sin depender de Intl
const hora = (iso) => {
  const d = new Date(new Date(iso).getTime() - 3 * 3600 * 1000);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
};

export default function ChatReclamo({ route }) {
  const { id } = route.params;
  const [reclamo, setReclamo] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [vistoHasta, setVistoHasta] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');
  const ultimoId = useRef(0);
  const scroll = useRef(null);

  const agregar = useCallback((nuevos) => {
    if (nuevos.length === 0) return;
    setMensajes((actuales) => {
      const conocidos = new Set(actuales.map((m) => m.id));
      const sumar = nuevos.filter((m) => !conocidos.has(m.id));
      return sumar.length ? [...actuales, ...sumar] : actuales;
    });
    ultimoId.current = Math.max(ultimoId.current, ...nuevos.map((m) => m.id));
  }, []);

  // Al pedir los mensajes, el servidor marca como vistos los del otro lado
  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get(`/reclamos/${id}/mensajes`, { params: { despues_de: ultimoId.current } });
      agregar(data.mensajes);
      setReclamo(data.reclamo);
      setVistoHasta(data.visto_hasta);
      setError('');
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }, [id, agregar]);

  useEffect(() => {
    cargar();
    // Con la app en segundo plano no se pide nada: así no se marcan mensajes como vistos sin leerlos
    const t = setInterval(() => { if (AppState.currentState === 'active') cargar(); }, INTERVALO_MS);
    return () => clearInterval(t);
  }, [cargar]);

  const enviar = async () => {
    const mensaje = texto.trim();
    if (!mensaje || enviando) return;
    setEnviando(true); setErrorEnvio('');
    try {
      const { data } = await api.post(`/reclamos/${id}/mensajes`, { mensaje });
      agregar([data]);
      setTexto('');
      await cargar();
    } catch (err) {
      setErrorEnvio(mensajeError(err));
      await cargar();
    } finally {
      setEnviando(false);
    }
  };

  if (cargando) return <ActivityIndicator color={colores.primario} style={{ marginTop: 60 }} />;
  if (error && !reclamo) return <View style={{ padding: 20 }}><Aviso texto={error} /></View>;

  const finalizado = reclamo.estado === 'finalizado';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colores.fondo }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <View style={estilos.cab}>
        <View style={{ flex: 1 }}>
          <Text style={estilos.asunto}>{reclamo.asunto}</Text>
          <Text style={estilos.suave}>
            {reclamo.cabana_nombre
              ? `${reclamo.cabana_nombre} · Reserva #${reclamo.reserva_id} (${formatearFechaCorta(reclamo.fecha_checkin)} al ${formatearFechaCorta(reclamo.fecha_checkout)})`
              : 'Reclamo sin reserva asociada'}
          </Text>
        </View>
        <View style={[estilos.estado, finalizado && { backgroundColor: colores.textoSuave }]}><Text style={estilos.estadoTexto}>{ETIQUETA[reclamo.estado]}</Text></View>
      </View>

      <ScrollView ref={scroll} contentContainerStyle={{ padding: 14, gap: 10 }}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
        {mensajes.length === 0 && <Text style={[estilos.suave, { textAlign: 'center' }]}>Todavía no hay mensajes.</Text>}
        {mensajes.map((m) => {
          const propio = m.remitente_tipo === 'usuario';
          const visto = vistoHasta !== null && m.id <= vistoHasta;
          return (
            <View key={m.id} style={[estilos.filaMsg, propio && { justifyContent: 'flex-end' }]}>
              <View style={[estilos.burbuja, propio ? estilos.propia : estilos.ajena]}>
                {!propio && <Text style={estilos.autor}>Dueño de la cabaña</Text>}
                <Text style={[estilos.msg, propio && { color: '#fff' }]}>{m.mensaje}</Text>
                <Text style={[estilos.pie, propio && { color: '#e7d6c5' }]}>{hora(m.created_at)}{propio ? (visto ? '  ✓✓' : '  ✓') : ''}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Aviso texto={error} />
      {finalizado ? (
        <Text style={estilos.finalizado}>Este reclamo está finalizado: ya no se pueden enviar mensajes.</Text>
      ) : (
        <View>
          {errorEnvio ? <View style={{ paddingHorizontal: 12 }}><Aviso texto={errorEnvio} /></View> : null}
          <View style={estilos.entrada}>
            <TextInput style={estilos.input} value={texto} onChangeText={setTexto} placeholder="Escribí tu mensaje..."
              placeholderTextColor={colores.textoSuave} multiline maxLength={2000} />
            <Pressable onPress={enviar} disabled={enviando || !texto.trim()} style={[estilos.enviar, (enviando || !texto.trim()) && { opacity: 0.5 }]}>
              <Text style={{ color: '#fff', fontSize: 18 }}>➤</Text>
            </Pressable>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  cab: { flexDirection: 'row', gap: 10, padding: 14, backgroundColor: colores.chip, alignItems: 'center' },
  asunto: { fontSize: 17, fontWeight: '800', color: colores.texto },
  suave: { color: colores.textoSuave, fontSize: 12, marginTop: 2 },
  estado: { backgroundColor: colores.dorado, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  estadoTexto: { color: '#fff', fontWeight: '800', fontSize: 11 },
  filaMsg: { flexDirection: 'row' },
  burbuja: { maxWidth: '82%', borderRadius: 16, padding: 10 },
  propia: { backgroundColor: colores.primario, borderBottomRightRadius: 4 },
  ajena: { backgroundColor: colores.tarjeta, borderWidth: 1, borderColor: colores.borde, borderBottomLeftRadius: 4 },
  autor: { fontSize: 11, fontWeight: '800', color: colores.nav, marginBottom: 2 },
  msg: { color: colores.texto, fontSize: 15, lineHeight: 20 },
  pie: { fontSize: 10, color: colores.textoSuave, textAlign: 'right', marginTop: 4 },
  finalizado: { textAlign: 'center', color: colores.textoSuave, padding: 14, backgroundColor: colores.chip },
  entrada: { flexDirection: 'row', gap: 8, padding: 10, alignItems: 'flex-end', backgroundColor: colores.fondo, borderTopWidth: 1, borderTopColor: colores.borde },
  input: { flex: 1, maxHeight: 110, backgroundColor: colores.tarjeta, borderWidth: 1, borderColor: colores.borde, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: colores.texto },
  enviar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colores.primario, alignItems: 'center', justifyContent: 'center' }
});
