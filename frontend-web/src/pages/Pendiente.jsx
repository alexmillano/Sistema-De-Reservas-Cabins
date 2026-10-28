export default function Pendiente({ titulo }) {
  return (
    <section className="seccion centrado">
      <h1>{titulo}</h1>
      <p>Esta sección se construye en las próximas semanas.</p>
    </section>
  );
}

export function NoEncontrada() {
  return (
    <section className="seccion centrado">
      <h1>Página no encontrada</h1>
      <p>La dirección que buscás no existe.</p>
    </section>
  );
}