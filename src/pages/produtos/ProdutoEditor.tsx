import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Trash2, Save, Youtube, Sparkles, Loader2, ExternalLink, Copy, Hotel, Search, Plane, Image as ImageIcon, FileText, CreditCard, Users, Megaphone, Settings2, MapPin, Calendar, Lock as LockIcon } from "lucide-react";
import { toast } from "sonner";
import PaymentPlanCard from "@/components/prateleira/PaymentPlanCard";
import { computeNatlevaPlan, formatMoneyBR } from "@/lib/prateleira/payment-plan";
import ProductAIChat from "@/components/produtos/ProductAIChat";
import PlacesSearchCard, { type PlacesEnrichmentData } from "@/components/proposal/PlacesSearchCard";
import MarketingTab from "@/components/produtos/MarketingTab";
import GalleryManager from "@/components/produtos/GalleryManager";
import GalleryEditorBlock from "@/components/produtos/GalleryEditorBlock";
import ProductLivePreview from "@/components/produtos/ProductLivePreview";
import { Eye, EyeOff, Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

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
  payment_balance_custom_installments: number[];
  payment_pix_discount_percent: string;
  payment_notes: string;
  internal_cost: string;
  is_promo: boolean; promo_badge: string;
  // logistics
  origin_city: string; origin_iata: string; destination_iata: string;
  airline: string; hotel_name: string; hotel_stars: string;
  nights: string; pax_min: string; pax_max: string; pax_adults: string; pax_children: string; seats_total: string; seats_left: string;
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
  payment_balance_custom_installments: [],
  payment_pix_discount_percent: "0",
  payment_notes: "",
  internal_cost: "",
  is_promo: false, promo_badge: "",
  origin_city: "", origin_iata: "", destination_iata: "",
  airline: "", hotel_name: "", hotel_stars: "",
  nights: "", pax_min: "", pax_max: "", pax_adults: "", pax_children: "", seats_total: "", seats_left: "",
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
  const [previewVisible, setPreviewVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = localStorage.getItem("produto-editor-preview-visible");
    return v === null ? true : v === "1";
  });
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  useEffect(() => {
    localStorage.setItem("produto-editor-preview-visible", previewVisible ? "1" : "0");
  }, [previewVisible]);

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
      setStr("payment_entry_amount", p.payment_entry_amount);
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
          payment_balance_custom_installments: Array.isArray(data.payment_terms?.balance_custom_installments)
            ? data.payment_terms.balance_custom_installments.filter((v: any) => Number.isFinite(Number(v))).map((v: any) => Number(v))
            : [],
          payment_pix_discount_percent: (data.payment_terms?.pix_discount_percent ?? 0).toString(),
          payment_notes: data.payment_terms?.notes ?? "",
          internal_cost: data.internal_cost != null ? String(data.internal_cost) : "",
          is_promo: !!data.is_promo, promo_badge: data.promo_badge ?? "",
          origin_city: data.origin_city ?? "", origin_iata: data.origin_iata ?? "",
          destination_iata: data.destination_iata ?? "",
          airline: data.airline ?? "", hotel_name: data.hotel_name ?? "",
          hotel_stars: data.hotel_stars?.toString() ?? "",
          nights: data.nights?.toString() ?? "",
          pax_min: data.pax_min?.toString() ?? "", pax_max: data.pax_max?.toString() ?? "",
          pax_adults: data.pax_adults?.toString() ?? "", pax_children: data.pax_children?.toString() ?? "",
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
        entry_amount: numOrNull(form.payment_entry_amount),
        entry_percent_min: numOrNull(form.payment_entry_percent_min) ?? 20,
        entry_percent_max: numOrNull(form.payment_entry_percent_max) ?? 50,
        entry_methods: (["pix", "cartao", "link"] as const).filter((m) => form.payment_entry_methods[m]),
        entry_card_installments_max: numOrNull(form.payment_entry_card_installments_max) ?? 3,
        balance_method: form.payment_balance_method,
        balance_installments_max: numOrNull(form.payment_balance_installments_max) ?? 12,
        balance_min_installment: numOrNull(form.payment_balance_min_installment) ?? 0,
        balance_interest_percent: numOrNull(form.payment_balance_interest_percent) ?? 0,
        balance_custom_installments: form.payment_balance_custom_installments.filter((v) => Number.isFinite(v) && v > 0),
        pix_discount_percent: numOrNull(form.payment_pix_discount_percent) ?? 0,
        min_days_before_checkin: numOrNull(form.payment_days_before) ?? 20,
        notes: form.payment_notes || null,
      },
      internal_cost: numOrNull(form.internal_cost),
      is_promo: form.is_promo, promo_badge: form.promo_badge || null,
      origin_city: form.origin_city || null, origin_iata: form.origin_iata || null,
      destination_iata: form.destination_iata || null,
      airline: form.airline || null, hotel_name: form.hotel_name || null,
      hotel_stars: numOrNull(form.hotel_stars), nights: numOrNull(form.nights),
      pax_min: numOrNull(form.pax_min), pax_max: numOrNull(form.pax_max),
      pax_adults: numOrNull(form.pax_adults), pax_children: numOrNull(form.pax_children),
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
    <div className={cn("mx-auto p-4 sm:p-6", previewVisible ? "max-w-[1600px]" : "max-w-5xl")}>
      <div className={cn("grid gap-6", previewVisible ? "lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]" : "grid-cols-1")}>
        <div className="space-y-5 min-w-0">
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
          <Button variant="outline" size="sm" onClick={() => setPreviewVisible((v) => !v)} className="hidden lg:inline-flex">
            {previewVisible ? <><EyeOff className="w-4 h-4 mr-1.5" /> Esconder preview</> : <><Eye className="w-4 h-4 mr-1.5" /> Mostrar preview</>}
          </Button>
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

      {(() => {
        const kind = form.product_kind;
        const hasAereo = kind === "aereo" || kind === "pacote";
        const hasHospedagem = kind === "hospedagem" || kind === "pacote";

        return (
          <div className="space-y-5">
            {/* ============ 1 · ESSENCIAL ============ */}
            <Card className="p-5 space-y-4">
              <SectionHeader icon={Settings2} title="Essencial" subtitle="O que é, pra onde, quando" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de produto *</Label>
                  <Select value={form.product_kind} onValueChange={(v) => set("product_kind", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{KIND_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">Define quais campos aparecem abaixo · pacote = aéreo + hospedagem</p>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" /> Destino *</Label>
                  <Input value={form.destination} onChange={(e) => set("destination", e.target.value)} placeholder="Cancun" />
                </div>
                <div>
                  <Label>País do destino</Label>
                  <Input value={form.destination_country} onChange={(e) => set("destination_country", e.target.value)} placeholder="México" />
                </div>
                {hasAereo && (
                  <>
                    <div>
                      <Label className="flex items-center gap-1.5"><Plane className="w-3.5 h-3.5 text-primary" /> Cidade de origem</Label>
                      <Input value={form.origin_city} onChange={(e) => set("origin_city", e.target.value)} placeholder="São Paulo" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>IATA origem</Label>
                        <Input value={form.origin_iata} onChange={(e) => set("origin_iata", e.target.value.toUpperCase())} placeholder="GRU" maxLength={3} />
                      </div>
                      <div>
                        <Label>IATA destino</Label>
                        <Input value={form.destination_iata} onChange={(e) => set("destination_iata", e.target.value.toUpperCase())} placeholder="CUN" maxLength={3} />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border/40">
                <div>
                  <Label className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-primary" /> Data de ida</Label>
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
                {hasHospedagem && (
                  <div>
                    <Label>Noites</Label>
                    <Input type="number" value={form.nights} onChange={(e) => set("nights", e.target.value)} placeholder="Ex: 7" />
                  </div>
                )}
                <div className="md:col-span-2">
                  <Label>Resumo curto</Label>
                  <Input value={form.short_description} onChange={(e) => set("short_description", e.target.value)} placeholder="Frase de impacto que aparece nos cards" />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/40">
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
                  <Label className="!m-0 text-sm">Aparece na vitrine</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.sale_page_enabled} onCheckedChange={(v) => set("sale_page_enabled", v)} />
                  <Label className="!m-0 text-sm">Página de venda ativa</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_promo} onCheckedChange={(v) => set("is_promo", v)} />
                  <Label className="!m-0 text-sm">Em promoção</Label>
                </div>
              </div>
            </Card>

            {/* ============ 2 · HOSPEDAGEM ============ */}
            {hasHospedagem && (
              <Card className="p-5 space-y-4">
                <SectionHeader icon={Hotel} title="Hospedagem" subtitle="Busque o hotel real · puxa fotos e dados oficiais" />

                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold flex items-center gap-1.5">
                        Buscar hotel real <Sparkles className="w-3.5 h-3.5 text-primary" />
                      </h4>
                      <p className="text-xs text-muted-foreground">Pesquisa no Google Places · preenche capa, galeria, nome, cidade e país.</p>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label>Nome do hotel</Label>
                    <Input value={form.hotel_name} onChange={(e) => set("hotel_name", e.target.value)} placeholder="Riu Palace" />
                  </div>
                  <div>
                    <Label>Estrelas</Label>
                    <Input type="number" min={1} max={5} value={form.hotel_stars} onChange={(e) => set("hotel_stars", e.target.value)} />
                  </div>
                </div>

                {/* Galeria editável · permanece visível mesmo após buscar/aplicar fotos */}
                <GalleryEditorBlock
                  gallery={form.gallery}
                  coverUrl={form.cover_image_url}
                  onChange={(g) => set("gallery", g)}
                  onSetCover={(u) => set("cover_image_url", u)}
                />
              </Card>
            )}

            {/* ============ 3 · AÉREO ============ */}
            {hasAereo && (
              <Card className="p-5 space-y-4">
                <SectionHeader icon={Plane} title="Aéreo" subtitle="Detalhes do voo" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Cia aérea</Label>
                    <Input value={form.airline} onChange={(e) => set("airline", e.target.value)} placeholder="Latam" />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">Origem, destino e datas estão na seção Essencial acima.</p>
              </Card>
            )}

            {/* ============ 4 · PASSAGEIROS ============ */}
            <Card className="p-5 space-y-4">
              <SectionHeader icon={Users} title="Passageiros" subtitle="Quantos viajam · aparece nas artes" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label>Adultos</Label>
                  <Input type="number" min={0} value={form.pax_adults} onChange={(e) => set("pax_adults", e.target.value)} placeholder="2" />
                </div>
                <div>
                  <Label>Crianças</Label>
                  <Input type="number" min={0} value={form.pax_children} onChange={(e) => set("pax_children", e.target.value)} placeholder="1" />
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

            {/* Mídia removida · capa e galeria são preenchidas automaticamente pela busca de hotel */}

            {/* ============ 6 · CONTEÚDO ============ */}
            <Card className="p-5 space-y-4">
              <SectionHeader icon={FileText} title="Conteúdo" subtitle="Descrição e listas que aparecem na página de venda" />
              <div>
                <Label>Descrição completa</Label>
                <Textarea rows={5} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Conte a história da viagem..." />
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
            </Card>

            {/* ============ 7 · PREÇO & PAGAMENTO (simplificado) ============ */}
            <Card className="p-5 space-y-4">
              <SectionHeader icon={CreditCard} title="Preço e pagamento" subtitle="Direto ao ponto · só o essencial" />

              {(() => {
                // Cálculos derivados pra ficar tudo simples e claro
                const total = Number(form.price_promo) || Number(form.price_from) || 0;
                const entryAmt = Number(form.payment_entry_amount) || 0;
                const balance = Math.max(0, total - entryAmt);
                const nParc = Math.max(1, Number(form.payment_balance_installments_max) || 1);
                const parcVal = balance > 0 ? balance / nParc : 0;
                const isPerPerson = (form.price_label || "").toLowerCase().includes("pessoa");
                const pax = Math.max(1, (Number(form.pax_adults) || 0) + (Number(form.pax_children) || 0));

                return (
                  <>
                    {/* 1 · Valor total + base de cálculo */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-semibold">Valor total do pacote (R$)</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={form.price_promo}
                          onChange={(e) => {
                            set("price_promo", e.target.value);
                            // Mantém price_from sincronizado pra compatibilidade
                            if (!form.price_from) set("price_from", e.target.value);
                          }}
                          placeholder="2999"
                          className="text-lg font-semibold"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {isPerPerson
                            ? `Valor cobrado de cada pessoa · ${pax} pax = ${formatMoneyBR(total * pax, form.currency)} no total`
                            : `Valor total do pacote inteiro · dividido entre ${pax} pax = ${formatMoneyBR(total / pax, form.currency)} por pessoa`}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-semibold">Esse valor é</Label>
                        <div className="inline-flex w-full rounded-md border border-border bg-muted/30 p-0.5 mt-1">
                          <button
                            type="button"
                            onClick={() => set("price_label", "por pessoa")}
                            className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-colors ${isPerPerson ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                          >
                            Por pessoa
                          </button>
                          <button
                            type="button"
                            onClick={() => set("price_label", "total")}
                            className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-colors ${!isPerPerson ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                          >
                            Total ({pax} {pax === 1 ? "pessoa" : "pessoas"})
                          </button>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Ajuste a quantidade de pax na seção <span className="font-medium">Passageiros</span>
                        </p>
                      </div>
                    </div>

                    {/* 2 · Entrada + parcelas */}
                    <div className="pt-3 border-t border-border/60 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-semibold">Valor da entrada (R$)</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={form.payment_entry_amount}
                          onChange={(e) => {
                            set("payment_entry_amount", e.target.value);
                            // Mantém entry_percent coerente pra preview e BI
                            const v = Number(e.target.value) || 0;
                            if (total > 0) set("payment_entry_percent", String(Math.round((v / total) * 100)));
                          }}
                          placeholder="499"
                          className="text-base font-semibold"
                        />
                        {total > 0 && entryAmt > 0 && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {Math.round((entryAmt / total) * 100)}% do total · saldo de {formatMoneyBR(balance, form.currency)}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-sm font-semibold">Parcelas do saldo (boleto)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={24}
                          value={form.payment_balance_installments_max}
                          onChange={(e) => {
                            const newN = Math.max(1, Number(e.target.value) || 1);
                            set("payment_balance_installments_max", e.target.value);
                            // Se já existe parcVal informada manualmente, recalcula o total
                            if (parcVal > 0 && entryAmt > 0) {
                              const newTotal = Math.round((entryAmt + parcVal * newN) * 100) / 100;
                              set("price_promo", String(newTotal));
                              if (!form.price_from) set("price_from", String(newTotal));
                            }
                          }}
                          placeholder="12"
                          className="text-base font-semibold"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Quantidade de boletos pra quitar o saldo
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-semibold">Valor de cada parcela (R$)</Label>
                        <Input
                          type="number"
                          inputMode="decimal"
                          value={parcVal > 0 ? String(Math.round(parcVal * 100) / 100) : ""}
                          onChange={(e) => {
                            const v = Number(e.target.value) || 0;
                            // Calcula novo total = entrada + (parcela × nº parcelas)
                            const newTotal = Math.round((entryAmt + v * nParc) * 100) / 100;
                            set("price_promo", String(newTotal));
                            if (!form.price_from) set("price_from", String(newTotal));
                            if (newTotal > 0) {
                              set("payment_entry_percent", String(Math.round((entryAmt / newTotal) * 100)));
                            }
                          }}
                          placeholder="0"
                          className="text-base font-semibold"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {entryAmt > 0
                            ? `Total = entrada + ${nParc}× parcela · preenche automaticamente`
                            : "Informe a entrada primeiro pra calcular o total"}
                        </p>
                      </div>
                    </div>

                    {/* 3 · Avançado (colapsável) */}
                    <Accordion type="single" collapsible className="w-full pt-2">
                      <AccordionItem value="precoavancado" className="border border-border/60 rounded-lg bg-muted/20">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                          <div className="flex items-center gap-2 text-sm">
                            <Settings2 className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">Opções avançadas de pagamento</span>
                            <span className="text-[11px] text-muted-foreground">· promo, métodos, juros, observações</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label>Preço cheio (riscado)</Label>
                              <Input type="number" value={form.price_from} onChange={(e) => set("price_from", e.target.value)} placeholder="3500" />
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
                              <Label>Badge promocional</Label>
                              <Input value={form.promo_badge} onChange={(e) => set("promo_badge", e.target.value)} placeholder="Black Friday..." />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border/60">
                            <div>
                              <Label>Mín entrada (%)</Label>
                              <Input type="number" value={form.payment_entry_percent_min} onChange={(e) => set("payment_entry_percent_min", e.target.value)} placeholder="20" />
                            </div>
                            <div>
                              <Label>Máx entrada (%)</Label>
                              <Input type="number" value={form.payment_entry_percent_max} onChange={(e) => set("payment_entry_percent_max", e.target.value)} placeholder="50" />
                            </div>
                            <div>
                              <Label>Quitação até (dias antes)</Label>
                              <Input type="number" value={form.payment_days_before} onChange={(e) => set("payment_days_before", e.target.value)} placeholder="20" />
                            </div>
                          </div>

                          <div>
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

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {form.payment_entry_methods.cartao && (
                              <div>
                                <Label>Parcelar entrada no cartão até</Label>
                                <Input type="number" min={1} max={12} value={form.payment_entry_card_installments_max} onChange={(e) => set("payment_entry_card_installments_max", e.target.value)} placeholder="3" />
                              </div>
                            )}
                            <div>
                              <Label>Forma do saldo</Label>
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
                              <Label>Valor mínimo da parcela</Label>
                              <Input type="number" value={form.payment_balance_min_installment} onChange={(e) => set("payment_balance_min_installment", e.target.value)} placeholder="200" />
                            </div>
                            <div>
                              <Label>Juros ao mês (%)</Label>
                              <Input type="number" step="0.1" value={form.payment_balance_interest_percent} onChange={(e) => set("payment_balance_interest_percent", e.target.value)} placeholder="0" />
                            </div>
                            <div>
                              <Label>Desconto à vista no PIX (%)</Label>
                              <Input type="number" step="0.1" value={form.payment_pix_discount_percent} onChange={(e) => set("payment_pix_discount_percent", e.target.value)} placeholder="0" />
                            </div>
                          </div>

                          {/* Personalizar parcelas individualmente */}
                          <div className="rounded-lg border border-border/60 bg-background p-3">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div>
                                <Label className="text-sm font-semibold text-foreground">Personalizar valor de cada parcela</Label>
                                <p className="text-[11px] text-muted-foreground mt-0.5">Defina manualmente cada boleto · ignora "máximo" e "mínimo"</p>
                              </div>
                              <Switch
                                checked={form.payment_balance_custom_installments.length > 0}
                                onCheckedChange={(on) => {
                                  if (on) {
                                    const n = Math.max(1, Math.min(12, Number(form.payment_balance_installments_max) || 6));
                                    const v = balance > 0 ? Math.round((balance / n) * 100) / 100 : 0;
                                    set("payment_balance_custom_installments", Array.from({ length: n }, () => v));
                                  } else {
                                    set("payment_balance_custom_installments", []);
                                  }
                                }}
                              />
                            </div>
                            {form.payment_balance_custom_installments.length > 0 && (() => {
                              const list = form.payment_balance_custom_installments;
                              const sum = list.reduce((a, b) => a + (Number(b) || 0), 0);
                              const diff = Math.round((sum - balance) * 100) / 100;
                              const updateAt = (i: number, v: number) => {
                                const next = [...list]; next[i] = v;
                                set("payment_balance_custom_installments", next);
                              };
                              return (
                                <div className="space-y-2">
                                  {list.map((v, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground w-20 shrink-0">Parcela {i + 1}</span>
                                      <Input type="number" step="0.01" value={v} onChange={(e) => updateAt(i, Number(e.target.value) || 0)} className="flex-1" />
                                      <Button type="button" variant="ghost" size="icon" onClick={() => set("payment_balance_custom_installments", list.filter((_, j) => j !== i))} aria-label="Remover parcela">
                                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                                      </Button>
                                    </div>
                                  ))}
                                  <div className="flex flex-wrap items-center gap-2 pt-2">
                                    <Button type="button" variant="outline" size="sm" onClick={() => set("payment_balance_custom_installments", [...list, list[list.length - 1] ?? 0])}>Adicionar parcela</Button>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => {
                                      if (list.length === 0) return;
                                      const v = Math.round((balance / list.length) * 100) / 100;
                                      set("payment_balance_custom_installments", list.map(() => v));
                                    }}>Distribuir igualmente</Button>
                                    <div className="ml-auto text-[11px] text-right">
                                      <div className="text-muted-foreground">
                                        Soma: <span className="font-semibold text-foreground tabular-nums">{formatMoneyBR(sum, form.currency)}</span>
                                        {" · "}Saldo: <span className="font-semibold text-foreground tabular-nums">{formatMoneyBR(balance, form.currency)}</span>
                                      </div>
                                      {Math.abs(diff) > 1 && (
                                        <div className={diff > 0 ? "text-rose-600 dark:text-rose-400 font-semibold mt-0.5" : "text-amber-600 dark:text-amber-400 font-semibold mt-0.5"}>
                                          {diff > 0 ? "Excesso" : "Falta"} de {formatMoneyBR(Math.abs(diff), form.currency)}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          <div>
                            <Label>Observações de pagamento</Label>
                            <Textarea value={form.payment_notes} onChange={(e) => set("payment_notes", e.target.value)} placeholder="Ex: parcelas no boleto vencem todo dia 10..." rows={2} />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    {/* Custo interno + lucro · NÃO aparece na proposta */}
                    {(() => {
                      const cost = Number(form.internal_cost) || 0;
                      const isPP = (form.price_label || "").toLowerCase().includes("pessoa");
                      const pax = Math.max(1, (Number(form.pax_adults) || 0) + (Number(form.pax_children) || 0));
                      const totalRevenue = isPP ? total * pax : total;
                      const profit = totalRevenue - cost;
                      const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
                      const profitColor = profit > 0 ? "text-emerald-600 dark:text-emerald-400" : profit < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground";
                      return (
                        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Lock className="w-3.5 h-3.5 text-amber-600" />
                            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Uso interno · não aparece na proposta</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label className="text-sm font-semibold">Custo do pacote (R$)</Label>
                              <Input
                                type="number"
                                inputMode="decimal"
                                value={form.internal_cost}
                                onChange={(e) => set("internal_cost", e.target.value)}
                                placeholder="0"
                                className="text-base font-semibold"
                              />
                              <p className="text-[11px] text-muted-foreground mt-1">
                                Quanto a agência paga pra fornecer este pacote
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm font-semibold">Receita total</Label>
                              <div className="h-10 px-3 rounded-md border border-border bg-background flex items-center text-base font-bold tabular-nums">
                                {totalRevenue > 0 ? formatMoneyBR(totalRevenue, form.currency) : "—"}
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-1">
                                {isPP ? `${pax} pax × ${formatMoneyBR(total, form.currency)}` : "Valor total do pacote"}
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm font-semibold">Lucro estimado</Label>
                              <div className={`h-10 px-3 rounded-md border border-border bg-background flex items-center text-base font-bold tabular-nums ${profitColor}`}>
                                {totalRevenue > 0 || cost > 0 ? formatMoneyBR(profit, form.currency) : "—"}
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-1">
                                {totalRevenue > 0 && cost > 0 ? `Margem de ${margin.toFixed(1)}%` : "Receita · custo"}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <PaymentPreview form={form} />
                  </>
                );
              })()}
            </Card>

            {/* ============ 8 · AVANÇADO (collapsible) ============ */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="avancado" className="border border-border/60 rounded-xl bg-card">
                <AccordionTrigger className="px-5 py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Settings2 className="w-4 h-4 text-muted-foreground" />
                    <div className="text-left">
                      <div className="text-sm font-semibold">Avançado · SEO, slug e textos auxiliares</div>
                      <div className="text-[11px] text-muted-foreground">Categoria, URL, SEO, mensagem do WhatsApp, como funciona, recomendações</div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Slug (URL)</Label>
                      <Input value={form.slug} onChange={(e) => set("slug", slugify(e.target.value))} placeholder="auto a partir do título" />
                    </div>
                    <div>
                      <Label>Categoria</Label>
                      <Input value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="praia, romântico, família" />
                    </div>
                    <div>
                      <Label>Duração</Label>
                      <Input value={form.duration} onChange={(e) => set("duration", e.target.value)} placeholder="Ex: 7 dias / 6 noites" />
                    </div>
                    <div>
                      <Label>Pax mín / máx (total)</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input type="number" value={form.pax_min} onChange={(e) => set("pax_min", e.target.value)} placeholder="mín" />
                        <Input type="number" value={form.pax_max} onChange={(e) => set("pax_max", e.target.value)} placeholder="máx" />
                      </div>
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
                    <Label>Pickup info</Label>
                    <Input value={form.pickup_info} onChange={(e) => set("pickup_info", e.target.value)} />
                  </div>
                  <div className="pt-3 border-t border-border/40 space-y-4">
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
                      <Label>Imagem OG (compartilhamento)</Label>
                      <Input value={form.og_image} onChange={(e) => set("og_image", e.target.value)} placeholder="opcional · usa a capa se vazio" />
                    </div>
                    <div>
                      <Label>Mensagem do botão WhatsApp</Label>
                      <Textarea rows={3} value={form.whatsapp_cta_text} onChange={(e) => set("whatsapp_cta_text", e.target.value)} placeholder='Olá! Tenho interesse no produto "..."' />
                    </div>
                    {isEdit && (
                      <div className="bg-muted/40 rounded-lg p-3 text-sm flex items-center justify-between">
                        <span className="text-muted-foreground truncate">URL pública: /p/{form.slug}</span>
                        <Button variant="ghost" size="sm" onClick={copyPublic}><Copy className="w-3.5 h-3.5" /></Button>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* ============ 9 · MARKETING ============ */}
            <Card className="p-5 space-y-4">
              <SectionHeader icon={Megaphone} title="Marketing · gerar artes" subtitle={recordId ? "Crie posts, stories e capas a partir deste produto" : "Salve o produto primeiro para liberar a geração de artes"} />
              {recordId ? (
                <MarketingTab
                  productId={recordId}
                  title={form.title}
                  destination={form.destination}
                  originCity={form.origin_city}
                  shortDescription={form.short_description}
                  priceFrom={form.price_from}
                  pricePromo={form.price_promo}
                  coverUrl={form.cover_image_url}
                  galleryUrls={form.gallery.split("\n").map((s) => s.trim()).filter(Boolean)}
                  departureDate={form.departure_date}
                  returnDate={form.return_date}
                  includes={form.includes.split("\n").map((s) => s.trim()).filter(Boolean)}
                  hotelName={form.hotel_name}
                  hotelStars={form.hotel_stars}
                  nights={form.nights}
                  seatsLeft={form.seats_left}
                  paxMin={form.pax_min}
                  paxMax={form.pax_max}
                  paxAdults={form.pax_adults}
                  paxChildren={form.pax_children}
                  isPromo={form.is_promo}
                  productKind={form.product_kind}
                  airline={form.airline}
                  originIata={form.origin_iata}
                  destinationIata={form.destination_iata}
                  highlights={form.highlights.split("\n").map((s) => s.trim()).filter(Boolean)}
                  paymentTerms={{
                    entryPercent: Number(form.payment_entry_percent) || 30,
                    entryAmount: Number(form.payment_entry_amount) || undefined,
                    daysBefore: Number(form.payment_days_before) || 20,
                    maxInstallments: Number(form.payment_balance_installments_max) || 12,
                    minInstallment: Number(form.payment_balance_min_installment) || 200,
                    pixDiscountPercent: Number(form.payment_pix_discount_percent) || 0,
                  }}
                />
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
                  <Megaphone className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Clique em <span className="font-semibold text-foreground">Salvar</span> no topo para gerar as artes deste produto.</p>
                </div>
              )}
            </Card>

            {/* Botão final · sticky */}
            <div className="sticky bottom-3 z-10 flex justify-end">
              <Button size="lg" onClick={save} disabled={saving} className="shadow-lg">
                <Save className="w-4 h-4 mr-1.5" /> {saving ? "Salvando..." : (isEdit ? "Salvar alterações" : "Criar produto")}
              </Button>
            </div>
          </div>
        );
      })()}
        </div>

        {previewVisible && (
          <aside className="hidden lg:block">
            <div className="sticky top-4 space-y-2">
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Pré-visualização ao vivo
                </div>
                <div className="flex items-center rounded-lg border border-border/40 p-0.5">
                  <button
                    type="button"
                    onClick={() => setPreviewMode("desktop")}
                    className={cn(
                      "flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-medium transition-colors",
                      previewMode === "desktop" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                    )}
                    title="Desktop"
                  >
                    <Monitor className="w-3 h-3" /> Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("mobile")}
                    className={cn(
                      "flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-medium transition-colors",
                      previewMode === "mobile" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
                    )}
                    title="Mobile"
                  >
                    <Smartphone className="w-3 h-3" /> Mobile
                  </button>
                </div>
              </div>
              <div
                className={cn(
                  "rounded-xl border border-border/40 bg-background overflow-hidden shadow-sm",
                  "max-h-[calc(100vh-7rem)] overflow-y-auto",
                  previewMode === "mobile" && "mx-auto max-w-[390px]",
                )}
              >
                <ProductLivePreview form={form as any} />
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// Preview ao vivo do plano de pagamento · espelha o que o cliente verá
// =====================================================================
function SectionHeader({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 pb-2 border-b border-border/40">
      <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-semibold text-foreground leading-tight">{title}</h2>
        {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function PaymentPreview({ form }: { form: any }) {
  const price = Number(form.price_promo) || Number(form.price_from) || 0;
  if (price <= 0) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Defina o preço para ver o preview do plano de pagamento.
      </div>
    );
  }

  const customInstRaw = (form.payment_balance_custom_installments || []).filter((v: number) => Number.isFinite(v) && v > 0);

  // Se o usuário definiu entrada + nº parcelas explicitamente, geramos as parcelas
  // exatas (entrada + parcVal × N) pra que o preview mostre EXATAMENTE o que ele digitou.
  const entryAmtNum = Number(form.payment_entry_amount) || 0;
  const nParcNum = Math.max(1, Number(form.payment_balance_installments_max) || 1);
  const balanceNum = Math.max(0, price - entryAmtNum);
  const parcValExact = entryAmtNum > 0 && balanceNum > 0 ? Math.round((balanceNum / nParcNum) * 100) / 100 : 0;
  const customInst = customInstRaw.length > 0
    ? customInstRaw
    : (parcValExact > 0 ? Array.from({ length: nParcNum }, () => parcValExact) : []);

  const plan = computeNatlevaPlan(price, form.departure_date || null, {
    entryPercent: Number(form.payment_entry_percent) || 30,
    entryAmount: entryAmtNum > 0 ? entryAmtNum : undefined,
    daysBefore: Number(form.payment_days_before) || 20,
    currency: form.currency || "BRL",
    maxInstallments: Number(form.payment_balance_installments_max) || 12,
    minInstallment: Number(form.payment_balance_min_installment) || 0,
    pixDiscountPercent: Number(form.payment_pix_discount_percent) || 0,
    customInstallments: customInst.length > 0 ? customInst : undefined,
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
          entryAmount={entryAmtNum > 0 ? entryAmtNum : undefined}
          daysBefore={Number(form.payment_days_before) || 20}
          customInstallments={customInst.length > 0 ? customInst : undefined}
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
