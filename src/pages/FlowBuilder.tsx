import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ReactFlow, Background, Controls, MiniMap, Panel,
  addEdge, useNodesState, useEdgesState,
  Connection, Edge, Node, MarkerType,
  BackgroundVariant,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ChevronLeft, Save, Play, Pause, Upload, Plus, Trash2, Copy,
  MessageSquare, Zap, GitBranch, Tag, ArrowRightLeft, Sparkles, UserCheck,
  FileText, Settings2, X, LayoutTemplate, Search,
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
import { cn } from "@/lib/utils";

// ─── NODE TYPE DEFINITIONS ───
const NODE_LIBRARY = [
  { type: "trigger", label: "Gatilho", icon: Zap, color: "hsl(var(--chart-4))", description: "Inicia o fluxo" },
  { type: "message", label: "Mensagem", icon: MessageSquare, color: "hsl(var(--chart-1))", description: "Envia texto" },
  { type: "condition", label: "Condição", icon: GitBranch, color: "hsl(var(--chart-3))", description: "IF / ELSE" },
  { type: "action_tag", label: "Aplicar Tag", icon: Tag, color: "hsl(var(--chart-2))", description: "Adiciona tag" },
  { type: "action_funnel", label: "Mover Funil", icon: ArrowRightLeft, color: "hsl(var(--chart-5))", description: "Altera etapa" },
  { type: "ai_agent", label: "Agente IA", icon: Sparkles, color: "hsl(280 80% 60%)", description: "NatLeva Intelligence" },
  { type: "handoff", label: "Transferir", icon: UserCheck, color: "hsl(var(--muted-foreground))", description: "Para humano" },
] as const;

type NodeConfig = Record<string, any>;

// ─── TEMPLATES ───
const TEMPLATES = [
  {
    name: "Qualificação Dubai",
    category: "qualificacao",
    description: "Qualifica leads interessados em Dubai automaticamente",
    nodes: [
      { id: "t1", type: "trigger", label: "Nova mensagem", position: { x: 250, y: 0 }, config: { trigger_type: "keyword", keywords: ["dubai", "emirados", "abu dhabi"] } },
      { id: "n1", type: "ai_agent", label: "IA Qualifica", position: { x: 250, y: 120 }, config: { persona: "sdr", objective: "qualificar", style: "premium", send_mode: "suggest" } },
      { id: "n2", type: "action_tag", label: "Tag Dubai", position: { x: 250, y: 240 }, config: { tags: ["Dubai", "Internacional", "Alto Ticket"] } },
      { id: "n3", type: "action_funnel", label: "Qualificação", position: { x: 250, y: 360 }, config: { funnel_stage: "qualificacao" } },
      { id: "n4", type: "condition", label: "É VIP?", position: { x: 250, y: 480 }, config: { field: "score", operator: "greater_than", value: "70" } },
      { id: "n5", type: "handoff", label: "→ Vendedor VIP", position: { x: 80, y: 620 }, config: { queue: "vendas_vip", notify: true } },
      { id: "n6", type: "message", label: "Msg padrão", position: { x: 420, y: 620 }, config: { text: "Olá {nome}! 🏙️ Temos pacotes incríveis para Dubai! Posso te ajudar?" } },
    ],
    edges: [
      { source: "t1", target: "n1" }, { source: "n1", target: "n2" }, { source: "n2", target: "n3" },
      { source: "n3", target: "n4" }, { source: "n4", target: "n5", sourceHandle: "yes", label: "Sim" },
      { source: "n4", target: "n6", sourceHandle: "no", label: "Não" },
    ],
  },
  {
    name: "Qualificação Europa",
    category: "qualificacao",
    description: "Funil para leads de viagens à Europa",
    nodes: [
      { id: "t1", type: "trigger", label: "Palavra-chave Europa", position: { x: 250, y: 0 }, config: { trigger_type: "keyword", keywords: ["europa", "paris", "londres", "roma", "itália", "espanha", "portugal"] } },
      { id: "n1", type: "message", label: "Boas-vindas", position: { x: 250, y: 120 }, config: { text: "Olá {nome}! ✈️ A Europa é um destino incrível! Para qual cidade você gostaria de ir?" } },
      { id: "n2", type: "ai_agent", label: "IA analisa", position: { x: 250, y: 240 }, config: { persona: "vendas", objective: "qualificar", style: "premium", send_mode: "suggest" } },
      { id: "n3", type: "action_tag", label: "Tags", position: { x: 250, y: 360 }, config: { tags: ["Europa", "Internacional"] } },
      { id: "n4", type: "action_funnel", label: "→ Qualificação", position: { x: 250, y: 480 }, config: { funnel_stage: "qualificacao" } },
      { id: "n5", type: "handoff", label: "→ Vendedor", position: { x: 250, y: 600 }, config: { queue: "vendas", notify: true } },
    ],
    edges: [
      { source: "t1", target: "n1" }, { source: "n1", target: "n2" }, { source: "n2", target: "n3" },
      { source: "n3", target: "n4" }, { source: "n4", target: "n5" },
    ],
  },
  {
    name: "Cobrança de Documentos",
    category: "pos_venda",
    description: "Cobra documentos pendentes automaticamente",
    nodes: [
      { id: "t1", type: "trigger", label: "Sem docs há 3d", position: { x: 250, y: 0 }, config: { trigger_type: "no_response", timeout_minutes: 4320 } },
      { id: "n1", type: "message", label: "Lembrete 1", position: { x: 250, y: 120 }, config: { text: "Olá {nome}! 📋 Lembrete: ainda precisamos dos seus documentos para finalizar a viagem. Pode nos enviar?" } },
      { id: "n2", type: "condition", label: "Respondeu?", position: { x: 250, y: 260 }, config: { field: "last_response", operator: "exists", value: "" } },
      { id: "n3", type: "action_tag", label: "Tag Urgente", position: { x: 80, y: 400 }, config: { tags: ["Documento Pendente", "Urgente"] } },
      { id: "n4", type: "handoff", label: "→ Operação", position: { x: 80, y: 520 }, config: { queue: "operacao", notify: true } },
      { id: "n5", type: "action_funnel", label: "Docs OK", position: { x: 420, y: 400 }, config: { funnel_stage: "pos_venda" } },
    ],
    edges: [
      { source: "t1", target: "n1" }, { source: "n1", target: "n2" },
      { source: "n2", target: "n3", sourceHandle: "no", label: "Não" },
      { source: "n2", target: "n5", sourceHandle: "yes", label: "Sim" },
      { source: "n3", target: "n4" },
    ],
  },
];

// ─── CUSTOM NODE COMPONENT ───
function FlowNode({ data, selected }: { data: any; selected: boolean }) {
  const def = NODE_LIBRARY.find((n) => n.type === data.nodeType) || NODE_LIBRARY[0];
  const Icon = def.icon;

  return (
    <div
      className={cn(
        "rounded-xl border-2 bg-card shadow-lg min-w-[180px] max-w-[220px] transition-all",
        selected ? "border-primary ring-2 ring-primary/30 shadow-xl" : "border-border hover:border-primary/50"
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2 rounded-t-[10px]" style={{ background: def.color + "20" }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: def.color }}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="text-xs font-semibold truncate">{data.label || def.label}</span>
      </div>
      <div className="px-3 py-2">
        <p className="text-[10px] text-muted-foreground line-clamp-2">
          {data.description || def.description}
        </p>
      </div>
      {/* Handles are rendered by ReactFlow based on node type */}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  trigger: FlowNode,
  message: FlowNode,
  condition: FlowNode,
  action_tag: FlowNode,
  action_funnel: FlowNode,
  ai_agent: FlowNode,
  handoff: FlowNode,
};

// ─── CONFIG PANEL ───
function ConfigPanel({
  node,
  onUpdate,
  onClose,
  onDelete,
}: {
  node: Node;
  onUpdate: (id: string, data: any) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const config = (node.data?.config || {}) as NodeConfig;
  const nodeType = node.data?.nodeType as string;

  const updateConfig = (key: string, value: any) => {
    onUpdate(node.id, { ...node.data, config: { ...config, [key]: value } });
  };
  const updateLabel = (label: string) => {
    onUpdate(node.id, { ...node.data, label });
  };

  return (
    <div className="w-80 border-l bg-card h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Settings2 className="w-4 h-4" /> Configurar Bloco
        </h3>
        <Button size="icon" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Nome do bloco</Label>
            <Input value={(node.data?.label as string) || ""} onChange={(e) => updateLabel(e.target.value)} className="mt-1" />
          </div>
          <Separator />

          {/* TRIGGER CONFIG */}
          {nodeType === "trigger" && (
            <>
              <div>
                <Label className="text-xs">Tipo de gatilho</Label>
                <Select value={config.trigger_type || "new_message"} onValueChange={(v) => updateConfig("trigger_type", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
                  <Label className="text-xs">Palavras-chave (separadas por vírgula)</Label>
                  <Input
                    value={(config.keywords || []).join(", ")}
                    onChange={(e) => updateConfig("keywords", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
                    className="mt-1" placeholder="dubai, paris, orlando"
                  />
                </div>
              )}
              {config.trigger_type === "no_response" && (
                <div>
                  <Label className="text-xs">Timeout (minutos)</Label>
                  <Input type="number" value={config.timeout_minutes || 60} onChange={(e) => updateConfig("timeout_minutes", Number(e.target.value))} className="mt-1" />
                </div>
              )}
            </>
          )}

          {/* MESSAGE CONFIG */}
          {nodeType === "message" && (
            <>
              <div>
                <Label className="text-xs">Texto da mensagem</Label>
                <Textarea
                  value={config.text || ""}
                  onChange={(e) => updateConfig("text", e.target.value)}
                  className="mt-1 min-h-[100px]"
                  placeholder="Olá {nome}! Como posso ajudar?"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Variáveis: {"{nome}"}, {"{destino}"}, {"{datas}"}, {"{qtd_pessoas}"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={config.require_approval || false} onCheckedChange={(v) => updateConfig("require_approval", v)} />
                <Label className="text-xs">Requer aprovação humana</Label>
              </div>
            </>
          )}

          {/* CONDITION CONFIG */}
          {nodeType === "condition" && (
            <>
              <div>
                <Label className="text-xs">Campo</Label>
                <Select value={config.field || "keyword"} onValueChange={(v) => updateConfig("field", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keyword">Palavra na mensagem</SelectItem>
                    <SelectItem value="score">Score do cliente</SelectItem>
                    <SelectItem value="tag">Tag</SelectItem>
                    <SelectItem value="funnel_stage">Etapa do funil</SelectItem>
                    <SelectItem value="is_vip">É VIP</SelectItem>
                    <SelectItem value="destination">Destino</SelectItem>
                    <SelectItem value="budget">Orçamento</SelectItem>
                    <SelectItem value="last_response">Última resposta</SelectItem>
                    <SelectItem value="inactive_days">Dias inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Operador</Label>
                <Select value={config.operator || "contains"} onValueChange={(v) => updateConfig("operator", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
                <Input value={config.value || ""} onChange={(e) => updateConfig("value", e.target.value)} className="mt-1" placeholder="Ex: dubai, 70, true" />
              </div>
            </>
          )}

          {/* TAG CONFIG */}
          {nodeType === "action_tag" && (
            <div>
              <Label className="text-xs">Tags (separadas por vírgula)</Label>
              <Input
                value={(config.tags || []).join(", ")}
                onChange={(e) => updateConfig("tags", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
                className="mt-1" placeholder="Dubai, VIP, Urgente"
              />
            </div>
          )}

          {/* FUNNEL CONFIG */}
          {nodeType === "action_funnel" && (
            <div>
              <Label className="text-xs">Etapa do funil</Label>
              <Select value={config.funnel_stage || "novo_lead"} onValueChange={(v) => updateConfig("funnel_stage", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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

          {/* AI AGENT CONFIG */}
          {nodeType === "ai_agent" && (
            <>
              <div>
                <Label className="text-xs">Persona</Label>
                <Select value={config.persona || "sdr"} onValueChange={(v) => updateConfig("persona", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sdr">SDR (Qualificação)</SelectItem>
                    <SelectItem value="vendas">Vendas</SelectItem>
                    <SelectItem value="concierge">Concierge</SelectItem>
                    <SelectItem value="pos_venda">Pós-venda</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Objetivo</Label>
                <Select value={config.objective || "qualificar"} onValueChange={(v) => updateConfig("objective", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qualificar">Qualificar lead</SelectItem>
                    <SelectItem value="responder">Responder dúvida</SelectItem>
                    <SelectItem value="cobrar_docs">Cobrar documentos</SelectItem>
                    <SelectItem value="vender">Vender</SelectItem>
                    <SelectItem value="resolver">Resolver problema</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Estilo</Label>
                <Select value={config.style || "premium"} onValueChange={(v) => updateConfig("style", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="premium">Premium NatLeva</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="direto">Direto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Modo de envio</Label>
                <Select value={config.send_mode || "suggest"} onValueChange={(v) => updateConfig("send_mode", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suggest">Apenas sugerir</SelectItem>
                    <SelectItem value="approve">Enviar com aprovação</SelectItem>
                    <SelectItem value="auto">Enviar automático</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={config.use_knowledge_base || false} onCheckedChange={(v) => updateConfig("use_knowledge_base", v)} />
                <Label className="text-xs">Consultar base de conhecimento</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={config.use_web_search || false} onCheckedChange={(v) => updateConfig("use_web_search", v)} />
                <Label className="text-xs">Pesquisa web (se permitido)</Label>
              </div>
            </>
          )}

          {/* HANDOFF CONFIG */}
          {nodeType === "handoff" && (
            <>
              <div>
                <Label className="text-xs">Fila de destino</Label>
                <Select value={config.queue || "vendas"} onValueChange={(v) => updateConfig("queue", v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
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
                <Switch checked={config.notify || false} onCheckedChange={(v) => updateConfig("notify", v)} />
                <Label className="text-xs">Notificar responsável</Label>
              </div>
            </>
          )}

          <Separator />
          <Button variant="destructive" size="sm" className="w-full" onClick={() => onDelete(node.id)}>
            <Trash2 className="w-3 h-3 mr-1" /> Remover bloco
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── FLOW LIST ───
function FlowList({
  flows,
  onSelect,
  onCreate,
  onUseTemplate,
  loading,
}: {
  flows: any[];
  onSelect: (f: any) => void;
  onCreate: () => void;
  onUseTemplate: (t: typeof TEMPLATES[0]) => void;
  loading: boolean;
}) {
  const [tab, setTab] = useState<"flows" | "templates">("flows");
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={() => navigate("/livechat")}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h1 className="font-bold text-lg">🧩 Automação / Agentes</h1>
      </div>

      <div className="flex border-b">
        <button className={cn("flex-1 py-2 text-sm font-medium border-b-2 transition-colors", tab === "flows" ? "border-primary text-primary" : "border-transparent text-muted-foreground")} onClick={() => setTab("flows")}>
          Meus Fluxos
        </button>
        <button className={cn("flex-1 py-2 text-sm font-medium border-b-2 transition-colors", tab === "templates" ? "border-primary text-primary" : "border-transparent text-muted-foreground")} onClick={() => setTab("templates")}>
          Templates
        </button>
      </div>

      <ScrollArea className="flex-1 p-3">
        {tab === "flows" ? (
          <div className="space-y-2">
            <Button onClick={onCreate} className="w-full mb-3" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Novo Fluxo
            </Button>
            {loading && <p className="text-xs text-muted-foreground text-center py-4">Carregando...</p>}
            {!loading && flows.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhum fluxo criado ainda.<br />Comece com um template!</p>
            )}
            {flows.map((f) => (
              <Card key={f.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => onSelect(f)}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{f.name}</span>
                    <Badge variant={f.status === "active" ? "default" : f.status === "paused" ? "secondary" : "outline"} className="text-[10px]">
                      {f.status === "active" ? "Ativo" : f.status === "paused" ? "Pausado" : "Rascunho"}
                    </Badge>
                  </div>
                  {f.description && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{f.description}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">v{f.version}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {TEMPLATES.map((t, i) => (
              <Card key={i} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => onUseTemplate(t)}>
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

// ─── DRAG SIDEBAR ───
function NodeLibrary() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <Panel position="top-left" className="!m-2">
      <Card className="w-48 shadow-xl">
        <CardHeader className="p-2 pb-1">
          <CardTitle className="text-xs">Blocos</CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-0 space-y-1">
          {NODE_LIBRARY.map((n) => (
            <div
              key={n.type}
              draggable
              onDragStart={(e) => onDragStart(e, n.type)}
              className="flex items-center gap-2 p-1.5 rounded-md hover:bg-accent cursor-grab active:cursor-grabbing transition-colors text-xs"
            >
              <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: n.color }}>
                <n.icon className="w-3 h-3 text-white" />
              </div>
              <span>{n.label}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </Panel>
  );
}

// ─── MAIN PAGE ───
export default function FlowBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const [flows, setFlows] = useState<any[]>([]);
  const [loadingFlows, setLoadingFlows] = useState(true);
  const [currentFlow, setCurrentFlow] = useState<any | null>(null);
  const [flowName, setFlowName] = useState("Novo Fluxo");
  const [flowDesc, setFlowDesc] = useState("");
  const [flowStatus, setFlowStatus] = useState("draft");
  const [saving, setSaving] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const [showCanvas, setShowCanvas] = useState(false);

  // Load flows
  useEffect(() => {
    loadFlows();
  }, []);

  const loadFlows = async () => {
    setLoadingFlows(true);
    const { data } = await supabase.from("automation_flows").select("*").eq("is_template", false).order("updated_at", { ascending: false });
    setFlows(data || []);
    setLoadingFlows(false);
  };

  // Load flow data
  const loadFlow = async (flow: any) => {
    setCurrentFlow(flow);
    setFlowName(flow.name);
    setFlowDesc(flow.description || "");
    setFlowStatus(flow.status);

    const { data: nodesData } = await supabase.from("automation_nodes").select("*").eq("flow_id", flow.id);
    const { data: edgesData } = await supabase.from("automation_edges").select("*").eq("flow_id", flow.id);

    const rfNodes: Node[] = (nodesData || []).map((n: any) => ({
      id: n.id,
      type: n.node_type,
      position: { x: n.position_x, y: n.position_y },
      data: { label: n.label, nodeType: n.node_type, config: n.config, description: getNodeDescription(n.node_type, n.config) },
    }));

    const rfEdges: Edge[] = (edgesData || []).map((e: any) => ({
      id: e.id,
      source: e.source_node_id,
      target: e.target_node_id,
      sourceHandle: e.source_handle,
      targetHandle: e.target_handle,
      label: e.label,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 2 },
      animated: true,
    }));

    setNodes(rfNodes);
    setEdges(rfEdges);
    setSelectedNode(null);
    setShowCanvas(true);
  };

  const getNodeDescription = (type: string, config: any): string => {
    if (type === "message" && config?.text) return config.text.substring(0, 50) + "...";
    if (type === "condition" && config?.field) return `${config.field} ${config.operator} ${config.value}`;
    if (type === "action_tag" && config?.tags) return (config.tags as string[]).join(", ");
    if (type === "ai_agent" && config?.persona) return `${config.persona} - ${config.objective}`;
    return "";
  };

  // Create new flow
  const createNewFlow = async () => {
    setCurrentFlow(null);
    setFlowName("Novo Fluxo");
    setFlowDesc("");
    setFlowStatus("draft");
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setShowCanvas(true);
  };

  // Use template
  const useTemplate = (template: typeof TEMPLATES[0]) => {
    setCurrentFlow(null);
    setFlowName(template.name);
    setFlowDesc(template.description);
    setFlowStatus("draft");

    const rfNodes: Node[] = template.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: { label: n.label, nodeType: n.type, config: n.config, description: getNodeDescription(n.type, n.config) },
    }));

    const rfEdges: Edge[] = template.edges.map((e, i) => ({
      id: `e-${i}`,
      source: e.source,
      target: e.target,
      sourceHandle: (e as any).sourceHandle,
      label: (e as any).label,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 2 },
      animated: true,
    }));

    setNodes(rfNodes);
    setEdges(rfEdges);
    setSelectedNode(null);
    setShowCanvas(true);
  };

  // Save flow
  const saveFlow = async () => {
    setSaving(true);
    try {
      let flowId = currentFlow?.id;

      if (!flowId) {
        const { data, error } = await supabase.from("automation_flows").insert({ name: flowName, description: flowDesc, status: flowStatus }).select().single();
        if (error) throw error;
        flowId = data.id;
        setCurrentFlow(data);
      } else {
        await supabase.from("automation_flows").update({ name: flowName, description: flowDesc, status: flowStatus, updated_at: new Date().toISOString() }).eq("id", flowId);
      }

      // Clear existing nodes/edges
      await supabase.from("automation_edges").delete().eq("flow_id", flowId);
      await supabase.from("automation_nodes").delete().eq("flow_id", flowId);

      // Insert nodes
      if (nodes.length > 0) {
        const nodeRows = nodes.map((n) => ({
          id: n.id.startsWith("new-") ? undefined : n.id,
          flow_id: flowId,
          node_type: (n.data as any)?.nodeType || n.type || "trigger",
          label: (n.data as any)?.label || "",
          config: (n.data as any)?.config || {},
          position_x: n.position.x,
          position_y: n.position.y,
        }));

        const { data: savedNodes, error: nErr } = await supabase.from("automation_nodes").insert(nodeRows).select();
        if (nErr) throw nErr;

        // Map old IDs to new IDs
        const idMap: Record<string, string> = {};
        nodeRows.forEach((nr, i) => {
          const oldId = nodes[i].id;
          const newId = savedNodes![i].id;
          idMap[oldId] = newId;
        });

        // Insert edges with mapped IDs
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

        // Update node IDs in state
        setNodes(nodes.map((n, i) => ({ ...n, id: savedNodes![i].id })));
        setEdges(edges.map((e) => ({ ...e, source: idMap[e.source] || e.source, target: idMap[e.target] || e.target })));
      }

      toast.success("Fluxo salvo com sucesso!");
      loadFlows();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Connect edges
  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 }, animated: true }, eds));
  }, [setEdges]);

  // Drop new node
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/reactflow");
    if (!type) return;

    const bounds = reactFlowWrapper.current?.getBoundingClientRect();
    if (!bounds) return;

    const position = {
      x: event.clientX - bounds.left - 90,
      y: event.clientY - bounds.top - 30,
    };

    const def = NODE_LIBRARY.find((n) => n.type === type);
    const newNode: Node = {
      id: `new-${Date.now()}`,
      type,
      position,
      data: { label: def?.label || type, nodeType: type, config: {}, description: def?.description || "" },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  // Select node
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Update node data
  const updateNodeData = useCallback((id: string, data: any) => {
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...data, description: getNodeDescription(data.nodeType, data.config) } } : n)));
    setSelectedNode((prev) => (prev && prev.id === id ? { ...prev, data: { ...data, description: getNodeDescription(data.nodeType, data.config) } } : prev));
  }, [setNodes]);

  // Delete node
  const deleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  // ─── RENDER ───
  if (!showCanvas) {
    return (
      <div className="h-[calc(100vh-64px)] bg-background">
        <FlowList flows={flows} onSelect={loadFlow} onCreate={createNewFlow} onUseTemplate={useTemplate} loading={loadingFlows} />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-background">
      {/* TOP BAR */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-card flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={() => { setShowCanvas(false); setSelectedNode(null); }}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Input value={flowName} onChange={(e) => setFlowName(e.target.value)} className="max-w-[200px] h-8 text-sm font-semibold" />
        <Select value={flowStatus} onValueChange={setFlowStatus}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">🟡 Rascunho</SelectItem>
            <SelectItem value="active">🟢 Ativo</SelectItem>
            <SelectItem value="paused">⏸ Pausado</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => toast.info("Simulação em breve!")} className="text-xs">
          <Play className="w-3 h-3 mr-1" /> Testar
        </Button>
        <Button size="sm" onClick={saveFlow} disabled={saving} className="text-xs">
          <Save className="w-3 h-3 mr-1" /> {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {/* CANVAS + CONFIG PANEL */}
      <div className="flex flex-1 overflow-hidden">
        <div ref={reactFlowWrapper} className="flex-1" onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-muted/30"
            defaultEdgeOptions={{ markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 2 }, animated: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} className="!bg-background" />
            <Controls className="!bg-card !border !rounded-lg !shadow-lg" />
            <MiniMap className="!bg-card !border !rounded-lg !shadow-lg" nodeStrokeWidth={3} />
            <NodeLibrary />
          </ReactFlow>
        </div>

        {selectedNode && (
          <ConfigPanel
            node={selectedNode}
            onUpdate={updateNodeData}
            onClose={() => setSelectedNode(null)}
            onDelete={deleteNode}
          />
        )}
      </div>
    </div>
  );
}
