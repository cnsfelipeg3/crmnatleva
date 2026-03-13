import { Outlet, useLocation } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import GlobalSearch from "./GlobalSearch";
import AIPageSummaryButton from "./AIPageSummaryButton";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import logoNatleva from "@/assets/logo-natleva.png";

const IMMERSIVE_ROUTES: string[] = ["/operacao/inbox"];

export default function AppLayout() {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isImmersive = IMMERSIVE_ROUTES.includes(location.pathname);

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        {!isImmersive && (
          <header className="flex items-center justify-between px-4 h-14 border-b border-border bg-card/80 backdrop-blur-md shrink-0 z-30">
            <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors">
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            <GlobalSearch />
            <div className="flex items-center gap-2">
              <AIPageSummaryButton />
              <img src={logoNatleva} alt="NatLeva" className="h-5 brightness-0 dark:invert opacity-80" />
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
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {!isImmersive && (
          <header className="flex items-center justify-between px-4 h-12 border-b border-border/40 bg-card/50 backdrop-blur-md shrink-0 z-20">
            <GlobalSearch />
            <div className="flex items-center gap-3">
              <AIPageSummaryButton />
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                <span className="hidden md:inline">NatLeva Intelligence</span>
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              </div>
            </div>
          </header>
        )}
        <main className={cn("flex-1 overflow-auto", isImmersive && "overflow-hidden")}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
