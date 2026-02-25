import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

const NODE_LIBRARY = [
  { type: "trigger", label: "Gatilho", icon: Zap, color: "hsl(var(--chart-4))", description: "Inicia o fluxo quando um evento ocorre" },
  { type: "message", label: "Mensagem", icon: MessageSquare, color: "hsl(var(--chart-1))", description: "Envia uma mensagem de texto" },
  { type: "condition", label: "Condição", icon: GitBranch, color: "hsl(var(--chart-3))", description: "Ramifica o fluxo (IF / ELSE)" },
  { type: "action_tag", label: "Aplicar Tag", icon: Tag, color: "hsl(var(--chart-2))", description: "Adiciona tags ao contato" },
  { type: "action_funnel", label: "Mover Funil", icon: ArrowRightLeft, color: "hsl(var(--chart-5))", description: "Move o lead no funil" },
  { type: "ai_agent", label: "Agente IA", icon: Sparkles, color: "hsl(280 80% 60%)", description: "IA com provedor configurável" },
  { type: "handoff", label: "Transferir", icon: UserCheck, color: "hsl(var(--muted-foreground))", description: "Transfere para humano" },
] as const;

const PROVIDER_BADGES: Record<string, { label: string; icon: string; color: string }> = {
  natleva: { label: "NatLeva", icon: "🧠", color: "hsl(280 80% 60%)" },
  openai: { label: "OpenAI", icon: "🤖", color: "hsl(160 60% 45%)" },
  gemini: { label: "Gemini", icon: "💎", color: "hsl(210 80% 55%)" },
  anthropic: { label: "Claude", icon: "🔮", color: "hsl(25 80% 55%)" },
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

// ─── TEMPLATES ───
const TEMPLATES = [
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
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[9px] text-muted-foreground">{data.config?.persona || "sdr"} · {data.config?.objective || "qualificar"}</span>
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

// ─── AI AGENT CONFIG ───
function AIAgentConfig({ config, updateConfig }: { config: NodeConfig; updateConfig: (key: string, value: any) => void }) {
  const [integrations, setIntegrations] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("ai_integrations").select("id, name, provider, model, status")
      .eq("status", "active").then(({ data }) => setIntegrations(data || []));
  }, []);

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
                  <SelectItem value="qualificacao">Qualificação</SelectItem>
                  <SelectItem value="orcamento_enviado">Orçamento Enviado</SelectItem>
                  <SelectItem value="negociacao">Negociação</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
                  <SelectItem value="pos_venda">Pós-venda</SelectItem>
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
function FlowList({ flows, onSelect, onCreate, onUseTemplate, loading }: {
  flows: any[]; onSelect: (f: any) => void; onCreate: () => void; onUseTemplate: (t: typeof TEMPLATES[0]) => void; loading: boolean;
}) {
  const [tab, setTab] = useState<"flows" | "templates">("flows");
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate("/livechat")}><ChevronLeft className="w-4 h-4" /></Button>
        <h1 className="font-bold text-lg">🧩 Automação / Agentes</h1>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => navigate("/livechat/integrations")} className="text-xs">
          <Plug className="w-3 h-3 mr-1" /> Integrações IA
        </Button>
      </div>
      <div className="flex border-b">
        <button className={cn("flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors", tab === "flows" ? "border-primary text-primary" : "border-transparent text-muted-foreground")} onClick={() => setTab("flows")}>Meus Fluxos</button>
        <button className={cn("flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors", tab === "templates" ? "border-primary text-primary" : "border-transparent text-muted-foreground")} onClick={() => setTab("templates")}>Templates</button>
      </div>
      <ScrollArea className="flex-1 p-3">
        {tab === "flows" ? (
          <div className="space-y-2">
            <Button onClick={onCreate} className="w-full mb-3" size="sm"><Plus className="w-4 h-4 mr-1" /> Novo Fluxo</Button>
            {loading && <p className="text-xs text-muted-foreground text-center py-4">Carregando...</p>}
            {!loading && flows.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">Nenhum fluxo criado.<br/>Comece com um template!</p>}
            {flows.map((f) => (
              <Card key={f.id} className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all" onClick={() => onSelect(f)}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{f.name}</span>
                    <Badge variant={f.status === "active" ? "default" : f.status === "paused" ? "secondary" : "outline"} className="text-[10px]">
                      {f.status === "active" ? "🟢 Ativo" : f.status === "paused" ? "⏸ Pausado" : "🟡 Rascunho"}
                    </Badge>
                  </div>
                  {f.description && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{f.description}</p>}
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
      <Card className="w-52 shadow-xl border-border/50 backdrop-blur-sm bg-card/95">
        <CardHeader className="p-2.5 pb-1">
          <CardTitle className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Blocos</CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-0 space-y-0.5">
          {NODE_LIBRARY.map((n) => (
            <div key={n.type} draggable onDragStart={(e) => onDragStart(e, n.type)}
              className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-accent/10 cursor-grab active:cursor-grabbing transition-all duration-150 text-xs group">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm transition-transform group-hover:scale-110"
                style={{ background: `linear-gradient(135deg, ${n.color}, ${n.color}cc)` }}>
                <n.icon className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <span className="font-medium block text-xs">{n.label}</span>
                <span className="text-[9px] text-muted-foreground">{n.description.split(" ").slice(0, 3).join(" ")}</span>
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
    const isYes = sourceHandle === "yes";
    const isNo = sourceHandle === "no";
    return {
      id: `e-${source}-${target}-${Date.now()}`,
      source, target,
      sourceHandle: sourceHandle || "out",
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
      id: n.id, type: n.node_type, position: { x: n.position_x, y: n.position_y },
      data: { label: n.label, nodeType: n.node_type, config: n.config, description: getNodeDescription(n.node_type, n.config) },
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
      data: { label: n.label, nodeType: n.type, config: n.config, description: getNodeDescription(n.type, n.config) },
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
        const nodeRows = nodes.map((n) => ({
          id: n.id.startsWith("new-") ? undefined : n.id,
          flow_id: flowId, node_type: (n.data as any)?.nodeType || n.type || "trigger",
          label: (n.data as any)?.label || "", config: (n.data as any)?.config || {},
          position_x: n.position.x, position_y: n.position.y,
        }));
        const { data: savedNodes, error: nErr } = await supabase.from("automation_nodes").insert(nodeRows).select();
        if (nErr) throw nErr;
        const idMap: Record<string, string> = {};
        nodeRows.forEach((_, i) => { idMap[nodes[i].id] = savedNodes![i].id; });
        if (edges.length > 0) {
          const edgeRows = edges.map((e) => ({
            flow_id: flowId, source_node_id: idMap[e.source] || e.source, target_node_id: idMap[e.target] || e.target,
            source_handle: e.sourceHandle, target_handle: e.targetHandle, label: e.label as string || null,
          }));
          const { error: eErr } = await supabase.from("automation_edges").insert(edgeRows);
          if (eErr) throw eErr;
        }
        setNodes(nodes.map((n, i) => ({ ...n, id: savedNodes![i].id })));
        setEdges(edges.map((e) => ({ ...e, source: idMap[e.source] || e.source, target: idMap[e.target] || e.target })));
      }
      toast.success("Fluxo salvo!");
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

  if (!showCanvas) {
    return <FlowList flows={flows} onSelect={loadFlow} onCreate={createNewFlow} onUseTemplate={useTemplate} loading={false} />;
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
        <div className="flex-1" />
        <Button variant={testMode ? "default" : "outline"} size="sm" onClick={() => { setTestMode(!testMode); if (testMode) { setTestRunning(false); setTestStep(0); } }} className="text-xs h-8">
          <FlaskConical className="w-3 h-3 mr-1" /> {testMode ? "Sair Teste" : "Testar"}
        </Button>
        <Button size="sm" onClick={saveFlow} disabled={saving} className="text-xs h-8">
          <Save className="w-3 h-3 mr-1" /> {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {/* CANVAS */}
      <div className="flex flex-1 overflow-hidden">
        <div ref={reactFlowWrapper} className="flex-1" onDragOver={onDragOver} onDrop={onDrop}>
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
            panOnScroll
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
            {testMode && (
              <TestPanel
                isRunning={testRunning}
                currentStep={testStep}
                steps={getTestNodeIds(nodes, edges).map((id) => {
                  const n = nodes.find((nd) => nd.id === id);
                  return (n?.data as any)?.label || id;
                })}
                onClose={() => { setTestMode(false); setTestRunning(false); setTestStep(0); }}
                onStart={startTest}
              />
            )}
          </ReactFlow>
        </div>

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
