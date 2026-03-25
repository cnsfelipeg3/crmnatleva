import { Settings, Save, TestTube, Download, Upload, Shield, Clock, Bot, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAgencyConfig } from "@/hooks/useAgencyConfig";

export default function AITeamConfig() {
  const { config, isLoading, saveConfig, isSaving } = useAgencyConfig();

  const [form, setForm] = useState(config);
  useEffect(() => { setForm(config); }, [config]);

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const setBool = (key: string, value: boolean) => setForm(prev => ({ ...prev, [key]: String(value) }));

  const handleSave = async () => {
    await saveConfig(form);
  };

  const handleTest = () => toast.info("Testando conexão com AI Gateway...");

  const modelDisplay = (() => {
    const p = form.default_provider;
    const m = form.default_model;
    if (p === "anthropic") return { provider: "Anthropic", model: m || "claude-sonnet-4", label: "Claude" };
    if (p === "lovable") return { provider: "Lovable AI Gateway", model: m || "gemini-3-flash-preview", label: "Lovable AI" };
    return { provider: p || "Lovable AI Gateway", model: m || "auto", label: p || "AI" };
  })();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Salvar
          </Button>
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
                <Input value={form.agency_name} onChange={e => set("agency_name", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Segmento</label>
                <Input value={form.segment} onChange={e => set("segment", e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Slogan</label>
              <Input value={form.slogan} onChange={e => set("slogan", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tom de Voz Global</label>
              <Textarea value={form.tom_comunicacao} onChange={e => set("tom_comunicacao", e.target.value)} rows={3} />
              <p className="text-[10px] text-muted-foreground mt-1">Este tom é injetado em todos os 21 agentes via buildPromptV2() e sincronizado em tempo real</p>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
            <h3 className="text-sm font-bold">Diretrizes de Comunicação</h3>
            <Textarea
              value={form.diretrizes_comunicacao}
              onChange={e => set("diretrizes_comunicacao", e.target.value)}
              rows={6}
            />
          </div>
        </TabsContent>

        <TabsContent value="model" className="mt-4 space-y-4">
          <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
            <h3 className="text-sm font-bold">Modelo de IA Principal</h3>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <Bot className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm font-bold">{modelDisplay.provider}</p>
                  <p className="text-xs text-muted-foreground">{modelDisplay.model}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/10 text-emerald-600">Conectado</Badge>
                <Button variant="outline" size="sm" onClick={handleTest}><TestTube className="w-4 h-4 mr-1" /> Testar</Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Provider</label>
                <Input value={form.default_provider} onChange={e => set("default_provider", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Modelo</label>
                <Input value={form.default_model} onChange={e => set("default_model", e.target.value)} />
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground">Alterar o modelo aqui reflete automaticamente em todos os agentes, simuladores e edge functions que leem esta configuração.</p>
          </div>

          <div className="rounded-xl border border-border/50 bg-card p-6">
            <h3 className="text-sm font-bold mb-4">Stack de Modelos Ativa</h3>
            <div className="space-y-2">
              {[
                { label: "Conversacional (Agentes)", value: `${form.default_provider} / ${form.default_model}`, badge: "Principal" },
                { label: "Utilitário (Correção, Resumos)", value: "Lovable AI / gemini-2.5-flash-lite", badge: "Secundário" },
                { label: "Mídia (Transcrição, Visão)", value: "Lovable AI / gemini-3-flash-preview", badge: "Multimodal" },
                { label: "Geração de Imagens", value: "Lovable AI / gemini-3.1-flash-image", badge: "Visual" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.value}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{item.badge}</Badge>
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
                <Input value={form.horario_operacao} onChange={e => set("horario_operacao", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tempo Máx. Resposta (seg)</label>
                <Input value={form.max_response_time} onChange={e => set("max_response_time", e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Critérios de Escalonamento para Humano</label>
              <Textarea value={form.criterios_escalonamento} onChange={e => set("criterios_escalonamento", e.target.value)} rows={3} />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium">Auto-aprovar melhorias de baixo risco</p>
                  <p className="text-xs text-muted-foreground">{"Melhorias com confiança >90% e impacto baixo são aplicadas automaticamente"}</p>
                </div>
                <Switch checked={form.auto_approve_low_risk === "true"} onCheckedChange={v => setBool("auto_approve_low_risk", v)} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium">Modo Noturno</p>
                  <p className="text-xs text-muted-foreground">Agentes operam em modo reduzido fora do horário (respostas automáticas básicas)</p>
                </div>
                <Switch checked={form.night_mode === "true"} onCheckedChange={v => setBool("night_mode", v)} />
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
                { key: "vigil_gate", label: "VIGIL Gate ativo em todas as mensagens", desc: "Verifica compliance fiscal e LGPD antes do envio" },
                { key: "bloqueio_dados_sensiveis", label: "Bloqueio de dados sensíveis", desc: "CPF, dados bancários e senhas nunca são armazenados" },
                { key: "auditoria_orion", label: "Auditoria automática (ÓRION)", desc: "ÓRION revisa 100% das interações em busca de anomalias" },
                { key: "limite_acoes_agente", label: "Limite de ações por agente", desc: "Máximo de 50 interações/hora por agente" },
                { key: "sandbox_novos_agentes", label: "Modo sandbox para novos agentes", desc: "Novos agentes operam em modo teste por 72h" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={form[item.key as keyof typeof form] === "true"}
                    onCheckedChange={v => setBool(item.key, v)}
                  />
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
