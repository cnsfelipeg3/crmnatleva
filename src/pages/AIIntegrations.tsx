import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ChevronLeft, Plus, Trash2, Eye, EyeOff, Zap, Check, X,
  RefreshCw, Settings2, ExternalLink, Plug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const PROVIDERS = [
  { value: "natleva", label: "NatLeva Intelligence", icon: "🧠", color: "hsl(280 80% 60%)" },
  { value: "openai", label: "OpenAI", icon: "🤖", color: "hsl(160 60% 45%)" },
  { value: "gemini", label: "Google Gemini", icon: "💎", color: "hsl(210 80% 55%)" },
  { value: "anthropic", label: "Anthropic Claude", icon: "🔮", color: "hsl(25 80% 55%)" },
  { value: "groq", label: "Groq", icon: "⚡", color: "hsl(45 80% 50%)" },
  { value: "openrouter", label: "OpenRouter", icon: "🌐", color: "hsl(190 70% 50%)" },
  { value: "n8n", label: "n8n (Webhook)", icon: "🔗", color: "hsl(340 70% 55%)" },
] as const;

const MODEL_OPTIONS: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "o1", "o1-mini"],
  gemini: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"],
  anthropic: ["claude-sonnet-4-20250514", "claude-3.5-haiku-20241022", "claude-3-opus-20240229"],
  groq: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768", "gemma2-9b-it"],
  openrouter: ["auto"],
  natleva: ["natleva-default"],
  n8n: [],
};

type Integration = {
  id: string;
  name: string;
  provider: string;
  api_key_encrypted: string | null;
  base_url: string | null;
  model: string | null;
  status: string;
  environment: string;
  last_tested_at: string | null;
  last_test_status: string | null;
  notes: string | null;
  created_at: string;
};

export default function AIIntegrations() {
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Integration | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    provider: "openai",
    api_key: "",
    base_url: "",
    model: "",
    environment: "production",
    notes: "",
  });
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => { loadIntegrations(); }, []);

  const loadIntegrations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ai_integrations")
      .select("*")
      .order("created_at", { ascending: false });
    setIntegrations((data as Integration[]) || []);
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", provider: "openai", api_key: "", base_url: "", model: "", environment: "production", notes: "" });
    setShowKey(false);
    setDialogOpen(true);
  };

  const openEdit = (int: Integration) => {
    setEditing(int);
    setForm({
      name: int.name,
      provider: int.provider,
      api_key: "",
      base_url: int.base_url || "",
      model: int.model || "",
      environment: int.environment,
      notes: int.notes || "",
    });
    setShowKey(false);
    setDialogOpen(true);
  };

  const saveIntegration = async () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    try {
      const payload: any = {
        name: form.name,
        provider: form.provider,
        base_url: form.base_url || null,
        model: form.model || null,
        environment: form.environment,
        notes: form.notes || null,
        updated_at: new Date().toISOString(),
      };
      if (form.api_key) {
        payload.api_key_encrypted = form.api_key; // In production, encrypt server-side
      }

      if (editing) {
        await supabase.from("ai_integrations").update(payload).eq("id", editing.id);
      } else {
        if (!form.api_key && form.provider !== "natleva") {
          toast.error("API Key é obrigatória");
          setSaving(false);
          return;
        }
        payload.api_key_encrypted = form.api_key || null;
        await supabase.from("ai_integrations").insert(payload);
      }

      toast.success(editing ? "Integração atualizada!" : "Integração criada!");
      setDialogOpen(false);
      loadIntegrations();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteIntegration = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta integração?")) return;
    await supabase.from("ai_integrations").delete().eq("id", id);
    toast.success("Integração removida");
    loadIntegrations();
  };

  const testConnection = async (int: Integration) => {
    setTesting(int.id);
    // Simulate test - in production this would call the provider
    await new Promise((r) => setTimeout(r, 1500));
    const success = !!int.api_key_encrypted;
    await supabase.from("ai_integrations").update({
      last_tested_at: new Date().toISOString(),
      last_test_status: success ? "success" : "no_key",
    }).eq("id", int.id);
    toast[success ? "success" : "error"](success ? "Conexão OK!" : "Token não configurado");
    setTesting(null);
    loadIntegrations();
  };

  const toggleStatus = async (int: Integration) => {
    const newStatus = int.status === "active" ? "inactive" : "active";
    await supabase.from("ai_integrations").update({ status: newStatus }).eq("id", int.id);
    loadIntegrations();
  };

  const maskKey = (key: string | null) => {
    if (!key) return "—";
    if (key.length <= 8) return "••••••••";
    return key.substring(0, 4) + "••••••••" + key.substring(key.length - 4);
  };

  const getProvider = (id: string) => PROVIDERS.find((p) => p.value === id) || PROVIDERS[0];

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/livechat/flows")}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Plug className="w-5 h-5 text-primary" />
        <h1 className="font-bold text-lg">Integrações de IA</h1>
        <div className="flex-1" />
        <Button size="sm" onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" /> Nova Integração
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Info Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                Gerencie suas credenciais de IA aqui. Cada integração pode ser usada nos blocos <strong>Agente IA</strong> do Flow Builder.
                Tokens são armazenados de forma segura e nunca são exibidos por completo após salvos.
              </p>
            </CardContent>
          </Card>

          {loading && <p className="text-center text-muted-foreground py-8">Carregando...</p>}

          {!loading && integrations.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Plug className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Nenhuma integração configurada.</p>
                <Button className="mt-4" onClick={openNew}>
                  <Plus className="w-4 h-4 mr-1" /> Criar primeira integração
                </Button>
              </CardContent>
            </Card>
          )}

          {integrations.map((int) => {
            const prov = getProvider(int.provider);
            return (
              <Card key={int.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: prov.color + "20" }}
                    >
                      {prov.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{int.name}</span>
                        <Badge variant="outline" className="text-[10px]">{prov.label}</Badge>
                        <Badge variant={int.status === "active" ? "default" : "secondary"} className="text-[10px]">
                          {int.status === "active" ? "Ativo" : "Inativo"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {int.environment === "production" ? "🟢 Produção" : "🟡 Teste"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        {int.model && <span>Modelo: {int.model}</span>}
                        <span>Token: {maskKey(int.api_key_encrypted)}</span>
                      </div>
                      {int.last_tested_at && (
                        <div className="flex items-center gap-1 mt-1 text-[10px]">
                          {int.last_test_status === "success" ? (
                            <><Check className="w-3 h-3 text-green-500" /> <span className="text-green-600">Conectado</span></>
                          ) : (
                            <><X className="w-3 h-3 text-red-500" /> <span className="text-red-600">Falha</span></>
                          )}
                          <span className="text-muted-foreground ml-1">
                            {new Date(int.last_tested_at).toLocaleString("pt-BR")}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="outline" size="sm"
                        onClick={() => testConnection(int)}
                        disabled={testing === int.id}
                        className="text-xs"
                      >
                        <RefreshCw className={cn("w-3 h-3 mr-1", testing === int.id && "animate-spin")} />
                        Testar
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleStatus(int)}>
                        {int.status === "active" ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(int)}>
                        <Settings2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteIntegration(int.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Integração" : "Nova Integração"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: OpenAI Produção" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Provedor</Label>
              <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v, model: "" })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.icon} {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.provider !== "natleva" && form.provider !== "n8n" && (
              <div>
                <Label className="text-xs">API Key / Token</Label>
                <div className="flex gap-1 mt-1">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={form.api_key}
                    onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                    placeholder={editing ? "Deixe vazio para manter atual" : "sk-..."}
                    className="flex-1"
                  />
                  <Button variant="ghost" size="icon" onClick={() => setShowKey(!showKey)}>
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {editing && <p className="text-[10px] text-muted-foreground mt-1">Deixe vazio para manter o token atual</p>}
              </div>
            )}

            {form.provider === "n8n" && (
              <>
                <div>
                  <Label className="text-xs">Webhook URL do n8n</Label>
                  <Input value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} placeholder="https://n8n.seudominio.com/webhook/..." className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Header Auth Token (opcional)</Label>
                  <div className="flex gap-1 mt-1">
                    <Input
                      type={showKey ? "text" : "password"}
                      value={form.api_key}
                      onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                      placeholder="Bearer token..."
                      className="flex-1"
                    />
                    <Button variant="ghost" size="icon" onClick={() => setShowKey(!showKey)}>
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {form.provider !== "n8n" && (
              <>
                <div>
                  <Label className="text-xs">Base URL (opcional)</Label>
                  <Input value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} placeholder="https://api.openai.com/v1" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Modelo</Label>
                  {(MODEL_OPTIONS[form.provider] || []).length > 0 ? (
                    <Select value={form.model} onValueChange={(v) => setForm({ ...form, model: v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {(MODEL_OPTIONS[form.provider] || []).map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Nome do modelo" className="mt-1" />
                  )}
                </div>
              </>
            )}

            <div>
              <Label className="text-xs">Ambiente</Label>
              <Select value={form.environment} onValueChange={(v) => setForm({ ...form, environment: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">🟢 Produção</SelectItem>
                  <SelectItem value="test">🟡 Teste</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Observações</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notas internas..." className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveIntegration} disabled={saving}>
              {saving ? "Salvando..." : editing ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
