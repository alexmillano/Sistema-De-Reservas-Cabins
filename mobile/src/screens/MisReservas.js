import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, { mensajeError } from '../api/client';
import { Aviso, Boton } from '../components/Ui';
import { ModalCalificar, ModalCancelar, ModalModificar, ModalReclamo } from '../components/AccionesReserva';
import { colores } from '../theme/colores';
import { formatearPrecio } from '../utils/formato';
import { contarNoches, formatearFechaCorta, hoyArgentina } from '../utils/fechas';

const PESTANAS = [
  { clave: 'activas', texto: 'Activas', estados: ['pendiente', 'confirmada'] },
  { clave: 'historial', texto: 'Historial', estados: ['completada'] },
  { clave: 'canceladas', texto: 'Canceladas', estados: ['cancelada'] }
];
const ETIQUETA = { pendiente: 'Pendiente', confirmada: 'Confirmada', completada: 'Completada', cancelada: 'Cancelada' };
const COLOR_ESTADO = { pendiente: '#AF8606', confirmada: '#1b7a43', completada: '#4A2C17', cancelada: '#b3261e' };

function Tarjeta({ r, puedeCalificar, onAccion }) {
  const [rota, setRota] = useState(false);
  const noches = contarNoches(r.fecha_checkin, r.fecha_checkout);
  const vigente = r.estado === 'pendiente' || r.estado === 'confirmada';
  const modificable = vigente && r.fecha_checkin >= hoyArgentina();
  const total = Number(r.precio_total) + Number(r.tarifa_servicio);

  return (
    <View style={estilos.tarjeta}>
      <View style={estilos.fila}>
        <View style={[estilos.estado, { backgroundColor: COLOR_ESTADO[r.estado] }]}><Text style={estilos.estadoTexto}>{ETIQUETA[r.estado]}</Text></View>
        <Text style={estilos.codigo}>Reserva #{r.id}</Text>
      </View>
      <View style={[estilos.fila, { marginTop: 10, gap: 12 }]}>
        {r.imagen_url && !rota ? (
          <Image source={{ uri: r.imagen_url }} style={estilos.imagen} onError={() => setRota(true)} />
        ) : (
          <View style={[estilos.imagen, estilos.sinImagen]}><Text style={{ color: colores.textoSuave, fontSize: 11 }}>Sin imagen</Text></View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={estilos.nombre}>{r.cabana_nombre}</Text>
          <Text style={estilos.ubic}>📍 {r.localidad}, {r.provincia}</Text>
          <Text style={[estilos.precio, r.estado === 'cancelada' && { textDecorationLine: 'line-through', color: colores.textoSuave }]}>{formatearPrecio(total)}</Text>
          {Number(r.tarifa_servicio) > 0 && (
            <Text style={estilos.desglose}>Alojamiento {formatearPrecio(r.precio_total)} + tarifa {formatearPrecio(r.tarifa_servicio)}</Text>
          )}
        </View>
      </View>

      <View style={estilos.fechas}>
        <View><Text style={estilos.mini}>CHECK-IN</Text><Text style={estilos.fecha}>{formatearFechaCorta(r.fecha_checkin)}</Text></View>
        <View><Text style={estilos.mini}>CHECK-OUT</Text><Text style={estilos.fecha}>{formatearFechaCorta(r.fecha_checkout)}</Text></View>
        <View><Text style={estilos.mini}>ESTADÍA</Text><Text style={estilos.fecha}>{noches} {noches === 1 ? 'noche' : 'noches'} · {r.cantidad_personas} 👥</Text></View>
      </View>

      <View style={estilos.acciones}>
        {modificable && <Pressable style={estilos.accion} onPress={() => onAccion('modificar', r)}><Text style={estilos.accionTexto}>📝 Modificar</Text></Pressable>}
        {vigente && <Pressable style={[estilos.accion, estilos.accionPeligro]} onPress={() => onAccion('cancelar', r)}><Text style={[estilos.accionTexto, { color: colores.error }]}>✕ Cancelar</Text></Pressable>}
        {puedeCalificar && <Pressable style={[estilos.accion, estilos.accionPrincipal]} onPress={() => onAccion('calificar', r)}><Text style={[estilos.accionTexto, { color: '#fff' }]}>★ Calificar</Text></Pressable>}
        <Pressable style={estilos.accion} onPress={() => onAccion('reclamo', r)}><Text style={estilos.accionTexto}>💬 Reclamo</Text></Pressable>
      </View>
    </View>
  );
}

export default function MisReservas({ navigation }) {
  const [datos, setDatos] = useState({ cargando: true, error: '', reservas: [], porCalificar: [] });
  const [pestana, setPestana] = useState('activas');
  const [accion, setAccion] = useState(null);
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(async () => {
    try {
      const [res, pend] = await Promise.all([api.get('/reservas/mis-reservas'), api.get('/calificaciones/pendientes')]);
      setDatos({ cargando: false, error: '', reservas: res.data, porCalificar: pend.data.map((p) => p.cabana_id) });
    } catch (err) {
      setDatos({ cargando: false, error: mensajeError(err), reservas: [], porCalificar: [] });
    }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const terminar = async (mensaje) => { setAviso(mensaje); setAccion(null); await cargar(); };

  const { cargando, error, reservas, porCalificar } = datos;
  const actual = PESTANAS.find((p) => p.clave === pestana);
  const lista = reservas.filter((r) => actual.estados.includes(r.estado));
  const cuenta = (p) => reservas.filter((r) => p.estados.includes(r.estado)).length;

  return (
    <View style={{ flex: 1, backgroundColor: colores.fondo }}>
      <View style={estilos.pestanas}>
        {PESTANAS.map((p) => (
          <Pressable key={p.clave} onPress={() => setPestana(p.clave)} style={[estilos.pestana, pestana === p.clave && estilos.pestanaActiva]}>
            <Text style={[estilos.pestanaTexto, pestana === p.clave && { color: '#fff' }]}>{p.texto} ({cuenta(p)})</Text>
          </Pressable>
        ))}
      </View>

      {cargando ? <ActivityIndicator color={colores.primario} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} />}>
          <Aviso tipo="exito" texto={aviso} />
          <Aviso texto={error} />
          {!error && lista.length === 0 && (
            <View style={estilos.vacio}>
              <Text style={{ color: colores.textoSuave, textAlign: 'center' }}>No tenés reservas en esta sección.</Text>
              {pestana === 'activas' && <Boton titulo="Explorar cabañas" onPress={() => navigation.navigate('Catalogo')} />}
            </View>
          )}
          {lista.map((r) => (
            <Tarjeta key={r.id} r={r} puedeCalificar={r.estado === 'completada' && porCalificar.includes(r.cabana_id)}
              onAccion={(tipo, reserva) => { setAviso(''); setAccion({ tipo, reserva }); }} />
          ))}
        </ScrollView>
      )}

      {accion?.tipo === 'modificar' && <ModalModificar reserva={accion.reserva} onCerrar={() => setAccion(null)} onListo={terminar} />}
      {accion?.tipo === 'cancelar' && <ModalCancelar reserva={accion.reserva} onCerrar={() => setAccion(null)} onListo={terminar} />}
      {accion?.tipo === 'calificar' && <ModalCalificar reserva={accion.reserva} onCerrar={() => setAccion(null)} onListo={terminar} />}
      {accion?.tipo === 'reclamo' && <ModalReclamo reserva={accion.reserva} onCerrar={() => setAccion(null)} onListo={terminar} />}
    </View>
  );
}

const estilos = StyleSheet.create({
  pestanas: { flexDirection: 'row', gap: 6, margin: 12, backgroundColor: colores.chip, borderRadius: 24, padding: 4 },
  pestana: { flex: 1, paddingVertical: 9, borderRadius: 20, alignItems: 'center' },
  pestanaActiva: { backgroundColor: colores.primario },
  pestanaTexto: { color: colores.primario, fontWeight: '700', fontSize: 13 },
  vacio: { backgroundColor: colores.tarjeta, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: colores.borde },
  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: 16, borderWidth: 1, borderColor: colores.borde, padding: 14, marginBottom: 14 },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  estado: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  estadoTexto: { color: '#fff', fontWeight: '800', fontSize: 11, letterSpacing: 0.4 },
  codigo: { color: colores.textoSuave, fontWeight: '700', fontSize: 12 },
  imagen: { width: 88, height: 88, borderRadius: 10 },
  sinImagen: { backgroundColor: colores.chip, alignItems: 'center', justifyContent: 'center' },
  nombre: { fontSize: 17, fontWeight: '800', color: colores.texto },
  ubic: { color: colores.textoSuave, fontSize: 12, marginTop: 2 },
  precio: { fontSize: 18, fontWeight: '800', color: colores.texto, marginTop: 4 },
  desglose: { color: colores.textoSuave, fontSize: 11 },
  fechas: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colores.fondo, borderRadius: 10, padding: 10, marginTop: 12 },
  mini: { fontSize: 10, letterSpacing: 0.5, color: colores.textoSuave, fontWeight: '700' },
  fecha: { fontWeight: '700', color: colores.texto, marginTop: 2, fontSize: 13 },
  acciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  accion: { backgroundColor: colores.chip, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  accionPeligro: { backgroundColor: colores.errorFondo },
  accionPrincipal: { backgroundColor: colores.primario },
  accionTexto: { color: colores.primario, fontWeight: '700', fontSize: 13 }
});
