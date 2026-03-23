import { Database, Shield, Clock, Settings, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";

const MEMORY_RULES = [
  { id: "r1", name: "Sem repetição de ofertas", description: "Não repete a mesma proposta ao cliente num período de 30 dias", active: true },
  { id: "r2", name: "Rastrear promessas", description: "Registra promessas feitas durante conversas para follow-up", active: true },
  { id: "r3", name: "Dados sensíveis", description: "Não armazena CPF, dados bancários ou senhas na memória", active: true },
  { id: "r4", name: "Preferências de viagem", description: "Prioriza dados de destinos, datas e orçamento", active: true },
  { id: "r5", name: "Histórico de objeções", description: "Memoriza objeções anteriores para evitar abordagens repetidas", active: true },
  { id: "r6", name: "Contexto familiar", description: "Identifica e prioriza dados de composição familiar", active: false },
  { id: "r7", name: "Budget declarado", description: "Armazena orçamento informado com prioridade máxima", active: true },
  { id: "r8", name: "Datas comemorativas", description: "Registra aniversários e datas especiais mencionadas", active: false },
];

const FISCAL_CHECKS = [
  { id: "f1", category: "Promessas irregulares", risk: 0, description: "Detecta promessas que fogem à política da agência" },
  { id: "f2", category: "Emissão NF", risk: 0, description: "Verifica menções a notas fiscais e compliance tributário" },
  { id: "f3", category: "CADASTUR", risk: 0, description: "Confirma conformidade com cadastro obrigatório de turismo" },
  { id: "f4", category: "Câmbio", risk: 0, description: "Detecta menções a câmbio paralelo ou práticas irregulares" },
  { id: "f5", category: "Parcelamento", risk: 0, description: "Verifica condições de parcelamento contra a política" },
  { id: "f6", category: "Relação trabalhista", risk: 0, description: "Detecta promessas que sugiram vínculo empregatício" },
  { id: "f7", category: "Propaganda enganosa", risk: 0, description: "Identifica exageros ou promessas não verificáveis" },
  { id: "f8", category: "Dados pessoais", risk: 0, description: "Conformidade com LGPD no tratamento de dados" },
];

export default function AITeamMemoria() {
  const [retentionDays, setRetentionDays] = useState([90]);
  const [rules, setRules] = useState(MEMORY_RULES);

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><Database className="w-6 h-6 text-primary" /></div>
        <div>
          <h1 className="text-xl font-bold">Memória & Fiscal</h1>
          <p className="text-sm text-muted-foreground">Memória contextual dos agentes + Quality Gate VIGIL</p>
        </div>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">⚙️ Configuração</TabsTrigger>
          <TabsTrigger value="rules">📋 Regras ({rules.filter(r => r.active).length}/8)</TabsTrigger>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-border/30 p-4">
                <h4 className="text-xs font-bold mb-2">Priorização</h4>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between"><span>Dados de viagem</span><Badge variant="outline">Alta</Badge></div>
                  <div className="flex justify-between"><span>Preferências pessoais</span><Badge variant="outline">Média</Badge></div>
                  <div className="flex justify-between"><span>Conversas gerais</span><Badge variant="outline">Baixa</Badge></div>
                </div>
              </div>
              <div className="rounded-lg border border-border/30 p-4">
                <h4 className="text-xs font-bold mb-2">Estatísticas</h4>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between"><span>Memórias ativas</span><span className="font-bold text-foreground">1,247</span></div>
                  <div className="flex justify-between"><span>Clientes rastreados</span><span className="font-bold text-foreground">89</span></div>
                  <div className="flex justify-between"><span>Promessas pendentes</span><span className="font-bold text-foreground">12</span></div>
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
                  <p className="text-sm font-medium">{rule.name}</p>
                  <p className="text-xs text-muted-foreground">{rule.description}</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="fiscal" className="mt-4">
          <div className="rounded-xl border border-border/50 bg-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-bold">VIGIL — Quality Gate Fiscal</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              O VIGIL analisa cada mensagem contra 8 categorias de compliance antes do envio.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {FISCAL_CHECKS.map(check => (
                <div key={check.id} className="rounded-lg border border-border/30 p-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-emerald-600">✓</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold">{check.category}</p>
                    <p className="text-[10px] text-muted-foreground">{check.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <div className="rounded-xl border border-border/50 bg-card p-5 text-center py-12">
            <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">Timeline de Interações</h3>
            <p className="text-sm text-muted-foreground">Selecione um cliente para visualizar o histórico de interações com todos os agentes.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
