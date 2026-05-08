import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "natleva-pwa-install-dismissed";
const DISMISS_DAYS = 7;

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Não mostra em iframe / Lovable preview
    let inIframe = false;
    try { inIframe = window.self !== window.top; } catch { inIframe = true; }
    const host = window.location.hostname;
    const isPreviewHost =
      host.includes("id-preview--") ||
      host.includes("preview--") ||
      host.includes("lovableproject.com") ||
      host.includes("lovableproject-dev.com");
    if (inIframe || isPreviewHost) return;

    // Apenas no desktop (esconde em mobile/tablet)
    const isMobileViewport = window.matchMedia("(max-width: 1024px)").matches;
    const ua = navigator.userAgent || "";
    const isMobileUA = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
    if (isMobileViewport || isMobileUA) return;

    // Apenas na raiz do domínio (sem /proposta, /portal, etc)
    if (window.location.pathname !== "/") return;

    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(ios);

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    const dismissedAt = localStorage.getItem(STORAGE_KEY);
    if (dismissedAt) {
      const days = (Date.now() - Number(dismissedAt)) / 86400000;
      if (days < DISMISS_DAYS) return;
    }

    if (ios) {
      setShow(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setShow(false);
      setDeferredPrompt(null);
    }
  };

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setShow(false);
  };

  if (!show || isStandalone) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] md:left-auto md:right-4 md:max-w-sm">
      <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/95 backdrop-blur-md p-4 shadow-xl">
        <div className="shrink-0 h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          {isIOS ? <Share className="h-5 w-5" /> : <Download className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Instalar NatLeva</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            {isIOS
              ? "Toque em Compartilhar e depois em \"Adicionar à Tela Inicial\"."
              : "Instale o app pra acesso rápido pelo seu celular."}
          </p>
          {!isIOS && (
            <Button size="sm" onClick={install} className="mt-2 h-8">
              Instalar agora
            </Button>
          )}
        </div>
        <button
          onClick={dismiss}
          aria-label="Dispensar"
          className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
