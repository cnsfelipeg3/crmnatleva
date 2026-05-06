/**
 * Registro central dos menus reais do sistema NatLeva.
 *
 * Cada entrada representa um item navegável e clicável do sidebar.
 * O `key` é estável e usado em `employee_permissions.menu_key`.
 * `path` precisa bater com a rota declarada em src/App.tsx.
 * `actions` lista quais verbos fazem sentido no item (alguns são leitura-only).
 */
export type MenuAction = "view" | "create" | "edit" | "delete";

export interface SystemMenuItem {
  key: string;
  label: string;
  path: string;
  group: string;
  actions: MenuAction[];
}

const ALL: MenuAction[] = ["view", "create", "edit", "delete"];
const READ_ONLY: MenuAction[] = ["view"];
const VIEW_EDIT: MenuAction[] = ["view", "edit"];

export const SYSTEM_MENUS: SystemMenuItem[] = [
  // --- Topo ---
  { key: "dashboard", label: "Dashboard", path: "/dashboard", group: "Principal", actions: READ_ONLY },
  { key: "sales", label: "Vendas", path: "/sales", group: "Principal", actions: ALL },
  { key: "sales.view_all", label: "Ver todas as vendas (não só as próprias)", path: "/sales", group: "Principal", actions: READ_ONLY },
  { key: "sales.new", label: "Incluir", path: "/sales/new", group: "Principal", actions: ["view", "create"] },
  { key: "pendencias", label: "Pendências", path: "/pendencias", group: "Principal", actions: VIEW_EDIT },
  { key: "cotacoes", label: "Cotações", path: "/cotacoes", group: "Principal", actions: ALL },
  { key: "propostas", label: "Propostas", path: "/propostas", group: "Principal", actions: ALL },
  { key: "propostas.modelos", label: "Modelos de Proposta", path: "/propostas/modelos", group: "Principal", actions: ALL },
  { key: "midias", label: "Mídias", path: "/midias", group: "Principal", actions: ALL },

  // --- Clientes ---
  { key: "clientes.passageiros", label: "Passageiros", path: "/passengers", group: "Clientes", actions: ALL },
  { key: "clientes.inteligencia", label: "Inteligência Clientes", path: "/inteligencia-clientes", group: "Clientes", actions: READ_ONLY },
  { key: "clientes.natleva-intel", label: "NatLeva Intelligence", path: "/natleva-intelligence", group: "Clientes", actions: READ_ONLY },
  { key: "clientes.aniversariantes", label: "Aniversariantes", path: "/birthdays", group: "Clientes", actions: READ_ONLY },

  // --- Viagens ---
  { key: "viagens.torre", label: "Torre de Controle", path: "/viagens", group: "Viagens", actions: READ_ONLY },
  { key: "viagens.monitor", label: "Monitor de Voos", path: "/viagens/monitor", group: "Viagens", actions: READ_ONLY },
  { key: "viagens.checkin", label: "Fazer Check-in", path: "/checkin", group: "Viagens", actions: VIEW_EDIT },
  { key: "viagens.hospedagem", label: "Confirmar Hospedagens", path: "/hospedagem", group: "Viagens", actions: VIEW_EDIT },
  { key: "viagens.alteracoes", label: "Alterações de Viagem", path: "/alteracoes", group: "Viagens", actions: VIEW_EDIT },
  { key: "viagens.booking-search", label: "Busca Booking", path: "/booking-search", group: "Viagens", actions: READ_ONLY },
  { key: "viagens.flights-search", label: "Busca de Voos", path: "/flights-search", group: "Viagens", actions: READ_ONLY },

  // --- Operação Diária ---
  { key: "operacao.inbox", label: "WhatsApp - NatLeva", path: "/operacao/inbox", group: "Operação", actions: ALL },
  { key: "operacao.integracoes", label: "Integrações", path: "/operacao/integracoes", group: "Operação", actions: VIEW_EDIT },
  { key: "operacao.pipeline", label: "Tags & Pipeline", path: "/operacao/pipeline", group: "Operação", actions: ALL },
  { key: "operacao.logs", label: "Logs & Auditoria", path: "/operacao/logs", group: "Operação", actions: READ_ONLY },

  // --- Batalhão NatLeva (AI Team) ---
  { key: "ai-team.mission", label: "Mission Control", path: "/ai-team", group: "AI Team", actions: READ_ONLY },
  { key: "ai-team.equipe", label: "Equipe", path: "/ai-team/equipe", group: "AI Team", actions: ALL },
  { key: "ai-team.evolution", label: "Evolution Engine", path: "/ai-team/evolution", group: "AI Team", actions: VIEW_EDIT },
  { key: "ai-team.conhecimento", label: "Conhecimento", path: "/ai-team/conhecimento", group: "AI Team", actions: ALL },
  { key: "ai-team.skills", label: "Skills", path: "/ai-team/skills", group: "AI Team", actions: ALL },
  { key: "ai-team.workflow", label: "Flow Builder", path: "/ai-team/workflow", group: "AI Team", actions: ALL },
  { key: "ai-team.memoria", label: "Memória & Fiscal", path: "/ai-team/memoria", group: "AI Team", actions: VIEW_EDIT },
  { key: "ai-team.academia", label: "Academia", path: "/ai-team/academia", group: "AI Team", actions: VIEW_EDIT },
  { key: "ai-team.simulador", label: "Simulador", path: "/ai-team/simulador", group: "AI Team", actions: READ_ONLY },
  { key: "ai-team.performance", label: "Performance", path: "/ai-team/performance", group: "AI Team", actions: READ_ONLY },
  { key: "ai-team.config", label: "Configurações IA", path: "/ai-team/config", group: "AI Team", actions: VIEW_EDIT },
  { key: "ai-team.regras", label: "Regras Globais", path: "/implementacao/estrategia-ia", group: "AI Team", actions: VIEW_EDIT },
  { key: "ai-team.aprendizados", label: "Aprendizados IA", path: "/implementacao/aprendizados-ia", group: "AI Team", actions: VIEW_EDIT },
  { key: "ai-team.cerebro", label: "Cérebro NatLeva", path: "/implementacao/cerebro-natleva", group: "AI Team", actions: READ_ONLY },

  // --- Implementação ---
  { key: "implementacao.import", label: "Importar Planilhas", path: "/import", group: "Implementação", actions: ["view", "create"] },
  { key: "implementacao.import-chatguru", label: "Importar Conversas", path: "/livechat/import-chatguru", group: "Implementação", actions: ["view", "create"] },
  { key: "implementacao.base-conhecimento", label: "Base de Conhecimento", path: "/implementacao/base-conhecimento", group: "Implementação", actions: ALL },

  // --- Portal do Viajante ---
  { key: "portal.dashboard", label: "Portal Dashboard", path: "/portal-admin", group: "Portal", actions: READ_ONLY },
  { key: "portal.viagens", label: "Portal Viagens", path: "/portal-admin/viagens", group: "Portal", actions: ALL },
  { key: "portal.clientes", label: "Portal Clientes", path: "/portal-admin/clientes", group: "Portal", actions: ALL },
  { key: "portal.documentos", label: "Portal Documentos", path: "/portal-admin/documentos", group: "Portal", actions: ALL },
  { key: "portal.itinerarios", label: "Itinerários", path: "/itinerario", group: "Portal", actions: ALL },
  { key: "portal.notificacoes", label: "Portal Notificações", path: "/portal-admin/notificacoes", group: "Portal", actions: ALL },
  { key: "portal.config", label: "Portal Configurações", path: "/portal-admin/config", group: "Portal", actions: VIEW_EDIT },

  // --- Financeiro ---
  { key: "financeiro.visao", label: "Visão Geral Financeira", path: "/financeiro", group: "Financeiro", actions: READ_ONLY },
  { key: "financeiro.receber", label: "Contas a Receber", path: "/financeiro/receber", group: "Financeiro", actions: ALL },
  { key: "financeiro.pagar", label: "Contas a Pagar", path: "/financeiro/pagar", group: "Financeiro", actions: ALL },
  { key: "financeiro.fluxo", label: "Fluxo de Caixa", path: "/financeiro/fluxo", group: "Financeiro", actions: READ_ONLY },
  { key: "financeiro.cartoes", label: "Cartões", path: "/financeiro/cartoes", group: "Financeiro", actions: ALL },
  { key: "financeiro.fornecedores", label: "Fornecedores", path: "/financeiro/fornecedores", group: "Financeiro", actions: ALL },
  { key: "financeiro.taxas", label: "Taxas & Tarifas", path: "/financeiro/taxas", group: "Financeiro", actions: VIEW_EDIT },
  { key: "financeiro.gateways", label: "Gateway Pagamentos", path: "/financeiro/gateways", group: "Financeiro", actions: VIEW_EDIT },
  { key: "financeiro.simulador", label: "Simulador de Taxas", path: "/financeiro/simulador", group: "Financeiro", actions: READ_ONLY },
  { key: "financeiro.plano-contas", label: "Plano de Contas", path: "/financeiro/plano-contas", group: "Financeiro", actions: ALL },
  { key: "financeiro.comissoes", label: "Comissões", path: "/financeiro/comissoes", group: "Financeiro", actions: VIEW_EDIT },
  { key: "financeiro.fechamento", label: "Fechamento Fornecedores", path: "/financeiro/fechamento", group: "Financeiro", actions: VIEW_EDIT },
  { key: "financeiro.dre", label: "DRE / Relatórios", path: "/financeiro/dre", group: "Financeiro", actions: READ_ONLY },

  // --- RH ---
  { key: "rh.visao", label: "Visão Geral RH", path: "/rh", group: "RH", actions: READ_ONLY },
  { key: "rh.colaboradores", label: "Colaboradores", path: "/rh/colaboradores", group: "RH", actions: ALL },
  { key: "rh.ponto", label: "Ponto", path: "/rh/ponto", group: "RH", actions: VIEW_EDIT },
  { key: "rh.folha", label: "Folha & Pagamentos", path: "/rh/folha", group: "RH", actions: ALL },
  { key: "rh.metas", label: "Metas & Bônus", path: "/rh/metas", group: "RH", actions: ALL },
  { key: "rh.desempenho", label: "Desempenho", path: "/rh/desempenho", group: "RH", actions: VIEW_EDIT },
  { key: "rh.feedbacks", label: "Feedbacks & 1:1", path: "/rh/feedbacks", group: "RH", actions: ALL },
  { key: "rh.advertencias", label: "Advertências", path: "/rh/advertencias", group: "RH", actions: ALL },
  { key: "rh.documentos", label: "Contratos & Docs", path: "/rh/documentos", group: "RH", actions: ALL },
  { key: "rh.permissoes", label: "Permissões & Acessos", path: "/rh/permissoes", group: "RH", actions: VIEW_EDIT },
  { key: "rh.clima", label: "Clima do Time", path: "/rh/clima", group: "RH", actions: READ_ONLY },
  { key: "rh.relatorios", label: "Relatórios RH", path: "/rh/relatorios", group: "RH", actions: READ_ONLY },
  { key: "rh.config", label: "Configurações RH", path: "/rh/config", group: "RH", actions: VIEW_EDIT },

  // --- Admin ---
  { key: "admin.users", label: "Usuários & Roles", path: "/admin/users", group: "Admin", actions: ALL },
  { key: "admin.settings", label: "Configurações Sistema", path: "/settings", group: "Admin", actions: VIEW_EDIT },
];

export const MENU_GROUPS = Array.from(new Set(SYSTEM_MENUS.map(m => m.group)));

export const MENU_BY_KEY: Record<string, SystemMenuItem> = Object.fromEntries(
  SYSTEM_MENUS.map(m => [m.key, m])
);

export const MENU_BY_PATH: Record<string, SystemMenuItem> = Object.fromEntries(
  SYSTEM_MENUS.map(m => [m.path, m])
);

/** Templates por perfil — base sugerida ao aplicar um role. */
export type RoleTemplate = "admin" | "gestor" | "vendedor" | "operacional" | "financeiro" | "leitura";

export const ROLE_TEMPLATES: Record<RoleTemplate, (key: string) => Partial<Record<MenuAction, boolean>>> = {
  admin: () => ({ view: true, create: true, edit: true, delete: true }),
  gestor: (key) => {
    // Gestor vê tudo, edita quase tudo, não exclui financeiro nem RH crítico
    const noDelete = key.startsWith("financeiro.") || key.startsWith("rh.") || key.startsWith("admin.");
    return { view: true, create: true, edit: true, delete: !noDelete };
  },
  vendedor: (key) => {
    const allowed =
      key === "dashboard" ||
      key.startsWith("sales") ||
      key === "pendencias" ||
      key.startsWith("cotacoes") ||
      key.startsWith("propostas") ||
      key === "midias" ||
      key.startsWith("clientes.") ||
      key.startsWith("viagens.") ||
      key === "operacao.inbox" ||
      key === "operacao.pipeline";
    if (!allowed) return {};
    const canCreate = key.startsWith("sales") || key.startsWith("cotacoes") || key.startsWith("propostas") || key === "clientes.passageiros";
    return { view: true, create: canCreate, edit: canCreate };
  },
  operacional: (key) => {
    const allowed =
      key === "dashboard" ||
      key.startsWith("viagens.") ||
      key.startsWith("portal.") ||
      key.startsWith("operacao.") ||
      key === "clientes.passageiros" ||
      key === "midias";
    if (!allowed) return {};
    return { view: true, edit: true };
  },
  financeiro: (key) => {
    const allowed = key === "dashboard" || key.startsWith("financeiro.") || key === "sales" || key.startsWith("rh.folha");
    if (!allowed) return {};
    return { view: true, create: true, edit: true };
  },
  leitura: (key) => {
    // só visualização em tudo que não é admin/config sensível
    if (key.startsWith("admin.") || key === "rh.permissoes" || key === "ai-team.config") return {};
    return { view: true };
  },
};
