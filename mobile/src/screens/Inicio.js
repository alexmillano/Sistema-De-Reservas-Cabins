import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import api, { mensajeError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Aviso, Boton } from '../components/Ui';
import CabanaCard from '../components/CabanaCard';
import { colores } from '../theme/colores';

export default function Inicio({ navigation }) {
  const { user } = useAuth();
  const [destacadas, setDestacadas] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setError('');
    try {
      const [d, p] = await Promise.all([api.get('/cabanas/destacadas'), api.get('/provincias')]);
      setDestacadas(Array.isArray(d.data) ? d.data : []);
      setProvincias(p.data || []);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <ScrollView
      style={{ backgroundColor: colores.fondo }}
      contentContainerStyle={estilos.contenido}
      refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} />}
    >
      <View style={estilos.hero}>
        <Text style={estilos.heroTitulo}>¡Hola, {user.nombre}! 👋</Text>
        <Text style={estilos.heroTexto}>Encontrá tu cabaña ideal en toda la Argentina.</Text>
        <Boton titulo="Explorar cabañas" onPress={() => navigation.navigate('Catalogo')} />
      </View>

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

      {provincias.length > 0 && (
        <>
          <Text style={estilos.seccion}>Dónde estamos</Text>
          <View style={estilos.chips}>
            {provincias.map((p) => (
              <View key={p.id} style={estilos.chip}><Text style={estilos.chipTexto}>{p.nombre}</Text></View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: 16, paddingBottom: 32 },
  hero: { backgroundColor: colores.nav, borderRadius: 16, padding: 18, marginBottom: 18 },
  heroTitulo: { color: '#fff', fontSize: 22, fontWeight: '800' },
  heroTexto: { color: '#f3e6d8', marginVertical: 8 },
  seccion: { fontSize: 20, fontWeight: '800', color: colores.primario, marginVertical: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colores.chip, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipTexto: { color: colores.primario, fontSize: 13 }
});
