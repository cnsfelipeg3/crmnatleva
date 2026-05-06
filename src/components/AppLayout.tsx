import { Suspense, lazy, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import PermissionGuard from "./PermissionGuard";

const PanelHelpButton = lazy(() => import("./PanelHelpButton"));
import { MinimalLoader } from "./AppLoaders";
import DeferredRender from "./DeferredRender";
import { useIsMobile } from "@/hooks/use-mobile";
import { useFullscreen } from "@/hooks/useFullscreen";
import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Menu, Maximize, Minimize, WifiOff, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import logoNatleva from "@/assets/logo-natleva.webp";
import { useWhatsAppConnection, formatTimeSince } from "@/hooks/useWhatsAppConnection";
import { useFailedMessagesWatcher } from "@/hooks/useFailedMessagesWatcher";
import { FailedMessagesBadge } from "@/components/header/FailedMessagesBadge";

const IMMERSIVE_ROUTES: string[] = ["/operacao/inbox"];
const GlobalSearch = lazy(() => import("./GlobalSearch"));
const AIPageSummaryButton = lazy(() => import("./AIPageSummaryButton"));

function WhatsAppStatusBanner() {
  const wa = useWhatsAppConnection();
  const navigate = useNavigate();

  if (!wa.lastEvent) return null;

  if (!wa.isConnected) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-2 bg-destructive/15 border-b-2 border-destructive text-destructive text-sm shrink-0 animate-pulse">
        <div className="flex items-center gap-2 min-w-0">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span className="truncate">
            <strong>WhatsApp desconectado</strong>
            {" — "}
            {wa.lastEvent === "disconnected"
              ? `caiu ${formatTimeSince(wa.secondsSince)}`
              : `sem resposta ${formatTimeSince(wa.secondsSince)}`}
            {wa.errorMessage ? ` · ${wa.errorMessage}` : ""}
            . Mensagens novas não chegam ao CRM até reconectar.
          </span>
        </div>
        <button
          onClick={() => navigate("/whatsapp")}
          className="text-xs font-semibold underline hover:no-underline shrink-0"
        >
          Ler QR
        </button>
      </div>
    );
  }

  if (wa.isStale) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 text-amber-700 dark:text-amber-300 text-sm shrink-0">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span className="truncate">
          Sem confirmação de conexão Z-API {formatTimeSince(wa.secondsSince)}. Pode ter caído sem aviso.
        </span>
      </div>
    );
  }

  return null;
}

export default function AppLayout() {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isImmersive = IMMERSIVE_ROUTES.includes(location.pathname);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  useFailedMessagesWatcher();

  if (isMobile) {
    return (
      <div
        className="flex flex-col h-[100dvh] overflow-hidden bg-background"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {!isImmersive && (
          <header
            className="flex items-center justify-between gap-2 px-3 h-14 border-b border-border/20 bg-card/95 shrink-0 z-30 backdrop-blur-md"
            style={{ paddingTop: "env(safe-area-inset-top)", height: "calc(3.5rem + env(safe-area-inset-top))" }}
          >
            <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded-xl hover:bg-primary/5 transition-colors">
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            <DeferredRender fallback={<div className="w-full max-w-[240px] h-8 rounded-lg border border-border/60 bg-muted/20" />}>
              <Suspense fallback={<div className="w-full max-w-[240px] h-8 rounded-lg border border-border/60 bg-muted/20" />}>
                <GlobalSearch />
              </Suspense>
            </DeferredRender>
            <div className="flex items-center gap-2">
              <FailedMessagesBadge />
              <DeferredRender>
                <Suspense fallback={null}>
                  <AIPageSummaryButton />
                </Suspense>
              </DeferredRender>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={toggleFullscreen}
                      className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-colors"
                    >
                      {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {isFullscreen ? "Sair da tela cheia" : "Entrar em tela cheia"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="relative h-[17px] flex items-center">
                <img
                  src={logoNatleva}
                  alt="NatLeva"
                  className="h-full w-auto object-contain"
                  style={{ filter: 'brightness(0) invert(1)' }}
                  draggable={false}
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ backgroundColor: 'hsl(var(--champagne))', mixBlendMode: 'multiply' }}
                />
              </div>
            </div>
          </header>
        )}

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-[280px] border-r-0 bg-transparent">
            <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
            <AppSidebar mobile onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <WhatsAppStatusBanner />

        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-1.5 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:shadow-lg focus:text-sm"
        >
          Pular para o conteúdo
        </a>
        <main
          id="main-content"
          tabIndex={-1}
          className={cn("flex-1 min-h-0 outline-none", isImmersive ? "overflow-hidden" : "overflow-auto")}
        >
          <Suspense fallback={<MinimalLoader inline />}>
            <div className={cn("page-enter", isImmersive && "flex h-full min-h-0 flex-col overflow-hidden")}>
              <PermissionGuard>
                <Outlet />
              </PermissionGuard>
            </div>
          </Suspense>
        </main>
        <Suspense fallback={null}>
          <PanelHelpButton />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {!isImmersive && (
          <header className="flex items-center justify-between px-5 h-[3.25rem] border-b border-border/12 bg-card/95 shrink-0 z-20">
            <DeferredRender fallback={<div className="w-full max-w-[240px] h-8 rounded-lg border border-border/60 bg-muted/20" />}>
              <Suspense fallback={<div className="w-full max-w-[240px] h-8 rounded-lg border border-border/60 bg-muted/20" />}>
                <GlobalSearch />
              </Suspense>
            </DeferredRender>
            <div className="flex items-center gap-3">
              <FailedMessagesBadge />
              <DeferredRender>
                <Suspense fallback={null}>
                  <AIPageSummaryButton />
                </Suspense>
              </DeferredRender>
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={toggleFullscreen}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {isFullscreen ? "Sair da tela cheia" : "Entrar em tela cheia"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70 font-mono tracking-wider uppercase">
                <span className="hidden md:inline">NatLeva</span>
                <div className="w-1.5 h-1.5 rounded-full bg-eucalyptus/60" />
              </div>
            </div>
          </header>
        )}
        <WhatsAppStatusBanner />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-1.5 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:shadow-lg focus:text-sm"
        >
          Pular para o conteúdo
        </a>
        <main
          id="main-content"
          tabIndex={-1}
          className={cn("flex-1 overflow-auto min-h-0 outline-none", isImmersive && "overflow-hidden")}
        >
          <Suspense fallback={<MinimalLoader inline />}>
            <div className={cn("page-enter", isImmersive && "flex h-full min-h-0 flex-col overflow-hidden")}>
              <PermissionGuard>
                <Outlet />
              </PermissionGuard>
            </div>
          </Suspense>
        </main>
        <Suspense fallback={null}>
          <PanelHelpButton />
        </Suspense>
      </div>
    </div>
  );
}
