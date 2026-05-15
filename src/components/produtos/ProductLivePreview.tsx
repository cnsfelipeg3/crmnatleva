import { Card } from "@/components/ui/card";
import { Clock, MapPin, Check, X, Sparkles, Info, Plane, Hotel, Calendar } from "lucide-react";

type Gallery = Array<{ url: string; type?: string; caption?: string }> | string;

function parseGallery(g: Gallery): Array<{ url: string }> {
  if (!g) return [];
  if (Array.isArray(g)) return g.filter((i) => i?.url).map((i) => ({ url: i.url }));
  // string: linhas
  return String(g)
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s))
    .map((url) => ({ url }));
}

function fmtDate(d?: string) {
  if (!d) return "";
  try {
    const [y, m, dd] = d.split("-");
    return `${dd}/${m}/${y}`;
  } catch {
    return d;
  }
}

function moneyBR(v?: string | number, currency = "BRL") {
  const n = typeof v === "number" ? v : Number(String(v || "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  const sym = currency === "USD" ? "US$" : currency === "EUR" ? "€" : "R$";
  return `${sym} ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

export interface ProductLivePreviewForm {
  title: string;
  destination: string;
  destination_country: string;
  short_description: string;
  description: string;
  cover_image_url: string;
  gallery: Gallery;
  duration: string;
  price_from: string;
  price_promo: string;
  currency: string;
  is_promo: boolean;
  promo_badge: string;
  highlights: string;
  includes: string;
  excludes: string;
  how_it_works: string;
  pickup_info: string;
  recommendations: string;
  product_kind: string;
  origin_city: string;
  origin_iata: string;
  destination_iata: string;
  airline: string;
  hotel_name: string;
  hotel_stars: string;
  nights: string;
  departure_date: string;
  return_date: string;
  flexible_dates: boolean;
}

const lines = (s: string) =>
  String(s || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

export default function ProductLivePreview({ form }: { form: ProductLivePreviewForm }) {
  const gallery = parseGallery(form.gallery);
  const cover = form.cover_image_url || gallery[0]?.url || "";
  const highlights = lines(form.highlights);
  const includes = lines(form.includes);
  const excludes = lines(form.excludes);

  const promo = moneyBR(form.price_promo, form.currency);
  const full = moneyBR(form.price_from, form.currency);
  const hasAereo = form.product_kind === "aereo" || form.product_kind === "pacote";
  const hasHospedagem = form.product_kind === "hospedagem" || form.product_kind === "pacote";

  const dateRange = form.flexible_dates
    ? "Datas flexíveis"
    : form.departure_date && form.return_date
    ? `${fmtDate(form.departure_date)} · ${fmtDate(form.return_date)}`
    : form.departure_date
    ? `Saída ${fmtDate(form.departure_date)}`
    : "";

  return (
    <div className="bg-background text-foreground">
      {/* Hero */}
      <div className="px-4 pt-4 pb-2">
        {(form.destination || form.destination_country) && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MapPin className="w-3 h-3" />
            {form.destination}
            {form.destination_country ? ` · ${form.destination_country}` : ""}
          </div>
        )}
        <h1 className="font-serif text-xl leading-tight mt-2">
          {form.title || <span className="text-muted-foreground/60">Título do produto</span>}
        </h1>
        {form.short_description && (
          <p className="text-[12.5px] text-muted-foreground mt-2 leading-relaxed">
            {form.short_description}
          </p>
        )}

        {/* Meta chips */}
        <div className="mt-3 flex flex-wrap gap-1.5 text-[10.5px]">
          {dateRange && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5">
              <Calendar className="w-3 h-3" /> {dateRange}
            </span>
          )}
          {form.duration && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5">
              <Clock className="w-3 h-3" /> {form.duration}
            </span>
          )}
          {form.nights && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5">
              {form.nights} noites
            </span>
          )}
        </div>

        {/* Cover */}
        <div className="mt-3 relative aspect-[16/10] overflow-hidden rounded-lg bg-muted">
          {cover ? (
            <img src={cover} alt={form.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[11px] text-muted-foreground">
              Imagem de capa aparecerá aqui
            </div>
          )}
          {form.is_promo && (
            <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-semibold text-black">
              <Sparkles className="w-3 h-3" /> {form.promo_badge || "Oferta"}
            </span>
          )}
        </div>

        {/* Thumbs */}
        {gallery.length > 1 && (
          <div className="mt-2 flex gap-1.5 overflow-x-auto">
            {gallery.slice(0, 6).map((g, i) => (
              <div key={i} className="w-14 h-12 rounded-md overflow-hidden border border-border/60 shrink-0">
                <img src={g.url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preço */}
      {(promo || full) && (
        <div className="px-4 mt-3">
          <Card className="p-3 flex items-end justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">A partir de</div>
              {promo && full && (
                <div className="text-[10.5px] line-through text-muted-foreground/70 leading-none">{full}</div>
              )}
              <div className="font-serif text-xl text-champagne mt-0.5">{promo || full}</div>
            </div>
            <div className="text-[10px] text-muted-foreground">por pessoa</div>
          </Card>
        </div>
      )}

      {/* Logística */}
      {(hasAereo && (form.origin_city || form.origin_iata || form.destination_iata || form.airline)) && (
        <div className="px-4 mt-3">
          <div className="rounded-lg border border-border/40 p-3 text-[12px]">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10.5px] uppercase tracking-wider mb-1.5">
              <Plane className="w-3 h-3" /> Aéreo
            </div>
            <div className="flex items-center gap-2 font-medium">
              <span>{form.origin_iata || form.origin_city || "—"}</span>
              <span className="text-muted-foreground">→</span>
              <span>{form.destination_iata || form.destination || "—"}</span>
            </div>
            {form.airline && <div className="text-muted-foreground mt-1">{form.airline}</div>}
          </div>
        </div>
      )}

      {hasHospedagem && (form.hotel_name || form.hotel_stars) && (
        <div className="px-4 mt-2">
          <div className="rounded-lg border border-border/40 p-3 text-[12px]">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10.5px] uppercase tracking-wider mb-1.5">
              <Hotel className="w-3 h-3" /> Hospedagem
            </div>
            <div className="font-medium">{form.hotel_name || "—"}</div>
            {form.hotel_stars && (
              <div className="text-amber-500 text-[11px] mt-0.5">{"★".repeat(Math.max(0, Math.min(5, Number(form.hotel_stars))))}</div>
            )}
          </div>
        </div>
      )}

      {/* Sobre */}
      {form.description && (
        <div className="px-4 mt-4">
          <h2 className="font-serif text-base mb-1.5">Sobre a experiência</h2>
          <p className="text-[12.5px] leading-relaxed text-foreground/80 whitespace-pre-line">{form.description}</p>
        </div>
      )}

      {/* Destaques */}
      {highlights.length > 0 && (
        <div className="px-4 mt-4">
          <h2 className="font-serif text-base mb-2 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-champagne" /> Destaques
          </h2>
          <div className="grid grid-cols-1 gap-1.5">
            {highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-2 rounded-md border border-border/30 p-2 text-[12px]">
                <div className="w-1 h-1 rounded-full bg-champagne mt-1.5 shrink-0" />
                <span>{h}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inclusos / Exclusos */}
      {(includes.length > 0 || excludes.length > 0) && (
        <div className="px-4 mt-4 grid grid-cols-1 gap-2">
          {includes.length > 0 && (
            <Card className="p-3">
              <h3 className="font-semibold text-[12px] text-emerald-600 mb-1.5">Está incluso</h3>
              <ul className="space-y-1">
                {includes.map((i, k) => (
                  <li key={k} className="flex items-start gap-1.5 text-[11.5px]">
                    <Check className="w-3 h-3 text-emerald-600 mt-0.5 shrink-0" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {excludes.length > 0 && (
            <Card className="p-3">
              <h3 className="font-semibold text-[12px] text-muted-foreground mb-1.5">Não está incluso</h3>
              <ul className="space-y-1">
                {excludes.map((i, k) => (
                  <li key={k} className="flex items-start gap-1.5 text-[11.5px]">
                    <X className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      {form.how_it_works && (
        <div className="px-4 mt-4">
          <h2 className="font-serif text-base mb-1.5">Como funciona</h2>
          <Card className="p-3 text-[12px] leading-relaxed whitespace-pre-line text-foreground/85">
            {form.how_it_works}
          </Card>
        </div>
      )}

      {form.recommendations && (
        <div className="px-4 mt-4 pb-4">
          <h2 className="font-serif text-base mb-1.5 flex items-center gap-1.5">
            <Info className="w-4 h-4" /> Recomendações
          </h2>
          <Card className="p-3 text-[12px] leading-relaxed whitespace-pre-line text-foreground/80">
            {form.recommendations}
          </Card>
        </div>
      )}

      {form.pickup_info && (
        <div className="px-4 pb-4">
          <Card className="p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Pickup</div>
            <div className="text-[12px] text-foreground/80">{form.pickup_info}</div>
          </Card>
        </div>
      )}
    </div>
  );
}
