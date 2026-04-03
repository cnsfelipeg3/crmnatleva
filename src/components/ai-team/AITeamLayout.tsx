import { NavLink, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Brain, Users, Rocket, BookOpen, Wand2, GitBranch, Database, Shield,
  GraduationCap, MessageSquare, Settings, ChevronLeft, Receipt, Menu, X,
} from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

const AI_TEAM_MENUS = [
  { to: "/ai-team", icon: Brain, label: "Mission Control", end: true },
  { to: "/ai-team/equipe", icon: Users, label: "Equipe" },
  { to: "/ai-team/evolution", icon: Rocket, label: "Evolution Engine" },
  { to: "/ai-team/conhecimento", icon: BookOpen, label: "Conhecimento" },
  { to: "/ai-team/skills", icon: Wand2, label: "Skills" },
  { to: "/ai-team/workflow", icon: GitBranch, label: "Flow Builder" },
  { to: "/ai-team/memoria", icon: Database, label: "Memória & Fiscal" },
  { to: "/ai-team/academia", icon: GraduationCap, label: "Academia" },
  { to: "/ai-team/simulador", icon: MessageSquare, label: "Simulador" },
  { to: "/ai-team/extrato", icon: Receipt, label: "Extrato" },
  { to: "/ai-team/saude", icon: Shield, label: "Saúde" },
  { to: "/ai-team/config", icon: Settings, label: "Configurações" },
];

export default function AITeamLayout() {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Mobile: drawer overlay
  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100vh-3.7rem)] overflow-hidden">
        {/* Mobile top bar with menu toggle */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-card/50 shrink-0">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
          <span className="tracking-widest uppercase text-center text-sm rounded-none shadow-none font-sans font-semibold text-primary">Batalhão NatLeva</span>
          {/* Current page indicator */}
          <span className="ml-auto text-[10px] text-muted-foreground/60">
            {AI_TEAM_MENUS.find(m => m.end ? location.pathname === m.to : location.pathname.startsWith(m.to) && location.pathname !== "/ai-team")?.label || "Mission Control"}
          </span>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <nav className="absolute top-[calc(3.7rem+2.5rem)] left-0 z-50 w-56 max-h-[60vh] overflow-y-auto bg-card border border-border/30 rounded-br-xl shadow-xl p-2 space-y-0.5">
              {AI_TEAM_MENUS.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    );
  }

  // Desktop
  return (
    <div className="flex h-[calc(100vh-3.7rem)] overflow-hidden">
      <aside className={cn(
        "shrink-0 border-r border-border/50 bg-card/50 flex flex-col transition-all duration-300 overflow-hidden",
        collapsed ? "w-[52px]" : "w-[200px]"
      )}>
        <div className="flex items-center justify-between px-3 py-3 border-b border-border/30">
          {!collapsed && (
            <span className="tracking-widest uppercase text-center text-sm rounded-none shadow-none font-sans font-semibold text-primary">Batalhão NatLeva</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-muted text-muted-foreground"
          >
            <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
          </button>
        </div>
        <nav className="flex-1 py-2 px-1.5 space-y-0.5 overflow-y-auto">
          {AI_TEAM_MENUS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
