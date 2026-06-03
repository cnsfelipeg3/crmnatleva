import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Copy,
  Check,
  Link2,
  MessageCircle,
  Images,
  Download,
  Video,
  FileText,
  Search,
  X,
  Share2,
  Package,
  MapPin,
  LayoutGrid,
  Rows,
} from "lucide-react";
import { useAffiliateProfile } from "@/components/vitrine/useAffiliateProfile";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type GalleryItem = { type?: string; url: string };

type ProductRow = {
  id: string;
  slug: string;
  title: string;
  destination: string | null;
  destination_country: string | null;
  category: string | null;
  cover_image_url: string | null;
  gallery: GalleryItem[] | null;
};

type Creative = {
  id: string;
  url: string;
  kind: "image" | "video";
  isCover: boolean;
  product: ProductRow;
};

export default function VitrineMateriais() {
  const { data: affiliate } = useAffiliateProfile();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [productId, setProductId] = useState<string>("all");
  const [destination, setDestination] = useState<string>("all");
  const [country, setCountry] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "grouped">("grouped");
  const [lightbox, setLightbox] = useState<Creative | null>(null);

  const ref = affiliate?.ref_code || "seu-codigo";
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://adm.natleva.com";
  const meuLink = `${baseUrl}/loja?ref=${ref}`;

  const { data: products = [] } = useQuery({
    queryKey: ["affiliate-materials-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("experience_products")
        .select(
          "id, slug, title, destination, destination_country, category, cover_image_url, gallery"
        )
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data || []) as ProductRow[];
    },
  });

  const { data: materials = [] } = useQuery({
    queryKey: ["affiliate-materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_materials")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
  });

  // Build creatives list from product gallery + cover
  const allCreatives: Creative[] = useMemo(() => {
    const out: Creative[] = [];
    for (const p of products) {
      if (p.cover_image_url) {
        out.push({
          id: `${p.id}-cover`,
          url: p.cover_image_url,
          kind: "image",
          isCover: true,
          product: p,
        });
      }
      const gal = Array.isArray(p.gallery) ? p.gallery : [];
      gal.forEach((g, idx) => {
        if (!g?.url) return;
        const k = (g.type === "video" ? "video" : "image") as "image" | "video";
        out.push({
          id: `${p.id}-g-${idx}`,
          url: g.url,
          kind: k,
          isCover: false,
          product: p,
        });
      });
    }
    return out;
  }, [products]);

  // Unique filter options
  const destinations = useMemo(() => {
    const s = new Set<string>();
    products.forEach((p) => p.destination && s.add(p.destination));
    return Array.from(s).sort();
  }, [products]);

  const countries = useMemo(() => {
    const s = new Set<string>();
    products.forEach((p) => p.destination_country && s.add(p.destination_country));
    return Array.from(s).sort();
  }, [products]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    products.forEach((p) => p.category && s.add(p.category));
    return Array.from(s).sort();
  }, [products]);

  // Apply filters
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allCreatives.filter((c) => {
      if (productId !== "all" && c.product.id !== productId) return false;
      if (destination !== "all" && c.product.destination !== destination) return false;
      if (country !== "all" && c.product.destination_country !== country) return false;
      if (category !== "all" && c.product.category !== category) return false;
      if (q) {
        const hay = `${c.product.title} ${c.product.destination ?? ""} ${c.product.destination_country ?? ""} ${c.product.category ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allCreatives, productId, destination, country, category, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, { product: ProductRow; items: Creative[] }>();
    for (const c of filtered) {
      const g = map.get(c.product.id);
      if (g) g.items.push(c);
      else map.set(c.product.id, { product: c.product, items: [c] });
    }
    return Array.from(map.values()).sort((a, b) =>
      a.product.title.localeCompare(b.product.title, "pt-BR")
    );
  }, [filtered]);

  const activeFilters =
    (productId !== "all" ? 1 : 0) +
    (destination !== "all" ? 1 : 0) +
    (country !== "all" ? 1 : 0) +
    (category !== "all" ? 1 : 0) +
    (search.trim() ? 1 : 0);

  const clearFilters = () => {
    setSearch("");
    setProductId("all");
    setDestination("all");
    setCountry("all");
    setCategory("all");
  };

  const textosProntos = [
    {
      titulo: "Convite leve · WhatsApp",
      texto: `Oi! Tô indicando a NatLeva pra quem quer viajar bem sem se preocupar com nada. Eles montam tudo: aéreo, hotel, passeio. Dá uma olhada nos pacotes: ${meuLink}`,
    },
    {
      titulo: "Stories · Instagram",
      texto: `Viagem sem dor de cabeça existe ✈️ A galera da NatLeva organiza tudo · pacote completo, parcelado e ainda dá pra escolher hospedagem TOP. Link aqui ó 👇 ${meuLink}`,
    },
    {
      titulo: "Indicação direta",
      texto: `Lembrei de você quando vi esse pacote! Achei que ia gostar. A NatLeva é a agência que eu confio · clica aqui: ${meuLink}`,
    },
  ];

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copiado!");
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const productLink = (p: ProductRow) => `${baseUrl}/p/${p.slug}?ref=${ref}`;

  const shareWhats = (c: Creative) => {
    const link = productLink(c.product);
    const txt = `Olha esse pacote pra ${c.product.destination ?? "essa viagem"} 👇\n${c.product.title}\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`, "_blank");
  };

  const downloadImage = async (c: Creative) => {
    try {
      const res = await fetch(c.url, { mode: "cors" });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = `${c.product.destination || c.product.title}-${c.id}`
        .replace(/[^a-z0-9-_]+/gi, "-")
        .toLowerCase();
      a.download = `${safeName}.${c.kind === "video" ? "mp4" : "jpg"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // fallback: open in new tab
      window.open(c.url, "_blank");
    }
  };

  const renderTile = (c: Creative) => (
    <Card key={c.id} className="overflow-hidden group border-emerald-900/10">
      <div
        className="aspect-square bg-muted relative cursor-zoom-in"
        onClick={() => setLightbox(c)}
      >
        {c.kind === "video" ? (
          <video src={c.url} className="w-full h-full object-cover" muted loop playsInline />
        ) : (
          <img
            src={c.url}
            alt={c.product.title}
            className="w-full h-full object-cover transition-transform group-hover:scale-[1.03]"
            loading="lazy"
          />
        )}
        {c.isCover && (
          <Badge className="absolute top-2 left-2 bg-emerald-700 hover:bg-emerald-700 text-white border-0 text-[10px]">
            Capa
          </Badge>
        )}
        <Badge
          variant="outline"
          className="absolute top-2 right-2 text-[10px] bg-background/85 backdrop-blur capitalize"
        >
          {c.kind === "video" ? (
            <>
              <Video className="h-3 w-3 mr-1" /> Vídeo
            </>
          ) : (
            "Foto"
          )}
        </Badge>
      </div>
      <CardContent className="p-3 space-y-2">
        <div>
          <h4 className="text-xs font-medium line-clamp-1">{c.product.title}</h4>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-2.5 w-2.5" />
            {c.product.destination}
            {c.product.destination_country ? ` · ${c.product.destination_country}` : ""}
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 text-[11px] gap-1"
            onClick={(e) => {
              e.stopPropagation();
              downloadImage(c);
            }}
          >
            <Download className="h-3 w-3" /> Baixar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2"
            title="Compartilhar no WhatsApp"
            onClick={(e) => {
              e.stopPropagation();
              shareWhats(c);
            }}
          >
            <Share2 className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2"
            title="Copiar link do pacote"
            onClick={(e) => {
              e.stopPropagation();
              copy(productLink(c.product), `lnk-${c.id}`);
            }}
          >
            {copiedKey === `lnk-${c.id}` ? (
              <Check className="h-3 w-3" />
            ) : (
              <Link2 className="h-3 w-3" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <header>
        <h1 className="font-serif text-2xl sm:text-3xl">Materiais de divulgação</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tudo pronto pra você compartilhar nas suas redes em 1 clique.
        </p>
      </header>

      <Card className="border-emerald-900/15">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4 text-emerald-700" /> Seu link pessoal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Input value={meuLink} readOnly className="font-mono text-xs" />
            <Button onClick={() => copy(meuLink, "link")} className="shrink-0">
              {copiedKey === "link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Qualquer compra feita por esse link é registrada como sua indicação.
          </p>
        </CardContent>
      </Card>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="h-4 w-4 text-emerald-700" />
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground/70">
            Textos prontos
          </h2>
        </div>
        <div className="grid lg:grid-cols-3 gap-3">
          {textosProntos.map((t, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Badge variant="outline" className="text-[10px]">
                  {t.titulo}
                </Badge>
                <Textarea value={t.texto} readOnly rows={5} className="text-xs resize-none" />
                <Button
                  onClick={() => copy(t.texto, `txt-${i}`)}
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5"
                >
                  {copiedKey === `txt-${i}` ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copiar texto
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* === Biblioteca de criativos por pacote === */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Images className="h-4 w-4 text-emerald-700" />
              Criativos por pacote
              <Badge variant="outline" className="ml-1 text-[10px] font-normal">
                {filtered.length} artes
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-1 border rounded-md p-0.5">
              <Button
                size="sm"
                variant={viewMode === "grouped" ? "secondary" : "ghost"}
                className="h-7 px-2 text-[11px] gap-1"
                onClick={() => setViewMode("grouped")}
              >
                <Rows className="h-3 w-3" /> Por pacote
              </Button>
              <Button
                size="sm"
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                className="h-7 px-2 text-[11px] gap-1"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-3 w-3" /> Tudo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto_auto] items-center">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por pacote, destino, país..."
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="h-9 text-xs min-w-[180px]">
                <Package className="h-3.5 w-3.5 mr-1.5" />
                <SelectValue placeholder="Pacote" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os pacotes</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger className="h-9 text-xs min-w-[140px]">
                <MapPin className="h-3.5 w-3.5 mr-1.5" />
                <SelectValue placeholder="Destino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os destinos</SelectItem>
                {destinations.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="h-9 text-xs min-w-[120px]">
                <SelectValue placeholder="País" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os países</SelectItem>
                {countries.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 text-xs min-w-[120px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {activeFilters > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{activeFilters} filtro(s) ativo(s)</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[11px] gap-1"
                onClick={clearFilters}
              >
                <X className="h-3 w-3" /> Limpar
              </Button>
            </div>
          )}

          {/* Content */}
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground border border-dashed rounded-lg">
              <Images className="h-10 w-10 mx-auto mb-2 opacity-40" />
              Nenhum criativo encontrado com esses filtros.
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filtered.map(renderTile)}
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map((g) => (
                <div key={g.product.id} className="space-y-2">
                  <div className="flex items-end justify-between gap-3 border-b pb-2">
                    <div>
                      <h3 className="text-sm font-medium">{g.product.title}</h3>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5" />
                        {g.product.destination}
                        {g.product.destination_country ? ` · ${g.product.destination_country}` : ""}
                        {g.product.category ? ` · ${g.product.category}` : ""}
                        <span className="mx-1">·</span>
                        {g.items.length} arte(s)
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] gap-1"
                      onClick={() => copy(productLink(g.product), `plnk-${g.product.id}`)}
                    >
                      {copiedKey === `plnk-${g.product.id}` ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Link2 className="h-3 w-3" />
                      )}
                      Copiar link
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {g.items.map(renderTile)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* === Materiais customizados (admin) === */}
      {materials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" /> Materiais extras NatLeva
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {materials.map((m: any) => {
                const Icon = m.kind === "video" ? Video : m.kind === "document" ? FileText : Images;
                return (
                  <Card key={m.id} className="overflow-hidden">
                    <div className="aspect-square bg-muted relative">
                      {m.thumbnail_url || m.media_url ? (
                        m.kind === "video" ? (
                          <video
                            src={m.media_url || undefined}
                            poster={m.thumbnail_url || undefined}
                            className="w-full h-full object-cover"
                            muted
                            loop
                          />
                        ) : (
                          <img
                            src={m.thumbnail_url || m.media_url || ""}
                            alt={m.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )
                      ) : (
                        <div className="w-full h-full grid place-items-center text-muted-foreground">
                          <Icon className="h-8 w-8 opacity-40" />
                        </div>
                      )}
                      <Badge
                        variant="outline"
                        className="absolute top-2 left-2 text-[10px] bg-background/80 backdrop-blur capitalize"
                      >
                        {m.format || m.kind}
                      </Badge>
                    </div>
                    <CardContent className="p-3 space-y-2">
                      <h4 className="text-xs font-medium line-clamp-1">{m.title}</h4>
                      {m.description && (
                        <p className="text-[10px] text-muted-foreground line-clamp-2">
                          {m.description}
                        </p>
                      )}
                      <div className="flex gap-1.5">
                        {m.media_url && (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="flex-1 h-7 text-[11px] gap-1"
                          >
                            <a href={m.media_url} download target="_blank" rel="noreferrer">
                              <Download className="h-3 w-3" /> Baixar
                            </a>
                          </Button>
                        )}
                        {m.copy_text && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            onClick={() =>
                              copy(m.copy_text!.replace(/\{link\}/g, meuLink), `mat-${m.id}`)
                            }
                          >
                            {copiedKey === `mat-${m.id}` ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* === Lightbox === */}
      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {lightbox && (
            <div className="flex flex-col">
              <div className="bg-black flex items-center justify-center max-h-[75vh]">
                {lightbox.kind === "video" ? (
                  <video src={lightbox.url} controls className="max-h-[75vh] w-auto" />
                ) : (
                  <img
                    src={lightbox.url}
                    alt={lightbox.product.title}
                    className="max-h-[75vh] w-auto object-contain"
                  />
                )}
              </div>
              <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium">{lightbox.product.title}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {lightbox.product.destination}
                    {lightbox.product.destination_country
                      ? ` · ${lightbox.product.destination_country}`
                      : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => downloadImage(lightbox)}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Baixar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => shareWhats(lightbox)}>
                    <Share2 className="h-3.5 w-3.5 mr-1" /> WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => copy(productLink(lightbox.product), `lb-${lightbox.id}`)}
                  >
                    {copiedKey === `lb-${lightbox.id}` ? (
                      <Check className="h-3.5 w-3.5 mr-1" />
                    ) : (
                      <Link2 className="h-3.5 w-3.5 mr-1" />
                    )}
                    Copiar link
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
