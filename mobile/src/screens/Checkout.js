import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import api, { mensajeError } from '../api/client';
import { Aviso, Boton, Campo, Enlace } from '../components/Ui';
import ResumenTotales from '../components/ResumenTotales';
import { colores } from '../theme/colores';
import { formatearPrecio } from '../utils/formato';
import { formatearFechaCorta, hoyArgentina, mmss } from '../utils/fechas';
import AvoidTeclado from '../components/AvoidTeclado';

const PASOS = ['Resumen', 'Pago', 'Confirmación'];
const PAGO_VACIO = { titular: '', numero_tarjeta: '', vencimiento: '', cvv: '' };
const soloDigitos = (t) => t.replace(/\D/g, '');
const formatearTarjeta = (t) => soloDigitos(t).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
const formatearVencimiento = (t) => { const d = soloDigitos(t).slice(0, 4); return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };

// Mismas reglas que el servidor; devuelve un mensaje o null
const validarPago = (f) => {
  const numero = soloDigitos(f.numero_tarjeta);
  if (!f.titular.trim()) return 'Ingresá el titular de la tarjeta.';
  if (numero.length < 13 || numero.length > 19) return 'El número de tarjeta no es válido.';
  const venc = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(f.vencimiento);
  if (!venc) return 'El vencimiento debe tener formato MM/AA.';
  const [anioActual, mesActual] = hoyArgentina().split('-').map(Number);
  const anio = 2000 + Number(venc[2]);
  const mes = Number(venc[1]);
  if (anio < anioActual || (anio === anioActual && mes < mesActual)) return 'La tarjeta está vencida.';
  if (!/^\d{3,4}$/.test(f.cvv)) return 'El CVV debe tener 3 o 4 dígitos.';
  return null;
};

function Pasos({ actual }) {
  return (
    <View style={estilos.pasos}>
      {PASOS.map((nombre, i) => {
        const n = i + 1;
        return (
          <View key={nombre} style={estilos.paso}>
            <View style={[estilos.circulo, n <= actual && estilos.circuloActivo]}>
              <Text style={[estilos.circuloTexto, n <= actual && { color: '#fff' }]}>{n}</Text>
            </View>
            <Text style={[estilos.pasoNombre, n === actual && { fontWeight: '800', color: colores.texto }]}>{nombre}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function Checkout({ navigation }) {
  const [carrito, setCarrito] = useState({ cargando: true, items: [], total: 0, tarifa: 0, pct: 0, totalAPagar: 0, error: '' });
  const [paso, setPaso] = useState('resumen');
  const [pago, setPago] = useState(PAGO_VACIO);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [confirmacion, setConfirmacion] = useState(null);
  const [bloqueo, setBloqueo] = useState({ estado: 'iniciando', expira: null, mensaje: '' });
  const [ahora, setAhora] = useState(() => Date.now());
  const pagado = useRef(false);

  const bloquear = useCallback(async () => {
    try {
      const { data } = await api.post('/reservas/checkout');
      setAhora(Date.now());
      setBloqueo({ estado: 'activo', expira: Date.now() + data.segundos_restantes * 1000, mensaje: '' });
    } catch (err) {
      setBloqueo({ estado: 'error', expira: null, mensaje: mensajeError(err) });
    }
  }, []);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const { data } = await api.get('/carrito');
        if (!activo) return;
        setCarrito({
          cargando: false, items: data.items, total: data.total, tarifa: data.tarifa_servicio,
          pct: data.tarifa_servicio_pct, totalAPagar: data.total_a_pagar, error: ''
        });
        const hoy = hoyArgentina();
        const problemas = data.items.some((i) => !i.activa || i.fecha_checkin < hoy);
        if (data.items.length === 0 || problemas) { setBloqueo({ estado: 'inactivo', expira: null, mensaje: '' }); return; }
        await bloquear();
      } catch (err) {
        if (activo) setCarrito({ cargando: false, items: [], total: 0, tarifa: 0, pct: 0, totalAPagar: 0, error: mensajeError(err) });
      }
    })();
    return () => { activo = false; };
  }, [bloquear]);

  // Al salir de la pantalla sin haber pagado se liberan las fechas para otras personas
  useEffect(() => () => {
    if (!pagado.current) api.delete('/reservas/checkout').catch(() => {});
  }, []);

  useEffect(() => {
    if (bloqueo.estado !== 'activo') return undefined;
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [bloqueo.estado]);

  const segundos = bloqueo.estado === 'activo' ? Math.max(0, Math.ceil((bloqueo.expira - ahora) / 1000)) : 0;
  const vencido = bloqueo.estado === 'activo' && segundos === 0;

  const reintentar = async () => {
    setBloqueo({ estado: 'iniciando', expira: null, mensaje: '' });
    await bloquear();
  };

  const cambiar = (nombre) => (valor) => {
    const f = nombre === 'numero_tarjeta' ? formatearTarjeta(valor)
      : nombre === 'vencimiento' ? formatearVencimiento(valor)
      : nombre === 'cvv' ? soloDigitos(valor).slice(0, 4) : valor;
    setPago((p) => ({ ...p, [nombre]: f }));
  };

  const pagar = async () => {
    setError('');
    const problema = validarPago(pago);
    if (problema) { setError(problema); return; }
    setEnviando(true);
    try {
      const { data } = await api.post('/reservas/pagar', {
        numero_tarjeta: soloDigitos(pago.numero_tarjeta),
        vencimiento: pago.vencimiento,
        cvv: pago.cvv,
        titular: pago.titular.trim()
      });
      pagado.current = true;
      setConfirmacion(data);
      setBloqueo({ estado: 'finalizado', expira: null, mensaje: '' });
      setPago(PAGO_VACIO); // los datos de la tarjeta no se guardan en ningún lado
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  // ---------- Paso 3: confirmación ----------
  if (confirmacion) {
    return (
      <AvoidTeclado><ScrollView style={{ backgroundColor: colores.fondo }} contentContainerStyle={estilos.contenido}>
        <Pasos actual={3} />
        <Text style={estilos.titulo}>¡Reserva registrada! 🎉</Text>
        <Text style={estilos.texto}>
          Pago simulado aprobado. Tus reservas quedaron en estado <Text style={{ fontWeight: '800' }}>pendiente</Text> hasta que el dueño las confirme.
        </Text>
        {confirmacion.reservas.map((r) => (
          <View key={r.id} style={estilos.linea}>
            <View style={{ flex: 1 }}>
              <Text style={estilos.lineaTitulo}>#{r.id} · {r.cabana}</Text>
              <Text style={estilos.lineaSub}>{formatearFechaCorta(r.fecha_checkin)} al {formatearFechaCorta(r.fecha_checkout)}</Text>
            </View>
            <Text style={estilos.lineaMonto}>{formatearPrecio(r.precio_total)}</Text>
          </View>
        ))}
        <ResumenTotales subtotal={confirmacion.total} tarifa={confirmacion.tarifa_servicio}
          pct={confirmacion.tarifa_servicio_pct} total={confirmacion.total_pagado} etiquetaTotal="Total pagado" />
        <Boton titulo="Ver mis reservas" onPress={() => navigation.navigate('Principal', { screen: 'Reservas' })} />
        <Boton titulo="Seguir explorando" onPress={() => navigation.navigate('Principal', { screen: 'Catalogo' })} secundario />
      </ScrollView></AvoidTeclado>
    );
  }

  if (carrito.cargando) return <ActivityIndicator color={colores.primario} style={{ marginTop: 60 }} />;

  if (carrito.error) {
    return <View style={{ padding: 20 }}><Aviso texto={carrito.error} /><Boton titulo="Volver al carrito" onPress={() => navigation.goBack()} /></View>;
  }
  if (carrito.items.length === 0) {
    return (
      <View style={{ padding: 20 }}>
        <Text style={estilos.texto}>Tu carrito está vacío, no hay nada para pagar.</Text>
        <Boton titulo="Explorar cabañas" onPress={() => navigation.navigate('Principal', { screen: 'Catalogo' })} />
      </View>
    );
  }

  const hoy = hoyArgentina();
  const hayProblemas = carrito.items.some((i) => !i.activa || i.fecha_checkin < hoy);
  const puedeAvanzar = !hayProblemas && bloqueo.estado === 'activo' && !vencido;

  let avisoBloqueo = null;
  if (bloqueo.estado === 'iniciando') avisoBloqueo = <View style={estilos.reloj}><Text style={estilos.relojTexto}>Bloqueando tus fechas...</Text></View>;
  else if (vencido) avisoBloqueo = (<View><Aviso texto="Se agotó el tiempo de bloqueo. Para seguir, volvé a bloquear tus fechas." /><Boton titulo="Volver a bloquear mis fechas" onPress={reintentar} /></View>);
  else if (bloqueo.estado === 'activo') avisoBloqueo = (
    <View style={[estilos.reloj, segundos <= 120 && estilos.relojUrgente]}>
      <Text style={[estilos.relojTexto, segundos <= 120 && { color: colores.error }]}>⏱ Tus fechas están reservadas para vos durante {mmss(segundos)}</Text>
    </View>
  );
  else if (bloqueo.estado === 'error') avisoBloqueo = (<View><Aviso texto={bloqueo.mensaje} /><Boton titulo="Reintentar" onPress={reintentar} /></View>);

  return (
    <AvoidTeclado>
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <Pasos actual={paso === 'pago' ? 2 : 1} />
        {avisoBloqueo}

        {paso === 'resumen' && (
          <>
            <Text style={estilos.titulo}>Resumen de tu reserva</Text>
            <Text style={estilos.texto}>Revisá los detalles de tus estadías antes de continuar al pago.</Text>
            {carrito.items.map((i) => (
              <View key={i.id} style={estilos.linea}>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.lineaTitulo}>{i.nombre}</Text>
                  <Text style={estilos.lineaSub}>📍 {i.localidad}, {i.provincia}</Text>
                  <Text style={estilos.lineaSub}>
                    {formatearFechaCorta(i.fecha_checkin)} al {formatearFechaCorta(i.fecha_checkout)} · {i.noches} {i.noches === 1 ? 'noche' : 'noches'} · {i.cantidad_personas} {i.cantidad_personas === 1 ? 'persona' : 'personas'}
                  </Text>
                </View>
                <Text style={estilos.lineaMonto}>{formatearPrecio(i.subtotal)}</Text>
              </View>
            ))}
            <ResumenTotales subtotal={carrito.total} tarifa={carrito.tarifa} pct={carrito.pct} total={carrito.totalAPagar} />
            {hayProblemas && <Aviso texto="Hay cabañas que ya no están disponibles o con fechas pasadas. Volvé al carrito para arreglarlo." />}
            <Boton titulo="Continuar al pago" onPress={() => { setError(''); setPaso('pago'); }} deshabilitado={!puedeAvanzar} />
            <Boton titulo="Volver al carrito" onPress={() => navigation.goBack()} secundario />
          </>
        )}

        {paso === 'pago' && (
          <>
            <Text style={estilos.titulo}>Datos de pago</Text>
            <View style={estilos.simulado}>
              <Text style={{ color: colores.primario }}>Pago simulado: no se cobra nada y los datos de la tarjeta no se guardan. Podés usar la tarjeta de prueba 4111 1111 1111 1111.</Text>
            </View>
            <Campo etiqueta="Titular de la tarjeta" value={pago.titular} onChangeText={cambiar('titular')} autoCapitalize="words" autoComplete="cc-name" />
            <Campo etiqueta="Número de tarjeta" value={pago.numero_tarjeta} onChangeText={cambiar('numero_tarjeta')} keyboardType="number-pad" placeholder="0000 0000 0000 0000" autoComplete="cc-number" />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}><Campo etiqueta="Vencimiento (MM/AA)" value={pago.vencimiento} onChangeText={cambiar('vencimiento')} keyboardType="number-pad" placeholder="MM/AA" /></View>
              <View style={{ flex: 1 }}><Campo etiqueta="CVV" value={pago.cvv} onChangeText={cambiar('cvv')} keyboardType="number-pad" secureTextEntry placeholder="123" /></View>
            </View>
            <Aviso texto={error} />
            <Boton titulo={`Confirmar pago ${formatearPrecio(carrito.totalAPagar)}`} onPress={pagar} cargando={enviando} deshabilitado={!puedeAvanzar} />
            <Boton titulo="Volver al resumen" onPress={() => setPaso('resumen')} secundario />
            <Enlace texto="Volver al carrito" onPress={() => navigation.goBack()} />
          </>
        )}
      </ScrollView>
    </AvoidTeclado>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: 16, paddingBottom: 40 },
  pasos: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colores.tarjeta, borderRadius: 14, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: colores.borde },
  paso: { alignItems: 'center', gap: 4 },
  circulo: { width: 30, height: 30, borderRadius: 15, backgroundColor: colores.chip, alignItems: 'center', justifyContent: 'center' },
  circuloActivo: { backgroundColor: colores.primario },
  circuloTexto: { fontWeight: '800', color: colores.primario },
  pasoNombre: { fontSize: 12, color: colores.textoSuave },
  titulo: { fontSize: 22, fontWeight: '800', color: colores.texto, marginBottom: 6 },
  texto: { color: colores.textoSuave, marginBottom: 12, lineHeight: 20 },
  linea: { flexDirection: 'row', gap: 10, backgroundColor: colores.tarjeta, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colores.borde },
  lineaTitulo: { fontWeight: '800', color: colores.texto },
  lineaSub: { color: colores.textoSuave, fontSize: 12, marginTop: 2 },
  lineaMonto: { fontWeight: '800', color: colores.texto },
  reloj: { backgroundColor: colores.chip, borderRadius: 12, padding: 12, marginBottom: 14 },
  relojUrgente: { backgroundColor: colores.errorFondo },
  relojTexto: { color: colores.primario, fontWeight: '700' },
  simulado: { backgroundColor: colores.chip, borderRadius: 12, padding: 12, marginBottom: 14 }
});
