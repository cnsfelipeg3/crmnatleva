import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { defaultSkills, defaultScopes, defaultRestrictions, sectorOptions } from "./mockData";
import type { Agent, AgentLevel } from "./mockData";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateAgent: (agent: Agent) => void;
}

const levelLabels: Record<AgentLevel, string> = {
  basic: "Básico",
  intermediate: "Intermediário",
  advanced: "Avançado",
};

const emojiForSector: Record<string, string> = {
  Vendas: "💰",
  Operações: "⚙️",
  Financeiro: "📊",
  Marketing: "📣",
  Produto: "🧠",
  Gestão: "👨‍💼",
};

export default function AITeamCreateAgentDialog({ open, onOpenChange, onCreateAgent }: Props) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [sector, setSector] = useState("");
  const [customSector, setCustomSector] = useState("");
  const [level, setLevel] = useState<AgentLevel>("basic");
  const [skills, setSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState("");
  const [scope, setScope] = useState<string[]>([]);
  const [restrictions, setRestrictions] = useState<string[]>([...defaultRestrictions]);
  const [behaviorPrompt, setBehaviorPrompt] = useState("");

  const reset = () => {
    setName(""); setRole(""); setSector(""); setCustomSector(""); setLevel("basic");
    setSkills([]); setCustomSkill(""); setScope([]); setRestrictions([...defaultRestrictions]);
    setBehaviorPrompt("");
  };

  const toggleItem = (arr: string[], item: string, setter: (v: string[]) => void) => {
    setter(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  };

  const addCustomSkill = () => {
    const trimmed = customSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
      setCustomSkill("");
    }
  };

  const handleCreate = () => {
    if (!name.trim() || !role.trim()) return;
    const finalSector = sector === "Outro" ? (customSector.trim() || "Outro") : (sector || "Geral");
    const agent: Agent = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      emoji: emojiForSector[finalSector] ?? "🤖",
      role: role.trim(),
      sector: finalSector,
      level,
      skills,
      scope,
      restrictions,
      behaviorPrompt: behaviorPrompt.trim(),
      status: "idle",
      lastAction: "Aguardando tarefas",
      currentThought: "Acabei de ser criado. Estou pronto para começar a trabalhar nas áreas definidas.",
    };
    onCreateAgent(agent);
    reset();
    onOpenChange(false);
  };

  const isValid = name.trim().length > 0 && role.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar novo agente</DialogTitle>
          <DialogDescription>Defina o perfil, habilidades e comportamento do agente.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Section 1 — Basic */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dados básicos</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Nome *</label>
                <Input placeholder="Ex: Especialista em Conversão" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Função *</label>
                <Input placeholder="Ex: Analisar e otimizar propostas" value={role} onChange={(e) => setRole(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Setor</label>
                <Select value={sector} onValueChange={setSector}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {[...sectorOptions, "Outro"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {sector === "Outro" && (
                  <Input placeholder="Qual setor?" value={customSector} onChange={(e) => setCustomSector(e.target.value)} className="mt-1.5" />
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Nível</label>
                <Select value={level} onValueChange={(v) => setLevel(v as AgentLevel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(levelLabels) as [AgentLevel, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* Section 2 — Skills */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Habilidades</h4>
            <div className="grid grid-cols-2 gap-2">
              {defaultSkills.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={skills.includes(s)} onCheckedChange={() => toggleItem(skills, s, setSkills)} />
                  {s}
                </label>
              ))}
            </div>
            {skills.filter((s) => !defaultSkills.includes(s)).length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {skills.filter((s) => !defaultSkills.includes(s)).map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs gap-1">
                    {s}
                    <button onClick={() => setSkills((prev) => prev.filter((i) => i !== s))} className="hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Adicionar habilidade..."
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomSkill())}
                className="text-sm"
              />
              <Button size="sm" variant="outline" onClick={addCustomSkill} disabled={!customSkill.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </section>

          {/* Section 3 — Scope */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Escopo de atuação</h4>
            <div className="grid grid-cols-2 gap-2">
              {defaultScopes.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={scope.includes(s)} onCheckedChange={() => toggleItem(scope, s, setScope)} />
                  {s}
                </label>
              ))}
            </div>
          </section>

          {/* Section 4 — Restrictions */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Restrições</h4>
            <div className="grid grid-cols-2 gap-2">
              {defaultRestrictions.map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={restrictions.includes(r)} onCheckedChange={() => toggleItem(restrictions, r, setRestrictions)} />
                  {r}
                </label>
              ))}
            </div>
          </section>

          {/* Section 5 — Behavior */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comportamento</h4>
            <Textarea
              placeholder="Ex: Seja crítico, focado em performance e conversão. Sempre priorize soluções simples e de alto impacto."
              value={behaviorPrompt}
              onChange={(e) => setBehaviorPrompt(e.target.value)}
              rows={3}
            />
          </section>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!isValid}>Criar agente</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
