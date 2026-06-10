import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Send, ImageIcon, Globe, Eye } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getDestinationImage } from "@/components/travel-ui";

interface Props {
  saleId: string;
  sale: any;
  client?: any;
  onOpenPublishDialog: () => void;
  canPublish: boolean;
  score: number;
}

interface ComposerState {
  custom_title: string;
  cover_image_url: string;
  welcome_message: string;
  notes_for_client: string;
  visible: boolean;
  show_financial: boolean;
  show_documents: boolean;
}

function defaultTitle(sale: any): string {
  if (sale?.name) return sale.name;
  const dest = sale?.destination_iata || "Destino";
  const d = sale?.departure_date ? new Date(sale.departure_date + "T00:00:00") : null;
  const mes = d ? d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : "Em breve";
  return `${dest} · ${mes}`;
}

export default function PortalComposerTab({ saleId, sale, onOpenPublishDialog, canPublish, score }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingCover, setGeneratingCover] = useState(false);
  const [coverStrategy, setCoverStrategy] = useState<"hybrid" | "curated" | "ai">("hybrid");
  const [isPublished, setIsPublished] = useState(false);
  const [state, setState] = useState<ComposerState>({
    custom_title: "",
    cover_image_url: "",
    welcome_message: "",
    notes_for_client: "",
    visible: true,
    show_financial: true,
    show_documents: true,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: settings }, { data: pub }] = await Promise.all([
        (supabase as any).from("portal_settings").select("*").eq("scope", "global").maybeSingle(),
        (supabase as any).from("portal_published_sales").select("*").eq("sale_id", saleId).maybeSingle(),
      ]);

      const globalWelcome = settings?.default_welcome_message || "Bem-vindo ao seu portal de viagens! 🌍";
      const globalFin = settings?.show_financial ?? true;
      const globalDocs = settings?.show_documents ?? true;
      setCoverStrategy((settings?.cover_strategy as any) || "hybrid");

      setIsPublished(!!pub);
      setState({
        custom_title: pub?.custom_title || defaultTitle(sale),
        cover_image_url: pub?.cover_image_url || "",
        welcome_message: pub?.welcome_message || globalWelcome,
        notes_for_client: pub?.notes_for_client || "",
        visible: pub ? (pub.is_active ?? true) : true,
        show_financial: globalFin,
        show_documents: globalDocs,
      });
      setLoading(false);
    })();
  }, [saleId, sale]);

  const previewCover = useMemo(
    () => getDestinationImage(sale?.destination_iata || null, state.cover_image_url || null, saleId),
    [sale?.destination_iata, state.cover_image_url, saleId]
  );

  const set = <K extends keyof ComposerState>(k: K, v: ComposerState[K]) =>
    setState(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!isPublished) {
      toast.info("Use 'Publicar' para enviar a viagem ao portal pela primeira vez.");
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any)
      .from("portal_published_sales")
      .update({
        custom_title: state.custom_title || null,
        cover_image_url: state.cover_image_url || null,
        welcome_message: state.welcome_message || null,
        notes_for_client: state.notes_for_client || null,
        is_active: state.visible,
      })
      .eq("sale_id", saleId);
    setSaving(false);
    if (error) {
      console.error(error);
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Configuração do portal salva!");
    }
  };

  const handleGenerateCover = async () => {
    setGeneratingCover(true);
    try {
      const { data, error } = await supabase.functions.invoke("portal-generate-cover", {
        body: {
          sale_id: saleId,
          destination: sale?.destination_iata || sale?.name || "viagem",
          title: state.custom_title || defaultTitle(sale),
        },
      });
      if (error) throw error;
      const url = (data as any)?.url;
      if (!url) throw new Error("Sem URL retornada");
      set("cover_image_url", url);
      toast.success("Capa gerada por IA! Lembre de Salvar.");
    } catch (e: any) {
      console.error(e);
      toast.error("Falha ao gerar capa: " + (e?.message || "erro"));
    } finally {
      setGeneratingCover(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando composer...
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      <Card className="p-5 glass-card space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Globe className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Composer do Portal</h3>
              <p className="text-xs text-muted-foreground">
                {isPublished ? "Viagem já publicada · ajustes ficam visíveis na hora" : "Defina como o cliente verá esta viagem antes de publicar"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSave} disabled={saving || !isPublished}>
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
              Salvar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!canPublish) {
                  const ok = window.confirm(
                    `Score atual: ${score}%. O recomendado é ≥ 70%. Publicar mesmo assim?`
                  );
                  if (!ok) return;
                }
                onOpenPublishDialog();
              }}
            >
              <Send className="h-4 w-4 mr-1.5" />
              {isPublished ? "Republicar" : "Publicar"}
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Coluna texto */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Título da viagem</Label>
              <Input
                value={state.custom_title}
                onChange={e => set("custom_title", e.target.value)}
                placeholder={defaultTitle(sale)}
              />
              <p className="text-[11px] text-muted-foreground">
                Default: nome da venda ou "{`{destino} · {mês/ano}`}"
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">URL da capa (opcional)</Label>
              <Input
                value={state.cover_image_url}
                onChange={e => set("cover_image_url", e.target.value)}
                placeholder="https://..."
              />
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-[11px] text-muted-foreground">
                  Em branco · a gente usa a capa automática do destino.
                </p>
                {coverStrategy !== "curated" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleGenerateCover}
                    disabled={generatingCover}
                  >
                    {generatingCover
                      ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Gerando...</>
                      : <><ImageIcon className="h-3 w-3 mr-1" /> Gerar capa com IA</>}
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Mensagem de boas-vindas</Label>
              <Textarea
                value={state.welcome_message}
                onChange={e => set("welcome_message", e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Notas para o cliente</Label>
              <Textarea
                value={state.notes_for_client}
                onChange={e => set("notes_for_client", e.target.value)}
                rows={3}
                placeholder="Observações que aparecem no portal..."
              />
            </div>
          </div>

          {/* Coluna preview + toggles */}
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-xl border border-border/50 bg-muted/30 aspect-[16/10]">
              {previewCover ? (
                <img
                  src={previewCover}
                  alt="Capa do portal"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground gap-2 text-sm">
                  <ImageIcon className="h-4 w-4" /> Sem capa
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                <p className="text-white text-sm font-semibold line-clamp-1">{state.custom_title || defaultTitle(sale)}</p>
                <p className="text-white/80 text-xs">
                  {sale?.origin_iata || "?"} → {sale?.destination_iata || "?"}
                </p>
              </div>
            </div>

            <div className="space-y-2.5 p-3 rounded-lg border border-border/50">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Visível no portal</Label>
                <Switch checked={state.visible} onCheckedChange={v => set("visible", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Exibir financeiro <span className="text-[10px] text-muted-foreground">(herdado)</span></Label>
                <Switch checked={state.show_financial} onCheckedChange={v => set("show_financial", v)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Exibir documentos <span className="text-[10px] text-muted-foreground">(herdado)</span></Label>
                <Switch checked={state.show_documents} onCheckedChange={v => set("show_documents", v)} />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
