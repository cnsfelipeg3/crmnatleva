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
import { ArrowLeft, Trash2, Save, Youtube, Sparkles, Loader2, ExternalLink, Copy, Hotel, Search } from "lucide-react";
import { toast } from "sonner";
import PaymentPlanCard from "@/components/prateleira/PaymentPlanCard";
import { computeNatlevaPlan, formatMoneyBR } from "@/lib/prateleira/payment-plan";
import ProductAIChat from "@/components/produtos/ProductAIChat";
import PlacesSearchCard, { type PlacesEnrichmentData } from "@/components/proposal/PlacesSearchCard";

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
  payment_entry_percent: string; payment_entry_amount: string; payment_days_before: string;
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
  payment_entry_percent: "30", payment_entry_amount: "", payment_days_before: "20",
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
  const [hotelSearchOpen, setHotelSearchOpen] = useState(false);

  const applyHotelEnrichment = (data: PlacesEnrichmentData) => {
    setForm((f) => {
      const next = { ...f };
      if (data.name && !next.hotel_name) next.hotel_name = data.name;
      if (data.name && !next.title) next.title = data.name;
      if (data.name && !next.slug) next.slug = slugify(data.name);
      // City / country from address
      if (data.address) {
        const parts = data.address.split(",").map((p) => p.trim()).filter(Boolean);
        if (parts.length >= 2 && !next.destination) next.destination = parts[parts.length - 2];
        if (parts.length >= 1 && !next.destination_country) next.destination_country = parts[parts.length - 1];
      }
      if (data.editorial_summary && !next.short_description) {
        next.short_description = data.editorial_summary.slice(0, 160);
      }
      // Capa: usa a foto principal escolhida (mainPhotoIndex aponta dentro de selectedPhotos)
      const photos = data.selectedPhotos?.length ? data.selectedPhotos : data.photos || [];
      if (photos.length) {
        const cover = photos[Math.min(data.mainPhotoIndex || 0, photos.length - 1)] || photos[0];
        if (!next.cover_image_url) next.cover_image_url = cover;
        // Galeria: agrega o resto sem duplicar
        const existing = new Set(next.gallery.split("\n").map((u) => u.trim()).filter(Boolean));
        photos.forEach((u) => { if (u && u !== next.cover_image_url) existing.add(u); });
        next.gallery = Array.from(existing).join("\n");
      }
      // Marca como hospedagem se ainda não tinha kind definido para hotel/pacote
      if (next.product_kind === "outros") next.product_kind = "hospedagem";
      return next;
    });
    setHotelSearchOpen(false);
    toast.success("Hotel importado", {
      description: `${data.selectedPhotos?.length || data.photos?.length || 0} fotos adicionadas à galeria`,
    });
  };

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

  /** Snapshot do form em formato semelhante ao que a IA devolve, para alimentar o draft. */
  const formToAIDraft = (f: ProductForm): Record<string, any> => ({
    title: f.title || undefined,
    product_kind: f.product_kind || undefined,
    destination: f.destination || undefined,
    destination_country: f.destination_country || undefined,
    category: f.category || undefined,
    departure_date: f.departure_date || undefined,
    return_date: f.return_date || undefined,
    flexible_dates: f.flexible_dates || undefined,
    nights: f.nights ? Number(f.nights) : undefined,
    duration: f.duration || undefined,
    short_description: f.short_description || undefined,
    description: f.description || undefined,
    highlights: f.highlights ? f.highlights.split("\n").filter(Boolean) : undefined,
    includes: f.includes ? f.includes.split("\n").filter(Boolean) : undefined,
    excludes: f.excludes ? f.excludes.split("\n").filter(Boolean) : undefined,
    how_it_works: f.how_it_works || undefined,
    recommendations: f.recommendations || undefined,
    price_from: f.price_from ? Number(f.price_from) : undefined,
    price_promo: f.price_promo ? Number(f.price_promo) : undefined,
    currency: f.currency,
    cover_image_url: f.cover_image_url || undefined,
    origin_city: f.origin_city || undefined,
    origin_iata: f.origin_iata || undefined,
    destination_iata: f.destination_iata || undefined,
    airline: f.airline || undefined,
    hotel_name: f.hotel_name || undefined,
    hotel_stars: f.hotel_stars ? Number(f.hotel_stars) : undefined,
  });

  const applyAIProduct = (p: Record<string, any>, covers: string[]) => {
    setForm((f) => {
      const next: ProductForm = { ...f };
      const setIf = <K extends keyof ProductForm>(k: K, v: any) => {
        if (v === undefined || v === null || v === "") return;
        (next[k] as any) = typeof next[k] === "string" ? String(v) : v;
      };
      const setStr = (k: keyof ProductForm, v: any) => {
        if (v === undefined || v === null || v === "") return;
        (next as any)[k] = String(v);
      };
      const setArr = (k: keyof ProductForm, v: any) => {
        if (Array.isArray(v) && v.length) (next as any)[k] = v.join("\n");
      };
      setStr("title", p.title);
      if (p.title && !next.slug) next.slug = slugify(p.title);
      setStr("product_kind", p.product_kind);
      setStr("destination", p.destination);
      setStr("destination_country", p.destination_country);
      setStr("category", p.category);
      setStr("departure_date", p.departure_date);
      setStr("return_date", p.return_date);
      if (typeof p.flexible_dates === "boolean") next.flexible_dates = p.flexible_dates;
      setStr("nights", p.nights);
      setStr("duration", p.duration);
      setStr("short_description", p.short_description);
      setStr("description", p.description);
      setArr("highlights", p.highlights);
      setArr("includes", p.includes);
      setArr("excludes", p.excludes);
      setStr("how_it_works", p.how_it_works);
      setStr("recommendations", p.recommendations);
      setStr("price_from", p.price_from);
      setStr("price_promo", p.price_promo);
      setStr("price_label", p.price_label);
      setStr("currency", p.currency);
      if (typeof p.is_promo === "boolean") next.is_promo = p.is_promo;
      setStr("promo_badge", p.promo_badge);
      setStr("payment_entry_percent", p.payment_entry_percent);
      setStr("payment_entry_percent_min", p.payment_entry_percent_min);
      setStr("payment_entry_percent_max", p.payment_entry_percent_max);
      if (p.payment_entry_methods && typeof p.payment_entry_methods === "object") {
        next.payment_entry_methods = {
          pix: p.payment_entry_methods.pix ?? next.payment_entry_methods.pix,
          cartao: p.payment_entry_methods.cartao ?? next.payment_entry_methods.cartao,
          link: p.payment_entry_methods.link ?? next.payment_entry_methods.link,
        };
      }
      setStr("payment_entry_card_installments_max", p.payment_entry_card_installments_max);
      if (p.payment_balance_method) next.payment_balance_method = p.payment_balance_method;
      setStr("payment_balance_installments_max", p.payment_balance_installments_max);
      setStr("payment_balance_min_installment", p.payment_balance_min_installment);
      setStr("payment_balance_interest_percent", p.payment_balance_interest_percent);
      setStr("payment_pix_discount_percent", p.payment_pix_discount_percent);
      setStr("payment_days_before", p.payment_days_before);
      setStr("payment_notes", p.payment_notes);
      setStr("origin_city", p.origin_city);
      setStr("origin_iata", p.origin_iata);
      setStr("destination_iata", p.destination_iata);
      setStr("airline", p.airline);
      setStr("hotel_name", p.hotel_name);
      setStr("hotel_stars", p.hotel_stars);
      setStr("pax_min", p.pax_min);
      setStr("pax_max", p.pax_max);
      setStr("seats_total", p.seats_total);
      setStr("seats_left", p.seats_left);
      if (p.status) next.status = p.status;
      // Capa: usa primeira sugestão real se ainda não há capa
      if (!next.cover_image_url && covers && covers[0]) {
        next.cover_image_url = covers[0];
      }
      // Galeria: agrega demais sugestões sem duplicar
      if (covers && covers.length > 1) {
        const existing = new Set(next.gallery.split("\n").map((u) => u.trim()).filter(Boolean));
        covers.slice(1).forEach((u) => existing.add(u));
        next.gallery = Array.from(existing).join("\n");
      }
      return next;
    });
    toast.success("Rascunho atualizado pela IA");
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
          payment_entry_amount: data.payment_terms?.entry_amount != null ? String(data.payment_terms.entry_amount) : "",
          payment_days_before: (data.payment_terms?.min_days_before_checkin ?? 20).toString(),
          payment_entry_percent_min: (data.payment_terms?.entry_percent_min ?? 20).toString(),
          payment_entry_percent_max: (data.payment_terms?.entry_percent_max ?? 50).toString(),
          payment_entry_methods: {
            pix: data.payment_terms?.entry_methods?.includes?.("pix") ?? true,
            cartao: data.payment_terms?.entry_methods?.includes?.("cartao") ?? true,
            link: data.payment_terms?.entry_methods?.includes?.("link") ?? true,
          },
          payment_entry_card_installments_max: (data.payment_terms?.entry_card_installments_max ?? 3).toString(),
          payment_balance_method: (data.payment_terms?.balance_method ?? "boleto") as "boleto" | "cartao" | "ambos",
          payment_balance_installments_max: (data.payment_terms?.balance_installments_max ?? 12).toString(),
          payment_balance_min_installment: (data.payment_terms?.balance_min_installment ?? 200).toString(),
          payment_balance_interest_percent: (data.payment_terms?.balance_interest_percent ?? 0).toString(),
          payment_pix_discount_percent: (data.payment_terms?.pix_discount_percent ?? 0).toString(),
          payment_notes: data.payment_terms?.notes ?? "",
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
      installments_max: numOrNull(form.payment_balance_installments_max),
      installments_no_interest: (numOrNull(form.payment_balance_interest_percent) ?? 0) === 0
        ? numOrNull(form.payment_balance_installments_max)
        : null,
      pix_discount_percent: numOrNull(form.payment_pix_discount_percent),
      payment_terms: {
        plan: "natleva_default",
        entry_percent: numOrNull(form.payment_entry_percent) ?? 30,
        entry_percent_min: numOrNull(form.payment_entry_percent_min) ?? 20,
        entry_percent_max: numOrNull(form.payment_entry_percent_max) ?? 50,
        entry_methods: (["pix", "cartao", "link"] as const).filter((m) => form.payment_entry_methods[m]),
        entry_card_installments_max: numOrNull(form.payment_entry_card_installments_max) ?? 3,
        balance_method: form.payment_balance_method,
        balance_installments_max: numOrNull(form.payment_balance_installments_max) ?? 12,
        balance_min_installment: numOrNull(form.payment_balance_min_installment) ?? 0,
        balance_interest_percent: numOrNull(form.payment_balance_interest_percent) ?? 0,
        pix_discount_percent: numOrNull(form.payment_pix_discount_percent) ?? 0,
        min_days_before_checkin: numOrNull(form.payment_days_before) ?? 20,
        notes: form.payment_notes || null,
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
        <ProductAIChat current={formToAIDraft(form)} onApply={applyAIProduct} />
      )}

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
          {/* Buscar hotel real · mesma engine usada na criação de propostas */}
          <Card className="p-5 border-primary/30 bg-primary/5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                <Hotel className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  Buscar hotel real <Sparkles className="w-3.5 h-3.5 text-primary" />
                </h3>
                <p className="text-xs text-muted-foreground">
                  Pesquisa o hotel no Google Places · puxa fotos oficiais, classifica e preenche capa, galeria, nome, cidade e país automaticamente.
                </p>
              </div>
              {!hotelSearchOpen && (
                <Button size="sm" onClick={() => setHotelSearchOpen(true)} className="gap-1.5 shrink-0">
                  <Search className="w-4 h-4" /> Buscar hotel
                </Button>
              )}
            </div>
            {hotelSearchOpen && (
              <PlacesSearchCard
                initialQuery={form.hotel_name || form.title || ""}
                destinationContext={[form.destination, form.destination_country].filter(Boolean).join(", ") || undefined}
                entityType="hotel"
                onEnrich={applyHotelEnrichment}
                onCancel={() => setHotelSearchOpen(false)}
              />
            )}
          </Card>

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
            </div>

            {/* ============ ENTRADA ============ */}
            <div className="pt-2 border-t border-border/60">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 rounded bg-emerald-500" />
                <h3 className="font-semibold text-foreground">Entrada</h3>
                <span className="text-xs text-muted-foreground">· o que o cliente paga pra reservar</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Entrada padrão (%)</Label>
                  <Input type="number" value={form.payment_entry_percent} onChange={(e) => set("payment_entry_percent", e.target.value)} placeholder="30" />
                </div>
                <div>
                  <Label>Entrada mínima (%)</Label>
                  <Input type="number" value={form.payment_entry_percent_min} onChange={(e) => set("payment_entry_percent_min", e.target.value)} placeholder="20" />
                </div>
                <div>
                  <Label>Entrada máxima (%)</Label>
                  <Input type="number" value={form.payment_entry_percent_max} onChange={(e) => set("payment_entry_percent_max", e.target.value)} placeholder="50" />
                </div>
              </div>
              <div className="mt-4">
                <Label className="mb-2 block">Métodos aceitos para a entrada</Label>
                <div className="flex flex-wrap gap-3">
                  {([
                    { k: "pix", label: "PIX" },
                    { k: "cartao", label: "Cartão de crédito" },
                    { k: "link", label: "Link de pagamento" },
                  ] as const).map((m) => (
                    <label key={m.k} className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card cursor-pointer hover:bg-accent/50 transition">
                      <Switch
                        checked={form.payment_entry_methods[m.k]}
                        onCheckedChange={(v) => set("payment_entry_methods", { ...form.payment_entry_methods, [m.k]: v })}
                      />
                      <span className="text-sm">{m.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              {form.payment_entry_methods.cartao && (
                <div className="mt-4 max-w-xs">
                  <Label>Parcelar entrada no cartão · até</Label>
                  <Input type="number" min={1} max={12} value={form.payment_entry_card_installments_max} onChange={(e) => set("payment_entry_card_installments_max", e.target.value)} placeholder="3" />
                  <p className="text-[11px] text-muted-foreground mt-1">Nº máximo de parcelas no cartão para o valor da entrada</p>
                </div>
              )}
            </div>

            {/* ============ SALDO ============ */}
            <div className="pt-4 border-t border-border/60">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 rounded bg-amber-500" />
                <h3 className="font-semibold text-foreground">Saldo restante</h3>
                <span className="text-xs text-muted-foreground">· como o cliente quita os 70% (ou mais)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Forma de pagamento do saldo</Label>
                  <Select value={form.payment_balance_method} onValueChange={(v) => set("payment_balance_method", v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boleto">Boleto bancário</SelectItem>
                      <SelectItem value="cartao">Cartão de crédito</SelectItem>
                      <SelectItem value="ambos">Boleto ou cartão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Máximo de parcelas</Label>
                  <Input type="number" min={1} max={24} value={form.payment_balance_installments_max} onChange={(e) => set("payment_balance_installments_max", e.target.value)} placeholder="12" />
                </div>
                <div>
                  <Label>Valor mínimo da parcela ({form.currency})</Label>
                  <Input type="number" value={form.payment_balance_min_installment} onChange={(e) => set("payment_balance_min_installment", e.target.value)} placeholder="200" />
                </div>
                <div>
                  <Label>Juros ao mês (%)</Label>
                  <Input type="number" step="0.1" value={form.payment_balance_interest_percent} onChange={(e) => set("payment_balance_interest_percent", e.target.value)} placeholder="0" />
                  <p className="text-[11px] text-muted-foreground mt-1">0 = sem juros</p>
                </div>
                <div>
                  <Label>Quitação até (dias antes do embarque)</Label>
                  <Input type="number" value={form.payment_days_before} onChange={(e) => set("payment_days_before", e.target.value)} placeholder="20" />
                </div>
                <div>
                  <Label>Desconto à vista no PIX (%)</Label>
                  <Input type="number" step="0.1" value={form.payment_pix_discount_percent} onChange={(e) => set("payment_pix_discount_percent", e.target.value)} placeholder="0" />
                  <p className="text-[11px] text-muted-foreground mt-1">Aplicado quando o cliente paga 100% à vista no PIX</p>
                </div>
              </div>
              <div className="mt-4">
                <Label>Observações de pagamento (opcional)</Label>
                <Textarea
                  value={form.payment_notes}
                  onChange={(e) => set("payment_notes", e.target.value)}
                  placeholder="Ex: parcelas no boleto vencem todo dia 10 · cartões aceitos: Visa, Master, Elo..."
                  rows={2}
                />
              </div>
            </div>

            {/* ============ PREVIEW AO VIVO ============ */}
            <PaymentPreview form={form} />

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

// =====================================================================
// Preview ao vivo do plano de pagamento · espelha o que o cliente verá
// =====================================================================
function PaymentPreview({ form }: { form: any }) {
  const price = Number(form.price_promo) || Number(form.price_from) || 0;
  if (price <= 0) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Defina o preço para ver o preview do plano de pagamento.
      </div>
    );
  }

  const plan = computeNatlevaPlan(price, form.departure_date || null, {
    entryPercent: Number(form.payment_entry_percent) || 30,
    daysBefore: Number(form.payment_days_before) || 20,
    currency: form.currency || "BRL",
    maxInstallments: Number(form.payment_balance_installments_max) || 12,
    minInstallment: Number(form.payment_balance_min_installment) || 0,
    pixDiscountPercent: Number(form.payment_pix_discount_percent) || 0,
  });

  if (!plan) return null;

  const entryMethods = (["pix", "cartao", "link"] as const)
    .filter((k) => form.payment_entry_methods?.[k])
    .map((k) => ({ pix: "PIX", cartao: "Cartão", link: "Link" }[k]))
    .join(" · ");

  const balanceLabelMap: Record<string, string> = { boleto: "Boleto bancário", cartao: "Cartão", ambos: "Boleto ou cartão" };
  const interest = Number(form.payment_balance_interest_percent) || 0;

  return (
    <div className="mt-6 pt-4 border-t border-border/60">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-amber-500" />
        <h3 className="font-semibold text-foreground">Preview · como o cliente verá</h3>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PaymentPlanCard
          price={price}
          departureDate={form.departure_date || null}
          currency={form.currency || "BRL"}
          entryPercent={Number(form.payment_entry_percent) || 30}
          daysBefore={Number(form.payment_days_before) || 20}
        />
        <div className="rounded-xl border border-border/70 bg-muted/30 p-4 space-y-3 text-sm">
          <div className="font-semibold text-foreground">Resumo da configuração</div>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li><span className="text-foreground font-medium">Entrada:</span> {plan.entryPercent}% · {formatMoneyBR(plan.entryAmount, plan.currency)} · faixa permitida {form.payment_entry_percent_min}%–{form.payment_entry_percent_max}%</li>
            <li><span className="text-foreground font-medium">Métodos da entrada:</span> {entryMethods || "nenhum selecionado"}</li>
            {form.payment_entry_methods?.cartao && (
              <li><span className="text-foreground font-medium">Entrada parcelada:</span> em até {form.payment_entry_card_installments_max}x no cartão</li>
            )}
            <li><span className="text-foreground font-medium">Saldo ({balanceLabelMap[form.payment_balance_method]}):</span> {plan.installments}x de {formatMoneyBR(plan.installmentAmount, plan.currency)} {interest > 0 ? `· ${interest}% a.m.` : "· sem juros"}</li>
            {plan.minInstallment ? (
              <li><span className="text-foreground font-medium">Parcela mínima:</span> {formatMoneyBR(plan.minInstallment, plan.currency)}</li>
            ) : null}
            {plan.pixTotal ? (
              <li className="text-emerald-700 dark:text-emerald-400"><span className="font-medium">PIX à vista:</span> {formatMoneyBR(plan.pixTotal, plan.currency)} · {plan.pixDiscountPercent}% off</li>
            ) : null}
            {plan.payoffDate ? (
              <li><span className="text-foreground font-medium">Quitação até:</span> {plan.payoffDate.toLocaleDateString("pt-BR")} ({plan.daysBefore} dias antes)</li>
            ) : (
              <li className="italic">Sem data de embarque · simulação em 6 meses. Defina a data de saída para o plano real.</li>
            )}
            {form.payment_notes && (
              <li className="pt-2 border-t border-border/40"><span className="text-foreground font-medium">Obs:</span> {form.payment_notes}</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
