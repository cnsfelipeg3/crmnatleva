import { Wand2, Search, Plus, Zap, TrendingUp, Users, Save, X, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SKILL_CATEGORIES = [
  { id: "all", label: "Todas" },
  { id: "vendas", label: "Vendas" },
  { id: "relacionamento", label: "Relacionamento" },
  { id: "análise", label: "Análise" },
  { id: "comunicação", label: "Comunicação" },
  { id: "upsell", label: "Upsell" },
  { id: "suporte", label: "Suporte" },
  { id: "operacoes", label: "Operações" },
];

const LEVEL_COLORS: Record<string, string> = {
  "básico": "text-emerald-600 bg-emerald-500/10",
  "intermediário": "text-blue-600 bg-blue-500/10",
  "avançado": "text-purple-600 bg-purple-500/10",
};

interface DBSkill {
  id: string;
  name: string;
  category: string;
  level: string;
  description: string | null;
  prompt_instruction: string | null;
  is_active: boolean;
  source: string | null;
  created_at: string;
}

export default function AITeamSkills() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [skills, setSkills] = useState<DBSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<DBSkill | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editLevel, setEditLevel] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editInstruction, setEditInstruction] = useState("");

  const loadSkills = async () => {
    const { data, error } = await supabase
      .from("agent_skills")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setSkills(data);
    setLoading(false);
  };

  useEffect(() => { loadSkills(); }, []);

  const filtered = skills.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "all" || s.category === catFilter;
    return matchSearch && matchCat;
  });

  const toggleSkill = async (id: string, currentActive: boolean) => {
    const { error } = await supabase.from("agent_skills").update({ is_active: !currentActive }).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    setSkills(prev => prev.map(s => s.id === id ? { ...s, is_active: !currentActive } : s));
    toast.success(!currentActive ? "Skill ativada" : "Skill desativada");
  };

  const openEdit = (skill: DBSkill) => {
    setSelectedSkill(skill);
    setEditName(skill.name);
    setEditCategory(skill.category);
    setEditLevel(skill.level);
    setEditDescription(skill.description || "");
    setEditInstruction(skill.prompt_instruction || "");
    setEditMode(true);
  };

  const openCreate = () => {
    setEditName("");
    setEditCategory("vendas");
    setEditLevel("básico");
    setEditDescription("");
    setEditInstruction("");
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!editName.trim() || !editInstruction.trim()) {
      toast.error("Nome e instrução são obrigatórios");
      return;
    }
    setSaving(true);
    if (showCreate) {
      const { error } = await supabase.from("agent_skills").insert({
        name: editName.trim(),
        category: editCategory,
        level: editLevel,
        description: editDescription.trim() || null,
        prompt_instruction: editInstruction.trim(),
        source: "manual",
      });
      if (error) { toast.error("Erro ao criar: " + error.message); setSaving(false); return; }
      toast.success("Skill criada com sucesso!");
      setShowCreate(false);
    } else if (selectedSkill) {
      const { error } = await supabase.from("agent_skills").update({
        name: editName.trim(),
        category: editCategory,
        level: editLevel,
        description: editDescription.trim() || null,
        prompt_instruction: editInstruction.trim(),
        updated_at: new Date().toISOString(),
      }).eq("id", selectedSkill.id);
      if (error) { toast.error("Erro ao salvar: " + error.message); setSaving(false); return; }
      toast.success("Skill atualizada!");
      setEditMode(false);
      setSelectedSkill(null);
    }
    setSaving(false);
    loadSkills();
  };

  const activeCount = skills.filter(s => s.is_active).length;

  const renderForm = () => (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-bold">Nome da Skill *</Label>
        <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Ex: Quebra de objeção de preço" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Categoria</Label>
          <Select value={editCategory} onValueChange={setEditCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SKILL_CATEGORIES.filter(c => c.id !== "all").map(c => (
                <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Nível</Label>
          <Select value={editLevel} onValueChange={setEditLevel}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="básico">Básico</SelectItem>
              <SelectItem value="intermediário">Intermediário</SelectItem>
              <SelectItem value="avançado">Avançado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-bold">Descrição</Label>
        <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Breve descrição da skill..." rows={2} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-bold">Instrução para IA (prompt_instruction) *</Label>
        <Textarea value={editInstruction} onChange={e => setEditInstruction(e.target.value)}
          placeholder="Instrução que será injetada no prompt do agente quando essa skill estiver ativa..."
          rows={4} className="font-mono text-xs" />
        <p className="text-[10px] text-muted-foreground">Esta instrução é aplicada diretamente no comportamento do agente e validada pelo Compliance Engine.</p>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={() => { setShowCreate(false); setEditMode(false); setSelectedSkill(null); }}>
          Cancelar
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          {showCreate ? "Criar Skill" : "Salvar"}
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Wand2 className="w-6 h-6 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold">Skills dos Agentes</h1>
            <p className="text-sm text-muted-foreground">{activeCount} ativas · {skills.length} total</p>
          </div>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}><Plus className="w-4 h-4" /> Nova Skill</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Skills Ativas", value: activeCount, icon: Zap, color: "text-amber-500" },
          { label: "Total Skills", value: skills.length, icon: Wand2, color: "text-purple-500" },
          { label: "Categorias", value: [...new Set(skills.map(s => s.category))].length, icon: TrendingUp, color: "text-emerald-500" },
          { label: "Via Melhorias", value: skills.filter(s => s.source === "improvement").length, icon: Users, color: "text-blue-500" },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl border border-border/40 bg-card p-3 text-center">
            <stat.icon className={cn("w-5 h-5 mx-auto mb-1", stat.color)} />
            <p className="text-lg font-bold">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar skill..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {SKILL_CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCatFilter(c.id)}
              className={cn("text-xs px-3 py-1.5 rounded-lg font-medium transition-colors",
                catFilter === c.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}>{c.label}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Wand2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma skill encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(skill => (
            <div key={skill.id} className={cn(
              "rounded-xl border bg-card p-4 hover:border-primary/30 transition-all cursor-pointer group",
              skill.is_active ? "border-border/40" : "border-border/20 opacity-60"
            )} onClick={() => openEdit(skill)}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Badge className={cn("text-[10px]", LEVEL_COLORS[skill.level] || "text-muted-foreground bg-muted")}>{skill.level}</Badge>
                  <Badge variant="outline" className="text-[10px]">{skill.category}</Badge>
                </div>
                <Switch checked={skill.is_active} onCheckedChange={() => toggleSkill(skill.id, skill.is_active)}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()} className="scale-75" />
              </div>
              <h3 className="text-sm font-bold mb-1">{skill.name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{skill.description || "Sem descrição"}</p>
              {skill.prompt_instruction && (
                <p className="text-[10px] text-muted-foreground/70 line-clamp-1 font-mono bg-muted/30 px-2 py-1 rounded mb-2">
                  💡 {skill.prompt_instruction.slice(0, 80)}...
                </p>
              )}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="capitalize">{skill.source || "manual"}</span>
                <span>{new Date(skill.created_at).toLocaleDateString("pt-BR")}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Nova Skill
            </DialogTitle>
          </DialogHeader>
          {renderForm()}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editMode && !!selectedSkill} onOpenChange={(open) => { if (!open) { setEditMode(false); setSelectedSkill(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" /> Editar Skill
            </DialogTitle>
          </DialogHeader>
          {renderForm()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
