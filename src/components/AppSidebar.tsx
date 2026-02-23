import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logoNatleva from "@/assets/logo-natleva.png";
import {
  LayoutDashboard, Plus, List, Settings, LogOut, Plane, Users,
  ChevronLeft, ChevronRight, ClipboardCheck, Hotel,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/sales/new", icon: Plus, label: "Nova Venda" },
  { to: "/sales", icon: List, label: "Vendas" },
  { to: "/checkin", icon: ClipboardCheck, label: "Check-in" },
  { to: "/hospedagem", icon: Hotel, label: "Confirmar Hospedagens" },
  { to: "/passengers", icon: Users, label: "Passageiros" },
  { to: "/settings", icon: Settings, label: "Configurações" },
];

export default function AppSidebar() {
  const { profile, role, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 shrink-0",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      <div className="flex items-center gap-2 p-4 border-b border-sidebar-border min-h-[64px]">
        {!collapsed && (
          <img src={logoNatleva} alt="NatLeva" className="h-8 brightness-0 invert" />
        )}
        {collapsed && <Plane className="w-6 h-6 text-sidebar-primary mx-auto" />}
      </div>

      <nav className="flex-1 py-3 px-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )
            }
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-2">
        {!collapsed && profile && (
          <div className="px-2 mb-2">
            <p className="text-xs font-semibold truncate">{profile.full_name || profile.email}</p>
            <p className="text-xs text-sidebar-foreground/50 capitalize">{role}</p>
          </div>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground w-full transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center p-2 rounded-lg text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
