import { NavLink, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Brain, Users, Rocket, BookOpen, Wand2, GitBranch, Database, Shield,
  GraduationCap, MessageSquare, FlaskConical, Settings, Building2, ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const AI_TEAM_MENUS = [
  { to: "/ai-team", icon: Brain, label: "Mission Control", end: true },
  { to: "/ai-team/equipe", icon: Users, label: "Equipe" },
  { to: "/ai-team/evolution", icon: Rocket, label: "Evolution Engine" },
  { to: "/ai-team/conhecimento", icon: BookOpen, label: "Conhecimento" },
  { to: "/ai-team/skills", icon: Wand2, label: "Skills" },
  { to: "/ai-team/workflow", icon: GitBranch, label: "Workflow" },
  { to: "/ai-team/memoria", icon: Database, label: "Memória & Fiscal" },
  { to: "/ai-team/academia", icon: GraduationCap, label: "Academia" },
  { to: "/ai-team/simulador", icon: MessageSquare, label: "Simulador" },
  { to: "/ai-team/config", icon: Settings, label: "Configurações" },
];

export default function AITeamLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Internal sidebar */}
      <aside className={cn(
        "shrink-0 border-r border-border/50 bg-card/50 flex flex-col transition-all duration-300 overflow-hidden",
        collapsed ? "w-[52px]" : "w-[200px]"
      )}>
        <div className="flex items-center justify-between px-3 py-3 border-b border-border/30">
          {!collapsed && (
            <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">AI Team</span>
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

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
