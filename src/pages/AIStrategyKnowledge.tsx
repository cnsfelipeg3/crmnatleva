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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus, Trash2, Edit2, Save, X, Search, Filter,
  Brain, ChevronLeft, Sparkles, Target, BookOpen,
  DollarSign, MessageSquare, Shield, Loader2,
  Download, Upload, Tag, Link2, Eye, EyeOff,
  CheckCircle2, Clock, AlertCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ItemOriginBadge } from "@/components/ai-team/ItemOriginBadge";
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

const FUNCTION_AREAS = [
  { value: "geral", label: "Geral" },
  { value: "interpretacao_conversa", label: "Interpretação de Conversa" },
  { value: "demanda_atual", label: "Demanda Atual" },
  { value: "memoria_viagens", label: "Memória de Viagens" },
  { value: "proposta_ia", label: "Proposta IA" },
  { value: "pacotes_estrategia", label: "Pacotes Essencial/Conforto/Premium" },
  { value: "sugestao_voos", label: "Sugestão de Voos" },
  { value: "sugestao_hoteis", label: "Sugestão de Hotéis" },
  { value: "estrategia_comercial", label: "Estratégia Comercial" },
  { value: "follow_up", label: "Follow-up" },
  { value: "probabilidade_fechamento", label: "Probabilidade de Fechamento" },
  { value: "objecoes", label: "Objeções" },
  { value: "perfil_cliente", label: "Perfil do Cliente" },
  { value: "pricing", label: "Pricing" },
  { value: "jornada_cliente", label: "Jornada do Cliente" },
  { value: "aprendizado_operacional", label: "Aprendizado Operacional" },
];

const ORIGIN_TYPES = [
  { value: "manual", label: "Manual", icon: Edit2, color: "bg-blue-500/10 text-blue-700 border-blue-200" },
  { value: "learned", label: "Aprendido pela IA", icon: Brain, color: "bg-purple-500/10 text-purple-700 border-purple-200" },
  { value: "validated", label: "Validado", icon: CheckCircle2, color: "bg-green-500/10 text-green-700 border-green-200" },
  { value: "suggested", label: "Sugerido", icon: Sparkles, color: "bg-yellow-500/10 text-yellow-700 border-yellow-200" },
  { value: "rejected", label: "Rejeitado", icon: X, color: "bg-red-500/10 text-red-700 border-red-200" },
  { value: "observing", label: "Em Observação", icon: Eye, color: "bg-orange-500/10 text-orange-700 border-orange-200" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Ativa" },
  { value: "pending", label: "Pendente" },
  { value: "validated", label: "Validada" },
  { value: "rejected", label: "Rejeitada" },
  { value: "observing", label: "Em Observação" },
];

const IMPACT_OPTIONS = [
  { value: "alto", label: "Alto" },
  { value: "médio", label: "Médio" },
  { value: "baixo", label: "Baixo" },
];

interface StrategyRule {
  id: string;
  category: string;
  subcategory: string | null;
  title: string;
  description: string | null;
  rule: string;
  example: string | null;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  tags: string[];
  function_area: string;
  origin_type: string;
  confidence: number | null;
  estimated_impact: string | null;
  context: string | null;
  related_rule_ids: string[];
  status: string;
  created_by: string | null;
}

const emptyRule: Omit<StrategyRule, "id" | "created_at" | "updated_at"> = {
  category: "geral",
  subcategory: null,
  title: "",
  description: null,
  rule: "",
  example: null,
  priority: 5,
  is_active: true,
  tags: [],
  function_area: "geral",
  origin_type: "manual",
  confidence: null,
  estimated_impact: null,
  context: null,
  related_rule_ids: [],
  status: "active",
  created_by: null,
};

export default function AIStrategyKnowledge() {
  const navigate = useNavigate();
  const [rules, setRules] = useState<StrategyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterFunction, setFilterFunction] = useState("all");
  const [filterOrigin, setFilterOrigin] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTag, setFilterTag] = useState("all");
  const [editOpen, setEditOpen] = useState(false);
  const [editRule, setEditRule] = useState<Partial<StrategyRule> & typeof emptyRule>(emptyRule);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");

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

  // Collect all unique tags for filter
  const allTags = [...new Set(rules.flatMap(r => r.tags || []))].sort();

  const filtered = rules.filter((r) => {
    if (filterCat !== "all" && r.category !== filterCat) return false;
    if (filterFunction !== "all" && r.function_area !== filterFunction) return false;
    if (filterOrigin !== "all" && r.origin_type !== filterOrigin) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (filterTag !== "all" && !(r.tags || []).includes(filterTag)) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.title.toLowerCase().includes(q) || r.rule.toLowerCase().includes(q) || (r.tags || []).some(t => t.toLowerCase().includes(q));
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
      subcategory: editRule.subcategory || null,
      title: editRule.title,
      description: editRule.description || null,
      rule: editRule.rule,
      example: editRule.example || null,
      priority: editRule.priority,
      is_active: editRule.is_active,
      tags: editRule.tags || [],
      function_area: editRule.function_area || "geral",
      origin_type: editRule.origin_type || "manual",
      confidence: editRule.confidence,
      estimated_impact: editRule.estimated_impact || null,
      context: editRule.context || null,
      related_rule_ids: editRule.related_rule_ids || [],
      status: editRule.status || "active",
      updated_at: new Date().toISOString(),
    };

    if ((editRule as any).id) {
      const { error } = await supabase
        .from("ai_strategy_knowledge")
        .update(payload as any)
        .eq("id", (editRule as any).id);
      if (error) toast.error("Erro ao atualizar");
      else {
        toast.success("Regra atualizada");
        logAITeamAudit({
          action_type: AUDIT_ACTIONS.UPDATE,
          entity_type: AUDIT_ENTITIES.RULE,
          entity_id: (editRule as any).id,
          entity_name: editRule.title,
          description: `Regra global editada: ${editRule.title}`,
          performed_by: "gestor",
          details: { category: editRule.category, priority: editRule.priority },
        });
      }
    } else {
      const { error } = await supabase
        .from("ai_strategy_knowledge")
        .insert(payload as any);
      if (error) toast.error("Erro ao criar");
      else {
        toast.success("Regra criada");
        logAITeamAudit({
          action_type: AUDIT_ACTIONS.CREATE,
          entity_type: AUDIT_ENTITIES.RULE,
          entity_name: editRule.title,
          description: `Nova regra global criada: ${editRule.title}`,
          performed_by: "gestor",
          details: { category: editRule.category, priority: editRule.priority },
        });
      }
    }
    setSaving(false);
    setEditOpen(false);
    fetchRules();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta regra?")) return;
    const rule = rules.find(r => r.id === id);
    const { error } = await supabase.from("ai_strategy_knowledge").delete().eq("id", id);
    if (error) toast.error("Erro");
    else {
      toast.success("Excluída"); fetchRules();
      logAITeamAudit({
        action_type: AUDIT_ACTIONS.DELETE,
        entity_type: AUDIT_ENTITIES.RULE,
        entity_id: id,
        entity_name: rule?.title || id,
        description: `Regra global excluída: ${rule?.title || id}`,
        performed_by: "gestor",
      });
    }
  };

  const toggleActive = async (r: StrategyRule) => {
    await supabase.from("ai_strategy_knowledge").update({ is_active: !r.is_active, updated_at: new Date().toISOString() }).eq("id", r.id);
    fetchRules();
    logAITeamAudit({
      action_type: r.is_active ? AUDIT_ACTIONS.DEACTIVATE : AUDIT_ACTIONS.ACTIVATE,
      entity_type: AUDIT_ENTITIES.RULE,
      entity_id: r.id,
      entity_name: r.title,
      description: `Regra global ${r.is_active ? "desativada" : "ativada"}: ${r.title}`,
      performed_by: "gestor",
    });
  };

  const catLabel = (v: string) => CATEGORIES.find((c) => c.value === v)?.label || v;
  const CatIcon = (v: string) => CATEGORIES.find((c) => c.value === v)?.icon || BookOpen;
  const funcLabel = (v: string) => FUNCTION_AREAS.find((f) => f.value === v)?.label || v;
  const originInfo = (v: string) => ORIGIN_TYPES.find((o) => o.value === v) || ORIGIN_TYPES[0];

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !(editRule.tags || []).includes(t)) {
      setEditRule({ ...editRule, tags: [...(editRule.tags || []), t] });
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setEditRule({ ...editRule, tags: (editRule.tags || []).filter(t => t !== tag) });
  };

  // ─── Export to TXT ───
  const handleExport = () => {
    const grouped: Record<string, StrategyRule[]> = {};
    for (const r of rules) {
      const cat = catLabel(r.category);
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(r);
    }

    let txt = "========================================\n";
    txt += "BASE DE CONHECIMENTO ESTRATÉGICA — NATLEVA\n";
    txt += `Exportado em: ${new Date().toLocaleString("pt-BR")}\n`;
    txt += `Total de regras: ${rules.length}\n`;
    txt += "========================================\n\n";

    for (const [category, catRules] of Object.entries(grouped)) {
      const sorted = catRules.sort((a, b) => b.priority - a.priority);
      txt += `\n${"─".repeat(50)}\n`;
      txt += `📂 ${category.toUpperCase()}\n`;
      txt += `${"─".repeat(50)}\n`;
      txt += `   ${sorted.length} regra(s) nesta categoria\n\n`;

      for (const r of sorted) {
        txt += `  ┌─ ${r.title}\n`;
        txt += `  │  Prioridade: P${r.priority} | Status: ${r.is_active ? "✅ Ativa" : "❌ Inativa"} | Origem: ${originInfo(r.origin_type).label}\n`;
        txt += `  │  Função: ${funcLabel(r.function_area)} | Governança: ${r.status}\n`;
        if (r.confidence) txt += `  │  Confiança: ${r.confidence}%\n`;
        if (r.estimated_impact) txt += `  │  Impacto: ${r.estimated_impact}\n`;
        if ((r.tags || []).length > 0) txt += `  │  Tags: ${r.tags.join(", ")}\n`;
        if (r.description) txt += `  │  Descrição: ${r.description}\n`;
        if (r.context) txt += `  │  Contexto: ${r.context}\n`;
        txt += `  │\n`;
        txt += `  │  REGRA:\n`;
        for (const line of r.rule.split("\n")) {
          txt += `  │  ${line}\n`;
        }
        if (r.example) {
          txt += `  │\n`;
          txt += `  │  EXEMPLO:\n`;
          for (const line of r.example.split("\n")) {
            txt += `  │  ${line}\n`;
          }
        }
        txt += `  └${"─".repeat(40)}\n\n`;
      }
    }

    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `base-conhecimento-natleva-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rules.length} regras exportadas com sucesso`);
  };

  // ─── Import from TXT ───
  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const parsed = parseTxtRules(text);
      if (parsed.length === 0) {
        toast.error("Nenhuma regra encontrada no arquivo. Verifique o formato.");
        return;
      }
      if (!confirm(`Importar ${parsed.length} regra(s)? Regras existentes com mesmo título serão atualizadas.`)) return;

      let created = 0, updated = 0, errors = 0;
      for (const rule of parsed) {
        const { data: existing } = await supabase
          .from("ai_strategy_knowledge")
          .select("id")
          .eq("title", rule.title)
          .limit(1);

        if (existing && existing.length > 0) {
          const { error } = await supabase
            .from("ai_strategy_knowledge")
            .update({ ...rule, updated_at: new Date().toISOString() } as any)
            .eq("id", existing[0].id);
          if (error) errors++; else updated++;
        } else {
          const { error } = await supabase
            .from("ai_strategy_knowledge")
            .insert({ ...rule } as any);
          if (error) errors++; else created++;
        }
      }
      toast.success(`Importação concluída: ${created} criadas, ${updated} atualizadas${errors ? `, ${errors} erros` : ""}`);
      fetchRules();
    };
    input.click();
  };

  const parseTxtRules = (text: string): Omit<StrategyRule, "id" | "created_at" | "updated_at">[] => {
    const results: Omit<StrategyRule, "id" | "created_at" | "updated_at">[] = [];
    const catMap: Record<string, string> = {};
    for (const c of CATEGORIES) catMap[c.label.toLowerCase()] = c.value;

    const sections = text.split(/📂\s*/);
    for (const sec of sections.slice(1)) {
      const secLines = sec.split("\n");
      const catName = secLines[0]?.trim().toLowerCase();
      const cat = catMap[catName] || "geral";
      const ruleBlocks = sec.split(/┌─\s*/);
      for (const rb of ruleBlocks.slice(1)) {
        const rbLines = rb.split("\n");
        const t = rbLines[0]?.trim();
        if (!t) continue;
        let p = 5, active = true, desc: string | null = null, r = "", ex: string | null = null;
        let originType = "manual", funcArea = "geral", status = "active";
        let confidence: number | null = null, impact: string | null = null;
        let tags: string[] = [], context: string | null = null;
        let mode: "m" | "r" | "e" = "m";
        for (const l of rbLines.slice(1)) {
          const cl = l.replace(/^\s*[│└┌─]+\s*/, "").trim();
          if (!cl) continue;
          const pm = cl.match(/Prioridade:\s*P(\d+)/);
          if (pm) { p = parseInt(pm[1]); active = !cl.includes("❌"); continue; }
          const dm = cl.match(/^Descrição:\s*(.+)/);
          if (dm) { desc = dm[1]; continue; }
          const om = cl.match(/Origem:\s*(.+)/);
          if (om) {
            const ov = om[1].trim().toLowerCase();
            const found = ORIGIN_TYPES.find(o => o.label.toLowerCase() === ov);
            if (found) originType = found.value;
            continue;
          }
          const fm = cl.match(/^Função:\s*(.+?)(?:\s*\||$)/);
          if (fm) {
            const fv = fm[1].trim();
            const found = FUNCTION_AREAS.find(f => f.label.toLowerCase() === fv.toLowerCase());
            if (found) funcArea = found.value;
            const sm = cl.match(/Governança:\s*(.+)/);
            if (sm) status = sm[1].trim().toLowerCase();
            continue;
          }
          const cm = cl.match(/^Confiança:\s*(\d+)%?/);
          if (cm) { confidence = parseInt(cm[1]); continue; }
          const im = cl.match(/^Impacto:\s*(.+)/);
          if (im) { impact = im[1].trim().toLowerCase(); continue; }
          const tm = cl.match(/^Tags:\s*(.+)/);
          if (tm) { tags = tm[1].split(",").map(s => s.trim().toLowerCase()).filter(Boolean); continue; }
          const ctxm = cl.match(/^Contexto:\s*(.+)/);
          if (ctxm) { context = ctxm[1]; continue; }
          if (cl === "REGRA:") { mode = "r"; continue; }
          if (cl === "EXEMPLO:") { mode = "e"; continue; }
          if (mode === "r") r += (r ? "\n" : "") + cl;
          if (mode === "e") ex = (ex || "") + (ex ? "\n" : "") + cl;
        }
        if (t && r) results.push({
          category: cat, subcategory: null, title: t, description: desc, rule: r, example: ex,
          priority: p, is_active: active, tags, function_area: funcArea, origin_type: originType,
          confidence, estimated_impact: impact, context, related_rule_ids: [], status, created_by: null,
        });
      }
    }
    return results;
  };

  // Stats by origin
  const manualCount = rules.filter(r => r.origin_type === "manual").length;
  const learnedCount = rules.filter(r => r.origin_type === "learned").length;
  const validatedCount = rules.filter(r => r.origin_type === "validated" || r.status === "validated").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Base de Conhecimento Estratégica</h1>
          <p className="text-sm text-muted-foreground">Regras e estratégias que guiam a IA — organizadas por função, origem e governança</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={rules.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Exportar TXT
          </Button>
          <Button variant="outline" onClick={handleImport}>
            <Upload className="h-4 w-4 mr-2" /> Importar TXT
          </Button>
          <Button onClick={() => { setEditRule({ ...emptyRule }); setEditOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Nova Regra
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{rules.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{rules.filter(r => r.is_active).length}</p>
          <p className="text-xs text-muted-foreground">Ativas</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{manualCount}</p>
          <p className="text-xs text-muted-foreground">Manuais</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{learnedCount}</p>
          <p className="text-xs text-muted-foreground">Aprendidas</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{validatedCount}</p>
          <p className="text-xs text-muted-foreground">Validadas</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{allTags.length}</p>
          <p className="text-xs text-muted-foreground">Tags únicas</p>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar regras ou tags..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-1" />
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterFunction} onValueChange={setFilterFunction}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Função" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas funções</SelectItem>
            {FUNCTION_AREAS.map((f) => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterOrigin} onValueChange={setFilterOrigin}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas origens</SelectItem>
            {ORIGIN_TYPES.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {allTags.length > 0 && (
          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger className="w-[140px]">
              <Tag className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas tags</SelectItem>
              {allTags.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Rules List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <ScrollArea className="h-[calc(100vh-400px)]">
          <div className="space-y-3">
            {filtered.map((r) => {
              const Icon = CatIcon(r.category);
              const origin = originInfo(r.origin_type);
              return (
                <Card key={r.id} className={`transition-opacity ${!r.is_active ? "opacity-50" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-foreground text-sm">{r.title}</h3>
                          <Badge variant="outline" className="text-xs">{catLabel(r.category)}</Badge>
                          <Badge variant={r.priority >= 8 ? "default" : "secondary"} className="text-xs">
                            P{r.priority}
                          </Badge>
                          <Badge className={`text-xs border ${origin.color}`}>
                            {origin.label}
                          </Badge>
                          {r.status && r.status !== "active" && (
                            <Badge variant="outline" className="text-xs capitalize">{r.status}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{r.rule}</p>
                        {r.example && (
                          <p className="text-xs text-muted-foreground/70 mt-1 italic">Ex: {r.example}</p>
                        )}
                        {/* Meta row */}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {r.function_area && r.function_area !== "geral" && (
                            <span className="text-xs text-muted-foreground">
                              📍 {funcLabel(r.function_area)}
                            </span>
                          )}
                          {r.confidence != null && (
                            <span className="text-xs text-muted-foreground">
                              🎯 {r.confidence}%
                            </span>
                          )}
                          {r.estimated_impact && (
                            <span className="text-xs text-muted-foreground capitalize">
                              ⚡ {r.estimated_impact}
                            </span>
                          )}
                          {(r.tags || []).length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {r.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <ItemOriginBadge createdAt={r.created_at} createdBy={r.created_by} originType={r.origin_type} tags={r.tags} className="mt-1.5" />
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{(editRule as any).id ? "Editar Regra" : "Nova Regra"}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="content" className="flex-1">Conteúdo</TabsTrigger>
              <TabsTrigger value="taxonomy" className="flex-1">Taxonomia</TabsTrigger>
              <TabsTrigger value="governance" className="flex-1">Governança</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4 mt-4">
              <div>
                <Label>Título *</Label>
                <Input value={editRule.title} onChange={(e) => setEditRule({ ...editRule, title: e.target.value })} />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea rows={2} value={editRule.description || ""} onChange={(e) => setEditRule({ ...editRule, description: e.target.value || null })} placeholder="Explicação clara do porquê desta regra" />
              </div>
              <div>
                <Label>Regra / Instrução *</Label>
                <Textarea rows={4} value={editRule.rule} onChange={(e) => setEditRule({ ...editRule, rule: e.target.value })} />
              </div>
              <div>
                <Label>Exemplo prático</Label>
                <Textarea rows={2} value={editRule.example || ""} onChange={(e) => setEditRule({ ...editRule, example: e.target.value || null })} placeholder="Caso real ou fictício que exemplifica a regra" />
              </div>
              <div>
                <Label>Contexto de aplicação</Label>
                <Textarea rows={2} value={editRule.context || ""} onChange={(e) => setEditRule({ ...editRule, context: e.target.value || null })} placeholder="Quando e onde esta regra deve ser aplicada" />
              </div>
            </TabsContent>

            <TabsContent value="taxonomy" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
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
                  <Label>Subcategoria</Label>
                  <Input value={editRule.subcategory || ""} onChange={(e) => setEditRule({ ...editRule, subcategory: e.target.value || null })} placeholder="Ex: disney, japao, lua_de_mel" />
                </div>
              </div>
              <div>
                <Label>Área Funcional</Label>
                <Select value={editRule.function_area} onValueChange={(v) => setEditRule({ ...editRule, function_area: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FUNCTION_AREAS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                    placeholder="Adicionar tag e pressione Enter"
                    className="flex-1"
                  />
                  <Button variant="outline" size="sm" onClick={addTag} type="button">
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                {(editRule.tags || []).length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-2">
                    {(editRule.tags || []).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs cursor-pointer" onClick={() => removeTag(tag)}>
                        {tag} <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="governance" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Origem</Label>
                  <Select value={editRule.origin_type} onValueChange={(v) => setEditRule({ ...editRule, origin_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ORIGIN_TYPES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status de Governança</Label>
                  <Select value={editRule.status} onValueChange={(v) => setEditRule({ ...editRule, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Prioridade (1-10)</Label>
                  <Input type="number" min={1} max={10} value={editRule.priority} onChange={(e) => setEditRule({ ...editRule, priority: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Confiança (%)</Label>
                  <Input type="number" min={0} max={100} value={editRule.confidence ?? ""} onChange={(e) => setEditRule({ ...editRule, confidence: e.target.value ? Number(e.target.value) : null })} placeholder="0-100" />
                </div>
                <div>
                  <Label>Impacto Estimado</Label>
                  <Select value={editRule.estimated_impact || "none"} onValueChange={(v) => setEditRule({ ...editRule, estimated_impact: v === "none" ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não definido</SelectItem>
                      {IMPACT_OPTIONS.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch checked={editRule.is_active} onCheckedChange={(v) => setEditRule({ ...editRule, is_active: v })} />
                <Label>Regra ativa</Label>
              </div>
            </TabsContent>
          </Tabs>

          <Separator className="my-2" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
