import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import GlobalSearch from "./GlobalSearch";
import AIPageSummaryButton from "./AIPageSummaryButton";
import PanelHelpButton from "./PanelHelpButton";
import NatLevaLoader from "./NatLevaLoader";
import { useIsMobile } from "@/hooks/use-mobile";
import { useFullscreen } from "@/hooks/useFullscreen";
import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Menu, Maximize, Minimize } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import logoNatleva from "@/assets/logo-natleva.png";

const IMMERSIVE_ROUTES: string[] = ["/operacao/inbox"];

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
          <header className="flex items-center justify-between px-4 h-14 border-b border-border/20 bg-card/60 backdrop-blur-xl saturate-[1.8] shrink-0 z-30">
            <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded-xl hover:bg-primary/5 transition-colors">
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            <GlobalSearch />
            <div className="flex items-center gap-2">
              <AIPageSummaryButton />
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
              <img
                src={logoNatleva}
                alt="NatLeva"
                className="h-5"
                style={{ filter: 'brightness(0) invert(1) sepia(1) saturate(3) hue-rotate(2deg) brightness(0.82)' }}
              />
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
          <Suspense fallback={<NatLevaLoader />}>
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
          <header className="flex items-center justify-between px-5 h-[3.5rem] border-b border-border/15 bg-card/40 backdrop-blur-xl saturate-[1.8] shrink-0 z-20">
            <GlobalSearch />
            <div className="flex items-center gap-3">
              <AIPageSummaryButton />
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={toggleFullscreen}
                      className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-colors"
                    >
                      {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {isFullscreen ? "Sair da tela cheia" : "Entrar em tela cheia"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                <span className="hidden md:inline">NatLeva Intelligence</span>
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              </div>
            </div>
          </header>
        )}
        <main className={cn("flex-1 overflow-auto min-h-0", isImmersive && "overflow-hidden")}>
          <Suspense fallback={<NatLevaLoader />}>
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
