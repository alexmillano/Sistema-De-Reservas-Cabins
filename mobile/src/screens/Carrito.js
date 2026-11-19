import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, { mensajeError } from '../api/client';
import { Aviso, Boton } from '../components/Ui';
import ItemCarrito from '../components/ItemCarrito';
import ResumenTotales from '../components/ResumenTotales';
import { colores } from '../theme/colores';
import { hoyArgentina } from '../utils/fechas';

export default function Carrito({ navigation }) {
  const [estado, setEstado] = useState({ cargando: true, items: [], total: 0, tarifa: 0, pct: 0, totalAPagar: 0, error: '' });

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get('/carrito');
      setEstado({
        cargando: false, items: data.items, total: data.total, tarifa: data.tarifa_servicio,
        pct: data.tarifa_servicio_pct, totalAPagar: data.total_a_pagar, error: ''
      });
    } catch (err) {
      setEstado({ cargando: false, items: [], total: 0, tarifa: 0, pct: 0, totalAPagar: 0, error: mensajeError(err) });
    }
  }, []);

  // Se recarga cada vez que se vuelve a la pestaña (por ejemplo después de agregar una cabaña)
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const { cargando, items, total, tarifa, pct, totalAPagar, error } = estado;
  const hoy = hoyArgentina();
  const hayProblemas = items.some((i) => !i.activa || i.fecha_checkin < hoy);

  if (cargando) return <ActivityIndicator color={colores.primario} style={{ marginTop: 60 }} />;

  return (
    <ScrollView style={{ backgroundColor: colores.fondo }} contentContainerStyle={estilos.contenido}>
      <Aviso texto={error} />

      {!error && items.length === 0 && (
        <View style={estilos.vacio}>
          <Text style={estilos.vacioTitulo}>Tu carrito está vacío 🛒</Text>
          <Text style={estilos.vacioTexto}>Elegí una cabaña, fechas y cantidad de personas.</Text>
          <Boton titulo="Explorar cabañas" onPress={() => navigation.navigate('Catalogo')} />
        </View>
      )}

      {items.length > 0 && (
        <>
          <Text style={estilos.titulo}>Tu escapada seleccionada <Text style={estilos.cuenta}>({items.length})</Text></Text>
          <View style={estilos.aviso}>
            <Text style={estilos.avisoTexto}>⏱ Al ir al pago, tus fechas quedan bloqueadas por 15 minutos.</Text>
          </View>

          {items.map((item) => <ItemCarrito key={item.id} item={item} onCambio={cargar} />)}

          <Text style={estilos.titulo}>Desglose del pago</Text>
          <ResumenTotales subtotal={total} tarifa={tarifa} pct={pct} total={totalAPagar} />

          {hayProblemas && (
            <Aviso texto="Hay cabañas que ya no están disponibles o con fechas pasadas. Quitalas o actualizalas para continuar." />
          )}
          <Boton titulo="Proceder al pago" onPress={() => navigation.getParent().navigate('Checkout')} deshabilitado={hayProblemas} />
          <Boton titulo="Seguir explorando" onPress={() => navigation.navigate('Catalogo')} secundario />
        </>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: 16, paddingBottom: 32 },
  titulo: { fontSize: 20, fontWeight: '800', color: colores.texto, marginVertical: 10 },
  cuenta: { color: colores.textoSuave, fontWeight: '600', fontSize: 16 },
  aviso: { backgroundColor: colores.chip, borderRadius: 12, padding: 12, marginBottom: 12 },
  avisoTexto: { color: colores.primario, fontWeight: '600' },
  vacio: { backgroundColor: colores.tarjeta, borderRadius: 16, padding: 24, alignItems: 'stretch', borderWidth: 1, borderColor: colores.borde },
  vacioTitulo: { fontSize: 20, fontWeight: '800', color: colores.texto, textAlign: 'center' },
  vacioTexto: { color: colores.textoSuave, textAlign: 'center', marginVertical: 10 }
});
