import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AffiliateSidebar from "./AffiliateSidebar";
import { useAffiliateProfile } from "./useAffiliateProfile";
import { useAffiliateStats } from "./useAffiliateStats";
import { useAffiliateLevels, resolveLevel } from "./useAffiliateLevel";
import { smartCapitalizeName } from "@/lib/nameUtils";

export default function AffiliateLayout({ children }: { children: ReactNode }) {
  const { data: affiliate } = useAffiliateProfile();
  const { data: stats } = useAffiliateStats(affiliate?.id);
  const { data: tiers = [] } = useAffiliateLevels();
  const firstName = smartCapitalizeName(affiliate?.full_name?.split(" ")[0]) || "Afiliado";

  const lvl = tiers.length
    ? resolveLevel(tiers, stats?.closedThisMonth ?? 0, stats?.totalEarned ?? 0)
    : null;
  const current = lvl?.current;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#fbf9f4] dark:bg-background">
        <AffiliateSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between px-3 sm:px-5 border-b border-border/60 bg-background/85 backdrop-blur-xl sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Olá, <span className="font-medium text-foreground">{firstName}</span>
              </span>
            </div>
            {current && (
              <div
                className="flex items-center gap-2 rounded-full pl-2 pr-3.5 py-1 border text-xs font-semibold transition-all hover:scale-[1.02]"
                style={{
                  borderColor: `${current.color}55`,
                  background: `linear-gradient(135deg, ${current.color}18, ${current.color}08)`,
                  color: current.color,
                }}
              >
                <span className="h-6 w-6 rounded-full grid place-items-center text-sm"
                  style={{ background: `${current.color}22` }}>
                  {current.emoji}
                </span>
                <span>Nível {current.name}</span>
                {lvl?.next && (
                  <span className="text-[10px] opacity-70 font-normal ml-1">· {lvl.progress}% pro próximo</span>
                )}
              </div>
            )}
          </header>
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
