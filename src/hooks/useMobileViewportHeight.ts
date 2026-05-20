import { useEffect } from "react";

/**
 * Mantém a CSS var `--app-vh` sincronizada com a altura REAL do visual viewport
 * (considera o teclado virtual no iOS/Android) e BLOQUEIA o scroll do documento
 * para evitar que o iOS empurre o conteúdo para cima ao abrir o teclado.
 *
 * Uso no CSS: `height: var(--app-vh, 100dvh)` ou classe `h-app-vh`.
 *
 * Bugs resolvidos:
 *  · iOS PWA "tela voa pra cima" ao focar input com teclado virtual.
 *  · Layout shift do composer quando o teclado abre/fecha.
 */
export function useMobileViewportHeight(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const root = document.documentElement;
    const body = document.body;

    // ── Lock document scroll (impede iOS de "scrollar a página" quando o
    //    teclado abre). Mantém position fixed no body para travar visual.
    const prev = {
      htmlOverflow: root.style.overflow,
      htmlHeight: root.style.height,
      htmlPosition: root.style.position,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyWidth: body.style.width,
      bodyHeight: body.style.height,
      bodyTop: body.style.top,
      bodyOverscroll: (body.style as any).overscrollBehavior,
    };

    root.style.overflow = "hidden";
    root.style.height = "100%";
    root.style.position = "relative";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = "0";
    body.style.width = "100%";
    body.style.height = "100%";
    (body.style as any).overscrollBehavior = "none";

    const setHeight = () => {
      const vv = window.visualViewport;
      const h = vv ? vv.height : window.innerHeight;
      root.style.setProperty("--app-vh", `${h}px`);
      // Clamp: alguns navegadores ainda tentam scrollar o layout viewport
      // quando o input é focado. Forçar 0 mantém o container "fixed" alinhado.
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };

    setHeight();

    const vv = window.visualViewport;
    const onScroll = () => {
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };

    if (vv) {
      vv.addEventListener("resize", setHeight);
      vv.addEventListener("scroll", setHeight);
    } else {
      window.addEventListener("resize", setHeight);
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    // Quando um input/textarea recebe foco, iOS tenta "scrollIntoView" e arrasta
    // o layout. Re-clampamos depois do próximo frame para anular o salto.
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.tagName !== "INPUT" && t.tagName !== "TEXTAREA" && !t.isContentEditable) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (window.scrollY !== 0) window.scrollTo(0, 0);
          setHeight();
        });
      });
    };
    document.addEventListener("focusin", onFocusIn);

    return () => {
      if (vv) {
        vv.removeEventListener("resize", setHeight);
        vv.removeEventListener("scroll", setHeight);
      } else {
        window.removeEventListener("resize", setHeight);
      }
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("focusin", onFocusIn);
      root.style.overflow = prev.htmlOverflow;
      root.style.height = prev.htmlHeight;
      root.style.position = prev.htmlPosition;
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.width = prev.bodyWidth;
      body.style.height = prev.bodyHeight;
      (body.style as any).overscrollBehavior = prev.bodyOverscroll;
      root.style.removeProperty("--app-vh");
    };
  }, [enabled]);
}
