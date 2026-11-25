import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, { mensajeError } from '../api/client';
import { Aviso, Boton } from '../components/Ui';
import Hoja from '../components/Hoja';
import { colores } from '../theme/colores';
import { formatearPrecio } from '../utils/formato';
import { contarNoches, formatearFechaCorta, hoyArgentina } from '../utils/fechas';

const LIMITE = 10;
const FILTROS = [['', 'Todas'], ['pendiente', 'Pendientes'], ['confirmada', 'Confirmadas'], ['completada', 'Completadas'], ['cancelada', 'Canceladas']];
const ETIQUETA = { pendiente: 'Pendiente', confirmada: 'Confirmada', completada: 'Completada', cancelada: 'Cancelada' };
const COLOR = { pendiente: '#AF8606', confirmada: '#1b7a43', completada: '#4A2C17', cancelada: '#b3261e' };
const VERBO = { confirmada: 'Confirmar', cancelada: 'Cancelar', completada: 'Completar' };

function Tarjeta({ r, hoy, onCambiar }) {
  const cancelada = r.estado === 'cancelada';
  const puedeCompletar = r.fecha_checkout <= hoy;
  return (
    <View style={estilos.tarjeta}>
      <View style={estilos.fila}>
        <View style={{ flex: 1 }}>
          <Text style={estilos.codigo}>Reserva #{r.id}</Text>
          <Text style={estilos.cabana}>{r.cabana_nombre}</Text>
          <Text style={estilos.suave}>📍 {r.localidad}, {r.provincia}</Text>
        </View>
        <View style={[estilos.estado, { backgroundColor: COLOR[r.estado] }]}><Text style={estilos.estadoTexto}>{ETIQUETA[r.estado]}</Text></View>
      </View>

      <View style={estilos.datos}>
        <Text style={estilos.dato}><Text style={estilos.negrita}>Huésped: </Text>{r.usuario_nombre} {r.usuario_apellido}</Text>
        <Text style={estilos.dato}><Text style={estilos.negrita}>Email: </Text>{r.usuario_email}</Text>
        <Text style={estilos.dato}><Text style={estilos.negrita}>Check-in: </Text>{formatearFechaCorta(r.fecha_checkin)}   <Text style={estilos.negrita}>Check-out: </Text>{formatearFechaCorta(r.fecha_checkout)}</Text>
        <Text style={estilos.dato}><Text style={estilos.negrita}>Noches: </Text>{contarNoches(r.fecha_checkin, r.fecha_checkout)}   <Text style={estilos.negrita}>Personas: </Text>{r.cantidad_personas}</Text>
      </View>

      <View style={estilos.montos}>
        <Text style={[estilos.total, cancelada && { textDecorationLine: 'line-through', color: colores.textoSuave }]}>{formatearPrecio(r.precio_total)}</Text>
        {r.comision_monto > 0 && !cancelada && (
          <Text style={estilos.comision}>
            Comisión Cabins ({r.comision_pct}%): <Text style={{ color: colores.error }}>-{formatearPrecio(r.comision_monto)}</Text>
            {'\n'}Recibís <Text style={{ color: colores.exito, fontWeight: '800' }}>{formatearPrecio(r.precio_total - r.comision_monto)}</Text>
          </Text>
        )}
      </View>

      {r.estado === 'pendiente' && (
        <View style={estilos.acciones}>
          <Pressable style={[estilos.btn, estilos.btnPrimario]} onPress={() => onCambiar(r, 'confirmada')}><Text style={estilos.btnPrimarioTexto}>Confirmar</Text></Pressable>
          <Pressable style={estilos.btn} onPress={() => onCambiar(r, 'cancelada')}><Text style={estilos.btnTexto}>Cancelar</Text></Pressable>
        </View>
      )}
      {r.estado === 'confirmada' && (
        <>
          <View style={estilos.acciones}>
            <Pressable style={[estilos.btn, estilos.btnPrimario, !puedeCompletar && { opacity: 0.45 }]} disabled={!puedeCompletar} onPress={() => onCambiar(r, 'completada')}>
              <Text style={estilos.btnPrimarioTexto}>Marcar completada</Text>
            </Pressable>
            <Pressable style={estilos.btn} onPress={() => onCambiar(r, 'cancelada')}><Text style={estilos.btnTexto}>Cancelar</Text></Pressable>
          </View>
          {!puedeCompletar && <Text style={estilos.nota}>Se puede completar a partir del día del check-out.</Text>}
        </>
      )}
    </View>
  );
}

export default function GestionarReservas() {
  const [estado, setEstado] = useState('');
  const [reservas, setReservas] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [cambio, setCambio] = useState(null);
  const [errorHoja, setErrorHoja] = useState('');
  const [enviando, setEnviando] = useState(false);
  const peticion = useRef(0);

  // Carga la primera página (o la siguiente, sumándola a la lista)
  const cargar = useCallback(async (est, pag) => {
    const mia = ++peticion.current;
    if (pag === 1) setError('');
    try {
      const { data } = await api.get('/reservas', { params: { estado: est || undefined, pagina: pag, limite: LIMITE } });
      if (mia !== peticion.current) return;
      setTotal(data.total);
      setPagina(pag);
      setReservas((previas) => (pag === 1 ? data.reservas : [...previas, ...data.reservas.filter((n) => !previas.some((p) => p.id === n.id))]));
    } catch (err) {
      if (mia === peticion.current) setError(mensajeError(err));
    } finally {
      if (mia === peticion.current) { setCargando(false); setCargandoMas(false); }
    }
  }, []);

  useFocusEffect(useCallback(() => { cargar(estado, 1); }, [cargar, estado]));

  const elegirFiltro = (clave) => {
    if (clave === estado) return;
    setReservas([]); setCargando(true); setAviso(''); setEstado(clave);
  };

  const confirmar = async () => {
    setEnviando(true); setErrorHoja('');
    try {
      await api.put(`/reservas/${cambio.reserva.id}/estado`, { estado: cambio.nuevo });
      setAviso(`La reserva #${cambio.reserva.id} pasó a "${ETIQUETA[cambio.nuevo]}".`);
      setCambio(null);
      await cargar(estado, 1);
    } catch (err) {
      setErrorHoja(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  const hoy = hoyArgentina();
  const hayMas = reservas.length < total;

  return (
    <>
      <ScrollView style={{ backgroundColor: colores.fondo }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => cargar(estado, 1)} />}>
        <Text style={estilos.titulo}>Reservas</Text>
        <Text style={estilos.suave}>Reservas de tus cabañas.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginVertical: 12 }}>
          {FILTROS.map(([k, t]) => (
            <Pressable key={k || 'todas'} onPress={() => elegirFiltro(k)} style={[estilos.filtro, estado === k && estilos.filtroActivo]}>
              <Text style={[estilos.filtroTexto, estado === k && { color: '#fff' }]}>{t}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Aviso tipo="exito" texto={aviso} />
        <Aviso texto={error} />
        {cargando && <ActivityIndicator color={colores.primario} style={{ marginVertical: 24 }} />}
        {!cargando && !error && reservas.length === 0 && (
          <View style={estilos.vacio}><Text style={estilos.suave}>No hay reservas en esta sección.</Text></View>
        )}
        {reservas.map((r) => <Tarjeta key={r.id} r={r} hoy={hoy} onCambiar={(res, nuevo) => { setErrorHoja(''); setCambio({ reserva: res, nuevo }); }} />)}

        {!cargando && hayMas && (
          <Boton titulo={`Ver más (${reservas.length} de ${total})`} cargando={cargandoMas} secundario
            onPress={() => { setCargandoMas(true); cargar(estado, pagina + 1); }} />
        )}
      </ScrollView>

      <Hoja visible={!!cambio} titulo={cambio ? `${VERBO[cambio.nuevo]} reserva` : ''} onCerrar={() => setCambio(null)}>
        {cambio && (
          <>
            <Text style={estilos.parrafo}>
              Reserva #{cambio.reserva.id} de {cambio.reserva.usuario_nombre} {cambio.reserva.usuario_apellido} en{' '}
              <Text style={estilos.negrita}>{cambio.reserva.cabana_nombre}</Text> pasará a <Text style={estilos.negrita}>{ETIQUETA[cambio.nuevo]}</Text>.
            </Text>
            {cambio.nuevo === 'cancelada' && <Text style={[estilos.suave, { marginBottom: 12 }]}>Esta acción no se puede deshacer.</Text>}
            <Aviso texto={errorHoja} />
            <Boton titulo="Confirmar" onPress={confirmar} cargando={enviando} />
            <Boton titulo="Volver" onPress={() => setCambio(null)} secundario />
          </>
        )}
      </Hoja>
    </>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: 24, fontWeight: '800', color: colores.primario },
  suave: { color: colores.textoSuave },
  parrafo: { color: colores.texto, fontSize: 15, lineHeight: 22, marginBottom: 10 },
  negrita: { fontWeight: '800' },
  filtro: { backgroundColor: colores.chip, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  filtroActivo: { backgroundColor: colores.primario },
  filtroTexto: { color: colores.primario, fontWeight: '700', fontSize: 13 },
  vacio: { backgroundColor: colores.tarjeta, borderRadius: 14, borderWidth: 1, borderColor: colores.borde, padding: 24, alignItems: 'center' },

  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: 16, borderWidth: 1, borderColor: colores.borde, padding: 14, marginBottom: 14 },
  fila: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  codigo: { color: colores.textoSuave, fontSize: 11, fontWeight: '700' },
  cabana: { fontSize: 17, fontWeight: '800', color: colores.texto, marginVertical: 2 },
  estado: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  estadoTexto: { color: '#fff', fontWeight: '800', fontSize: 11 },
  datos: { marginTop: 10, gap: 3 },
  dato: { color: colores.texto, fontSize: 13.5 },
  montos: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colores.borde },
  total: { fontSize: 20, fontWeight: '800', color: colores.primario },
  comision: { color: colores.textoSuave, fontSize: 12.5, marginTop: 4, lineHeight: 18 },
  acciones: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: { flex: 1, borderWidth: 1, borderColor: colores.primario, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  btnTexto: { color: colores.primario, fontWeight: '700' },
  btnPrimario: { backgroundColor: colores.primario },
  btnPrimarioTexto: { color: '#fff', fontWeight: '700' },
  nota: { color: colores.textoSuave, fontSize: 12, marginTop: 6 }
});
