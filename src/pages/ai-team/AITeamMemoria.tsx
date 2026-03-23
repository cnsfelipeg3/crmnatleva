import { Database, Shield, Clock, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { AGENTS_V4 } from "@/components/ai-team/agentsV4Data";
import { toast } from "sonner";

const MEMORY_RULES = [
  { id: "r1", name: "Sem repetição de ofertas", description: "Não repete a mesma proposta ao cliente num período de 30 dias", active: true, impact: "alta" },
  { id: "r2", name: "Rastrear promessas", description: "Registra promessas feitas durante conversas para follow-up", active: true, impact: "alta" },
  { id: "r3", name: "Dados sensíveis", description: "Não armazena CPF, dados bancários ou senhas na memória", active: true, impact: "crítica" },
  { id: "r4", name: "Preferências de viagem", description: "Prioriza dados de destinos, datas e orçamento", active: true, impact: "alta" },
  { id: "r5", name: "Histórico de objeções", description: "Memoriza objeções anteriores para evitar abordagens repetidas", active: true, impact: "média" },
  { id: "r6", name: "Contexto familiar", description: "Identifica e prioriza dados de composição familiar", active: false, impact: "média" },
  { id: "r7", name: "Budget declarado", description: "Armazena orçamento informado com prioridade máxima", active: true, impact: "alta" },
  { id: "r8", name: "Datas comemorativas", description: "Registra aniversários e datas especiais mencionadas", active: false, impact: "baixa" },
];

const FISCAL_CHECKS = [
  { id: "f1", category: "Promessas irregulares", risk: 0, description: "Detecta promessas que fogem à política da agência", status: "ok", lastCheck: "há 2h" },
  { id: "f2", category: "Emissão NF", risk: 0, description: "Verifica menções a notas fiscais e compliance tributário", status: "ok", lastCheck: "há 1h" },
  { id: "f3", category: "CADASTUR", risk: 0, description: "Confirma conformidade com cadastro obrigatório de turismo", status: "ok", lastCheck: "há 3h" },
  { id: "f4", category: "Câmbio", risk: 1, description: "Detecta menções a câmbio paralelo ou práticas irregulares", status: "warning", lastCheck: "há 30min" },
  { id: "f5", category: "Parcelamento", risk: 0, description: "Verifica condições de parcelamento contra a política", status: "ok", lastCheck: "há 1h" },
  { id: "f6", category: "Relação trabalhista", risk: 0, description: "Detecta promessas que sugiram vínculo empregatício", status: "ok", lastCheck: "há 4h" },
  { id: "f7", category: "Propaganda enganosa", risk: 0, description: "Identifica exageros ou promessas não verificáveis", status: "ok", lastCheck: "há 2h" },
  { id: "f8", category: "Dados pessoais (LGPD)", risk: 0, description: "Conformidade com LGPD no tratamento de dados", status: "ok", lastCheck: "há 1h" },
];

const TIMELINE_ITEMS = [
  { time: "14:32", agent: "NERO", emoji: "🎯", client: "Carlos Mendes", action: "Memória atualizada: objeção de preço registrada", type: "memory" },
  { time: "14:15", agent: "VIGIL", emoji: "👁️", client: "—", action: "VIGIL bloqueou menção a câmbio não-oficial", type: "block" },
  { time: "13:50", agent: "MAYA", emoji: "🌸", client: "Ana Tavares", action: "Perfil familiar detectado: casal + 2 filhos", type: "memory" },
  { time: "13:30", agent: "ATLAS", emoji: "🗺️", client: "Roberto Lima", action: "Budget R$15k registrado com prioridade máxima", type: "memory" },
  { time: "12:45", agent: "LUNA", emoji: "🌙", client: "Fernanda Costa", action: "Promessa de follow-up em 48h registrada", type: "promise" },
  { time: "12:10", agent: "HABIBI", emoji: "🏜️", client: "Pedro Santos", action: "Preferência: hotel com kids club detectada", type: "memory" },
  { time: "11:30", agent: "VIGIL", emoji: "👁️", client: "—", action: "Auditoria completa: 0 violações nas últimas 24h", type: "audit" },
  { time: "10:00", agent: "IRIS", emoji: "🌈", client: "Mariana Alves", action: "Aniversário 15/04 registrado para campanha", type: "memory" },
];

export default function AITeamMemoria() {
  const [retentionDays, setRetentionDays] = useState([90]);
  const [rules, setRules] = useState(MEMORY_RULES);

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
    toast.success("Regra atualizada");
  };

  const activeRules = rules.filter(r => r.active).length;
  const okChecks = FISCAL_CHECKS.filter(c => c.status === "ok").length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><Database className="w-6 h-6 text-primary" /></div>
        <div>
          <h1 className="text-xl font-bold">Memória & Fiscal</h1>
          <p className="text-sm text-muted-foreground">Memória contextual · {activeRules} regras ativas · VIGIL {okChecks}/{FISCAL_CHECKS.length} ✓</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Memórias Ativas", value: "1,247", sub: "+34 hoje", color: "text-blue-500" },
          { label: "Clientes Rastreados", value: "89", sub: "com perfil completo", color: "text-emerald-500" },
          { label: "Promessas Pendentes", value: "12", sub: "follow-up agendado", color: "text-amber-500" },
          { label: "Alertas VIGIL", value: "1", sub: "última 24h", color: "text-red-500" },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl border border-border/40 bg-card p-4 text-center">
            <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
            <p className="text-xs font-medium mt-0.5">{stat.label}</p>
            <p className="text-[10px] text-muted-foreground">{stat.sub}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">⚙️ Configuração</TabsTrigger>
          <TabsTrigger value="rules">📋 Regras ({activeRules}/8)</TabsTrigger>
          <TabsTrigger value="fiscal">🛡️ Fiscal VIGIL</TabsTrigger>
          <TabsTrigger value="timeline">📅 Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-4">
          <div className="rounded-xl border border-border/50 bg-card p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold mb-1">Retenção de Memória</h3>
              <p className="text-xs text-muted-foreground mb-4">Por quantos dias os agentes lembram de interações passadas</p>
              <div className="flex items-center gap-4">
                <Slider value={retentionDays} onValueChange={setRetentionDays} min={7} max={365} step={1} className="flex-1" />
                <span className="text-sm font-bold w-16 text-right">{retentionDays[0]} dias</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border/30 p-4">
                <h4 className="text-xs font-bold mb-3">Priorização de Dados</h4>
                <div className="space-y-2">
                  {[
                    { label: "Dados de viagem (destino, datas)", priority: "Alta", pct: 90 },
                    { label: "Budget / orçamento declarado", priority: "Alta", pct: 95 },
                    { label: "Preferências pessoais", priority: "Média", pct: 70 },
                    { label: "Objeções anteriores", priority: "Média", pct: 65 },
                    { label: "Conversas gerais", priority: "Baixa", pct: 30 },
                  ].map(item => (
                    <div key={item.label} className="text-xs">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-muted-foreground">{item.label}</span>
                        <Badge variant="outline" className="text-[9px]">{item.priority}</Badge>
                      </div>
                      <Progress value={item.pct} className="h-1" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-border/30 p-4">
                <h4 className="text-xs font-bold mb-3">Memória por Agente</h4>
                <div className="space-y-2">
                  {AGENTS_V4.slice(0, 6).map(agent => (
                    <div key={agent.id} className="flex items-center gap-2 text-xs">
                      <span>{agent.emoji}</span>
                      <span className="font-medium w-16">{agent.name}</span>
                      <Progress value={Math.floor(40 + Math.random() * 50)} className="h-1.5 flex-1" />
                      <span className="text-muted-foreground w-12 text-right">{Math.floor(50 + Math.random() * 200)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <div className="space-y-3">
            {rules.map(rule => (
              <div key={rule.id} className="rounded-xl border border-border/40 bg-card p-4 flex items-center gap-4">
                <Switch checked={rule.active} onCheckedChange={() => toggleRule(rule.id)} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{rule.name}</p>
                    <Badge variant="outline" className={cn("text-[9px]",
                      rule.impact === "crítica" ? "text-red-500" :
                      rule.impact === "alta" ? "text-amber-500" :
                      rule.impact === "média" ? "text-blue-500" : "text-muted-foreground"
                    )}>{rule.impact}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{rule.description}</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="fiscal" className="mt-4">
          <div className="rounded-xl border border-border/50 bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-500" />
                <h3 className="text-sm font-bold">VIGIL — Quality Gate Fiscal</h3>
              </div>
              <Badge className={okChecks === FISCAL_CHECKS.length ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}>
                {okChecks}/{FISCAL_CHECKS.length} aprovados
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              O VIGIL analisa cada mensagem contra 8 categorias de compliance antes do envio.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {FISCAL_CHECKS.map(check => (
                <div key={check.id} className={cn(
                  "rounded-lg border p-3 flex items-start gap-3",
                  check.status === "warning" ? "border-amber-500/30 bg-amber-500/5" : "border-border/30"
                )}>
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                    check.status === "ok" ? "bg-emerald-500/10" : "bg-amber-500/10"
                  )}>
                    {check.status === "ok" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold">{check.category}</p>
                      <span className="text-[9px] text-muted-foreground">{check.lastCheck}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{check.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <div className="rounded-xl border border-border/50 bg-card p-5">
            <h3 className="text-sm font-bold mb-4">Hoje — {new Date().toLocaleDateString("pt-BR")}</h3>
            <div className="space-y-3">
              {TIMELINE_ITEMS.map((item, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="flex flex-col items-center">
                    <div className={cn("w-2.5 h-2.5 rounded-full border-2",
                      item.type === "block" ? "bg-red-500/40 border-red-500" :
                      item.type === "promise" ? "bg-amber-500/40 border-amber-500" :
                      item.type === "audit" ? "bg-emerald-500/40 border-emerald-500" :
                      "bg-blue-500/40 border-blue-500"
                    )} />
                    {i < TIMELINE_ITEMS.length - 1 && <div className="w-px flex-1 bg-border/40 mt-1" />}
                  </div>
                  <div className="pb-3 flex-1">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="font-mono">{item.time}</span>
                      <span>{item.emoji} {item.agent}</span>
                      {item.client !== "—" && <span>· {item.client}</span>}
                    </div>
                    <p className="text-xs mt-0.5">{item.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
