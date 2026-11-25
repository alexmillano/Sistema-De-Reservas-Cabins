import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import api, { mensajeError } from '../api/client';
import { Aviso, Boton } from '../components/Ui';
import { colores } from '../theme/colores';
import { estrellas } from '../utils/formato';
import { formatearFechaCorta } from '../utils/fechas';

const LIMITE = 20;

export default function CalificacionesDueno() {
  const [cabanaId, setCabanaId] = useState('');
  const [resumen, setResumen] = useState([]);
  const [lista, setLista] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [masCargando, setMasCargando] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async (cab, pag) => {
    if (pag === 1) setError('');
    try {
      const { data } = await api.get('/calificaciones', { params: { cabana_id: cab || undefined, pagina: pag, limite: LIMITE } });
      setTotal(data.total); setPagina(pag);
      if (pag === 1) setResumen((previo) => (cab ? previo : data.resumen));
      setLista((prev) => (pag === 1 ? data.calificaciones : [...prev, ...data.calificaciones]));
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false); setMasCargando(false);
    }
  }, []);

  useEffect(() => { setCargando(true); cargar(cabanaId, 1); }, [cargar, cabanaId]);

  const general = resumen.reduce((a, r) => ({ suma: a.suma + r.promedio * r.total, n: a.n + r.total }), { suma: 0, n: 0 });
  const promedio = general.n ? (general.suma / general.n) : 0;

  return (
    <ScrollView style={{ backgroundColor: colores.fondo }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => cargar(cabanaId, 1)} />}>
      <Text style={estilos.suave}>Puntajes que recibieron tus cabañas.</Text>

      {general.n > 0 && !cabanaId && (
        <View style={estilos.general}>
          <Text style={estilos.generalNum}>{promedio.toFixed(1)}</Text>
          <Text style={estilos.generalEstrellas}>{estrellas(promedio)}</Text>
          <Text style={estilos.suave}>{general.n} calificaciones en total</Text>
        </View>
      )}

      {resumen.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginVertical: 12 }}>
          <Pressable onPress={() => setCabanaId('')} style={[estilos.chip, !cabanaId && estilos.chipActivo]}>
            <Text style={[estilos.chipTexto, !cabanaId && { color: '#fff' }]}>Todas</Text>
          </Pressable>
          {resumen.map((r) => (
            <Pressable key={r.cabana_id} onPress={() => setCabanaId(String(r.cabana_id))} style={[estilos.chip, cabanaId === String(r.cabana_id) && estilos.chipActivo]}>
              <Text style={[estilos.chipTexto, cabanaId === String(r.cabana_id) && { color: '#fff' }]}>{r.nombre} · ★ {r.promedio} ({r.total})</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Aviso texto={error} />
      {cargando && <ActivityIndicator color={colores.primario} style={{ marginVertical: 20 }} />}
      {!cargando && !error && lista.length === 0 && (
        <View style={estilos.vacio}><Text style={estilos.suave}>Todavía no hay calificaciones.</Text></View>
      )}
      {lista.map((k) => (
        <View key={k.id} style={estilos.item}>
          <View style={estilos.fila}>
            <Text style={estilos.nombre}>{k.usuario_nombre} {k.usuario_apellido}</Text>
            <Text style={estilos.estrellas}>{estrellas(k.puntaje)}</Text>
          </View>
          <Text style={estilos.suave}>{k.cabana_nombre}{k.created_at ? ` · ${formatearFechaCorta(String(k.created_at).slice(0, 10))}` : ''}</Text>
        </View>
      ))}
      {!cargando && lista.length < total && (
        <Boton titulo={`Ver más (${lista.length} de ${total})`} cargando={masCargando} secundario
          onPress={() => { setMasCargando(true); cargar(cabanaId, pagina + 1); }} />
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  suave: { color: colores.textoSuave, fontSize: 13 },
  general: { alignItems: 'center', backgroundColor: colores.tarjeta, borderRadius: 14, borderWidth: 1, borderColor: colores.borde, padding: 16, marginTop: 12 },
  generalNum: { fontSize: 40, fontWeight: '800', color: colores.primario },
  generalEstrellas: { fontSize: 22, color: colores.dorado, marginBottom: 2 },
  chip: { backgroundColor: colores.chip, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  chipActivo: { backgroundColor: colores.primario },
  chipTexto: { color: colores.primario, fontWeight: '700', fontSize: 13 },
  vacio: { backgroundColor: colores.tarjeta, borderRadius: 14, borderWidth: 1, borderColor: colores.borde, padding: 24, alignItems: 'center' },
  item: { backgroundColor: colores.tarjeta, borderRadius: 12, borderWidth: 1, borderColor: colores.borde, padding: 12, marginBottom: 10 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  nombre: { fontWeight: '800', color: colores.texto, fontSize: 15 },
  estrellas: { color: colores.dorado, fontSize: 15 }
});
