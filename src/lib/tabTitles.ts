import { SYSTEM_MENUS } from "./systemMenus";

/**
 * Mapa adicional para rotas que não estão em SYSTEM_MENUS ou que precisam
 * de título mais amigável quando abertas como aba.
 */
const EXTRA_TITLES: Array<{ match: RegExp; title: string }> = [
  { match: /^\/sales\/new$/, title: "Nova Venda" },
  { match: /^\/sales\/[^/]+\/edit$/, title: "Editar Venda" },
  { match: /^\/sales\/[^/]+$/, title: "Detalhe da Venda" },
  { match: /^\/propostas\/nova$/, title: "Nova Proposta" },
  { match: /^\/propostas\/modelos\/novo$/, title: "Novo Modelo" },
  { match: /^\/propostas\/modelos\/[^/]+$/, title: "Editar Modelo" },
  { match: /^\/propostas\/[^/]+$/, title: "Editar Proposta" },
  { match: /^\/passengers\/[^/]+$/, title: "Perfil do Passageiro" },
  { match: /^\/clients\/[^/]+$/, title: "Detalhe do Cliente" },
  { match: /^\/viagens\/[^/]+$/, title: "Detalhe da Viagem" },
  { match: /^\/produtos\/novo$/, title: "Novo Produto" },
  { match: /^\/produtos\/[^/]+\/editar$/, title: "Editar Produto" },
  { match: /^\/produtos\/[^/]+$/, title: "Detalhe do Produto" },
  { match: /^\/portal-admin\/viagens\/[^/]+$/, title: "Viagem (Portal)" },
  { match: /^\/ai-team\/agent\/[^/]+$/, title: "Agente IA" },
  { match: /^\/livechat\/integration$/, title: "WhatsApp" },
  { match: /^\/livechat\/whatsapp-qr$/, title: "Conectar WhatsApp" },
  { match: /^\/livechat\/integrations$/, title: "Integrações IA" },
  { match: /^\/livechat\/knowledge-base$/, title: "Base de Conhecimento IA" },
  { match: /^\/livechat\/import-chatguru$/, title: "Importar Conversas" },
  { match: /^\/livechat\/analise$/, title: "Análise de Atendimento" },
  { match: /^\/livechat\/status$/, title: "Status do WhatsApp" },
  { match: /^\/diagnostico$/, title: "Diagnóstico" },
  { match: /^\/itinerario$/, title: "Itinerário" },
  { match: /^\/midias$/, title: "Mídias" },
  { match: /^\/apresentacao$/, title: "Apresentação" },
];

/**
 * Retorna um título amigável para qualquer rota interna do CRM.
 */
export function titleForPath(path: string): string {
  const normalized = path.split("?")[0].split("#")[0] || "/";
  // 1) match exato em SYSTEM_MENUS
  const exact = SYSTEM_MENUS.find((m) => m.path === normalized);
  if (exact) return exact.label;
  // 2) match por regex em EXTRA_TITLES
  for (const e of EXTRA_TITLES) {
    if (e.match.test(normalized)) return e.title;
  }
  // 3) match prefix em SYSTEM_MENUS (rota mais longa primeiro)
  const sorted = [...SYSTEM_MENUS].sort((a, b) => b.path.length - a.path.length);
  const prefix = sorted.find((m) => normalized.startsWith(m.path + "/"));
  if (prefix) return prefix.label;
  // 4) fallback: último segmento capitalizado
  const last = normalized.split("/").filter(Boolean).pop() || "Início";
  return last.charAt(0).toUpperCase() + last.slice(1);
}

/**
 * Atalhos exibidos no botão "+" da TabBar.
 */
export const TAB_QUICK_LINKS: Array<{ path: string; label: string }> = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/operacao/inbox", label: "WhatsApp" },
  { path: "/sales", label: "Vendas" },
  { path: "/cotacoes", label: "Cotações" },
  { path: "/propostas", label: "Propostas" },
  { path: "/viagens", label: "Torre de Controle" },
  { path: "/passengers", label: "Passageiros" },
  { path: "/financeiro", label: "Financeiro" },
];
