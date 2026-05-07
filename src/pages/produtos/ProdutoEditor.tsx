import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Trash2, Save, Youtube, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

type ProductForm = {
  slug: string;
  title: string;
  destination: string;
  destination_country: string;
  category: string;
  short_description: string;
  description: string;
  cover_image_url: string;
  gallery: string; // textarea: 1 url por linha
  duration: string;
  price_from: string;
  currency: string;
  includes: string;
  excludes: string;
  highlights: string;
  how_it_works: string;
  pickup_info: string;
  recommendations: string;
  is_active: boolean;
};

const empty: ProductForm = {
  slug: "", title: "", destination: "", destination_country: "", category: "passeio",
  short_description: "", description: "", cover_image_url: "", gallery: "",
  duration: "", price_from: "", currency: "USD",
  includes: "", excludes: "", highlights: "",
  how_it_works: "", pickup_info: "", recommendations: "", is_active: true,
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
    if (!ytUrl.trim()) {
      toast.error("Cole a URL do vídeo do YouTube");
      return;
    }
    setYtLoading(true);
    const tId = toast.loading("Analisando vídeo e gerando o produto…", { description: "Isso pode levar até 1 minuto." });
    try {
      const { data, error } = await supabase.functions.invoke("product-from-youtube", {
        body: { url: ytUrl.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.error);
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
      toast.success("Produto preenchido com base no vídeo", { id: tId, description: "Revise os campos antes de salvar." });
    } catch (e: any) {
      toast.error("Não foi possível extrair do vídeo", { id: tId, description: e?.message ?? "Tente outro vídeo ou preencha manualmente." });
    } finally {
      setYtLoading(false);
    }
  };

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("experience_products").select("*").eq("slug", slug).maybeSingle();
      if (data) {
        setRecordId(data.id);
        setForm({
          slug: data.slug, title: data.title,
          destination: data.destination, destination_country: data.destination_country ?? "",
          category: data.category ?? "passeio",
          short_description: data.short_description ?? "", description: data.description ?? "",
          cover_image_url: data.cover_image_url ?? "",
          gallery: (data.gallery ?? []).map((g: any) => g.url).join("\n"),
          duration: data.duration ?? "",
          price_from: data.price_from?.toString() ?? "",
          currency: data.currency ?? "USD",
          includes: (data.includes ?? []).join("\n"),
          excludes: (data.excludes ?? []).join("\n"),
          highlights: (data.highlights ?? []).join("\n"),
          how_it_works: data.how_it_works ?? "",
          pickup_info: data.pickup_info ?? "",
          recommendations: data.recommendations ?? "",
          is_active: data.is_active,
        });
      }
      setLoading(false);
    })();
  }, [slug, isEdit]);

  const set = <K extends keyof ProductForm>(k: K, v: ProductForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title || !form.destination) {
      toast.error("Título e destino são obrigatórios");
      return;
    }
    setSaving(true);
    const finalSlug = form.slug || slugify(form.title);
    const linesToArr = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
    const payload = {
      slug: finalSlug,
      title: form.title,
      destination: form.destination,
      destination_country: form.destination_country || null,
      category: form.category || null,
      short_description: form.short_description || null,
      description: form.description || null,
      cover_image_url: form.cover_image_url || null,
      gallery: linesToArr(form.gallery).map((url) => ({ url, type: "image" })),
      duration: form.duration || null,
      price_from: form.price_from ? Number(form.price_from) : null,
      currency: form.currency || "USD",
      includes: linesToArr(form.includes),
      excludes: linesToArr(form.excludes),
      highlights: linesToArr(form.highlights),
      how_it_works: form.how_it_works || null,
      pickup_info: form.pickup_info || null,
      recommendations: form.recommendations || null,
      is_active: form.is_active,
    };
    const { error } = isEdit && recordId
      ? await (supabase as any).from("experience_products").update(payload).eq("id", recordId)
      : await (supabase as any).from("experience_products").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success(isEdit ? "Produto atualizado" : "Produto criado");
    navigate(`/produtos/${finalSlug}`);
  };

  const remove = async () => {
    if (!recordId) return;
    if (!confirm("Excluir este produto?")) return;
    await (supabase as any).from("experience_products").delete().eq("id", recordId);
    toast.success("Produto excluído");
    navigate("/produtos");
  };

  if (loading) return <div className="p-8 text-muted-foreground text-sm">Carregando…</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link to={isEdit ? `/produtos/${form.slug}` : "/produtos"}>
          <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar</Button>
        </Link>
        <div className="flex gap-2">
          {isEdit && (
            <Button variant="outline" size="sm" onClick={remove}>
              <Trash2 className="w-4 h-4 mr-1.5" /> Excluir
            </Button>
          )}
          <Button size="sm" onClick={save} disabled={saving} className="bg-champagne text-champagne-foreground hover:bg-champagne/90">
            <Save className="w-4 h-4 mr-1.5" /> {saving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>

      <h1 className="font-serif text-3xl">{isEdit ? "Editar produto" : "Novo produto"}</h1>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-[15px]">Informações principais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Título *</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Isla Saona · Dia Completo" />
          </div>
          <div>
            <Label>Slug (URL)</Label>
            <Input value={form.slug} onChange={(e) => set("slug", slugify(e.target.value))} placeholder="auto a partir do título" />
          </div>
          <div>
            <Label>Destino *</Label>
            <Input value={form.destination} onChange={(e) => set("destination", e.target.value)} placeholder="Punta Cana" />
          </div>
          <div>
            <Label>País</Label>
            <Input value={form.destination_country} onChange={(e) => set("destination_country", e.target.value)} placeholder="República Dominicana" />
          </div>
          <div>
            <Label>Categoria</Label>
            <Input value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="passeio" />
          </div>
          <div>
            <Label>Duração</Label>
            <Input value={form.duration} onChange={(e) => set("duration", e.target.value)} placeholder="Dia inteiro · ~9h" />
          </div>
          <div>
            <Label>Preço a partir de</Label>
            <Input type="number" value={form.price_from} onChange={(e) => set("price_from", e.target.value)} placeholder="120" />
          </div>
          <div>
            <Label>Moeda</Label>
            <Input value={form.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} placeholder="USD" />
          </div>
        </div>
        <div>
          <Label>Resumo curto</Label>
          <Textarea rows={2} value={form.short_description} onChange={(e) => set("short_description", e.target.value)} placeholder="Frase de impacto para a prateleira" />
        </div>
      <h1 className="font-serif text-3xl">{isEdit ? "Editar produto" : "Novo produto"}</h1>

      {!isEdit && (
        <Card className="p-6 space-y-3 border-champagne/40 bg-gradient-to-br from-champagne/5 to-transparent">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-champagne/15 flex items-center justify-center shrink-0">
              <Youtube className="w-5 h-5 text-champagne" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-[15px] flex items-center gap-2">
                Criar a partir de um vídeo do YouTube
                <Sparkles className="w-3.5 h-3.5 text-champagne" />
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cole a URL de um vídeo sobre o passeio. A IA assiste o vídeo e preenche os campos abaixo.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={ytUrl}
              onChange={(e) => setYtUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={ytLoading}
              className="flex-1"
            />
            <Button
              onClick={importFromYouTube}
              disabled={ytLoading || !ytUrl.trim()}
              className="bg-champagne text-champagne-foreground hover:bg-champagne/90 shrink-0"
            >
              {ytLoading ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Analisando…</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-1.5" /> Gerar com IA</>
              )}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Os campos serão preenchidos automaticamente. Você pode revisar e ajustar tudo antes de salvar.
          </p>
        </Card>
      )}

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-[15px]">Informações principais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Título *</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Isla Saona · Dia Completo" />
          </div>
          <div>
            <Label>Slug (URL)</Label>
            <Input value={form.slug} onChange={(e) => set("slug", slugify(e.target.value))} placeholder="auto a partir do título" />
          </div>
          <div>
            <Label>Destino *</Label>
            <Input value={form.destination} onChange={(e) => set("destination", e.target.value)} placeholder="Punta Cana" />
          </div>
          <div>
            <Label>País</Label>
            <Input value={form.destination_country} onChange={(e) => set("destination_country", e.target.value)} placeholder="República Dominicana" />
          </div>
          <div>
            <Label>Categoria</Label>
            <Input value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="passeio" />
          </div>
          <div>
            <Label>Duração</Label>
            <Input value={form.duration} onChange={(e) => set("duration", e.target.value)} placeholder="Dia inteiro · ~9h" />
          </div>
          <div>
            <Label>Preço a partir de</Label>
            <Input type="number" value={form.price_from} onChange={(e) => set("price_from", e.target.value)} placeholder="120" />
          </div>
          <div>
            <Label>Moeda</Label>
            <Input value={form.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} placeholder="USD" />
          </div>
        </div>
        <div>
          <Label>Resumo curto</Label>
          <Textarea rows={2} value={form.short_description} onChange={(e) => set("short_description", e.target.value)} placeholder="Frase de impacto para a prateleira" />
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
          <Label className="!m-0">Ativo (aparece na prateleira)</Label>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-[15px]">Mídia</h2>
        <div>
          <Label>URL da imagem de capa</Label>
          <Input value={form.cover_image_url} onChange={(e) => set("cover_image_url", e.target.value)} placeholder="https://..." />
        </div>
        <div>
          <Label>Galeria (uma URL por linha)</Label>
          <Textarea rows={4} value={form.gallery} onChange={(e) => set("gallery", e.target.value)} placeholder="https://exemplo.com/foto1.jpg" />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-[15px]">Descrição completa</h2>
        <Textarea rows={6} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Conte a história do passeio…" />
        <div>
          <Label>Como funciona</Label>
          <Textarea rows={4} value={form.how_it_works} onChange={(e) => set("how_it_works", e.target.value)} placeholder="Passo a passo do passeio" />
        </div>
        <div>
          <Label>Pickup / encontro</Label>
          <Input value={form.pickup_info} onChange={(e) => set("pickup_info", e.target.value)} placeholder="Buscamos no hotel · incluso" />
        </div>
        <div>
          <Label>Recomendações</Label>
          <Textarea rows={3} value={form.recommendations} onChange={(e) => set("recommendations", e.target.value)} placeholder="O que levar, dicas práticas…" />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-[15px]">Listas (uma por linha)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Destaques</Label>
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
    </div>
  );
}
