import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Palette, Globe, Save, Sparkles, Loader2, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

type CoverStrategy = "hybrid" | "curated" | "ai";

interface PortalSettings {
  id?: string;
  show_financial: boolean;
  show_checklist: boolean;
  show_documents: boolean;
  auto_publish: boolean;
  cover_strategy: CoverStrategy;
  auto_enrich: boolean;
  ai_welcome: boolean;
  default_welcome_message: string;
  support_whatsapp: string | null;
}

const DEFAULTS: PortalSettings = {
  show_financial: true,
  show_checklist: true,
  show_documents: true,
  auto_publish: false,
  cover_strategy: "hybrid",
  auto_enrich: true,
  ai_welcome: true,
  default_welcome_message: "Bem-vindo ao seu portal de viagens! 🌍",
  support_whatsapp: "",
};

import { computeReadiness as computeFullReadiness } from "@/lib/portalReadiness";

interface TripReadiness {
  sale_id: string;
  name: string | null;
  destination_iata: string | null;
  departure_date: string | null;
  return_date: string | null;
  is_published: boolean;
  score: number;
  missing: string[];
}

function computeReadiness(
  sale: any,
  segCount: number,
  attCount: number,
  isPublished: boolean,
  paxCount = 0,
  hotelCount = 0,
): TripReadiness {
  const r = computeFullReadiness({ sale, segCount, attCount, paxCount, hotelCount });
  return {
    sale_id: sale.id,
    name: sale.name,
    destination_iata: sale.destination_iata,
    departure_date: sale.departure_date,
    return_date: sale.return_date,
    is_published: isPublished,
    score: r.score,
    missing: r.missing.map(m => m.label),
  };
}


export default function PortalAdminConfig() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PortalSettings>(DEFAULTS);
  const [trips, setTrips] = useState<TripReadiness[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);

  // Load settings
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("portal_settings" as any)
        .select("*")
        .eq("scope", "global")
        .maybeSingle();
      if (error) {
        console.error(error);
        toast.error("Erro ao carregar configurações");
      } else if (data) {
        setSettings({
          id: (data as any).id,
          show_financial: (data as any).show_financial,
          show_checklist: (data as any).show_checklist,
          show_documents: (data as any).show_documents,
          auto_publish: (data as any).auto_publish,
          cover_strategy: ((data as any).cover_strategy || "hybrid") as CoverStrategy,
          auto_enrich: (data as any).auto_enrich,
          ai_welcome: (data as any).ai_welcome,
          default_welcome_message: (data as any).default_welcome_message ?? DEFAULTS.default_welcome_message,
          support_whatsapp: (data as any).support_whatsapp ?? "",
        });
      }
      setLoading(false);
    })();
  }, []);

  // Load trips + readiness
  useEffect(() => {
    (async () => {
      setLoadingTrips(true);
      const { data: sales } = await supabase
        .from("sales")
        .select("id, name, destination_iata, origin_iata, departure_date, return_date")
        .is("deleted_at", null)
        .order("departure_date", { ascending: false, nullsFirst: false })
        .limit(40);
      if (!sales?.length) {
        setTrips([]);
        setLoadingTrips(false);
        return;
      }
      const ids = sales.map((s) => s.id);
      const [{ data: pub }, { data: segs }, { data: atts }] = await Promise.all([
        supabase.from("portal_published_sales").select("sale_id, is_active").in("sale_id", ids),
        supabase.from("flight_segments").select("sale_id").in("sale_id", ids),
        supabase.from("attachments").select("sale_id").in("sale_id", ids),
      ]);
      const segMap = new Map<string, number>();
      (segs || []).forEach((s: any) => segMap.set(s.sale_id, (segMap.get(s.sale_id) || 0) + 1));
      const attMap = new Map<string, number>();
      (atts || []).forEach((a: any) => attMap.set(a.sale_id, (attMap.get(a.sale_id) || 0) + 1));
      const pubSet = new Set((pub || []).filter((p: any) => p.is_active).map((p: any) => p.sale_id));

      const list = sales.map((s) =>
        computeReadiness(s, segMap.get(s.id) || 0, attMap.get(s.id) || 0, pubSet.has(s.id))
      );
      list.sort((a, b) => a.score - b.score);
      setTrips(list);
      setLoadingTrips(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      scope: "global",
      show_financial: settings.show_financial,
      show_checklist: settings.show_checklist,
      show_documents: settings.show_documents,
      auto_publish: settings.auto_publish,
      cover_strategy: settings.cover_strategy,
      auto_enrich: settings.auto_enrich,
      ai_welcome: settings.ai_welcome,
      default_welcome_message: settings.default_welcome_message,
      support_whatsapp: settings.support_whatsapp || null,
    };
    const { error } = await supabase
      .from("portal_settings" as any)
      .upsert(payload, { onConflict: "scope" });
    setSaving(false);
    if (error) {
      console.error(error);
      toast.error("Erro ao salvar configurações");
    } else {
      toast.success("Configurações salvas!");
    }
  };

  const set = <K extends keyof PortalSettings>(key: K, value: PortalSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const lowReadiness = useMemo(() => trips.filter((t) => t.score < 80).length, [trips]);

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando configurações...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações do Portal</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Padrões globais herdados por todas as viagens publicadas.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ── Visibilidade ── */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Visibilidade</h3>
              <p className="text-xs text-muted-foreground">O que os viajantes podem ver</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="financial" className="text-sm">Mostrar informações financeiras</Label>
              <Switch id="financial" checked={settings.show_financial} onCheckedChange={(v) => set("show_financial", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="checklist" className="text-sm">Mostrar checklist de viagem</Label>
              <Switch id="checklist" checked={settings.show_checklist} onCheckedChange={(v) => set("show_checklist", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="documents" className="text-sm">Mostrar documentos</Label>
              <Switch id="documents" checked={settings.show_documents} onCheckedChange={(v) => set("show_documents", v)} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="autopublish" className="text-sm">Auto-publicar ao fechar venda</Label>
              <Switch id="autopublish" checked={settings.auto_publish} onCheckedChange={(v) => set("auto_publish", v)} />
            </div>
          </div>
        </Card>

        {/* ── Personalização ── */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Palette className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Personalização</h3>
              <p className="text-xs text-muted-foreground">Aparência do portal</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-sm mb-1.5 block">Mensagem de boas-vindas</Label>
              <Input
                value={settings.default_welcome_message}
                onChange={(e) => set("default_welcome_message", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">WhatsApp de suporte</Label>
              <Input
                placeholder="+55 11 99999-9999"
                value={settings.support_whatsapp ?? ""}
                onChange={(e) => set("support_whatsapp", e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* ── Padrões de publicação ── */}
        <Card className="p-6 space-y-5 md:col-span-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Padrões de publicação</h3>
              <p className="text-xs text-muted-foreground">Como cada viagem é preparada ao publicar</p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Estratégia de capa</Label>
              <Select
                value={settings.cover_strategy}
                onValueChange={(v) => set("cover_strategy", v as CoverStrategy)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hybrid">Híbrida (curado + IA)</SelectItem>
                  <SelectItem value="curated">Banco curado</SelectItem>
                  <SelectItem value="ai">Gerar com IA</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
              <div>
                <Label htmlFor="auto-enrich" className="text-sm">Auto-preencher</Label>
                <p className="text-xs text-muted-foreground">Capa, título e boas-vindas ao publicar</p>
              </div>
              <Switch id="auto-enrich" checked={settings.auto_enrich} onCheckedChange={(v) => set("auto_enrich", v)} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
              <div>
                <Label htmlFor="ai-welcome" className="text-sm">Boas-vindas com IA</Label>
                <p className="text-xs text-muted-foreground">Gerar mensagem personalizada</p>
              </div>
              <Switch id="ai-welcome" checked={settings.ai_welcome} onCheckedChange={(v) => set("ai_welcome", v)} />
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Configurações
        </Button>
      </div>

      {/* ── Prontidão das viagens ── */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Settings className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Prontidão das viagens</h3>
              <p className="text-xs text-muted-foreground">
                {loadingTrips
                  ? "Calculando..."
                  : `${trips.length} viagens analisadas · ${lowReadiness} precisam de atenção`}
              </p>
            </div>
          </div>
        </div>

        {loadingTrips ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando viagens...
          </div>
        ) : trips.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma viagem encontrada.</p>
        ) : (
          <div className="divide-y divide-border">
            {trips.map((t) => {
              const scoreColor =
                t.score >= 80 ? "text-emerald-600" : t.score >= 50 ? "text-amber-600" : "text-destructive";
              const barColor =
                t.score >= 80 ? "bg-emerald-500" : t.score >= 50 ? "bg-amber-500" : "bg-destructive";
              return (
                <div key={t.sale_id} className="py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {t.name || "Sem nome"}
                      </p>
                      {t.is_published ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" /> publicada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground">
                          <AlertCircle className="h-3 w-3" /> rascunho
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {t.destination_iata || "—"} · {t.departure_date || "?"} → {t.return_date || "?"}
                      {t.missing.length > 0 && (
                        <span className="ml-2 text-amber-600">faltam: {t.missing.join(", ")}</span>
                      )}
                    </p>
                  </div>
                  <div className="w-32 hidden sm:block">
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full ${barColor}`} style={{ width: `${t.score}%` }} />
                    </div>
                  </div>
                  <span className={`text-sm font-bold tabular-nums w-10 text-right ${scoreColor}`}>
                    {t.score}%
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/portal-admin/viagens/${t.sale_id}`)}
                  >
                    Configurar
                    <ExternalLink className="h-3 w-3 ml-1.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
