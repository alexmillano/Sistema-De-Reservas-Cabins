import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api, { mensajeError } from '../api/client';
import { Aviso, Boton } from '../components/Ui';
import { colores } from '../theme/colores';
import { formatearPrecio } from '../utils/formato';

const ESTADO = { sin_plan: 'Sin plan pago', activo: 'Activo', pausado: 'Pausado' };

export default function Planes() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [procesando, setProcesando] = useState('');

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get('/planes');
      setDatos(data); setError('');
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const contratar = (cabana, plan) => {
    const def = datos.planes.find((p) => p.clave === plan);
    Alert.alert(`Plan ${def.nombre}`, `Se cobra ${formatearPrecio(def.precio)} por ${def.dias} días para "${cabana.nombre}" (pago simulado). ¿Confirmás?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: async () => {
        setProcesando(`${cabana.id}-${plan}`); setAviso(''); setError('');
        try {
          const { data } = await api.post(`/planes/cabanas/${cabana.id}/contratar`, { plan });
          setAviso(data.message);
          await cargar();
        } catch (err) {
          setError(mensajeError(err));
        } finally {
          setProcesando('');
        }
      } }
    ]);
  };

  return (
    <ScrollView style={{ backgroundColor: colores.fondo }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} />}>
      {cargando && <ActivityIndicator color={colores.primario} style={{ marginVertical: 20 }} />}
      <Aviso texto={error} />
      {!!aviso && <Text style={estilos.ok}>✓ {aviso}</Text>}

      {datos && (
        <>
          <Text style={estilos.titulo}>Planes disponibles</Text>
          {datos.planes.map((p) => (
            <View key={p.clave} style={estilos.plan}>
              <View style={estilos.fila}>
                <Text style={estilos.nombre}>{p.nombre}</Text>
                <Text style={estilos.precio}>{p.precio > 0 ? `${formatearPrecio(p.precio)} / ${p.dias} días` : 'Gratis'}</Text>
              </View>
              <Text style={estilos.suave}>
                {p.clave === 'free' ? 'Tu cabaña aparece en el catálogo en orden normal.'
                  : `Mejor posición en el catálogo. Requiere valoración mínima ${String(p.min_valoracion).replace('.', ',')}${p.min_calificaciones ? `, al menos ${p.min_calificaciones} calificaciones y sin reclamos sin responder` : ''}.`}
              </Text>
            </View>
          ))}

          <Text style={estilos.titulo}>Mis cabañas</Text>
          {datos.cabanas.length === 0 && <Text style={estilos.suave}>Todavía no tenés cabañas.</Text>}
          {datos.cabanas.map((c) => (
            <View key={c.id} style={estilos.cabana}>
              <Text style={estilos.nombre}>{c.nombre}</Text>
              <Text style={estilos.suave}>★ {c.valoracion} ({c.total_calificaciones} calificaciones) · {c.reclamos_sin_responder} reclamos sin responder</Text>
              <Text style={estilos.linea}>Plan actual: <Text style={{ fontWeight: '800' }}>{String(c.plan_actual).toUpperCase()}</Text> · {ESTADO[c.estado]}</Text>
              {c.plan_contratado && <Text style={estilos.suave}>Contratado: {c.plan_contratado.toUpperCase()} · vence {c.vence} ({c.dias_restantes} días)</Text>}
              {!!c.motivo_pausa && <Text style={estilos.pausa}>{c.motivo_pausa}</Text>}
              {!c.activa && <Text style={estilos.pausa}>Cabaña desactivada: activala para contratar un plan.</Text>}
              {['plus', 'premium'].map((k) => {
                const def = datos.planes.find((p) => p.clave === k);
                const req = c.puede[k];
                return (
                  <View key={k} style={{ marginTop: 8 }}>
                    <Boton titulo={`${c.plan_contratado === k ? 'Renovar' : 'Contratar'} ${def.nombre} · ${formatearPrecio(def.precio)}`}
                      secundario={k === 'plus'} cargando={procesando === `${c.id}-${k}`}
                      deshabilitado={!c.activa || !req.ok || !!procesando} onPress={() => contratar(c, k)} />
                    {!req.ok && <Text style={estilos.pausa}>{req.motivo}</Text>}
                  </View>
                );
              })}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: 18, fontWeight: '800', color: colores.primario, marginTop: 8, marginBottom: 10 },
  suave: { color: colores.textoSuave, fontSize: 13, marginTop: 2 },
  ok: { backgroundColor: '#e6f4ea', color: '#1e6b32', padding: 10, borderRadius: 10, marginBottom: 10, fontWeight: '700' },
  plan: { backgroundColor: colores.tarjeta, borderRadius: 12, borderWidth: 1, borderColor: colores.borde, padding: 12, marginBottom: 10 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nombre: { fontWeight: '800', fontSize: 16, color: colores.texto },
  precio: { color: colores.primario, fontWeight: '800' },
  cabana: { backgroundColor: colores.tarjeta, borderRadius: 14, borderWidth: 1, borderColor: colores.borde, padding: 14, marginBottom: 12 },
  linea: { color: colores.texto, marginTop: 6, fontSize: 14 },
  pausa: { color: colores.error, fontSize: 12.5, marginTop: 4 }
});
