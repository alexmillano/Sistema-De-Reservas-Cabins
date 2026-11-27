import { useEffect, useState } from 'react';
import api, { mensajeError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { BarrasHorizontales, BarrasMensuales, Dona } from '../components/Graficos';
import Monto from '../components/Monto';
import { formatearPrecio } from '../utils/formato';
import { formatearFechaCorta, hoyArgentina } from '../utils/fechas';

const LIMITE_DETALLE = 10;
const ETIQUETA_PLAN = { free: 'Free', plus: 'Plus', premium: 'Premium' };
const ESTADO_PLAN = {
  vigente: { texto: 'Vigente', clase: 'estado estado-confirmada' },
  pausado: { texto: 'Pausado', clase: 'estado estado-cancelada' },
  vencido: { texto: 'Vencido', clase: 'estado' },
  programado: { texto: 'Programado', clase: 'estado estado-pendiente' }
};
const ESTADO_RESERVA = {
  pendiente: 'Pendiente', confirmada: 'Confirmada', completada: 'Completada', cancelada: 'Cancelada'
};

const MENSAJE_FORMATO = 'La respuesta del servidor no es la esperada. Revisá que el backend esté actualizado.';

const obtener = async (anio) => {
  try {
    const { data } = await api.get('/finanzas/resumen', { params: { anio } });
    // Se revisa que venga todo lo que cada rol necesita: así un servidor desactualizado no rompe la pantalla
    const base = data?.indicadores && data.estados && Array.isArray(data.ingresos_por_mes) && Array.isArray(data.ocupacion_por_cabana);
    const completo = data?.alcance === 'todas'
      ? Array.isArray(data.planes_detalle) && Array.isArray(data.resumen_planes) && Array.isArray(data.por_dueno)
        && typeof data.indicadores.ingresos_plataforma === 'number'
      : Array.isArray(data?.planes_por_cabana) && typeof data?.indicadores?.resultado_neto === 'number';
    if (!base || !completo) throw new Error('formato');
    return { cargando: false, error: '', datos: data };
  } catch (err) {
    return { cargando: false, datos: null, error: err.message === 'formato' ? MENSAJE_FORMATO : mensajeError(err) };
  }
};

const obtenerDetalle = async (anio, pagina) => {
  try {
    const { data } = await api.get('/finanzas/reservas', { params: { anio, pagina, limite: LIMITE_DETALLE } });
    if (!Array.isArray(data?.reservas)) throw new Error('formato');
    return { cargando: false, error: '', total: data.total, reservas: data.reservas };
  } catch (err) {
    return { cargando: false, total: 0, reservas: [], error: err.message === 'formato' ? MENSAJE_FORMATO : mensajeError(err) };
  }
};

function Kpi({ titulo, children, detalle, grande }) {
  return (
    <div className={`tarjeta kpi${grande ? ' kpi-grande' : ''}`}>
      <span className="kpi-titulo">{titulo}</span>
      <strong className="kpi-valor">{children}</strong>
      <span className="texto-suave">{detalle}</span>
    </div>
  );
}

const nombre = (n, a) => `${n || ''} ${a || ''}`.trim() || '—';

function EstadosYRendimiento({ datos, graficoMes }) {
  const e = datos.estados;
  return (
    <>
      <div className="graficos-fila">
        <div className="tarjeta">
          <h2>{graficoMes.titulo}</h2>
          <p className="texto-suave">{graficoMes.texto}</p>
          <BarrasMensuales datos={datos.ingresos_por_mes} />
        </div>
        <div className="tarjeta">
          <h2>Estado de las reservas</h2>
          <Dona
            centro={e.pendientes + e.confirmadas + e.completadas + e.canceladas}
            subcentro="reservas"
            partes={[
              { clave: 'completadas', etiqueta: 'Completadas', valor: e.completadas, color: '#4A6B5D' },
              { clave: 'confirmadas', etiqueta: 'Confirmadas', valor: e.confirmadas, color: '#AF8606' },
              { clave: 'pendientes', etiqueta: 'Pendientes', valor: e.pendientes, color: '#E9C46A' },
              { clave: 'canceladas', etiqueta: 'Canceladas', valor: e.canceladas, color: '#B03A2E' }
            ]}
          />
        </div>
      </div>
    </>
  );
}

function Rendimiento({ datos }) {
  return (
    <div className="tarjeta">
      <h2>Rendimiento por cabaña</h2>
      <p className="texto-suave">Alojamiento del año y porcentaje de noches ocupadas.</p>
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
  );
}

// ---------------- Dueño: lo que entra (verde) y lo que sale (rojo) ----------------
function PanelDueno({ datos }) {
  const i = datos.indicadores;
  return (
    <>
      <div className="kpis">
        <Kpi titulo="Ingresos por alojamiento" detalle="Reservas confirmadas y completadas">
          <Monto valor={i.ingresos_totales} tipo="ingreso" />
        </Kpi>
        <Kpi titulo="Comisión de Cabins" detalle="Porcentaje que se descuenta de cada reserva">
          <Monto valor={i.comisiones_totales} tipo="egreso" />
        </Kpi>
        <Kpi titulo="Plan elegido" detalle={i.planes_total === 0 ? 'Plan Free: sin costo' : 'Pagado en planes este año'}>
          <Monto valor={i.planes_total} tipo="egreso" />
        </Kpi>
        <Kpi titulo="Resultado neto" detalle="Ingresos − comisión − plan" grande>
          <Monto valor={i.resultado_neto} tipo="saldo" />
        </Kpi>
      </div>

      <div className="kpis">
        <Kpi titulo="Promedio por reserva" detalle={`${i.reservas_con_ingreso} ${i.reservas_con_ingreso === 1 ? 'reserva con ingreso' : 'reservas con ingreso'}`}>
          {formatearPrecio(i.ingreso_promedio)}
        </Kpi>
        <Kpi titulo="Ocupación general" detalle="Promedio de noches ocupadas del año">{i.ocupacion_general_pct}%</Kpi>
        <Kpi titulo="Tasa de cancelación" detalle={`${datos.estados.canceladas} ${datos.estados.canceladas === 1 ? 'reserva cancelada' : 'reservas canceladas'}`}>
          {datos.estados.tasa_cancelacion_pct}%
        </Kpi>
      </div>

      <EstadosYRendimiento datos={datos}
        graficoMes={{ titulo: 'Ingresos por mes', texto: 'Cada reserva suma en el mes de su check-in.' }} />

      <div className="tarjeta">
        <h2>Plan por cabaña</h2>
        <p className="texto-suave">Lo que pagaste este año en planes de visibilidad.</p>
        {datos.planes_por_cabana.length === 0 ? (
          <p>Todavía no tenés cabañas.</p>
        ) : (
          <div className="tabla-scroll">
            <table className="tabla-datos">
              <thead><tr><th>Cabaña</th><th>Plan elegido</th><th className="der">Pagado en el año</th></tr></thead>
              <tbody>
                {datos.planes_por_cabana.map((c) => (
                  <tr key={c.cabana_id}>
                    <td>{c.nombre}</td>
                    <td>{ETIQUETA_PLAN[c.plan]}</td>
                    <td className="der"><Monto valor={c.gasto} tipo="egreso" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Rendimiento datos={datos} />
    </>
  );
}

// ---------------- Superadmin: detalle de reservas ----------------
function DetalleReservas({ anio }) {
  const [pagina, setPagina] = useState(1);
  const [estado, setEstado] = useState({ cargando: true, error: '', total: 0, reservas: [] });

  useEffect(() => {
    let activo = true;
    obtenerDetalle(anio, pagina).then((nuevo) => {
      if (activo) setEstado(nuevo);
    });
    return () => {
      activo = false;
    };
  }, [anio, pagina]);

  const { cargando, error, total, reservas } = estado;
  const paginas = Math.max(1, Math.ceil(total / LIMITE_DETALLE));

  return (
    <div className="tarjeta">
      <h2>Detalle de cada reserva</h2>
      <p className="texto-suave">Lo cobrado en cada reserva del año. Las canceladas no suman.</p>
      {cargando && <p>Cargando reservas...</p>}
      {!cargando && error && <div className="mensaje-error">{error}</div>}
      {!cargando && !error && reservas.length === 0 && <p>No hay reservas en este año.</p>}
      {!error && reservas.length > 0 && (
        <div className="tabla-scroll">
          <table className="tabla-datos">
            <thead>
              <tr>
                <th>#</th><th>Check-in</th><th>Huésped</th><th>Cabaña</th><th>Dueño</th><th>Estado</th>
                <th className="der">Alojamiento</th><th className="der">Comisión</th>
                <th className="der">Tarifa servicio</th><th className="der">Total cobrado</th>
              </tr>
            </thead>
            <tbody>
              {reservas.map((r) => {
                const cancelada = r.estado === 'cancelada';
                return (
                  <tr key={r.id} className={cancelada ? 'fila-cancelada' : ''}>
                    <td>{r.id}</td>
                    <td>{formatearFechaCorta(r.fecha_checkin)}</td>
                    <td>{nombre(r.huesped_nombre, r.huesped_apellido)}</td>
                    <td>{r.cabana}</td>
                    <td>{nombre(r.dueno_nombre, r.dueno_apellido)}</td>
                    <td>{ESTADO_RESERVA[r.estado]}</td>
                    <td className="der">{formatearPrecio(r.alojamiento)}</td>
                    <td className="der">{cancelada ? '—' : <Monto valor={r.comision} tipo="ingreso" />}</td>
                    <td className="der">{cancelada ? '—' : <Monto valor={r.tarifa} tipo="ingreso" />}</td>
                    <td className="der">{formatearPrecio(r.total_cobrado)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {total > LIMITE_DETALLE && (
        <div className="paginacion">
          <button type="button" className="btn btn-secundario" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>Anterior</button>
          <span>Página {pagina} de {paginas} · {total} reservas</span>
          <button type="button" className="btn btn-secundario" disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)}>Siguiente</button>
        </div>
      )}
    </div>
  );
}

// ---------------- Superadmin: todo en detalle ----------------
function PanelSuperadmin({ datos, anio }) {
  const i = datos.indicadores;
  return (
    <>
      <div className="kpis">
        <Kpi titulo="Total de reservas" detalle={`${i.reservas_con_ingreso} con ingreso (confirmadas y completadas)`}>
          {i.total_reservas}
        </Kpi>
        <Kpi titulo="Comisiones" detalle="Lo que cobra Cabins a los dueños">
          <Monto valor={i.comisiones_totales} tipo="ingreso" />
        </Kpi>
        <Kpi titulo="Tarifas de servicio" detalle="Lo que pagan los huéspedes">
          <Monto valor={i.tarifas_totales} tipo="ingreso" />
        </Kpi>
        <Kpi titulo="Planes de visibilidad" detalle="Lo que pagan los dueños por sus planes">
          <Monto valor={i.planes_total} tipo="ingreso" />
        </Kpi>
        <Kpi titulo="Ingreso de la plataforma" detalle="Comisiones + tarifas + planes" grande>
          <Monto valor={i.ingresos_plataforma} tipo="ingreso" />
        </Kpi>
      </div>

      <div className="tarjeta">
        <h2>Flujo de dinero del año</h2>
        <p className="texto-suave">De lo que cobra la plataforma, qué se queda y qué se entrega a los dueños.</p>
        <div className="flujo">
          <div className="flujo-linea">
            <span>Cobrado a huéspedes <small>(alojamiento + tarifa de servicio)</small></span>
            <Monto valor={i.cobrado_huespedes} tipo="ingreso" />
          </div>
          <div className="flujo-linea">
            <span>Pagos a dueños <small>(alojamiento menos comisión)</small></span>
            <Monto valor={i.pagos_a_duenos} tipo="egreso" />
          </div>
          <div className="flujo-linea">
            <span>Planes cobrados a dueños</span>
            <Monto valor={i.planes_total} tipo="ingreso" />
          </div>
          <div className="flujo-linea flujo-total">
            <strong>Ingreso de la plataforma</strong>
            <strong><Monto valor={i.ingresos_plataforma} tipo="ingreso" /></strong>
          </div>
        </div>
      </div>

      <div className="kpis">
        <Kpi titulo="Alojamiento reservado" detalle="Total de las reservas con ingreso">{formatearPrecio(i.ingresos_totales)}</Kpi>
        <Kpi titulo="Promedio por reserva" detalle="Alojamiento por reserva con ingreso">{formatearPrecio(i.ingreso_promedio)}</Kpi>
        <Kpi titulo="Ocupación general" detalle="Promedio de noches ocupadas del año">{i.ocupacion_general_pct}%</Kpi>
        <Kpi titulo="Tasa de cancelación" detalle={`${datos.estados.canceladas} ${datos.estados.canceladas === 1 ? 'reserva cancelada' : 'reservas canceladas'}`}>
          {datos.estados.tasa_cancelacion_pct}%
        </Kpi>
      </div>

      <EstadosYRendimiento datos={datos}
        graficoMes={{ titulo: 'Ingresos de la plataforma por mes', texto: 'Comisiones y tarifas en el mes del check-in, y planes en el mes en que se pagaron.' }} />

      <div className="tarjeta">
        <h2>Planes contratados</h2>
        <p className="texto-suave">Quién tiene cada plan y cuánto pagó. Los pausados no cumplen hoy los requisitos de calificación.</p>
        <div className="chips chips-izq">
          {datos.resumen_planes.map((p) => (
            <span className="chip" key={p.plan}>
              {p.nombre}: {p.vigentes} {p.vigentes === 1 ? 'vigente' : 'vigentes'} · {p.compras} {p.compras === 1 ? 'compra' : 'compras'} · {formatearPrecio(p.ingresos)}
            </span>
          ))}
        </div>
        {datos.planes_detalle.length === 0 ? (
          <p>Todavía no se contrató ningún plan en este año.</p>
        ) : (
          <div className="tabla-scroll">
            <table className="tabla-datos">
              <thead>
                <tr><th>Cabaña</th><th>Dueño</th><th>Plan</th><th>Pagado el</th><th>Vigencia</th><th>Estado</th><th className="der">Pagó</th></tr>
              </thead>
              <tbody>
                {datos.planes_detalle.map((p) => (
                  <tr key={p.id}>
                    <td>{p.cabana}</td>
                    <td>{nombre(p.dueno_nombre, p.dueno_apellido)}</td>
                    <td>{ETIQUETA_PLAN[p.plan]}</td>
                    <td>{formatearFechaCorta(p.comprado)}</td>
                    <td>{formatearFechaCorta(p.inicio)} al {formatearFechaCorta(p.vencimiento)}</td>
                    <td><span className={ESTADO_PLAN[p.estado].clase}>{ESTADO_PLAN[p.estado].texto}</span></td>
                    <td className="der"><Monto valor={p.precio} tipo="ingreso" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="tarjeta">
        <h2>Resultado por dueño</h2>
        <p className="texto-suave">Cuánto generó cada dueño para la plataforma en el año.</p>
        {datos.por_dueno.length === 0 ? (
          <p>Todavía no hay dueños.</p>
        ) : (
          <div className="tabla-scroll">
            <table className="tabla-datos">
              <thead>
                <tr><th>Dueño</th><th className="der">Cabañas</th><th className="der">Reservas</th><th className="der">Alojamiento</th><th className="der">Comisión</th><th className="der">Planes</th></tr>
              </thead>
              <tbody>
                {datos.por_dueno.map((d) => (
                  <tr key={d.id}>
                    <td>{nombre(d.nombre, d.apellido)} <span className="texto-suave">@{d.usuario}</span></td>
                    <td className="der">{d.cabanas}</td>
                    <td className="der">{d.reservas}</td>
                    <td className="der">{formatearPrecio(d.alojamiento)}</td>
                    <td className="der"><Monto valor={d.comision} tipo="ingreso" /></td>
                    <td className="der"><Monto valor={d.planes} tipo="ingreso" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DetalleReservas anio={anio} />
      <Rendimiento datos={datos} />
    </>
  );
}

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
            {user.es_superadmin
              ? 'Resumen financiero de la plataforma: comisiones, cargos cobrados, y montos transferidos a los dueños.'
              : 'Resumen de tus ingresos (en verde) y de las comisiones y cargos descontados (en rojo).'}
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
          {datos.alcance === 'todas' ? <PanelSuperadmin datos={datos} anio={anio} /> : <PanelDueno datos={datos} />}
        </div>
      )}
    </section>
  );
}
