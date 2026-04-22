import { Suspense, lazy } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import PanelHelpButton from "./PanelHelpButton";
import { MinimalLoader } from "./AppLoaders";
import DeferredRender from "./DeferredRender";
import { useIsMobile } from "@/hooks/use-mobile";
import { useFullscreen } from "@/hooks/useFullscreen";
import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Menu, Maximize, Minimize } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import logoNatleva from "@/assets/logo-natleva.png";

const IMMERSIVE_ROUTES: string[] = ["/operacao/inbox"];
const GlobalSearch = lazy(() => import("./GlobalSearch"));
const AIPageSummaryButton = lazy(() => import("./AIPageSummaryButton"));

export default function AppLayout() {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isImmersive = IMMERSIVE_ROUTES.includes(location.pathname);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        {!isImmersive && (
          <header className="flex items-center justify-between px-4 h-14 border-b border-border/20 bg-card/95 shrink-0 z-30">
            <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded-xl hover:bg-primary/5 transition-colors">
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            <DeferredRender fallback={<div className="w-full max-w-[240px] h-8 rounded-lg border border-border/60 bg-muted/20" />}>
              <Suspense fallback={<div className="w-full max-w-[240px] h-8 rounded-lg border border-border/60 bg-muted/20" />}>
                <GlobalSearch />
              </Suspense>
            </DeferredRender>
            <div className="flex items-center gap-2">
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
              <div className="relative h-5 flex items-center">
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

        <main className={cn("flex-1 min-h-0", isImmersive ? "overflow-hidden" : "overflow-auto")}>
          <Suspense fallback={<MinimalLoader inline />}>
            <div className="page-enter">
              <Outlet />
            </div>
          </Suspense>
        </main>
        <PanelHelpButton />
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
        <main className={cn("flex-1 overflow-auto min-h-0", isImmersive && "overflow-hidden")}>
          <Suspense fallback={<MinimalLoader inline />}>
            <div className="page-enter">
              <Outlet />
            </div>
          </Suspense>
        </main>
        <PanelHelpButton />
      </div>
    </div>
  );
}
