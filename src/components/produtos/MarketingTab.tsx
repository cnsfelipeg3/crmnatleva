import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Loader2, Sparkles, Download, Wand2, ImagePlus, RefreshCw, Trash2, Eye, Calendar, Zap, Pencil, Copy, MessageSquareText,
} from "lucide-react";
import { toast } from "sonner";
import MarketingAssetEditor from "./MarketingAssetEditor";
import { FORMATS, type FormatId, findFormat } from "@/lib/marketing/formats";
import {
  buildArtUserPrompt,
  buildBrandSystemPrompt,
  buildSalesHeadline,
  buildSalesSubheadline,
  buildScarcityBadge,
  autoDeriveIncludes,
  TONE_LABEL,
  type ArtBriefing,
  type ArtTone,
  type PaymentSnapshot,
} from "@/lib/marketing/natlevaBrand";
import { computeNatlevaPlan, formatMoneyBR } from "@/lib/prateleira/payment-plan";

interface Props {
  productId: string | null;
  title: string;
  destination: string;
  originCity?: string;
  shortDescription: string;
  priceFrom: string;
  pricePromo: string;
  coverUrl: string;
  galleryUrls: string[];
  departureDate: string;
  returnDate?: string;
  includes?: string[];
  hotelName?: string;
  hotelStars?: string;
  nights?: string;
  seatsLeft?: string;
  paxMin?: string | number;
  paxMax?: string | number;
  paxAdults?: string | number;
  paxChildren?: string | number;
  isPromo?: boolean;
  productKind?: string;
  airline?: string;
  originIata?: string;
  destinationIata?: string;
  highlights?: string[];
  paymentTerms?: {
    entryPercent?: number;
    entryAmount?: number;
    daysBefore?: number;
    maxInstallments?: number;
    minInstallment?: number;
    pixDiscountPercent?: number;
  };
}

interface Asset {
  id: string;
  product_id: string;
  format: string;
  url: string;
  model: string | null;
  created_at: string;
  prompt: any;
  caption?: string | null;
}

function formatBRDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatRelative(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function groupByDay(list: Asset[]): { day: string; label: string; items: Asset[] }[] {
  const map = new Map<string, Asset[]>();
  for (const a of list) {
    const d = new Date(a.created_at);
    const key = d.toISOString().slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  const today = new Date().toISOString().slice(0, 10);
  const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, items]) => ({
      day,
      label:
        day === today ? "Hoje"
          : day === yest ? "Ontem"
          : new Date(day + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
      items,
    }));
}

export default function MarketingTab(props: Props) {
  const {
    productId, title, destination, originCity, shortDescription, priceFrom, pricePromo,
    coverUrl, galleryUrls, departureDate, returnDate, includes,
    hotelName, hotelStars, nights, seatsLeft, paxMin, paxMax, paxAdults, paxChildren, isPromo, paymentTerms,
    productKind, airline, originIata, destinationIata, highlights,
  } = props;

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
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [captioning, setCaptioning] = useState<Record<string, boolean>>({});
  const [bulkCaptioning, setBulkCaptioning] = useState(false);

  const allImages = useMemo(() => {
    const arr = [coverUrl, ...galleryUrls].filter(Boolean);
    return Array.from(new Set(arr));
  }, [coverUrl, galleryUrls]);

  // Caption de pax · prioriza composição adultos + crianças (Ex: "Valor para 2 adultos + 1 criança")
  const paxLabel = useMemo(() => {
    const adults = Number(paxAdults) || 0;
    const children = Number(paxChildren) || 0;
    if (adults > 0 || children > 0) {
      const parts: string[] = [];
      if (adults > 0) parts.push(`${adults} ${adults === 1 ? "adulto" : "adultos"}`);
      if (children > 0) parts.push(`${children} ${children === 1 ? "criança" : "crianças"}`);
      return `Valor total para ${parts.join(" + ")}`;
    }
    const min = Number(paxMin) || 0;
    const max = Number(paxMax) || 0;
    if (min && max && min !== max) return `Valor total para ${min} a ${max} pessoas`;
    const total = max || min;
    if (!total) return "Valor total do pacote";
    return `Valor total para ${total} ${total === 1 ? "pessoa" : "pessoas"}`;
  }, [paxMin, paxMax, paxAdults, paxChildren]);

  // Plano de pagamento atrativo (entrada + parcelas) · não exibe valor total cheio
  const payment: PaymentSnapshot | undefined = useMemo(() => {
    const price = Number(pricePromo) || Number(priceFrom) || 0;
    if (!price) return undefined;
    const plan = computeNatlevaPlan(price, departureDate || null, {
      entryPercent: paymentTerms?.entryPercent ?? 30,
      entryAmount: paymentTerms?.entryAmount,
      daysBefore: paymentTerms?.daysBefore ?? 20,
      maxInstallments: paymentTerms?.maxInstallments ?? 12,
      minInstallment: paymentTerms?.minInstallment ?? 200,
      pixDiscountPercent: paymentTerms?.pixDiscountPercent ?? 0,
    });
    if (!plan) return undefined;
    return {
      entryLabel: `Entrada ${formatMoneyBR(plan.entryAmount)}`,
      installmentsLabel: `+ ${plan.installments}x ${formatMoneyBR(plan.installmentAmount)} sem juros no boleto`,
      pixLabel: plan.pixTotal
        ? `Ou ${formatMoneyBR(plan.pixTotal)} à vista no PIX (-${plan.pixDiscountPercent}%)`
        : undefined,
      fromLabel: `A partir de ${formatMoneyBR(plan.total)} por pessoa`,
      paxLabel,
    };
  }, [priceFrom, pricePromo, departureDate, paymentTerms, paxLabel]);

  const scarcity = useMemo(() => buildScarcityBadge(seatsLeft), [seatsLeft]);

  // Lista final de "Está incluso" · usa o cadastro manual quando preenchido,
  // senão deriva automaticamente das infos do produto (kind, hotel, noites, aéreo, highlights).
  const effectiveIncludes = useMemo(() => {
    const manual = (includes || []).filter(Boolean);
    if (manual.length > 0) return manual.slice(0, 5);
    return autoDeriveIncludes({
      productKind,
      nights,
      hotelName,
      hotelStars,
      airline,
      originIata,
      destinationIata,
      highlights: (highlights || []).filter(Boolean),
      mealPlan: shortDescription,
    });
  }, [includes, productKind, nights, hotelName, hotelStars, airline, originIata, destinationIata, highlights, shortDescription]);

  // Pré-preenche briefing usando gatilhos de venda
  useEffect(() => {
    if (headline) return;
    setHeadline(buildSalesHeadline({
      destination: destination || title,
      nights,
      isPromo,
      scarcity: !!scarcity,
    }));
  }, [destination, title, nights, isPromo, scarcity]); // eslint-disable-line

  useEffect(() => {
    if (subheadline) return;
    setSubheadline(buildSalesSubheadline({
      hotelName,
      hotelStars,
      departureDate: formatBRDate(departureDate),
      returnDate: formatBRDate(returnDate),
      shortDescription,
    }));
  }, [hotelName, hotelStars, departureDate, returnDate, shortDescription]); // eslint-disable-line

  useEffect(() => {
    if (!refImage && coverUrl) setRefImage(coverUrl);
  }, [coverUrl]); // eslint-disable-line

  const buildBriefing = (): ArtBriefing => ({
    headline: headline.trim(),
    subheadline: subheadline.trim(),
    cta: cta.trim() || "Garanta sua vaga",
    tone,
    destination: destination || undefined,
    originCity: originCity || undefined,
    hotelName: hotelName || undefined,
    hotelStars: hotelStars || undefined,
    nights: nights || undefined,
    departureDate: formatBRDate(departureDate) || undefined,
    returnDate: formatBRDate(returnDate) || undefined,
    includes: effectiveIncludes.slice(0, 4),
    payment,
    scarcity,
  });

  // Histórico
  const refreshAssets = async () => {
    if (!productId) return;
    const { data } = await (supabase as any)
      .from("product_marketing_assets")
      .select("*").eq("product_id", productId)
      .order("created_at", { ascending: false });
    setAssets((data as Asset[]) || []);
  };

  useEffect(() => { refreshAssets(); }, [productId]); // eslint-disable-line

  const formatsToGenerate = (Object.entries(selected) as [FormatId, boolean][])
    .filter(([, v]) => v).map(([k]) => k);

  async function generate() {
    if (!productId) { toast.error("Salve o produto antes de gerar artes"); return; }
    if (!headline.trim() || !subheadline.trim()) {
      toast.error("Preencha headline e subheadline"); return;
    }
    if (formatsToGenerate.length === 0) { toast.error("Selecione ao menos um formato"); return; }
    if (!refImage) { toast.error("Selecione a imagem de referência"); return; }
    if (!originCity?.trim()) {
      toast.error("Cidade de origem obrigatória", {
        description: "Toda arte promocional precisa da origem (ex: São Paulo). Cadastre em 'Cidade de origem' na aba do produto.",
      });
      return;
    }

    setGenerating(true);
    const briefing = buildBriefing();
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
              reference_image_url: refImage,
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
      await refreshAssets();
    } finally {
      setGenerating(false);
    }
  }

  async function refine(asset: Asset) {
    if (!refinePrompt.trim() || !productId) return;
    setRefining(asset.id);
    try {
      const f = findFormat(asset.format as FormatId);
      const briefing = buildBriefing();
      const userPrompt = buildArtUserPrompt(briefing, f.label, f.aspect);
      const { data, error } = await supabase.functions.invoke("marketing-image-gen", {
        body: {
          product_id: productId,
          format: asset.format,
          aspect: f.aspect,
          system_prompt: buildBrandSystemPrompt(),
          user_prompt: userPrompt,
          refine_from_url: asset.url,
          reference_image_url: refImage || undefined,
          refine_prompt: refinePrompt.trim(),
          briefing,
          use_pro: usePro,
        },
      });
      if (error || (data as any)?.error) throw new Error(error?.message || (data as any).error);
      toast.success("Variação gerada");
      setRefinePrompt("");
      await refreshAssets();
    } catch (e: any) {
      toast.error("Falha ao refinar", { description: e?.message });
    } finally {
      setRefining(null);
    }
  }

  async function removeAsset(asset: Asset) {
    if (!confirm("Remover esta arte do histórico?")) return;
    await (supabase as any).from("product_marketing_assets").delete().eq("id", asset.id);
    setAssets((prev) => prev.filter((a) => a.id !== asset.id));
    toast.success("Arte removida");
  }

  async function generateCaption(asset: Asset, regenerate = false) {
    setCaptioning((s) => ({ ...s, [asset.id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("marketing-caption-gen", {
        body: {
          asset_id: asset.id,
          product_id: productId,
          format: asset.format,
          briefing: buildBriefing(),
          regenerate,
        },
      });
      if (error || (data as any)?.error) throw new Error(error?.message || (data as any).error);
      const caption = (data as any).caption as string;
      setAssets((prev) => prev.map((a) => (a.id === asset.id ? { ...a, caption } : a)));
      toast.success(regenerate ? "Legenda regerada" : "Legenda gerada");
    } catch (e: any) {
      toast.error("Falha ao gerar legenda", { description: e?.message });
    } finally {
      setCaptioning((s) => ({ ...s, [asset.id]: false }));
    }
  }

  async function generateMissingCaptions() {
    const pending = assets.filter((a) => !a.caption);
    if (pending.length === 0) { toast.info("Todas as artes já têm legenda"); return; }
    setBulkCaptioning(true);
    try {
      let ok = 0;
      for (const a of pending) {
        try {
          await generateCaption(a, false);
          ok++;
        } catch { /* segue */ }
      }
      toast.success(`${ok} legenda(s) gerada(s)`);
    } finally {
      setBulkCaptioning(false);
    }
  }

  async function copyCaption(asset: Asset) {
    if (!asset.caption) return;
    try {
      await navigator.clipboard.writeText(asset.caption);
      toast.success("Legenda copiada");
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  function downloadAsset(a: Asset) {
    const link = document.createElement("a");
    link.href = a.url;
    link.target = "_blank";
    link.download = `natleva-${a.format}-${a.id.slice(0, 6)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const groups = useMemo(() => groupByDay(assets), [assets]);

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-3 border-primary/30 bg-primary/5">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-sm flex items-center gap-1.5">
              Gerar artes para redes sociais <Sparkles className="w-3.5 h-3.5 text-primary" />
            </h2>
            <p className="text-xs text-muted-foreground">
              Padrão visual NatLeva · logotipo oficial, datas, hospedagem, entrada + parcelas e gatilhos de venda já injetados.
            </p>
          </div>
        </div>
      </Card>

      {!productId && (
        <Card className="p-4 text-sm text-muted-foreground">
          Salve o produto primeiro para liberar a geração de artes.
        </Card>
      )}

      {/* Resumo do que será injetado */}
      {productId && (
        <Card className="p-4 bg-muted/30 border-dashed">
          <div className="flex flex-wrap gap-2 text-[11px]">
            {destination && <Badge variant="secondary">{destination}</Badge>}
            {nights && <Badge variant="secondary">{nights} noites</Badge>}
            {departureDate && (
              <Badge variant="secondary" className="gap-1"><Calendar className="w-3 h-3" />
                {formatBRDate(departureDate)}{returnDate ? ` → ${formatBRDate(returnDate)}` : ""}
              </Badge>
            )}
            {originCity ? (
              <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/40 hover:bg-amber-500/15">
                Saindo de {originCity}
              </Badge>
            ) : (
              <Badge variant="destructive">Defina a cidade de origem</Badge>
            )}
            {hotelName && <Badge variant="secondary">{hotelName}{hotelStars ? ` · ${hotelStars}★` : ""}</Badge>}
            {payment && <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/15">{payment.entryLabel} · {payment.installmentsLabel.replace("+ ", "")}</Badge>}
            {scarcity && <Badge variant="destructive" className="gap-1"><Zap className="w-3 h-3" />{scarcity}</Badge>}
            {effectiveIncludes.slice(0, 3).map((i, idx) => (
              <Badge key={idx} variant="outline" className="font-normal">{i}</Badge>
            ))}
          </div>
          {!payment && (
            <p className="text-[11px] text-muted-foreground mt-2">
              Defina o preço na aba Preço para injetar entrada + parcelas na arte.
            </p>
          )}
        </Card>
      )}

      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Headline (gatilho de venda)</Label>
            <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="DESTINO · ÚLTIMAS VAGAS" />
          </div>
          <div>
            <Label>CTA do botão</Label>
            <Input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Garanta sua vaga" />
          </div>
          <div className="md:col-span-2">
            <Label>Subheadline</Label>
            <Textarea rows={2} value={subheadline} onChange={(e) => setSubheadline(e.target.value)}
              placeholder="Hotel · datas · all-inclusive frente mar" />
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
            <Label>Bloco de preço (auto · entrada + parcelas)</Label>
            <Input
              value={payment ? `${payment.entryLabel} · ${payment.installmentsLabel.replace("+ ", "")}` : ""}
              readOnly
              placeholder="defina o preço na aba Preço"
            />
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

      {/* HISTÓRICO */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="font-semibold text-sm flex items-center gap-1.5">
            <ImagePlus className="w-4 h-4 text-primary" /> Histórico de artes
          </h3>
          <div className="flex items-center gap-2">
            {assets.some((a) => !a.caption) && (
              <Button
                size="sm"
                variant="outline"
                onClick={generateMissingCaptions}
                disabled={bulkCaptioning}
              >
                {bulkCaptioning ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Gerando legendas...</>
                ) : (
                  <><MessageSquareText className="w-3.5 h-3.5 mr-1.5" />Gerar legendas pendentes</>
                )}
              </Button>
            )}
            <Badge variant="secondary">{assets.length}</Badge>
          </div>
        </div>

        {assets.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhuma arte gerada ainda. Configure o briefing acima e clique em Gerar artes.
          </p>
        )}

        {groups.map((group) => (
          <div key={group.day} className="space-y-3">
            <div className="flex items-center gap-2 sticky top-0 bg-card py-1 z-10">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </div>
              <div className="flex-1 h-px bg-border" />
              <div className="text-[11px] text-muted-foreground">{group.items.length} arte(s)</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.items.map((a) => {
                const f = FORMATS.find((x) => x.id === a.format);
                return (
                  <div key={a.id} className="rounded-xl border bg-card overflow-hidden flex flex-col group">
                    <button
                      type="button"
                      onClick={() => setPreviewAsset(a)}
                      className="bg-muted/30 flex items-center justify-center relative overflow-hidden"
                      style={{ aspectRatio: f ? `${f.width}/${f.height}` : "1/1" }}
                    >
                      <img src={a.url} alt={f?.label} className="w-full h-full object-contain transition-transform group-hover:scale-[1.02]" loading="lazy" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{f?.label || a.format}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {formatRelative(a.created_at)}
                          </div>
                        </div>
                        <div className="flex gap-0.5 shrink-0">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setPreviewAsset(a)} title="Visualizar">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingAsset(a)} title="Editar (estilo Canva)">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => downloadAsset(a)} title="Baixar">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeAsset(a)} title="Remover">
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

                      {/* LEGENDA SUGERIDA */}
                      <div className="rounded-lg border bg-muted/30 p-2.5 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                            <MessageSquareText className="w-3 h-3" /> Legenda sugerida
                          </div>
                          <div className="flex gap-0.5">
                            {a.caption && (
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyCaption(a)} title="Copiar legenda">
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => generateCaption(a, !!a.caption)}
                              disabled={!!captioning[a.id]}
                              title={a.caption ? "Regerar legenda" : "Gerar legenda"}
                            >
                              {captioning[a.id]
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : a.caption
                                  ? <RefreshCw className="w-3.5 h-3.5" />
                                  : <Sparkles className="w-3.5 h-3.5" />}
                            </Button>
                          </div>
                        </div>
                        {a.caption ? (
                          <Textarea
                            value={a.caption}
                            onChange={(e) => setAssets((prev) => prev.map((x) => x.id === a.id ? { ...x, caption: e.target.value } : x))}
                            onBlur={async (e) => {
                              await (supabase as any)
                                .from("product_marketing_assets")
                                .update({ caption: e.target.value })
                                .eq("id", a.id);
                            }}
                            rows={6}
                            className="text-xs leading-relaxed resize-y"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => generateCaption(a, false)}
                            disabled={!!captioning[a.id]}
                            className="w-full text-left text-xs text-muted-foreground hover:text-foreground py-2 px-1 rounded transition-colors flex items-center gap-1.5"
                          >
                            {captioning[a.id]
                              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando legenda estratégica...</>
                              : <><Sparkles className="w-3.5 h-3.5" /> Gerar legenda estratégica para essa arte</>}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </Card>

      {/* Preview modal */}
      <Dialog open={!!previewAsset} onOpenChange={(o) => !o && setPreviewAsset(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {previewAsset && (
            <div className="flex flex-col">
              <div className="bg-black/90 flex items-center justify-center max-h-[80vh]">
                <img src={previewAsset.url} alt="" className="max-h-[80vh] w-auto object-contain" />
              </div>
              <div className="p-4 flex items-center justify-between gap-3 bg-card">
                <div>
                  <div className="text-sm font-semibold">
                    {FORMATS.find((x) => x.id === previewAsset.format)?.label || previewAsset.format}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatRelative(previewAsset.created_at)} · {previewAsset.model || "ia"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setEditingAsset(previewAsset); setPreviewAsset(null); }}>
                    <Pencil className="w-4 h-4 mr-1.5" /> Editar
                  </Button>
                  <Button variant="outline" onClick={() => downloadAsset(previewAsset)}>
                    <Download className="w-4 h-4 mr-1.5" /> Baixar
                  </Button>
                  <Button variant="destructive" onClick={() => { removeAsset(previewAsset); setPreviewAsset(null); }}>
                    <Trash2 className="w-4 h-4 mr-1.5" /> Remover
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <MarketingAssetEditor
        asset={editingAsset}
        onClose={() => setEditingAsset(null)}
        onSaved={refreshAssets}
      />
    </div>
  );
}
