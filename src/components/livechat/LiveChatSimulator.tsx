import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, RotateCcw, ChevronRight, CheckCircle2, AlertTriangle, Clock, MessageSquare, Tag, ArrowRight, Zap } from "lucide-react";
import { getNodeDefinition } from "@/components/flowbuilder/nodeTypes";

interface SimStep {
  nodeId: string;
  nodeType: string;
  label: string;
  status: "pending" | "running" | "completed" | "error";
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  timestamp: string;
}

interface Flow {
  id: string;
  name: string;
}

export function LiveChatSimulator() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<SimStep[]>([]);
  const [variables, setVariables] = useState<Record<string, string>>({
    "cliente.nome": "Ricardo Mendes",
    "cliente.telefone": "+5581999001122",
    "conversa.id": "sim-001",
    "mensagem.texto": "Olá, tem SUV disponível?",
    "etapa.funil": "novo_lead",
  });
  const [tags, setTags] = useState<string[]>([]);
  const [currentStage, setCurrentStage] = useState("novo_lead");

  useEffect(() => {
    supabase.from("flows").select("id, name").order("name").then(({ data }) => {
      setFlows(data || []);
    });
  }, []);

  const runSimulation = async () => {
    if (!selectedFlowId) return;
    setIsRunning(true);
    setSteps([]);
    setTags([]);
    setCurrentStage("novo_lead");

    // Load flow nodes and edges
    const [nodesRes, edgesRes] = await Promise.all([
      supabase.from("flow_nodes").select("*").eq("flow_id", selectedFlowId),
      supabase.from("flow_edges").select("*").eq("flow_id", selectedFlowId),
    ]);

    const nodes = nodesRes.data || [];
    const edges = edgesRes.data || [];

    if (nodes.length === 0) {
      setSteps([{
        nodeId: "none",
        nodeType: "error",
        label: "Sem blocos",
        status: "error",
        input: {},
        output: { error: "Este fluxo não possui blocos. Adicione blocos no editor." },
        timestamp: new Date().toISOString(),
      }]);
      setIsRunning(false);
      return;
    }

    // Find trigger node (node with no incoming edges)
    const targetNodeIds = new Set(edges.map(e => e.target_node_id));
    const triggerNode = nodes.find(n => !targetNodeIds.has(n.node_id)) || nodes[0];

    // Walk the flow
    const visited = new Set<string>();
    let current = triggerNode;
    const simSteps: SimStep[] = [];

    while (current && !visited.has(current.node_id)) {
      visited.add(current.node_id);
      const def = getNodeDefinition(current.node_type);

      const step: SimStep = {
        nodeId: current.node_id,
        nodeType: current.node_type,
        label: current.label || def?.label || current.node_type,
        status: "running",
        input: { ...variables },
        output: {},
        timestamp: new Date().toISOString(),
      };

      simSteps.push(step);
      setSteps([...simSteps]);

      // Simulate delay
      await new Promise(r => setTimeout(r, 600));

      // Simulate node execution
      const config = (current.config as Record<string, unknown>) || {};
      if (current.node_type.startsWith("send_")) {
        const msg = String(config.message || config.caption || "").replace(/\{\{([^}]+)\}\}/g, (_, key) => variables[key.trim()] || `{{${key}}}`);
        step.output = { would_send: msg || "(mensagem vazia)" };
      } else if (current.node_type === "action_apply_tag") {
        const tag = String(config.tag_name || "");
        if (tag) {
          setTags(prev => [...new Set([...prev, tag])]);
          step.output = { tag_applied: tag };
        }
      } else if (current.node_type === "action_change_stage") {
        const stage = String(config.target_stage || "");
        if (stage) {
          setCurrentStage(stage);
          step.output = { stage_changed_to: stage };
        }
      } else if (current.node_type.startsWith("question_")) {
        step.output = { waiting_response: true, would_ask: config.question || "" };
      } else if (current.node_type === "util_delay") {
        step.output = { delay_seconds: config.delay_seconds || 0 };
      } else {
        step.output = { executed: true, config };
      }

      step.status = "completed";
      setSteps([...simSteps]);

      // Find next node via edge
      const outEdge = edges.find(e => e.source_node_id === current!.node_id);
      if (outEdge) {
        current = nodes.find(n => n.node_id === outEdge.target_node_id) || null as any;
      } else {
        current = null as any;
      }
    }

    // Log execution
    await supabase.from("flow_execution_logs").insert({
      flow_id: selectedFlowId,
      status: "simulated",
      is_simulation: true,
      execution_path: simSteps.map(s => ({ nodeId: s.nodeId, type: s.nodeType, label: s.label })),
      variables_snapshot: variables,
      completed_at: new Date().toISOString(),
    });

    setIsRunning(false);
  };

  const reset = () => {
    setSteps([]);
    setTags([]);
    setCurrentStage("novo_lead");
    setIsRunning(false);
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-extrabold">Simulador</h2>
        <p className="text-xs text-muted-foreground">Teste seus fluxos sem enviar mensagens reais (modo dry-run)</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Config */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Configuração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Fluxo</label>
              <Select value={selectedFlowId} onValueChange={setSelectedFlowId}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="Selecionar fluxo..." />
                </SelectTrigger>
                <SelectContent>
                  {flows.map(f => (
                    <SelectItem key={f.id} value={f.id} className="text-xs">{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Variáveis de contexto</label>
              <div className="space-y-1 mt-1">
                {Object.entries(variables).map(([k, v]) => (
                  <div key={k} className="flex gap-1">
                    <span className="text-[10px] text-primary font-mono w-28 shrink-0 pt-1.5">{k}</span>
                    <Input
                      value={v}
                      onChange={e => setVariables(prev => ({ ...prev, [k]: e.target.value }))}
                      className="h-7 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" className="flex-1 text-xs gap-1" onClick={runSimulation} disabled={isRunning || !selectedFlowId}>
                <Play className="h-3.5 w-3.5" /> {isRunning ? "Executando..." : "Simular"}
              </Button>
              <Button size="sm" variant="outline" className="text-xs gap-1" onClick={reset}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Execution path */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Caminho de Execução</CardTitle>
              <div className="flex items-center gap-2">
                {tags.map(t => <Badge key={t} variant="secondary" className="text-[9px]"><Tag className="h-2.5 w-2.5 mr-0.5" />{t}</Badge>)}
                <Badge variant="outline" className="text-[9px]">Etapa: {currentStage}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {steps.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Zap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Selecione um fluxo e clique "Simular" para testar</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {steps.map((step, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                          step.status === "completed" ? "bg-emerald-500/10 text-emerald-500" :
                          step.status === "error" ? "bg-destructive/10 text-destructive" :
                          step.status === "running" ? "bg-primary/10 text-primary animate-pulse" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {step.status === "completed" ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                           step.status === "error" ? <AlertTriangle className="h-3.5 w-3.5" /> :
                           <Clock className="h-3.5 w-3.5" />}
                        </div>
                        {i < steps.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                      </div>
                      <div className="flex-1 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold">{step.label}</span>
                          <span className="text-[9px] text-muted-foreground font-mono">{step.nodeType}</span>
                        </div>
                        {Object.entries(step.output).map(([k, v]) => (
                          <div key={k} className="mt-1 px-2 py-1 rounded bg-muted/50 text-[10px]">
                            <span className="text-muted-foreground">{k}:</span>{" "}
                            <span className="text-foreground font-mono">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
