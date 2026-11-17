import { useEffect, useState } from 'react';
import api, { mensajeError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { BarrasHorizontales, BarrasMensuales, Dona } from '../components/Graficos';
import { formatearPrecio } from '../utils/formato';
import { hoyArgentina } from '../utils/fechas';

const obtener = async (anio) => {
  try {
    const { data } = await api.get('/finanzas/resumen', { params: { anio } });
    if (!data?.indicadores || !Array.isArray(data.ingresos_por_mes)) throw new Error('formato');
    return { cargando: false, error: '', datos: data };
  } catch (err) {
    return {
      cargando: false, datos: null,
      error: err.message === 'formato'
        ? 'La respuesta del servidor no es la esperada. Revisá que el backend esté actualizado.'
        : mensajeError(err)
    };
  }
};

export default function Finanzas() {
  const { user } = useAuth();
  const anioActual = Number(hoyArgentina().slice(0, 4));
  const [anio, setAnio] = useState(anioActual);
  const [estado, setEstado] = useState({ cargando: true, error: '', datos: null });

  useEffect(() => {
    let activo = true;
    obtener(anio).then((nuevo) => {
      if (activo) setEstado(nuevo);
    });
    return () => {
      activo = false;
    };
  }, [anio]);

  const cambiarAnio = (e) => {
    setEstado((e0) => ({ ...e0, cargando: true }));
    setAnio(Number(e.target.value));
  };

  const { cargando, error, datos } = estado;
  const anios = [anioActual - 2, anioActual - 1, anioActual, anioActual + 1];

  return (
    <section className="seccion">
      <div className="catalogo-barra">
        <div>
          <h1>Finanzas</h1>
          <p className="texto-suave">
            {user.es_superadmin ? 'Resumen de todas las cabañas del sistema.' : 'Resumen de tus cabañas.'}
          </p>
        </div>
        <div className="campo campo-orden">
          <label htmlFor="f-anio">Año</label>
          <select id="f-anio" value={anio} onChange={cambiarAnio}>
            {anios.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {cargando && !datos && <p>Cargando finanzas...</p>}
      {error && <div className="mensaje-error">{error}</div>}

      {datos && (
        <div className={cargando ? 'cargando-suave' : ''}>
          <div className="kpis">
            <div className="tarjeta kpi">
              <span className="kpi-titulo">{datos.alcance === 'todas' ? 'Alojamiento reservado' : 'Ingresos brutos'}</span>
              <strong className="kpi-valor">{formatearPrecio(datos.indicadores.ingresos_totales)}</strong>
              <span className="texto-suave">Reservas confirmadas y completadas</span>
            </div>
            {datos.alcance === 'todas' ? (
              <>
                <div className="tarjeta kpi">
                  <span className="kpi-titulo">Comisiones a dueños</span>
                  <strong className="kpi-valor">{formatearPrecio(datos.indicadores.comisiones_totales)}</strong>
                  <span className="texto-suave">10% del alojamiento</span>
                </div>
                <div className="tarjeta kpi">
                  <span className="kpi-titulo">Tarifas de servicio</span>
                  <strong className="kpi-valor">{formatearPrecio(datos.indicadores.tarifas_totales)}</strong>
                  <span className="texto-suave">5% cobrado a huéspedes</span>
                </div>
                <div className="tarjeta kpi">
                  <span className="kpi-titulo">Ingresos de la plataforma</span>
                  <strong className="kpi-valor">{formatearPrecio(datos.indicadores.ingresos_plataforma)}</strong>
                  <span className="texto-suave">Comisiones + tarifas</span>
                </div>
              </>
            ) : (
              <>
                <div className="tarjeta kpi">
                  <span className="kpi-titulo">Comisión de Cabins</span>
                  <strong className="kpi-valor">-{formatearPrecio(datos.indicadores.comisiones_totales)}</strong>
                  <span className="texto-suave">10% de cada reserva</span>
                </div>
                <div className="tarjeta kpi">
                  <span className="kpi-titulo">Ingresos netos</span>
                  <strong className="kpi-valor">{formatearPrecio(datos.indicadores.ingresos_netos)}</strong>
                  <span className="texto-suave">Lo que recibís después de la comisión</span>
                </div>
              </>
            )}
            <div className="tarjeta kpi">
              <span className="kpi-titulo">Promedio por reserva</span>
              <strong className="kpi-valor">{formatearPrecio(datos.indicadores.ingreso_promedio)}</strong>
              <span className="texto-suave">{datos.indicadores.reservas_con_ingreso} {datos.indicadores.reservas_con_ingreso === 1 ? 'reserva con ingreso' : 'reservas con ingreso'}</span>
            </div>
            <div className="tarjeta kpi">
              <span className="kpi-titulo">Ocupación general</span>
              <strong className="kpi-valor">{datos.indicadores.ocupacion_general_pct}%</strong>
              <span className="texto-suave">Promedio de noches ocupadas del año</span>
            </div>
            <div className="tarjeta kpi">
              <span className="kpi-titulo">Tasa de cancelación</span>
              <strong className="kpi-valor">{datos.estados.tasa_cancelacion_pct}%</strong>
              <span className="texto-suave">{datos.estados.canceladas} {datos.estados.canceladas === 1 ? 'reserva cancelada' : 'reservas canceladas'}</span>
            </div>
          </div>

          <div className="graficos-fila">
            <div className="tarjeta">
              <h2>Ingresos por mes</h2>
              <p className="texto-suave">Cada reserva suma en el mes de su check-in.</p>
              <BarrasMensuales datos={datos.ingresos_por_mes} />
            </div>
            <div className="tarjeta">
              <h2>Estado de las reservas</h2>
              <Dona
                centro={datos.estados.pendientes + datos.estados.confirmadas + datos.estados.completadas + datos.estados.canceladas}
                subcentro="reservas"
                partes={[
                  { clave: 'completadas', etiqueta: 'Completadas', valor: datos.estados.completadas, color: '#4A6B5D' },
                  { clave: 'confirmadas', etiqueta: 'Confirmadas', valor: datos.estados.confirmadas, color: '#AF8606' },
                  { clave: 'pendientes', etiqueta: 'Pendientes', valor: datos.estados.pendientes, color: '#E9C46A' },
                  { clave: 'canceladas', etiqueta: 'Canceladas', valor: datos.estados.canceladas, color: '#B03A2E' }
                ]}
              />
            </div>
          </div>

          <div className="tarjeta">
            <h2>Rendimiento por cabaña</h2>
            <p className="texto-suave">Ingresos del año y porcentaje de noches ocupadas.</p>
            {datos.ocupacion_por_cabana.length === 0 ? (
              <p>Todavía no hay cabañas para mostrar.</p>
            ) : (
              <BarrasHorizontales
                items={[...datos.ocupacion_por_cabana]
                  .sort((a, b) => b.ingresos - a.ingresos)
                  .map((c) => ({
                    clave: c.cabana_id,
                    etiqueta: c.nombre,
                    detalle: `${c.localidad}, ${c.provincia} · ${c.ocupacion_pct}% ocupada · ${c.reservas} ${c.reservas === 1 ? 'reserva' : 'reservas'}`,
                    valor: c.ingresos,
                    texto: formatearPrecio(c.ingresos)
                  }))}
              />
            )}
          </div>
        </div>
      )}
    </section>
  );
}
