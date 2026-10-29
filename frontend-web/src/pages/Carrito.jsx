import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { mensajeError } from '../api/client';
import SidebarIndice from '../components/SidebarIndice';
import ItemCarrito from '../components/ItemCarrito';
import { formatearPrecio } from '../utils/formato';
import { hoyArgentina } from '../utils/fechas';

const ENLACES = [
  { texto: 'Cabañas agregadas', destino: 'items' },
  { texto: 'Resumen de pago', destino: 'resumen' }
];

export default function Carrito() {
  const [estado, setEstado] = useState({ cargando: true, items: [], total: 0, error: '' });
  const [quitando, setQuitando] = useState(null);
  const [errorQuitar, setErrorQuitar] = useState('');

  const cargar = useCallback(async () => {
    try {
      const { data } = await api.get('/carrito');
      setEstado({ cargando: false, items: data.items, total: data.total, error: '' });
    } catch (err) {
      setEstado({ cargando: false, items: [], total: 0, error: mensajeError(err) });
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirQuitar = (item) => {
    setErrorQuitar('');
    setQuitando(item);
  };

  const confirmarQuitar = async () => {
    try {
      await api.delete(`/carrito/${quitando.id}`);
      setQuitando(null);
      await cargar();
    } catch (err) {
      setErrorQuitar(mensajeError(err));
    }
  };

  const { cargando, items, total, error } = estado;
  const hoy = hoyArgentina();
  // Con una cabaña no disponible o con fechas pasadas no se puede pagar
  const hayProblemas = items.some((i) => !i.activa || i.fecha_checkin < hoy);

  return (
    <div className="con-lateral">
      <SidebarIndice titulo="Carrito" enlaces={ENLACES} />

      <section>
        <h2 id="items" className="ancla">
          Cabañas agregadas {items.length > 0 && <small>({items.length})</small>}
        </h2>

        {cargando && <p>Cargando carrito...</p>}
        {!cargando && error && <div className="mensaje-error">{error}</div>}
        {!cargando && !error && items.length === 0 && (
          <div className="tarjeta centrado">
            <p>Tu carrito está vacío.</p>
            <Link to="/reservas" className="btn">Explorar cabañas</Link>
          </div>
        )}

        {items.map((item) => (
          <ItemCarrito key={item.id} item={item} onCambio={cargar} onQuitar={abrirQuitar} />
        ))}

        <h2 id="resumen" className="ancla">Resumen de pago</h2>
        {items.length === 0 ? (
          <p>Todavía no hay nada para pagar.</p>
        ) : (
          <div className="tarjeta">
            {items.map((i) => (
              <div className="linea-resumen" key={i.id}>
                <span>{i.nombre} · {i.noches} {i.noches === 1 ? 'noche' : 'noches'}</span>
                <span>{formatearPrecio(i.subtotal)}</span>
              </div>
            ))}
            <div className="linea-resumen total">
              <span>Total</span>
              <strong>{formatearPrecio(total)}</strong>
            </div>

            {hayProblemas && (
              <div className="mensaje-error">
                Hay cabañas que ya no están disponibles o con fechas pasadas. Quitalas o
                actualizalas para continuar.
              </div>
            )}

            <div className="btn-fila">
              {hayProblemas ? (
                <button type="button" className="btn" disabled>Proceder al pago</button>
              ) : (
                <Link to="/checkout" className="btn">Proceder al pago</Link>
              )}
              <Link to="/reservas" className="btn btn-secundario">Seguir explorando</Link>
            </div>
          </div>
        )}
      </section>

      {quitando && (
        <div className="modal-fondo" onClick={() => setQuitando(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Quitar del carrito</h3>
            <p>¿Querés quitar "{quitando.nombre}" del carrito?</p>
            {errorQuitar && <div className="mensaje-error">{errorQuitar}</div>}
            <div className="modal-botones">
              <button type="button" className="btn btn-secundario" onClick={() => setQuitando(null)}>
                Cancelar
              </button>
              <button type="button" className="btn" onClick={confirmarQuitar}>Quitar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}