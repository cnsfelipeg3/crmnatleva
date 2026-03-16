import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Trash2, Edit2, Save, X, Search, Filter,
  Brain, ChevronLeft, Sparkles, Target, BookOpen,
  DollarSign, MessageSquare, Shield, Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const CATEGORIES = [
  { value: "interpretacao_conversa", label: "Interpretação de Conversas", icon: MessageSquare },
  { value: "priorizacao_contexto", label: "Priorização de Contexto", icon: Target },
  { value: "estrutura_proposta", label: "Estrutura de Propostas", icon: BookOpen },
  { value: "roteiros_padrao", label: "Roteiros Padrão", icon: Sparkles },
  { value: "estrategia_comercial", label: "Estratégia Comercial", icon: Brain },
  { value: "calibragem_preco", label: "Calibragem de Preço", icon: DollarSign },
  { value: "boas_praticas_vendas", label: "Boas Práticas de Vendas", icon: Shield },
  { value: "geral", label: "Geral", icon: BookOpen },
];

interface StrategyRule {
  id: string;
  category: string;
  title: string;
  description: string | null;
  rule: string;
  example: string | null;
  priority: number;
  is_active: boolean;
  created_at: string;
}

const emptyRule: Omit<StrategyRule, "id" | "created_at"> = {
  category: "geral",
  title: "",
  description: null,
  rule: "",
  example: null,
  priority: 5,
  is_active: true,
};

export default function AIStrategyKnowledge() {
  const navigate = useNavigate();
  const [rules, setRules] = useState<StrategyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [editOpen, setEditOpen] = useState(false);
  const [editRule, setEditRule] = useState<Partial<StrategyRule> & typeof emptyRule>(emptyRule);
  const [saving, setSaving] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ai_strategy_knowledge")
      .select("*")
      .order("priority", { ascending: false });
    if (error) toast.error("Erro ao carregar regras");
    else setRules((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchRules(); }, []);

  const filtered = rules.filter((r) => {
    if (filterCat !== "all" && r.category !== filterCat) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.rule.toLowerCase().includes(q);
    }
    return true;
  });

  const handleSave = async () => {
    if (!editRule.title || !editRule.rule) {
      toast.error("Título e regra são obrigatórios");
      return;
    }
    setSaving(true);
    const payload = {
      category: editRule.category,
      title: editRule.title,
      description: editRule.description || null,
      rule: editRule.rule,
      example: editRule.example || null,
      priority: editRule.priority,
      is_active: editRule.is_active,
      updated_at: new Date().toISOString(),
    };

    if ((editRule as any).id) {
      const { error } = await supabase
        .from("ai_strategy_knowledge")
        .update(payload)
        .eq("id", (editRule as any).id);
      if (error) toast.error("Erro ao atualizar");
      else toast.success("Regra atualizada");
    } else {
      const { error } = await supabase
        .from("ai_strategy_knowledge")
        .insert(payload);
      if (error) toast.error("Erro ao criar");
      else toast.success("Regra criada");
    }
    setSaving(false);
    setEditOpen(false);
    fetchRules();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta regra?")) return;
    const { error } = await supabase.from("ai_strategy_knowledge").delete().eq("id", id);
    if (error) toast.error("Erro");
    else { toast.success("Excluída"); fetchRules(); }
  };

  const toggleActive = async (r: StrategyRule) => {
    await supabase.from("ai_strategy_knowledge").update({ is_active: !r.is_active, updated_at: new Date().toISOString() }).eq("id", r.id);
    fetchRules();
  };

  const catLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label || v;
  const CatIcon = (v: string) => CATEGORIES.find((c) => c.value === v)?.icon || BookOpen;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Base de Conhecimento Estratégica</h1>
          <p className="text-sm text-muted-foreground">Regras e estratégias que guiam a IA na interpretação de conversas e geração de propostas</p>
        </div>
        <div className="ml-auto">
          <Button onClick={() => { setEditRule({ ...emptyRule }); setEditOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nova Regra
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar regras..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-[220px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{rules.length}</p>
          <p className="text-xs text-muted-foreground">Total de regras</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{rules.filter((r) => r.is_active).length}</p>
          <p className="text-xs text-muted-foreground">Ativas</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{new Set(rules.map((r) => r.category)).size}</p>
          <p className="text-xs text-muted-foreground">Categorias</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{rules.filter((r) => r.priority >= 8).length}</p>
          <p className="text-xs text-muted-foreground">Alta prioridade</p>
        </CardContent></Card>
      </div>

      {/* Rules List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <ScrollArea className="h-[calc(100vh-340px)]">
          <div className="space-y-3">
            {filtered.map((r) => {
              const Icon = CatIcon(r.category);
              return (
                <Card key={r.id} className={`transition-opacity ${!r.is_active ? "opacity-50" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground text-sm">{r.title}</h3>
                          <Badge variant="outline" className="text-xs">{catLabel(r.category)}</Badge>
                          <Badge variant={r.priority >= 8 ? "default" : "secondary"} className="text-xs">
                            P{r.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{r.rule}</p>
                        {r.example && (
                          <p className="text-xs text-muted-foreground/70 mt-1 italic">Ex: {r.example}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} />
                        <Button variant="ghost" size="icon" onClick={() => { setEditRule(r as any); setEditOpen(true); }}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {!filtered.length && (
              <div className="text-center py-12 text-muted-foreground">Nenhuma regra encontrada</div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{(editRule as any).id ? "Editar Regra" : "Nova Regra"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Categoria</Label>
              <Select value={editRule.category} onValueChange={(v) => setEditRule({ ...editRule, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Título *</Label>
              <Input value={editRule.title} onChange={(e) => setEditRule({ ...editRule, title: e.target.value })} />
            </div>
            <div>
              <Label>Regra / Instrução *</Label>
              <Textarea rows={4} value={editRule.rule} onChange={(e) => setEditRule({ ...editRule, rule: e.target.value })} />
            </div>
            <div>
              <Label>Exemplo (opcional)</Label>
              <Textarea rows={2} value={editRule.example || ""} onChange={(e) => setEditRule({ ...editRule, example: e.target.value || null })} />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label>Prioridade (1-10)</Label>
                <Input type="number" min={1} max={10} value={editRule.priority} onChange={(e) => setEditRule({ ...editRule, priority: Number(e.target.value) })} />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch checked={editRule.is_active} onCheckedChange={(v) => setEditRule({ ...editRule, is_active: v })} />
                <Label>Ativa</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
