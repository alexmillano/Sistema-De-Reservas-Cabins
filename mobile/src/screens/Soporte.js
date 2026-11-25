import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, { mensajeError } from '../api/client';
import { Aviso, Boton } from '../components/Ui';
import { colores } from '../theme/colores';
import AvoidTeclado from '../components/AvoidTeclado';

const FILTROS = [
  { clave: '', texto: 'Todos' }, { clave: 'nuevo', texto: 'Nuevos' },
  { clave: 'en_proceso', texto: 'En proceso' }, { clave: 'finalizado', texto: 'Finalizados' }
];
const ETIQUETA = { nuevo: 'Nuevo', en_proceso: 'En proceso', finalizado: 'Finalizado' };
const COLOR = { nuevo: '#AF8606', en_proceso: '#1b6aa5', finalizado: '#6f6558' };

const PREGUNTAS = [
  { p: '¿Cómo reservo una cabaña?', r: 'Entrá al Catálogo, filtrá por provincia, localidad, precio o valoración, elegí una cabaña, indicá las fechas y la cantidad de personas y agregala al carrito. Desde el carrito seguí hasta el pago.' },
  { p: '¿Puedo modificar o cancelar mi reserva?', r: 'Sí. En Reservas podés modificar las fechas o la cantidad de personas de una reserva pendiente o confirmada (si el check-in todavía no pasó) y cancelarla. Las completadas o canceladas ya no se pueden cambiar.' },
  { p: '¿Cómo funciona el reembolso?', r: 'Los reembolsos se coordinan con el dueño de la cabaña a través de un reclamo asociado a tu reserva. Desde Reservas, tocá "Reclamo" y contá tu caso.' },
  { p: '¿Qué medios de pago puedo usar?', r: 'En el pago ingresás los datos de tu tarjeta. En esta versión el pago es simulado: se valida el formato de la tarjeta, pero no se guarda ni se cobra nada.' },
  { p: '¿Qué pasa si otra persona está pagando la misma cabaña?', r: 'Mientras alguien está en el pago, esa cabaña queda bloqueada para esas fechas por unos minutos. Si no completa el pago, se libera sola y podés reservarla.' },
  { p: '¿Cómo califico una cabaña?', r: 'Cuando tu estadía figura como completada, aparece el botón "Calificar" en Reservas. Podés dar de 1 a 5 estrellas y, si querés, dejar una opinión. Solo se puede calificar una vez por cabaña.' },
  { p: '¿Cómo hago un reclamo?', r: 'Todo reclamo se hace sobre una reserva tuya. Se abre un chat con el dueño de la cabaña: ves cuando leyó tus mensajes y el reclamo queda abierto hasta que el dueño lo finaliza.' }
];

function Reclamos({ navigation }) {
  const [filtro, setFiltro] = useState('');
  const [lista, setLista] = useState({ cargando: true, error: '', reclamos: [] });
  const enfocado = useRef(false);

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get('/reclamos/mis-reclamos');
      setLista({ cargando: false, error: '', reclamos: data });
    } catch (err) {
      setLista({ cargando: false, error: mensajeError(err), reclamos: [] });
    }
  }, []);

  // Se recarga al volver a la pestaña y cada 15 segundos mientras está a la vista
  useFocusEffect(useCallback(() => {
    enfocado.current = true;
    cargar();
    const id = setInterval(() => { if (AppState.currentState === 'active') cargar(); }, 15000);
    return () => { enfocado.current = false; clearInterval(id); };
  }, [cargar]));

  const { cargando, error, reclamos } = lista;
  const visibles = reclamos.filter((r) => !filtro || r.estado === filtro);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} />}>
      <Text style={estilos.nota}>Tus reclamos sobre reservas. Para abrir uno nuevo, andá a Reservas y tocá "Reclamo".</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
        {FILTROS.map((f) => (
          <Pressable key={f.clave || 'todos'} onPress={() => setFiltro(f.clave)} style={[estilos.chip, filtro === f.clave && estilos.chipActivo]}>
            <Text style={[estilos.chipTexto, filtro === f.clave && { color: '#fff' }]}>{f.texto}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {cargando && <ActivityIndicator color={colores.primario} style={{ marginTop: 20 }} />}
      <Aviso texto={error} />
      {!cargando && !error && visibles.length === 0 && (
        <View style={estilos.vacio}>
          <Text style={{ color: colores.textoSuave, textAlign: 'center' }}>No hay reclamos en esta sección.</Text>
          <Boton titulo="Ir a Reservas" onPress={() => navigation.navigate('Reservas')} />
        </View>
      )}
      {visibles.map((r) => (
        <Pressable key={r.id} style={estilos.reclamo} onPress={() => navigation.navigate('ChatReclamo', { id: r.id, asunto: r.asunto })}>
          <View style={estilos.fila}>
            <Text style={estilos.asunto} numberOfLines={1}>{r.asunto}</Text>
            {Number(r.no_leidos) > 0 && <View style={estilos.badge}><Text style={estilos.badgeTexto}>{r.no_leidos}</Text></View>}
          </View>
          <Text style={estilos.suave}>{r.cabana_nombre ? `${r.cabana_nombre} · Reserva #${r.reserva_id}` : 'Sin reserva asociada'}</Text>
          {r.ultimo_mensaje ? <Text style={estilos.ultimo} numberOfLines={1}>{r.ultimo_mensaje}</Text> : null}
          <View style={[estilos.estado, { backgroundColor: COLOR[r.estado] }]}><Text style={estilos.estadoTexto}>{ETIQUETA[r.estado]}</Text></View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function Ayuda() {
  const [busqueda, setBusqueda] = useState('');
  const [abierta, setAbierta] = useState(null);
  const termino = busqueda.trim().toLowerCase();
  const visibles = PREGUNTAS.filter((x) => !termino || x.p.toLowerCase().includes(termino) || x.r.toLowerCase().includes(termino));

  return (
    <AvoidTeclado conInset={false}><ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      <Text style={estilos.titulo}>Centro de ayuda</Text>
      <Text style={estilos.nota}>Respuestas rápidas sobre cómo reservar, cancelar y reclamar.</Text>
      <TextInput style={estilos.buscador} value={busqueda} onChangeText={(t) => { setBusqueda(t); setAbierta(null); }}
        placeholder="Buscá: cancelar, pago, reclamo..." placeholderTextColor={colores.textoSuave} autoCapitalize="none" />
      {visibles.length === 0 && <Text style={estilos.nota}>No encontramos resultados para "{busqueda}".</Text>}
      {visibles.map((x, i) => {
        const abiertaEsta = termino ? true : abierta === i;
        return (
          <Pressable key={x.p} style={estilos.faq} onPress={() => setAbierta(abiertaEsta ? null : i)}>
            <View style={estilos.fila}><Text style={estilos.pregunta}>{x.p}</Text><Text style={{ color: colores.primario }}>{abiertaEsta ? '▴' : '▾'}</Text></View>
            {abiertaEsta && <Text style={estilos.respuesta}>{x.r}</Text>}
          </Pressable>
        );
      })}
      <View style={estilos.contacto}>
        <Text style={estilos.pregunta}>¿No encontraste lo que buscabas?</Text>
        <Text style={estilos.suave}>Escribinos a contacto@cabins.com o hacé un reclamo sobre alguna de tus reservas.</Text>
        <Boton titulo="Escribir un mail" onPress={() => Linking.openURL('mailto:contacto@cabins.com').catch(() => {})} secundario />
      </View>
    </ScrollView></AvoidTeclado>
  );
}

export default function Soporte({ navigation }) {
  const [vista, setVista] = useState('reclamos');
  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <View style={estilos.segmentos}>
        {[['reclamos', 'Mis reclamos'], ['ayuda', 'Ayuda']].map(([k, t]) => (
          <Pressable key={k} onPress={() => setVista(k)} style={[estilos.segmento, vista === k && estilos.segmentoActivo]}>
            <Text style={[estilos.segmentoTexto, vista === k && { color: '#fff' }]}>{t}</Text>
          </Pressable>
        ))}
      </View>
      {vista === 'reclamos' ? <Reclamos navigation={navigation} /> : <Ayuda />}
    </View>
  );
}

const estilos = StyleSheet.create({
  segmentos: { flexDirection: 'row', margin: 12, backgroundColor: colores.chip, borderRadius: 24, padding: 4 },
  segmento: { flex: 1, paddingVertical: 9, borderRadius: 20, alignItems: 'center' },
  segmentoActivo: { backgroundColor: colores.primario },
  segmentoTexto: { color: colores.primario, fontWeight: '700' },
  titulo: { fontSize: 22, fontWeight: '800', color: colores.texto },
  nota: { color: colores.textoSuave, marginVertical: 8, lineHeight: 19 },
  chip: { backgroundColor: colores.chip, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  chipActivo: { backgroundColor: colores.primario },
  chipTexto: { color: colores.primario, fontWeight: '700', fontSize: 13 },
  vacio: { backgroundColor: colores.tarjeta, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: colores.borde },
  reclamo: { backgroundColor: colores.tarjeta, borderRadius: 14, borderWidth: 1, borderColor: colores.borde, padding: 14, marginBottom: 12, gap: 4 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  asunto: { flex: 1, fontSize: 16, fontWeight: '800', color: colores.texto },
  suave: { color: colores.textoSuave, fontSize: 12, lineHeight: 18 },
  ultimo: { color: colores.texto, fontSize: 13 },
  badge: { backgroundColor: colores.error, borderRadius: 11, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeTexto: { color: '#fff', fontWeight: '800', fontSize: 12 },
  estado: { alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3, marginTop: 4 },
  estadoTexto: { color: '#fff', fontWeight: '800', fontSize: 11 },
  buscador: { backgroundColor: colores.tarjeta, borderWidth: 1, borderColor: colores.borde, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: colores.texto, marginBottom: 12 },
  faq: { backgroundColor: colores.tarjeta, borderRadius: 12, borderWidth: 1, borderColor: colores.borde, padding: 14, marginBottom: 10 },
  pregunta: { flex: 1, fontWeight: '700', color: colores.texto },
  respuesta: { color: colores.texto, marginTop: 8, lineHeight: 20 },
  contacto: { backgroundColor: colores.chip, borderRadius: 14, padding: 14, marginTop: 8, gap: 6 }
});
