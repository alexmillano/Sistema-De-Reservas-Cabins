import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { mensajeError } from '../api/client';
import { formatearPrecio } from '../utils/formato';
import { formatearFechaCorta, hoyArgentina } from '../utils/fechas';

const PASOS = ['Resumen', 'Pago', 'Confirmación'];
const PAGO_VACIO = { titular: '', numero_tarjeta: '', vencimiento: '', cvv: '' };

const soloDigitos = (texto) => texto.replace(/\D/g, '');

// 4111111111111111 -> 4111 1111 1111 1111
const formatearTarjeta = (texto) =>
  soloDigitos(texto).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');

// 1230 -> 12/30
const formatearVencimiento = (texto) => {
  const d = soloDigitos(texto).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

// Mismas reglas que el servidor; devuelve un mensaje o null
const validarPago = (f) => {
  const numero = soloDigitos(f.numero_tarjeta);
  if (!f.titular.trim()) return 'Ingresá el titular de la tarjeta.';
  if (numero.length < 13 || numero.length > 19) return 'El número de tarjeta no es válido.';

  const venc = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(f.vencimiento);
  if (!venc) return 'El vencimiento debe tener formato MM/AA.';
  const [anioActual, mesActual] = hoyArgentina().split('-').map(Number);
  const anio = 2000 + Number(venc[2]);
  const mes = Number(venc[1]);
  if (anio < anioActual || (anio === anioActual && mes < mesActual)) {
    return 'La tarjeta está vencida.';
  }

  if (!/^\d{3,4}$/.test(f.cvv)) return 'El CVV debe tener 3 o 4 dígitos.';
  return null;
};

function Pasos({ actual }) {
  return (
    <div className="pasos">
      {PASOS.map((nombre, i) => {
        const numero = i + 1;
        const clase = numero === actual ? 'activo' : numero < actual ? 'hecho' : '';
        return (
          <Fragment key={nombre}>
            {i > 0 && <span className="paso-linea" />}
            <div className={`paso ${clase}`}>
              <span className="paso-circulo">{numero}</span>
              {nombre}
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}

export default function Checkout() {
  const [carrito, setCarrito] = useState({ cargando: true, items: [], total: 0, error: '' });
  const [paso, setPaso] = useState('resumen');
  const [pago, setPago] = useState(PAGO_VACIO);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [confirmacion, setConfirmacion] = useState(null);

  useEffect(() => {
    let activo = true;
    api.get('/carrito')
      .then(({ data }) => {
        if (activo) setCarrito({ cargando: false, items: data.items, total: data.total, error: '' });
      })
      .catch((err) => {
        if (activo) setCarrito({ cargando: false, items: [], total: 0, error: mensajeError(err) });
      });
    return () => { activo = false; };
  }, []);

  const cambiar = (e) => {
    const { name, value } = e.target;
    const formateado =
      name === 'numero_tarjeta' ? formatearTarjeta(value)
      : name === 'vencimiento' ? formatearVencimiento(value)
      : name === 'cvv' ? soloDigitos(value).slice(0, 4)
      : value;
    setPago({ ...pago, [name]: formateado });
  };

  const pagar = async (e) => {
    e.preventDefault();
    setError('');

    const problema = validarPago(pago);
    if (problema) {
      setError(problema);
      return;
    }

    setEnviando(true);
    try {
      const { data } = await api.post('/reservas/pagar', {
        numero_tarjeta: soloDigitos(pago.numero_tarjeta),
        vencimiento: pago.vencimiento,
        cvv: pago.cvv,
        titular: pago.titular.trim()
      });
      setConfirmacion(data);
      setPago(PAGO_VACIO); // los datos de la tarjeta no se guardan en ningún lado
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  // ---------- Paso 3: confirmación ----------
  if (confirmacion) {
    return (
      <div className="checkout">
        <Pasos actual={3} />
        <div className="tarjeta">
          <h2>¡Reserva registrada!</h2>
          <p>
            Pago simulado aprobado. Tus reservas quedaron en estado <strong>pendiente</strong> hasta
            que el equipo de Cabins las confirme.
          </p>

          {confirmacion.reservas.map((r) => (
            <div className="linea-resumen" key={r.id}>
              <span>
                #{r.id} · {r.cabana}
                <br />
                <small>
                  {formatearFechaCorta(r.fecha_checkin)} al {formatearFechaCorta(r.fecha_checkout)}
                </small>
              </span>
              <span>{formatearPrecio(r.precio_total)}</span>
            </div>
          ))}
          <div className="linea-resumen total">
            <span>Total</span>
            <strong>{formatearPrecio(confirmacion.total)}</strong>
          </div>

          <div className="btn-fila">
            <Link to="/mis-reservas" className="btn">Ver mis reservas</Link>
            <Link to="/reservas" className="btn btn-secundario">Seguir explorando</Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Carga y casos sin nada para pagar ----------
  if (carrito.cargando) {
    return <div className="checkout"><p>Cargando...</p></div>;
  }
  if (carrito.error) {
    return (
      <div className="checkout">
        <div className="mensaje-error">{carrito.error}</div>
        <Link to="/carrito" className="btn">Volver al carrito</Link>
      </div>
    );
  }
  if (carrito.items.length === 0) {
    return (
      <div className="checkout">
        <div className="tarjeta centrado">
          <p>Tu carrito está vacío, no hay nada para pagar.</p>
          <Link to="/reservas" className="btn">Explorar cabañas</Link>
        </div>
      </div>
    );
  }

  const hoy = hoyArgentina();
  const hayProblemas = carrito.items.some((i) => !i.activa || i.fecha_checkin < hoy);

  return (
    <div className="checkout">
      <Pasos actual={paso === 'pago' ? 2 : 1} />

      {/* ---------- Paso 1: resumen ---------- */}
      {paso === 'resumen' && (
        <div className="tarjeta">
          <h2>Resumen de tu reserva</h2>

          {carrito.items.map((i) => (
            <div className="linea-resumen" key={i.id}>
              <span>
                <strong>{i.nombre}</strong> · {i.localidad}, {i.provincia}
                <br />
                <small>
                  {formatearFechaCorta(i.fecha_checkin)} al {formatearFechaCorta(i.fecha_checkout)} ·{' '}
                  {i.noches} {i.noches === 1 ? 'noche' : 'noches'} · {i.cantidad_personas}{' '}
                  {i.cantidad_personas === 1 ? 'persona' : 'personas'}
                </small>
              </span>
              <span>{formatearPrecio(i.subtotal)}</span>
            </div>
          ))}
          <div className="linea-resumen total">
            <span>Total</span>
            <strong>{formatearPrecio(carrito.total)}</strong>
          </div>

          {hayProblemas && (
            <div className="mensaje-error">
              Hay cabañas que ya no están disponibles o con fechas pasadas. Volvé al carrito para
              arreglarlo.
            </div>
          )}

          <div className="btn-fila">
            <Link to="/carrito" className="btn btn-secundario">Volver al carrito</Link>
            <button
              type="button" className="btn" disabled={hayProblemas}
              onClick={() => { setError(''); setPaso('pago'); }}
            >
              Continuar al pago
            </button>
          </div>
        </div>
      )}

      {/* ---------- Paso 2: pago ---------- */}
      {paso === 'pago' && (
        <form className="tarjeta" onSubmit={pagar}>
          <h2>Datos de pago</h2>
          <div className="aviso-simulado">
            Pago simulado: no se cobra nada y los datos de la tarjeta no se guardan. Podés usar la
            tarjeta de prueba 4111 1111 1111 1111.
          </div>

          <div className="campo">
            <label htmlFor="titular">Titular de la tarjeta</label>
            <input
              id="titular" name="titular" autoComplete="cc-name"
              value={pago.titular} onChange={cambiar} required
            />
          </div>
          <div className="campo">
            <label htmlFor="numero_tarjeta">Número de tarjeta</label>
            <input
              id="numero_tarjeta" name="numero_tarjeta" inputMode="numeric" autoComplete="cc-number"
              placeholder="0000 0000 0000 0000"
              value={pago.numero_tarjeta} onChange={cambiar} required
            />
          </div>
          <div className="form-fila">
            <div className="campo">
              <label htmlFor="vencimiento">Vencimiento (MM/AA)</label>
              <input
                id="vencimiento" name="vencimiento" inputMode="numeric" autoComplete="cc-exp"
                placeholder="MM/AA"
                value={pago.vencimiento} onChange={cambiar} required
              />
            </div>
            <div className="campo">
              <label htmlFor="cvv">CVV</label>
              <input
                id="cvv" name="cvv" type="password" inputMode="numeric" autoComplete="cc-csc"
                placeholder="123"
                value={pago.cvv} onChange={cambiar} required
              />
            </div>
          </div>

          {error && (
            <div className="mensaje-error">
              {error} <Link to="/carrito">Volver al carrito</Link>
            </div>
          )}

          <div className="btn-fila">
            <button type="button" className="btn btn-secundario" onClick={() => setPaso('resumen')}>
              Volver al resumen
            </button>
            <button type="submit" className="btn" disabled={enviando}>
              {enviando ? 'Procesando...' : `Confirmar pago ${formatearPrecio(carrito.total)}`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}