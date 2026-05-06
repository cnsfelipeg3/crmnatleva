import { useEffect } from "react";

/**
 * Mantém uma CSS var `--app-vh` sincronizada com a altura REAL do
 * visual viewport (considera teclado virtual no iOS/Android).
 *
 * Use no CSS: `height: var(--app-vh, 100dvh)` ou classe `h-app-vh`.
 * NÃO bloqueia scroll do body, NÃO força window.scrollTo.
 */
export function useMobileViewportHeight(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const root = document.documentElement;

    const setHeight = () => {
      const vv = window.visualViewport;
      const h = vv ? vv.height : window.innerHeight;
      root.style.setProperty("--app-vh", `${h}px`);
    };

    setHeight();

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", setHeight);
    } else {
      window.addEventListener("resize", setHeight);
    }

    return () => {
      if (vv) vv.removeEventListener("resize", setHeight);
      else window.removeEventListener("resize", setHeight);
      root.style.removeProperty("--app-vh");
    };
  }, [enabled]);
}
