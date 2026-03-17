import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="cyber-box border-rose-600 rounded-2xl p-8 max-w-lg w-full bg-rose-950/20">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="text-rose-400 flex-shrink-0" size={32} />
              <h1 className="text-2xl font-black text-rose-300">Coś poszło nie tak</h1>
            </div>

            <p className="text-rose-200 mb-6">
              Aplikacja napotkała nieoczekiwany błąd. Spróbuj odświeżyć stronę.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 p-4 bg-black/40 rounded-lg border border-rose-900">
                <summary className="text-rose-400 font-mono text-sm cursor-pointer mb-2">
                  Szczegóły błędu (dev mode)
                </summary>
                <pre className="text-xs text-rose-300 overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-3 px-6 rounded-xl border-2 border-rose-500 text-rose-300 bg-rose-950/50 hover:bg-rose-500 hover:text-black font-bold transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} />
              Odśwież stronę
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
