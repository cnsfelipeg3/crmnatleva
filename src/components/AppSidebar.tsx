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
  { to: "/cotacoes", icon: PlaneTakeoff, label: "Cotações Portal" },
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
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative group",
          indent && "pl-8",
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
          {!isCollapsed && <span className={indent ? "text-xs" : ""}>{item.label}</span>}
        </>
      )}
    </NavLink>
  );

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
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(hsl(160 60% 50% / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(160 60% 50% / 0.3) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="absolute top-0 left-0 right-0 h-[1px]"
        style={{ background: 'linear-gradient(90deg, transparent, hsl(160 60% 50% / 0.5), transparent)' }}
      />

      <div className="relative flex items-center gap-2 p-4 border-b border-sidebar-border min-h-[64px]">
        {!isCollapsed && <img src={logoNatleva} alt="NatLeva" className="h-8 brightness-0 invert opacity-90" />}
        {isCollapsed && <Plane className="w-6 h-6 text-sidebar-primary mx-auto" />}
      </div>

      <nav className="relative flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => renderNavItem(item))}

        {/* AI Team section */}
        <button
          onClick={() => setAiTeamOpen(!aiTeamOpen)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full",
            aiTeamOpen
              ? "bg-sidebar-accent/50 text-sidebar-accent-foreground"
              : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
          )}
        >
          <Brain className={cn("w-5 h-5 shrink-0", aiTeamOpen && "text-sidebar-primary")} />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left">🧠 AI Team</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", aiTeamOpen && "rotate-180")} />
            </>
          )}
        </button>

        {aiTeamOpen && !isCollapsed && (
          <div className="space-y-0.5 ml-1 border-l border-sidebar-border/30 pl-1">
            {[
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
              { to: "/implementacao/estrategia-ia", icon: Lightbulb, label: "Estratégia IA" },
              { to: "/implementacao/aprendizados-ia", icon: Sparkles, label: "Aprendizados IA" },
              { to: "/implementacao/cerebro-natleva", icon: Zap, label: "Cérebro NatLeva" },
            ].map((item) => renderNavItem(item, true))}
          </div>
        )}


        {/* Operação Diária section */}
        <button
          onClick={() => setOperacaoOpen(!operacaoOpen)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full",
            operacaoOpen
              ? "bg-sidebar-accent/50 text-sidebar-accent-foreground"
              : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
          )}
        >
          <Zap className={cn("w-5 h-5 shrink-0", operacaoOpen && "text-sidebar-primary")} />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left">Operação Diária</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", operacaoOpen && "rotate-180")} />
            </>
          )}
        </button>

        {operacaoOpen && !isCollapsed && (
          <div className="space-y-0.5 ml-1 border-l border-sidebar-border/30 pl-1">
            {[
              { to: "/operacao/inbox", icon: Inbox, label: "WhatsApp" },
              { to: "/operacao/flows", icon: GitBranch, label: "Flow Builder" },
              { to: "/operacao/integracoes", icon: Plug, label: "Integrações" },
              { to: "/operacao/pipeline", icon: Tag, label: "Tags & Pipeline" },
              { to: "/operacao/simulador", icon: TestTube, label: "Simulador" },
              { to: "/operacao/logs", icon: ScrollText, label: "Logs & Auditoria" },
            ].map((item) => renderNavItem(item, true))}
          </div>
        )}

        {/* Implementação section */}
        <button
          onClick={() => setImplOpen(!implOpen)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full",
            implOpen
              ? "bg-sidebar-accent/50 text-sidebar-accent-foreground"
              : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
          )}
        >
          <PackageOpen className={cn("w-5 h-5 shrink-0", implOpen && "text-sidebar-primary")} />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left">Implementação</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", implOpen && "rotate-180")} />
            </>
          )}
        </button>

        {implOpen && !isCollapsed && (
          <div className="space-y-0.5 ml-1 border-l border-sidebar-border/30 pl-1">
            {[
              { to: "/import", icon: FileUp, label: "Importar Planilhas" },
              { to: "/livechat/import-chatguru", icon: FileDown, label: "Importar Conversas" },
              { to: "/implementacao/base-conhecimento", icon: BookOpen, label: "Base de Conhecimento" },
            ].map((item) => renderNavItem(item, true))}
          </div>
        )}

        {/* Portal do Viajante section */}
        <button
          onClick={() => setPortalAdminOpen(!portalAdminOpen)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full",
            portalAdminOpen
              ? "bg-sidebar-accent/50 text-sidebar-accent-foreground"
              : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
          )}
        >
          <Globe className={cn("w-5 h-5 shrink-0", portalAdminOpen && "text-sidebar-primary")} />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left">Portal do Viajante</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", portalAdminOpen && "rotate-180")} />
            </>
          )}
        </button>

        {portalAdminOpen && !isCollapsed && (
          <div className="space-y-0.5 ml-1 border-l border-sidebar-border/30 pl-1">
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
              className="flex items-center gap-3 pl-8 px-3 py-2.5 rounded-lg text-xs font-medium text-sidebar-primary/80 hover:bg-sidebar-accent/40 hover:text-sidebar-primary transition-all duration-200"
            >
              <TestTube className="w-4 h-4 shrink-0" />
              <span>Acessar ambiente teste</span>
              <ArrowUpRight className="w-3 h-3 ml-auto opacity-50" />
            </a>
          </div>
        )}

        {/* Finance section */}
        <button
          onClick={() => setFinanceOpen(!financeOpen)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full",
            financeOpen
              ? "bg-sidebar-accent/50 text-sidebar-accent-foreground"
              : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
          )}
        >
          <DollarSign className={cn("w-5 h-5 shrink-0", financeOpen && "text-sidebar-primary")} />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left">Financeiro</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", financeOpen && "rotate-180")} />
            </>
          )}
        </button>

        {financeOpen && !isCollapsed && (
          <div className="space-y-0.5 ml-1 border-l border-sidebar-border/30 pl-1">
            {financeItems.map((item) => renderNavItem(item, true))}
          </div>
        )}

        {/* RH section */}
        <button
          onClick={() => setRhOpen(!rhOpen)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full",
            rhOpen
              ? "bg-sidebar-accent/50 text-sidebar-accent-foreground"
              : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
          )}
        >
          <Users2 className={cn("w-5 h-5 shrink-0", rhOpen && "text-sidebar-primary")} />
          {!isCollapsed && (
            <>
              <span className="flex-1 text-left">RH</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", rhOpen && "rotate-180")} />
            </>
          )}
        </button>

        {rhOpen && !isCollapsed && (
          <div className="space-y-0.5 ml-1 border-l border-sidebar-border/30 pl-1">
            {[
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
            ].map((item) => renderNavItem(item, true))}
          </div>
        )}

        {/* Admin section - only for admins */}
        {role === "admin" && (
          <>
            <button
              onClick={() => setAdminOpen(!adminOpen)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 w-full",
                adminOpen
                  ? "bg-sidebar-accent/50 text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
              )}
            >
              <Shield className={cn("w-5 h-5 shrink-0", adminOpen && "text-sidebar-primary")} />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left">Admin</span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", adminOpen && "rotate-180")} />
                </>
              )}
            </button>

            {adminOpen && !isCollapsed && (
              <div className="space-y-0.5 ml-1 border-l border-sidebar-border/30 pl-1">
                {[
                  { to: "/admin/users", icon: Users, label: "Usuários & Permissões" },
                  { to: "/settings", icon: Settings, label: "Configurações" },
                ].map((item) => renderNavItem(item, true))}
              </div>
            )}
          </>
        )}

        {role !== "admin" && renderNavItem({ to: "/settings", icon: Settings, label: "Configurações" })}

        {/* Apresentação Geral */}
        <div className="mt-2 pt-2 border-t border-sidebar-border/30">
          {renderNavItem({ to: "/apresentacao", icon: Presentation, label: "Apresentação Geral" })}
        </div>
      </nav>

      <div className="relative border-t border-sidebar-border p-3 space-y-1.5">
        {!isCollapsed && profile && (
          <div className="px-2 mb-2">
            <p className="text-xs font-semibold truncate text-sidebar-foreground">{profile.full_name || profile.email}</p>
            <p className="text-[10px] text-sidebar-foreground/40 capitalize font-mono tracking-wider">{role}</p>
          </div>
        )}
        <button onClick={signOut} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/50 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground w-full transition-all duration-200">
          <LogOut className="w-4 h-4 shrink-0" />{!isCollapsed && <span>Sair</span>}
        </button>
        <button onClick={() => setDark(!dark)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/50 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground w-full transition-all duration-200">
          {dark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
          {!isCollapsed && <span>{dark ? "Tema Claro" : "Tema Escuro"}</span>}
        </button>
        {!mobile && (
          <button onClick={() => setCollapsed(!collapsed)} className="flex items-center justify-center p-2 rounded-lg text-sidebar-foreground/30 hover:text-sidebar-foreground hover:bg-sidebar-accent/40 w-full transition-all duration-200">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>
    </aside>
  );
}
