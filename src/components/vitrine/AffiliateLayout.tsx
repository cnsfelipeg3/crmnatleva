import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AffiliateSidebar from "./AffiliateSidebar";
import { useAffiliateProfile } from "./useAffiliateProfile";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export default function AffiliateLayout({ children }: { children: ReactNode }) {
  const { data: affiliate } = useAffiliateProfile();
  const firstName = affiliate?.full_name?.split(" ")[0] || "Afiliado";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#fbf9f4] dark:bg-background">
        <AffiliateSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between px-3 sm:px-5 border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Olá, <span className="font-medium text-foreground">{firstName}</span>
              </span>
            </div>
            <Badge
              variant="outline"
              className="gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            >
              <Sparkles className="h-3 w-3" />
              Nível Bronze
            </Badge>
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
