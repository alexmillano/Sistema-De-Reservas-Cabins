import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colores } from '../theme/colores';
import { estrellas, formatearPrecio } from '../utils/formato';

export default function CabanaCard({ cabana, onPress }) {
  const [rota, setRota] = useState(false);
  const total = Number(cabana.total_calificaciones) || 0;
  const valoracion = Number(cabana.valoracion) || 0;

  return (
    <Pressable onPress={onPress} style={estilos.tarjeta}>
      {cabana.imagen_url && !rota ? (
        <Image source={{ uri: cabana.imagen_url }} style={estilos.imagen} onError={() => setRota(true)} />
      ) : (
        <View style={[estilos.imagen, estilos.sinImagen]}><Text style={{ color: colores.textoSuave }}>Sin imagen</Text></View>
      )}
      {(cabana.plan === 'premium' || cabana.plan === 'plus') && (
        <View style={[estilos.insignia, cabana.plan === 'premium' && { backgroundColor: colores.dorado }]}>
          <Text style={estilos.insigniaTexto}>{cabana.plan === 'premium' ? '★ Destacada' : 'Plus'}</Text>
        </View>
      )}
      <View style={estilos.info}>
        <View style={estilos.fila}>
          <Text style={estilos.nombre} numberOfLines={1}>{cabana.nombre}</Text>
          {total > 0 && (
            <View style={estilos.puntaje}>
              <Text style={estilos.puntajeTexto}>★ {valoracion.toFixed(1)} ({total})</Text>
            </View>
          )}
        </View>
        <Text style={estilos.ubicacion}>📍 {cabana.localidad}, {cabana.provincia}</Text>
        <Text style={estilos.descripcion} numberOfLines={2}>{cabana.descripcion}</Text>
        <Text style={estilos.datos}>Hasta {cabana.capacidad_personas} personas</Text>
        <View style={estilos.pie}>
          <View>
            <Text style={estilos.etiquetaPrecio}>TARIFA POR NOCHE</Text>
            <Text style={estilos.precio}>{formatearPrecio(cabana.precio_por_noche)} <Text style={estilos.noche}>/ noche</Text></Text>
          </View>
          <View style={estilos.boton}><Text style={estilos.botonTexto}>Ver detalle</Text></View>
        </View>
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: colores.borde },
  imagen: { width: '100%', height: 190 },
  sinImagen: { backgroundColor: colores.chip, alignItems: 'center', justifyContent: 'center' },
  insignia: { position: 'absolute', top: 12, left: 12, backgroundColor: colores.nav, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  insigniaTexto: { color: '#fff', fontWeight: '700', fontSize: 12 },
  info: { padding: 14 },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  nombre: { flex: 1, fontSize: 18, fontWeight: '800', color: colores.texto },
  puntaje: { backgroundColor: colores.chip, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  puntajeTexto: { color: colores.primario, fontWeight: '700', fontSize: 12 },
  ubicacion: { color: colores.textoSuave, marginTop: 4 },
  descripcion: { color: colores.texto, marginTop: 6, lineHeight: 19 },
  datos: { color: colores.textoSuave, marginTop: 6, fontSize: 13 },
  pie: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12 },
  etiquetaPrecio: { fontSize: 10, color: colores.textoSuave, letterSpacing: 0.5 },
  precio: { fontSize: 22, fontWeight: '800', color: colores.texto },
  noche: { fontSize: 13, fontWeight: '400', color: colores.textoSuave },
  boton: { backgroundColor: colores.primario, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11 },
  botonTexto: { color: '#fff', fontWeight: '700' }
});
