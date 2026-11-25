import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import api, { mensajeError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Aviso } from '../components/Ui';
import CabanaCard from '../components/CabanaCard';
import { colores } from '../theme/colores';

const SERVICIOS = [
  { icono: '🔎', titulo: 'Catálogo con filtros', texto: 'Buscá por provincia, localidad, precio y valoración.' },
  { icono: '💳', titulo: 'Reserva y pago online', texto: 'Elegí fechas y personas, y pagá en pocos pasos (pago simulado en esta versión).' },
  { icono: '💬', titulo: 'Soporte por chat', texto: 'Hablá directamente con el dueño si tenés un inconveniente.' },
  { icono: '⭐', titulo: 'Opiniones reales', texto: 'Solo califican quienes completaron una estadía.' }
];

const PASOS = [
  'Creá tu cuenta o iniciá sesión.',
  'Elegí la cabaña, las fechas y la cantidad de personas.',
  'Pagá de forma segura.',
  'Seguí tu reserva desde Mis reservas.'
];

// Agrupación de provincias por región, solo para mostrarlas más ordenadas
const REGIONES = [
  { nombre: 'Patagonia', icono: '🏔️', provincias: ['neuquen', 'rio negro', 'chubut', 'santa cruz', 'tierra del fuego'] },
  { nombre: 'Cuyo', icono: '🍇', provincias: ['mendoza', 'san juan', 'san luis', 'la rioja'] },
  { nombre: 'Sierras', icono: '⛰️', provincias: ['cordoba'] },
  { nombre: 'Norte', icono: '🌵', provincias: ['jujuy', 'salta', 'tucuman', 'catamarca', 'santiago del estero', 'chaco', 'formosa'] },
  { nombre: 'Litoral', icono: '🌿', provincias: ['misiones', 'corrientes', 'entre rios', 'santa fe'] },
  { nombre: 'Pampa y Buenos Aires', icono: '🌾', provincias: ['buenos aires', 'ciudad autonoma de buenos aires', 'la pampa'] }
];
const normalizar = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function agruparRegiones(provincias) {
  const usadas = new Set();
  const grupos = REGIONES.map((r) => {
    const lista = provincias.filter((p) => r.provincias.includes(normalizar(p.nombre)));
    lista.forEach((p) => usadas.add(p.id));
    return { ...r, lista };
  }).filter((g) => g.lista.length > 0);
  const otras = provincias.filter((p) => !usadas.has(p.id));
  if (otras.length) grupos.push({ nombre: 'Otras', icono: '📍', lista: otras });
  return grupos;
}

function Banner({ user, onExplorar, onComoFunciona }) {
  return (
    <View style={estilos.banner}>
      {/* Escena decorativa: sol, montañas y pinos */}
      <View style={estilos.sol} />
      <View style={[estilos.monte, { left: -30, borderBottomColor: '#3b2414', borderLeftWidth: 110, borderRightWidth: 110, borderBottomWidth: 120 }]} />
      <View style={[estilos.monte, { right: -40, borderBottomColor: '#4a2c17', borderLeftWidth: 130, borderRightWidth: 130, borderBottomWidth: 150 }]} />
      <Text style={estilos.pinos}>🌲 🌲 🌲 🌲 🌲</Text>

      <View style={estilos.bannerContenido}>
        <Text style={estilos.saludo}>¡Hola, {user.nombre}! 👋</Text>
        <View style={estilos.chipBanner}>
          <View style={estilos.punto} />
          <Text style={estilos.chipBannerTexto}>Refugios en la naturaleza argentina</Text>
        </View>
        <Text style={estilos.bannerTitulo}>El fuego está prendido. Tu cabaña te está <Text style={{ color: '#f2c45a', fontStyle: 'italic' }}>esperando</Text>.</Text>
        <Text style={estilos.bannerTexto}>
          Olor a leña, una manta y el silencio de la montaña. Dejá la ciudad atrás y despertate frente a los paisajes más lindos de Argentina.
        </Text>
        <View style={estilos.botones}>
          <Pressable onPress={onExplorar} style={({ pressed }) => [estilos.btnPrimario, pressed && { opacity: 0.85 }]}>
            <Text style={estilos.btnPrimarioTexto}>Explorar cabañas  →</Text>
          </Pressable>
          <Pressable onPress={onComoFunciona} style={({ pressed }) => [estilos.btnSecundario, pressed && { opacity: 0.85 }]}>
            <Text style={estilos.btnSecundarioTexto}>Cómo funciona</Text>
          </Pressable>
        </View>
        <Text style={estilos.regiones}>Patagonia · Cuyo · Sierras · Norte</Text>
      </View>
    </View>
  );
}

export default function Inicio({ navigation }) {
  const { user } = useAuth();
  const [destacadas, setDestacadas] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const scroll = useRef(null);
  const yComo = useRef(0);

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [d, p] = await Promise.all([api.get('/cabanas/destacadas'), api.get('/provincias')]);
      setDestacadas(Array.isArray(d.data) ? d.data : []);
      setProvincias(Array.isArray(p.data) ? p.data : []);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const regiones = agruparRegiones(provincias);

  return (
    <ScrollView
      ref={scroll}
      style={{ backgroundColor: colores.fondo }}
      contentContainerStyle={estilos.contenido}
      refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} />}
    >
      <Banner
        user={user}
        onExplorar={() => navigation.navigate('Catalogo')}
        onComoFunciona={() => scroll.current?.scrollTo({ y: yComo.current, animated: true })}
      />

      <Aviso texto={error} />
      {cargando && <ActivityIndicator color={colores.primario} style={{ marginVertical: 20 }} />}

      {destacadas.length > 0 && (
        <>
          <Text style={estilos.seccion}>Cabañas destacadas</Text>
          {destacadas.map((c) => (
            <CabanaCard key={c.id} cabana={c} onPress={() => navigation.navigate('DetalleCabana', { id: c.id })} />
          ))}
        </>
      )}

      <Text style={estilos.seccion}>Quiénes somos</Text>
      <View style={estilos.tarjeta}>
        <Text style={estilos.tarjetaIcono}>🏡</Text>
        <Text style={estilos.parrafo}>
          Cabins es una plataforma que reúne cabañas de toda la Argentina en un solo lugar. Queremos que reservar una
          escapada sea simple, seguro y sin vueltas, con atención directa y opiniones de personas que realmente se hospedaron.
        </Text>
      </View>

      <Text style={estilos.seccion}>Nuestros servicios</Text>
      <View style={estilos.grilla}>
        {SERVICIOS.map((s) => (
          <View key={s.titulo} style={estilos.servicio}>
            <Text style={estilos.servicioIcono}>{s.icono}</Text>
            <Text style={estilos.servicioTitulo}>{s.titulo}</Text>
            <Text style={estilos.servicioTexto}>{s.texto}</Text>
          </View>
        ))}
      </View>

      {regiones.length > 0 && (
        <>
          <Text style={estilos.seccion}>Dónde estamos</Text>
          <View style={estilos.dondeCab}>
            <Text style={estilos.dondeIcono}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={estilos.dondeTitulo}>Cabañas en todo el país</Text>
              <Text style={estilos.dondeTexto}>{provincias.length} provincias para elegir tu próximo destino.</Text>
            </View>
          </View>
          {regiones.map((g) => (
            <View key={g.nombre} style={estilos.region}>
              <View style={estilos.regionCab}>
                <Text style={estilos.regionIcono}>{g.icono}</Text>
                <Text style={estilos.regionNombre}>{g.nombre}</Text>
              </View>
              <View style={estilos.chips}>
                {g.lista.map((p) => (
                  <View key={p.id} style={estilos.chip}><Text style={estilos.chipTexto}>{p.nombre}</Text></View>
                ))}
              </View>
            </View>
          ))}
        </>
      )}

      <View onLayout={(e) => { yComo.current = e.nativeEvent.layout.y; }}>
        <Text style={estilos.seccion}>¿Cómo alquilar?</Text>
        {PASOS.map((texto, i) => (
          <View key={texto} style={estilos.paso}>
            <View style={estilos.pasoNumero}><Text style={estilos.pasoNumeroTexto}>{i + 1}</Text></View>
            <Text style={estilos.pasoTexto}>{texto}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: 16, paddingBottom: 32 },
  banner: { backgroundColor: '#2b1a0e', borderRadius: 20, overflow: 'hidden', marginBottom: 6 },
  sol: { position: 'absolute', top: -40, right: -40, width: 170, height: 170, borderRadius: 85, backgroundColor: '#AF8606', opacity: 0.28 },
  monte: { position: 'absolute', bottom: 0, width: 0, height: 0, backgroundColor: 'transparent', borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  pinos: { position: 'absolute', bottom: 4, left: 0, right: 0, textAlign: 'center', fontSize: 26, opacity: 0.55, letterSpacing: 6 },
  bannerContenido: { padding: 20, paddingBottom: 56 },
  saludo: { color: '#f3e6d8', fontSize: 14, marginBottom: 10 },
  chipBanner: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 12 },
  punto: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f2c45a' },
  chipBannerTexto: { color: '#f3e6d8', fontSize: 12, fontWeight: '600' },
  bannerTitulo: { color: '#fff', fontSize: 26, fontWeight: '800', lineHeight: 32 },
  bannerTexto: { color: '#e7d6c5', fontSize: 14, lineHeight: 20, marginVertical: 12 },
  botones: { gap: 10, marginTop: 4 },
  btnPrimario: { backgroundColor: '#AF8606', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  btnPrimarioTexto: { color: '#fff', fontWeight: '800', fontSize: 15 },
  btnSecundario: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.6)', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnSecundarioTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
  regiones: { color: '#d8c3ac', fontSize: 12, marginTop: 14, letterSpacing: 0.5 },

  seccion: { fontSize: 20, fontWeight: '800', color: colores.primario, marginTop: 22, marginBottom: 10 },
  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: 14, borderWidth: 1, borderColor: colores.borde, padding: 16 },
  tarjetaIcono: { fontSize: 28, marginBottom: 6 },
  parrafo: { color: colores.texto, fontSize: 15, lineHeight: 22 },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  servicio: { width: '48.5%', backgroundColor: colores.tarjeta, borderRadius: 14, borderWidth: 1, borderColor: colores.borde, padding: 14 },
  servicioIcono: { fontSize: 26, marginBottom: 6 },
  servicioTitulo: { fontSize: 14, fontWeight: '800', color: colores.primario, marginBottom: 4 },
  servicioTexto: { fontSize: 12.5, color: colores.textoSuave, lineHeight: 18 },

  dondeCab: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colores.nav, borderRadius: 14, padding: 16, marginBottom: 10 },
  dondeIcono: { fontSize: 30 },
  dondeTitulo: { color: '#fff', fontSize: 16, fontWeight: '800' },
  dondeTexto: { color: '#f3e6d8', fontSize: 13, marginTop: 2 },
  region: { backgroundColor: colores.tarjeta, borderRadius: 14, borderWidth: 1, borderColor: colores.borde, padding: 14, marginBottom: 10 },
  regionCab: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  regionIcono: { fontSize: 20 },
  regionNombre: { fontSize: 15, fontWeight: '800', color: colores.primario },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colores.chip, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipTexto: { color: colores.primario, fontSize: 13 },

  paso: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colores.tarjeta, borderRadius: 14, borderWidth: 1, borderColor: colores.borde, padding: 14, marginBottom: 8 },
  pasoNumero: { width: 32, height: 32, borderRadius: 16, backgroundColor: colores.primario, alignItems: 'center', justifyContent: 'center' },
  pasoNumeroTexto: { color: '#fff', fontWeight: '800' },
  pasoTexto: { flex: 1, color: colores.texto, fontSize: 14.5, lineHeight: 20 }
});
