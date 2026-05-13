import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Trash2, Save, Youtube, Sparkles, Loader2, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";

const KIND_OPTIONS = [
  { value: "pacote", label: "Pacote completo" },
  { value: "aereo", label: "Passagem aérea" },
  { value: "hospedagem", label: "Hospedagem" },
  { value: "passeio", label: "Passeio" },
  { value: "cruzeiro", label: "Cruzeiro" },
  { value: "outros", label: "Outros" },
];

type ProductForm = {
  // basic
  slug: string; title: string; product_kind: string;
  destination: string; destination_country: string; category: string;
  status: string; is_active: boolean; sale_page_enabled: boolean;
  // dates
  departure_date: string; return_date: string; flexible_dates: boolean;
  // content
  short_description: string; description: string;
  cover_image_url: string; gallery: string;
  highlights: string; includes: string; excludes: string;
  how_it_works: string; pickup_info: string; recommendations: string;
  duration: string;
  // price
  price_from: string; price_promo: string; price_label: string; currency: string;
  payment_entry_percent: string; payment_days_before: string;
  payment_entry_percent_min: string; payment_entry_percent_max: string;
  payment_entry_methods: { pix: boolean; cartao: boolean; link: boolean };
  payment_entry_card_installments_max: string;
  payment_balance_method: "boleto" | "cartao" | "ambos";
  payment_balance_installments_max: string;
  payment_balance_min_installment: string;
  payment_balance_interest_percent: string;
  payment_pix_discount_percent: string;
  payment_notes: string;
  is_promo: boolean; promo_badge: string;
  // logistics
  origin_city: string; origin_iata: string; destination_iata: string;
  airline: string; hotel_name: string; hotel_stars: string;
  nights: string; pax_min: string; pax_max: string; seats_total: string; seats_left: string;
  // sales page
  seo_title: string; seo_description: string; og_image: string; whatsapp_cta_text: string;
};

const empty: ProductForm = {
  slug: "", title: "", product_kind: "pacote",
  destination: "", destination_country: "", category: "",
  status: "active", is_active: true, sale_page_enabled: true,
  departure_date: "", return_date: "", flexible_dates: false,
  short_description: "", description: "",
  cover_image_url: "", gallery: "",
  highlights: "", includes: "", excludes: "",
  how_it_works: "", pickup_info: "", recommendations: "",
  duration: "",
  price_from: "", price_promo: "", price_label: "por pessoa", currency: "BRL",
  payment_entry_percent: "30", payment_days_before: "20",
  payment_entry_percent_min: "20", payment_entry_percent_max: "50",
  payment_entry_methods: { pix: true, cartao: true, link: true },
  payment_entry_card_installments_max: "3",
  payment_balance_method: "boleto",
  payment_balance_installments_max: "12",
  payment_balance_min_installment: "200",
  payment_balance_interest_percent: "0",
  payment_pix_discount_percent: "0",
  payment_notes: "",
  is_promo: false, promo_badge: "",
  origin_city: "", origin_iata: "", destination_iata: "",
  airline: "", hotel_name: "", hotel_stars: "",
  nights: "", pax_min: "", pax_max: "", seats_total: "", seats_left: "",
  seo_title: "", seo_description: "", og_image: "", whatsapp_cta_text: "",
};

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}

export default function ProdutoEditor() {
  const { slug } = useParams();
  const isEdit = !!slug;
  const navigate = useNavigate();
  const [form, setForm] = useState<ProductForm>(empty);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [ytUrl, setYtUrl] = useState("");
  const [ytLoading, setYtLoading] = useState(false);

  const importFromYouTube = async () => {
    if (!ytUrl.trim()) return toast.error("Cole a URL do vídeo do YouTube");
    setYtLoading(true);
    const tId = toast.loading("Analisando vídeo e gerando o produto...");
    try {
      const { data, error } = await supabase.functions.invoke("product-from-youtube", { body: { url: ytUrl.trim() } });
      if (error) throw error;
      const p = data?.product;
      if (!p) throw new Error("Resposta vazia da IA");
      setForm((f) => ({
        ...f,
        title: p.title ?? f.title,
        slug: f.slug || slugify(p.title ?? ""),
        destination: p.destination ?? f.destination,
        destination_country: p.destination_country ?? f.destination_country,
        category: p.category ?? f.category,
        short_description: p.short_description ?? f.short_description,
        description: p.description ?? f.description,
        duration: p.duration ?? f.duration,
        how_it_works: p.how_it_works ?? f.how_it_works,
        pickup_info: p.pickup_info ?? f.pickup_info,
        recommendations: p.recommendations ?? f.recommendations,
        highlights: Array.isArray(p.highlights) ? p.highlights.join("\n") : f.highlights,
        includes: Array.isArray(p.includes) ? p.includes.join("\n") : f.includes,
        excludes: Array.isArray(p.excludes) ? p.excludes.join("\n") : f.excludes,
      }));
      toast.success("Produto preenchido com base no vídeo", { id: tId });
    } catch (e: any) {
      toast.error("Não foi possível extrair", { id: tId, description: e?.message });
    } finally { setYtLoading(false); }
  };

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("experience_products").select("*").eq("slug", slug).maybeSingle();
      if (data) {
        setRecordId(data.id);
        setForm({
          slug: data.slug, title: data.title, product_kind: data.product_kind || "pacote",
          destination: data.destination, destination_country: data.destination_country ?? "",
          category: data.category ?? "",
          status: data.status || "active", is_active: data.is_active, sale_page_enabled: data.sale_page_enabled !== false,
          departure_date: data.departure_date ?? "", return_date: data.return_date ?? "",
          flexible_dates: !!data.flexible_dates,
          short_description: data.short_description ?? "", description: data.description ?? "",
          cover_image_url: data.cover_image_url ?? "",
          gallery: (data.gallery ?? []).map((g: any) => g.url).join("\n"),
          highlights: (data.highlights ?? []).join("\n"),
          includes: (data.includes ?? []).join("\n"),
          excludes: (data.excludes ?? []).join("\n"),
          how_it_works: data.how_it_works ?? "", pickup_info: data.pickup_info ?? "",
          recommendations: data.recommendations ?? "", duration: data.duration ?? "",
          price_from: data.price_from?.toString() ?? "", price_promo: data.price_promo?.toString() ?? "",
          price_label: data.price_label ?? "por pessoa", currency: data.currency ?? "BRL",
          payment_entry_percent: (data.payment_terms?.entry_percent ?? 30).toString(),
          payment_days_before: (data.payment_terms?.min_days_before_checkin ?? 20).toString(),
          is_promo: !!data.is_promo, promo_badge: data.promo_badge ?? "",
          origin_city: data.origin_city ?? "", origin_iata: data.origin_iata ?? "",
          destination_iata: data.destination_iata ?? "",
          airline: data.airline ?? "", hotel_name: data.hotel_name ?? "",
          hotel_stars: data.hotel_stars?.toString() ?? "",
          nights: data.nights?.toString() ?? "",
          pax_min: data.pax_min?.toString() ?? "", pax_max: data.pax_max?.toString() ?? "",
          seats_total: data.seats_total?.toString() ?? "", seats_left: data.seats_left?.toString() ?? "",
          seo_title: data.seo_title ?? "", seo_description: data.seo_description ?? "",
          og_image: data.og_image ?? "", whatsapp_cta_text: data.whatsapp_cta_text ?? "",
        });
      }
      setLoading(false);
    })();
  }, [slug, isEdit]);

  const set = <K extends keyof ProductForm>(k: K, v: ProductForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const linesToArr = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
  const numOrNull = (s: string) => s.trim() ? Number(s) : null;

  const save = async () => {
    if (!form.title || !form.destination) return toast.error("Título e destino são obrigatórios");
    setSaving(true);
    const finalSlug = form.slug || slugify(form.title);
    const payload: any = {
      slug: finalSlug,
      title: form.title, product_kind: form.product_kind,
      destination: form.destination, destination_country: form.destination_country || null,
      category: form.category || null,
      status: form.status, is_active: form.is_active, sale_page_enabled: form.sale_page_enabled,
      departure_date: form.departure_date || null, return_date: form.return_date || null,
      flexible_dates: form.flexible_dates,
      short_description: form.short_description || null, description: form.description || null,
      cover_image_url: form.cover_image_url || null,
      gallery: linesToArr(form.gallery).map((url) => ({ url, type: "image" })),
      highlights: linesToArr(form.highlights),
      includes: linesToArr(form.includes),
      excludes: linesToArr(form.excludes),
      how_it_works: form.how_it_works || null, pickup_info: form.pickup_info || null,
      recommendations: form.recommendations || null, duration: form.duration || null,
      price_from: numOrNull(form.price_from), price_promo: numOrNull(form.price_promo),
      price_label: form.price_label || null, currency: form.currency || "BRL",
      installments_max: null,
      installments_no_interest: null,
      pix_discount_percent: null,
      payment_terms: {
        plan: "natleva_default",
        entry_percent: numOrNull(form.payment_entry_percent) ?? 30,
        min_days_before_checkin: numOrNull(form.payment_days_before) ?? 20,
      },
      is_promo: form.is_promo, promo_badge: form.promo_badge || null,
      origin_city: form.origin_city || null, origin_iata: form.origin_iata || null,
      destination_iata: form.destination_iata || null,
      airline: form.airline || null, hotel_name: form.hotel_name || null,
      hotel_stars: numOrNull(form.hotel_stars), nights: numOrNull(form.nights),
      pax_min: numOrNull(form.pax_min), pax_max: numOrNull(form.pax_max),
      seats_total: numOrNull(form.seats_total), seats_left: numOrNull(form.seats_left),
      seo_title: form.seo_title || null, seo_description: form.seo_description || null,
      og_image: form.og_image || null, whatsapp_cta_text: form.whatsapp_cta_text || null,
    };
    const { error } = isEdit && recordId
      ? await (supabase as any).from("experience_products").update(payload).eq("id", recordId)
      : await (supabase as any).from("experience_products").insert(payload);
    setSaving(false);
    if (error) return toast.error("Erro ao salvar: " + error.message);
    toast.success(isEdit ? "Produto atualizado" : "Produto criado");
    navigate(`/prateleira/${finalSlug}`);
  };

  const remove = async () => {
    if (!recordId) return;
    if (!confirm("Excluir este produto?")) return;
    await (supabase as any).from("experience_products").delete().eq("id", recordId);
    toast.success("Produto excluído");
    navigate("/prateleira");
  };

  const copyPublic = () => {
    const url = `${window.location.origin}/p/${form.slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link público copiado");
  };

  if (loading) return <div className="p-8 text-muted-foreground text-sm">Carregando...</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link to="/prateleira"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1.5" /> Prateleira</Button></Link>
        <div className="flex flex-wrap gap-2">
          {isEdit && (
            <>
              <Button variant="outline" size="sm" onClick={copyPublic}><Copy className="w-4 h-4 mr-1.5" /> Copiar link</Button>
              <a href={`/p/${form.slug}`} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm"><ExternalLink className="w-4 h-4 mr-1.5" /> Ver página</Button>
              </a>
              <Button variant="outline" size="sm" onClick={remove}><Trash2 className="w-4 h-4 mr-1.5" /> Excluir</Button>
            </>
          )}
          <Button size="sm" onClick={save} disabled={saving}>
            <Save className="w-4 h-4 mr-1.5" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      <h1 className="font-serif text-2xl sm:text-3xl">{isEdit ? "Editar produto" : "Novo produto da prateleira"}</h1>

      {!isEdit && (
        <Card className="p-5 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3 mb-3">
            <Youtube className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h2 className="font-semibold text-sm flex items-center gap-1.5">A partir de um vídeo do YouTube <Sparkles className="w-3.5 h-3.5 text-amber-500" /></h2>
              <p className="text-xs text-muted-foreground">A IA assiste o vídeo e preenche os campos.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input value={ytUrl} onChange={(e) => setYtUrl(e.target.value)} placeholder="https://youtube.com/..." disabled={ytLoading} />
            <Button onClick={importFromYouTube} disabled={ytLoading || !ytUrl.trim()}>
              {ytLoading ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Analisando...</> : <><Sparkles className="w-4 h-4 mr-1.5" />Gerar com IA</>}
            </Button>
          </div>
        </Card>
      )}

      <Tabs defaultValue="basico" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
          <TabsTrigger value="basico">Básico</TabsTrigger>
          <TabsTrigger value="midia">Mídia</TabsTrigger>
          <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
          <TabsTrigger value="preco">Preço & Pagamento</TabsTrigger>
          <TabsTrigger value="logistica">Logística</TabsTrigger>
          <TabsTrigger value="venda">Página de venda</TabsTrigger>
        </TabsList>

        {/* BÁSICO */}
        <TabsContent value="basico" className="space-y-4 mt-4">
          <Card className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Tipo de produto *</Label>
                <Select value={form.product_kind} onValueChange={(v) => set("product_kind", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{KIND_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="paused">Pausado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Título *</Label>
                <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex: Pacote Cancun · 7 noites all-inclusive" />
              </div>
              <div>
                <Label>Slug (URL)</Label>
                <Input value={form.slug} onChange={(e) => set("slug", slugify(e.target.value))} placeholder="auto a partir do título" />
              </div>
              <div>
                <Label>Categoria</Label>
                <Input value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="Ex: praia, romântico, família" />
              </div>
              <div>
                <Label>Destino *</Label>
                <Input value={form.destination} onChange={(e) => set("destination", e.target.value)} placeholder="Cancun" />
              </div>
              <div>
                <Label>País</Label>
                <Input value={form.destination_country} onChange={(e) => set("destination_country", e.target.value)} placeholder="México" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Data de ida</Label>
                <Input type="date" value={form.departure_date} onChange={(e) => set("departure_date", e.target.value)} disabled={form.flexible_dates} />
              </div>
              <div>
                <Label>Data de volta</Label>
                <Input type="date" value={form.return_date} onChange={(e) => set("return_date", e.target.value)} disabled={form.flexible_dates} />
              </div>
              <div className="flex items-end">
                <div className="flex items-center gap-2 pb-2">
                  <Switch checked={form.flexible_dates} onCheckedChange={(v) => set("flexible_dates", v)} />
                  <Label className="!m-0">Datas flexíveis</Label>
                </div>
              </div>
            </div>
            <div>
              <Label>Resumo curto</Label>
              <Textarea rows={2} value={form.short_description} onChange={(e) => set("short_description", e.target.value)} placeholder="Frase de impacto que aparece nos cards" />
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
                <Label className="!m-0">Aparece na vitrine</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.sale_page_enabled} onCheckedChange={(v) => set("sale_page_enabled", v)} />
                <Label className="!m-0">Página de venda ativa</Label>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* MIDIA */}
        <TabsContent value="midia" className="space-y-4 mt-4">
          <Card className="p-5 space-y-4">
            <div>
              <Label>URL da imagem de capa</Label>
              <Input value={form.cover_image_url} onChange={(e) => set("cover_image_url", e.target.value)} placeholder="https://..." />
              {form.cover_image_url && <img src={form.cover_image_url} alt="" className="mt-3 max-h-48 rounded-lg object-cover" />}
            </div>
            <div>
              <Label>Galeria (uma URL por linha)</Label>
              <Textarea rows={5} value={form.gallery} onChange={(e) => set("gallery", e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label>Imagem OG (compartilhamento WhatsApp/Facebook)</Label>
              <Input value={form.og_image} onChange={(e) => set("og_image", e.target.value)} placeholder="opcional · usa a capa se vazio" />
            </div>
          </Card>
        </TabsContent>

        {/* CONTEUDO */}
        <TabsContent value="conteudo" className="space-y-4 mt-4">
          <Card className="p-5 space-y-4">
            <div>
              <Label>Descrição completa</Label>
              <Textarea rows={6} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Conte a história da viagem..." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Destaques (1 por linha)</Label>
                <Textarea rows={5} value={form.highlights} onChange={(e) => set("highlights", e.target.value)} />
              </div>
              <div>
                <Label>Está incluso</Label>
                <Textarea rows={5} value={form.includes} onChange={(e) => set("includes", e.target.value)} />
              </div>
              <div>
                <Label>Não está incluso</Label>
                <Textarea rows={5} value={form.excludes} onChange={(e) => set("excludes", e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Como funciona</Label>
              <Textarea rows={3} value={form.how_it_works} onChange={(e) => set("how_it_works", e.target.value)} />
            </div>
            <div>
              <Label>Recomendações</Label>
              <Textarea rows={3} value={form.recommendations} onChange={(e) => set("recommendations", e.target.value)} />
            </div>
            <div>
              <Label>Duração / pickup</Label>
              <Input value={form.duration} onChange={(e) => set("duration", e.target.value)} placeholder="Ex: 7 dias / 6 noites" />
            </div>
          </Card>
        </TabsContent>

        {/* PRECO */}
        <TabsContent value="preco" className="space-y-4 mt-4">
          <Card className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Preço cheio</Label>
                <Input type="number" value={form.price_from} onChange={(e) => set("price_from", e.target.value)} placeholder="3500" />
              </div>
              <div>
                <Label>Preço promocional</Label>
                <Input type="number" value={form.price_promo} onChange={(e) => set("price_promo", e.target.value)} placeholder="2990" />
              </div>
              <div>
                <Label>Moeda</Label>
                <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL · R$</SelectItem>
                    <SelectItem value="USD">USD · US$</SelectItem>
                    <SelectItem value="EUR">EUR · €</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Rótulo do preço</Label>
                <Input value={form.price_label} onChange={(e) => set("price_label", e.target.value)} placeholder="por pessoa, casal, total..." />
              </div>
              <div>
                <Label>Entrada à vista (%)</Label>
                <Input type="number" value={form.payment_entry_percent} onChange={(e) => set("payment_entry_percent", e.target.value)} placeholder="30" />
              </div>
              <div>
                <Label>Quitação até (dias antes)</Label>
                <Input type="number" value={form.payment_days_before} onChange={(e) => set("payment_days_before", e.target.value)} placeholder="20" />
              </div>
            </div>
            <div className="rounded-lg border border-dashed border-amber-500/40 bg-amber-50/30 dark:bg-amber-500/5 p-4 text-sm space-y-2">
              <div className="font-semibold text-foreground">Plano padrão Natleva</div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Todos os produtos da Prateleira usam o mesmo modelo: entrada à vista (PIX, cartão ou link de pagamento) e saldo no boleto sem juros, com quitação até X dias antes do embarque. O número de parcelas é calculado automaticamente conforme a data de saída do produto.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-4 pt-2">
              <div className="flex items-center gap-2">
                <Switch checked={form.is_promo} onCheckedChange={(v) => set("is_promo", v)} />
                <Label className="!m-0">Em promoção</Label>
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label>Badge promocional</Label>
                <Input value={form.promo_badge} onChange={(e) => set("promo_badge", e.target.value)} placeholder="Black Friday, Últimas vagas..." />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* LOGISTICA */}
        <TabsContent value="logistica" className="space-y-4 mt-4">
          <Card className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Cidade de origem</Label>
                <Input value={form.origin_city} onChange={(e) => set("origin_city", e.target.value)} placeholder="São Paulo" />
              </div>
              <div>
                <Label>IATA origem</Label>
                <Input value={form.origin_iata} onChange={(e) => set("origin_iata", e.target.value.toUpperCase())} placeholder="GRU" maxLength={3} />
              </div>
              <div>
                <Label>IATA destino</Label>
                <Input value={form.destination_iata} onChange={(e) => set("destination_iata", e.target.value.toUpperCase())} placeholder="CUN" maxLength={3} />
              </div>
              <div>
                <Label>Cia aérea</Label>
                <Input value={form.airline} onChange={(e) => set("airline", e.target.value)} placeholder="Latam" />
              </div>
              <div>
                <Label>Hotel</Label>
                <Input value={form.hotel_name} onChange={(e) => set("hotel_name", e.target.value)} placeholder="Riu Palace" />
              </div>
              <div>
                <Label>Estrelas hotel</Label>
                <Input type="number" min={1} max={5} value={form.hotel_stars} onChange={(e) => set("hotel_stars", e.target.value)} />
              </div>
              <div>
                <Label>Noites</Label>
                <Input type="number" value={form.nights} onChange={(e) => set("nights", e.target.value)} />
              </div>
              <div>
                <Label>Pax mínimo</Label>
                <Input type="number" value={form.pax_min} onChange={(e) => set("pax_min", e.target.value)} />
              </div>
              <div>
                <Label>Pax máximo</Label>
                <Input type="number" value={form.pax_max} onChange={(e) => set("pax_max", e.target.value)} />
              </div>
              <div>
                <Label>Vagas totais</Label>
                <Input type="number" value={form.seats_total} onChange={(e) => set("seats_total", e.target.value)} />
              </div>
              <div>
                <Label>Vagas restantes</Label>
                <Input type="number" value={form.seats_left} onChange={(e) => set("seats_left", e.target.value)} />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* VENDA */}
        <TabsContent value="venda" className="space-y-4 mt-4">
          <Card className="p-5 space-y-4">
            <div>
              <Label>Título SEO</Label>
              <Input value={form.seo_title} onChange={(e) => set("seo_title", e.target.value)} placeholder="usa o título do produto se vazio" maxLength={70} />
              <p className="text-[11px] text-muted-foreground mt-1">{form.seo_title.length}/60 ideal</p>
            </div>
            <div>
              <Label>Descrição SEO</Label>
              <Textarea rows={2} value={form.seo_description} onChange={(e) => set("seo_description", e.target.value)} maxLength={170} />
              <p className="text-[11px] text-muted-foreground mt-1">{form.seo_description.length}/160 ideal</p>
            </div>
            <div>
              <Label>Mensagem do botão WhatsApp</Label>
              <Textarea rows={3} value={form.whatsapp_cta_text} onChange={(e) => set("whatsapp_cta_text", e.target.value)} placeholder='Olá! Tenho interesse no produto "..."' />
              <p className="text-[11px] text-muted-foreground mt-1">Mensagem pré-preenchida quando o cliente clica em "Tenho interesse".</p>
            </div>
            {isEdit && (
              <div className="bg-muted/40 rounded-lg p-3 text-sm flex items-center justify-between">
                <span className="text-muted-foreground truncate">URL pública: /p/{form.slug}</span>
                <Button variant="ghost" size="sm" onClick={copyPublic}><Copy className="w-3.5 h-3.5" /></Button>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
