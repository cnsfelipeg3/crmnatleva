import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logoNatleva from "@/assets/logo-natleva.png";
import {
  LayoutDashboard, Plus, List, Settings, LogOut, Plane, Users,
  ChevronLeft, ChevronRight, ClipboardCheck, Hotel, Sun, Moon, Cake, FileUp,
  AlertTriangle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/sales/new", icon: Plus, label: "Nova Venda" },
  { to: "/sales", icon: List, label: "Vendas" },
  { to: "/checkin", icon: ClipboardCheck, label: "Fazer Check-in" },
  { to: "/hospedagem", icon: Hotel, label: "Confirmar Hospedagens" },
  { to: "/passengers", icon: Users, label: "Passageiros" },
  { to: "/birthdays", icon: Cake, label: "Aniversariantes" },
  { to: "/pendencias", icon: AlertTriangle, label: "Pendências" },
  { to: "/import", icon: FileUp, label: "Importar Dados" },
  { to: "/settings", icon: Settings, label: "Configurações" },
];

interface Props {
  mobile?: boolean;
  onNavigate?: () => void;
}

export default function AppSidebar({ mobile, onNavigate }: Props) {
  const { profile, role, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  // On mobile, never collapse
  const isCollapsed = mobile ? false : collapsed;

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  return (
    <aside
      className={cn(
        "flex flex-col shrink-0 border-r border-sidebar-border transition-all duration-300 relative overflow-hidden h-full",
        mobile ? "w-full" : (isCollapsed ? "w-[68px]" : "w-[240px]")
      )}
      style={{
        background: `linear-gradient(180deg, hsl(var(--sidebar-background)) 0%, hsl(var(--sidebar-background) / 0.95) 100%)`,
      }}
    >
      {/* Subtle grid overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(hsl(160 60% 50% / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(160 60% 50% / 0.3) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Glow accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-[1px]"
        style={{ background: 'linear-gradient(90deg, transparent, hsl(160 60% 50% / 0.5), transparent)' }}
      />

      <div className="relative flex items-center gap-2 p-4 border-b border-sidebar-border min-h-[64px]">
        {!isCollapsed && (
          <img src={logoNatleva} alt="NatLeva" className="h-8 brightness-0 invert opacity-90" />
        )}
        {isCollapsed && <Plane className="w-6 h-6 text-sidebar-primary mx-auto" />}
      </div>

      <nav className="relative flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            data-testid={`nav-${item.to.replace(/\//g, "").replace(/\s/g, "-") || "home"}`}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative group",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_12px_hsl(160_60%_50%_/_0.08)]"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary shadow-[0_0_8px_hsl(160_60%_50%_/_0.5)]" />
                )}
                <item.icon className={cn("w-5 h-5 shrink-0 transition-colors", isActive && "text-sidebar-primary")} />
                {!isCollapsed && <span>{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="relative border-t border-sidebar-border p-3 space-y-1.5">
        {!isCollapsed && profile && (
          <div className="px-2 mb-2">
            <p className="text-xs font-semibold truncate text-sidebar-foreground">{profile.full_name || profile.email}</p>
            <p className="text-[10px] text-sidebar-foreground/40 capitalize font-mono tracking-wider">{role}</p>
          </div>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/50 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground w-full transition-all duration-200"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Sair</span>}
        </button>
        <button
          onClick={() => setDark(!dark)}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/50 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground w-full transition-all duration-200"
        >
          {dark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
          {!isCollapsed && <span>{dark ? "Tema Claro" : "Tema Escuro"}</span>}
        </button>
        {!mobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center p-2 rounded-lg text-sidebar-foreground/30 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 w-full transition-all duration-200"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>
    </aside>
  );
}
