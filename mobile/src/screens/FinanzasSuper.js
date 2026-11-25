import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, { mensajeError } from '../api/client';
import { Aviso } from '../components/Ui';
import { colores } from '../theme/colores';
import { formatearPrecio } from '../utils/formato';

const VERDE = '#2e7d32';
const ROJO = '#b3261e';
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function Tarjeta({ titulo, valor, color }) {
  return (
    <View style={estilos.kpi}>
      <Text style={estilos.kpiTitulo}>{titulo}</Text>
      <Text style={[estilos.kpiValor, color && { color }]} adjustsFontSizeToFit numberOfLines={1}>{valor}</Text>
    </View>
  );
}

export default function FinanzasSuper() {
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
      <Text style={estilos.nota}>Finanzas de toda la plataforma (solo consulta).</Text>

      <Aviso texto={error} />
      {cargando && <ActivityIndicator color={colores.primario} style={{ marginVertical: 20 }} />}

      {ind && !cargando && (
        <>
          <View style={estilos.grilla}>
            <Tarjeta titulo="Ingresos de la plataforma" valor={formatearPrecio(ind.ingresos_plataforma)} color={VERDE} />
            <Tarjeta titulo="Comisiones (10%)" valor={formatearPrecio(ind.comisiones_totales)} color={VERDE} />
            <Tarjeta titulo="Tarifas de servicio (5%)" valor={formatearPrecio(ind.tarifas_totales)} color={VERDE} />
            <Tarjeta titulo="Planes cobrados" valor={formatearPrecio(ind.planes_total)} color={VERDE} />
            <Tarjeta titulo="Cobrado a huéspedes" valor={formatearPrecio(ind.cobrado_huespedes)} />
            <Tarjeta titulo="Pagos a dueños" valor={formatearPrecio(ind.pagos_a_duenos)} color={ROJO} />
            <Tarjeta titulo="Reservas con ingreso" valor={`${ind.reservas_con_ingreso} de ${ind.total_reservas}`} />
            <Tarjeta titulo="Ocupación general" valor={`${ind.ocupacion_general_pct}%`} />
          </View>

          <Text style={estilos.seccion}>Ingresos de la plataforma por mes</Text>
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

          <Text style={estilos.seccion}>Planes</Text>
          {datos.resumen_planes.map((p) => (
            <View key={p.plan} style={estilos.tarjeta}>
              <Text style={estilos.titulo}>{p.nombre}</Text>
              <Text style={estilos.linea}>Compras: {p.compras} · Vigentes: {p.vigentes}</Text>
              <Text style={estilos.linea}>Ingresos: <Text style={{ color: VERDE, fontWeight: '800' }}>{formatearPrecio(p.ingresos)}</Text></Text>
            </View>
          ))}

          <Text style={estilos.seccion}>Por dueño</Text>
          {datos.por_dueno.length === 0 && <Text style={estilos.nota}>Sin dueños registrados.</Text>}
          {datos.por_dueno.map((d) => (
            <View key={d.id} style={estilos.tarjeta}>
              <Text style={estilos.titulo}>{d.nombre} {d.apellido} <Text style={estilos.nota}>@{d.usuario}</Text></Text>
              <Text style={estilos.linea}>Cabañas: {d.cabanas} · Reservas: {d.reservas}</Text>
              <Text style={estilos.linea}>Alojamiento: {formatearPrecio(d.alojamiento)}</Text>
              <Text style={estilos.linea}>Comisión: <Text style={{ color: VERDE, fontWeight: '800' }}>{formatearPrecio(d.comision)}</Text> · Planes: <Text style={{ color: VERDE, fontWeight: '800' }}>{formatearPrecio(d.planes)}</Text></Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  anioFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 6 },
  anio: { fontSize: 24, fontWeight: '800', color: colores.primario },
  flecha: { backgroundColor: colores.chip, borderRadius: 18, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  flechaTexto: { fontSize: 22, color: colores.primario, fontWeight: '800', marginTop: -2 },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  kpi: { width: '48%', backgroundColor: colores.tarjeta, borderRadius: 12, borderWidth: 1, borderColor: colores.borde, padding: 12 },
  kpiTitulo: { color: colores.textoSuave, fontSize: 12 },
  kpiValor: { fontSize: 18, fontWeight: '800', color: colores.texto, marginTop: 4 },
  seccion: { fontSize: 17, fontWeight: '800', color: colores.primario, marginTop: 20, marginBottom: 8 },
  grafico: { flexDirection: 'row', height: 150, backgroundColor: colores.tarjeta, borderRadius: 12, borderWidth: 1, borderColor: colores.borde, padding: 8, gap: 3 },
  col: { flex: 1, alignItems: 'center' },
  barraCaja: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  barra: { width: '100%', backgroundColor: VERDE, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  mes: { fontSize: 9, color: colores.textoSuave, marginTop: 3 },
  nota: { color: colores.textoSuave, fontSize: 12.5, textAlign: 'center' },
  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: 12, borderWidth: 1, borderColor: colores.borde, padding: 12, marginBottom: 10, gap: 2 },
  titulo: { fontWeight: '800', color: colores.texto, fontSize: 15 },
  linea: { color: colores.texto, fontSize: 14 }
});
