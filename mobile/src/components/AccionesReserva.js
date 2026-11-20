import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import api, { mensajeError } from '../api/client';
import { Aviso, Boton, Campo, Stepper } from './Ui';
import Hoja from './Hoja';
import SelectorFechas from './SelectorFechas';
import { colores } from '../theme/colores';
import { formatearPrecio } from '../utils/formato';
import { contarNoches, formatearFechaCorta, hoyArgentina } from '../utils/fechas';

// ---------- Modificar fechas / personas ----------
export function ModalModificar({ reserva, onCerrar, onListo }) {
  const hoy = hoyArgentina();
  const nochesActuales = contarNoches(reserva.fecha_checkin, reserva.fecha_checkout);
  const base = Number(reserva.precio_total);
  const factor = base > 0 ? 1 + Number(reserva.tarifa_servicio) / base : 1;
  const precioNoche = nochesActuales > 0 ? (base * factor) / nochesActuales : 0;

  const [desde, setDesde] = useState(reserva.fecha_checkin);
  const [hasta, setHasta] = useState(reserva.fecha_checkout);
  const [personas, setPersonas] = useState(Number(reserva.cantidad_personas));
  const [calendario, setCalendario] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const noches = contarNoches(desde, hasta);

  const guardar = async () => {
    setError('');
    if (!desde || !hasta) return setError('Elegí las dos fechas.');
    if (desde < hoy) return setError('El check-in no puede ser anterior a hoy.');
    if (hasta <= desde) return setError('El check-out tiene que ser posterior al check-in.');
    setEnviando(true);
    try {
      await api.put(`/reservas/${reserva.id}`, { fecha_checkin: desde, fecha_checkout: hasta, cantidad_personas: personas });
      await onListo('Reserva modificada correctamente.');
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  };

  return (
    <Hoja visible titulo={`Modificar reserva · ${reserva.cabana_nombre}`} onCerrar={onCerrar}>
      <Text style={estilos.etiqueta}>FECHAS</Text>
      <Pressable style={estilos.campo} onPress={() => setCalendario(true)}>
        <Text style={{ color: colores.texto }}>📅  {formatearFechaCorta(desde)}  →  {formatearFechaCorta(hasta)}</Text>
      </Pressable>
      <Text style={estilos.etiqueta}>CANTIDAD DE PERSONAS</Text>
      <View style={estilos.campoFila}>
        <Text style={{ color: colores.texto }}>👥  {personas}</Text>
        <Stepper valor={personas} min={1} max={50} onChange={setPersonas} />
      </View>
      {noches > 0 && (
        <View style={estilos.total}>
          <Text style={{ color: colores.texto }}>Nuevo total estimado ({noches} {noches === 1 ? 'noche' : 'noches'})</Text>
          <Text style={estilos.totalMonto}>{formatearPrecio(noches * precioNoche)}</Text>
        </View>
      )}
      <Aviso texto={error} />
      <Boton titulo="Guardar cambios" onPress={guardar} cargando={enviando} />
      <Boton titulo="Cancelar" onPress={onCerrar} secundario />
      <SelectorFechas visible={calendario} desde={desde} hasta={hasta} onCancelar={() => setCalendario(false)}
        onConfirmar={(d, h) => { setDesde(d); setHasta(h); setCalendario(false); }} />
    </Hoja>
  );
}

// ---------- Cancelar ----------
export function ModalCancelar({ reserva, onCerrar, onListo }) {
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cancelar = async () => {
    setEnviando(true); setError('');
    try {
      await api.delete(`/reservas/${reserva.id}`);
      await onListo('La reserva fue cancelada.');
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  };

  return (
    <Hoja visible titulo="Cancelar reserva" onCerrar={onCerrar}>
      <Text style={estilos.texto}>
        ¿Querés cancelar tu reserva en {reserva.cabana_nombre} del {formatearFechaCorta(reserva.fecha_checkin)} al {formatearFechaCorta(reserva.fecha_checkout)}?
      </Text>
      <Text style={estilos.suave}>Esta acción no se puede deshacer. Si necesitás coordinar un reembolso, hacelo desde un reclamo sobre esta reserva.</Text>
      <Aviso texto={error} />
      <Pressable onPress={cancelar} disabled={enviando} style={[estilos.peligro, enviando && { opacity: 0.6 }]}>
        <Text style={estilos.peligroTexto}>{enviando ? 'Cancelando...' : 'Cancelar reserva'}</Text>
      </Pressable>
      <Boton titulo="Volver" onPress={onCerrar} secundario />
    </Hoja>
  );
}

// ---------- Calificar ----------
export function ModalCalificar({ reserva, onCerrar, onListo }) {
  const [puntaje, setPuntaje] = useState(0);
  const [opinion, setOpinion] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (puntaje < 1) return setError('Elegí un puntaje de 1 a 5 estrellas.');
    setEnviando(true); setError('');
    try {
      await api.post('/calificaciones', { cabana_id: reserva.cabana_id, puntaje, opinion });
      await onListo('¡Gracias por tu calificación!');
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  };

  return (
    <Hoja visible titulo={`Calificar · ${reserva.cabana_nombre}`} onCerrar={onCerrar}>
      <Text style={estilos.etiqueta}>PUNTUACIÓN GENERAL</Text>
      <View style={estilos.estrellas}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setPuntaje(n)} hitSlop={6}>
            <Text style={[estilos.estrella, n <= puntaje && { color: colores.dorado }]}>{n <= puntaje ? '★' : '☆'}</Text>
          </Pressable>
        ))}
      </View>
      <Campo etiqueta="Tu reseña (opcional)" value={opinion} onChangeText={setOpinion} multiline numberOfLines={4}
        maxLength={1000} autoCapitalize="sentences" placeholder="Contanos tu experiencia..." style={{ minHeight: 90, textAlignVertical: 'top' }} />
      <Aviso texto={error} />
      <Boton titulo="Enviar calificación" onPress={enviar} cargando={enviando} />
      <Boton titulo="Cancelar" onPress={onCerrar} secundario />
    </Hoja>
  );
}

// ---------- Reclamo ----------
export function ModalReclamo({ reserva, onCerrar, onListo }) {
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (!asunto.trim()) return setError('Escribí el asunto del reclamo.');
    setEnviando(true); setError('');
    try {
      await api.post('/reclamos', { reserva_id: reserva.id, asunto, mensaje });
      await onListo('Reclamo enviado. El dueño de la cabaña fue avisado. Lo ves en la pestaña Soporte.');
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  };

  return (
    <Hoja visible titulo={`Hacer un reclamo · ${reserva.cabana_nombre}`} onCerrar={onCerrar}>
      <Text style={estilos.suave}>Reserva #{reserva.id} · {formatearFechaCorta(reserva.fecha_checkin)} al {formatearFechaCorta(reserva.fecha_checkout)}</Text>
      <Campo etiqueta="Asunto" value={asunto} onChangeText={setAsunto} maxLength={200} autoCapitalize="sentences" />
      <Campo etiqueta="Contanos qué pasó (opcional)" value={mensaje} onChangeText={setMensaje} multiline numberOfLines={4}
        maxLength={2000} autoCapitalize="sentences" style={{ minHeight: 90, textAlignVertical: 'top' }} />
      <Aviso texto={error} />
      <Boton titulo="Enviar reclamo" onPress={enviar} cargando={enviando} />
      <Boton titulo="Cancelar" onPress={onCerrar} secundario />
    </Hoja>
  );
}

const estilos = StyleSheet.create({
  etiqueta: { fontSize: 11, letterSpacing: 0.6, color: colores.textoSuave, fontWeight: '700', marginTop: 8, marginBottom: 6 },
  campo: { backgroundColor: colores.tarjeta, borderRadius: 10, borderWidth: 1, borderColor: colores.borde, padding: 12 },
  campoFila: { backgroundColor: colores.tarjeta, borderRadius: 10, borderWidth: 1, borderColor: colores.borde, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { backgroundColor: colores.chip, borderRadius: 10, padding: 12, marginVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  totalMonto: { fontWeight: '800', color: colores.primario, fontSize: 16 },
  texto: { color: colores.texto, lineHeight: 21, marginBottom: 8 },
  suave: { color: colores.textoSuave, lineHeight: 19, marginBottom: 12 },
  peligro: { backgroundColor: colores.error, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 6, marginBottom: 6 },
  peligroTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
  estrellas: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  estrella: { fontSize: 38, color: colores.textoSuave }
});
