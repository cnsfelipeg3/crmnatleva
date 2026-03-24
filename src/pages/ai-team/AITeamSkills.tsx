import { Wand2, Search, Plus, Zap, ToggleLeft, TrendingUp, Users, Eye, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ItemOriginBadge } from "@/components/ai-team/ItemOriginBadge";

const SKILL_CATEGORIES = [
  { id: "all", label: "Todas" },
  { id: "vendas", label: "Vendas" },
  { id: "relacionamento", label: "Relacionamento" },
  { id: "upsell", label: "Upsell" },
  { id: "suporte", label: "Suporte" },
  { id: "comunicacao", label: "Comunicação" },
  { id: "operacoes", label: "Operações" },
];

interface Skill {
  id: string;
  name: string;
  category: string;
  level: string;
  successRate: number;
  uses: number;
  active: boolean;
  agents: string[];
  description: string;
  examples: string[];
  trend: number;
  createdAt?: string;
  createdBy?: string;
  originType?: string;
}

const INITIAL_SKILLS: Skill[] = [
  { id: "s1", name: "Quebra de objeção de preço", category: "vendas", level: "avançado", successRate: 72, uses: 234, active: true, agents: ["NERO", "LUNA", "ATLAS"], description: "Técnicas para contornar objeções de preço com foco em valor agregado.", examples: ["'Entendo que o valor parece alto, mas deixe eu mostrar o que está incluído...'", "'Com parcelamento em 10x, fica equivalente a R$X por dia de viagem'"], trend: 8 },
  { id: "s2", name: "Upsell de experiências", category: "upsell", level: "intermediário", successRate: 65, uses: 156, active: true, agents: ["HABIBI", "NEMO", "DANTE"], description: "Ofertar experiências premium no momento certo da conversa.", examples: ["'Para completar a experiência em Dubai, temos um jantar no deserto...'", "'Clientes que visitam Orlando adoram incluir o Kennedy Space Center'"], trend: 12 },
  { id: "s3", name: "Acolhimento empático", category: "relacionamento", level: "básico", successRate: 91, uses: 412, active: true, agents: ["MAYA", "IRIS"], description: "Primeiro contato com tom humano e personalizado.", examples: ["'Que incrível que vocês estão planejando essa viagem! Me conta mais sobre o que vocês sonham...'"], trend: 3 },
  { id: "s4", name: "Criação de urgência", category: "vendas", level: "avançado", successRate: 58, uses: 89, active: true, agents: ["NERO"], description: "Criar urgência real baseada em disponibilidade e sazonalidade.", examples: ["'Esse hotel tem apenas 2 quartos nessa categoria para as datas...'", "'A tarifa promocional expira em 48h'"], trend: -2 },
  { id: "s5", name: "Follow-up inteligente", category: "relacionamento", level: "intermediário", successRate: 77, uses: 198, active: true, agents: ["ATLAS", "LUNA", "IRIS"], description: "Timing e conteúdo de follow-up baseado no perfil do cliente.", examples: ["'Oi [nome], vi que saiu uma promoção para o destino que você mencionou!'"], trend: 5 },
  { id: "s6", name: "Resolução de reclamação", category: "suporte", level: "intermediário", successRate: 83, uses: 67, active: true, agents: ["ATHOS"], description: "Framework de resolução em 3 etapas: escutar, resolver, surpreender.", examples: ["'Entendo sua frustração e vou resolver agora...'", "'Além de corrigir o problema, preparamos uma surpresa especial'"], trend: 6 },
  { id: "s7", name: "Storytelling por destino", category: "comunicacao", level: "avançado", successRate: 69, uses: 145, active: false, agents: ["LUNA", "HABIBI", "DANTE", "NEMO"], description: "Narrar experiências de viagem como uma história envolvente.", examples: ["'Imagine acordar com vista para o Burj Khalifa...'"], trend: 15 },
  { id: "s8", name: "Qualificação BANT", category: "vendas", level: "básico", successRate: 88, uses: 302, active: true, agents: ["ATLAS"], description: "Qualificar lead por Budget, Authority, Need, Timeline.", examples: ["'Já tem um orçamento em mente?'", "'Quando vocês gostariam de viajar?'"], trend: 1 },
  { id: "s9", name: "Reativação de lead frio", category: "relacionamento", level: "intermediário", successRate: 42, uses: 78, active: true, agents: ["AEGIS", "NURTURE"], description: "Reaquecer leads inativos com abordagem não invasiva.", examples: ["'Faz tempo que conversamos! Vi que tem promoção para o destino que você mencionou...'"], trend: -5 },
];

const LEVEL_COLORS: Record<string, string> = {
  "básico": "text-emerald-600 bg-emerald-500/10",
  "intermediário": "text-blue-600 bg-blue-500/10",
  "avançado": "text-purple-600 bg-purple-500/10",
};

export default function AITeamSkills() {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [skills, setSkills] = useState(INITIAL_SKILLS);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  const filtered = skills.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "all" || s.category === catFilter;
    return matchSearch && matchCat;
  });

  const toggleSkill = (id: string) => {
    setSkills(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
    toast.success("Skill atualizada");
  };

  const totalUses = skills.reduce((acc, s) => acc + s.uses, 0);
  const avgRate = Math.round(skills.filter(s => s.active).reduce((acc, s) => acc + s.successRate, 0) / skills.filter(s => s.active).length);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Wand2 className="w-6 h-6 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold">Skills dos Agentes</h1>
            <p className="text-sm text-muted-foreground">{skills.filter(s => s.active).length} ativas · {totalUses} usos · {avgRate}% taxa média</p>
          </div>
        </div>
        <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Nova Skill</Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Skills Ativas", value: skills.filter(s => s.active).length, icon: Zap, color: "text-amber-500" },
          { label: "Usos Totais", value: totalUses.toLocaleString(), icon: Users, color: "text-blue-500" },
          { label: "Taxa Média", value: `${avgRate}%`, icon: TrendingUp, color: "text-emerald-500" },
          { label: "Categorias", value: SKILL_CATEGORIES.length - 1, icon: Wand2, color: "text-purple-500" },
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(skill => (
          <div key={skill.id} className={cn(
            "rounded-xl border bg-card p-4 hover:border-primary/30 transition-all cursor-pointer group",
            skill.active ? "border-border/40" : "border-border/20 opacity-60"
          )} onClick={() => setSelectedSkill(skill)}>
            <div className="flex items-center justify-between mb-2">
              <Badge className={cn("text-[10px]", LEVEL_COLORS[skill.level])}>{skill.level}</Badge>
              <div className="flex items-center gap-2">
                {skill.trend > 0 ? (
                  <span className="text-[9px] text-emerald-500 flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" />+{skill.trend}%
                  </span>
                ) : skill.trend < 0 ? (
                  <span className="text-[9px] text-red-400">↓{skill.trend}%</span>
                ) : null}
                <Switch checked={skill.active} onCheckedChange={() => toggleSkill(skill.id)}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()} className="scale-75" />
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
            <ItemOriginBadge createdAt={skill.createdAt} createdBy={skill.createdBy} originType={skill.originType} className="mt-2" />
          </div>
        ))}
      </div>

      {/* Skill Detail Dialog */}
      <Dialog open={!!selectedSkill} onOpenChange={() => setSelectedSkill(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              {selectedSkill?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedSkill && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={cn("text-[10px]", LEVEL_COLORS[selectedSkill.level])}>{selectedSkill.level}</Badge>
                <Badge variant="outline" className="text-[10px]">{selectedSkill.category}</Badge>
                <Badge variant={selectedSkill.active ? "default" : "secondary"} className="text-[10px]">
                  {selectedSkill.active ? "Ativa" : "Inativa"}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground">{selectedSkill.description}</p>
              
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 rounded-lg bg-muted/50">
                  <p className="text-lg font-bold">{selectedSkill.successRate}%</p>
                  <p className="text-[10px] text-muted-foreground">Taxa de Sucesso</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50">
                  <p className="text-lg font-bold">{selectedSkill.uses}</p>
                  <p className="text-[10px] text-muted-foreground">Usos</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50">
                  <p className={cn("text-lg font-bold", selectedSkill.trend > 0 ? "text-emerald-500" : "text-red-400")}>
                    {selectedSkill.trend > 0 ? "+" : ""}{selectedSkill.trend}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">Tendência</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold mb-2">Agentes que usam</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSkill.agents.map(a => (
                    <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold mb-2">Exemplos de uso</p>
                <div className="space-y-2">
                  {selectedSkill.examples.map((ex, i) => (
                    <div key={i} className="text-xs p-2 rounded-lg bg-muted/50 text-muted-foreground italic">
                      {ex}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold mb-2">Origem</p>
                <ItemOriginBadge createdAt={selectedSkill.createdAt} createdBy={selectedSkill.createdBy} originType={selectedSkill.originType} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
