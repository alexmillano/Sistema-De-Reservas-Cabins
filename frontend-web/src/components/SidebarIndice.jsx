export default function SidebarIndice({ titulo, enlaces }) {
  return (
    <aside className="sidebar tarjeta">
      <h3>{titulo}</h3>
      <nav className="indice">
        {enlaces.map((e) => (
          <a key={e.destino} href={`#${e.destino}`}>{e.texto}</a>
        ))}
      </nav>
    </aside>
  );
}