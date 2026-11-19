import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Boton } from './Ui';
import { colores } from '../theme/colores';
import { MESES, aIso, contarNoches, formatearFechaCorta, hoyArgentina } from '../utils/fechas';

const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// Calendario simple para elegir check-in y check-out (sin librerías externas)
export default function SelectorFechas({ visible, desde, hasta, onCancelar, onConfirmar }) {
  const hoy = hoyArgentina();
  const [anioHoy, mesHoy] = hoy.split('-').map(Number);
  const inicial = desde || hoy;
  const [vista, setVista] = useState({ anio: Number(inicial.slice(0, 4)), mes: Number(inicial.slice(5, 7)) - 1 });
  const [sel, setSel] = useState({ desde: desde || '', hasta: hasta || '' });

  // Cada vez que se abre, arranca con lo que ya había elegido
  const [abiertoAntes, setAbiertoAntes] = useState(false);
  if (visible && !abiertoAntes) {
    setAbiertoAntes(true);
    setSel({ desde: desde || '', hasta: hasta || '' });
    const base = desde || hoy;
    setVista({ anio: Number(base.slice(0, 4)), mes: Number(base.slice(5, 7)) - 1 });
  }
  if (!visible && abiertoAntes) setAbiertoAntes(false);

  const celdas = useMemo(() => {
    const primero = new Date(Date.UTC(vista.anio, vista.mes, 1));
    const offset = (primero.getUTCDay() + 6) % 7; // lunes = 0
    const dias = new Date(Date.UTC(vista.anio, vista.mes + 1, 0)).getUTCDate();
    const lista = Array(offset).fill(null);
    for (let d = 1; d <= dias; d++) lista.push(aIso(vista.anio, vista.mes, d));
    return lista;
  }, [vista]);

  const puedeRetroceder = vista.anio > anioHoy || (vista.anio === anioHoy && vista.mes > mesHoy - 1);
  const mover = (delta) => {
    const f = new Date(Date.UTC(vista.anio, vista.mes + delta, 1));
    setVista({ anio: f.getUTCFullYear(), mes: f.getUTCMonth() });
  };

  const tocar = (iso) => {
    if (iso < hoy) return;
    if (!sel.desde || sel.hasta) setSel({ desde: iso, hasta: '' });
    else if (iso <= sel.desde) setSel({ desde: iso, hasta: '' });
    else setSel({ desde: sel.desde, hasta: iso });
  };

  const noches = contarNoches(sel.desde, sel.hasta);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancelar}>
      <View style={estilos.fondo}>
        <View style={estilos.hoja}>
          <View style={estilos.cab}>
            <Pressable onPress={() => puedeRetroceder && mover(-1)} hitSlop={10} style={!puedeRetroceder && { opacity: 0.3 }}>
              <Text style={estilos.flecha}>‹</Text>
            </Pressable>
            <Text style={estilos.mes}>{MESES[vista.mes]} {vista.anio}</Text>
            <Pressable onPress={() => mover(1)} hitSlop={10}><Text style={estilos.flecha}>›</Text></Pressable>
          </View>

          <View style={estilos.fila}>
            {DIAS.map((d, i) => <Text key={i} style={estilos.diaSemana}>{d}</Text>)}
          </View>
          <View style={estilos.grilla}>
            {celdas.map((iso, i) => {
              if (!iso) return <View key={`v${i}`} style={estilos.celda} />;
              const pasado = iso < hoy;
              const extremo = iso === sel.desde || iso === sel.hasta;
              const enRango = sel.desde && sel.hasta && iso > sel.desde && iso < sel.hasta;
              return (
                <Pressable key={iso} style={estilos.celda} onPress={() => tocar(iso)} disabled={pasado}>
                  <View style={[estilos.dia, enRango && estilos.diaRango, extremo && estilos.diaExtremo]}>
                    <Text style={[estilos.diaTexto, pasado && { color: '#b9b0a2' }, extremo && { color: '#fff', fontWeight: '800' }]}>
                      {Number(iso.slice(8))}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Text style={estilos.resumen}>
            {sel.desde ? `Llegada: ${formatearFechaCorta(sel.desde)}` : 'Elegí el día de llegada'}
            {sel.desde && !sel.hasta ? '  ·  elegí el día de salida' : ''}
            {noches > 0 ? `\nSalida: ${formatearFechaCorta(sel.hasta)}  ·  ${noches} ${noches === 1 ? 'noche' : 'noches'}` : ''}
          </Text>

          <Boton titulo="Confirmar fechas" onPress={() => onConfirmar(sel.desde, sel.hasta)} deshabilitado={noches === 0} />
          <Boton titulo="Cancelar" onPress={onCancelar} secundario />
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  hoja: { backgroundColor: colores.fondo, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 28 },
  cab: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  flecha: { fontSize: 30, color: colores.primario, paddingHorizontal: 12 },
  mes: { fontSize: 18, fontWeight: '800', color: colores.primario },
  fila: { flexDirection: 'row' },
  diaSemana: { flex: 1, textAlign: 'center', color: colores.textoSuave, fontWeight: '700', marginBottom: 6 },
  grilla: { flexDirection: 'row', flexWrap: 'wrap' },
  celda: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dia: { width: '86%', height: '86%', borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  diaRango: { backgroundColor: colores.chip, borderRadius: 6 },
  diaExtremo: { backgroundColor: colores.primario },
  diaTexto: { color: colores.texto, fontSize: 15 },
  resumen: { textAlign: 'center', color: colores.texto, marginVertical: 12, lineHeight: 20, fontWeight: '600' }
});
