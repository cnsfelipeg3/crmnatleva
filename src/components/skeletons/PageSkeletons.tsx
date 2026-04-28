import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

/**
 * Skeletons consistentes por shape de página.
 * Usar como fallback em Suspense ou enquanto loading inicial == true.
 *
 * Princípios:
 * · usar tokens semânticos (Skeleton já usa bg-muted)
 * · respeitar mesmas alturas/larguras dos blocos reais para evitar layout shift
 * · animação shimmer já vem do componente Skeleton (animate-pulse)
 */

function Row({ className = "" }: { className?: string }) {
  return <Skeleton className={`h-4 w-full ${className}`} />;
}

/** Header padrão de página (título + subtítulo + ações). */
export function PageHeaderSkeleton() {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
    </div>
  );
}

/** Filtros horizontais (chips/inputs). */
export function FiltersBarSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-24 rounded-full" />
      ))}
    </div>
  );
}

/** Linha de KPIs (4 cards). */
export function KPIRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-4 glass-card space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3 w-16" />
        </Card>
      ))}
    </div>
  );
}

/**
 * Skeleton para o Dashboard (KPIs + filtros + grid de cards/charts).
 */
export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-5 animate-fade-in" aria-busy="true" aria-label="Carregando dashboard">
      <PageHeaderSkeleton />
      <FiltersBarSkeleton count={5} />
      <KPIRowSkeleton count={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Skeleton para listas tabulares (Vendas, Passageiros, etc.).
 */
export function ListPageSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="p-6 space-y-5 animate-fade-in" aria-busy="true" aria-label="Carregando lista">
      <PageHeaderSkeleton />
      <FiltersBarSkeleton count={6} />
      {/* Tabela desktop */}
      <Card className="hidden sm:block glass-card overflow-hidden">
        <div className="border-b border-border/60 px-4 py-3 flex gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>
        <div className="divide-y divide-border/40">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-4">
              {Array.from({ length: 6 }).map((__, j) => (
                <Skeleton key={j} className={`h-4 flex-1 ${j === 0 ? "max-w-[40%]" : ""}`} />
              ))}
            </div>
          ))}
        </div>
      </Card>
      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4 glass-card space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-40" />
            <Row className="w-3/4" />
          </Card>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton para páginas de detalhe (SaleDetail, ClientDetail, TripDetail).
 */
export function DetailPageSkeleton() {
  return (
    <div className="p-6 space-y-5 animate-fade-in" aria-busy="true" aria-label="Carregando detalhes">
      {/* Header com voltar */}
      <div className="flex items-start gap-3">
        <Skeleton className="h-9 w-9 rounded-md" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3 w-80" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>

      {/* Resumo financeiro */}
      <KPIRowSkeleton count={4} />

      {/* Conteúdo principal: 2 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5 glass-card space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-32 w-full rounded-md" />
          </Card>
          <Card className="p-5 glass-card space-y-3">
            <Skeleton className="h-5 w-32" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Row key={i} />
              ))}
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="p-5 glass-card space-y-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-24 w-full rounded-md" />
          </Card>
          <Card className="p-5 glass-card space-y-3">
            <Skeleton className="h-5 w-36" />
            <div className="space-y-2">
              <Row />
              <Row className="w-2/3" />
              <Row className="w-1/2" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton para a tela de Login (split branding + form).
 */
export function LoginSkeleton() {
  return (
    <div className="min-h-screen flex" aria-busy="true" aria-label="Carregando login">
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="h-16 w-48 mx-auto bg-sidebar-accent/30" />
          <Skeleton className="h-6 w-64 mx-auto bg-sidebar-accent/30" />
          <Skeleton className="h-4 w-72 mx-auto bg-sidebar-accent/30" />
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-5 animate-fade-in">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-56" />
          <div className="space-y-3 pt-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-3 w-40 mx-auto" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton para autorização/permissão sendo resolvida.
 * Mantém o shell visual da rota sem render fantasma.
 */
export function PermissionResolvingSkeleton({ pathname }: { pathname: string }) {
  return <RouteAwareSkeleton pathname={pathname} />;
}

/**
 * Skeleton para grids de cards (Configurações, atalhos, etc.).
 */
export function CardGridSkeleton({ count = 9, cols = 3 }: { count?: number; cols?: 2 | 3 | 4 }) {
  const colClass = cols === 4 ? "lg:grid-cols-4" : cols === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3";
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${colClass} gap-3 md:gap-4`} aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="p-5 glass-card">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-4 w-32" />
          </div>
        </Card>
      ))}
    </div>
  );
}

/**
 * Skeleton para listas simples (GenericSettingsList).
 */
export function SimpleListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-fade-in" aria-busy="true" aria-label="Carregando lista">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/40">
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-7 w-7 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton para área de anexos (cabeçalho + tabs + linhas).
 */
export function AttachmentsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card className="p-5 glass-card" aria-busy="true" aria-label="Carregando anexos">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-7 w-7 rounded-lg" />
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-4 w-8 rounded-full ml-1" />
      </div>
      <div className="flex gap-2 mb-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-24 rounded-md" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-2.5 w-32" />
            </div>
            <Skeleton className="h-7 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </Card>
  );
}

/**
 * Skeleton para o conteúdo de uma etapa do wizard NewSale (form genérico).
 */
export function WizardStepSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <Card className="p-6 animate-fade-in" aria-busy="true" aria-label="Carregando etapa">
      <div className="space-y-2 mb-5">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-3 w-72" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
    </Card>
  );
}

/**
 * Skeleton do wizard inteiro (header + tabs + step).
 */
export function WizardSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in max-w-5xl mx-auto" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="flex flex-wrap gap-1 bg-muted/30 p-1.5 rounded-xl">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 flex-1 min-w-[80px] rounded-lg" />
        ))}
      </div>
      <WizardStepSkeleton />
    </div>
  );
}

/**
 * Skeleton para conteúdo dentro de um modal/diálogo (edição/duplicação).
 */
export function DialogFormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando formulário">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-2">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
    </div>
  );
}

/**
 * Overlay com progresso para ações longas (export CSV/Excel, gerar relatório).
 * Usar dentro de um container relativo ou em tela inteira (fullscreen=true).
 */
export function ProgressOverlay({
  label = "Processando...",
  progress,
  fullscreen = false,
}: {
  label?: string;
  progress?: number; // 0-100; se ausente, mostra barra indeterminada
  fullscreen?: boolean;
}) {
  const isIndeterminate = progress === undefined;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={
        fullscreen
          ? "fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm"
          : "absolute inset-0 z-30 flex items-center justify-center bg-background/70 backdrop-blur-sm rounded-xl"
      }
    >
      <Card className="p-5 glass-card w-72 space-y-3 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" aria-hidden />
          <p className="text-sm font-medium text-foreground">{label}</p>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          {isIndeterminate ? (
            <div className="h-full w-1/3 bg-primary rounded-full animate-[shimmer_1.4s_infinite]" />
          ) : (
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.max(0, progress!))}%` }}
            />
          )}
        </div>
        {!isIndeterminate && (
          <p className="text-[11px] text-muted-foreground text-right tabular-nums">{Math.round(progress!)}%</p>
        )}
      </Card>
    </div>
  );
}

/**
 * Roteador de skeleton baseado no pathname atual.
 * Usado pelo Suspense global para evitar spinner sem contexto.
 */
export function RouteAwareSkeleton({ pathname }: { pathname: string }) {
  if (pathname === "/login") return <LoginSkeleton />;
  if (pathname.startsWith("/sales/new") || pathname.endsWith("/edit")) {
    return <WizardSkeleton />;
  }
  if (pathname.startsWith("/sales/") && pathname.length > "/sales/".length) {
    return <DetailPageSkeleton />;
  }
  if (pathname.startsWith("/sales") || pathname.startsWith("/passengers") || pathname.startsWith("/viagens")) {
    return <ListPageSkeleton />;
  }
  if (pathname === "/settings" || pathname === "/settings/") {
    return (
      <div className="p-4 md:p-6 space-y-5 animate-fade-in" aria-busy="true">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <CardGridSkeleton count={9} />
      </div>
    );
  }
  if (pathname.startsWith("/settings/")) {
    return (
      <div className="p-4 md:p-6 space-y-5 animate-fade-in" aria-busy="true">
        <PageHeaderSkeleton />
        <SimpleListSkeleton rows={8} />
      </div>
    );
  }
  if (pathname === "/" || pathname.startsWith("/dashboard")) {
    return <DashboardSkeleton />;
  }
  // Fallback genérico
  return (
    <div className="p-6 space-y-5 animate-fade-in" aria-busy="true">
      <PageHeaderSkeleton />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
