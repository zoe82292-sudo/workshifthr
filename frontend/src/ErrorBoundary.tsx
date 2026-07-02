import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

const IS_DEV = import.meta.env.DEV;

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ShiftWorksHR render error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-shell">
          <section className="panel">
            <h2>Something went wrong loading ShiftWorksHR</h2>
            <p className="file-meta" style={{ marginTop: 12 }}>
              {this.state.error.message}
            </p>
            <p className="file-meta" style={{ marginTop: 12 }}>
              Try a hard refresh (Cmd+Shift+R or Ctrl+Shift+R). If the problem continues, email{" "}
              <a href="mailto:hello@shiftworkshr.com">hello@shiftworkshr.com</a> with what you were
              doing when this appeared.
            </p>
            {IS_DEV ? (
              <p className="file-meta" style={{ marginTop: 12 }}>
                Local dev: restart with <code>./start.sh</code> and open{" "}
                <a href="http://localhost:8080">http://localhost:8080</a>.
              </p>
            ) : null}
            <button
              className="button button-primary"
              style={{ marginTop: 16 }}
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </section>
        </div>
      );
    }

    return this.props.children;
  }
}
