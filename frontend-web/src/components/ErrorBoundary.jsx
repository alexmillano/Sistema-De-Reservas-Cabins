import { Component } from 'react';

// Si una pantalla falla al dibujarse, muestra un aviso en vez de dejar toda la página en blanco
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { fallo: false };
  }

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  componentDidCatch(error) {
    console.error('Error al mostrar la pantalla:', error);
  }

  render() {
    if (!this.state.fallo) return this.props.children;
    return (
      <section className="seccion centrado">
        <h1>Algo salió mal</h1>
        <p>No se pudo mostrar esta pantalla. Puede que el servidor todavía se esté actualizando.</p>
        <button type="button" className="btn" onClick={() => window.location.reload()}>Recargar la página</button>
      </section>
    );
  }
}
