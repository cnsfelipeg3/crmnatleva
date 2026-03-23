import { Wand2, Search, Plus, Zap, ToggleLeft } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const SKILL_CATEGORIES = [
  { id: "all", label: "Todas" },
  { id: "vendas", label: "Vendas" },
  { id: "relacionamento", label: "Relacionamento" },
  { id: "upsell", label: "Upsell" },
  { id: "suporte", label: "Suporte" },
  { id: "comunicacao", label: "Comunicação" },
  { id: "operacoes", label: "Operações" },
];

const MOCK_SKILLS = [
  { id: "s1", name: "Quebra de objeção de preço", category: "vendas", level: "avançado", successRate: 72, uses: 234, active: true, agents: ["NERO", "LUNA", "ATLAS"], description: "Técnicas para contornar objeções de preço com foco em valor agregado." },
  { id: "s2", name: "Upsell de experiências", category: "upsell", level: "intermediário", successRate: 65, uses: 156, active: true, agents: ["HABIBI", "NEMO", "DANTE"], description: "Ofertar experiências premium no momento certo da conversa." },
  { id: "s3", name: "Acolhimento empático", category: "relacionamento", level: "básico", successRate: 91, uses: 412, active: true, agents: ["MAYA", "IRIS"], description: "Primeiro contato com tom humano e personalizado." },
  { id: "s4", name: "Criação de urgência", category: "vendas", level: "avançado", successRate: 58, uses: 89, active: true, agents: ["NERO"], description: "Criar urgência real baseada em disponibilidade e sazonalidade." },
  { id: "s5", name: "Follow-up inteligente", category: "relacionamento", level: "intermediário", successRate: 77, uses: 198, active: true, agents: ["ATLAS", "LUNA", "IRIS"], description: "Timing e conteúdo de follow-up baseado no perfil do cliente." },
  { id: "s6", name: "Resolução de reclamação", category: "suporte", level: "intermediário", successRate: 83, uses: 67, active: true, agents: ["ATHOS"], description: "Framework de resolução em 3 etapas: escutar, resolver, surpreender." },
  { id: "s7", name: "Storytelling por destino", category: "comunicacao", level: "avançado", successRate: 69, uses: 145, active: false, agents: ["LUNA", "HABIBI", "DANTE", "NEMO"], description: "Narrar experiências de viagem como uma história envolvente." },
  { id: "s8", name: "Qualificação BANT", category: "vendas", level: "básico", successRate: 88, uses: 302, active: true, agents: ["ATLAS"], description: "Qualificar lead por Budget, Authority, Need, Timeline." },
  { id: "s9", name: "Reativação de lead frio", category: "relacionamento", level: "intermediário", successRate: 42, uses: 78, active: true, agents: ["AEGIS", "NURTURE"], description: "Reaquecer leads inativos com abordagem não invasiva." },
];

const LEVEL_COLORS: Record<string, string> = {
  "básico": "text-emerald-600 bg-emerald-500/10",
  "intermediário": "text-blue-600 bg-blue-500/10",
  "avançado": "text-purple-600 bg-purple-500/10",
};

export default function AITeamSkills() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");

  const filtered = MOCK_SKILLS.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "all" || s.category === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Wand2 className="w-6 h-6 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold">Skills dos Agentes</h1>
            <p className="text-sm text-muted-foreground">Superpoderes — scripts treinados com exemplos reais</p>
          </div>
        </div>
        <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Nova Skill</Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar skill..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1">
          {SKILL_CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCatFilter(c.id)}
              className={cn("text-xs px-3 py-1.5 rounded-lg font-medium transition-colors",
                catFilter === c.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}>{c.label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(skill => (
          <div key={skill.id} className={cn(
            "rounded-xl border bg-card p-4 hover:border-primary/30 transition-all cursor-pointer",
            skill.active ? "border-border/40" : "border-border/20 opacity-60"
          )}>
            <div className="flex items-center justify-between mb-2">
              <Badge className={cn("text-[10px]", LEVEL_COLORS[skill.level])}>{skill.level}</Badge>
              <div className="flex items-center gap-1">
                {!skill.active && <Badge variant="outline" className="text-[9px] text-muted-foreground">Inativa</Badge>}
                <Zap className="w-3.5 h-3.5 text-amber-500" />
              </div>
            </div>
            <h3 className="text-sm font-bold mb-1">{skill.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{skill.description}</p>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
              <span>Taxa: {skill.successRate}%</span>
              <span>{skill.uses} usos</span>
            </div>
            <Progress value={skill.successRate} className="h-1.5 mb-2" />
            <div className="flex flex-wrap gap-1">
              {skill.agents.map(a => (
                <span key={a} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{a}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
