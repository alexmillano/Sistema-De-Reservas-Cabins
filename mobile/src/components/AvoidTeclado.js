import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colores } from '../theme/colores';

// Mantiene visible lo que se escribe (como WhatsApp) y deja espacio para los botones del teléfono.
// Usa los avisos propios de React Native: el teclado informa dónde empieza en la pantalla (screenY),
// se mide hasta dónde llega esta vista y se sube la parte de abajo justo lo que se pisa.
// conInset=false para las pantallas con barra de pestañas (la barra ya cubre el margen inferior).
export default function AvoidTeclado({ children, style, conInset = true }) {
  const insets = useSafeAreaInsets();
  const caja = useRef(null);
  const [solape, setSolape] = useState(0);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const alMostrar = (e) => {
      const { screenY, height } = e.endCoordinates;
      setAbierto(true);
      caja.current?.measure((x, y, ancho, alto, px, py) => {
        const fondo = py + alto;
        const pisa = fondo - screenY;
        // Si la medición no es confiable, se usa la altura que informa el teclado
        setSolape(Number.isFinite(pisa) && pisa > 0 ? pisa : Math.max(0, height - (conInset ? 0 : 0)));
      });
    };
    const alOcultar = () => { setAbierto(false); setSolape(0); };
    const a = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', alMostrar);
    const b = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', alOcultar);
    return () => { a.remove(); b.remove(); };
  }, [conInset]);

  const abajo = abierto ? solape : (conInset ? insets.bottom : 0);

  return (
    <View ref={caja} collapsable={false} style={[{ flex: 1, backgroundColor: colores.fondo }, style]}>
      <View style={{ flex: 1, paddingBottom: abajo }}>{children}</View>
    </View>
  );
}
