import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colores } from '../theme/colores';

export function Campo({ etiqueta, style, ...props }) {
  return (
    <View style={estilos.campo}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <TextInput
        placeholderTextColor={colores.textoSuave}
        autoCapitalize="none"
        {...props}
        style={[estilos.input, style]}
      />
    </View>
  );
}

export function Boton({ titulo, onPress, cargando, secundario, deshabilitado }) {
  const inactivo = cargando || deshabilitado;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      style={({ pressed }) => [
        estilos.boton,
        secundario && estilos.botonSecundario,
        (pressed || inactivo) && { opacity: 0.7 }
      ]}
    >
      {cargando
        ? <ActivityIndicator color={secundario ? colores.primario : '#fff'} />
        : <Text style={[estilos.botonTexto, secundario && { color: colores.primario }]}>{titulo}</Text>}
    </Pressable>
  );
}

export function Aviso({ tipo = 'error', texto }) {
  if (!texto) return null;
  const ok = tipo === 'exito';
  return (
    <View style={[estilos.aviso, { backgroundColor: ok ? colores.exitoFondo : colores.errorFondo }]}>
      <Text style={{ color: ok ? colores.exito : colores.error }}>{texto}</Text>
    </View>
  );
}

export function Enlace({ texto, onPress }) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text style={estilos.enlace}>{texto}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  campo: { marginBottom: 14 },
  etiqueta: { color: colores.texto, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: colores.tarjeta, borderWidth: 1, borderColor: colores.borde,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16, color: colores.texto
  },
  boton: {
    backgroundColor: colores.primario, borderRadius: 10, paddingVertical: 13,
    alignItems: 'center', marginTop: 6
  },
  botonSecundario: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colores.primario },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
  aviso: { padding: 12, borderRadius: 10, marginBottom: 14 },
  enlace: { color: colores.primario, fontWeight: '600', textAlign: 'center', paddingVertical: 8 }
});

export function Stepper({ valor, min = 1, max = 99, onChange }) {
  return (
    <View style={estilosStepper.fila}>
      <Pressable onPress={() => valor > min && onChange(valor - 1)} style={[estilosStepper.boton, valor <= min && { opacity: 0.4 }]} hitSlop={6}>
        <Text style={estilosStepper.simbolo}>−</Text>
      </Pressable>
      <Text style={estilosStepper.valor}>{valor}</Text>
      <Pressable onPress={() => valor < max && onChange(valor + 1)} style={[estilosStepper.boton, valor >= max && { opacity: 0.4 }]} hitSlop={6}>
        <Text style={estilosStepper.simbolo}>+</Text>
      </Pressable>
    </View>
  );
}

const estilosStepper = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  boton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colores.chip, alignItems: 'center', justifyContent: 'center' },
  simbolo: { fontSize: 20, color: colores.primario, fontWeight: '700', lineHeight: 22 },
  valor: { minWidth: 22, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colores.texto }
});
