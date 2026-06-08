import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { forceAppRefresh } from "@/lib/forceRefresh";

const ERROR_RECOVERY_KEY = "__natleva_error_boundary_recovery__";
const STALE_MODULE_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /Loading chunk/i,
  /ChunkLoadError/i,
  /Unable to preload CSS/i,
];

function isStaleModuleError(error: Error) {
  const text = `${error.name} ${error.message} ${error.stack ?? ""}`;
  return STALE_MODULE_PATTERNS.some((pattern) => pattern.test(text));
}

interface State {
  hasError: boolean;
  error: Error | null;
}

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * ErrorBoundary global · captura erros de render e mostra fallback amigável
 * em vez de tela branca. Em dev mostra stack trace; em prod mostra só CTA
 * de recuperação.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);

    if (isStaleModuleError(error)) {
      const lastRecovery = Number(sessionStorage.getItem(ERROR_RECOVERY_KEY) || "0");
      if (Date.now() - lastRecovery > 30_000) {
        sessionStorage.setItem(ERROR_RECOVERY_KEY, String(Date.now()));
        void forceAppRefresh({ silent: true });
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleHardRefresh = () => {
    void forceAppRefresh({ silent: true });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return <>{this.props.fallback}</>;
      const isDev = import.meta.env.DEV;
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Algo deu errado nesta tela
            </h2>
            <p className="text-sm text-muted-foreground">
              O erro foi registrado. Tenta recarregar · se persistir, volta pro
              dashboard.
            </p>
            <div className="flex flex-wrap gap-2 justify-center pt-2">
              <Button onClick={this.handleHardRefresh} variant="default" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                Atualizar app
              </Button>
              <Button onClick={this.handleReset} variant="outline" size="sm">
                Tentar de novo
              </Button>
              <Button
                onClick={() => (window.location.href = "/")}
                variant="outline"
                size="sm"
              >
                Ir pro dashboard
              </Button>
            </div>
            {isDev && this.state.error && (
              <pre className="text-left text-xs bg-muted p-3 rounded overflow-auto max-h-48 mt-4">
                {this.state.error.message}
                {"\n"}
                {this.state.error.stack?.slice(0, 1000)}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
