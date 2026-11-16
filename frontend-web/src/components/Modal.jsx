// Ventana emergente simple: se cierra al hacer clic afuera
export default function Modal({ titulo, onCerrar, children }) {
  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="modal modal-ancho" onClick={(e) => e.stopPropagation()}>
        <h3>{titulo}</h3>
        {children}
      </div>
    </div>
  );
}
