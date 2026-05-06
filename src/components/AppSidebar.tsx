import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logoNatleva from "@/assets/logo-natleva.webp";
import {
  LayoutDashboard, Plus, List, Settings, LogOut, Plane, Users,
  ChevronLeft, ChevronRight, ClipboardCheck, Hotel, Sun, Moon, Cake, FileUp,
  AlertTriangle, DollarSign, ChevronDown, Brain, Sparkles,
  ArrowUpRight, ArrowDownRight, Wallet, CreditCard, FileText, Building2,
  Percent, FolderTree, Users2, BarChart3, Cog, Calculator,
  UserCheck, Clock, Receipt, Target, Star, MessageSquare, ShieldAlert, FileArchive, Shield, PieChart, Smile,
  GitBranch, Plug, Zap, BookOpen, FileDown, Presentation, RotateCcw,
  Inbox, Bot, Tag, TestTube, ScrollText, PackageOpen, Upload, Database, Globe,
  PlaneTakeoff, Image as ImageIcon, Lightbulb, Home, Camera,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { prefetchRoute } from "@/lib/routePrefetch";
import { usePermissions } from "@/hooks/usePermissions";
import { MENU_BY_PATH } from "@/lib/systemMenus";

const navItems = [
  { to: "/dashboard", icon: Home, label: "Início", alwaysVisible: true },
  { to: "/sales/new", icon: Plus, label: "Nova Venda" },
  { to: "/sales", icon: List, label: "Vendas" },
  { to: "/pendencias", icon: AlertTriangle, label: "Pendências" },
  { to: "/cotacoes", icon: PlaneTakeoff, label: "Cotações" },
  { to: "/midias", icon: ImageIcon, label: "Mídias" },
];

const clientesItems = [
  { to: "/passengers", icon: Users, label: "Passageiros" },
  { to: "/inteligencia-clientes", icon: Brain, label: "Inteligência Clientes" },
  { to: "/natleva-intelligence", icon: Sparkles, label: "NatLeva Intelligence" },
  { to: "/birthdays", icon: Cake, label: "Aniversariantes" },
];

const viagensItems = [
  { to: "/viagens", icon: LayoutDashboard, label: "Torre de Controle" },
  { to: "/viagens/monitor", icon: Plane, label: "Monitor de Voos" },
  { to: "/checkin", icon: ClipboardCheck, label: "Fazer Check-in" },
  { to: "/hospedagem", icon: Hotel, label: "Confirmar Hospedagens" },
  { to: "/alteracoes", icon: RotateCcw, label: "Alterações de Viagem" },
  { to: "/booking-search", icon: Hotel, label: "Busca Booking", showBeta: true },
  { to: "/flights-search", icon: PlaneTakeoff, label: "Busca de Voos", showBeta: true },
  { to: "/google-flights-search", icon: PlaneTakeoff, label: "Google Flights", showBeta: true },
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
  const { profile, role, user, signOut } = useAuth();
  const { can, isAdmin } = usePermissions();
  const [employeePosition, setEmployeePosition] = useState<string | null>(null);
  useEffect(() => {
    if (!user?.id) { setEmployeePosition(null); return; }
    let cancelled = false;
    const loadPosition = () => {
      supabase
        .from("employees")
        .select("position")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!cancelled) setEmployeePosition(data?.position ?? null);
        });
    };
    const idle = window.requestIdleCallback ?? ((cb: IdleRequestCallback) => window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 } as IdleDeadline), 1800));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(loadPosition, { timeout: 3500 });
    return () => {
      cancelled = true;
      cancelIdle(handle as number);
    };
  }, [user?.id]);
  const canSee = (path: string) => {
    if (isAdmin) return true;
    const menu = MENU_BY_PATH[path];
    if (!menu) return true; // rota não governada = visível
    return can(menu.key, "view");
  };
  const filterItems = <T extends { to: string; alwaysVisible?: boolean }>(items: T[]) => items.filter((i) => i.alwaysVisible || canSee(i.to));
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [financeOpen, setFinanceOpen] = useState(false);
  const [rhOpen, setRhOpen] = useState(false);
  const [viagensOpen, setViagensOpen] = useState(false);
  const [clientesOpen, setClientesOpen] = useState(false);
  const [operacaoOpen, setOperacaoOpen] = useState(false);
  const [aiTeamOpen, setAiTeamOpen] = useState(false);
  const [implOpen, setImplOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [portalAdminOpen, setPortalAdminOpen] = useState(false);
  const isCollapsed = mobile ? false : collapsed;
  const [pendingBriefings, setPendingBriefings] = useState(0);
  const [myInboxCount, setMyInboxCount] = useState(0);

  useEffect(() => {
    if (!user?.id) { setMyInboxCount(0); return; }
    let cancelled = false;
    const refresh = async () => {
      try {
        const { count } = await (supabase as any)
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .eq("assigned_to", user.id)
          .gt("unread_count", 0)
          .eq("is_archived", false);
        if (!cancelled) setMyInboxCount(count || 0);
      } catch { /* silent */ }
    };
    refresh();
    const interval = setInterval(refresh, 30000);
    const channel = supabase
      .channel("sidebar_inbox_count")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "conversations", filter: `assigned_to=eq.${user.id}` },
        refresh
      )
      .subscribe();
    return () => { cancelled = true; clearInterval(interval); supabase.removeChannel(channel); };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const fetchCount = async () => {
      try {
        const { count, error } = await (supabase as any)
          .from("quotation_briefings")
          .select("*", { count: "exact", head: true })
          .eq("status", "pendente");
        if (!error && !cancelled) setPendingBriefings(count || 0);
      } catch {
        // Silently handle 503 or connection errors
      }
    };
    const start = () => {
      fetchCount();
      channel = supabase
        .channel("sidebar-briefings")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "quotation_briefings" }, () => fetchCount())
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "quotation_briefings", filter: "status=eq.pendente" }, () => fetchCount())
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "quotation_briefings" }, () => fetchCount())
        .subscribe();
    };
    const idle = window.requestIdleCallback ?? ((cb: IdleRequestCallback) => window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 } as IdleDeadline), 2500));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(start, { timeout: 5000 });
    return () => {
      cancelled = true;
      cancelIdle(handle as number);
      if (channel) supabase.removeChannel(channel);
    };
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
    const p = window.location.pathname;
    if (p.startsWith("/viagens") || p.startsWith("/checkin") || p.startsWith("/hospedagem") || p.startsWith("/alteracoes")) setViagensOpen(true);
    if (p.startsWith("/passengers") || p.startsWith("/inteligencia-clientes") || p.startsWith("/natleva-intelligence") || p.startsWith("/birthdays")) setClientesOpen(true);
    if (p.startsWith("/financeiro")) setFinanceOpen(true);
    if (p.startsWith("/rh")) setRhOpen(true);
    if (p.startsWith("/operacao")) setOperacaoOpen(true);
    if (p.startsWith("/ai-team") || p.startsWith("/implementacao/estrategia") || p.startsWith("/implementacao/aprendizados") || p.startsWith("/implementacao/cerebro")) setAiTeamOpen(true);
    if (p.startsWith("/implementacao") || p.startsWith("/import") || p.startsWith("/livechat/import")) setImplOpen(true);
    if (p.startsWith("/admin")) setAdminOpen(true);
    if (p.startsWith("/portal-admin")) setPortalAdminOpen(true);
  }, []);

  const renderNavItem = (item: typeof navItems[0], indent = false) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.to === "/financeiro"}
      onClick={onNavigate}
      onMouseEnter={() => prefetchRoute(item.to)}
      onFocus={() => prefetchRoute(item.to)}
      onTouchStart={() => prefetchRoute(item.to)}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3 py-[7px] rounded-lg text-[13px] font-medium transition-colors duration-200 relative",
          indent && "pl-8",
          isActive
            ? "bg-sidebar-accent/60 text-champagne"
            : "text-sidebar-foreground hover:bg-sidebar-accent/30 hover:text-foreground"
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r bg-champagne" />
          )}
          <item.icon className={cn("w-4 h-4 shrink-0 transition-colors", isActive ? "text-champagne" : "text-sidebar-foreground")} />
          {!isCollapsed && <span className={cn("tracking-tight", indent ? "text-xs" : "")}>{item.label}</span>}
          {!isCollapsed && (item as any).showBeta && (
            <span className="ml-auto shrink-0 rounded bg-gradient-to-r from-amber-500 to-orange-500 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white shadow-sm">
              BETA
            </span>
          )}
          {item.to === "/cotacoes" && pendingBriefings > 0 && (
            <span className="ml-auto shrink-0 min-w-[15px] h-[15px] flex items-center justify-center rounded-full bg-champagne text-champagne-foreground text-[8px] font-bold px-1 leading-none">
              {pendingBriefings}
            </span>
          )}
          {item.to === "/operacao/inbox" && myInboxCount > 0 && (
            <span className="ml-auto shrink-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-1 leading-none">
              {myInboxCount > 99 ? "99+" : myInboxCount}
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
        "flex items-center gap-3 px-3 py-[7px] rounded-lg text-[13px] font-medium transition-colors duration-200 w-full",
        "text-sidebar-foreground hover:bg-sidebar-accent/30 hover:text-foreground"
      )}
    >
      {React.createElement(icon, { className: "w-4 h-4 shrink-0 text-sidebar-foreground" })}
      {!isCollapsed && (
        <>
          <span className="flex-1 text-left tracking-tight">{label}</span>
          <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isOpen && "rotate-180")} />
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
        "flex flex-col shrink-0 border-r border-sidebar-border transition-all duration-300 relative h-full",
        mobile ? "w-full overflow-hidden" : (isCollapsed ? "w-[68px] overflow-hidden" : "w-[240px] overflow-hidden")
      )}
      style={{
        background: `linear-gradient(180deg, hsl(150 40% 4%) 0%, hsl(150 40% 6%) 100%)`,
      }}
    >
      {/* Floating collapse toggle — desktop only */}
      {!mobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="group absolute z-50 flex items-center justify-center rounded-full bg-card border border-border/60 text-muted-foreground shadow-md hover:text-foreground hover:border-champagne/60 hover:shadow-lg hover:scale-110 transition-all duration-200"
          style={{
            width: '20px',
            height: '20px',
            top: 'calc(3.7rem - 10px)',
            right: '-10px',
          }}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed
            ? <ChevronRight className="w-3 h-3" strokeWidth={2.5} />
            : <ChevronLeft className="w-3 h-3" strokeWidth={2.5} />}
        </button>
      )}
      {/* Logo area */}
      <div className="relative flex items-center justify-center px-5 h-[3.7rem] border-b border-sidebar-border/50">
        {!isCollapsed ? (
          <div className="relative h-[2.47rem] w-full flex items-center justify-center">
            <img
              src={logoNatleva}
              alt="NatLeva"
              className="h-full w-auto object-contain"
              style={{ filter: 'brightness(0) invert(1)' }}
              draggable={false}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ backgroundColor: 'hsl(var(--champagne))', mixBlendMode: 'multiply' }}
            />
          </div>
        ) : (
          <Plane className="w-5 h-5 text-champagne mx-auto" />
        )}
      </div>

      <nav className="relative flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {filterItems(navItems).map((item) => renderNavItem(item))}

        {/* Clientes */}
        {(() => {
          const items = filterItems(clientesItems);
          if (items.length === 0) return null;
          return (<>
            {renderGroupButton("Clientes", Users, clientesOpen, () => setClientesOpen(!clientesOpen))}
            {clientesOpen && !isCollapsed && renderSubGroup(items)}
          </>);
        })()}

        {/* Viagens */}
        {(() => {
          const items = filterItems(viagensItems);
          if (items.length === 0) return null;
          return (<>
            {renderGroupButton("Viagens", Plane, viagensOpen, () => setViagensOpen(!viagensOpen))}
            {viagensOpen && !isCollapsed && renderSubGroup(items)}
          </>);
        })()}

        {/* AI Team */}
        {(() => {
          const items = filterItems([
            { to: "/ai-team", icon: Brain, label: "Mission Control" },
            { to: "/ai-team/equipe", icon: Users, label: "Equipe" },
            { to: "/ai-team/evolution", icon: Sparkles, label: "Evolution Engine" },
            { to: "/ai-team/conhecimento", icon: BookOpen, label: "Conhecimento" },
            { to: "/ai-team/skills", icon: Zap, label: "Skills" },
            { to: "/ai-team/workflow", icon: GitBranch, label: "Flow Builder" },
            { to: "/ai-team/memoria", icon: Database, label: "Memória & Fiscal" },
            { to: "/ai-team/academia", icon: Star, label: "Academia" },
            { to: "/ai-team/simulador", icon: MessageSquare, label: "Simulador" },
            { to: "/ai-team/performance", icon: BarChart3, label: "Performance" },
            { to: "/ai-team/config", icon: Cog, label: "Configurações" },
            { to: "/implementacao/estrategia-ia", icon: Shield, label: "⚖️ Regras Globais" },
            { to: "/implementacao/aprendizados-ia", icon: Sparkles, label: "Aprendizados IA" },
            { to: "/implementacao/cerebro-natleva", icon: Zap, label: "Cérebro NatLeva" },
          ]);
          if (items.length === 0) return null;
          return (<>
            {renderGroupButton("Batalhão", Brain, aiTeamOpen, () => setAiTeamOpen(!aiTeamOpen))}
            {aiTeamOpen && !isCollapsed && renderSubGroup(items)}
          </>);
        })()}

        {/* Operação */}
        {(() => {
          const items = filterItems([
            { to: "/operacao/inbox", icon: Inbox, label: "WhatsApp" },
            { to: "/livechat/status", icon: Camera, label: "Status" },
            { to: "/operacao/integracoes", icon: Plug, label: "Integrações" },
            { to: "/operacao/pipeline", icon: Tag, label: "Tags & Pipeline" },
            { to: "/operacao/simulador", icon: TestTube, label: "Simulador" },
            { to: "/operacao/atalhos", icon: BookOpen, label: "Atalhos" },
            { to: "/operacao/agendadas", icon: Clock, label: "Agendadas" },
            { to: "/operacao/logs", icon: ScrollText, label: "Logs & Auditoria" },
          ]);
          if (items.length === 0) return null;
          return (<>
            {renderGroupButton("Operação", Zap, operacaoOpen, () => setOperacaoOpen(!operacaoOpen))}
            {operacaoOpen && !isCollapsed && renderSubGroup(items)}
          </>);
        })()}

        {/* Implementação */}
        {(() => {
          const items = filterItems([
            { to: "/import", icon: FileUp, label: "Importar Planilhas" },
            { to: "/livechat/import-chatguru", icon: FileDown, label: "Importar Conversas" },
            { to: "/implementacao/base-conhecimento", icon: BookOpen, label: "Base de Conhecimento" },
          ]);
          if (items.length === 0) return null;
          return (<>
            {renderGroupButton("Implementação", PackageOpen, implOpen, () => setImplOpen(!implOpen))}
            {implOpen && !isCollapsed && renderSubGroup(items)}
          </>);
        })()}

        {/* Portal do Viajante */}
        {(() => {
          const items = filterItems([
            { to: "/portal-admin", icon: BarChart3, label: "Dashboard" },
            { to: "/portal-admin/viagens", icon: Plane, label: "Viagens" },
            { to: "/portal-admin/clientes", icon: Users, label: "Clientes" },
            { to: "/portal-admin/documentos", icon: FileText, label: "Documentos" },
            { to: "/itinerario", icon: FileText, label: "Itinerários" },
            { to: "/portal-admin/notificacoes", icon: MessageSquare, label: "Notificações" },
            { to: "/portal-admin/config", icon: Cog, label: "Configurações" },
          ]);
          if (items.length === 0) return null;
          return (<>
            {renderGroupButton("Portal do Viajante", Globe, portalAdminOpen, () => setPortalAdminOpen(!portalAdminOpen))}
            {portalAdminOpen && !isCollapsed && (
              <div className="space-y-0.5 ml-2 border-l border-border/10 pl-1">
                {items.map((item) => renderNavItem(item, true))}
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
          </>);
        })()}

        {/* Finance */}
        {(() => {
          const items = filterItems(financeItems);
          if (items.length === 0) return null;
          return (<>
            {renderGroupButton("Financeiro", DollarSign, financeOpen, () => setFinanceOpen(!financeOpen))}
            {financeOpen && !isCollapsed && renderSubGroup(items)}
          </>);
        })()}

        {/* RH */}
        {(() => {
          const items = filterItems([
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
          ]);
          if (items.length === 0) return null;
          return (<>
            {renderGroupButton("RH", Users2, rhOpen, () => setRhOpen(!rhOpen))}
            {rhOpen && !isCollapsed && renderSubGroup(items)}
          </>);
        })()}

        {/* Admin */}
        {role === "admin" && (
          <>
            {renderGroupButton("Admin", Shield, adminOpen, () => setAdminOpen(!adminOpen))}
            {adminOpen && !isCollapsed && renderSubGroup([
              { to: "/admin/users", icon: Users, label: "Usuários & Permissões" },
              { to: "/admin/conversas-excluidas", icon: Inbox, label: "Conversas Excluídas" },
              { to: "/admin/regras-globais", icon: ScrollText, label: "Regras Globais Agentes" },
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
            <p className="text-[10px] text-muted-foreground capitalize font-mono tracking-wider">{employeePosition || role}</p>
          </div>
        )}
        <button onClick={signOut} className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] text-sidebar-foreground hover:bg-primary/5 hover:text-foreground w-full transition-all duration-200">
          <LogOut className="w-4 h-4 shrink-0" />{!isCollapsed && <span>Sair</span>}
        </button>
        <button onClick={() => setDark(!dark)} className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] text-sidebar-foreground hover:bg-primary/5 hover:text-foreground w-full transition-all duration-200">
          {dark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
          {!isCollapsed && <span>{dark ? "Tema Claro" : "Tema Escuro"}</span>}
        </button>
      </div>
    </aside>
  );
}
