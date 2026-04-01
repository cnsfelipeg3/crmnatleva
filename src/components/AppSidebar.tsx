import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logoNatleva from "@/assets/logo-natleva.png";
import {
  LayoutDashboard, Plus, List, Settings, LogOut, Plane, Users,
  ChevronLeft, ChevronRight, ClipboardCheck, Hotel, Sun, Moon, Cake, FileUp,
  AlertTriangle, DollarSign, ChevronDown, Brain, Sparkles,
  ArrowUpRight, ArrowDownRight, Wallet, CreditCard, FileText, Building2,
  Percent, FolderTree, Users2, BarChart3, Cog, Calculator,
  UserCheck, Clock, Receipt, Target, Star, MessageSquare, ShieldAlert, FileArchive, Shield, PieChart, Smile,
  GitBranch, Plug, Zap, BookOpen, FileDown, Presentation, RotateCcw,
  Inbox, Bot, Tag, TestTube, ScrollText, PackageOpen, Upload, Database, Globe,
  PlaneTakeoff, Image as ImageIcon, Lightbulb,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/sales/new", icon: Plus, label: "Nova Venda" },
  { to: "/sales", icon: List, label: "Vendas" },
  { to: "/viagens", icon: Plane, label: "Viagens" },
  { to: "/checkin", icon: ClipboardCheck, label: "Fazer Check-in" },
  { to: "/hospedagem", icon: Hotel, label: "Confirmar Hospedagens" },
  { to: "/alteracoes", icon: RotateCcw, label: "Alterações de Viagem" },
  { to: "/passengers", icon: Users, label: "Passageiros" },
  { to: "/inteligencia-clientes", icon: Brain, label: "Inteligência Clientes" },
  { to: "/natleva-intelligence", icon: Sparkles, label: "NatLeva Intelligence" },
  { to: "/birthdays", icon: Cake, label: "Aniversariantes" },
  { to: "/pendencias", icon: AlertTriangle, label: "Pendências" },
  { to: "/cotacoes", icon: PlaneTakeoff, label: "Cotações" },
  { to: "/propostas", icon: Presentation, label: "Propostas" },
  { to: "/midias", icon: ImageIcon, label: "Mídias" },
];

const financeItems = [
  { to: "/financeiro", icon: BarChart3, label: "Visão Geral" },
  { to: "/financeiro/receber", icon: ArrowUpRight, label: "Contas a Receber" },
  { to: "/financeiro/pagar", icon: ArrowDownRight, label: "Contas a Pagar" },
  { to: "/financeiro/fluxo", icon: Wallet, label: "Fluxo de Caixa" },
  { to: "/financeiro/cartoes", icon: CreditCard, label: "Cartões" },
  { to: "/financeiro/fornecedores", icon: Building2, label: "Fornecedores" },
  { to: "/financeiro/taxas", icon: Percent, label: "Taxas & Tarifas" },
  { to: "/financeiro/gateways", icon: CreditCard, label: "Gateway Pagamentos" },
  { to: "/financeiro/simulador", icon: Calculator, label: "Simulador de Taxas" },
  { to: "/financeiro/plano-contas", icon: FolderTree, label: "Plano de Contas" },
  { to: "/financeiro/comissoes", icon: Users2, label: "Comissões" },
  { to: "/financeiro/fechamento", icon: ClipboardCheck, label: "Fechamento Fornecedores" },
  { to: "/financeiro/dre", icon: FileText, label: "DRE / Relatórios" },
];

interface Props {
  mobile?: boolean;
  onNavigate?: () => void;
}

export default function AppSidebar({ mobile, onNavigate }: Props) {
  const { profile, role, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [financeOpen, setFinanceOpen] = useState(false);
  const [rhOpen, setRhOpen] = useState(false);
  const [operacaoOpen, setOperacaoOpen] = useState(false);
  const [aiTeamOpen, setAiTeamOpen] = useState(false);
  const [implOpen, setImplOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [portalAdminOpen, setPortalAdminOpen] = useState(false);
  const isCollapsed = mobile ? false : collapsed;
  const [pendingBriefings, setPendingBriefings] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await (supabase as any)
        .from("quotation_briefings")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendente");
      setPendingBriefings(count || 0);
    };
    fetchCount();
    const channel = supabase
      .channel("sidebar-briefings")
      .on("postgres_changes", { event: "*", schema: "public", table: "quotation_briefings" }, () => fetchCount())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  useEffect(() => {
    if (window.location.pathname.startsWith("/financeiro")) setFinanceOpen(true);
    if (window.location.pathname.startsWith("/rh")) setRhOpen(true);
    if (window.location.pathname.startsWith("/operacao")) setOperacaoOpen(true);
    if (window.location.pathname.startsWith("/ai-team") || window.location.pathname.startsWith("/implementacao/estrategia") || window.location.pathname.startsWith("/implementacao/aprendizados") || window.location.pathname.startsWith("/implementacao/cerebro")) setAiTeamOpen(true);
    if (window.location.pathname.startsWith("/implementacao") || window.location.pathname.startsWith("/import") || window.location.pathname.startsWith("/livechat/import")) setImplOpen(true);
    if (window.location.pathname.startsWith("/admin")) setAdminOpen(true);
    if (window.location.pathname.startsWith("/portal-admin")) setPortalAdminOpen(true);
  }, []);

  const renderNavItem = (item: typeof navItems[0], indent = false) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.to === "/financeiro"}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 relative group",
          indent && "pl-8",
          isActive
            ? "bg-primary/8 text-champagne font-bold"
            : "text-sidebar-foreground hover:bg-primary/5 hover:text-foreground hover:translate-x-[2px]"
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-champagne" />
          )}
          <item.icon className={cn("w-[18px] h-[18px] shrink-0 transition-colors", isActive ? "text-champagne" : "text-sidebar-foreground")} />
          {!isCollapsed && <span className={indent ? "text-xs" : ""}>{item.label}</span>}
          {item.to === "/cotacoes" && pendingBriefings > 0 && (
            <span className="ml-auto shrink-0 min-w-5 h-5 flex items-center justify-center rounded-full bg-champagne text-champagne-foreground text-[10px] font-bold px-1.5 animate-pulse">
              {pendingBriefings}
            </span>
          )}
        </>
      )}
    </NavLink>
  );

  const renderGroupButton = (label: string, icon: React.ElementType, isOpen: boolean, toggle: () => void) => (
    <button
      onClick={toggle}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 w-full",
        isOpen
          ? "bg-primary/8 text-foreground"
          : "text-sidebar-foreground hover:bg-primary/5 hover:text-foreground"
      )}
    >
      {React.createElement(icon, { className: cn("w-[18px] h-[18px] shrink-0", isOpen && "text-champagne") })}
      {!isCollapsed && (
        <>
          <span className="flex-1 text-left">{label}</span>
          <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isOpen && "rotate-180")} />
        </>
      )}
    </button>
  );

  const renderSubGroup = (items: typeof navItems[0][]) => (
    <div className="space-y-0.5 ml-2 border-l border-border/10 pl-1">
      {items.map((item) => renderNavItem(item, true))}
    </div>
  );

  return (
    <aside
      className={cn(
        "flex flex-col shrink-0 border-r border-sidebar-border transition-all duration-300 relative overflow-hidden h-full",
        mobile ? "w-full" : (isCollapsed ? "w-[68px]" : "w-[240px]")
      )}
      style={{
        background: `linear-gradient(180deg, hsl(150 40% 4%) 0%, hsl(150 40% 6%) 100%)`,
      }}
    >
      {/* Logo area */}
      <div className="relative flex items-center justify-center gap-2 px-4 h-[3.7rem] border-b border-sidebar-border/50">
        {!isCollapsed ? (
          <div className="flex flex-col items-center">
            <img
              src={logoNatleva}
              alt="NatLeva"
              className="h-[2.2rem]"
              style={{ filter: 'brightness(0) invert(1) sepia(1) saturate(3) hue-rotate(5deg) brightness(0.85)' }}
            />
            {/* Gold signature line */}
            <div className="w-10 h-px mt-1.5 rounded-full bg-gradient-to-r from-transparent via-champagne/30 to-transparent" />
          </div>
        ) : (
          <Plane className="w-5 h-5 text-champagne mx-auto" />
        )}
      </div>

      <nav className="relative flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => renderNavItem(item))}

        {/* AI Team section */}
        {renderGroupButton("🧠 AI Team", Brain, aiTeamOpen, () => setAiTeamOpen(!aiTeamOpen))}
        {aiTeamOpen && !isCollapsed && renderSubGroup([
          { to: "/ai-team", icon: Brain, label: "Mission Control" },
          { to: "/ai-team/equipe", icon: Users, label: "Equipe" },
          { to: "/ai-team/evolution", icon: Sparkles, label: "Evolution Engine" },
          { to: "/ai-team/conhecimento", icon: BookOpen, label: "Conhecimento" },
          { to: "/ai-team/skills", icon: Zap, label: "Skills" },
          { to: "/ai-team/workflow", icon: GitBranch, label: "Flow Builder" },
          { to: "/ai-team/memoria", icon: Database, label: "Memória & Fiscal" },
          { to: "/ai-team/academia", icon: Star, label: "Academia" },
          { to: "/ai-team/simulador", icon: MessageSquare, label: "Simulador" },
          { to: "/ai-team/config", icon: Cog, label: "Configurações" },
          { to: "/implementacao/estrategia-ia", icon: Shield, label: "⚖️ Regras Globais" },
          { to: "/implementacao/aprendizados-ia", icon: Sparkles, label: "Aprendizados IA" },
          { to: "/implementacao/cerebro-natleva", icon: Zap, label: "Cérebro NatLeva" },
        ])}

        {/* Operação Diária */}
        {renderGroupButton("Operação Diária", Zap, operacaoOpen, () => setOperacaoOpen(!operacaoOpen))}
        {operacaoOpen && !isCollapsed && renderSubGroup([
          { to: "/operacao/inbox", icon: Inbox, label: "WhatsApp" },
          { to: "/operacao/integracoes", icon: Plug, label: "Integrações" },
          { to: "/operacao/pipeline", icon: Tag, label: "Tags & Pipeline" },
          { to: "/operacao/simulador", icon: TestTube, label: "Simulador" },
          { to: "/operacao/logs", icon: ScrollText, label: "Logs & Auditoria" },
        ])}

        {/* Implementação */}
        {renderGroupButton("Implementação", PackageOpen, implOpen, () => setImplOpen(!implOpen))}
        {implOpen && !isCollapsed && renderSubGroup([
          { to: "/import", icon: FileUp, label: "Importar Planilhas" },
          { to: "/livechat/import-chatguru", icon: FileDown, label: "Importar Conversas" },
          { to: "/implementacao/base-conhecimento", icon: BookOpen, label: "Base de Conhecimento" },
        ])}

        {/* Portal do Viajante */}
        {renderGroupButton("Portal do Viajante", Globe, portalAdminOpen, () => setPortalAdminOpen(!portalAdminOpen))}
        {portalAdminOpen && !isCollapsed && (
          <div className="space-y-0.5 ml-2 border-l border-border/10 pl-1">
            {[
              { to: "/portal-admin", icon: BarChart3, label: "Dashboard" },
              { to: "/portal-admin/viagens", icon: Plane, label: "Viagens" },
              { to: "/portal-admin/clientes", icon: Users, label: "Clientes" },
              { to: "/portal-admin/documentos", icon: FileText, label: "Documentos" },
              { to: "/itinerario", icon: FileText, label: "Itinerários" },
              { to: "/portal-admin/notificacoes", icon: MessageSquare, label: "Notificações" },
              { to: "/portal-admin/config", icon: Cog, label: "Configurações" },
            ].map((item) => renderNavItem(item, true))}
            <a
              href="/portal/login"
              target="_blank"
              rel="noopener noreferrer"
              onClick={onNavigate}
              className="flex items-center gap-3 pl-8 px-3 py-2 rounded-lg text-xs font-medium text-champagne/70 hover:bg-primary/5 hover:text-champagne transition-all duration-200"
            >
              <TestTube className="w-4 h-4 shrink-0" />
              <span>Acessar ambiente teste</span>
              <ArrowUpRight className="w-3 h-3 ml-auto opacity-50" />
            </a>
          </div>
        )}

        {/* Finance */}
        {renderGroupButton("Financeiro", DollarSign, financeOpen, () => setFinanceOpen(!financeOpen))}
        {financeOpen && !isCollapsed && renderSubGroup(financeItems)}

        {/* RH */}
        {renderGroupButton("RH", Users2, rhOpen, () => setRhOpen(!rhOpen))}
        {rhOpen && !isCollapsed && renderSubGroup([
          { to: "/rh", icon: BarChart3, label: "Visão Geral" },
          { to: "/rh/colaboradores", icon: UserCheck, label: "Colaboradores" },
          { to: "/rh/ponto", icon: Clock, label: "Ponto" },
          { to: "/rh/folha", icon: Receipt, label: "Folha & Pagamentos" },
          { to: "/rh/metas", icon: Target, label: "Metas & Bônus" },
          { to: "/rh/desempenho", icon: Star, label: "Desempenho" },
          { to: "/rh/feedbacks", icon: MessageSquare, label: "Feedbacks & 1:1" },
          { to: "/rh/advertencias", icon: ShieldAlert, label: "Advertências" },
          { to: "/rh/documentos", icon: FileArchive, label: "Contratos & Docs" },
          { to: "/rh/permissoes", icon: Shield, label: "Permissões" },
          { to: "/rh/clima", icon: Smile, label: "Clima do Time" },
          { to: "/rh/relatorios", icon: PieChart, label: "Relatórios" },
          { to: "/rh/config", icon: Cog, label: "Configurações" },
        ])}

        {/* Admin */}
        {role === "admin" && (
          <>
            {renderGroupButton("Admin", Shield, adminOpen, () => setAdminOpen(!adminOpen))}
            {adminOpen && !isCollapsed && renderSubGroup([
              { to: "/admin/users", icon: Users, label: "Usuários & Permissões" },
              { to: "/settings", icon: Settings, label: "Configurações" },
            ])}
          </>
        )}

        {role !== "admin" && renderNavItem({ to: "/settings", icon: Settings, label: "Configurações" })}

        <div className="mt-2 pt-2 border-t border-border/8">
          {renderNavItem({ to: "/apresentacao", icon: Presentation, label: "Apresentação Geral" })}
        </div>
      </nav>

      {/* Footer */}
      <div className="relative border-t border-sidebar-border/50 p-3 space-y-1">
        {!isCollapsed && profile && (
          <div className="px-2 mb-2">
            <p className="text-xs font-semibold truncate text-foreground">{profile.full_name || profile.email}</p>
            <p className="text-[10px] text-muted-foreground capitalize font-mono tracking-wider">{role}</p>
          </div>
        )}
        <button onClick={signOut} className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] text-sidebar-foreground hover:bg-primary/5 hover:text-foreground w-full transition-all duration-200">
          <LogOut className="w-4 h-4 shrink-0" />{!isCollapsed && <span>Sair</span>}
        </button>
        <button onClick={() => setDark(!dark)} className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] text-sidebar-foreground hover:bg-primary/5 hover:text-foreground w-full transition-all duration-200">
          {dark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
          {!isCollapsed && <span>{dark ? "Tema Claro" : "Tema Escuro"}</span>}
        </button>
        {!mobile && (
          <button onClick={() => setCollapsed(!collapsed)} className="flex items-center justify-center p-1.5 rounded-lg text-sidebar-foreground/30 hover:text-foreground hover:bg-primary/5 w-full transition-all duration-200">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>
    </aside>
  );
}
