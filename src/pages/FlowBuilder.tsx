import { useState, useCallback, useRef, useEffect, useMemo, lazy, Suspense } from "react";
import { FlowCRMPipeline } from "@/components/flow/FlowCRMPipeline";
import { FlowMetrics } from "@/components/flow/FlowMetrics";
import { FlowSimulator } from "@/components/flow/FlowSimulator";
import { LiveFunnel } from "@/components/flow/LiveFunnel";
const Funnel3DView = lazy(() => import("@/components/flow/Funnel3DView").then(m => ({ default: m.Funnel3DView })));
import natlevaLogo from "@/assets/logo-natleva.png";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAITeamAudit, AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/aiTeamAudit";
import type { Database } from "@/integrations/supabase/types";
import {
  ReactFlow, Background, Controls, MiniMap, Panel,
  addEdge, useNodesState, useEdgesState, useReactFlow, ReactFlowProvider,
  Connection, Edge, Node, MarkerType,
  BackgroundVariant, Handle, Position, getBezierPath,
  type NodeTypes, type EdgeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ChevronLeft, Save, Play, Pause, Plus, Trash2, Copy,
  MessageSquare, Zap, GitBranch, Tag, ArrowRightLeft, Sparkles, UserCheck,
  Settings2, X, LayoutTemplate, Plug, AlertCircle, CheckCircle2,
  Maximize2, AlignVerticalJustifyCenter, FlaskConical, Eye,
  Bot, Send, Filter, Workflow, Cable, GripVertical,
  Radio, Timer, Hash, Shield, Globe2, Cpu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ─── CONSTANTS ───
const GREEN = "hsl(142 71% 45%)";
const RED = "hsl(0 72% 51%)";

const NATLEVA_AGENT_LABELS: Record<string, string> = {
  orion: "🔮 ÓRION",
  maya: "🌸 MAYA",
  atlas: "🗺️ ATLAS",
  habibi: "🏜️ HABIBI",
  nemo: "🎢 NEMO",
  dante: "🏛️ DANTE",
  luna: "🌙 LUNA",
  nero: "🎯 NERO",
  iris: "🌈 IRIS",
  aegis: "🛡️ AEGIS",
  nurture: "🌱 NURTURE",
  athos: "🛎️ ATHOS",
  zara: "✨ ZARA",
  finx: "📊 FINX",
  sage: "🧮 SAGE",
  opex: "🔧 OPEX",
  vigil: "👁️ VIGIL",
  sentinel: "🛰️ SENTINEL",
  spark: "⚡ SPARK",
  hunter: "🏹 HUNTER",
  "nath-ai": "👩‍💼 NATH.AI",
};

const NODE_LIBRARY = [
  { type: "trigger", label: "Gatilho", icon: Radio, color: "hsl(45 93% 58%)", emoji: "⚡", description: "Inicia o fluxo quando um evento ocorre" },
  { type: "message", label: "Mensagem", icon: Send, color: "hsl(210 100% 56%)", emoji: "💬", description: "Envia uma mensagem de texto" },
  { type: "condition", label: "Condição", icon: Filter, color: "hsl(32 95% 55%)", emoji: "🔀", description: "Ramifica o fluxo (IF / ELSE)" },
  { type: "action_tag", label: "Aplicar Tag", icon: Hash, color: "hsl(280 65% 55%)", emoji: "🏷️", description: "Adiciona tags ao contato" },
  { type: "action_funnel", label: "Mover Funil", icon: Workflow, color: "hsl(160 60% 45%)", emoji: "📊", description: "Move o lead no funil" },
  { type: "ai_agent", label: "Agente IA", icon: Cpu, color: "hsl(280 80% 60%)", emoji: "🤖", description: "IA com provedor configurável" },
  { type: "handoff", label: "Transferir", icon: Cable, color: "hsl(0 0% 55%)", emoji: "👤", description: "Transfere para humano" },
] as const;

const PROVIDER_BADGES: Record<string, { label: string; icon: string; color: string }> = {
  natleva: { label: "NatLeva (Lovable AI)", icon: "🧠", color: "hsl(280 80% 60%)" },
  openai: { label: "OpenAI", icon: "🤖", color: "hsl(160 60% 45%)" },
  gemini: { label: "Gemini", icon: "💎", color: "hsl(210 80% 55%)" },
  groq: { label: "Groq", icon: "⚡", color: "hsl(45 80% 50%)" },
  openrouter: { label: "OpenRouter", icon: "🌐", color: "hsl(190 70% 50%)" },
  n8n: { label: "n8n", icon: "🔗", color: "hsl(340 70% 55%)" },
};

const AI_CONTEXT_FIELDS = [
  { key: "last_message", label: "Última mensagem" },
  { key: "chat_history", label: "Histórico recente" },
  { key: "client_name", label: "Nome do cliente" },
  { key: "client_score", label: "Score do cliente" },
  { key: "client_cluster", label: "Cluster" },
  { key: "client_vip", label: "Status VIP" },
  { key: "client_city", label: "Cidade" },
  { key: "funnel_stage", label: "Etapa do funil" },
  { key: "tags", label: "Tags aplicadas" },
  { key: "trips_summary", label: "Resumo de viagens" },
  { key: "pendencies", label: "Pendências" },
] as const;

type NodeConfig = Record<string, any>;
type CanvasNodeType = (typeof NODE_LIBRARY)[number]["type"];

const AUTOMATION_NODE_TYPE_TO_CANVAS: Record<string, CanvasNodeType> = {
  trigger_new_conversation: "trigger",
  trigger_new_message: "trigger",
  trigger_stage_change: "trigger",
  trigger_tag_applied: "trigger",
  trigger_scheduled: "trigger",
  send_text: "message",
  send_media: "message",
  send_template: "message",
  question_text: "message",
  question_buttons: "message",
  condition_if_else: "condition",
  action_create_lead: "action_tag",
  action_apply_tag: "action_tag",
  action_change_stage: "action_funnel",
  action_assign: "handoff",
  action_create_task: "handoff",
  action_link_vehicle: "action_tag",
  action_create_proposal: "action_funnel",
  action_request_kyc: "message",
  ai_agent: "ai_agent",
  handoff_pause: "handoff",
  handoff_transfer: "handoff",
  handoff_notify: "handoff",
  util_delay: "message",
  util_goto: "action_funnel",
  util_webhook: "action_tag",
  trigger: "trigger",
  message: "message",
  condition: "condition",
  action_tag: "action_tag",
  action_funnel: "action_funnel",
  handoff: "handoff",
};

const toCanvasNodeType = (nodeType?: string): CanvasNodeType => {
  return AUTOMATION_NODE_TYPE_TO_CANVAS[nodeType || ""] || "message";
};

const getPersistedNodeType = (node: Node) => {
  const data = (node.data || {}) as Record<string, any>;
  return data.originalNodeType || data.nodeType || node.type || "message";
};

// ─── TEMPLATES ───
const TEMPLATES = [
  // ═══════════════════════════════════════════
  // MAIN FLOW COMERCIAL NATLEVA (WHATSAPP)
  // ═══════════════════════════════════════════
  {
    name: "🚀 Main Flow Comercial NatLeva",
    category: "comercial",
    description: "Funil completo WhatsApp: Recepção → Qualificação → Orçamento → Proposta → Negociação → Fechamento → Pós-venda",
    nodes: [
      // ── [A] TRIGGER INICIAL ──
      { id: "a1", type: "trigger", label: "📩 Nova msg WhatsApp", position: { x: 500, y: 0 }, config: { trigger_type: "new_message", keywords: [] } },
      { id: "a2", type: "action_funnel", label: "→ Novo Lead", position: { x: 500, y: 130 }, config: { funnel_stage: "novo_lead" } },
      { id: "a3", type: "condition", label: "Origem = Quiz?", position: { x: 500, y: 270 }, config: { field: "keyword", operator: "contains", value: "quiz" } },
      { id: "a4", type: "action_tag", label: "🏷️ Tag Quiz", position: { x: 250, y: 420 }, config: { tags: ["Quiz", "Orgânico"] } },
      { id: "a5", type: "action_tag", label: "🏷️ Tag Tráfego", position: { x: 750, y: 420 }, config: { tags: ["Tráfego"] } },
      { id: "a6", type: "condition", label: "Cliente existe no CRM?", position: { x: 500, y: 560 }, config: { field: "tag", operator: "exists", value: "CRM" } },
      { id: "a7", type: "message", label: "Criar lead básico", position: { x: 250, y: 710 }, config: { text: "(Ação interna: criar cliente com nome do contato WhatsApp)" } },

      // ── [B] RECEPÇÃO & ENCANTAMENTO ──
      { id: "b1", type: "action_funnel", label: "→ Recepção & Conexão", position: { x: 500, y: 850 }, config: { funnel_stage: "recepcao" } },
      { id: "b2", type: "ai_agent", label: "🧠 IA Recepção Premium", position: { x: 500, y: 990 }, config: { persona: "sdr", objective: "qualificar", style: "premium", send_mode: "auto", system_prompt: "Você é um concierge de viagens premium da NatLeva. Agradeça o contato com elegância, crie uma conexão genuína e pergunte 1-2 informações iniciais (destino e período). Seja acolhedor, objetivo e encantador. Nunca bombardeie de perguntas." } },
      { id: "b3", type: "message", label: "💬 Qual destino?", position: { x: 500, y: 1130 }, config: { text: "(IA gerou + aprovação) Ex: 'Olá {nome}! ✨ Que bom ter você aqui. Me conta: qual destino está no seu radar?'" } },
      { id: "b4", type: "message", label: "📅 Período aproximado?", position: { x: 500, y: 1270 }, config: { text: "E tem algum período em mente? Pode ser uma janela flexível também 😉" } },
      { id: "b5", type: "message", label: "👥 Quantas pessoas?", position: { x: 500, y: 1410 }, config: { text: "Quantas pessoas vão na viagem? (adultos e crianças com idades, se houver)" } },

      // ── Tags de destino detectado ──
      { id: "b6", type: "condition", label: "Destino = Dubai?", position: { x: 500, y: 1560 }, config: { field: "keyword", operator: "contains", value: "dubai" } },
      { id: "b7", type: "action_tag", label: "🏷️ Dubai + Internacional", position: { x: 200, y: 1710 }, config: { tags: ["Dubai", "Oriente Médio", "Internacional", "Alto Ticket"] } },
      { id: "b8", type: "condition", label: "Destino = Europa?", position: { x: 700, y: 1710 }, config: { field: "keyword", operator: "contains", value: "europa" } },
      { id: "b9", type: "action_tag", label: "🏷️ Europa", position: { x: 450, y: 1860 }, config: { tags: ["Europa", "Internacional"] } },
      { id: "b10", type: "action_tag", label: "🏷️ Outro destino", position: { x: 900, y: 1860 }, config: { tags: ["Destino a classificar"] } },

      // ── [C] QUALIFICAÇÃO COMPLETA ──
      { id: "c1", type: "action_funnel", label: "→ Qualificação", position: { x: 500, y: 2050 }, config: { funnel_stage: "qualificacao" } },
      { id: "c2", type: "ai_agent", label: "🧠 IA Qualificação NatLeva", position: { x: 500, y: 2190 }, config: { persona: "vendas", objective: "qualificar", style: "premium", send_mode: "auto", system_prompt: "Colete dados de qualificação com elegância: cidade de origem, datas, qtd pessoas, preferência de hotel (3-5 estrelas), estilo (econômico/conforto/premium), experiências desejadas, faixa de orçamento, forma de pagamento e observações. Pergunte de forma natural, não como formulário.", context_fields: ["last_message", "chat_history", "client_name", "client_score", "funnel_stage", "tags"] } },
      { id: "c3", type: "condition", label: "Faltou info essencial?", position: { x: 500, y: 2350 }, config: { field: "tag", operator: "not_contains", value: "Qualificado" } },
      { id: "c4", type: "action_funnel", label: "→ Aguardando Info", position: { x: 200, y: 2500 }, config: { funnel_stage: "aguardando_info" } },
      { id: "c5", type: "action_tag", label: "🏷️ Falta Info", position: { x: 200, y: 2640 }, config: { tags: ["Falta Info"] } },
      { id: "c6", type: "message", label: "⏳ Cobrar info (timer 12h)", position: { x: 200, y: 2780 }, config: { text: "Olá {nome}! 😊 Só me faltam algumas informações para montar a melhor opção pra você. Consegue me passar?" } },

      // ── [D] VIP / PRIORIDADE ──
      { id: "d1", type: "condition", label: "É VIP? (score ≥ 70)", position: { x: 500, y: 2500 }, config: { field: "score", operator: "greater_than", value: "70" } },
      { id: "d2", type: "action_tag", label: "🏷️ VIP + Prioridade", position: { x: 250, y: 2670 }, config: { tags: ["VIP", "Prioridade Alta", "Responder Hoje"] } },
      { id: "d3", type: "handoff", label: "👑 → Vendedor Sênior", position: { x: 250, y: 2820 }, config: { queue: "vendas_vip", notify: true } },
      { id: "d4", type: "condition", label: "Viagem < 15 dias?", position: { x: 700, y: 2670 }, config: { field: "inactive_days", operator: "less_than", value: "15" } },
      { id: "d5", type: "action_tag", label: "🏷️ Urgente", position: { x: 500, y: 2820 }, config: { tags: ["Urgente", "Responder Hoje"] } },

      // ── [E] ORÇAMENTO EM PREPARAÇÃO (PAUSA REAL) ──
      { id: "e1", type: "action_funnel", label: "→ Orçamento Preparação", position: { x: 700, y: 2960 }, config: { funnel_stage: "orcamento_preparacao" } },
      { id: "e1b", type: "action_tag", label: "🏷️ Tag Orçamento", position: { x: 700, y: 3060 }, config: { tags: ["Orçamento", "Em Cotação"] } },
      { id: "e2", type: "message", label: "💎 Msg 'estou preparando'", position: { x: 700, y: 3160 }, config: { text: "Perfeito {nome}, já entendi o cenário! 🎯 Vou preparar as melhores opções com calma e te retorno com uma proposta bem redonda. Se surgir qualquer detalhe — datas, hotel, voo — me avise por aqui!", require_approval: false } },
      { id: "e3", type: "message", label: "⏱️ Tarefa interna vendedor", position: { x: 700, y: 3260 }, config: { text: "(Tarefa interna: criar orçamento para o cliente. Lembrete em 2-4h.)", require_approval: false } },
      { id: "e_pause", type: "handoff", label: "⏸️ PAUSAR AUTOMAÇÃO", position: { x: 700, y: 3380 }, config: { queue: "vendas", notify: true, pause_automation: true, pause_reason: "Aguardando vendedor preparar orçamento. IA NÃO responde automaticamente nesta fase. Cliente será notificado se enviar mensagem." } },
      { id: "e4", type: "ai_agent", label: "🧠 IA Follow-up 24h", position: { x: 700, y: 3520 }, config: { persona: "vendas", objective: "responder", style: "premium", send_mode: "suggest", system_prompt: "Se passaram 24h sem envio de proposta. Gere um follow-up elegante mantendo o cliente engajado. Dê uma dica do destino ou um diferencial do roteiro em preparação." } },
      // ── TRIGGER DE RETOMADA ──
      { id: "e_resume", type: "trigger", label: "🔄 Retomada: Proposta Enviada", position: { x: 900, y: 3520 }, config: { trigger_type: "funnel_changed", target_stage: "proposta_enviada", resume_from_pause: true } },

      // ── [F] PROPOSTA ENVIADA (RETOMADA AUTOMÁTICA) ──
      { id: "f1", type: "action_funnel", label: "→ Proposta Enviada", position: { x: 700, y: 3700 }, config: { funnel_stage: "proposta_enviada" } },
      { id: "f2", type: "ai_agent", label: "🧠 IA Entrega de Proposta", position: { x: 700, y: 3840 }, config: { persona: "vendas", objective: "vender", style: "premium", send_mode: "auto", system_prompt: "Gere mensagem de entrega da proposta: resumo do roteiro, por que faz sentido, opções A/B (bom/melhor), CTA leve como 'Quer que eu ajuste algo?'. Tom: consultivo, premium, sem pressão." } },
      { id: "f3", type: "action_tag", label: "🏷️ Proposta", position: { x: 700, y: 3980 }, config: { tags: ["Proposta Enviada"] } },
      { id: "f4", type: "condition", label: "Cliente respondeu?", position: { x: 700, y: 4120 }, config: { field: "last_response", operator: "exists", value: "" } },

      // Follow-up proposta (sem resposta) — IA auto
      { id: "f5", type: "message", label: "⏱️ Follow-up 12h", position: { x: 1000, y: 4280 }, config: { text: "{nome}, viu a proposta? 😊 Estou aqui se quiser ajustar qualquer detalhe — hotel, voo, roteiro... é só me dizer!", require_approval: false } },
      { id: "f6", type: "message", label: "⏱️ Follow-up 48h", position: { x: 1000, y: 4420 }, config: { text: "Só passando para saber se tem alguma dúvida sobre a proposta, {nome}. Se preferir, posso montar opções diferentes. 🙂", require_approval: false } },

      // ── [G] NEGOCIAÇÃO & DÚVIDAS (IA AUTO) ──
      { id: "g1", type: "action_funnel", label: "→ Negociação", position: { x: 450, y: 4280 }, config: { funnel_stage: "negociacao" } },
      { id: "g2", type: "condition", label: "Objeção = Preço?", position: { x: 450, y: 4430 }, config: { field: "keyword", operator: "contains", value: "caro,preço,desconto,barato" } },
      { id: "g3", type: "ai_agent", label: "🧠 IA Objeção Preço", position: { x: 150, y: 4590 }, config: { persona: "vendas", objective: "vender", style: "premium", send_mode: "auto", system_prompt: "O cliente levantou objeção de preço. Responda com valor: mostre o que está incluso, compare com mercado, sugira alternativas mais acessíveis sem desvalorizar. Ofereça opções de parcelamento. Tom: consultivo e empático." } },
      { id: "g4", type: "condition", label: "Dúvida = Hotel/Voo?", position: { x: 650, y: 4590 }, config: { field: "keyword", operator: "contains", value: "hotel,voo,conexão,quarto" } },
      { id: "g5", type: "ai_agent", label: "🧠 IA Ajuste Hotel/Voo", position: { x: 400, y: 4750 }, config: { persona: "concierge", objective: "responder", style: "premium", send_mode: "auto", system_prompt: "O cliente tem dúvida ou quer ajustar hotel/voo. Responda com detalhes, sugira alternativas e pergunte preferências específicas." } },
      { id: "g6", type: "condition", label: "Dúvida = Pagamento?", position: { x: 850, y: 4750 }, config: { field: "keyword", operator: "contains", value: "parcelamento,cartão,pix,pagamento" } },
      { id: "g7", type: "ai_agent", label: "🧠 IA Pagamento", position: { x: 650, y: 4910 }, config: { persona: "vendas", objective: "responder", style: "premium", send_mode: "auto", system_prompt: "Responda sobre formas de pagamento: PIX, cartão, parcelamento. Explique condições de forma clara e objetiva." } },
      { id: "g8", type: "ai_agent", label: "🧠 IA Docs/Visto", position: { x: 1050, y: 4910 }, config: { persona: "documentos", objective: "responder", style: "premium", send_mode: "auto", system_prompt: "Responda sobre documentação: passaporte, visto, prazos. Seja preciso e oriente os próximos passos." } },

      // ── [H] FECHAMENTO ──
      { id: "h1", type: "action_funnel", label: "→ Fechado ✅", position: { x: 500, y: 4950 }, config: { funnel_stage: "fechado" } },
      { id: "h2", type: "action_tag", label: "🏷️ Fechado + Status", position: { x: 500, y: 5090 }, config: { tags: ["Fechado", "Emissão Pendente"] } },
      { id: "h3", type: "message", label: "🎉 Confirmação + Próximos passos", position: { x: 500, y: 5230 }, config: { text: "Maravilha {nome}! 🎉✨ Venda confirmada! Agora vou cuidar de tudo com muito carinho. Próximos passos:\n\n✅ Emissão de aéreos e hotel\n📋 Documentação necessária\n📲 Suporte NatLeva em todas as etapas\n\nFique tranquilo(a), estamos juntos nessa jornada! 🌍" } },
      { id: "h4", type: "message", label: "📋 Solicitar docs", position: { x: 500, y: 5380 }, config: { text: "Para a emissão, vou precisar dos seguintes dados de cada passageiro:\n\n📌 Nome completo (como no documento)\n📌 Data de nascimento\n📌 CPF\n📌 Passaporte (se internacional)\n\nPode me enviar por aqui mesmo! 📎" } },

      // ── [I] PÓS-VENDA ──
      { id: "i1", type: "action_funnel", label: "→ Pós-venda/Operação", position: { x: 500, y: 5550 }, config: { funnel_stage: "pos_venda" } },
      { id: "i2", type: "message", label: "📩 Msg pré-embarque", position: { x: 300, y: 5700 }, config: { text: "Faltam poucos dias {nome}! 🛫✨ Seu check-in abre em breve. Já separei todas as informações. Qualquer dúvida de última hora, estamos aqui!" } },
      { id: "i3", type: "message", label: "🌍 Durante viagem", position: { x: 500, y: 5700 }, config: { text: "E aí {nome}, como está sendo a viagem? 🌟 Se precisar de qualquer suporte — restaurante, passeio, transfer — é só chamar!" } },
      { id: "i4", type: "ai_agent", label: "🧠 IA NPS + Upsell", position: { x: 700, y: 5700 }, config: { persona: "pos_venda", objective: "pos_venda", style: "premium", send_mode: "auto", system_prompt: "O cliente voltou de viagem. Pergunte como foi a experiência (NPS), agradeça a confiança e sonde próximos destinos. Tom: caloroso, genuíno." } },

      // ── [J] SEM RESPOSTA / REATIVAÇÃO ──
      { id: "j1", type: "condition", label: "Sem resposta 12h?", position: { x: 1100, y: 4950 }, config: { field: "inactive_days", operator: "greater_than", value: "0.5" } },
      { id: "j2", type: "ai_agent", label: "🧠 IA Reativação 12h", position: { x: 1100, y: 5100 }, config: { persona: "reativacao", objective: "responder", style: "premium", send_mode: "auto", system_prompt: "Reativação sutil após 12h sem resposta. Mensagem curta e leve, sem pressão." } },
      { id: "j3", type: "message", label: "⏱️ 24h: Valor + dica", position: { x: 1100, y: 5250 }, config: { text: "{nome}, achei uma dica incrível sobre {destino}! 💡 Quer que eu compartilhe enquanto finalizamos os detalhes?" } },
      { id: "j4", type: "message", label: "⏱️ 48h: Pausar?", position: { x: 1100, y: 5400 }, config: { text: "Oi {nome}! Tudo bem? Posso pausar o orçamento e retomar quando for melhor pra você? A porta está sempre aberta! 😊" } },
      { id: "j5", type: "condition", label: "Ainda sem retorno 7d?", position: { x: 1100, y: 5560 }, config: { field: "inactive_days", operator: "greater_than", value: "7" } },
      { id: "j6", type: "action_funnel", label: "→ Perdido", position: { x: 1300, y: 5710 }, config: { funnel_stage: "perdido" } },
      { id: "j7", type: "action_tag", label: "🏷️ Sem retorno", position: { x: 1300, y: 5850 }, config: { tags: ["Sem retorno", "Reativar futuro"] } },
      { id: "j8", type: "ai_agent", label: "🧠 IA Reativação VIP 7d", position: { x: 900, y: 5710 }, config: { persona: "reativacao", objective: "vender", style: "premium", send_mode: "auto", system_prompt: "Última tentativa de reativação elegante. Se for VIP, usar abordagem personalizada. Manter porta aberta sem desespero." } },
    ],
    edges: [
      // [A] Trigger → Novo Lead → Quiz?
      { source: "a1", target: "a2", sourceHandle: "out" },
      { source: "a2", target: "a3", sourceHandle: "out" },
      { source: "a3", target: "a4", sourceHandle: "yes", label: "Sim" },
      { source: "a3", target: "a5", sourceHandle: "no", label: "Não" },
      { source: "a4", target: "a6", sourceHandle: "out" },
      { source: "a5", target: "a6", sourceHandle: "out" },
      { source: "a6", target: "a7", sourceHandle: "no", label: "Não" },
      { source: "a6", target: "b1", sourceHandle: "yes", label: "Sim" },
      { source: "a7", target: "b1", sourceHandle: "out" },

      // [B] Recepção → IA → Perguntas → Destino
      { source: "b1", target: "b2", sourceHandle: "out" },
      { source: "b2", target: "b3", sourceHandle: "out" },
      { source: "b3", target: "b4", sourceHandle: "out" },
      { source: "b4", target: "b5", sourceHandle: "out" },
      { source: "b5", target: "b6", sourceHandle: "out" },
      { source: "b6", target: "b7", sourceHandle: "yes", label: "Sim" },
      { source: "b6", target: "b8", sourceHandle: "no", label: "Não" },
      { source: "b8", target: "b9", sourceHandle: "yes", label: "Sim" },
      { source: "b8", target: "b10", sourceHandle: "no", label: "Não" },
      { source: "b7", target: "c1", sourceHandle: "out" },
      { source: "b9", target: "c1", sourceHandle: "out" },
      { source: "b10", target: "c1", sourceHandle: "out" },

      // [C] Qualificação → Faltou info?
      { source: "c1", target: "c2", sourceHandle: "out" },
      { source: "c2", target: "c3", sourceHandle: "out" },
      { source: "c3", target: "c4", sourceHandle: "yes", label: "Falta" },
      { source: "c4", target: "c5", sourceHandle: "out" },
      { source: "c5", target: "c6", sourceHandle: "out" },
      { source: "c3", target: "d1", sourceHandle: "no", label: "OK" },

      // [D] VIP check
      { source: "d1", target: "d2", sourceHandle: "yes", label: "VIP" },
      { source: "d2", target: "d3", sourceHandle: "out" },
      { source: "d3", target: "e1", sourceHandle: "out" },
      { source: "d1", target: "d4", sourceHandle: "no", label: "Normal" },
      { source: "d4", target: "d5", sourceHandle: "yes", label: "Urgente" },
      { source: "d5", target: "e1", sourceHandle: "out" },
      { source: "d4", target: "e1", sourceHandle: "no", label: "Normal" },

      // [E] Orçamento (com pausa)
      { source: "e1", target: "e1b", sourceHandle: "out" },
      { source: "e1b", target: "e2", sourceHandle: "out" },
      { source: "e2", target: "e3", sourceHandle: "out" },
      { source: "e3", target: "e_pause", sourceHandle: "out" },
      { source: "e_pause", target: "e4", sourceHandle: "out" },
      { source: "e4", target: "f1", sourceHandle: "out" },
      // Retomada via trigger
      { source: "e_resume", target: "f1", sourceHandle: "out" },

      // [F] Proposta
      { source: "f1", target: "f2", sourceHandle: "out" },
      { source: "f2", target: "f3", sourceHandle: "out" },
      { source: "f3", target: "f4", sourceHandle: "out" },
      { source: "f4", target: "g1", sourceHandle: "yes", label: "Respondeu" },
      { source: "f4", target: "f5", sourceHandle: "no", label: "Sem resposta" },
      { source: "f5", target: "f6", sourceHandle: "out" },
      { source: "f6", target: "j1", sourceHandle: "out" },

      // [G] Negociação
      { source: "g1", target: "g2", sourceHandle: "out" },
      { source: "g2", target: "g3", sourceHandle: "yes", label: "Preço" },
      { source: "g2", target: "g4", sourceHandle: "no", label: "Outro" },
      { source: "g4", target: "g5", sourceHandle: "yes", label: "Hotel/Voo" },
      { source: "g4", target: "g6", sourceHandle: "no", label: "Outro" },
      { source: "g6", target: "g7", sourceHandle: "yes", label: "Pagamento" },
      { source: "g6", target: "g8", sourceHandle: "no", label: "Docs" },
      // All negotiation IAs → Fechamento
      { source: "g3", target: "h1", sourceHandle: "out" },
      { source: "g5", target: "h1", sourceHandle: "out" },
      { source: "g7", target: "h1", sourceHandle: "out" },
      { source: "g8", target: "h1", sourceHandle: "out" },

      // [H] Fechamento
      { source: "h1", target: "h2", sourceHandle: "out" },
      { source: "h2", target: "h3", sourceHandle: "out" },
      { source: "h3", target: "h4", sourceHandle: "out" },
      { source: "h4", target: "i1", sourceHandle: "out" },

      // [I] Pós-venda
      { source: "i1", target: "i2", sourceHandle: "out" },
      { source: "i1", target: "i3", sourceHandle: "out" },
      { source: "i1", target: "i4", sourceHandle: "out" },

      // [J] Sem retorno / Reativação
      { source: "j1", target: "j2", sourceHandle: "yes", label: "Sem retorno" },
      { source: "j2", target: "j3", sourceHandle: "out" },
      { source: "j3", target: "j4", sourceHandle: "out" },
      { source: "j4", target: "j5", sourceHandle: "out" },
      { source: "j5", target: "j6", sourceHandle: "yes", label: "Perdido" },
      { source: "j5", target: "j8", sourceHandle: "no", label: "Tentar" },
      { source: "j6", target: "j7", sourceHandle: "out" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // NEW FLOW NATLEVA — JORNADA OPERACIONAL COMPLETA COM AGENTES
  // ═══════════════════════════════════════════════════════════════
  {
    name: "🧠 New Flow - NatLeva",
    category: "comercial",
    description: "Jornada operacional completa: Órion → Maya → Atlas → Especialistas → Humano → Luna → Nero → Iris/Aegis/Nurture. Inclui hierarquia de prompt (12 camadas), regras operacionais, campos obrigatórios e compliance.",
    nodes: [
      // ═══ [DOC] REGRAS TRANSVERSAIS ═══
      {
        id: "doc1", type: "message", label: "📋 Regras Transversais", position: { x: 500, y: -200 },
        config: {
          text: `=== REGRAS TRANSVERSAIS (APLICAM-SE A TODOS OS NÓS) ===

🆔 IDENTIDADE UNIFICADA
· Todos os agentes se apresentam como "Nath", a fundadora da NatLeva
· NUNCA revelar nomes internos (Maya, Atlas, Habibi, etc.)
· NUNCA mencionar "colega", "especialista", "equipe" ou "outra pessoa"

🔄 TRANSFERÊNCIA INVISÍVEL
· Tag [TRANSFERIR] dispara handoff programático
· O cliente NUNCA percebe troca de agente
· A conversa deve fluir como uma única pessoa mudando de assunto

💰 PREÇO CONFIDENCIAL
· Nunca revelar custos antes da proposta formal (Luna)
· Dados de custo da KB são "USO INTERNO"
· Compliance Engine remove padrões monetários automaticamente

🚫 CONCORRENTES PROIBIDOS
· NUNCA citar: Booking, Airbnb, Decolar, GetYourGuide, 123Milhas
· Redirecionar exclusivamente para canais da NatLeva

🏢 FULL SERVICE
· NUNCA sugerir que o cliente faça algo por conta própria
· Sempre posicionar a NatLeva como quem resolve tudo

✍️ FORMATAÇÃO
· Sem travessão (—) e sem hífen (-) como bullet
· Usar ponto médio (·) ou números
· Máx 1 emoji a cada 3-4 mensagens
· Emojis NUNCA no início de frase

🛡️ COMPLIANCE ENGINE
· Pipeline determinístico (regex): filtra tags internas, preços vazados, recap de dados
· Sanitiza [TRANSFERIR], [BRIEFING], [ESCALON], [INTERNO]
· Word limits: Maya 120, Atlas 150, Especialistas 180

📐 HIERARQUIA DE PROMPT (12 CAMADAS — ordem de prioridade)
1. behavior_prompt do banco (PRIORIDADE MÁXIMA — sobrescreve tudo)
2. Identidade + Persona (quem sou, como me comporto)
3. Filosofia de atendimento (princípios NatLeva)
4. Anti-repetição (nunca repetir perguntas já respondidas)
5. Instruções de cargo (AGENT_ROLE_INSTRUCTIONS)
6. Contexto de equipe (PIPELINE_MAP + quem vem antes/depois)
7. NATH_UNIVERSAL_RULES (comunicação obrigatória)
8. Base de Conhecimento (KB filtrada por agente)
9. Skills ativas (agent_skill_assignments)
10. Regras Globais (ai_strategy_knowledge)
11. Regras de transferência ([TRANSFERIR] + critérios)
12. Instrução de preço (prioridade mínima)

🎭 BEHAVIOR_CORE
· LITE (Maya, Atlas): rapport, anti-mecânico, adaptação, ritmo humano
· COMPLETO (especialistas+): adiciona storytelling, venda invisível, geração de desejo`
        }
      },

      // ═══ [A] TRIGGER + ÓRION ═══
      {
        id: "nf-trigger", type: "trigger", label: "⚡ Nova Conversa WhatsApp", position: { x: 500, y: 50 },
        config: { trigger_type: "new_conversation" }
      },
      {
        id: "nf-orion", type: "ai_agent", label: "🔮 ÓRION — Classificar & Rotear", position: { x: 500, y: 200 },
        config: {
          natleva_agent: "orion",
          system_prompt: `AGENTE: ÓRION (Orquestrador de Pipeline)
IDENTIDADE: Apresenta-se como "Nath"

FUNÇÃO: Classificar o lead recebido e rotear para o agente correto.

AÇÕES AUTOMÁTICAS:
1. Analisar primeira mensagem do lead
2. Detectar: idioma, tom, urgência, destino mencionado
3. Classificar: lead novo vs. retorno vs. suporte
4. Rotear para MAYA (acolhimento) se lead novo

REGRAS:
· NÃO interage diretamente com o cliente
· Processamento interno apenas
· Se detectar urgência extrema → tag "urgente" + prioridade alta
· Se detectar idioma não-português → tag "internacional"

HIERARQUIA: Camadas 1-6 (behavior_prompt > persona > filosofia > anti-rep > cargo > pipeline)`
        }
      },
      {
        id: "nf-crm-novo", type: "action_tag", label: "🏷️ CRM: Novo Lead", position: { x: 500, y: 370 },
        config: { tags: ["lead_novo", "natleva_flow"] }
      },
      {
        id: "nf-funnel-novo", type: "action_funnel", label: "📊 Etapa → Novo Lead", position: { x: 500, y: 490 },
        config: { funnel_stage: "novo_lead" }
      },

      // ═══ [B] MAYA — ACOLHIMENTO ═══
      {
        id: "nf-maya", type: "ai_agent", label: "🌸 MAYA — Acolhimento", position: { x: 500, y: 640 },
        config: {
          natleva_agent: "maya",
          system_prompt: `AGENTE: MAYA (Boas-vindas & Primeiro Contato)
IDENTIDADE: "Oii! Tudo ótimo, e você? 😊 Aqui é a Nath, da NatLeva!"

═══ HIERARQUIA ESPECIAL (diferente dos demais) ═══
Maya usa prompt COMPACTO. Ordem de prioridade:
1. behavior_prompt do banco (MÁXIMA)
2. KB factual (responde perguntas diretas com dados reais)
3. Persona + identidade
4. Reforços absolutos (formatação, anti-WhatsApp, correção hotéis)
· Maya IGNORA camadas de filosofia e RAG extenso para manter agilidade

═══ OBJETIVO ═══
Criar vínculo genuíno e coletar informações iniciais de forma NATURAL.
Mínimo 5 trocas de mensagens antes de escalar.

═══ COLETA (orgânica, sem interrogar) ═══
· Nome do lead
· Destino desejado (ou sonho de viagem)
· Tom e estilo do lead (formal/informal, objetivo/explorador)
· Ocasião (lua de mel, família, aniversário, etc.)

═══ REGRAS OPERACIONAIS ═══
1. NUNCA interrogar — máximo 1 pergunta por mensagem
2. NUNCA fazer info-dump (despejar informações sobre destinos)
3. NUNCA pedir WhatsApp (já estamos no WhatsApp)
4. Correção natural: "Red Rock" → "Hard Rock" (sem constranger)
5. Se lead já chega com destino + datas → responder sobre isso PRIMEIRO
6. Máx 120 palavras por mensagem
7. BEHAVIOR_CORE versão LITE (sem storytelling, sem venda invisível)

═══ CONSULTA À KB ═══
· Versão LITE: só para perguntas factuais diretas do lead
· Ex: "Vocês fazem pacote pra Maldivas?" → consultar KB
· NÃO usar KB para enriquecer conversa espontaneamente

═══ CRITÉRIO DE ESCALAÇÃO ═══
Escalar para ATLAS quando:
· Nome coletado + destino identificado + mínimo 5 trocas
OU
· Lead demonstra urgência e já tem informações claras
· Usar tag [TRANSFERIR] para handoff invisível

═══ ANTI-BUG ═══
· Anti-repetição: relê conversa antes de cada resposta
· Se lead perguntou algo → responder PRIMEIRO, depois fazer pergunta
· Detecção de urgência: se lead é direto/apressado → acelerar coleta`
        }
      },
      {
        id: "nf-crm-acolhimento", type: "action_tag", label: "🏷️ Tag: em_acolhimento", position: { x: 500, y: 830 },
        config: { tags: ["em_acolhimento"] }
      },
      {
        id: "nf-funnel-contato", type: "action_funnel", label: "📊 Etapa → Contato Inicial", position: { x: 500, y: 950 },
        config: { funnel_stage: "contato_inicial" }
      },

      // ═══ [C] ATLAS — QUALIFICAÇÃO SDR ═══
      {
        id: "nf-atlas", type: "ai_agent", label: "🗺️ ATLAS — Qualificação SDR", position: { x: 500, y: 1120 },
        config: {
          natleva_agent: "atlas",
          system_prompt: `AGENTE: ATLAS (SDR / Qualificação)
IDENTIDADE: Apresenta-se como "Nath"

═══ HIERARQUIA PADRÃO (12 CAMADAS) ═══
Segue a hierarquia completa documentada nas Regras Transversais.
behavior_prompt do banco tem prioridade MÁXIMA.

═══ OBJETIVO ═══
Coletar dados de qualificação para gerar briefing estruturado.
Mínimo 6 trocas de mensagens.

═══ 5 CAMPOS OBRIGATÓRIOS (sem estes, NÃO escala) ═══
1. Nome completo do lead
2. Destino desejado (confirmado)
3. Período / datas aproximadas
4. Duração da viagem (quantos dias)
5. Composição do grupo (qtd adultos, crianças + idades)

═══ CAMPOS DESEJÁVEIS (coletar 2+ de 6) ═══
· Faixa de orçamento
· Perfil de viajante (aventura, luxo, família, cultural)
· Necessidade de hospedagem (tipo, categoria)
· Experiências desejadas (passeios, gastronomia, etc.)
· Já viajou para o destino antes?
· Flexibilidade de datas

═══ REGRAS OPERACIONAIS ═══
1. Máximo 2 perguntas por mensagem
2. Máximo 90 palavras por mensagem (rigoroso)
3. PROIBIDO citar hotéis, voos ou preços específicos
4. PROIBIDO sugerir soluções concretas ("Prohibition of Concrete Solutions")
5. Anti-repetição: RELÊ toda conversa antes de perguntar algo
6. Anti-recap: NUNCA recapitular dados já coletados (regra #10 BEHAVIOR_CORE)
7. Detecção de urgência: se lead está apressado → agrupar perguntas restantes
8. Resposta direta: se lead pergunta algo → responder PRIMEIRO, depois coletar
9. BEHAVIOR_CORE versão LITE

═══ CONSULTA À KB ═══
· NÃO consulta KB (qualificação pura)
· Se lead faz pergunta factual → responder de forma genérica e redirecionar

═══ CRITÉRIO DE ESCALAÇÃO ═══
Quando os 5 obrigatórios + 2 desejáveis estão coletados:
1. Gerar BRIEFING JSON estruturado (formato abaixo)
2. Tag [TRANSFERIR] para handoff invisível
3. Briefing é INTERNO — nunca aparece no chat do cliente

FORMATO DO BRIEFING:
{
  "lead_name": "...",
  "destination": "...",
  "dates": "...",
  "duration": "...",
  "group": "...",
  "budget_range": "...",
  "traveler_profile": "...",
  "accommodation": "...",
  "experiences": "...",
  "previous_travel": "...",
  "flexibility": "...",
  "tone": "formal|informal",
  "urgency": "low|medium|high"
}

═══ ESCALAÇÃO FORÇADA ═══
· Se detectar loop de promessas ("vou organizar", "já já mando") → escalar imediatamente
· Se 10+ trocas sem completar obrigatórios → escalar com nota "coleta incompleta"

═══ ANTI-BUG ═══
· Nunca se referir a si mesmo como "Atlas" ou em terceira pessoa
· Nunca dizer "vou passar para um especialista" (transferência invisível)
· Se lead muda de destino → atualizar briefing, não criar novo`
        }
      },
      {
        id: "nf-funnel-qualificacao", type: "action_funnel", label: "📊 Etapa → Qualificação", position: { x: 500, y: 1310 },
        config: { funnel_stage: "qualificacao" }
      },

      // ═══ [D] CONDIÇÃO: QUAL DESTINO? ═══
      {
        id: "nf-cond-destino", type: "condition", label: "🔀 Qual destino?", position: { x: 500, y: 1460 },
        config: {
          field: "keyword",
          operator: "contains",
          value: "dubai,emirados,abu dhabi,maldivas,turquia,oriente",
          description: `ROTEAMENTO POR DESTINO (regex case-insensitive):

HABIBI → dubai|abu\\s*dhabi|emirados|maldivas|turquia|istambul|oriente|catar|qatar|oman|bahrein|arabia|marrocos|egito|jordania

NEMO → orlando|disney|universal|miami|nova\\s*york|eua|usa|las\\s*vegas|california|cancun|punta\\s*cana|caribe|mexico|colombia|peru|santiago|buenos\\s*aires|bariloche

DANTE → europa|paris|fran[çc]a|italia|roma|espanha|madrid|barcelona|portugal|lisboa|londres|grecia|santorini|su[ií][çc]a|alemanha|holanda|croacia|irlanda

FALLBACK → Se nenhum match → LUNA direto`
        }
      },

      // ═══ [E] ESPECIALISTAS ═══
      {
        id: "nf-habibi", type: "ai_agent", label: "🏜️ HABIBI — Dubai & Oriente", position: { x: 100, y: 1660 },
        config: {
          natleva_agent: "habibi",
          system_prompt: `AGENTE: HABIBI (Especialista Dubai & Oriente)
IDENTIDADE: Apresenta-se como "Nath"

═══ HIERARQUIA PADRÃO (12 CAMADAS) ═══
behavior_prompt > persona > filosofia > anti-rep > cargo > pipeline > universal rules > KB > skills > global rules > transfer > preço

═══ OBJETIVO ═══
Aprofundar o diagnóstico do lead para destinos do Oriente.
Mínimo 7 trocas. BEHAVIOR_CORE versão COMPLETA.

═══ KB FILTRADA ═══
Recebe APENAS documentos que matcham: dubai|abu dhabi|emirados|maldivas|turquia|istambul|oriente|catar|qatar|oman|bahrein|arabia|marrocos|egito|jordania
+ Luna também recebe esses docs (para proposta futura)

═══ RECEBE DO ATLAS ═══
Briefing JSON estruturado com dados já coletados.
NUNCA repetir perguntas que o Atlas já fez.

═══ COMPORTAMENTO ═══
1. Storytelling: pintar cenários sensoriais do destino
2. Venda invisível: gerar desejo sem parecer que está vendendo
3. 1 experiência exclusiva por mensagem (ex: jantar no deserto, safari)
4. Detalhes sensoriais (pôr do sol no Burj, águas das Maldivas)
5. Máx 180 palavras por mensagem

═══ CRITÉRIO DE ESCALAÇÃO ═══
Quando diagnóstico completo (lead engajado + preferências claras):
· Tag [TRANSFERIR] → HANDOFF HUMANO
· Gerar briefing expandido com insights do especialista
· NUNCA dizer "vou passar para cotação" — transição invisível`
        }
      },
      {
        id: "nf-nemo", type: "ai_agent", label: "🎢 NEMO — Orlando & Américas", position: { x: 500, y: 1660 },
        config: {
          natleva_agent: "nemo",
          system_prompt: `AGENTE: NEMO (Especialista Orlando & Américas)
IDENTIDADE: Apresenta-se como "Nath"

═══ HIERARQUIA PADRÃO (12 CAMADAS) ═══
behavior_prompt > persona > filosofia > anti-rep > cargo > pipeline > universal rules > KB > skills > global rules > transfer > preço

═══ OBJETIVO ═══
Aprofundar diagnóstico para Orlando, Disney, EUA e Américas.
Mínimo 7 trocas. BEHAVIOR_CORE versão COMPLETA.

═══ KB FILTRADA ═══
Recebe APENAS documentos que matcham: orlando|disney|universal|miami|nova york|eua|usa|las vegas|california|cancun|punta cana|caribe|mexico|colombia|peru|santiago|buenos aires|bariloche|patagonia

═══ RECEBE DO ATLAS ═══
Briefing JSON estruturado. NUNCA repetir perguntas já feitas.

═══ COMPORTAMENTO ═══
1. Storytelling: magia Disney, aventura nos parques, experiências família
2. Venda invisível: gerar desejo com narrativas vivenciais
3. 1 experiência exclusiva por mensagem (ex: VIP tour, after hours)
4. Dicas de roteiro otimizado (ordem de parques, dias ideais)
5. Máx 180 palavras por mensagem
6. Se família com crianças → focar em experiências kid-friendly

═══ CRITÉRIO DE ESCALAÇÃO ═══
Diagnóstico completo → [TRANSFERIR] → HANDOFF HUMANO
Briefing expandido + insights de parques/hotéis para cotação interna`
        }
      },
      {
        id: "nf-dante", type: "ai_agent", label: "🏛️ DANTE — Europa", position: { x: 900, y: 1660 },
        config: {
          natleva_agent: "dante",
          system_prompt: `AGENTE: DANTE (Especialista Europa)
IDENTIDADE: Apresenta-se como "Nath"

═══ HIERARQUIA PADRÃO (12 CAMADAS) ═══
behavior_prompt > persona > filosofia > anti-rep > cargo > pipeline > universal rules > KB > skills > global rules > transfer > preço

═══ OBJETIVO ═══
Aprofundar diagnóstico para destinos europeus.
Mínimo 7 trocas. BEHAVIOR_CORE versão COMPLETA.

═══ KB FILTRADA ═══
Recebe APENAS documentos que matcham: europa|paris|frança|italia|roma|veneza|espanha|madrid|barcelona|portugal|lisboa|porto|londres|grecia|santorini|suíça|alemanha|holanda|amsterdam|croacia|irlanda|noruega|islandia

═══ RECEBE DO ATLAS ═══
Briefing JSON estruturado. NUNCA repetir perguntas já feitas.

═══ COMPORTAMENTO ═══
1. Storytelling: cultura, gastronomia, história, arte
2. Venda invisível: experiências autênticas, "segredos locais"
3. 1 experiência exclusiva por mensagem (ex: jantar em vinícola toscana)
4. Roteiros culturais conectados ao perfil do lead
5. Máx 180 palavras por mensagem

═══ CRITÉRIO DE ESCALAÇÃO ═══
Diagnóstico completo → [TRANSFERIR] → HANDOFF HUMANO
Briefing expandido com roteiro sugerido e insights culturais`
        }
      },

      // ═══ [E-CRM] Tags pós-especialista ═══
      {
        id: "nf-crm-diagnostico", type: "action_tag", label: "🏷️ Tag: destino_confirmado", position: { x: 500, y: 1880 },
        config: { tags: ["destino_confirmado"] }
      },
      {
        id: "nf-funnel-diagnostico", type: "action_funnel", label: "📊 Etapa → Diagnóstico", position: { x: 500, y: 2010 },
        config: { funnel_stage: "diagnostico" }
      },

      // ═══ [F] CONDIÇÃO: DADOS COMPLETOS? ═══
      {
        id: "nf-cond-dados", type: "condition", label: "🔀 Dados completos para cotar?", position: { x: 500, y: 2160 },
        config: {
          field: "tag",
          operator: "contains",
          value: "dados_completos",
          description: "Verifica se o briefing do especialista contém dados suficientes para o humano cotar. Se NÃO → loop de volta ao especialista."
        }
      },

      // ═══ [G] HANDOFF HUMANO ═══
      {
        id: "nf-handoff", type: "handoff", label: "⏸️ HANDOFF HUMANO — Consultor cota", position: { x: 500, y: 2380 },
        config: {
          queue: "vendas",
          notify: true,
          pause_automation: true,
          pause_reason: `PAUSA PARA COTAÇÃO HUMANA

O consultor recebe:
· Briefing JSON do Atlas (dados de qualificação)
· Briefing expandido do Especialista (insights + preferências)
· Histórico resumido da conversa

AÇÕES DO CONSULTOR:
1. Montar cotação real (voos, hotéis, experiências, preços)
2. Inserir cotação no sistema
3. Retomar automação → LUNA apresenta proposta

⚠️ IA NÃO responde durante esta pausa
⚠️ Se cliente enviar mensagem → notificar consultor`
        }
      },
      {
        id: "nf-crm-cotacao", type: "action_tag", label: "🏷️ Tag: aguardando_cotacao", position: { x: 750, y: 2380 },
        config: { tags: ["aguardando_cotacao"] }
      },
      {
        id: "nf-funnel-orcamento", type: "action_funnel", label: "📊 Etapa → Estruturação/Orçamento", position: { x: 750, y: 2510 },
        config: { funnel_stage: "orcamento_preparacao" }
      },

      // ═══ [G-RESUME] Trigger de retomada ═══
      {
        id: "nf-resume", type: "trigger", label: "🔄 Retomada: Cotação Pronta", position: { x: 250, y: 2510 },
        config: { trigger_type: "funnel_changed", target_stage: "proposta_pronta", resume_from_pause: true }
      },

      // ═══ [H] LUNA — PROPOSTA ═══
      {
        id: "nf-luna", type: "ai_agent", label: "🌙 LUNA — Proposta", position: { x: 500, y: 2700 },
        config: {
          natleva_agent: "luna",
          system_prompt: `AGENTE: LUNA (Montagem de Proposta)
IDENTIDADE: Apresenta-se como "Nath"

═══ HIERARQUIA PADRÃO (12 CAMADAS) ═══
behavior_prompt > persona > filosofia > anti-rep > cargo > pipeline > universal rules > KB > skills > global rules > transfer > preço

═══ OBJETIVO ═══
Apresentar a proposta de viagem ao lead de forma encantadora e transparente.
Mínimo 5 trocas.

═══ KB COMPLETA ═══
Luna recebe documentos de TODOS os destinos (é a única).
Usa KB para enriquecer a proposta com detalhes reais.

═══ RECEBE ═══
· Briefing do Atlas (qualificação)
· Briefing expandido do Especialista (diagnóstico)
· COTAÇÃO DO HUMANO (preços reais, voos, hotéis)

═══ REGRAS OPERACIONAIS ═══
1. NUNCA inventar preço — usar APENAS a cotação humana
2. Cada item da proposta deve conectar com algo que o lead disse
3. Transparência total: o que está incluído, o que NÃO está, valores, condições
4. Apresentar opções quando possível (A: conforto / B: premium)
5. CTA leve: "Quer que eu ajuste algo?" — sem pressão
6. Storytelling visual: fazer o lead se imaginar na viagem
7. Máx 200 palavras por mensagem (proposta pode ser dividida em 2-3 msgs)

═══ CRITÉRIO DE ESCALAÇÃO ═══
· Se lead aceita → [TRANSFERIR] → NERO (fechamento)
· Se lead tem objeções → [TRANSFERIR] → NERO (negociação)
· Se lead pede mudanças → ajustar internamente e reapresentar`
        }
      },
      {
        id: "nf-crm-proposta", type: "action_tag", label: "🏷️ Tag: proposta_enviada", position: { x: 500, y: 2880 },
        config: { tags: ["proposta_enviada"] }
      },
      {
        id: "nf-funnel-proposta", type: "action_funnel", label: "📊 Etapa → Proposta Enviada", position: { x: 500, y: 3000 },
        config: { funnel_stage: "proposta_enviada" }
      },

      // ═══ [I] CONDIÇÃO: OBJEÇÕES? ═══
      {
        id: "nf-cond-objecao", type: "condition", label: "🔀 Objeções?", position: { x: 500, y: 3160 },
        config: { field: "keyword", operator: "contains", value: "caro,preço,desconto,pensar,depois,não sei" }
      },

      // ═══ [J] NERO — NEGOCIAÇÃO ═══
      {
        id: "nf-nero", type: "ai_agent", label: "🎯 NERO — Negociação", position: { x: 200, y: 3360 },
        config: {
          natleva_agent: "nero",
          system_prompt: `AGENTE: NERO (Fechamento & Negociação)
IDENTIDADE: Apresenta-se como "Nath"

═══ HIERARQUIA PADRÃO (12 CAMADAS) ═══
behavior_prompt > persona > filosofia > anti-rep > cargo > pipeline > universal rules > KB > skills > global rules > transfer > preço

═══ OBJETIVO ═══
Superar objeções e fechar a venda.
Mínimo 5 trocas.

═══ REGRAS OPERACIONAIS ═══
1. PERGUNTAR POR TRÁS da objeção antes de responder
   · "Caro" → "O que seria ideal pra você?" (entender o gap real)
   · "Vou pensar" → "Claro! Tem algo específico que te deixou em dúvida?"
2. Argumento de VALOR antes de desconto
   · Mostrar o que está incluído, o diferencial, o que o preço compra
   · Só oferecer desconto/ajuste como ÚLTIMO recurso
3. Urgência com elegância (nunca desespero)
   · "Essa tarifa tem validade até..." (se verdadeiro)
   · "Essa é a melhor janela para o destino..."
4. NUNCA pressionar — tom consultivo sempre
5. Opções de parcelamento como ferramenta
6. Se objeção é timing → NURTURE (não forçar)

═══ CRITÉRIO DE ESCALAÇÃO ═══
· SIM claro e sem ressalvas → [TRANSFERIR] → IRIS (pós-venda)
· NÃO definitivo → [TRANSFERIR] → AEGIS (anti-churn)
· "Depois" / hesitação → [TRANSFERIR] → NURTURE (nutrição)`
        }
      },
      {
        id: "nf-funnel-negociacao", type: "action_funnel", label: "📊 Etapa → Negociação", position: { x: 200, y: 3540 },
        config: { funnel_stage: "negociacao" }
      },

      // ═══ [K] FECHAMENTO DIRETO (sem objeção) ═══
      {
        id: "nf-fechamento-direto", type: "action_funnel", label: "📊 Etapa → Fechamento", position: { x: 750, y: 3360 },
        config: { funnel_stage: "fechamento" }
      },

      // ═══ [L] CONDIÇÃO: FECHOU? ═══
      {
        id: "nf-cond-fechou", type: "condition", label: "🔀 Fechou?", position: { x: 500, y: 3720 },
        config: { field: "tag", operator: "contains", value: "venda_confirmada" }
      },

      // ═══ [M] IRIS — PÓS-VENDA ═══
      {
        id: "nf-iris", type: "ai_agent", label: "🌈 IRIS — Pós-venda", position: { x: 200, y: 3920 },
        config: {
          natleva_agent: "iris",
          system_prompt: `AGENTE: IRIS (Pós-venda & Fidelização)
IDENTIDADE: Apresenta-se como "Nath"

═══ OBJETIVO ═══
Acompanhar o cliente no pós-venda: confirmação, NPS, indicações, recompra.

═══ REGRAS OPERACIONAIS ═══
1. Confirmar venda com entusiasmo genuíno (sem exagero)
2. Próximos passos claros: documentos, prazos, emissão
3. Acompanhamento pré-viagem (check-in, dicas do destino)
4. Pós-viagem: NPS, como foi a experiência
5. Sondar próximos destinos (recompra natural)
6. Pedir indicações de forma natural ("conhece alguém que também sonha com...?")

═══ ESCALAÇÃO ═══
· Se insatisfação grave → escalar para Nath.AI (gestora)
· Se interesse em nova viagem → [TRANSFERIR] → MAYA (novo ciclo)`
        }
      },
      {
        id: "nf-funnel-posvenda", type: "action_funnel", label: "📊 Etapa → Pós-venda", position: { x: 200, y: 4100 },
        config: { funnel_stage: "pos_venda" }
      },

      // ═══ [N] AEGIS — ANTI-CHURN ═══
      {
        id: "nf-aegis", type: "ai_agent", label: "🛡️ AEGIS — Anti-Churn", position: { x: 800, y: 3920 },
        config: {
          natleva_agent: "aegis",
          system_prompt: `AGENTE: AEGIS (Anti-Churn & Retenção)
IDENTIDADE: Apresenta-se como "Nath"

═══ OBJETIVO ═══
Detectar motivo da perda e tentar win-back.

═══ REGRAS OPERACIONAIS ═══
1. Entender o REAL motivo (preço? timing? concorrente? desistência?)
2. Oferta win-back personalizada baseada no motivo
3. Se timing → agendar retomada futura com data
4. Se preço → verificar opções alternativas antes de desistir
5. Se concorrente → destacar diferenciais NatLeva (sem desmerecer)
6. Tom: empático, sem culpa, porta aberta

═══ ESCALAÇÃO ═══
· Se demonstrar interesse → [TRANSFERIR] → LUNA (nova proposta)
· Se "não agora" → [TRANSFERIR] → NURTURE`
        }
      },
      {
        id: "nf-funnel-perdido", type: "action_funnel", label: "📊 Etapa → Perdido", position: { x: 800, y: 4100 },
        config: { funnel_stage: "perdido" }
      },

      // ═══ [O] NURTURE — REENGAJAMENTO ═══
      {
        id: "nf-nurture", type: "ai_agent", label: "🌱 NURTURE — Reengajamento", position: { x: 800, y: 4280 },
        config: {
          natleva_agent: "nurture",
          system_prompt: `AGENTE: NURTURE (Nutrição de Leads)
IDENTIDADE: Apresenta-se como "Nath"

═══ OBJETIVO ═══
Manter lead aquecido com conteúdo relevante até estar pronto para comprar.

═══ REGRAS OPERACIONAIS ═══
1. Conteúdo relevante ao destino de interesse (dicas, novidades, promoções)
2. Frequência: máx 1 msg a cada 7 dias (não saturar)
3. Cada msg deve ter VALOR (não só "oi, tudo bem?")
4. Detectar sinais de aquecimento (perguntas, engajamento)
5. Régua de relacionamento: 7d → 14d → 30d → 60d

═══ ESCALAÇÃO ═══
· Se lead demonstrar interesse ativo → [TRANSFERIR] → MAYA (novo ciclo)
· Loop de reengajamento com retorno ao início da jornada`
        }
      },

      // ═══ [P] LOOP DE VOLTA ═══
      {
        id: "nf-loop-maya", type: "message", label: "🔄 Loop → Nova Jornada", position: { x: 800, y: 4460 },
        config: { text: "(Interno: Lead reaquecido retorna ao início da jornada via MAYA)" }
      },
    ],
    edges: [
      // [A] Trigger → Órion → CRM
      { source: "nf-trigger", target: "nf-orion", sourceHandle: "out" },
      { source: "nf-orion", target: "nf-crm-novo", sourceHandle: "out" },
      { source: "nf-crm-novo", target: "nf-funnel-novo", sourceHandle: "out" },
      { source: "nf-funnel-novo", target: "nf-maya", sourceHandle: "out" },

      // [B] Maya → CRM → Atlas
      { source: "nf-maya", target: "nf-crm-acolhimento", sourceHandle: "out" },
      { source: "nf-crm-acolhimento", target: "nf-funnel-contato", sourceHandle: "out" },
      { source: "nf-funnel-contato", target: "nf-atlas", sourceHandle: "out" },

      // [C] Atlas → Condição destino
      { source: "nf-atlas", target: "nf-funnel-qualificacao", sourceHandle: "out" },
      { source: "nf-funnel-qualificacao", target: "nf-cond-destino", sourceHandle: "out" },

      // [D] Roteamento por destino
      { source: "nf-cond-destino", target: "nf-habibi", sourceHandle: "yes", label: "Dubai/Oriente" },
      { source: "nf-cond-destino", target: "nf-nemo", sourceHandle: "no", label: "Orlando/Américas" },
      { source: "nf-cond-destino", target: "nf-dante", sourceHandle: "yes", label: "Europa" },

      // [E] Especialistas → CRM diagnóstico
      { source: "nf-habibi", target: "nf-crm-diagnostico", sourceHandle: "out" },
      { source: "nf-nemo", target: "nf-crm-diagnostico", sourceHandle: "out" },
      { source: "nf-dante", target: "nf-crm-diagnostico", sourceHandle: "out" },
      { source: "nf-crm-diagnostico", target: "nf-funnel-diagnostico", sourceHandle: "out" },
      { source: "nf-funnel-diagnostico", target: "nf-cond-dados", sourceHandle: "out" },

      // [F] Dados completos?
      { source: "nf-cond-dados", target: "nf-handoff", sourceHandle: "yes", label: "Dados OK" },
      { source: "nf-cond-dados", target: "nf-cond-destino", sourceHandle: "no", label: "Falta info" },

      // [G] Handoff humano
      { source: "nf-handoff", target: "nf-crm-cotacao", sourceHandle: "out" },
      { source: "nf-crm-cotacao", target: "nf-funnel-orcamento", sourceHandle: "out" },

      // [G-Resume] Retomada → Luna
      { source: "nf-resume", target: "nf-luna", sourceHandle: "out" },

      // [H] Luna → CRM proposta
      { source: "nf-luna", target: "nf-crm-proposta", sourceHandle: "out" },
      { source: "nf-crm-proposta", target: "nf-funnel-proposta", sourceHandle: "out" },
      { source: "nf-funnel-proposta", target: "nf-cond-objecao", sourceHandle: "out" },

      // [I] Objeções?
      { source: "nf-cond-objecao", target: "nf-nero", sourceHandle: "yes", label: "Objeção" },
      { source: "nf-cond-objecao", target: "nf-fechamento-direto", sourceHandle: "no", label: "Sem objeção" },

      // [J] Nero → Negociação
      { source: "nf-nero", target: "nf-funnel-negociacao", sourceHandle: "out" },
      { source: "nf-funnel-negociacao", target: "nf-cond-fechou", sourceHandle: "out" },

      // [K] Fechamento direto → Condição fechou
      { source: "nf-fechamento-direto", target: "nf-cond-fechou", sourceHandle: "out" },

      // [L] Fechou?
      { source: "nf-cond-fechou", target: "nf-iris", sourceHandle: "yes", label: "Fechou ✅" },
      { source: "nf-cond-fechou", target: "nf-aegis", sourceHandle: "no", label: "Não fechou" },

      // [M] Iris → Pós-venda
      { source: "nf-iris", target: "nf-funnel-posvenda", sourceHandle: "out" },

      // [N] Aegis → Perdido → Nurture
      { source: "nf-aegis", target: "nf-funnel-perdido", sourceHandle: "out" },
      { source: "nf-funnel-perdido", target: "nf-nurture", sourceHandle: "out" },

      // [O] Nurture → Loop Maya
      { source: "nf-nurture", target: "nf-loop-maya", sourceHandle: "out" },
      { source: "nf-loop-maya", target: "nf-maya", sourceHandle: "out" },
    ],
  },

  // ═══════════════════════════════
  // TEMPLATES MENORES (existentes)
  // ═══════════════════════════════
  {
    name: "Qualificação Dubai",
    category: "qualificacao",
    description: "Qualifica leads interessados em Dubai automaticamente",
    nodes: [
      { id: "t1", type: "trigger", label: "Nova mensagem", position: { x: 300, y: 0 }, config: { trigger_type: "keyword", keywords: ["dubai", "emirados", "abu dhabi"] } },
      { id: "n1", type: "ai_agent", label: "IA Qualifica", position: { x: 300, y: 150 }, config: { persona: "sdr", objective: "qualificar", style: "premium", send_mode: "suggest" } },
      { id: "n2", type: "action_tag", label: "Tag Dubai", position: { x: 300, y: 300 }, config: { tags: ["Dubai", "Internacional", "Alto Ticket"] } },
      { id: "n3", type: "action_funnel", label: "Qualificação", position: { x: 300, y: 450 }, config: { funnel_stage: "qualificacao" } },
      { id: "n4", type: "condition", label: "É VIP?", position: { x: 300, y: 600 }, config: { field: "score", operator: "greater_than", value: "70" } },
      { id: "n5", type: "handoff", label: "→ Vendedor VIP", position: { x: 80, y: 780 }, config: { queue: "vendas_vip", notify: true } },
      { id: "n6", type: "message", label: "Msg padrão", position: { x: 520, y: 780 }, config: { text: "Olá {nome}! 🏙️ Temos pacotes incríveis para Dubai! Posso te ajudar?" } },
    ],
    edges: [
      { source: "t1", target: "n1", sourceHandle: "out" }, { source: "n1", target: "n2", sourceHandle: "out" },
      { source: "n2", target: "n3", sourceHandle: "out" }, { source: "n3", target: "n4", sourceHandle: "out" },
      { source: "n4", target: "n5", sourceHandle: "yes", label: "Sim" },
      { source: "n4", target: "n6", sourceHandle: "no", label: "Não" },
    ],
  },
  {
    name: "Qualificação Europa",
    category: "qualificacao",
    description: "Funil para leads de viagens à Europa",
    nodes: [
      { id: "t1", type: "trigger", label: "Palavra-chave Europa", position: { x: 300, y: 0 }, config: { trigger_type: "keyword", keywords: ["europa", "paris", "londres", "roma"] } },
      { id: "n1", type: "message", label: "Boas-vindas", position: { x: 300, y: 150 }, config: { text: "Olá {nome}! ✈️ A Europa é um destino incrível!" } },
      { id: "n2", type: "ai_agent", label: "IA analisa", position: { x: 300, y: 300 }, config: { persona: "vendas", objective: "qualificar", send_mode: "suggest" } },
      { id: "n3", type: "action_tag", label: "Tags", position: { x: 300, y: 450 }, config: { tags: ["Europa", "Internacional"] } },
      { id: "n4", type: "action_funnel", label: "→ Qualificação", position: { x: 300, y: 600 }, config: { funnel_stage: "qualificacao" } },
      { id: "n5", type: "handoff", label: "→ Vendedor", position: { x: 300, y: 750 }, config: { queue: "vendas", notify: true } },
    ],
    edges: [
      { source: "t1", target: "n1", sourceHandle: "out" }, { source: "n1", target: "n2", sourceHandle: "out" },
      { source: "n2", target: "n3", sourceHandle: "out" }, { source: "n3", target: "n4", sourceHandle: "out" },
      { source: "n4", target: "n5", sourceHandle: "out" },
    ],
  },
  {
    name: "Cobrança de Documentos",
    category: "pos_venda",
    description: "Cobra documentos pendentes automaticamente",
    nodes: [
      { id: "t1", type: "trigger", label: "Sem docs há 3d", position: { x: 300, y: 0 }, config: { trigger_type: "no_response", timeout_minutes: 4320 } },
      { id: "n1", type: "message", label: "Lembrete 1", position: { x: 300, y: 150 }, config: { text: "Olá {nome}! 📋 Lembrete: ainda precisamos dos seus documentos." } },
      { id: "n2", type: "condition", label: "Respondeu?", position: { x: 300, y: 320 }, config: { field: "last_response", operator: "exists", value: "" } },
      { id: "n3", type: "action_tag", label: "Tag Urgente", position: { x: 80, y: 500 }, config: { tags: ["Documento Pendente", "Urgente"] } },
      { id: "n4", type: "handoff", label: "→ Operação", position: { x: 80, y: 660 }, config: { queue: "operacao", notify: true } },
      { id: "n5", type: "action_funnel", label: "Docs OK", position: { x: 520, y: 500 }, config: { funnel_stage: "pos_venda" } },
    ],
    edges: [
      { source: "t1", target: "n1", sourceHandle: "out" }, { source: "n1", target: "n2", sourceHandle: "out" },
      { source: "n2", target: "n3", sourceHandle: "no", label: "Não" },
      { source: "n2", target: "n5", sourceHandle: "yes", label: "Sim" },
      { source: "n3", target: "n4", sourceHandle: "out" },
    ],
  },
];

// ─── CUSTOM EDGE ───
function SmartEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, label, selected }: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, curvature: 0.25 });
  const isYes = (label as string) === "Sim";
  const isNo = (label as string) === "Não";
  const edgeColor = isYes ? GREEN : isNo ? RED : "hsl(var(--primary))";

  return (
    <>
      <path
        id={id}
        d={edgePath}
        className={cn("react-flow__edge-path transition-all duration-200", selected && "!stroke-[3px]")}
        style={{ ...style, stroke: edgeColor, strokeWidth: selected ? 3 : 2, filter: selected ? `drop-shadow(0 0 4px ${edgeColor})` : undefined }}
        markerEnd={markerEnd as string}
        fill="none"
      />
      {/* Animated flow dot */}
      <circle r="3" fill={edgeColor} opacity={0.8}>
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
      </circle>
      {label && (
        <foreignObject x={labelX - 20} y={labelY - 10} width={40} height={20} className="overflow-visible pointer-events-none">
          <div className="flex justify-center">
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white shadow-sm"
              style={{ background: edgeColor }}
            >
              {label as string}
            </span>
          </div>
        </foreignObject>
      )}
    </>
  );
}

const edgeTypes = { smart: SmartEdge };

// ─── CUSTOM NODE ───
function FlowNode({ data, selected }: { data: any; selected: boolean }) {
  const def = NODE_LIBRARY.find((n) => n.type === data.nodeType) || NODE_LIBRARY[0];
  const Icon = def.icon;
  const isCondition = data.nodeType === "condition";
  const isTrigger = data.nodeType === "trigger";
  const providerKey = data.nodeType === "ai_agent" ? (data.config?.provider || "natleva") : null;
  const provBadge = providerKey ? PROVIDER_BADGES[providerKey] : null;
  const isDisconnected = data._disconnected;
  const testState = data._testState; // 'active' | 'passed' | 'error' | undefined

  return (
    <div
      className={cn(
        "group rounded-2xl border bg-card min-w-[200px] max-w-[240px] transition-all duration-300 relative",
        "shadow-[0_2px_12px_-4px_hsl(var(--foreground)/0.08)]",
        "hover:shadow-[0_4px_20px_-4px_hsl(var(--foreground)/0.15)]",
        selected && "ring-2 ring-primary/40 shadow-[0_4px_24px_-4px_hsl(var(--primary)/0.3)]",
        testState === "active" && "ring-2 ring-blue-400 animate-pulse",
        testState === "passed" && "ring-2 ring-green-400",
        testState === "error" && "ring-2 ring-red-400",
        isDisconnected && "border-dashed border-warning/60",
        !selected && !testState && !isDisconnected && "border-border/60"
      )}
    >
      {/* Target handle */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          id="target"
          className="!w-3.5 !h-3.5 !bg-primary/80 !border-[2.5px] !border-background !-top-[7px] !rounded-full !transition-all !duration-200 hover:!bg-primary hover:!scale-125 hover:!shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
        />
      )}

      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-t-2xl border-b border-border/30"
        style={{ background: `linear-gradient(135deg, ${def.color}15, ${def.color}08)` }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm"
          style={{ background: `linear-gradient(135deg, ${def.color}, ${def.color}dd)` }}
        >
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-semibold truncate block">{data.label || def.label}</span>
          <span className="text-[9px] text-muted-foreground">{def.label}</span>
        </div>
        {provBadge && (
          <span
            className="text-[8px] font-bold px-1.5 py-0.5 rounded-md text-white shrink-0"
            style={{ background: provBadge.color }}
          >
            {provBadge.icon} {provBadge.label}
          </span>
        )}
        {isDisconnected && (
          <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0" />
        )}
      </div>

      {/* Body */}
      <div className="px-3.5 py-2.5">
        <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
          {data.description || def.description}
        </p>
        {/* Message preview */}
        {data.nodeType === "message" && data.config?.text && (
          <div className="mt-1.5 px-2 py-1 bg-muted/50 rounded-lg border border-border/30">
            <p className="text-[9px] text-foreground/70 line-clamp-2 italic">"{data.config.text.substring(0, 60)}..."</p>
          </div>
        )}
        {/* Condition preview */}
        {data.nodeType === "condition" && data.config?.field && (
          <div className="mt-1.5 flex items-center gap-1">
            <Badge variant="outline" className="text-[8px] h-4 px-1">{data.config.field}</Badge>
            <span className="text-[9px] text-muted-foreground">{data.config.operator}</span>
            <Badge variant="secondary" className="text-[8px] h-4 px-1">{data.config.value}</Badge>
          </div>
        )}
        {/* AI status */}
        {data.nodeType === "ai_agent" && (
          <div className="mt-1.5 space-y-1">
            {data.config?.natleva_agent && (
              <div className="text-[9px] font-bold text-purple-400 truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                {NATLEVA_AGENT_LABELS[data.config.natleva_agent] || data.config.natleva_agent}
              </div>
            )}
            {!data.config?.natleva_agent && data.config?.agent_name && (
              <div className="text-[9px] font-semibold text-primary truncate">
                🤖 {data.config.agent_name}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", data.config?.send_mode === "auto" ? "bg-green-400" : "bg-amber-400")} />
              <span className="text-[9px] text-muted-foreground">{data.config?.persona || "sdr"} · {data.config?.objective || "qualificar"}</span>
              <Badge variant={data.config?.send_mode === "auto" ? "default" : "secondary"} className="text-[7px] h-3.5 px-1">
                {data.config?.send_mode === "auto" ? "AUTO" : data.config?.send_mode === "suggest" ? "SUGESTÃO" : "APROVAÇÃO"}
              </Badge>
            </div>
          </div>
        )}
        {/* Handoff pause indicator */}
        {data.nodeType === "handoff" && data.config?.pause_automation && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="text-[9px] font-semibold text-amber-600">PAUSA AUTOMAÇÃO</span>
          </div>
        )}
      </div>

      {/* Source handles */}
      {isCondition ? (
        <>
          <Handle type="source" position={Position.Bottom} id="yes"
            className="!w-3.5 !h-3.5 !border-[2.5px] !border-background !-bottom-[7px] !rounded-full !transition-all !duration-200 hover:!scale-125"
            style={{ background: GREEN, left: "30%", boxShadow: `0 0 0 0 ${GREEN}` }}
          />
          <span className="absolute text-[8px] font-bold pointer-events-none select-none" style={{ bottom: -18, left: "22%", color: GREEN }}>Sim</span>
          <Handle type="source" position={Position.Bottom} id="no"
            className="!w-3.5 !h-3.5 !border-[2.5px] !border-background !-bottom-[7px] !rounded-full !transition-all !duration-200 hover:!scale-125"
            style={{ background: RED, left: "70%", boxShadow: `0 0 0 0 ${RED}` }}
          />
          <span className="absolute text-[8px] font-bold pointer-events-none select-none" style={{ bottom: -18, left: "64%", color: RED }}>Não</span>
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} id="out"
          className="!w-3.5 !h-3.5 !bg-primary/80 !border-[2.5px] !border-background !-bottom-[7px] !rounded-full !transition-all !duration-200 hover:!bg-primary hover:!scale-125 hover:!shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
        />
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  trigger: FlowNode, message: FlowNode, condition: FlowNode,
  action_tag: FlowNode, action_funnel: FlowNode, ai_agent: FlowNode, handoff: FlowNode,
};

// ─── NATLEVA AGENT NAME MAP (internal id → DB name pattern) ───
const NATLEVA_ID_TO_DB_NAME: Record<string, string> = {
  orion: "órion", maya: "maya", atlas: "atlas", habibi: "habibi",
  nemo: "nemo", dante: "dante", luna: "luna", nero: "nero",
  iris: "iris", athos: "athos", zara: "zara", finx: "finx",
  sage: "sage", opex: "opex", vigil: "vigil", sentinel: "sentinel",
  spark: "spark", hunter: "hunter", aegis: "aegis", nurture: "nurture",
  "nath-ai": "nath", 
};

const ROLE_TO_PERSONA: Record<string, string> = {
  "Recepção": "sdr", "SDR": "sdr", "Qualificação": "sdr",
  "Especialista": "concierge", "Consultor": "concierge", "Concierge": "concierge",
  "Vendas": "vendas", "Fechamento": "vendas", "Negociação": "vendas",
  "Pós-venda": "pos_venda", "Suporte": "pos_venda", "Fidelização": "pos_venda",
  "Reativação": "reativacao", "Nutrição": "reativacao", "Prospecção": "reativacao",
};

const ROLE_TO_OBJECTIVE: Record<string, string> = {
  "Recepção": "qualificar", "SDR": "qualificar", "Qualificação": "qualificar",
  "Especialista": "responder", "Consultor": "responder", "Concierge": "responder",
  "Vendas": "vender", "Fechamento": "vender", "Negociação": "vender",
  "Proposta": "vender", "Montagem": "vender",
  "Pós-venda": "pos_venda", "Suporte": "pos_venda", "Fidelização": "pos_venda",
  "Orquestrador": "qualificar", "Pipeline": "qualificar",
};

// ─── AI AGENT CONFIG ───
function AIAgentConfig({ config, updateConfig }: { config: NodeConfig; updateConfig: (key: string, value: any) => void }) {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const hasAutoLinked = useRef(false);

  useEffect(() => {
    supabase.from("ai_integrations").select("id, name, provider, model, status")
      .eq("status", "ativo").then(({ data }) => {
        if (!data || data.length === 0) {
          supabase.from("ai_integrations").select("id, name, provider, model, status")
            .eq("status", "active").then(({ data: d2 }) => setIntegrations(d2 || []));
        } else {
          setIntegrations(data);
        }
      });
    supabase.from("ai_team_agents").select("id, name, emoji, role, squad_id, is_active, behavior_prompt, persona")
      .eq("is_active", true).order("name").then(({ data }) => setAgents(data || []));
  }, []);

  // Auto-link: when agents load and natleva_agent is set but agent_id is missing, find the match
  useEffect(() => {
    if (hasAutoLinked.current || agents.length === 0) return;
    if (config.natleva_agent && !config.agent_id) {
      const dbNamePattern = NATLEVA_ID_TO_DB_NAME[config.natleva_agent]?.toLowerCase();
      if (dbNamePattern) {
        const match = agents.find(a => a.name?.toLowerCase().includes(dbNamePattern));
        if (match) {
          hasAutoLinked.current = true;
          updateConfig("agent_id", match.id);
          updateConfig("agent_name", match.name);
          if (match.behavior_prompt && !config.system_prompt) {
            updateConfig("system_prompt", match.behavior_prompt);
          }
          // Auto-set persona/objective from role
          const role = match.role || "";
          const persona = Object.entries(ROLE_TO_PERSONA).find(([k]) => role.includes(k))?.[1];
          const objective = Object.entries(ROLE_TO_OBJECTIVE).find(([k]) => role.includes(k))?.[1];
          if (persona && !config.persona) updateConfig("persona", persona);
          if (objective && !config.objective) updateConfig("objective", objective);
        }
      }
    }
  }, [agents, config.natleva_agent, config.agent_id]);

  const provider = config.provider || "natleva";
  const contextFields = config.context_fields || AI_CONTEXT_FIELDS.map((f) => f.key);

  return (
    <>
      <div>
        <Label className="text-xs font-semibold">Provedor de IA</Label>
        <Select value={provider} onValueChange={(v) => updateConfig("provider", v)}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(PROVIDER_BADGES).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(provider === "natleva") && (
        <div>
          <Label className="text-xs font-semibold">Agente da Equipe</Label>
          <Select value={config.agent_id || ""} onValueChange={(v) => {
            updateConfig("agent_id", v);
            const agent = agents.find(a => a.id === v);
            if (agent) {
              updateConfig("agent_name", agent.name);
              // Auto-populate system_prompt from behavior_prompt
              if (agent.behavior_prompt) {
                updateConfig("system_prompt", agent.behavior_prompt);
              }
              // Auto-set natleva_agent key
              const natlevaKey = Object.entries(NATLEVA_ID_TO_DB_NAME).find(
                ([, dbName]) => agent.name?.toLowerCase().includes(dbName.toLowerCase())
              )?.[0];
              if (natlevaKey) updateConfig("natleva_agent", natlevaKey);
              // Auto-set persona/objective
              const role = agent.role || "";
              const persona = Object.entries(ROLE_TO_PERSONA).find(([k]) => role.includes(k))?.[1];
              const objective = Object.entries(ROLE_TO_OBJECTIVE).find(([k]) => role.includes(k))?.[1];
              if (persona) updateConfig("persona", persona);
              if (objective) updateConfig("objective", objective);
            }
          }}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o agente..." /></SelectTrigger>
            <SelectContent>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.emoji} {a.name} — <span className="text-muted-foreground">{a.role}</span>
                </SelectItem>
              ))}
              {agents.length === 0 && (
                <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                  Nenhum agente ativo encontrado.
                </div>
              )}
            </SelectContent>
          </Select>
          {config.agent_id && (
            <p className="text-[10px] text-muted-foreground mt-1">
              O agente usará sua personalidade e conhecimento treinados.
            </p>
          )}
        </div>
      )}

      {provider === "natleva" && (
        <div>
          <Label className="text-xs font-semibold">Modelo IA</Label>
          <Select value={config.model || "google/gemini-3-flash-preview"} onValueChange={(v) => updateConfig("model", v)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="google/gemini-3-flash-preview">Gemini 3 Flash (Recomendado)</SelectItem>
              <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
              <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
              <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
              <SelectItem value="openai/gpt-5">GPT-5</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[9px] text-muted-foreground mt-1">
            Flash: rápido e eficiente · Pro/GPT-5: tarefas complexas
          </p>
        </div>
      )}

      {provider !== "natleva" && provider !== "n8n" && (
        <div>
          <Label className="text-xs">Credencial / Integração</Label>
          <Select value={config.integration_id || ""} onValueChange={(v) => updateConfig("integration_id", v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {integrations.filter((i) => i.provider === provider).map((i) => (
                <SelectItem key={i.id} value={i.id}>{i.name} ({i.model || "padrão"})</SelectItem>
              ))}
              {integrations.filter((i) => i.provider === provider).length === 0 && (
                <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                  Nenhuma credencial para {PROVIDER_BADGES[provider]?.label}.<br />Configure em Integrações de IA.
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {provider === "n8n" && (
        <>
          <div>
            <Label className="text-xs">Credencial n8n</Label>
            <Select value={config.integration_id || ""} onValueChange={(v) => updateConfig("integration_id", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {integrations.filter((i) => i.provider === "n8n").map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Payload (JSON)</Label>
            <Textarea
              value={config.n8n_payload || '{\n  "texto_cliente": "{last_message}"\n}'}
              onChange={(e) => updateConfig("n8n_payload", e.target.value)}
              className="mt-1 min-h-[70px] font-mono text-[10px]"
            />
          </div>
          <div>
            <Label className="text-xs">Modo de retorno</Label>
            <Select value={config.n8n_return_mode || "text"} onValueChange={(v) => updateConfig("n8n_return_mode", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Texto sugerido</SelectItem>
                <SelectItem value="tags">Tags para aplicar</SelectItem>
                <SelectItem value="funnel">Próxima etapa</SelectItem>
                <SelectItem value="action">Ação</SelectItem>
                <SelectItem value="full">JSON completo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <Separator />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Persona</Label>
          <Select value={config.persona || "sdr"} onValueChange={(v) => updateConfig("persona", v)}>
            <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sdr">SDR</SelectItem>
              <SelectItem value="vendas">Vendas</SelectItem>
              <SelectItem value="concierge">Concierge</SelectItem>
              <SelectItem value="pos_venda">Pós-venda</SelectItem>
              <SelectItem value="documentos">Documentação</SelectItem>
              <SelectItem value="reativacao">Reativação</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Objetivo</Label>
          <Select value={config.objective || "qualificar"} onValueChange={(v) => updateConfig("objective", v)}>
            <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="qualificar">Qualificar</SelectItem>
              <SelectItem value="responder">Responder</SelectItem>
              <SelectItem value="cobrar_docs">Cobrar docs</SelectItem>
              <SelectItem value="vender">Vender</SelectItem>
              <SelectItem value="pedir_dados">Pedir dados</SelectItem>
              <SelectItem value="pos_venda">Pós-venda</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs">System Prompt</Label>
        <Textarea
          value={config.system_prompt || ""}
          onChange={(e) => updateConfig("system_prompt", e.target.value)}
          className="mt-1 min-h-[70px] text-xs"
          placeholder="Você é um consultor premium de viagens..."
        />
      </div>

      {provider !== "n8n" && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px]">Temperatura ({config.temperature || 0.7})</Label>
            <input type="range" min="0" max="1" step="0.1" value={config.temperature || 0.7}
              onChange={(e) => updateConfig("temperature", parseFloat(e.target.value))} className="w-full mt-1 accent-primary h-1" />
          </div>
          <div>
            <Label className="text-[10px]">Max tokens</Label>
            <Input type="number" value={config.max_tokens || 1024} onChange={(e) => updateConfig("max_tokens", Number(e.target.value))} className="mt-1 h-8 text-xs" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Modo envio</Label>
          <Select value={config.send_mode || "suggest"} onValueChange={(v) => updateConfig("send_mode", v)}>
            <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="suggest">Sugerir</SelectItem>
              <SelectItem value="approve">Aprovação</SelectItem>
              <SelectItem value="auto">Automático</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Estilo</Label>
          <Select value={config.style || "premium"} onValueChange={(v) => updateConfig("style", v)}>
            <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="formal">Formal</SelectItem>
              <SelectItem value="direto">Direto</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-xs font-semibold">Contexto enviado</Label>
        <div className="mt-1.5 grid grid-cols-2 gap-1">
          {AI_CONTEXT_FIELDS.map((f) => (
            <div key={f.key} className="flex items-center gap-1.5">
              <Switch className="scale-75" checked={contextFields.includes(f.key)}
                onCheckedChange={(checked) => {
                  const nf = checked ? [...contextFields, f.key] : contextFields.filter((k: string) => k !== f.key);
                  updateConfig("context_fields", nf);
                }} />
              <Label className="text-[10px]">{f.label}</Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />
      <div>
        <Label className="text-[10px] font-semibold">Saídas padronizadas</Label>
        <div className="flex flex-wrap gap-1 mt-1">
          {["response_text", "suggested_tags", "suggested_stage", "confidence", "next_question", "internal_note"].map((o) => (
            <Badge key={o} variant="outline" className="text-[8px] h-4 font-mono">{o}</Badge>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Switch className="scale-75" checked={config.use_knowledge_base || false} onCheckedChange={(v) => updateConfig("use_knowledge_base", v)} />
          <Label className="text-[10px]">Base de conhecimento</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch className="scale-75" checked={config.metadata_only || false} onCheckedChange={(v) => updateConfig("metadata_only", v)} />
          <Label className="text-[10px]">Apenas metadados (privacidade)</Label>
        </div>
      </div>

      {/* NatLeva agent metadata */}
      {config.natleva_agent && (
        <>
          <Separator />
          <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center text-sm">
                {NATLEVA_AGENT_LABELS[config.natleva_agent]?.split(" ")[0] || "🤖"}
              </div>
              <div>
                <span className="text-xs font-bold text-purple-300">
                  {NATLEVA_AGENT_LABELS[config.natleva_agent] || config.natleva_agent}
                </span>
                <p className="text-[9px] text-muted-foreground">Agente NatLeva vinculado</p>
              </div>
            </div>

            {/* Extract metadata from system_prompt */}
            {config.system_prompt && (
              <div className="space-y-1.5">
                {/[Mm]ínimo (\d+) trocas/.test(config.system_prompt) && (
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[8px] h-4 px-1.5 border-purple-500/30 text-purple-300">
                      🔄 Mín. {config.system_prompt.match(/[Mm]ínimo (\d+) trocas/)?.[1]} trocas
                    </Badge>
                  </div>
                )}
                {/BEHAVIOR_CORE versão (LITE|COMPLETA|COMPLETO)/.test(config.system_prompt) && (
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[8px] h-4 px-1.5 border-purple-500/30 text-purple-300">
                      🎭 Behavior: {config.system_prompt.match(/BEHAVIOR_CORE versão (LITE|COMPLETA|COMPLETO)/)?.[1]}
                    </Badge>
                  </div>
                )}
                {/Máx (\d+) palavras/.test(config.system_prompt) && (
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[8px] h-4 px-1.5 border-purple-500/30 text-purple-300">
                      📝 Máx {config.system_prompt.match(/Máx (\d+) palavras/)?.[1]} palavras
                    </Badge>
                  </div>
                )}
                {/5 CAMPOS OBRIGATÓRIOS/.test(config.system_prompt) && (
                  <Badge variant="outline" className="text-[8px] h-4 px-1.5 border-amber-500/30 text-amber-300">
                    📋 5 campos obrigatórios
                  </Badge>
                )}
                {/KB COMPLETA/.test(config.system_prompt) && (
                  <Badge variant="outline" className="text-[8px] h-4 px-1.5 border-blue-500/30 text-blue-300">
                    📚 KB Completa
                  </Badge>
                )}
                {/KB FILTRADA/.test(config.system_prompt) && (
                  <Badge variant="outline" className="text-[8px] h-4 px-1.5 border-blue-500/30 text-blue-300">
                    📚 KB Filtrada
                  </Badge>
                )}
              </div>
            )}
          </div>
        </>
      )}

      <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => toast.info("Teste de bloco disponível em breve!")}>
        <FlaskConical className="w-3 h-3 mr-1" /> Testar este bloco
      </Button>
    </>
  );
}

// ─── CONFIG PANEL (SLIDE-IN) ───
function ConfigPanel({ node, onUpdate, onClose, onDelete, onDuplicate }: {
  node: Node; onUpdate: (id: string, data: any) => void; onClose: () => void; onDelete: (id: string) => void; onDuplicate: (id: string) => void;
}) {
  const config = (node.data?.config || {}) as NodeConfig;
  const nodeType = node.data?.nodeType as string;
  const def = NODE_LIBRARY.find((n) => n.type === nodeType);

  const updateConfig = (key: string, value: any) => {
    onUpdate(node.id, { ...node.data, config: { ...config, [key]: value } });
  };
  const updateLabel = (label: string) => {
    onUpdate(node.id, { ...node.data, label });
  };

  return (
    <div className="w-[340px] border-l bg-card h-full flex flex-col animate-slide-in-right shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b bg-muted/30">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: def?.color }}>
          {def && <def.icon className="w-3.5 h-3.5 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{(node.data?.label as string) || def?.label}</h3>
          <p className="text-[10px] text-muted-foreground">{def?.label}</p>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Nome</Label>
            <Input value={(node.data?.label as string) || ""} onChange={(e) => updateLabel(e.target.value)} className="mt-1 h-8 text-sm" />
          </div>

          <Separator />

          {/* TRIGGER */}
          {nodeType === "trigger" && (
            <>
              <div>
                <Label className="text-xs">Tipo de gatilho</Label>
                <Select value={config.trigger_type || "new_message"} onValueChange={(v) => updateConfig("trigger_type", v)}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new_message">Nova mensagem</SelectItem>
                    <SelectItem value="keyword">Palavra-chave</SelectItem>
                    <SelectItem value="tag_applied">Tag aplicada</SelectItem>
                    <SelectItem value="funnel_changed">Funil mudou</SelectItem>
                    <SelectItem value="vip_contact">VIP entrou em contato</SelectItem>
                    <SelectItem value="no_response">Sem resposta há X min</SelectItem>
                    <SelectItem value="business_hours">Horário comercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {config.trigger_type === "keyword" && (
                <div>
                  <Label className="text-xs">Palavras-chave</Label>
                  <Input value={(config.keywords || []).join(", ")} onChange={(e) => updateConfig("keywords", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))} className="mt-1 h-8 text-xs" placeholder="dubai, paris" />
                </div>
              )}
              {config.trigger_type === "no_response" && (
                <div>
                  <Label className="text-xs">Timeout (min)</Label>
                  <Input type="number" value={config.timeout_minutes || 60} onChange={(e) => updateConfig("timeout_minutes", Number(e.target.value))} className="mt-1 h-8 text-xs" />
                </div>
              )}
            </>
          )}

          {/* MESSAGE */}
          {nodeType === "message" && (
            <>
              <div>
                <Label className="text-xs">Mensagem</Label>
                <Textarea value={config.text || ""} onChange={(e) => updateConfig("text", e.target.value)} className="mt-1 min-h-[80px] text-xs" placeholder="Olá {nome}!" />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {["{nome}", "{destino}", "{datas}"].map((v) => (
                    <button key={v} onClick={() => updateConfig("text", (config.text || "") + " " + v)}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors">{v}</button>
                  ))}
                </div>
              </div>
              {config.text && (
                <div className="p-2 rounded-lg bg-muted/50 border border-border/30">
                  <Label className="text-[9px] text-muted-foreground uppercase tracking-wider">Preview</Label>
                  <p className="text-xs mt-1 text-foreground/80 italic">
                    {config.text.replace(/{nome}/g, "João Silva").replace(/{destino}/g, "Dubai").replace(/{datas}/g, "15-22 Mar").substring(0, 120)}
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch className="scale-75" checked={config.require_approval || false} onCheckedChange={(v) => updateConfig("require_approval", v)} />
                <Label className="text-[10px]">Requer aprovação humana</Label>
              </div>
            </>
          )}

          {/* CONDITION */}
          {nodeType === "condition" && (
            <>
              <div>
                <Label className="text-xs">Campo</Label>
                <Select value={config.field || "keyword"} onValueChange={(v) => updateConfig("field", v)}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keyword">Palavra na msg</SelectItem>
                    <SelectItem value="score">Score</SelectItem>
                    <SelectItem value="tag">Tag</SelectItem>
                    <SelectItem value="funnel_stage">Etapa funil</SelectItem>
                    <SelectItem value="is_vip">É VIP</SelectItem>
                    <SelectItem value="destination">Destino</SelectItem>
                    <SelectItem value="last_response">Última resposta</SelectItem>
                    <SelectItem value="inactive_days">Dias inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Operador</Label>
                  <Select value={config.operator || "contains"} onValueChange={(v) => updateConfig("operator", v)}>
                    <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contains">Contém</SelectItem>
                      <SelectItem value="not_contains">Não contém</SelectItem>
                      <SelectItem value="equals">Igual</SelectItem>
                      <SelectItem value="greater_than">Maior que</SelectItem>
                      <SelectItem value="less_than">Menor que</SelectItem>
                      <SelectItem value="exists">Existe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Valor</Label>
                  <Input value={config.value || ""} onChange={(e) => updateConfig("value", e.target.value)} className="mt-1 h-8 text-xs" placeholder="70" />
                </div>
              </div>
              <div className="flex gap-2 mt-1">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border" style={{ borderColor: GREEN }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: GREEN }} />
                  <span className="text-[10px] font-semibold" style={{ color: GREEN }}>Sim → próximo bloco</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border" style={{ borderColor: RED }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: RED }} />
                  <span className="text-[10px] font-semibold" style={{ color: RED }}>Não → outro caminho</span>
                </div>
              </div>
            </>
          )}

          {/* TAG */}
          {nodeType === "action_tag" && (
            <div>
              <Label className="text-xs">Tags</Label>
              <Input value={(config.tags || []).join(", ")} onChange={(e) => updateConfig("tags", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))} className="mt-1 h-8 text-xs" placeholder="Dubai, VIP" />
              {(config.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {(config.tags as string[]).map((t: string) => (
                    <Badge key={t} variant="secondary" className="text-[9px] h-5">{t}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FUNNEL */}
          {nodeType === "action_funnel" && (
            <div>
              <Label className="text-xs">Etapa do funil</Label>
              <Select value={config.funnel_stage || "novo_lead"} onValueChange={(v) => updateConfig("funnel_stage", v)}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo_lead">Novo Lead</SelectItem>
                  <SelectItem value="recepcao">Recepção & Conexão</SelectItem>
                  <SelectItem value="qualificacao">Qualificação</SelectItem>
                  <SelectItem value="aguardando_info">Aguardando Informações</SelectItem>
                  <SelectItem value="orcamento_preparacao">Orçamento em Preparação</SelectItem>
                  <SelectItem value="proposta_enviada">Proposta Enviada</SelectItem>
                  <SelectItem value="negociacao">Negociação & Dúvidas</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
                  <SelectItem value="pos_venda">Pós-venda / Operação</SelectItem>
                  <SelectItem value="perdido">Perdido / Sem retorno</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* AI AGENT */}
          {nodeType === "ai_agent" && <AIAgentConfig config={config} updateConfig={updateConfig} />}

          {/* HANDOFF */}
          {nodeType === "handoff" && (
            <>
              <div>
                <Label className="text-xs">Fila</Label>
                <Select value={config.queue || "vendas"} onValueChange={(v) => updateConfig("queue", v)}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendas">Vendas</SelectItem>
                    <SelectItem value="vendas_vip">Vendas VIP</SelectItem>
                    <SelectItem value="operacao">Operação</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="pos_venda">Pós-venda</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch className="scale-75" checked={config.notify || false} onCheckedChange={(v) => updateConfig("notify", v)} />
                <Label className="text-[10px]">Notificar responsável</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch className="scale-75" checked={config.pause_automation || false} onCheckedChange={(v) => updateConfig("pause_automation", v)} />
                <Label className="text-[10px]">⏸️ Pausar automação (IA não responde)</Label>
              </div>
              {config.pause_automation && (
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <p className="text-[10px] text-amber-700">Quando ativado, a IA NÃO responde automaticamente. Mensagens do cliente geram notificação ao vendedor.</p>
                </div>
              )}
            </>
          )}

          <Separator />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs h-8" onClick={() => onDuplicate(node.id)}>
              <Copy className="w-3 h-3 mr-1" /> Duplicar
            </Button>
            <Button variant="destructive" size="sm" className="flex-1 text-xs h-8" onClick={() => onDelete(node.id)}>
              <Trash2 className="w-3 h-3 mr-1" /> Remover
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── FLOW LIST ───
function FlowList({ flows, onSelect, onCreate, onUseTemplate, onDeleteFlow, onArchiveFlow, loading }: {
  flows: any[]; onSelect: (f: any) => void; onCreate: () => void; onUseTemplate: (t: typeof TEMPLATES[0]) => void; onDeleteFlow: (id: string) => void; onArchiveFlow: (id: string, archived: boolean) => void; loading: boolean;
}) {
  const [tab, setTab] = useState<"flows" | "templates" | "pipeline" | "metrics" | "livefunnel" | "funnel3d">("flows");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const navigate = useNavigate();

  const activeFlows = flows.filter(f => f.status !== "archived");
  const archivedFlows = flows.filter(f => f.status === "archived");
  const displayFlows = showArchived ? archivedFlows : activeFlows;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate("/ai-team")}><ChevronLeft className="w-4 h-4" /></Button>
        <h1 className="font-bold text-lg">🧩 Flow Builder</h1>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => navigate("/ai-team/config")} className="text-xs">
          <Plug className="w-3 h-3 mr-1" /> Integrações IA
        </Button>
      </div>
      <div className="flex border-b overflow-x-auto">
        <button className={cn("flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap px-3", tab === "flows" ? "border-primary text-primary" : "border-transparent text-muted-foreground")} onClick={() => setTab("flows")}>Meus Fluxos</button>
        <button className={cn("flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap px-3", tab === "templates" ? "border-primary text-primary" : "border-transparent text-muted-foreground")} onClick={() => setTab("templates")}>Templates</button>
        <button className={cn("flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap px-3", tab === "pipeline" ? "border-primary text-primary" : "border-transparent text-muted-foreground")} onClick={() => setTab("pipeline")}>📊 Pipeline CRM</button>
        <button className={cn("flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap px-3", tab === "metrics" ? "border-primary text-primary" : "border-transparent text-muted-foreground")} onClick={() => setTab("metrics")}>📈 Métricas</button>
        <button className={cn("flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap px-3", tab === "livefunnel" ? "border-primary text-primary" : "border-transparent text-muted-foreground")} onClick={() => setTab("livefunnel")}>🔴 Funil Vivo</button>
        <button className={cn("flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap px-3", tab === "funnel3d" ? "border-primary text-primary" : "border-transparent text-muted-foreground")} onClick={() => setTab("funnel3d")}>🌀 Funil 3D</button>
      </div>

      {tab === "pipeline" && <FlowCRMPipeline />}
      {tab === "metrics" && <FlowMetrics />}
      {tab === "livefunnel" && <LiveFunnel onClose={() => setTab("flows")} />}
      {tab === "funnel3d" && (
        <Suspense fallback={<div className="h-[calc(100vh-180px)] flex items-center justify-center text-muted-foreground">Carregando 3D...</div>}>
          <div className="h-[calc(100vh-180px)]">
            <Funnel3DView mode="simulation" />
          </div>
        </Suspense>
      )}

      {(tab === "flows" || tab === "templates") && (
      <ScrollArea className="flex-1 p-3">
        {tab === "flows" ? (
          <div className="space-y-2">
            <Button onClick={onCreate} className="w-full mb-2" size="sm"><Plus className="w-4 h-4 mr-1" /> Novo Fluxo</Button>

            {/* Toggle archived */}
            <div className="flex items-center justify-between mb-2">
              <button
                className={cn("text-xs font-medium transition-colors", showArchived ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                onClick={() => setShowArchived(!showArchived)}
              >
                {showArchived ? `📦 Arquivados (${archivedFlows.length})` : `📂 Ativos (${activeFlows.length})`}
                {!showArchived && archivedFlows.length > 0 && (
                  <span className="ml-1.5 text-[10px] text-muted-foreground">• {archivedFlows.length} arquivado{archivedFlows.length > 1 ? "s" : ""}</span>
                )}
              </button>
              {showArchived && (
                <button className="text-[10px] text-muted-foreground hover:text-foreground" onClick={() => setShowArchived(false)}>
                  ← Voltar aos ativos
                </button>
              )}
            </div>

            {loading && <p className="text-xs text-muted-foreground text-center py-4">Carregando...</p>}
            {!loading && displayFlows.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                {showArchived ? "Nenhum fluxo arquivado." : "Nenhum fluxo criado.\nComece com um template!"}
              </p>
            )}
            {displayFlows.map((f) => (
              <Card key={f.id} className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group" onClick={() => onSelect(f)}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm flex-1 min-w-0 truncate">{f.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant={f.status === "active" ? "default" : f.status === "paused" ? "secondary" : f.status === "archived" ? "outline" : "outline"} className="text-[10px]">
                        {f.status === "active" ? "🟢 Ativo" : f.status === "paused" ? "⏸ Pausado" : f.status === "archived" ? "📦 Arquivado" : "🟡 Rascunho"}
                      </Badge>
                    </div>
                  </div>
                  {f.description && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{f.description}</p>}
                  
                  {/* Action buttons */}
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                      onClick={(e) => { e.stopPropagation(); onArchiveFlow(f.id, f.status === "archived"); }}
                    >
                      {f.status === "archived" ? "📂 Restaurar" : "📦 Arquivar"}
                    </Button>
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: f.id, name: f.name }); }}
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {TEMPLATES.map((t, i) => (
              <Card key={i} className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all" onClick={() => onUseTemplate(t)}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <LayoutTemplate className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">{t.name}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{t.description}</p>
                  <Badge variant="outline" className="text-[10px] mt-2">{t.nodes.length} blocos</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
          <div className="bg-card border border-border rounded-xl shadow-2xl p-5 max-w-sm w-full mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-2">
              <h3 className="font-bold text-base">Excluir fluxo?</h3>
              <p className="text-sm text-muted-foreground">
                Tem certeza que deseja excluir <span className="font-bold text-foreground">"{deleteTarget.name}"</span>? Essa ação é irreversível e todos os nós e conexões serão perdidos.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
              <Button variant="destructive" size="sm" onClick={() => { onDeleteFlow(deleteTarget.id); setDeleteTarget(null); }}>
                Sim, excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NODE LIBRARY (DRAG) ───
function NodeLibrary() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <Panel position="top-left" className="!m-3">
      <Card className="w-56 shadow-2xl border-border/40 backdrop-blur-md bg-card/95 rounded-2xl overflow-hidden">
        <CardHeader className="p-3 pb-1.5 bg-gradient-to-r from-primary/5 to-transparent">
          <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-1.5">
            <GripVertical className="w-3 h-3" /> Blocos disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-0 space-y-0.5">
          {NODE_LIBRARY.map((n) => (
            <div key={n.type} draggable onDragStart={(e) => onDragStart(e, n.type)}
              className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-accent/15 cursor-grab active:cursor-grabbing transition-all duration-200 text-xs group border border-transparent hover:border-border/40 hover:shadow-sm">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md transition-all duration-200 group-hover:scale-110 group-hover:shadow-lg relative"
                style={{ background: `linear-gradient(145deg, ${n.color}, ${n.color}bb)` }}>
                <n.icon className="w-4 h-4 text-white drop-shadow-sm" />
                <span className="absolute -top-1 -right-1 text-[10px] leading-none">{n.emoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold block text-xs leading-tight">{n.label}</span>
                <span className="text-[9px] text-muted-foreground leading-tight">{n.description.split(" ").slice(0, 4).join(" ")}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </Panel>
  );
}

// ─── TOOLBAR ───
function CanvasToolbar({ onAutoLayout, onFitView, nodeCount, edgeCount }: {
  onAutoLayout: () => void; onFitView: () => void; nodeCount: number; edgeCount: number;
}) {
  return (
    <Panel position="top-right" className="!m-3">
      <Card className="shadow-xl border-border/50 backdrop-blur-sm bg-card/95">
        <CardContent className="p-2 flex items-center gap-1">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onAutoLayout}>
                  <AlignVerticalJustifyCenter className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p className="text-xs">Auto organizar</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onFitView}>
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p className="text-xs">Centralizar</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <div className="flex items-center gap-2 px-1.5">
            <span className="text-[10px] text-muted-foreground">{nodeCount} blocos</span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] text-muted-foreground">{edgeCount} conexões</span>
          </div>
        </CardContent>
      </Card>
    </Panel>
  );
}

// ─── TEST MODE PANEL ───
function TestPanel({ isRunning, currentStep, steps, onClose, onStart }: {
  isRunning: boolean; currentStep: number; steps: string[]; onClose: () => void; onStart: () => void;
}) {
  return (
    <Panel position="bottom-left" className="!m-3">
      <Card className="w-72 shadow-xl border-border/50 backdrop-blur-sm bg-card/95">
        <CardHeader className="p-2.5 pb-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-primary" /> Modo Teste
            </CardTitle>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onClose}><X className="w-3 h-3" /></Button>
          </div>
        </CardHeader>
        <CardContent className="p-2.5 pt-1">
          {!isRunning ? (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground">Simule a execução do fluxo para validar o caminho.</p>
              <Button size="sm" className="w-full text-xs h-7" onClick={onStart}>
                <Play className="w-3 h-3 mr-1" /> Iniciar simulação
              </Button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {steps.map((s, i) => (
                <div key={i} className={cn("flex items-center gap-2 px-2 py-1 rounded text-[10px] transition-all",
                  i < currentStep && "bg-green-500/10 text-green-600",
                  i === currentStep && "bg-blue-500/10 text-blue-600 font-semibold animate-pulse",
                  i > currentStep && "text-muted-foreground"
                )}>
                  {i < currentStep ? <CheckCircle2 className="w-3 h-3" /> : i === currentStep ? <Play className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-muted-foreground/30" />}
                  {s}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Panel>
  );
}

// ─── MAIN CANVAS (inner, needs ReactFlowProvider) ───
function FlowCanvas({ flows, loadFlows: reloadFlows }: { flows: any[]; loadFlows: () => void }) {
  const navigate = useNavigate();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();

  const [currentFlow, setCurrentFlow] = useState<any | null>(null);
  const [flowName, setFlowName] = useState("Novo Fluxo");
  const [flowDesc, setFlowDesc] = useState("");
  const [flowStatus, setFlowStatus] = useState("draft");
  const [saving, setSaving] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [testRunning, setTestRunning] = useState(false);
  const [testStep, setTestStep] = useState(0);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Mark disconnected nodes
  const nodesWithStatus = useMemo(() => {
    const connectedIds = new Set<string>();
    edges.forEach((e) => { connectedIds.add(e.source); connectedIds.add(e.target); });
    return nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        _disconnected: nodes.length > 1 && !connectedIds.has(n.id),
        _testState: testRunning && testStep >= 0 ? (
          getTestNodeIds(nodes, edges).indexOf(n.id) < testStep ? "passed" :
          getTestNodeIds(nodes, edges).indexOf(n.id) === testStep ? "active" : undefined
        ) : undefined,
      }
    }));
  }, [nodes, edges, testRunning, testStep]);

  const getNodeDescription = (type: string, config: any): string => {
    if (type === "message" && config?.text) return config.text.substring(0, 50) + "...";
    if (type === "condition" && config?.field) return `${config.field} ${config.operator} ${config.value}`;
    if (type === "action_tag" && config?.tags) return (config.tags as string[]).join(", ");
    if (type === "ai_agent") {
      const prov = PROVIDER_BADGES[config?.provider || "natleva"];
      return `${prov?.icon || "🧠"} ${config?.persona || "sdr"} - ${config?.objective || "qualificar"}`;
    }
    return "";
  };

  const buildEdge = (source: string, target: string, sourceHandle: string, label?: string): Edge => {
    const normalizedSourceHandle = sourceHandle || "out";
    const isYes = normalizedSourceHandle === "yes";
    const isNo = normalizedSourceHandle === "no";
    return {
      id: `e-${source}-${target}-${Date.now()}`,
      source,
      target,
      sourceHandle: normalizedSourceHandle,
      targetHandle: "target",
      type: "smart",
      label,
      markerEnd: { type: MarkerType.ArrowClosed, color: isYes ? GREEN : isNo ? RED : "hsl(var(--primary))" },
      style: { strokeWidth: 2 },
      animated: false,
    };
  };

  const loadFlow = async (flow: any) => {
    setCurrentFlow(flow); setFlowName(flow.name); setFlowDesc(flow.description || ""); setFlowStatus(flow.status);
    const { data: nodesData } = await supabase.from("automation_nodes").select("*").eq("flow_id", flow.id);
    const { data: edgesData } = await supabase.from("automation_edges").select("*").eq("flow_id", flow.id);
    setNodes((nodesData || []).map((n: any) => ({
      id: n.id,
      type: toCanvasNodeType(n.node_type),
      position: { x: n.position_x, y: n.position_y },
      data: {
        label: n.label,
        nodeType: toCanvasNodeType(n.node_type),
        originalNodeType: n.node_type,
        config: n.config,
        description: getNodeDescription(toCanvasNodeType(n.node_type), n.config),
      },
    })));
    setEdges((edgesData || []).map((e: any) => buildEdge(e.source_node_id, e.target_node_id, e.source_handle || "out", e.label)));
    setSelectedNode(null); setShowCanvas(true);
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  };

  const createNewFlow = () => {
    setCurrentFlow(null); setFlowName("Novo Fluxo"); setFlowDesc(""); setFlowStatus("draft");
    setNodes([]); setEdges([]); setSelectedNode(null); setShowCanvas(true);
  };

  const useTemplate = (template: typeof TEMPLATES[0]) => {
    setCurrentFlow(null); setFlowName(template.name); setFlowDesc(template.description); setFlowStatus("draft");
    setNodes(template.nodes.map((n) => ({
      id: n.id, type: n.type, position: n.position,
      data: {
        label: n.label,
        nodeType: n.type,
        originalNodeType: n.type,
        config: n.config,
        description: getNodeDescription(n.type, n.config),
      },
    })));
    setEdges(template.edges.map((e) => buildEdge(e.source, e.target, (e as any).sourceHandle || "out", (e as any).label)));
    setSelectedNode(null); setShowCanvas(true);
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  };

  const saveFlow = async () => {
    setSaving(true);
    try {
      let flowId = currentFlow?.id;
      if (!flowId) {
        const { data, error } = await supabase.from("automation_flows").insert({ name: flowName, description: flowDesc, status: flowStatus }).select().single();
        if (error) throw error;
        flowId = data.id; setCurrentFlow(data);
      } else {
        await supabase.from("automation_flows").update({ name: flowName, description: flowDesc, status: flowStatus, updated_at: new Date().toISOString() }).eq("id", flowId);
      }
      await supabase.from("automation_edges").delete().eq("flow_id", flowId);
      await supabase.from("automation_nodes").delete().eq("flow_id", flowId);
      if (nodes.length > 0) {
        const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const nodeRows = nodes.map((n) => ({
          id: isValidUUID(n.id) ? n.id : undefined,
          flow_id: flowId,
          node_type: getPersistedNodeType(n),
          label: (n.data as any)?.label || "",
          config: (n.data as any)?.config || {},
          position_x: n.position.x,
          position_y: n.position.y,
        }));
        const { data: savedNodes, error: nErr } = await supabase.from("automation_nodes").insert(nodeRows).select();
        if (nErr) throw nErr;
        const idMap: Record<string, string> = {};
        nodeRows.forEach((_, i) => { idMap[nodes[i].id] = savedNodes![i].id; });
        if (edges.length > 0) {
          const edgeRows = edges.map((e) => ({
            flow_id: flowId,
            source_node_id: idMap[e.source] || e.source,
            target_node_id: idMap[e.target] || e.target,
            source_handle: e.sourceHandle,
            target_handle: e.targetHandle,
            label: e.label as string || null,
          }));
          const { error: eErr } = await supabase.from("automation_edges").insert(edgeRows);
          if (eErr) throw eErr;
        }
        setNodes(nodes.map((n, i) => ({ ...n, id: savedNodes![i].id })));
        setEdges(edges.map((e) => ({ ...e, source: idMap[e.source] || e.source, target: idMap[e.target] || e.target })));
      }
      toast.success("Fluxo salvo!");
      logAITeamAudit({
        action_type: currentFlow?.id ? AUDIT_ACTIONS.UPDATE : AUDIT_ACTIONS.CREATE,
        entity_type: AUDIT_ENTITIES.FLOW,
        entity_id: flowId!,
        entity_name: flowName,
        description: `Workflow ${currentFlow?.id ? "atualizado" : "criado"}: ${flowName}`,
        performed_by: "gestor",
        details: { nodes_count: nodes.length, edges_count: edges.length, status: flowStatus },
      });
      reloadFlows();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally { setSaving(false); }
  };

  const onConnect = useCallback((params: Connection) => {
    const sh = params.sourceHandle || "out";
    const label = sh === "yes" ? "Sim" : sh === "no" ? "Não" : undefined;
    setEdges((eds) => addEdge({
      ...params,
      type: "smart",
      label,
      markerEnd: { type: MarkerType.ArrowClosed, color: sh === "yes" ? GREEN : sh === "no" ? RED : "hsl(var(--primary))" },
      style: { strokeWidth: 2 },
      animated: false,
    }, eds));
  }, [setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/reactflow");
    if (!type) return;
    const bounds = reactFlowWrapper.current?.getBoundingClientRect();
    if (!bounds) return;
    const def = NODE_LIBRARY.find((n) => n.type === type);
    setNodes((nds) => [...nds, {
      id: `new-${Date.now()}`, type,
      position: { x: event.clientX - bounds.left - 100, y: event.clientY - bounds.top - 40 },
      data: { label: def?.label || type, nodeType: type, config: {}, description: def?.description || "" },
    }]);
  }, [setNodes]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => { setSelectedNode(node); }, []);
  const onPaneClick = useCallback(() => { setSelectedNode(null); }, []);

  const updateNodeData = useCallback((id: string, data: any) => {
    const updated = { ...data, description: getNodeDescription(data.nodeType, data.config) };
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: updated } : n)));
    setSelectedNode((prev) => (prev && prev.id === id ? { ...prev, data: updated } : prev));
  }, [setNodes]);

  const deleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  const duplicateNode = useCallback((id: string) => {
    const orig = nodes.find((n) => n.id === id);
    if (!orig) return;
    setNodes((nds) => [...nds, {
      ...orig, id: `new-${Date.now()}`,
      position: { x: orig.position.x + 40, y: orig.position.y + 40 },
      data: { ...orig.data },
    }]);
    toast.success("Bloco duplicado");
  }, [nodes, setNodes]);

  const autoLayout = useCallback(() => {
    // Simple top-down layout by traversal
    const trigger = nodes.find((n) => (n.data as any)?.nodeType === "trigger");
    if (!trigger) return;
    const visited = new Set<string>();
    const positions: Record<string, { x: number; y: number }> = {};
    const queue: { id: string; depth: number; lane: number }[] = [{ id: trigger.id, depth: 0, lane: 0 }];
    const depthCount: Record<number, number> = {};

    while (queue.length > 0) {
      const { id, depth, lane } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      if (!depthCount[depth]) depthCount[depth] = 0;
      const laneOffset = depthCount[depth];
      depthCount[depth]++;
      positions[id] = { x: 300 + laneOffset * 280, y: depth * 170 };

      const outEdges = edges.filter((e) => e.source === id);
      outEdges.forEach((e, i) => {
        if (!visited.has(e.target)) {
          queue.push({ id: e.target, depth: depth + 1, lane: i });
        }
      });
    }
    // Also position unvisited nodes
    let unvisitedY = (Object.keys(depthCount).length) * 170;
    nodes.forEach((n) => {
      if (!positions[n.id]) {
        positions[n.id] = { x: 300, y: unvisitedY };
        unvisitedY += 170;
      }
    });
    setNodes((nds) => nds.map((n) => ({ ...n, position: positions[n.id] || n.position })));
    setTimeout(() => fitView({ padding: 0.2 }), 50);
    toast.success("Layout organizado");
  }, [nodes, edges, setNodes, fitView]);

  // Test mode simulation
  const startTest = useCallback(() => {
    setTestRunning(true); setTestStep(0);
    const ids = getTestNodeIds(nodes, edges);
    if (ids.length === 0) { toast.error("Nenhum caminho encontrado"); setTestRunning(false); return; }
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= ids.length) { clearInterval(interval); setTestRunning(false); toast.success("Simulação concluída!"); }
      setTestStep(step);
    }, 1200);
  }, [nodes, edges]);

  const deleteFlow = useCallback(async (id: string) => {
    await supabase.from("automation_edges").delete().eq("flow_id", id);
    await supabase.from("automation_nodes").delete().eq("flow_id", id);
    await supabase.from("automation_flows").delete().eq("id", id);
    reloadFlows();
    toast.success("Fluxo excluído");
  }, [reloadFlows]);

  const archiveFlow = useCallback(async (id: string, isArchived: boolean) => {
    const newStatus = isArchived ? "draft" : "archived";
    await supabase.from("automation_flows").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", id);
    reloadFlows();
    toast.success(isArchived ? "Fluxo restaurado" : "Fluxo arquivado");
  }, [reloadFlows]);

  if (!showCanvas) {
    return <FlowList flows={flows} onSelect={loadFlow} onCreate={createNewFlow} onUseTemplate={useTemplate} onDeleteFlow={deleteFlow} onArchiveFlow={archiveFlow} loading={false} />;
  }

  return (
    <div className="h-full flex flex-col">
      {/* TOP BAR */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-card/95 backdrop-blur-sm flex-shrink-0 z-10">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowCanvas(false); setSelectedNode(null); setTestMode(false); }}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Input value={flowName} onChange={(e) => setFlowName(e.target.value)} className="max-w-[200px] h-8 text-sm font-semibold border-transparent bg-transparent hover:border-border focus:border-border transition-colors" />
        <Select value={flowStatus} onValueChange={setFlowStatus}>
          <SelectTrigger className="w-[110px] h-8 text-[10px] border-transparent bg-transparent hover:border-border"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">🟡 Rascunho</SelectItem>
            <SelectItem value="active">🟢 Ativo</SelectItem>
            <SelectItem value="paused">⏸ Pausado</SelectItem>
          </SelectContent>
        </Select>
        {flowName.toLowerCase().includes("natleva") && (
          <Badge variant="outline" className="text-[9px] h-6 px-2 border-amber-500/40 bg-amber-500/10 text-amber-400 gap-1 shrink-0">
            <Eye className="w-3 h-3" /> Blueprint Visual — não controla atendimento
          </Badge>
        )}
        <div className="flex-1" />
        <Button variant={testMode ? "default" : "outline"} size="sm" onClick={() => { setTestMode(!testMode); if (testMode) { setTestRunning(false); setTestStep(0); } }} className="text-xs h-8">
          <FlaskConical className="w-3 h-3 mr-1" /> {testMode ? "Sair Simulação" : "🧪 Simular fluxo"}
        </Button>
        <Button size="sm" onClick={saveFlow} disabled={saving} className="text-xs h-8">
          <Save className="w-3 h-3 mr-1" /> {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {/* CANVAS */}
      <div className="flex flex-1 overflow-hidden">
        <div ref={reactFlowWrapper} className="flex-1 relative" onDragOver={onDragOver} onDrop={onDrop}>
          {/* Watermark NatLeva */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 5 }}>
            <img src={natlevaLogo} alt="" className="w-48 h-auto select-none dark:invert" draggable={false}
              style={{ opacity: 0.1 }} />
          </div>
          <ReactFlow
            nodes={nodesWithStatus}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            snapToGrid
            snapGrid={[20, 20]}
            deleteKeyCode={["Backspace", "Delete"]}
            multiSelectionKeyCode="Shift"
            selectionOnDrag
            zoomOnScroll
            className="bg-background"
            defaultEdgeOptions={{ type: "smart", markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 } }}
            connectionLineStyle={{ strokeWidth: 2, stroke: "hsl(var(--primary))" }}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(var(--border))" className="!bg-background" />
            <Controls className="!bg-card !border !border-border/50 !rounded-xl !shadow-xl" showInteractive={false} />
            <MiniMap
              className="!bg-card !border !border-border/50 !rounded-xl !shadow-xl"
              nodeStrokeWidth={3}
              maskColor="hsl(var(--background) / 0.7)"
              style={{ width: 160, height: 100 }}
            />
            <NodeLibrary />
            <CanvasToolbar onAutoLayout={autoLayout} onFitView={() => fitView({ padding: 0.2 })} nodeCount={nodes.length} edgeCount={edges.length} />
          </ReactFlow>
        </div>

        {/* Simulator panel */}
        {testMode && (
          <FlowSimulator
            nodes={nodes}
            edges={edges}
            onHighlightNode={(visited, activeId) => {
              setNodes((nds) => nds.map((n) => ({
                ...n,
                data: {
                  ...n.data,
                  _testState: visited.includes(n.id) ? (n.id === activeId ? "active" : "passed") : undefined,
                },
              })));
            }}
            onClose={() => { setTestMode(false); setTestRunning(false); setTestStep(0); }}
          />
        )}

        {selectedNode && (
          <ConfigPanel
            node={selectedNode}
            onUpdate={updateNodeData}
            onClose={() => setSelectedNode(null)}
            onDelete={deleteNode}
            onDuplicate={duplicateNode}
          />
        )}
      </div>
    </div>
  );
}

// ─── HELPERS ───
function getTestNodeIds(nodes: Node[], edges: Edge[]): string[] {
  const trigger = nodes.find((n) => (n.data as any)?.nodeType === "trigger");
  if (!trigger) return [];
  const path: string[] = [];
  const visited = new Set<string>();
  let current: string | null = trigger.id;
  while (current && !visited.has(current)) {
    visited.add(current);
    path.push(current);
    // Follow first outgoing edge (prefer "yes" for conditions)
    const outEdges = edges.filter((e) => e.source === current);
    const yesEdge = outEdges.find((e) => e.sourceHandle === "yes");
    const next = yesEdge || outEdges[0];
    current = next ? next.target : null;
  }
  return path;
}

// ─── MAIN PAGE ───
export default function FlowBuilder() {
  const [flows, setFlows] = useState<any[]>([]);
  const [loadingFlows, setLoadingFlows] = useState(true);

  useEffect(() => { loadFlows(); }, []);

  const loadFlows = async () => {
    setLoadingFlows(true);
    const { data } = await supabase.from("automation_flows").select("*").eq("is_template", false).order("updated_at", { ascending: false });
    setFlows(data || []);
    setLoadingFlows(false);
  };

  return (
    <div className="h-[calc(100vh-64px)] bg-background">
      <ReactFlowProvider>
        <FlowCanvas flows={flows} loadFlows={loadFlows} />
      </ReactFlowProvider>
    </div>
  );
}
