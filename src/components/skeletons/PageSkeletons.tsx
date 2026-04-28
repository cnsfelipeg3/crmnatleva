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
 * Roteador de skeleton baseado no pathname atual.
 * Usado pelo Suspense global para evitar spinner sem contexto.
 */
export function RouteAwareSkeleton({ pathname }: { pathname: string }) {
  if (pathname.startsWith("/sales/") && pathname.length > "/sales/".length) {
    return <DetailPageSkeleton />;
  }
  if (pathname.startsWith("/sales") || pathname.startsWith("/passengers") || pathname.startsWith("/viagens")) {
    return <ListPageSkeleton />;
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
