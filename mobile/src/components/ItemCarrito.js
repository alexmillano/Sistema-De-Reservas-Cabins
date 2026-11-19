import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import api, { mensajeError } from '../api/client';
import { Aviso, Stepper } from './Ui';
import SelectorFechas from './SelectorFechas';
import { colores } from '../theme/colores';
import { formatearPrecio } from '../utils/formato';
import { formatearFechaCorta, hoyArgentina } from '../utils/fechas';

export default function ItemCarrito({ item, onCambio }) {
  const [rota, setRota] = useState(false);
  const [calendario, setCalendario] = useState(false);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const fechasPasadas = item.fecha_checkin < hoyArgentina();

  const actualizar = async (cambios) => {
    setError('');
    setGuardando(true);
    try {
      await api.put(`/carrito/${item.id}`, {
        fecha_checkin: item.fecha_checkin,
        fecha_checkout: item.fecha_checkout,
        cantidad_personas: item.cantidad_personas,
        ...cambios
      });
      await onCambio();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  };

  const quitar = () => {
    Alert.alert('Quitar del carrito', `¿Querés quitar "${item.nombre}" del carrito?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar', style: 'destructive',
        onPress: async () => {
          try { await api.delete(`/carrito/${item.id}`); await onCambio(); }
          catch (err) { setError(mensajeError(err)); }
        }
      }
    ]);
  };

  return (
    <View style={estilos.tarjeta}>
      <View style={estilos.cab}>
        {item.imagen_url && !rota ? (
          <Image source={{ uri: item.imagen_url }} style={estilos.imagen} onError={() => setRota(true)} />
        ) : (
          <View style={[estilos.imagen, estilos.sinImagen]}><Text style={{ color: colores.textoSuave, fontSize: 11 }}>Sin imagen</Text></View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={estilos.nombre} numberOfLines={2}>{item.nombre}</Text>
          <Text style={estilos.ubicacion}>📍 {item.localidad}, {item.provincia}</Text>
          <Text style={estilos.precio}>{formatearPrecio(item.precio_por_noche)} <Text style={estilos.noche}>/ noche</Text></Text>
        </View>
        <Pressable onPress={quitar} hitSlop={10} style={estilos.papelera}><Text style={{ fontSize: 18 }}>🗑️</Text></Pressable>
      </View>

      {!item.activa && <Aviso texto="Esta cabaña ya no está disponible. Quitala del carrito para poder pagar." />}
      {item.activa && fechasPasadas && <Aviso texto="Las fechas ya pasaron. Actualizalas o quitá la cabaña." />}

      <Pressable style={estilos.fechas} onPress={() => item.activa && setCalendario(true)}>
        <View><Text style={estilos.mini}>LLEGADA</Text><Text style={estilos.fecha}>{formatearFechaCorta(item.fecha_checkin)}</Text></View>
        <Text style={estilos.flecha}>→</Text>
        <View><Text style={estilos.mini}>SALIDA</Text><Text style={estilos.fecha}>{formatearFechaCorta(item.fecha_checkout)}</Text></View>
        <View style={estilos.noches}><Text style={estilos.nochesTexto}>{item.noches} {item.noches === 1 ? 'noche' : 'noches'}</Text></View>
      </Pressable>
      {item.activa && <Text style={estilos.editar}>Tocá las fechas para cambiarlas</Text>}

      <View style={estilos.pie}>
        <View>
          <Text style={estilos.mini}>HUÉSPEDES (MÁX. {item.capacidad_personas})</Text>
          <View style={{ marginTop: 4, opacity: guardando ? 0.5 : 1 }} pointerEvents={guardando ? 'none' : 'auto'}>
            <Stepper valor={Number(item.cantidad_personas)} min={1} max={Number(item.capacidad_personas)}
              onChange={(v) => actualizar({ cantidad_personas: v })} />
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={estilos.mini}>SUBTOTAL ({item.noches} {item.noches === 1 ? 'NOCHE' : 'NOCHES'})</Text>
          <Text style={estilos.subtotal}>{formatearPrecio(item.subtotal)}</Text>
        </View>
      </View>
      <Aviso texto={error} />

      <SelectorFechas
        visible={calendario}
        desde={item.fecha_checkin}
        hasta={item.fecha_checkout}
        onCancelar={() => setCalendario(false)}
        onConfirmar={(d, h) => { setCalendario(false); actualizar({ fecha_checkin: d, fecha_checkout: h }); }}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: 16, borderWidth: 1, borderColor: colores.borde, padding: 12, marginBottom: 14 },
  cab: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  imagen: { width: 84, height: 84, borderRadius: 10 },
  sinImagen: { backgroundColor: colores.chip, alignItems: 'center', justifyContent: 'center' },
  nombre: { fontSize: 16, fontWeight: '800', color: colores.texto },
  ubicacion: { color: colores.textoSuave, fontSize: 12, marginTop: 2 },
  precio: { fontWeight: '800', color: colores.texto, marginTop: 4 },
  noche: { fontWeight: '400', color: colores.textoSuave, fontSize: 12 },
  papelera: { width: 36, height: 36, borderRadius: 18, backgroundColor: colores.chip, alignItems: 'center', justifyContent: 'center' },
  fechas: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colores.fondo, borderRadius: 10, padding: 10 },
  mini: { fontSize: 10, letterSpacing: 0.5, color: colores.textoSuave, fontWeight: '700' },
  fecha: { fontWeight: '700', color: colores.texto, marginTop: 2 },
  flecha: { color: colores.textoSuave },
  noches: { backgroundColor: colores.chip, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  nochesTexto: { color: colores.primario, fontWeight: '700', fontSize: 12 },
  editar: { fontSize: 11, color: colores.textoSuave, marginTop: 4 },
  pie: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12 },
  subtotal: { fontSize: 20, fontWeight: '800', color: colores.texto }
});
