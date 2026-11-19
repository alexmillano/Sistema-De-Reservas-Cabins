import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import api, { mensajeError } from '../api/client';
import { Aviso, Boton } from '../components/Ui';
import { colores } from '../theme/colores';
import { estrellas, formatearFecha, formatearPrecio } from '../utils/formato';

const POR_PAGINA = 5;

export default function DetalleCabana({ route, navigation }) {
  const { id } = route.params;
  const [cabana, setCabana] = useState(null);
  const [opiniones, setOpiniones] = useState([]);
  const [hayMas, setHayMas] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState('');
  const [errorMas, setErrorMas] = useState('');
  const [imagenRota, setImagenRota] = useState(false);

  useEffect(() => {
    let activo = true;
    Promise.all([
      api.get(`/cabanas/${id}`),
      api.get(`/opiniones/cabana/${id}`, { params: { pagina: 1, limite: POR_PAGINA } })
    ])
      .then(([cab, op]) => {
        if (!activo) return;
        setCabana(cab.data);
        setOpiniones(op.data.opiniones);
        setHayMas(op.data.opiniones.length === POR_PAGINA);
      })
      .catch((err) => {
        if (!activo) return;
        setError(err.response?.status === 404 ? 'Esta cabaña ya no está disponible.' : mensajeError(err));
      })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [id]);

  useEffect(() => { if (cabana) navigation.setOptions({ title: cabana.nombre }); }, [cabana, navigation]);

  const verMas = useCallback(async () => {
    setCargandoMas(true);
    setErrorMas('');
    try {
      const siguiente = pagina + 1;
      const { data } = await api.get(`/opiniones/cabana/${id}`, { params: { pagina: siguiente, limite: POR_PAGINA } });
      setOpiniones((o) => [...o, ...data.opiniones]);
      setHayMas(data.opiniones.length === POR_PAGINA);
      setPagina(siguiente);
    } catch (err) {
      setErrorMas(mensajeError(err));
    } finally {
      setCargandoMas(false);
    }
  }, [id, pagina]);

  if (cargando) return <ActivityIndicator color={colores.primario} style={{ marginTop: 60 }} />;
  if (!cabana) return <View style={{ padding: 24 }}><Aviso texto={error || 'No se pudo cargar la cabaña'} /></View>;

  const total = Number(cabana.total_calificaciones) || 0;
  const metodos = cabana.metodos_pago ? cabana.metodos_pago.split(',').map((m) => m.trim()).filter(Boolean) : [];

  return (
    <ScrollView style={{ backgroundColor: colores.fondo }} contentContainerStyle={{ paddingBottom: 32 }}>
      {cabana.imagen_url && !imagenRota ? (
        <Image source={{ uri: cabana.imagen_url }} style={estilos.imagen} onError={() => setImagenRota(true)} />
      ) : (
        <View style={[estilos.imagen, estilos.sinImagen]}><Text style={{ color: colores.textoSuave }}>Sin imagen</Text></View>
      )}

      <View style={{ padding: 16 }}>
        <Text style={estilos.titulo}>{cabana.nombre}</Text>
        <Text style={estilos.ubicacion}>📍 {cabana.localidad}, {cabana.provincia}</Text>
        <Text style={estilos.linea}>
          {total > 0 ? `${estrellas(cabana.valoracion)}  ${Number(cabana.valoracion).toFixed(1)} (${total} calificaciones)` : 'Sin calificaciones todavía'}
        </Text>
        <Text style={estilos.linea}>👥 Hasta {cabana.capacidad_personas} personas</Text>

        <View style={estilos.cajaPrecio}>
          <Text style={estilos.precio}>{formatearPrecio(cabana.precio_por_noche)} <Text style={estilos.noche}>/ noche</Text></Text>
          <Boton titulo="Reservar (próximo lote)" onPress={() => {}} deshabilitado />
        </View>

        <Text style={estilos.seccion}>Descripción</Text>
        <Text style={estilos.texto}>{cabana.descripcion}</Text>

        {metodos.length > 0 && (
          <>
            <Text style={estilos.seccion}>Medios de pago</Text>
            <View style={estilos.chips}>
              {metodos.map((m) => <View key={m} style={estilos.chip}><Text style={estilos.chipTexto}>{m}</Text></View>)}
            </View>
          </>
        )}

        <Text style={estilos.seccion}>Opiniones</Text>
        {opiniones.length === 0 && <Text style={estilos.texto}>Todavía no hay opiniones.</Text>}
        {opiniones.map((o) => (
          <View key={o.id} style={estilos.opinion}>
            <View style={estilos.opinionCab}>
              <Text style={{ fontWeight: '700', color: colores.texto }}>{o.autor}</Text>
              {o.puntaje ? <Text style={{ color: colores.dorado }}>{estrellas(o.puntaje)}</Text> : null}
            </View>
            <Text style={estilos.texto}>{o.contenido}</Text>
            <Text style={estilos.fecha}>{formatearFecha(o.created_at)}</Text>
          </View>
        ))}
        <Aviso texto={errorMas} />
        {hayMas && <Boton titulo="Ver más opiniones" onPress={verMas} cargando={cargandoMas} secundario />}
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  imagen: { width: '100%', height: 240 },
  sinImagen: { backgroundColor: colores.chip, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 26, fontWeight: '800', color: colores.texto },
  ubicacion: { color: colores.nav, marginTop: 4, fontWeight: '600' },
  linea: { color: colores.textoSuave, marginTop: 6 },
  cajaPrecio: { backgroundColor: colores.tarjeta, borderRadius: 14, borderWidth: 1, borderColor: colores.borde, padding: 14, marginTop: 16 },
  precio: { fontSize: 26, fontWeight: '800', color: colores.texto },
  noche: { fontSize: 14, fontWeight: '400', color: colores.textoSuave },
  seccion: { fontSize: 19, fontWeight: '800', color: colores.primario, marginTop: 20, marginBottom: 8 },
  texto: { color: colores.texto, lineHeight: 21 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colores.chip, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  chipTexto: { color: colores.primario, fontSize: 13 },
  opinion: { backgroundColor: colores.tarjeta, borderRadius: 12, borderWidth: 1, borderColor: colores.borde, padding: 12, marginBottom: 10 },
  opinionCab: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  fecha: { color: colores.textoSuave, fontSize: 12, marginTop: 6 }
});
