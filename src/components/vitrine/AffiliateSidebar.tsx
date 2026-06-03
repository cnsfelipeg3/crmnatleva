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
            className="h-9 w-auto shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
            style={{ filter: "brightness(0) invert(1)" }}
          />
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] uppercase tracking-[0.22em] text-amber-300 font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">
                Partners Club
              </span>
              <span className="text-xs text-white/85 font-medium">
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


      <SidebarFooter className="p-2 border-t border-white/10">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-white/70 hover:text-white hover:bg-white/10"
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
        <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.18em] text-amber-200/70 font-bold">
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
                          ? "bg-gradient-to-r from-emerald-500/25 to-amber-400/15 text-white font-semibold shadow-[inset_3px_0_0_0_rgb(251,191,36),0_4px_12px_-4px_rgba(0,0,0,0.5)]"
                          : "text-white/80 hover:bg-white/10 hover:text-white",
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
