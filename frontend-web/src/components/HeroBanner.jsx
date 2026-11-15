import { Link } from "react-router-dom";
import "./HeroBanner.css";
import escenaDesktop from "../assets/hero-cabins-desktop.svg";
import escenaMovil from "../assets/hero-cabins-movil.svg";

/**
 * Banner principal de Cabins.
 * Props:
 * - cta: { texto, to } → botón principal (lo decide Inicio.jsx según el usuario)
 * - anclaSecundaria: id de la sección a la que baja el botón secundario
 */
export default function HeroBanner({ cta, anclaSecundaria = "como-alquilar" }) {
  return (
    <section className="hero-cabins">
      <picture className="hero-cabins__fondo" aria-hidden="true">
        <source media="(max-width: 640px)" srcSet={escenaMovil} />
        <img src={escenaDesktop} alt="" />
      </picture>

      <div className="hero-cabins__contenido">
        <span className="hero-cabins__chip">
          <span className="hero-cabins__punto" />
          Refugios en la naturaleza argentina
        </span>

        <h1 className="hero-cabins__titulo">
          El fuego está prendido.<br className="hero-cabins__salto" /> Tu cabaña te está{" "}
          <em>esperando</em>.
        </h1>

        <p className="hero-cabins__bajada">
          Olor a leña, una manta y el silencio de la montaña. Dejá la ciudad atrás
          y despertate frente a los paisajes más lindos de Argentina.
        </p>

        <div className="hero-cabins__botones">
          <Link to={cta.to} className="hero-btn hero-btn--primario">
            {cta.texto}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
            </svg>
          </Link>
          <a href={`#${anclaSecundaria}`} className="hero-btn hero-btn--secundario">
            Cómo funciona
          </a>
        </div>

        <p className="hero-cabins__regiones">Patagonia · Cuyo · Sierras · Norte</p>
      </div>
    </section>
  );
}
