import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Workflow, Clock, CheckCircle2, Pause, Trash2, Copy, Network, ArrowRight, Pencil, Ban } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Flow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
}

interface RouterRule {
  id: string;
  flow_id: string;
  label: string;
  keywords: string[];
  priority: number;
  is_active: boolean;
  exclude_keyword: string | null;
  exclude_message: string | null;
}

interface Props {
  onOpenFlow: (flow: Flow) => void;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline"; icon: React.ElementType }> = {
  rascunho: { label: "Rascunho", variant: "secondary", icon: Clock },
  ativo: { label: "Ativo", variant: "default", icon: CheckCircle2 },
  pausado: { label: "Pausado", variant: "outline", icon: Pause },
};

export function FlowListPage({ onOpenFlow }: Props) {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // Router state
  const [routerRules, setRouterRules] = useState<RouterRule[]>([]);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRuleLabel, setNewRuleLabel] = useState("");
  const [newRuleKeywords, setNewRuleKeywords] = useState("");
  const [newRuleFlowId, setNewRuleFlowId] = useState("");
  const [newRuleExcludeKeyword, setNewRuleExcludeKeyword] = useState("");
  const [newRuleExcludeMessage, setNewRuleExcludeMessage] = useState("");

  // Inline editing
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  const [editingFlowName, setEditingFlowName] = useState("");
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingRuleData, setEditingRuleData] = useState<{ label: string; keywords: string; flowId: string; excludeKeyword: string; excludeMessage: string }>({ label: "", keywords: "", flowId: "", excludeKeyword: "", excludeMessage: "" });
  const flowNameRef = useRef<HTMLInputElement>(null);

  // Delete confirmation
  const [deleteFlowId, setDeleteFlowId] = useState<string | null>(null);
  const [deleteFlowName, setDeleteFlowName] = useState("");

  useEffect(() => { fetchFlows(); fetchRouterRules(); }, []);

  useEffect(() => {
    if (editingFlowId && flowNameRef.current) flowNameRef.current.focus();
  }, [editingFlowId]);


  const fetchFlows = async () => {
    setLoading(true);
    const { data } = await supabase.from("flows").select("*").order("updated_at", { ascending: false });
    setFlows(data || []);
    setLoading(false);
  };

  const fetchRouterRules = async () => {
    const { data } = await supabase
      .from("flow_router_rules")
      .select("*")
      .order("priority", { ascending: true });
    setRouterRules((data as any[]) || []);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const { data, error } = await supabase.from("flows").insert({ name: newName, description: newDesc || null }).select().single();
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setShowCreate(false);
    setNewName("");
    setNewDesc("");
    if (data) onOpenFlow(data);
    toast({ title: "Fluxo criado", description: `"${newName}" está pronto para edição.` });
  };

  const confirmDelete = (flow: Flow, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteFlowId(flow.id);
    setDeleteFlowName(flow.name);
  };

  const handleDelete = async () => {
    if (!deleteFlowId) return;
    await supabase.from("flows").delete().eq("id", deleteFlowId);
    setFlows(prev => prev.filter(f => f.id !== deleteFlowId));
    setDeleteFlowId(null);
    toast({ title: "Fluxo excluído" });
  };

  const handleDuplicate = async (flow: Flow, e: React.MouseEvent) => {
    e.stopPropagation();
    const { data } = await supabase.from("flows").insert({
      name: `${flow.name} (cópia)`,
      description: flow.description,
      status: "rascunho",
    }).select().single();
    if (data) {
      const [nodesRes, edgesRes] = await Promise.all([
        supabase.from("flow_nodes").select("*").eq("flow_id", flow.id),
        supabase.from("flow_edges").select("*").eq("flow_id", flow.id),
      ]);
      if (nodesRes.data?.length) {
        await supabase.from("flow_nodes").insert(
          nodesRes.data.map(n => ({ ...n, id: undefined, flow_id: data.id }))
        );
      }
      if (edgesRes.data?.length) {
        await supabase.from("flow_edges").insert(
          edgesRes.data.map(e => ({ ...e, id: undefined, flow_id: data.id }))
        );
      }
      fetchFlows();
      toast({ title: "Fluxo duplicado" });
    }
  };

  // ── Inline rename flow ──
  const startEditFlowName = (flow: Flow, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFlowId(flow.id);
    setEditingFlowName(flow.name);
  };

  const saveFlowName = async () => {
    if (!editingFlowId || !editingFlowName.trim()) { setEditingFlowId(null); return; }
    await supabase.from("flows").update({ name: editingFlowName.trim() }).eq("id", editingFlowId);
    setFlows(prev => prev.map(f => f.id === editingFlowId ? { ...f, name: editingFlowName.trim() } : f));
    setEditingFlowId(null);
    toast({ title: "Nome atualizado" });
  };

  // ── Inline edit full router rule ──
  const startEditRule = (rule: RouterRule, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRuleId(rule.id);
    setEditingRuleData({
      label: rule.label,
      keywords: rule.keywords.join(", "),
      flowId: rule.flow_id,
      excludeKeyword: rule.exclude_keyword || "",
      excludeMessage: rule.exclude_message || "",
    });
  };

  const saveRuleEdit = async () => {
    if (!editingRuleId || !editingRuleData.label.trim()) { setEditingRuleId(null); return; }
    const keywords = editingRuleData.keywords.split(",").map(k => k.trim()).filter(Boolean);
    await supabase.from("flow_router_rules").update({
      label: editingRuleData.label.trim(),
      keywords,
      flow_id: editingRuleData.flowId,
      exclude_keyword: editingRuleData.excludeKeyword.trim() || null,
      exclude_message: editingRuleData.excludeMessage.trim() || null,
    } as any).eq("id", editingRuleId);
    setRouterRules(prev => prev.map(r => r.id === editingRuleId ? {
      ...r,
      label: editingRuleData.label.trim(),
      keywords,
      flow_id: editingRuleData.flowId,
      exclude_keyword: editingRuleData.excludeKeyword.trim() || null,
      exclude_message: editingRuleData.excludeMessage.trim() || null,
    } : r));
    setEditingRuleId(null);
    toast({ title: "Rota atualizada" });
  };

  // ── Router rules CRUD ──
  const handleAddRule = async () => {
    if (!newRuleLabel.trim() || !newRuleFlowId) return;
    const keywords = newRuleKeywords.split(",").map(k => k.trim()).filter(Boolean);
    const { error } = await supabase.from("flow_router_rules").insert({
      flow_id: newRuleFlowId,
      label: newRuleLabel,
      keywords,
      priority: routerRules.length,
      exclude_keyword: newRuleExcludeKeyword.trim() || null,
      exclude_message: newRuleExcludeMessage.trim() || null,
    } as any);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setNewRuleLabel("");
    setNewRuleKeywords("");
    setNewRuleFlowId("");
    setNewRuleExcludeKeyword("");
    setNewRuleExcludeMessage("");
    setShowAddRule(false);
    fetchRouterRules();
    toast({ title: "Rota adicionada" });
  };

  const handleDeleteRule = async (id: string) => {
    await supabase.from("flow_router_rules").delete().eq("id", id);
    setRouterRules(prev => prev.filter(r => r.id !== id));
    toast({ title: "Rota removida" });
  };

  const handleToggleRule = async (id: string, isActive: boolean) => {
    await supabase.from("flow_router_rules").update({ is_active: !isActive } as any).eq("id", id);
    setRouterRules(prev => prev.map(r => r.id === id ? { ...r, is_active: !isActive } : r));
  };

  const getFlowName = (flowId: string) => flows.find(f => f.id === flowId)?.name || "Fluxo desconhecido";

  const filtered = flows.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-3rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold">Flow Builder</h2>
          <p className="text-xs text-muted-foreground">Funis & Automação — Crie e gerencie seus fluxos de atendimento</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1 text-xs">
              <Plus className="h-3.5 w-3.5" /> Novo Fluxo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar novo fluxo</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Nome</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: Boas-vindas WhatsApp" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Descrição (opcional)</Label>
                <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Descrição do fluxo..." className="mt-1" />
              </div>
              <Button onClick={handleCreate} className="w-full">Criar Fluxo</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ─── ROTEADOR CENTRAL ─── */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <Network className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold">Roteador Central</h3>
                <p className="text-[10px] text-muted-foreground">Direciona mensagens recebidas para o fluxo correto por palavra-chave</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1 border-amber-500/30 text-amber-500 hover:bg-amber-500/10"
              onClick={() => setShowAddRule(true)}
            >
              <Plus className="h-3.5 w-3.5" /> Nova Rota
            </Button>
          </div>

          {routerRules.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-border rounded-lg">
              <Network className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">Nenhuma rota configurada</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">Adicione rotas para direcionar mensagens automaticamente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {routerRules.map((rule) => (
                <div
                  key={rule.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                    rule.is_active
                      ? "border-amber-500/20 bg-card"
                      : "border-border bg-muted/30 opacity-60"
                  }`}
                >
                  <div
                    className={`h-2.5 w-2.5 rounded-full shrink-0 cursor-pointer transition-colors ${
                      rule.is_active ? "bg-amber-500" : "bg-muted-foreground/30"
                    }`}
                    onClick={() => handleToggleRule(rule.id, rule.is_active)}
                    title={rule.is_active ? "Desativar" : "Ativar"}
                  />

                  {editingRuleId === rule.id ? (
                    <div className="flex-1 min-w-0 space-y-2 py-1">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Nome</Label>
                        <Input
                          value={editingRuleData.label}
                          onChange={e => setEditingRuleData(d => ({ ...d, label: e.target.value }))}
                          className="h-7 text-xs mt-0.5"
                          autoFocus
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Palavras-chave (vírgula)</Label>
                        <Input
                          value={editingRuleData.keywords}
                          onChange={e => setEditingRuleData(d => ({ ...d, keywords: e.target.value }))}
                          className="h-7 text-xs mt-0.5 font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Fluxo destino</Label>
                        <Select value={editingRuleData.flowId} onValueChange={v => setEditingRuleData(d => ({ ...d, flowId: v }))}>
                          <SelectTrigger className="h-7 text-xs mt-0.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {flows.map(f => (
                              <SelectItem key={f.id} value={f.id} className="text-xs">{f.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Ban className="h-2.5 w-2.5 text-destructive" /> Excluir contato (opcional)
                        </Label>
                        <Input
                          value={editingRuleData.excludeKeyword}
                          onChange={e => setEditingRuleData(d => ({ ...d, excludeKeyword: e.target.value }))}
                          placeholder="Ex: #excluir"
                          className="h-7 text-xs mt-0.5"
                        />
                      </div>
                      {editingRuleData.excludeKeyword.trim() && (
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Mensagem ao excluir</Label>
                          <Input
                            value={editingRuleData.excludeMessage}
                            onChange={e => setEditingRuleData(d => ({ ...d, excludeMessage: e.target.value }))}
                            placeholder="Ex: Usuário excluído com sucesso."
                            className="h-7 text-xs mt-0.5"
                          />
                        </div>
                      )}
                      <div className="flex gap-1.5 pt-1">
                        <Button size="sm" className="h-6 text-[10px] gap-1" onClick={saveRuleEdit}>
                          <CheckCircle2 className="h-3 w-3" /> Salvar
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setEditingRuleId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{rule.label}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {rule.keywords.map((kw, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-mono">
                              {kw}
                            </span>
                          ))}
                          {rule.exclude_keyword && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive font-mono flex items-center gap-0.5">
                              <Ban className="h-2 w-2" /> {rule.exclude_keyword}
                            </span>
                          )}
                        </div>
                      </div>

                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

                      <div className="shrink-0 max-w-[140px]">
                        <Badge variant="secondary" className="text-[9px] truncate max-w-full">
                          <Workflow className="h-2.5 w-2.5 mr-1 shrink-0" />
                          {getFlowName(rule.flow_id)}
                        </Badge>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={(e) => startEditRule(rule, e)}
                        title="Editar"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteRule(rule.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Fallback info */}
          {routerRules.length > 0 && (
            <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-muted/30 border border-dashed border-border">
              <div className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
              <span className="text-[10px] text-muted-foreground">
                Mensagens sem correspondência → <span className="font-bold text-foreground">sem resposta automática</span> (atendente manual)
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Rule Dialog */}
      <Dialog open={showAddRule} onOpenChange={setShowAddRule}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Network className="h-4 w-4 text-amber-500" />
              Nova Rota
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome da rota</Label>
              <Input
                value={newRuleLabel}
                onChange={e => setNewRuleLabel(e.target.value)}
                placeholder="Ex: Interesse em veículo"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Palavras-chave (separadas por vírgula)</Label>
              <Input
                value={newRuleKeywords}
                onChange={e => setNewRuleKeywords(e.target.value)}
                placeholder="Ex: carro, veículo, informações, interesse"
                className="mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Se a mensagem do lead contiver qualquer uma dessas palavras, será direcionada para o fluxo
              </p>
            </div>
            <div>
              <Label className="text-xs">Fluxo destino</Label>
              <Select value={newRuleFlowId} onValueChange={setNewRuleFlowId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecionar fluxo..." />
                </SelectTrigger>
                <SelectContent>
                  {flows.map(f => (
                    <SelectItem key={f.id} value={f.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <Workflow className="h-3 w-3 text-muted-foreground" />
                        {f.name}
                        <Badge variant={statusConfig[f.status]?.variant || "secondary"} className="text-[8px] ml-1">
                          {statusConfig[f.status]?.label || f.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── Palavra-chave para excluir contato ── */}
            <div className="border-t border-border pt-3">
              <Label className="text-xs flex items-center gap-1.5">
                <Ban className="h-3 w-3 text-destructive" />
                Palavra-chave para excluir contato (opcional)
              </Label>
              <Input
                value={newRuleExcludeKeyword}
                onChange={e => setNewRuleExcludeKeyword(e.target.value)}
                placeholder="Ex: #excluir"
                className="mt-1"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Se o contato enviar essa palavra exata, será <span className="text-destructive font-bold">removido 100%</span> do chat automaticamente. Deixe vazio para não usar.
              </p>
            </div>

            {newRuleExcludeKeyword.trim() && (
              <div>
                <Label className="text-xs">Mensagem enviada ao excluir</Label>
                <Input
                  value={newRuleExcludeMessage}
                  onChange={e => setNewRuleExcludeMessage(e.target.value)}
                  placeholder="Ex: Usuário excluído com sucesso."
                  className="mt-1"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Essa mensagem será enviada ao contato antes de ser removido do chat.
                </p>
              </div>
            )}

            <Button
              onClick={handleAddRule}
              className="w-full"
              disabled={!newRuleLabel.trim() || !newRuleFlowId || !newRuleKeywords.trim()}
            >
              Adicionar Rota
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── FLUXOS ─── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar fluxos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Workflow className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum fluxo criado ainda</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Clique em "Novo Fluxo" para começar</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filtered.map(flow => {
            const sc = statusConfig[flow.status] || statusConfig.rascunho;
            const Icon = sc.icon;
            const linkedRules = routerRules.filter(r => r.flow_id === flow.id);
            return (
              <div
                key={flow.id}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border bg-card hover:border-primary/30 cursor-pointer transition-all group"
                onClick={() => { if (!editingFlowId) onOpenFlow(flow); }}
              >
                <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <Workflow className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {editingFlowId === flow.id ? (
                      <Input
                        ref={flowNameRef}
                        value={editingFlowName}
                        onChange={e => setEditingFlowName(e.target.value)}
                        onBlur={saveFlowName}
                        onKeyDown={e => { if (e.key === "Enter") saveFlowName(); if (e.key === "Escape") setEditingFlowId(null); }}
                        className="h-5 text-xs font-bold px-1 py-0 max-w-[180px]"
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <p
                        className="text-xs font-bold truncate inline-flex items-center gap-1 group/fname cursor-text"
                        onClick={(e) => startEditFlowName(flow, e)}
                        title="Clique para renomear"
                      >
                        {flow.name}
                        <Pencil className="h-2.5 w-2.5 opacity-0 group-hover/fname:opacity-60 transition-opacity" />
                      </p>
                    )}
                    <Badge variant={sc.variant} className="text-[8px] gap-0.5 shrink-0 px-1.5 py-0">
                      <Icon className="h-2 w-2" /> {sc.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-muted-foreground">v{flow.version}</span>
                    <span className="text-[9px] text-muted-foreground">• {new Date(flow.updated_at).toLocaleDateString("pt-BR")}</span>
                    {linkedRules.length > 0 && linkedRules.map(r => (
                      <span key={r.id} className="text-[8px] px-1 py-0 rounded-full bg-amber-500/10 text-amber-400 flex items-center gap-0.5">
                        <Network className="h-2 w-2" /> {r.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => handleDuplicate(flow, e)} title="Duplicar">
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => handleDelete(flow.id, e)} title="Excluir">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
