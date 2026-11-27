import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import api, { mensajeError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Aviso } from '../components/Ui';
import CabanaCard from '../components/CabanaCard';
import { colores } from '../theme/colores';

const SERVICIOS = [
  { icono: '🔎', titulo: 'Catálogo con filtros', texto: 'Encontrá la cabaña ideal filtrando por provincia, localidad, precio y valoración.' },
  { icono: '💳', titulo: 'Reserva y pago online', texto: 'Elegí fechas y personas, y pagá en pocos pasos con tarjeta (pago simulado en esta versión).' },
  { icono: '💬', titulo: 'Soporte por chat', texto: 'Si tenés un inconveniente con una reserva, hablá directamente con el dueño desde tu cuenta.' },
  { icono: '⭐', titulo: 'Opiniones reales', texto: 'Solo califican quienes completaron una estadía, así elegís con total tranquilidad.' }
];

const PASOS = [
  { titulo: 'Creá tu cuenta o iniciá sesión', texto: 'Registrate en segundos para acceder al catálogo completo y guardar tus cabañas en el carrito.', nota: '👤  Acceso inmediato' },
  { titulo: 'Elegí la cabaña, las fechas y la cantidad de personas', texto: 'El sistema verifica la disponibilidad al instante y calcula el total de tu estadía.', nota: '📅  Calendario sincronizado' },
  { titulo: 'Pagá de forma segura', texto: 'Confirmá el pago con tu tarjeta. Mientras pagás, las fechas quedan reservadas para vos unos minutos.', nota: '🛡️  Datos protegidos' },
  { titulo: 'Seguí tu reserva desde Mis reservas', texto: 'Consultá el estado, modificá las fechas o cancelá, y calificá tu estadía al terminar.', nota: '✔️  Todo en un solo lugar' }
];

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
  const [mejores, setMejores] = useState([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const scroll = useRef(null);
  const yComo = useRef(0);

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [d, p, m] = await Promise.all([
        api.get('/cabanas/destacadas'), api.get('/provincias'), api.get('/cabanas/mejores').catch(() => ({ data: [] }))
      ]);
      setDestacadas(Array.isArray(d.data) ? d.data : []);
      setProvincias(Array.isArray(p.data) ? p.data : []);
      setMejores(Array.isArray(m.data) ? m.data : []);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const totalCabanas = provincias.reduce((n, p) => n + (p.cabanas || 0), 0);
  const conCabanas = provincias.filter((p) => p.cabanas > 0).length;
  const fotoSomos = destacadas.find((c) => c.imagen_url)?.imagen_url || mejores.find((c) => c.imagen_url)?.imagen_url;

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

      {/* Nuestra filosofía (Quiénes somos) */}
      <View style={estilos.bloque}>
        <Text style={estilos.eyebrow}>NUESTRA FILOSOFÍA</Text>
        <Text style={estilos.titulo}>El arte de pausar el reloj sin alejarte de la ciudad.</Text>
        <Text style={estilos.parrafo}>
          En Cabins reinventamos las escapadas de fin de semana. Fusionamos la pureza de la madera, la arquitectura rústica y la
          sofisticación del confort moderno: ventanales envolventes, estufas a leña, hidromasajes y vistas que te hacen olvidar
          el apuro. Cabañas de toda la Argentina, a pocas horas de donde estés.
        </Text>
        <Text style={[estilos.parrafo, { marginTop: 10 }]}>
          Cada dueño publica y gestiona sus propias cabañas, y vos reservás con atención directa y opiniones de personas que
          realmente se hospedaron.
        </Text>
        {!!fotoSomos && (
          <View style={estilos.fotoSomosCaja}>
            <Image source={{ uri: fotoSomos }} style={estilos.fotoSomos} />
            <View style={estilos.sello}>
              <Text style={{ fontSize: 16 }}>🛡️</Text>
              <View><Text style={estilos.selloTitulo}>Reservas seguras</Text><Text style={estilos.selloTexto}>Pago y fechas protegidos</Text></View>
            </View>
          </View>
        )}
        <View style={estilos.cifras}>
          <View style={estilos.cifra}><Text style={estilos.cifraNum}>{totalCabanas}</Text><Text style={estilos.cifraTexto}>Cabañas publicadas</Text></View>
          <View style={estilos.cifra}><Text style={estilos.cifraNum}>{conCabanas}</Text><Text style={estilos.cifraTexto}>Provincias con cabañas</Text></View>
          <View style={estilos.cifra}><Text style={estilos.cifraNum}>100%</Text><Text style={estilos.cifraTexto}>Reserva y pago online</Text></View>
        </View>
      </View>

      {/* Nuestros servicios */}
      <Text style={[estilos.eyebrow, { marginTop: 28 }]}>EXPERIENCIA SIN FRICCIONES</Text>
      <Text style={estilos.titulo}>Nuestros servicios</Text>
      <Text style={[estilos.suave, { marginBottom: 12 }]}>Herramientas para que planificar tu escapada sea tan placentero como el viaje mismo.</Text>
      {SERVICIOS.map((sv) => (
        <View key={sv.titulo} style={estilos.servicioFila}>
          <View style={estilos.servicioIcono}><Text style={{ fontSize: 20 }}>{sv.icono}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={estilos.servicioTitulo}>{sv.titulo}</Text>
            <Text style={estilos.servicioTexto}>{sv.texto}</Text>
          </View>
        </View>
      ))}

      {/* Dónde estamos */}
      {provincias.length > 0 && (
        <>
          <Text style={[estilos.eyebrow, { marginTop: 28 }]}>PRESENCIA FEDERAL</Text>
          <Text style={estilos.titulo}>¿Dónde estamos?</Text>
          <Text style={[estilos.suave, { marginBottom: 12 }]}>Tenemos cabañas en las provincias de todo el país.</Text>
          <View style={estilos.chips}>
            {provincias.map((p) => (
              <View key={p.id} style={[estilos.chip, !p.cabanas && { opacity: 0.55 }]}>
                <Text style={estilos.chipTexto}>📍 {p.nombre}</Text>
                {p.cabanas > 0 && <View style={estilos.chipNum}><Text style={estilos.chipNumTexto}>{p.cabanas}</Text></View>}
              </View>
            ))}
          </View>

          {mejores.length > 0 && (
            <>
              <Text style={estilos.subtitulo}>Las cabañas mejor valoradas</Text>
              {mejores.map((c) => (
                <Pressable key={c.id} onPress={() => navigation.navigate('DetalleCabana', { id: c.id })} style={({ pressed }) => [estilos.mejor, pressed && { opacity: 0.9 }]}>
                  {c.imagen_url
                    ? <Image source={{ uri: c.imagen_url }} style={StyleSheet.absoluteFill} />
                    : <View style={[StyleSheet.absoluteFill, { backgroundColor: colores.nav }]} />}
                  <View style={estilos.mejorVelo} />
                  <View style={estilos.mejorInfo}>
                    <Text style={estilos.mejorUbic}>{c.localidad}, {c.provincia}</Text>
                    <Text style={estilos.mejorNombre}>{c.nombre}</Text>
                    <Text style={estilos.mejorDato}>
                      {c.total_calificaciones > 0 ? `★ ${Number(c.valoracion).toFixed(1)} (${c.total_calificaciones})` : 'Nueva en Cabins'} · Hasta {c.capacidad_personas} personas
                    </Text>
                  </View>
                </Pressable>
              ))}
            </>
          )}
        </>
      )}

      {/* Cómo alquilar */}
      <View onLayout={(e) => { yComo.current = e.nativeEvent.layout.y; }}>
        <Text style={[estilos.eyebrow, { marginTop: 28 }]}>PASO A PASO</Text>
        <Text style={estilos.titulo}>¿Cómo alquilar en Cabins?</Text>
        <Text style={[estilos.suave, { marginBottom: 12 }]}>Tu próximo descanso en cuatro pasos claros, rápidos y transparentes.</Text>
        {PASOS.map((p, i) => (
          <View key={p.titulo} style={estilos.pasoTarjeta}>
            <View style={estilos.pasoNumero}><Text style={estilos.pasoNumeroTexto}>{i + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={estilos.pasoEyebrow}>{['PRIMER', 'SEGUNDO', 'TERCER', 'CUARTO'][i]} PASO</Text>
              <Text style={estilos.pasoTitulo}>{p.titulo}</Text>
              <Text style={estilos.pasoTexto}>{p.texto}</Text>
              <Text style={estilos.pasoNota}>{p.nota}</Text>
            </View>
          </View>
        ))}

        <View style={estilos.cta}>
          <Text style={estilos.ctaTitulo}>¿Listo para tu próxima escapada?</Text>
          <Text style={estilos.ctaTexto}>Explorá todas las opciones de cabañas disponibles ahora mismo.</Text>
          <Pressable onPress={() => navigation.navigate('Catalogo')} style={({ pressed }) => [estilos.ctaBoton, pressed && { opacity: 0.85 }]}>
            <Text style={estilos.ctaBotonTexto}>Explorar cabañas  →</Text>
          </Pressable>
        </View>
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
  eyebrow: { color: '#8a4b2a', fontSize: 11.5, fontWeight: '800', letterSpacing: 1.6, marginBottom: 6 },
  titulo: { fontSize: 24, fontWeight: '800', color: colores.primario, marginBottom: 8 },
  subtitulo: { fontSize: 16, fontWeight: '800', color: colores.primario, marginTop: 18, marginBottom: 10, textAlign: 'center' },
  suave: { color: colores.textoSuave, fontSize: 13.5, lineHeight: 19 },
  parrafo: { color: colores.texto, fontSize: 15, lineHeight: 23 },

  bloque: { backgroundColor: '#fbefe3', borderRadius: 20, padding: 18, marginTop: 22 },
  fotoSomosCaja: { height: 190, borderRadius: 16, overflow: 'hidden', marginTop: 16, backgroundColor: colores.nav },
  fotoSomos: { width: '100%', height: '100%' },
  sello: { position: 'absolute', left: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  selloTitulo: { fontSize: 12.5, fontWeight: '800', color: colores.primario },
  selloTexto: { fontSize: 11, color: colores.textoSuave },
  cifras: { flexDirection: 'row', gap: 8, marginTop: 16 },
  cifra: { flex: 1 },
  cifraNum: { fontSize: 24, fontWeight: '800', color: '#3a1e12' },
  cifraTexto: { fontSize: 11.5, color: colores.textoSuave, marginTop: 2 },

  servicioFila: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colores.tarjeta, borderRadius: 16, borderWidth: 1, borderColor: colores.borde, padding: 14, marginBottom: 10 },
  servicioIcono: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f6dcc6', alignItems: 'center', justifyContent: 'center' },
  servicioTitulo: { fontSize: 15, fontWeight: '800', color: colores.texto, marginBottom: 2 },
  servicioTexto: { fontSize: 13, color: colores.textoSuave, lineHeight: 19 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ecdfce', borderRadius: 18, paddingLeft: 12, paddingRight: 6, paddingVertical: 6 },
  chipTexto: { color: colores.primario, fontSize: 13 },
  chipNum: { backgroundColor: '#f6dcc6', borderRadius: 10, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  chipNumTexto: { color: '#8a4b2a', fontSize: 12, fontWeight: '800' },

  mejor: { height: 210, borderRadius: 18, overflow: 'hidden', marginBottom: 12, justifyContent: 'flex-end', backgroundColor: colores.nav },
  mejorVelo: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20,10,5,0.42)' },
  mejorInfo: { padding: 14 },
  mejorUbic: { color: '#f3e6d8', fontSize: 11.5, letterSpacing: 0.8, textTransform: 'uppercase' },
  mejorNombre: { color: '#fff', fontSize: 19, fontWeight: '800', marginVertical: 2 },
  mejorDato: { color: '#f3e6d8', fontSize: 13 },

  pasoTarjeta: { flexDirection: 'row', gap: 14, backgroundColor: colores.tarjeta, borderRadius: 16, borderWidth: 1, borderColor: colores.borde, padding: 14, marginBottom: 10 },
  pasoNumero: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#3a1e12', alignItems: 'center', justifyContent: 'center' },
  pasoNumeroTexto: { color: '#fff', fontWeight: '800', fontSize: 16 },
  pasoEyebrow: { color: '#8a4b2a', fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, marginBottom: 3 },
  pasoTitulo: { fontSize: 15.5, fontWeight: '800', color: colores.texto, marginBottom: 4 },
  pasoTexto: { fontSize: 13, color: colores.textoSuave, lineHeight: 19 },
  pasoNota: { fontSize: 12.5, color: '#8a4b2a', fontWeight: '700', marginTop: 8 },

  cta: { backgroundColor: '#3a1e12', borderRadius: 20, padding: 20, marginTop: 8 },
  ctaTitulo: { color: '#fff', fontSize: 19, fontWeight: '800' },
  ctaTexto: { color: '#e7d6c5', fontSize: 13.5, lineHeight: 19, marginTop: 6, marginBottom: 14 },
  ctaBoton: { backgroundColor: '#fff4e6', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  ctaBotonTexto: { color: '#3a1e12', fontWeight: '800', fontSize: 15 }
});
