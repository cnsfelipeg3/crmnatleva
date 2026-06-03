import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Store,
  Users2,
  Wallet,
  Target,
  Trophy,
  Images,
  UserCog,
  LogOut,
} from "lucide-react";
import logoNatleva from "@/assets/logo-natleva.webp";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const mainItems = [
  { title: "Início", url: "/vitrine", icon: LayoutDashboard, end: true },
  { title: "Pacotes pra vender", url: "/vitrine/pacotes", icon: Store },
  { title: "Minhas indicações", url: "/vitrine/indicacoes", icon: Users2 },
  { title: "Comissões", url: "/vitrine/comissoes", icon: Wallet },
];

const growthItems = [
  { title: "Metas", url: "/vitrine/metas", icon: Target },
  { title: "Premiações", url: "/vitrine/premiacoes", icon: Trophy },
  { title: "Materiais", url: "/vitrine/materiais", icon: Images },
];

const accountItems = [
  { title: "Meu perfil", url: "/vitrine/perfil", icon: UserCog },
];

export default function AffiliateSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();

  const isActive = (url: string, end?: boolean) =>
    end ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  const renderGroup = (label: string, items: typeof mainItems) => (
    <SidegroupBlock
      label={label}
      items={items}
      collapsed={collapsed}
      isActive={isActive}
    />
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-emerald-900/30">
      <SidebarHeader className="px-3 py-4 border-b border-emerald-900/25">
        <div className="flex items-center gap-2.5">
          <img
            src={logoNatleva}
            alt="NatLeva"
            className="h-9 w-auto shrink-0 dark:invert drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]"
          />
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300 font-bold">
                Partners Club
              </span>
              <span className="text-xs text-foreground/70 font-medium">
                NatLeva · seu próximo nível
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1.5">
        {renderGroup("Operação", mainItems)}
        {renderGroup("Crescimento", growthItems)}
        {renderGroup("Conta", accountItems)}
      </SidebarContent>


      <SidebarFooter className="p-2 border-t border-emerald-900/15">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/vitrine/login";
          }}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

function SidegroupBlock({
  label,
  items,
  collapsed,
  isActive,
}: {
  label: string;
  items: typeof mainItems;
  collapsed: boolean;
  isActive: (url: string, end?: boolean) => boolean;
}) {
  return (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.18em] text-foreground/60 font-semibold">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = isActive(item.url, item.end);
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild isActive={active}>
                  <NavLink
                    to={item.url}
                    end={item.end}
                    className={({ isActive: navActive }) =>
                      [
                        "flex items-center gap-2.5 rounded-md transition-all duration-200",
                        (navActive || active)
                          ? "bg-gradient-to-r from-emerald-950/15 to-amber-500/10 text-emerald-900 dark:from-emerald-400/15 dark:to-amber-300/10 dark:text-emerald-100 font-semibold shadow-[inset_2px_0_0_0_rgb(245,158,11)]"
                          : "hover:bg-foreground/5 text-foreground/85 hover:text-foreground",
                      ].join(" ")
                    }
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0 stroke-[2.2]" />
                    {!collapsed && <span className="truncate text-[13px]">{item.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>

    </SidebarGroup>
  );
}
