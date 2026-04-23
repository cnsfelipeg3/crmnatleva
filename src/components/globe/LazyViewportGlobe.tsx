import { lazy, Suspense, useEffect, useRef, useState } from "react";

const TravelGlobe = lazy(() => import("@/components/globe/TravelGlobe"));

interface LazyViewportGlobeProps {
  className?: string;
  /**
   * Margem em px para começar a carregar ANTES de entrar na tela.
   * Padrão 400px = começa a baixar quando o globo está a 400px de
   * distância da viewport (evita o usuário ver o spinner por muito
   * tempo quando rola rápido).
   */
  rootMargin?: string;
}

/**
 * Só monta o <TravelGlobe /> quando o container está prestes a entrar
 * na viewport. Isso adia o download de ~3 MB do Cesium para o momento
 * em que o usuário realmente vai ver o globo, em vez de começar a
 * baixar junto com o resto da Dashboard.
 */
export default function LazyViewportGlobe({
  className,
  rootMargin = "400px",
}: LazyViewportGlobeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (shouldLoad) return;
    const el = containerRef.current;
    if (!el) return;

    // Fallback para navegadores sem IntersectionObserver
    if (typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShouldLoad(true);
          obs.disconnect();
        }
      },
      { rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [shouldLoad, rootMargin]);

  // Placeholder com a MESMA altura do globo para evitar layout shift.
  // Reusa exatamente o visual do Suspense fallback original.
  const placeholder = (
    <div className="h-[500px] rounded-2xl bg-card/40 border border-border/20 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
    </div>
  );

  return (
    <div ref={containerRef}>
      {shouldLoad ? (
        <Suspense fallback={placeholder}>
          <TravelGlobe className={className} />
        </Suspense>
      ) : (
        placeholder
      )}
    </div>
  );
}
