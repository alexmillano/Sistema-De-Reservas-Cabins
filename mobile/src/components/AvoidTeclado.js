import { useEffect, useState } from 'react';
import { Keyboard, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colores } from '../theme/colores';

// Mantiene visible lo que se escribe y deja espacio para los botones del teléfono.
// Usa react-native-keyboard-controller, que mide el teclado real en Android e iOS.
// conInset=false para las pantallas con barra de pestañas (la barra ya cubre el margen inferior).
export default function AvoidTeclado({ children, style, conInset = true }) {
  const insets = useSafeAreaInsets();
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    const mostrar = Keyboard.addListener('keyboardDidShow', () => setAbierto(true));
    const ocultar = Keyboard.addListener('keyboardDidHide', () => setAbierto(false));
    return () => { mostrar.remove(); ocultar.remove(); };
  }, []);

  return (
    <KeyboardAvoidingView style={[{ flex: 1, backgroundColor: colores.fondo }, style]} behavior="padding">
      {/* Con el teclado cerrado se respeta la barra de botones; con el teclado abierto ya la cubre el teclado */}
      <View style={{ flex: 1, paddingBottom: !abierto && conInset ? insets.bottom : 0 }}>{children}</View>
    </KeyboardAvoidingView>
  );
}
