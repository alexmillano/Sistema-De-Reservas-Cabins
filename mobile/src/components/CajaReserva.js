import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import api, { mensajeError } from '../api/client';
import { Aviso, Boton, Stepper } from './Ui';
import SelectorFechas from './SelectorFechas';
import { colores } from '../theme/colores';
import { formatearPrecio } from '../utils/formato';
import { contarNoches, formatearFechaCorta, hoyArgentina } from '../utils/fechas';

// Fechas, personas y botón "Agregar al carrito" del detalle de la cabaña
export default function CajaReserva({ cabana, onVerCarrito }) {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [personas, setPersonas] = useState(1);
  const [calendario, setCalendario] = useState(false);
  const [error, setError] = useState('');
  const [agregada, setAgregada] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const noches = contarNoches(desde, hasta);
  const total = noches * Number(cabana.precio_por_noche);

  const agregar = async () => {
    setError(''); setAgregada(false);
    if (!desde || !hasta) { setError('Elegí las fechas de check-in y check-out.'); return; }
    if (desde < hoyArgentina()) { setError('El check-in no puede ser anterior a hoy.'); return; }
    if (hasta <= desde) { setError('El check-out tiene que ser posterior al check-in.'); return; }
    if (personas > cabana.capacidad_personas) { setError(`Esta cabaña admite hasta ${cabana.capacidad_personas} personas.`); return; }

    setEnviando(true);
    try {
      await api.post('/carrito', {
        cabana_id: cabana.id, cantidad_personas: personas, fecha_checkin: desde, fecha_checkout: hasta
      });
      setAgregada(true);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={estilos.caja}>
      <Text style={estilos.precio}>{formatearPrecio(cabana.precio_por_noche)} <Text style={estilos.noche}>/ noche</Text></Text>

      <Text style={estilos.etiqueta}>FECHAS</Text>
      <Pressable style={estilos.campo} onPress={() => { setAgregada(false); setCalendario(true); }}>
        <Text style={{ color: desde ? colores.texto : colores.textoSuave }}>
          📅  {desde && hasta ? `${formatearFechaCorta(desde)}  →  ${formatearFechaCorta(hasta)}` : 'Elegir check-in y check-out'}
        </Text>
      </Pressable>

      <Text style={estilos.etiqueta}>PERSONAS (MÁXIMO {cabana.capacidad_personas})</Text>
      <View style={estilos.campoFila}>
        <Text style={{ color: colores.texto }}>👥  {personas} {personas === 1 ? 'persona' : 'personas'}</Text>
        <Stepper valor={personas} min={1} max={Number(cabana.capacidad_personas)} onChange={(v) => { setAgregada(false); setPersonas(v); }} />
      </View>

      {noches > 0 && (
        <View style={estilos.resumen}>
          <Text style={{ color: colores.texto }}>{noches} {noches === 1 ? 'noche' : 'noches'} × {formatearPrecio(cabana.precio_por_noche)}</Text>
          <Text style={estilos.total}>{formatearPrecio(total)}</Text>
        </View>
      )}

      <Aviso texto={error} />
      {agregada && (
        <View>
          <Aviso tipo="exito" texto="¡Cabaña agregada al carrito!" />
          <Boton titulo="Ver carrito" onPress={onVerCarrito} secundario />
        </View>
      )}
      <Boton titulo="Agregar al carrito" onPress={agregar} cargando={enviando} />
      <Text style={estilos.nota}>El total es estimado: el sistema lo confirma al pagar.</Text>

      <SelectorFechas
        visible={calendario}
        desde={desde}
        hasta={hasta}
        onCancelar={() => setCalendario(false)}
        onConfirmar={(d, h) => { setDesde(d); setHasta(h); setCalendario(false); }}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { backgroundColor: colores.tarjeta, borderRadius: 14, borderWidth: 1, borderColor: colores.borde, padding: 14, marginTop: 16 },
  precio: { fontSize: 26, fontWeight: '800', color: colores.texto, marginBottom: 6 },
  noche: { fontSize: 14, fontWeight: '400', color: colores.textoSuave },
  etiqueta: { fontSize: 11, letterSpacing: 0.6, color: colores.textoSuave, fontWeight: '700', marginTop: 10, marginBottom: 6 },
  campo: { backgroundColor: colores.fondo, borderRadius: 10, borderWidth: 1, borderColor: colores.borde, padding: 12 },
  campoFila: { backgroundColor: colores.fondo, borderRadius: 10, borderWidth: 1, borderColor: colores.borde, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resumen: { backgroundColor: colores.chip, borderRadius: 10, padding: 12, marginVertical: 12, flexDirection: 'row', justifyContent: 'space-between' },
  total: { fontWeight: '800', color: colores.primario },
  nota: { textAlign: 'center', color: colores.textoSuave, fontSize: 12, marginTop: 8 }
});
