import { Settings, Save, TestTube, Download, Upload, Shield, Clock, Bot, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { toast } from "sonner";

export default function AITeamConfig() {
  const [agencyName, setAgencyName] = useState("NatLeva Viagens");
  const [segment, setSegment] = useState("Viagens Premium");
  const [slogan, setSlogan] = useState("Transformando sonhos em experiências inesquecíveis");
  const [tomVoz, setTomVoz] = useState("Profissional, acolhedor e consultivo. Foco em experiências premium com toque humano.");
  const [maxResponseTime, setMaxResponseTime] = useState("30");
  const [autoApprove, setAutoApprove] = useState(false);
  const [nightMode, setNightMode] = useState(true);

  const handleSave = () => toast.success("Configurações salvas com sucesso!");
  const handleTest = () => toast.info("Testando conexão com AI Gateway...");

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Settings className="w-6 h-6 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold">Configurações</h1>
            <p className="text-sm text-muted-foreground">Identidade da agência, modelo de IA e parâmetros operacionais</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" /> Exportar</Button>
          <Button variant="outline" size="sm"><Upload className="w-4 h-4 mr-1" /> Importar</Button>
          <Button size="sm" onClick={handleSave}><Save className="w-4 h-4 mr-1" /> Salvar</Button>
        </div>
      </div>

      <Tabs defaultValue="identity">
        <TabsList>
          <TabsTrigger value="identity">🏢 Identidade</TabsTrigger>
          <TabsTrigger value="model">🤖 Modelo IA</TabsTrigger>
          <TabsTrigger value="operations">⚙️ Operacional</TabsTrigger>
          <TabsTrigger value="safety">🛡️ Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="identity" className="mt-4 space-y-4">
          <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
            <h3 className="text-sm font-bold">Identidade da Agência</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nome da Agência</label>
                <Input value={agencyName} onChange={e => setAgencyName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Segmento</label>
                <Input value={segment} onChange={e => setSegment(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Slogan</label>
              <Input value={slogan} onChange={e => setSlogan(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tom de Voz Global</label>
              <Textarea value={tomVoz} onChange={e => setTomVoz(e.target.value)} rows={3} />
              <p className="text-[10px] text-muted-foreground mt-1">Este tom é injetado em todos os 21 agentes via buildPromptV2()</p>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
            <h3 className="text-sm font-bold">Diretrizes de Comunicação</h3>
            <Textarea defaultValue={`1. Sempre cumprimentar pelo nome
2. Usar emojis com moderação (máx. 2 por mensagem)
3. Nunca usar gírias ou linguagem informal excessiva
4. Sempre fechar com CTA claro
5. Mencionar exclusividade quando aplicável
6. Adaptar tom ao perfil do cliente`} rows={6} />
          </div>
        </TabsContent>

        <TabsContent value="model" className="mt-4 space-y-4">
          <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
            <h3 className="text-sm font-bold">Modelo de IA Principal</h3>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <Bot className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm font-bold">Lovable AI Gateway</p>
                  <p className="text-xs text-muted-foreground">google/gemini-3-flash-preview</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/10 text-emerald-600">Conectado</Badge>
                <Button variant="outline" size="sm" onClick={handleTest}><TestTube className="w-4 h-4 mr-1" /> Testar</Button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-6">
            <h3 className="text-sm font-bold mb-4">Uso da API</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Chamadas hoje", value: "1,247" },
                { label: "Custo estimado", value: "R$ 12,40" },
                { label: "Latência média", value: "340ms" },
                { label: "Uptime", value: "99.9%" },
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="mt-4 space-y-4">
          <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
            <h3 className="text-sm font-bold">Parâmetros Operacionais</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Horário de Operação</label>
                <Input defaultValue="08:00 - 22:00" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tempo Máx. Resposta (seg)</label>
                <Input value={maxResponseTime} onChange={e => setMaxResponseTime(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Critérios de Escalonamento para Humano</label>
              <Textarea defaultValue="Escalonar quando: score de confiança < 60%, objeção não mapeada, solicitação de cancelamento, cliente irritado, ou mencionar reclamação em redes sociais." rows={3} />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium">Auto-aprovar melhorias de baixo risco</p>
                  <p className="text-xs text-muted-foreground"><p className="text-xs text-muted-foreground">{"Melhorias com confiança >90% e impacto baixo são aplicadas automaticamente"}</p></p>
                </div>
                <Switch checked={autoApprove} onCheckedChange={setAutoApprove} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium">Modo Noturno</p>
                  <p className="text-xs text-muted-foreground">Agentes operam em modo reduzido fora do horário (respostas automáticas básicas)</p>
                </div>
                <Switch checked={nightMode} onCheckedChange={setNightMode} />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="safety" className="mt-4 space-y-4">
          <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-bold">Guardrails de Segurança</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: "VIGIL Gate ativo em todas as mensagens", desc: "Verifica compliance fiscal e LGPD antes do envio", active: true },
                { label: "Bloqueio de dados sensíveis", desc: "CPF, dados bancários e senhas nunca são armazenados", active: true },
                { label: "Auditoria automática (ÓRION)", desc: "ÓRION revisa 100% das interações em busca de anomalias", active: true },
                { label: "Limite de ações por agente", desc: "Máximo de 50 interações/hora por agente", active: true },
                { label: "Modo sandbox para novos agentes", desc: "Novos agentes operam em modo teste por 72h", active: false },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch checked={item.active} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-600">Zona de Perigo</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Desativar os guardrails pode expor a agência a riscos legais e de compliance. 
                  Todas as alterações são registradas no log de auditoria.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
