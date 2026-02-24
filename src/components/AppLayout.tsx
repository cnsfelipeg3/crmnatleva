import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import logoNatleva from "@/assets/logo-natleva.png";

export default function AppLayout() {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between px-4 h-14 border-b border-border bg-card/80 backdrop-blur-md shrink-0 z-30">
          <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors">
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <img src={logoNatleva} alt="NatLeva" className="h-6 brightness-0 dark:invert opacity-80" />
          <div className="w-9" /> {/* spacer for centering */}
        </header>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-[280px] border-r-0 bg-transparent">
            <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
            <AppSidebar mobile onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
