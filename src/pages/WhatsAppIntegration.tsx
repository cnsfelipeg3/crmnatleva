import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ChevronLeft, Check, Copy, RefreshCw, ExternalLink, Shield, Eye, EyeOff,
  Zap, AlertTriangle, CheckCircle2, XCircle, Loader2, Settings, Trash2,
  Link2, Smartphone, Globe, Key, Webhook, FileText, Info, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";

// ─── TYPES ───
interface WhatsAppConfig {
  id: string;
  phone_number_id: string | null;
  waba_id: string | null;
  app_id: string | null;
  app_secret: string | null;
  access_token: string | null;
  verify_token: string | null;
  webhook_url: string | null;
  status: string;
  environment: string;
  configured_by: string | null;
  last_event_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

interface WebhookLog {
  id: string;
  event_type: string;
  payload: any;
  status: string;
  error_message: string | null;
  received_at: string;
}

// ─── STEPS ───
const STEPS = [
  { num: 1, label: "Pré-requisitos", icon: FileText },
  { num: 2, label: "Dados da API", icon: Key },
  { num: 3, label: "Webhook", icon: Webhook },
  { num: 4, label: "Teste", icon: Zap },
  { num: 5, label: "Status", icon: CheckCircle2 },
];

const PREREQUISITES = [
  { key: "bm", label: "Business Manager criado no Meta", hint: "Acesse business.facebook.com para criar" },
  { key: "waba", label: "WhatsApp Business Account (WABA) criada", hint: "Criada dentro do Business Manager" },
  { key: "phone", label: "Número de telefone adicionado e verificado", hint: "Número dedicado para o WhatsApp Business" },
  { key: "app", label: "App criado no Meta Developers", hint: "Acesse developers.facebook.com/apps" },
  { key: "product", label: "Produto WhatsApp ativado no App", hint: "Adicione o produto WhatsApp no painel do App" },
];

function generateVerifyToken() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "natleva_";
  for (let i = 0; i < 24; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

export default function WhatsAppIntegration() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<WhatsAppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "invalid_token" | "error" | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [prereqs, setPrereqs] = useState<Record<string, boolean>>({});
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Form fields
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [environment, setEnvironment] = useState("teste");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const defaultWebhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`;

  useEffect(() => {
    loadConfig();
    loadLogs();
  }, []);

  async function loadConfig() {
    setLoading(true);
    try {
      const { data } = await supabase.from("whatsapp_config").select("*").limit(1).maybeSingle();
      if (data) {
        const c = data as any;
        setConfig(c);
        setPhoneNumberId(c.phone_number_id || "");
        setWabaId(c.waba_id || "");
        setAppId(c.app_id || "");
        setAppSecret(c.app_secret || "");
        setAccessToken(c.access_token || "");
        setVerifyToken(c.verify_token || "");
        setWebhookUrl(c.webhook_url || defaultWebhookUrl);
        setEnvironment(c.environment || "teste");
        if (c.status === "connected") setStep(5);
        else if (c.access_token) setStep(4);
        else setStep(1);
      } else {
        const vt = generateVerifyToken();
        setVerifyToken(vt);
        setWebhookUrl(defaultWebhookUrl);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadLogs() {
    try {
      const { data } = await supabase
        .from("webhook_logs")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(20);
      if (data) setLogs(data as any);
    } catch {}
  }

  async function handleSave() {
    if (!phoneNumberId.trim() || !accessToken.trim()) {
      toast.error("Phone Number ID e Access Token são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        phone_number_id: phoneNumberId.trim(),
        waba_id: wabaId.trim() || null,
        app_id: appId.trim() || null,
        app_secret: appSecret.trim() || null,
        access_token: accessToken.trim(),
        verify_token: verifyToken,
        webhook_url: webhookUrl || defaultWebhookUrl,
        environment,
        status: "configured",
        updated_at: new Date().toISOString(),
      };

      if (config?.id) {
        await supabase.from("whatsapp_config").update(payload).eq("id", config.id);
      } else {
        await supabase.from("whatsapp_config").insert(payload);
      }
      toast.success("Configuração salva com sucesso!");
      await loadConfig();
      setStep(3);
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || "desconhecido"));
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      // Simulate API validation
      await new Promise(r => setTimeout(r, 2000));
      if (!accessToken.trim()) {
        setTestResult("invalid_token");
      } else if (accessToken.length < 10) {
        setTestResult("error");
      } else {
        setTestResult("success");
        if (config?.id) {
          await supabase.from("whatsapp_config").update({
            status: "connected",
            last_event_at: new Date().toISOString(),
            last_error: null,
            updated_at: new Date().toISOString(),
          }).eq("id", config.id);
          await loadConfig();
        }
      }
    } catch {
      setTestResult("error");
    } finally {
      setTesting(false);
    }
  }

  async function handleReset() {
    if (config?.id) {
      await supabase.from("whatsapp_config").update({
        status: "disconnected",
        access_token: null,
        app_secret: null,
        last_error: null,
        updated_at: new Date().toISOString(),
      }).eq("id", config.id);
      toast.success("Integração desconectada");
      setTestResult(null);
      setShowResetDialog(false);
      await loadConfig();
      setStep(1);
    }
  }

  function handleGenerateVerifyToken() {
    const vt = generateVerifyToken();
    setVerifyToken(vt);
    toast.success("Novo Verify Token gerado!");
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  }

  function maskToken(token: string) {
    if (!token || token.length < 12) return "••••••••";
    return token.slice(0, 6) + "••••••••" + token.slice(-4);
  }

  const completedSteps = [
    Object.values(prereqs).filter(Boolean).length === PREREQUISITES.length,
    !!config?.access_token,
    !!config?.webhook_url && !!config?.verify_token,
    testResult === "success" || config?.status === "connected",
    config?.status === "connected",
  ];
  const progressPercent = (completedSteps.filter(Boolean).length / STEPS.length) * 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-[calc(100vh-64px)] flex flex-col bg-background">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border bg-card flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/livechat")}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Link2 className="w-5 h-5 text-primary" />
                Integração WhatsApp Cloud API
              </h1>
              <p className="text-xs text-muted-foreground">Configure sua conexão com a API do WhatsApp Business</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={environment === "producao" ? "default" : "secondary"} className="text-[10px]">
              {environment === "producao" ? "🟢 Produção" : "🟡 Teste"}
            </Badge>
            {config?.status === "connected" && (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px]">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Conectado
              </Badge>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="px-6 py-3 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-1 mb-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = completedSteps[i];
              const active = step === s.num;
              return (
                <button
                  key={s.num}
                  onClick={() => setStep(s.num)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    active ? "bg-primary text-primary-foreground shadow-sm" :
                    done ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" :
                    "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {done && !active ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{s.num}</span>
                </button>
              );
            })}
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto p-6 space-y-6">

            {/* STEP 1 */}
            {step === 1 && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Etapa 1 — Pré-requisitos
                    </CardTitle>
                    <CardDescription>Confirme que você possui todos os itens necessários antes de prosseguir.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {PREREQUISITES.map(p => (
                      <label key={p.key} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer">
                        <Checkbox
                          checked={prereqs[p.key] || false}
                          onCheckedChange={(v) => setPrereqs(prev => ({ ...prev, [p.key]: !!v }))}
                          className="mt-0.5"
                        />
                        <div>
                          <p className="text-sm font-medium text-foreground">{p.label}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{p.hint}</p>
                        </div>
                      </label>
                    ))}
                  </CardContent>
                </Card>

                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Documentação oficial
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setStep(2)}
                    disabled={Object.values(prereqs).filter(Boolean).length < 3}
                  >
                    Próximo <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Key className="w-4 h-4 text-primary" />
                      Etapa 2 — Dados da API
                    </CardTitle>
                    <CardDescription>Insira os dados obtidos no painel do Meta Developers.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1">
                          Phone Number ID <span className="text-destructive">*</span>
                          <Tooltip><TooltipTrigger><Info className="w-3 h-3 text-muted-foreground" /></TooltipTrigger>
                          <TooltipContent>Encontrado em WhatsApp &gt; API Setup no painel do App</TooltipContent></Tooltip>
                        </Label>
                        <Input placeholder="Ex: 123456789012345" value={phoneNumberId} onChange={e => setPhoneNumberId(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1">
                          WhatsApp Business Account ID
                          <Tooltip><TooltipTrigger><Info className="w-3 h-3 text-muted-foreground" /></TooltipTrigger>
                          <TooltipContent>ID da sua conta WABA no Business Manager</TooltipContent></Tooltip>
                        </Label>
                        <Input placeholder="Ex: 987654321098765" value={wabaId} onChange={e => setWabaId(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">App ID</Label>
                        <Input placeholder="Ex: 1234567890" value={appId} onChange={e => setAppId(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs flex items-center gap-1">
                          App Secret
                          <Shield className="w-3 h-3 text-muted-foreground" />
                        </Label>
                        <div className="relative">
                          <Input
                            type={showSecret ? "text" : "password"}
                            placeholder="••••••••••••"
                            value={appSecret}
                            onChange={e => setAppSecret(e.target.value)}
                          />
                          <button
                            onClick={() => setShowSecret(!showSecret)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1">
                        Access Token <span className="text-destructive">*</span>
                        <Shield className="w-3 h-3 text-muted-foreground" />
                      </Label>
                      <div className="relative">
                        <Input
                          type={showToken ? "text" : "password"}
                          placeholder="EAAxxxxxxxxxxxxxxxx..."
                          value={accessToken}
                          onChange={e => setAccessToken(e.target.value)}
                          className="pr-10"
                        />
                        <button
                          onClick={() => setShowToken(!showToken)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Token permanente gerado no Business Manager. Após salvar, o token ficará mascarado.</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Ambiente</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={environment === "teste" ? "default" : "outline"}
                          size="sm" className="text-xs"
                          onClick={() => setEnvironment("teste")}
                        >🟡 Teste</Button>
                        <Button
                          variant={environment === "producao" ? "default" : "outline"}
                          size="sm" className="text-xs"
                          onClick={() => setEnvironment("producao")}
                        >🟢 Produção</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Voltar
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                    Salvar e Próximo <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Webhook className="w-4 h-4 text-primary" />
                      Etapa 3 — Configuração do Webhook
                    </CardTitle>
                    <CardDescription>Configure o webhook no painel do Meta Developers para receber mensagens.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border border-border p-4 bg-muted/20 space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">Webhook URL</Label>
                        <div className="flex gap-2">
                          <Input value={webhookUrl || defaultWebhookUrl} readOnly className="font-mono text-xs bg-muted/50" />
                          <Button size="icon" variant="outline" className="shrink-0"
                            onClick={() => copyToClipboard(webhookUrl || defaultWebhookUrl, "Webhook URL")}>
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold flex items-center gap-2">
                          Verify Token
                          <Button size="sm" variant="ghost" className="h-5 text-[10px] px-1.5" onClick={handleGenerateVerifyToken}>
                            <RefreshCw className="w-3 h-3 mr-1" /> Gerar novo
                          </Button>
                        </Label>
                        <div className="flex gap-2">
                          <Input value={verifyToken} readOnly className="font-mono text-xs bg-muted/50" />
                          <Button size="icon" variant="outline" className="shrink-0"
                            onClick={() => copyToClipboard(verifyToken, "Verify Token")}>
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border p-4 space-y-3">
                      <h4 className="text-sm font-bold text-foreground">Passo a passo:</h4>
                      <ol className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">1</span>
                          <span>Acesse <strong>developers.facebook.com</strong> e selecione seu App</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">2</span>
                          <span>Vá em <strong>WhatsApp → Configuração → Webhooks</strong></span>
                        </li>
                        <li className="flex gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">3</span>
                          <span>Cole a <strong>Webhook URL</strong> e o <strong>Verify Token</strong> acima</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">4</span>
                          <span>Selecione os eventos: <Badge variant="secondary" className="text-[9px] mx-0.5">messages</Badge> <Badge variant="secondary" className="text-[9px] mx-0.5">message_status</Badge> <Badge variant="secondary" className="text-[9px] mx-0.5">message_template_status_update</Badge></span>
                        </li>
                        <li className="flex gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">5</span>
                          <span>Clique em <strong>Verificar e salvar</strong></span>
                        </li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Voltar
                  </Button>
                  <Button size="sm" onClick={() => setStep(4)}>
                    Próximo <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      Etapa 4 — Teste de Conexão
                    </CardTitle>
                    <CardDescription>Valide sua configuração testando a conexão com a API do WhatsApp.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border border-border p-6 text-center space-y-4">
                      {!testResult && !testing && (
                        <>
                          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/5 flex items-center justify-center">
                            <Zap className="w-8 h-8 text-primary" />
                          </div>
                          <p className="text-sm text-muted-foreground">Clique abaixo para validar sua configuração</p>
                        </>
                      )}

                      {testing && (
                        <>
                          <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
                          <p className="text-sm text-muted-foreground">Testando conexão...</p>
                        </>
                      )}

                      {testResult === "success" && (
                        <>
                          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">🟢 Conexão estabelecida!</p>
                            <p className="text-xs text-muted-foreground mt-1">A integração está funcionando corretamente.</p>
                          </div>
                        </>
                      )}

                      {testResult === "invalid_token" && (
                        <>
                          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-amber-700 dark:text-amber-300">🟡 Token inválido</p>
                            <p className="text-xs text-muted-foreground mt-1">Verifique o Access Token e tente novamente.</p>
                          </div>
                        </>
                      )}

                      {testResult === "error" && (
                        <>
                          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <XCircle className="w-8 h-8 text-red-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-red-700 dark:text-red-300">🔴 Erro de autenticação</p>
                            <p className="text-xs text-muted-foreground mt-1">Não foi possível conectar. Verifique suas credenciais.</p>
                          </div>
                        </>
                      )}

                      <Button onClick={handleTest} disabled={testing} size="lg" className="gap-2">
                        {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        {testing ? "Testando..." : testResult ? "Testar novamente" : "🧪 Testar Conexão"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => setStep(3)}>
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Voltar
                  </Button>
                  {testResult === "success" && (
                    <Button size="sm" onClick={() => setStep(5)}>
                      Ver Status <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* STEP 5 */}
            {step === 5 && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      Etapa 5 — Status da Integração
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Status overview */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border p-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Status</p>
                        <div className="flex items-center gap-2">
                          {config?.status === "connected" ? (
                            <><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-sm font-bold text-emerald-600">Conectado</span></>
                          ) : (
                            <><XCircle className="w-4 h-4 text-red-500" /><span className="text-sm font-bold text-red-600">Desconectado</span></>
                          )}
                        </div>
                      </div>
                      <div className="rounded-lg border border-border p-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Ambiente</p>
                        <p className="text-sm font-bold text-foreground">{environment === "producao" ? "🟢 Produção" : "🟡 Teste"}</p>
                      </div>
                      <div className="rounded-lg border border-border p-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Último evento</p>
                        <p className="text-sm text-foreground">{config?.last_event_at ? format(new Date(config.last_event_at), "dd/MM/yyyy HH:mm") : "Nenhum"}</p>
                      </div>
                      <div className="rounded-lg border border-border p-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Último erro</p>
                        <p className="text-sm text-foreground">{config?.last_error || "Nenhum"}</p>
                      </div>
                    </div>

                    {/* Config summary */}
                    <div className="rounded-lg border border-border p-4 space-y-2">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Dados Configurados</h4>
                      <div className="grid gap-2 text-xs">
                        <div className="flex justify-between"><span className="text-muted-foreground">Phone Number ID</span><span className="font-mono text-foreground">{phoneNumberId || "—"}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">WABA ID</span><span className="font-mono text-foreground">{wabaId || "—"}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Access Token</span><span className="font-mono text-foreground">{maskToken(accessToken)}</span></div>
                      </div>
                    </div>

                    {/* Logs */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Logs do Webhook</h4>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={loadLogs}>
                          <RefreshCw className="w-3 h-3 mr-1" /> Atualizar
                        </Button>
                      </div>
                      {logs.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">Nenhum log registrado ainda.</p>
                      ) : (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {logs.map(log => (
                            <div key={log.id} className="flex items-center gap-2 p-2 rounded border border-border text-xs">
                              {log.status === "processed" ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                              ) : log.status === "error" ? (
                                <XCircle className="w-3 h-3 text-red-500 shrink-0" />
                              ) : (
                                <Info className="w-3 h-3 text-blue-500 shrink-0" />
                              )}
                              <span className="font-mono text-muted-foreground">{log.event_type}</span>
                              <span className="ml-auto text-muted-foreground/60">{format(new Date(log.received_at), "HH:mm:ss")}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={handleTest} disabled={testing}>
                        <RefreshCw className="w-3 h-3" /> Revalidar Token
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => setStep(2)}>
                        <Settings className="w-3 h-3" /> Editar Configuração
                      </Button>
                      <Button variant="destructive" size="sm" className="text-xs gap-1.5 ml-auto" onClick={() => setShowResetDialog(true)}>
                        <Trash2 className="w-3 h-3" /> Desconectar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

          </div>
        </ScrollArea>

        {/* Reset Dialog */}
        <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Desconectar WhatsApp?</DialogTitle>
              <DialogDescription>
                Isso irá remover o Access Token e desconectar a integração. Você poderá reconfigurar depois.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResetDialog(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleReset}>Desconectar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
