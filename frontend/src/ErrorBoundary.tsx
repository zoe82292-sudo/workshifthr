import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("WorkShift HR render error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-shell">
          <section className="panel">
            <h2>Something went wrong loading WorkShift HR</h2>
            <p className="file-meta" style={{ marginTop: 12 }}>
              {this.state.error.message}
            </p>
            <p className="file-meta" style={{ marginTop: 12 }}>
              Try a hard refresh (Cmd+Shift+R). If the page is still blank, restart the
              app with <code>./start.sh</code> from the WorkShift HR folder and open{" "}
              <a href="http://localhost:8080">http://localhost:8080</a>.
            </p>
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
