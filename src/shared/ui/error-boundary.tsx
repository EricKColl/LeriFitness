import { Component, type ReactNode } from 'react'

/** Muestra `fallback` si algo del subárbol falla al renderizar (p. ej. WebGL no disponible). */
export class ErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
