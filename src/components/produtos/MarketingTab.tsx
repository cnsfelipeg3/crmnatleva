import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Download, Wand2, ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FORMATS, type FormatId, findFormat } from "@/lib/marketing/formats";
import {
  buildArtUserPrompt,
  buildBrandSystemPrompt,
  TONE_LABEL,
  type ArtBriefing,
  type ArtTone,
} from "@/lib/marketing/natlevaBrand";

interface Props {
  productId: string | null;
  title: string;
  destination: string;
  shortDescription: string;
  priceFrom: string;
  pricePromo: string;
  coverUrl: string;
  galleryUrls: string[];
  departureDate: string;
}

interface Asset {
  id: string;
  product_id: string;
  format: string;
  url: string;
  model: string | null;
  created_at: string;
  prompt: any;
}

function brl(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v.replace(",", ".")) : v;
  if (!Number.isFinite(n) || n <= 0) return "";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default function MarketingTab({
  productId, title, destination, shortDescription, priceFrom, pricePromo, coverUrl, galleryUrls, departureDate,
}: Props) {
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [cta, setCta] = useState("Garanta sua vaga");
  const [tone, setTone] = useState<ArtTone>("promocional");
  const [refImage, setRefImage] = useState("");
  const [selected, setSelected] = useState<Record<FormatId, boolean>>({
    feed: true, story: true, vertical: false, horizontal: false,
  });
  const [usePro, setUsePro] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [refining, setRefining] = useState<string | null>(null);
  const [refinePrompt, setRefinePrompt] = useState("");

  const allImages = useMemo(() => {
    const arr = [coverUrl, ...galleryUrls].filter(Boolean);
    return Array.from(new Set(arr));
  }, [coverUrl, galleryUrls]);

  // Pre-fill briefing from product
  useEffect(() => {
    if (!headline && (title || destination)) {
      const base = destination ? `${destination}` : title;
      setHeadline(base.toUpperCase().slice(0, 40));
    }
    if (!subheadline) {
      const parts: string[] = [];
      if (shortDescription) parts.push(shortDescription);
      else if (title && destination && !title.toLowerCase().includes(destination.toLowerCase())) parts.push(title);
      setSubheadline(parts.join(" · ").slice(0, 90));
    }
    if (!refImage && coverUrl) setRefImage(coverUrl);
  }, [title, destination, shortDescription, coverUrl]); // eslint-disable-line

  const priceLabel = useMemo(() => {
    const promo = brl(pricePromo);
    const from = brl(priceFrom);
    if (promo) return `A partir de ${promo}`;
    if (from) return `A partir de ${from}`;
    return "";
  }, [priceFrom, pricePromo]);

  // Load history
  useEffect(() => {
    if (!productId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("product_marketing_assets")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      setAssets((data as Asset[]) || []);
    })();
  }, [productId]);

  const formatsToGenerate = (Object.entries(selected) as [FormatId, boolean][])
    .filter(([, v]) => v).map(([k]) => k);

  async function generate() {
    if (!productId) {
      toast.error("Salve o produto antes de gerar artes");
      return;
    }
    if (!headline.trim() || !subheadline.trim()) {
      toast.error("Preencha headline e subheadline");
      return;
    }
    if (formatsToGenerate.length === 0) {
      toast.error("Selecione ao menos um formato");
      return;
    }
    setGenerating(true);
    const briefing: ArtBriefing = {
      headline: headline.trim(),
      subheadline: subheadline.trim(),
      cta: cta.trim() || "Garanta sua vaga",
      tone,
      destination: destination || undefined,
      priceLabel: priceLabel || undefined,
    };
    const system = buildBrandSystemPrompt();

    try {
      const results = await Promise.allSettled(
        formatsToGenerate.map(async (fid) => {
          const f = findFormat(fid);
          const userPrompt = buildArtUserPrompt(briefing, f.label, f.aspect);
          const { data, error } = await supabase.functions.invoke("marketing-image-gen", {
            body: {
              product_id: productId,
              format: fid,
              aspect: f.aspect,
              system_prompt: system,
              user_prompt: userPrompt,
              reference_image_url: refImage || undefined,
              briefing,
              use_pro: usePro,
            },
          });
          if (error) throw new Error(error.message);
          if ((data as any)?.error) throw new Error((data as any).error);
          return data as { asset: Asset };
        }),
      );

      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.length - ok;
      if (ok > 0) toast.success(`${ok} arte(s) gerada(s)`);
      if (fail > 0) {
        const firstErr = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
        toast.error(`${fail} falha(s)`, { description: firstErr?.reason?.message || "" });
      }
      // refresh
      const { data } = await (supabase as any)
        .from("product_marketing_assets")
        .select("*").eq("product_id", productId)
        .order("created_at", { ascending: false });
      setAssets((data as Asset[]) || []);
    } finally {
      setGenerating(false);
    }
  }

  async function refine(asset: Asset) {
    if (!refinePrompt.trim() || !productId) return;
    setRefining(asset.id);
    try {
      const f = findFormat(asset.format as FormatId);
      const briefing: ArtBriefing = {
        headline, subheadline, cta, tone,
        destination: destination || undefined,
        priceLabel: priceLabel || undefined,
      };
      const userPrompt = buildArtUserPrompt(briefing, f.label, f.aspect);
      const { data, error } = await supabase.functions.invoke("marketing-image-gen", {
        body: {
          product_id: productId,
          format: asset.format,
          aspect: f.aspect,
          system_prompt: buildBrandSystemPrompt(),
          user_prompt: userPrompt,
          refine_from_url: asset.url,
          refine_prompt: refinePrompt.trim(),
          briefing,
          use_pro: usePro,
        },
      });
      if (error || (data as any)?.error) throw new Error(error?.message || (data as any).error);
      toast.success("Variação gerada");
      setRefinePrompt("");
      const { data: list } = await (supabase as any)
        .from("product_marketing_assets")
        .select("*").eq("product_id", productId)
        .order("created_at", { ascending: false });
      setAssets((list as Asset[]) || []);
    } catch (e: any) {
      toast.error("Falha ao refinar", { description: e?.message });
    } finally {
      setRefining(null);
    }
  }

  async function removeAsset(asset: Asset) {
    if (!confirm("Remover esta arte?")) return;
    await (supabase as any).from("product_marketing_assets").delete().eq("id", asset.id);
    setAssets((prev) => prev.filter((a) => a.id !== asset.id));
  }

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-4 border-primary/30 bg-primary/5">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-sm flex items-center gap-1.5">
              Gerar artes para redes sociais <Sparkles className="w-3.5 h-3.5 text-primary" />
            </h2>
            <p className="text-xs text-muted-foreground">
              Baseado nas informações do produto, gera artes prontas no padrão visual NatLeva · feed, stories, reels e banner.
            </p>
          </div>
        </div>
      </Card>

      {!productId && (
        <Card className="p-4 text-sm text-muted-foreground">
          Salve o produto primeiro para liberar a geração de artes.
        </Card>
      )}

      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Headline</Label>
            <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="CANCUN · 7 NOITES" />
          </div>
          <div>
            <Label>CTA do botão</Label>
            <Input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Garanta sua vaga" />
          </div>
          <div className="md:col-span-2">
            <Label>Subheadline</Label>
            <Textarea rows={2} value={subheadline} onChange={(e) => setSubheadline(e.target.value)}
              placeholder={`Saída ${departureDate || "12/out"} · all-inclusive frente mar`} />
          </div>
          <div>
            <Label>Tom</Label>
            <Select value={tone} onValueChange={(v) => setTone(v as ArtTone)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TONE_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Bloco de preço (auto)</Label>
            <Input value={priceLabel} readOnly placeholder="defina o preço na aba Preço" />
          </div>
        </div>

        <div>
          <Label className="mb-1.5 block">Imagem de referência (background)</Label>
          {allImages.length === 0 ? (
            <p className="text-xs text-muted-foreground">Cadastre ao menos uma foto na aba Mídia.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {allImages.slice(0, 10).map((url) => (
                <button
                  type="button"
                  key={url}
                  onClick={() => setRefImage(url)}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${refImage === url ? "border-primary ring-2 ring-primary/40" : "border-transparent hover:border-border"}`}
                >
                  <img src={url} alt="" loading="lazy" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <Label className="mb-1.5 block">Formatos</Label>
          <div className="flex flex-wrap gap-2">
            {FORMATS.map((f) => {
              const active = selected[f.id];
              return (
                <button
                  type="button"
                  key={f.id}
                  onClick={() => setSelected((s) => ({ ...s, [f.id]: !s[f.id] }))}
                  className={`px-3 py-2 rounded-lg border text-left transition-all ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/50"}`}
                >
                  <div className="text-xs font-semibold">{f.label}</div>
                  <div className={`text-[11px] ${active ? "opacity-90" : "text-muted-foreground"}`}>{f.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={usePro} onChange={(e) => setUsePro(e.target.checked)} />
            Usar modelo Pro (qualidade máxima · mais lento)
          </label>
          <Button onClick={generate} disabled={generating || !productId}>
            {generating ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Gerando...</> : <><Sparkles className="w-4 h-4 mr-1.5" />Gerar artes</>}
          </Button>
        </div>
      </Card>

      {assets.length > 0 && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              <ImagePlus className="w-4 h-4 text-primary" /> Artes geradas
            </h3>
            <Badge variant="secondary">{assets.length}</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map((a) => {
              const f = FORMATS.find((x) => x.id === a.format);
              return (
                <div key={a.id} className="rounded-xl border bg-card overflow-hidden flex flex-col">
                  <div className="bg-muted/30 flex items-center justify-center" style={{ aspectRatio: f ? `${f.width}/${f.height}` : "1/1" }}>
                    <img src={a.url} alt={f?.label} className="w-full h-full object-contain" loading="lazy" />
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold">{f?.label || a.format}</div>
                        <div className="text-[10px] text-muted-foreground">{a.model || "ia"}</div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" asChild title="Baixar">
                          <a href={a.url} download target="_blank" rel="noreferrer">
                            <Download className="w-4 h-4" />
                          </a>
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => removeAsset(a)} title="Remover">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Input
                        value={refining === a.id ? refinePrompt : ""}
                        onChange={(e) => { setRefining(a.id); setRefinePrompt(e.target.value); }}
                        placeholder="ex: headline maior, fundo mais escuro"
                        className="h-8 text-xs"
                      />
                      <Button size="sm" variant="outline" onClick={() => refine(a)} disabled={refining !== null && refining !== a.id}>
                        {refining === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
