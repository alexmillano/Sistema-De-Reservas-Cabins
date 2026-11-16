import { useState } from 'react';
import api, { mensajeError } from '../api/client';
import Modal from './Modal';

const MAX_MOTIVO = 500;

// Suspender una cuenta (con motivo opcional). base: '/admins' o '/usuarios'
export function ModalSuspender({ base, cuenta, onCerrar, onListo }) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const confirmar = async () => {
    setEnviando(true);
    setError('');
    try {
      const { data } = await api.put(`${base}/${cuenta.id}/banear`, { motivo: motivo.trim() || undefined });
      await onListo(data.message);
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  };

  return (
    <Modal titulo="Suspender cuenta" onCerrar={onCerrar}>
      <p>
        <strong>{cuenta.nombre} {cuenta.apellido}</strong> (@{cuenta.usuario}) perderá el acceso al sistema.
        Podés reactivarla cuando quieras.
      </p>
      <div className="campo">
        <label htmlFor="s-motivo">Motivo (opcional, {motivo.length}/{MAX_MOTIVO})</label>
        <textarea id="s-motivo" rows="3" maxLength={MAX_MOTIVO} value={motivo}
          onChange={(e) => setMotivo(e.target.value)} />
      </div>
      {error && <div className="mensaje-error">{error}</div>}
      <div className="modal-botones">
        <button type="button" className="btn btn-secundario" onClick={onCerrar}>Cancelar</button>
        <button type="button" className="btn btn-peligro" onClick={confirmar} disabled={enviando}>
          {enviando ? 'Suspendiendo...' : 'Suspender'}
        </button>
      </div>
    </Modal>
  );
}

// Reactivar una cuenta suspendida
export function ModalReactivar({ base, cuenta, onCerrar, onListo }) {
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const confirmar = async () => {
    setEnviando(true);
    setError('');
    try {
      const { data } = await api.put(`${base}/${cuenta.id}/desbanear`);
      await onListo(data.message);
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  };

  return (
    <Modal titulo="Reactivar cuenta" onCerrar={onCerrar}>
      <p>¿Querés reactivar la cuenta de <strong>{cuenta.nombre} {cuenta.apellido}</strong> (@{cuenta.usuario})?</p>
      {error && <div className="mensaje-error">{error}</div>}
      <div className="modal-botones">
        <button type="button" className="btn btn-secundario" onClick={onCerrar}>Cancelar</button>
        <button type="button" className="btn" onClick={confirmar} disabled={enviando}>
          {enviando ? 'Reactivando...' : 'Reactivar'}
        </button>
      </div>
    </Modal>
  );
}

// Eliminar definitivamente (solo cuentas ya suspendidas). consecuencias: texto del aviso
export function ModalEliminar({ base, cuenta, consecuencias, onCerrar, onListo }) {
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const confirmar = async () => {
    setEnviando(true);
    setError('');
    try {
      const { data } = await api.delete(`${base}/${cuenta.id}`);
      await onListo(data.message, data);
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  };

  return (
    <Modal titulo="Eliminar definitivamente" onCerrar={onCerrar}>
      <div className="mensaje-error"><strong>Esta acción no se puede deshacer.</strong> {consecuencias}</div>
      <p className="cuenta-afectada">
        <strong>{cuenta.nombre} {cuenta.apellido}</strong><br />
        <span className="texto-suave">@{cuenta.usuario} · {cuenta.email}</span>
      </p>
      {error && <div className="mensaje-error">{error}</div>}
      <div className="modal-botones">
        <button type="button" className="btn btn-secundario" onClick={onCerrar}>Cancelar</button>
        <button type="button" className="btn btn-peligro" onClick={confirmar} disabled={enviando}>
          {enviando ? 'Eliminando...' : 'Eliminar definitivamente'}
        </button>
      </div>
    </Modal>
  );
}
