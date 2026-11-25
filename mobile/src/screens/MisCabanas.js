import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import api, { mensajeError } from '../api/client';
import { Aviso, Boton } from '../components/Ui';
import Hoja from '../components/Hoja';
import { colores } from '../theme/colores';
import { estrellas, formatearPrecio } from '../utils/formato';

const FILTROS = [['todas', 'Todas'], ['activas', 'Activas'], ['inactivas', 'Inactivas']];

function TarjetaCabana({ cabana, onCambiarEstado, onEditar }) {
  const [rota, setRota] = useState(false);
  return (
    <View style={[estilos.tarjeta, !cabana.activa && { opacity: 0.8 }]}>
      {cabana.imagen_url && !rota ? (
        <Image source={{ uri: cabana.imagen_url }} style={estilos.imagen} onError={() => setRota(true)} />
      ) : (
        <View style={[estilos.imagen, estilos.sinImagen]}><Text style={{ color: colores.textoSuave }}>Sin imagen</Text></View>
      )}
      <View style={[estilos.estado, { backgroundColor: cabana.activa ? colores.exito : colores.textoSuave }]}>
        <Text style={estilos.estadoTexto}>{cabana.activa ? 'Activa' : 'Inactiva'}</Text>
      </View>
      <View style={estilos.info}>
        <Text style={estilos.codigo}>Cabaña #{cabana.id}</Text>
        <Text style={estilos.nombre}>{cabana.nombre}</Text>
        <Text style={estilos.ubicacion}>📍 {cabana.localidad}, {cabana.provincia}</Text>
        <View style={estilos.datos}>
          <Text style={estilos.dato}>Hasta {cabana.capacidad_personas} personas</Text>
          {cabana.total_calificaciones > 0
            ? <Text style={estilos.estrellas}>{estrellas(cabana.valoracion)} <Text style={estilos.dato}>{cabana.valoracion} ({cabana.total_calificaciones})</Text></Text>
            : <Text style={estilos.dato}>Sin calificaciones</Text>}
        </View>
        {!!cabana.metodos_pago && <Text style={estilos.dato}>Pagos: {cabana.metodos_pago}</Text>}
        <View style={estilos.pie}>
          <Text style={estilos.precio}>{formatearPrecio(cabana.precio_por_noche)} <Text style={estilos.noche}>/ noche</Text></Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => onEditar(cabana)} style={({ pressed }) => [estilos.accion, pressed && { opacity: 0.7 }]}>
              <Text style={estilos.accionTexto}>Editar</Text>
            </Pressable>
            <Pressable onPress={() => onCambiarEstado(cabana)} style={({ pressed }) => [estilos.accion, pressed && { opacity: 0.7 }]}>
              <Text style={estilos.accionTexto}>{cabana.activa ? 'Desactivar' : 'Activar'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function MisCabanas({ navigation, route }) {
  const [cabanas, setCabanas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [aviso, setAviso] = useState('');
  const [confirmando, setConfirmando] = useState(null);
  const [errorHoja, setErrorHoja] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get('/cabanas/panel');
      setCabanas(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }, []);

  // Se recarga cada vez que se vuelve a esta pantalla (por ejemplo, después de crear o editar)
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  useEffect(() => { if (route.params?.aviso) setAviso(route.params.aviso); }, [route.params?.aviso, route.params?.t]);

  const cambiarEstado = async () => {
    const c = confirmando;
    setEnviando(true); setErrorHoja('');
    try {
      // La API actualiza la cabaña completa, por eso se reenvían todos sus datos
      await api.put(`/cabanas/${c.id}`, {
        nombre: c.nombre, descripcion: c.descripcion, localidad_id: c.localidad_id,
        precio_por_noche: c.precio_por_noche, capacidad_personas: c.capacidad_personas,
        imagen_url: c.imagen_url, metodos_pago: c.metodos_pago, activa: !c.activa
      });
      setAviso(c.activa ? `"${c.nombre}" quedó inactiva y ya no se muestra en el catálogo.` : `"${c.nombre}" está activa de nuevo.`);
      setConfirmando(null);
      await cargar();
    } catch (err) {
      setErrorHoja(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  const termino = busqueda.trim().toLowerCase();
  const visibles = cabanas.filter((c) => {
    if (filtro === 'activas' && !c.activa) return false;
    if (filtro === 'inactivas' && c.activa) return false;
    return !termino || `${c.nombre} ${c.localidad} ${c.provincia}`.toLowerCase().includes(termino);
  });
  const cuenta = (f) => cabanas.filter((c) => (f === 'todas' ? true : f === 'activas' ? c.activa : !c.activa)).length;

  return (
    <>
      <ScrollView style={{ backgroundColor: colores.fondo }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} />}>
        <View style={estilos.cabecera}>
          <View style={{ flex: 1 }}>
            <Text style={estilos.titulo}>Mis cabañas</Text>
            <Text style={estilos.suave}>Administrá tu inventario de propiedades.</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('FormularioCabana')} style={({ pressed }) => [estilos.nueva, pressed && { opacity: 0.8 }]}>
            <Text style={estilos.nuevaTexto}>+ Nueva</Text>
          </Pressable>
        </View>

        <TextInput style={estilos.buscador} value={busqueda} onChangeText={setBusqueda} autoCapitalize="none"
          placeholder="Buscá por nombre, provincia o localidad..." placeholderTextColor={colores.textoSuave} />

        <View style={estilos.filtros}>
          {FILTROS.map(([k, t]) => (
            <Pressable key={k} onPress={() => setFiltro(k)} style={[estilos.filtro, filtro === k && estilos.filtroActivo]}>
              <Text style={[estilos.filtroTexto, filtro === k && { color: '#fff' }]}>{t} ({cuenta(k)})</Text>
            </Pressable>
          ))}
        </View>

        <Aviso tipo="exito" texto={aviso} />
        <Aviso texto={error} />
        {cargando && <ActivityIndicator color={colores.primario} style={{ marginVertical: 24 }} />}
        {!cargando && !error && visibles.length === 0 && (
          <View style={estilos.vacio}>
            <Text style={estilos.suave}>{cabanas.length === 0 ? 'Todavía no hay cabañas cargadas.' : 'No hay cabañas que coincidan.'}</Text>
          </View>
        )}
        {visibles.map((c) => (
          <TarjetaCabana key={c.id} cabana={c} onEditar={(x) => navigation.navigate('FormularioCabana', { id: x.id })}
            onCambiarEstado={(x) => { setErrorHoja(''); setConfirmando(x); }} />
        ))}
      </ScrollView>

      <Hoja visible={!!confirmando} titulo={confirmando?.activa ? 'Desactivar cabaña' : 'Activar cabaña'} onCerrar={() => setConfirmando(null)}>
        {confirmando && (
          <>
            <Text style={estilos.parrafo}>
              {confirmando.activa
                ? `"${confirmando.nombre}" dejará de mostrarse en el catálogo y no se podrá reservar. Las reservas existentes no se modifican.`
                : `"${confirmando.nombre}" volverá a mostrarse en el catálogo.`}
            </Text>
            <Aviso texto={errorHoja} />
            <Boton titulo="Confirmar" onPress={cambiarEstado} cargando={enviando} />
            <Boton titulo="Volver" onPress={() => setConfirmando(null)} secundario />
          </>
        )}
      </Hoja>
    </>
  );
}

const estilos = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  nueva: { backgroundColor: colores.primario, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  nuevaTexto: { color: '#fff', fontWeight: '800' },
  titulo: { fontSize: 24, fontWeight: '800', color: colores.primario },
  suave: { color: colores.textoSuave, marginTop: 2, marginBottom: 12 },
  buscador: { backgroundColor: colores.tarjeta, borderWidth: 1, borderColor: colores.borde, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colores.texto, marginBottom: 12 },
  filtros: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  filtro: { backgroundColor: colores.chip, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  filtroActivo: { backgroundColor: colores.primario },
  filtroTexto: { color: colores.primario, fontWeight: '700', fontSize: 13 },
  vacio: { backgroundColor: colores.tarjeta, borderRadius: 14, borderWidth: 1, borderColor: colores.borde, padding: 24, alignItems: 'center' },
  parrafo: { color: colores.texto, fontSize: 15, lineHeight: 22, marginBottom: 14 },

  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: colores.borde },
  imagen: { width: '100%', height: 160 },
  sinImagen: { backgroundColor: colores.chip, alignItems: 'center', justifyContent: 'center' },
  estado: { position: 'absolute', top: 10, right: 10, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  estadoTexto: { color: '#fff', fontWeight: '800', fontSize: 11 },
  info: { padding: 14 },
  codigo: { color: colores.textoSuave, fontSize: 11, fontWeight: '700' },
  nombre: { fontSize: 18, fontWeight: '800', color: colores.texto, marginVertical: 2 },
  ubicacion: { color: colores.textoSuave, marginBottom: 6 },
  datos: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  dato: { color: colores.textoSuave, fontSize: 13 },
  estrellas: { color: colores.dorado, fontSize: 13 },
  pie: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  precio: { fontSize: 18, fontWeight: '800', color: colores.primario },
  noche: { fontSize: 12, fontWeight: '400', color: colores.textoSuave },
  accion: { borderWidth: 1, borderColor: colores.primario, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  accionTexto: { color: colores.primario, fontWeight: '700' }
});
