import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import api, { mensajeError } from '../api/client';
import { Aviso, Boton } from '../components/Ui';
import { colores } from '../theme/colores';
import { estrellas } from '../utils/formato';
import { formatearFechaCorta } from '../utils/fechas';

const LIMITE = 15;

export default function OpinionesDueno() {
  const [lista, setLista] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [masCargando, setMasCargando] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async (pag) => {
    if (pag === 1) setError('');
    try {
      const { data } = await api.get('/opiniones', { params: { pagina: pag, limite: LIMITE } });
      setTotal(data.total); setPagina(pag);
      setLista((prev) => (pag === 1 ? data.opiniones : [...prev, ...data.opiniones]));
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false); setMasCargando(false);
    }
  }, []);

  useEffect(() => { cargar(1); }, [cargar]);

  return (
    <ScrollView style={{ backgroundColor: colores.fondo }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => cargar(1)} />}>
      <Text style={[estilos.suave, { marginBottom: 12 }]}>Lo que opinan los huéspedes que se hospedaron en tus cabañas.</Text>
      <Aviso texto={error} />
      {cargando && <ActivityIndicator color={colores.primario} style={{ marginVertical: 20 }} />}
      {!cargando && !error && lista.length === 0 && (
        <View style={estilos.vacio}><Text style={estilos.suave}>Todavía no hay opiniones.</Text></View>
      )}
      {lista.map((o) => (
        <View key={o.id} style={estilos.item}>
          <View style={estilos.fila}>
            <Text style={estilos.nombre}>{o.usuario_nombre} {o.usuario_apellido}</Text>
            {o.puntaje ? <Text style={estilos.estrellas}>{estrellas(o.puntaje)}</Text> : null}
          </View>
          <Text style={estilos.cabana}>{o.cabana_nombre}</Text>
          <Text style={estilos.texto}>{o.contenido}</Text>
          <Text style={estilos.suave}>{formatearFechaCorta(String(o.created_at).slice(0, 10))}</Text>
        </View>
      ))}
      {!cargando && lista.length < total && (
        <Boton titulo={`Ver más (${lista.length} de ${total})`} cargando={masCargando} secundario
          onPress={() => { setMasCargando(true); cargar(pagina + 1); }} />
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  suave: { color: colores.textoSuave, fontSize: 12.5 },
  vacio: { backgroundColor: colores.tarjeta, borderRadius: 14, borderWidth: 1, borderColor: colores.borde, padding: 24, alignItems: 'center' },
  item: { backgroundColor: colores.tarjeta, borderRadius: 12, borderWidth: 1, borderColor: colores.borde, padding: 14, marginBottom: 10, gap: 3 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nombre: { fontWeight: '800', color: colores.texto, fontSize: 15 },
  estrellas: { color: colores.dorado, fontSize: 14 },
  cabana: { color: colores.nav, fontWeight: '700', fontSize: 13 },
  texto: { color: colores.texto, fontSize: 14.5, lineHeight: 21, marginVertical: 4 }
});
