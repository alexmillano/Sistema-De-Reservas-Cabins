import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import api, { mensajeError } from '../api/client';
import { Aviso, Boton } from './Ui';
import { colores } from '../theme/colores';

const EXTENSION = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_MB = 5;
export const MAX_FOTOS = 10;

// Galería de la cabaña (hasta 10 fotos). La primera es la portada del catálogo.
export default function GaleriaEditor({ fotos, onCambio }) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');

  const agregar = async () => {
    setError('');
    const lugar = MAX_FOTOS - fotos.length;
    if (lugar <= 0) return setError(`Ya cargaste el máximo de ${MAX_FOTOS} fotos.`);
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.7, allowsMultipleSelection: true, selectionLimit: lugar
    });
    if (res.canceled || !res.assets?.length) return;

    setSubiendo(true);
    const avisos = [];
    const nuevas = [];
    for (const foto of res.assets.slice(0, lugar)) {
      const tipo = foto.mimeType || 'image/jpeg';
      if (!EXTENSION[tipo]) { avisos.push('Una foto no es JPG, PNG o WEBP y se descartó.'); continue; }
      if (foto.fileSize && foto.fileSize > MAX_MB * 1024 * 1024) { avisos.push(`Una foto pesa más de ${MAX_MB} MB y se descartó.`); continue; }
      try {
        const datos = new FormData();
        datos.append('imagen', { uri: foto.uri, name: `cabana.${EXTENSION[tipo]}`, type: tipo });
        const { data } = await api.post('/imagenes', datos, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 });
        nuevas.push(data.url);
      } catch (err) {
        avisos.push(mensajeError(err));
      }
    }
    if (nuevas.length) onCambio([...fotos, ...nuevas]);
    if (avisos.length) setError(avisos.join(' '));
    setSubiendo(false);
  };

  const quitar = (i) => onCambio(fotos.filter((_, k) => k !== i));
  const hacerPortada = (i) => onCambio([fotos[i], ...fotos.filter((_, k) => k !== i)]);

  return (
    <View>
      <View style={estilos.grilla}>
        {fotos.map((url, i) => (
          <View key={url} style={estilos.celda}>
            <Image source={{ uri: url }} style={estilos.foto} />
            {i === 0 && <View style={estilos.portada}><Text style={estilos.portadaTexto}>Portada</Text></View>}
            <View style={estilos.acciones}>
              {i > 0 && (
                <Pressable onPress={() => hacerPortada(i)} style={estilos.boton}><Text style={estilos.botonTexto}>Portada</Text></Pressable>
              )}
              <Pressable onPress={() => quitar(i)} style={estilos.boton}><Text style={[estilos.botonTexto, { color: colores.error }]}>✕</Text></Pressable>
            </View>
          </View>
        ))}
        {subiendo && <View style={[estilos.celda, estilos.cargando]}><ActivityIndicator color={colores.primario} /></View>}
      </View>
      <Text style={estilos.suave}>{fotos.length} de {MAX_FOTOS} fotos · JPG, PNG o WEBP · hasta {MAX_MB} MB. La primera es la portada.</Text>
      {fotos.length < MAX_FOTOS && <Boton titulo={fotos.length ? 'Agregar más fotos' : 'Elegir fotos de la galería'} onPress={agregar} cargando={subiendo} secundario />}
      <Aviso texto={error} />
    </View>
  );
}

const estilos = StyleSheet.create({
  grilla: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  celda: { width: '48%', aspectRatio: 4 / 3, borderRadius: 10, overflow: 'hidden', backgroundColor: colores.chip },
  foto: { width: '100%', height: '100%' },
  cargando: { alignItems: 'center', justifyContent: 'center' },
  portada: { position: 'absolute', top: 6, left: 6, backgroundColor: colores.primario, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  portadaTexto: { color: '#fff', fontSize: 11, fontWeight: '800' },
  acciones: { position: 'absolute', bottom: 6, right: 6, flexDirection: 'row', gap: 6 },
  boton: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  botonTexto: { fontSize: 12, fontWeight: '800', color: colores.primario },
  suave: { color: colores.textoSuave, fontSize: 12.5, marginBottom: 8 }
});
