import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, { mensajeError } from '../api/client';
import { Aviso, Boton } from '../components/Ui';
import { colores } from '../theme/colores';
import { formatearPrecio } from '../utils/formato';

const VERDE = '#2e7d32';
const ROJO = '#b3261e';
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const NOMBRE_PLAN = { free: 'Free', plus: 'Plus', premium: 'Premium' };

function Tarjeta({ titulo, valor, color }) {
  return (
    <View style={estilos.kpi}>
      <Text style={estilos.kpiTitulo}>{titulo}</Text>
      <Text style={[estilos.kpiValor, color && { color }]} adjustsFontSizeToFit numberOfLines={1}>{valor}</Text>
    </View>
  );
}

export default function FinanzasDueno({ navigation }) {
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async (a) => {
    setError('');
    try {
      const { data } = await api.get('/finanzas/resumen', { params: { anio: a } });
      setDatos(data);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { cargar(anio); }, [cargar, anio]));

  const cambiar = (d) => { setCargando(true); setAnio((a) => a + d); };

  const ind = datos?.indicadores;
  const meses = datos?.ingresos_por_mes || [];
  const maximo = Math.max(1, ...meses.map((m) => m.ingresos));

  return (
    <ScrollView style={{ backgroundColor: colores.fondo }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => cargar(anio)} />}>
      <View style={estilos.anioFila}>
        <Pressable onPress={() => cambiar(-1)} style={estilos.flecha}><Text style={estilos.flechaTexto}>‹</Text></Pressable>
        <Text style={estilos.anio}>{anio}</Text>
        <Pressable onPress={() => cambiar(1)} style={estilos.flecha}><Text style={estilos.flechaTexto}>›</Text></Pressable>
      </View>

      <Aviso texto={error} />
      {cargando && <ActivityIndicator color={colores.primario} style={{ marginVertical: 20 }} />}

      {ind && !cargando && (
        <>
          <View style={estilos.grilla}>
            <Tarjeta titulo="Ingresos" valor={formatearPrecio(ind.ingresos_totales)} color={VERDE} />
            <Tarjeta titulo="Comisiones" valor={formatearPrecio(ind.comisiones_totales)} color={ROJO} />
            <Tarjeta titulo="Planes pagados" valor={formatearPrecio(ind.planes_total)} color={ROJO} />
            <Tarjeta titulo="Resultado neto" valor={formatearPrecio(ind.resultado_neto)} color={ind.resultado_neto < 0 ? ROJO : '#000'} />
            <Tarjeta titulo="Reservas con ingreso" valor={String(ind.reservas_con_ingreso)} />
            <Tarjeta titulo="Ingreso promedio" valor={formatearPrecio(ind.ingreso_promedio)} />
          </View>

          <Text style={estilos.seccion}>Ingresos por mes</Text>
          <View style={estilos.grafico}>
            {meses.map((m) => (
              <View key={m.mes} style={estilos.col}>
                <View style={estilos.barraCaja}>
                  <View style={[estilos.barra, { height: `${Math.max(m.ingresos > 0 ? 4 : 0, (m.ingresos / maximo) * 100)}%` }]} />
                </View>
                <Text style={estilos.mes}>{MESES[m.mes - 1]}</Text>
              </View>
            ))}
          </View>
          <Text style={estilos.nota}>Mes de mayor ingreso: {formatearPrecio(maximo > 1 ? maximo : 0)}</Text>

          <Text style={estilos.seccion}>Estado de las reservas</Text>
          <View style={estilos.tarjeta}>
            <Text style={estilos.linea}>Pendientes: {datos.estados.pendientes}</Text>
            <Text style={estilos.linea}>Confirmadas: {datos.estados.confirmadas}</Text>
            <Text style={estilos.linea}>Completadas: {datos.estados.completadas}</Text>
            <Text style={estilos.linea}>Canceladas: {datos.estados.canceladas} ({datos.estados.tasa_cancelacion_pct}%)</Text>
            <Text style={[estilos.linea, { fontWeight: '800' }]}>Ocupación general: {ind.ocupacion_general_pct}%</Text>
          </View>

          <Text style={estilos.seccion}>Por cabaña</Text>
          {datos.ocupacion_por_cabana.length === 0 && <Text style={estilos.nota}>Todavía no tenés cabañas.</Text>}
          {datos.ocupacion_por_cabana.map((c) => (
            <View key={c.cabana_id} style={estilos.tarjeta}>
              <Text style={estilos.cabana}>{c.nombre}</Text>
              <Text style={estilos.nota}>{c.localidad}, {c.provincia}</Text>
              <Text style={estilos.linea}>Reservas: {c.reservas} · Noches: {c.noches_reservadas}</Text>
              <Text style={estilos.linea}>Ingresos: <Text style={{ color: VERDE, fontWeight: '800' }}>{formatearPrecio(c.ingresos)}</Text></Text>
              <View style={estilos.ocupFondo}><View style={[estilos.ocupBarra, { width: `${Math.min(100, c.ocupacion_pct)}%` }]} /></View>
              <Text style={estilos.nota}>Ocupación {c.ocupacion_pct}%</Text>
            </View>
          ))}

          <Text style={estilos.seccion}>Planes</Text>
          {datos.planes_por_cabana.map((c) => (
            <View key={c.cabana_id} style={[estilos.tarjeta, estilos.filaPlan]}>
              <View style={{ flex: 1 }}>
                <Text style={estilos.cabana}>{c.nombre}</Text>
                <Text style={estilos.nota}>Plan {NOMBRE_PLAN[c.plan] || c.plan}</Text>
              </View>
              <Text style={{ color: c.gasto > 0 ? ROJO : colores.textoSuave, fontWeight: '800' }}>{formatearPrecio(c.gasto)}</Text>
            </View>
          ))}
          <View style={{ marginTop: 10 }}>
            <Boton titulo="Ver y contratar planes" onPress={() => navigation.navigate('Planes')} />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  anioFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 12 },
  anio: { fontSize: 24, fontWeight: '800', color: colores.primario },
  flecha: { backgroundColor: colores.chip, borderRadius: 18, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  flechaTexto: { fontSize: 22, color: colores.primario, fontWeight: '800', marginTop: -2 },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: { width: '48%', backgroundColor: colores.tarjeta, borderRadius: 12, borderWidth: 1, borderColor: colores.borde, padding: 12 },
  kpiTitulo: { color: colores.textoSuave, fontSize: 12 },
  kpiValor: { fontSize: 18, fontWeight: '800', color: colores.texto, marginTop: 4 },
  seccion: { fontSize: 17, fontWeight: '800', color: colores.primario, marginTop: 20, marginBottom: 8 },
  grafico: { flexDirection: 'row', height: 150, backgroundColor: colores.tarjeta, borderRadius: 12, borderWidth: 1, borderColor: colores.borde, padding: 8, gap: 3 },
  col: { flex: 1, alignItems: 'center' },
  barraCaja: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  barra: { width: '100%', backgroundColor: VERDE, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  mes: { fontSize: 9, color: colores.textoSuave, marginTop: 3 },
  nota: { color: colores.textoSuave, fontSize: 12.5, marginTop: 4 },
  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: 12, borderWidth: 1, borderColor: colores.borde, padding: 12, marginBottom: 10, gap: 2 },
  cabana: { fontWeight: '800', color: colores.texto, fontSize: 15 },
  linea: { color: colores.texto, fontSize: 14 },
  ocupFondo: { height: 8, borderRadius: 4, backgroundColor: colores.chip, marginTop: 6, overflow: 'hidden' },
  ocupBarra: { height: 8, backgroundColor: colores.primario },
  filaPlan: { flexDirection: 'row', alignItems: 'center' }
});
