import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ScrollText, Plus, Save, AlertTriangle, Loader2 } from "lucide-react";

interface Rule {
  id: string;
  key: string;
  title: string;
  content: string;
  scope: string[];
  is_active: boolean;
  priority: number;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

const SCOPE_OPTIONS = ["simulator", "production"] as const;

export default function RegrasGlobaisAgentes() {
  const { toast } = useToast();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("agent_global_rules" as any)
      .select("*")
      .order("priority", { ascending: true });
    if (error) {
      toast({ title: "Erro ao carregar regras", description: error.message, variant: "destructive" });
    } else {
      setRules((data as any) || []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function patch(id: string, partial: Partial<Rule>) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, ...partial } : r));
  }

  function toggleScope(id: string, scope: string) {
    setRules(prev => prev.map(r => {
      if (r.id !== id) return r;
      const has = r.scope.includes(scope);
      return { ...r, scope: has ? r.scope.filter(s => s !== scope) : [...r.scope, scope] };
    }));
  }

  async function save(rule: Rule) {
    setSavingId(rule.id);
    const { error } = await supabase
      .from("agent_global_rules" as any)
      .update({
        title: rule.title,
        content: rule.content,
        scope: rule.scope,
        is_active: rule.is_active,
        priority: rule.priority,
        notes: rule.notes,
      })
      .eq("id", rule.id);
    setSavingId(null);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Regra salva", description: `${rule.title} · cache de 60s aplica em até 1 minuto.` });
    }
  }

  async function addRule() {
    const newKey = prompt("Chave única da nova regra (ex: 'natleva_objection_handling'):");
    if (!newKey) return;
    const { error } = await supabase
      .from("agent_global_rules" as any)
      .insert({
        key: newKey,
        title: "Nova regra",
        content: "Conteúdo da nova regra...",
        scope: ["simulator", "production"],
        is_active: false,
        priority: 100,
      } as any);
    if (error) {
      toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
    } else {
      load();
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-primary" />
            Regras Globais dos Agentes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Diretivas comportamentais aplicadas a todos os agentes (simulador e produção).
          </p>
        </div>
        <Button onClick={addRule} variant="outline">
          <Plus className="w-4 h-4 mr-2" /> Adicionar regra
        </Button>
      </div>

      <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900 dark:text-amber-200">
          <strong>Editar com cuidado.</strong> Mudanças aqui afetam TODOS os agentes em tempo real
          (após cache de 60s expirar). Em caso de erro, desative a regra (toggle) para forçar
          o fallback hardcoded das edge functions.
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando regras...
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted/30 p-8 text-center text-muted-foreground">
          Nenhuma regra cadastrada. Clique em "Adicionar regra" para começar.
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map(rule => (
            <div key={rule.id} className="rounded-lg border border-border bg-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Key</Label>
                  <code className="block text-xs font-mono bg-muted px-2 py-1 rounded mt-1">{rule.key}</code>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(v) => patch(rule.id, { is_active: v })}
                    />
                    <Label className="text-xs">{rule.is_active ? "Ativa" : "Inativa"}</Label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <Label className="text-xs">Título</Label>
                  <Input
                    value={rule.title}
                    onChange={(e) => patch(rule.id, { title: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Prioridade</Label>
                  <Input
                    type="number"
                    value={rule.priority}
                    onChange={(e) => patch(rule.id, { priority: parseInt(e.target.value) || 100 })}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Escopo (onde aplica)</Label>
                <div className="flex gap-2 mt-1.5">
                  {SCOPE_OPTIONS.map(s => (
                    <Badge
                      key={s}
                      variant={rule.scope.includes(s) ? "default" : "outline"}
                      className="cursor-pointer select-none"
                      onClick={() => toggleScope(rule.id, s)}
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs">Conteúdo</Label>
                <Textarea
                  value={rule.content}
                  onChange={(e) => patch(rule.id, { content: e.target.value })}
                  rows={14}
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">Notas internas</Label>
                <Textarea
                  value={rule.notes || ""}
                  onChange={(e) => patch(rule.id, { notes: e.target.value })}
                  rows={2}
                  placeholder="Observações sobre quando/por que mudar esta regra."
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={() => save(rule)} disabled={savingId === rule.id}>
                  {savingId === rule.id
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
                    : <><Save className="w-4 h-4 mr-2" /> Salvar</>}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
