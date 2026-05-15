// Preview ao vivo · espelha 1:1 o layout de PrateleiraVendaPublica
// (hero cinematográfico simplificado + main + sticky offer + seções).
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin, Calendar, Check, X, Plane, Hotel, Star, Sparkles,
  ArrowLeft, Share2, Images, CreditCard,
} from "lucide-react";

type Gallery = Array<{ url: string; type?: string; caption?: string }> | string;

const KIND_LABEL: Record<string, string> = {
  aereo: "Passagem aérea",
  hospedagem: "Hospedagem",
  pacote: "Pacote completo",
  passeio: "Passeio",
  cruzeiro: "Cruzeiro",
  outros: "Experiência",
};

function parseGallery(g: Gallery): Array<{ url: string }> {
  if (!g) return [];
  if (Array.isArray(g)) return g.filter((i) => i?.url).map((i) => ({ url: i.url }));
  return String(g)
    .split(/\r?\n/).map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s))
    .map((url) => ({ url }));
}

function fmtDate(d?: string) {
  if (!d) return "";
  try {
    const [y, m, dd] = d.split("-");
    const months = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
    return `${dd} de ${months[Number(m) - 1]} ${y}`;
  } catch { return d; }
}

function moneyBR(v?: string | number, currency = "BRL") {
  const n = typeof v === "number" ? v : Number(String(v || "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  const sym = currency === "USD" ? "US$" : currency === "EUR" ? "€" : "R$";
  return `${sym} ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

const lines = (s: string) =>
  String(s || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

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
  // opcionais
  payment_terms?: string;
  installments_max?: string | number;
  installments_no_interest?: string | number;
  pix_discount_percent?: string | number;
  price_label?: string;
  seats_left?: string | number;
}

export default function ProductLivePreview({ form }: { form: ProductLivePreviewForm }) {
  const gallery = parseGallery(form.gallery);
  const allImages = Array.from(
    new Set([form.cover_image_url, ...gallery.map((g) => g.url)].filter(Boolean) as string[])
  );
  const cover = allImages[0];
  const highlights = lines(form.highlights);
  const includes = lines(form.includes);
  const excludes = lines(form.excludes);

  const promo = moneyBR(form.price_promo, form.currency);
  const full = moneyBR(form.price_from, form.currency);

  const hasAereo = form.product_kind === "aereo" || form.product_kind === "pacote";
  const hasHospedagem = form.product_kind === "hospedagem" || form.product_kind === "pacote";
  const kindLabel = KIND_LABEL[form.product_kind] || "Experiência";

  const dateRange = form.flexible_dates
    ? "Datas flexíveis · sob consulta"
    : form.departure_date && form.return_date
      ? `${fmtDate(form.departure_date)} → ${fmtDate(form.return_date)}`
      : form.departure_date
        ? `Saída ${fmtDate(form.departure_date)}`
        : "";

  const installmentsMax = Number(form.installments_max || 0);
  const noInterest = Number(form.installments_no_interest || 0);
  const pixPct = Number(form.pix_discount_percent || 0);
  const seatsLeft = Number(form.seats_left || 0);

  return (
    <div className="bg-background text-foreground">
      {/* HERO cinematográfico (versão preview) */}
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-gradient-to-br from-muted to-muted/60">
        {cover ? (
          <>
            <img src={cover} alt={form.title} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/30" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            Imagem de capa aparecerá aqui
          </div>
        )}

        {/* Top bar */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-white">
          <button className="bg-black/40 backdrop-blur-sm rounded-full p-1.5 pointer-events-none">
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1.5">
            {allImages.length > 0 && (
              <span className="bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] flex items-center gap-1">
                <Images className="w-3 h-3" /> {allImages.length}
              </span>
            )}
            <button className="bg-black/40 backdrop-blur-sm rounded-full p-1.5 pointer-events-none">
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
            <Badge className="bg-white/15 text-white border-white/20 backdrop-blur-sm text-[10px] py-0 px-1.5 h-5">
              {kindLabel}
            </Badge>
            {form.is_promo && (form.promo_badge || true) && (
              <Badge className="bg-amber-400 text-black border-0 text-[10px] py-0 px-1.5 h-5 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> {form.promo_badge || "Oferta"}
              </Badge>
            )}
          </div>
          <h1 className="font-serif text-xl leading-tight drop-shadow-lg">
            {form.title || <span className="opacity-60">Título do produto</span>}
          </h1>
          {(form.destination || form.destination_country) && (
            <div className="flex items-center gap-1 text-[11px] mt-1 opacity-90">
              <MapPin className="w-3 h-3" />
              {form.destination}
              {form.destination_country ? ` · ${form.destination_country}` : ""}
            </div>
          )}
          {dateRange && (
            <div className="flex items-center gap-1 text-[11px] mt-0.5 opacity-90">
              <Calendar className="w-3 h-3" /> {dateRange}
            </div>
          )}
          {form.short_description && (
            <p className="text-[11.5px] mt-2 opacity-90 line-clamp-2 leading-snug">
              {form.short_description}
            </p>
          )}
        </div>
      </div>

      {/* Body grid · main + sticky offer (empilhado pra caber em 440px) */}
      <div className="px-3 py-4 space-y-3">
        {/* OFERTA (vai pra cima no preview já que sidebar não cabe) */}
        <Card className="p-3 border-champagne/30 bg-gradient-to-br from-champagne/5 to-transparent">
          {(promo || full) && (
            <>
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                {form.price_label || "A partir de"}
              </div>
              {promo && full && (
                <div className="text-[11px] line-through text-muted-foreground/70 leading-none mt-0.5">
                  {full}
                </div>
              )}
              <div className="font-serif text-2xl text-champagne mt-0.5">{promo || full}</div>
              <div className="text-[10px] text-muted-foreground">por pessoa</div>
            </>
          )}
          {!promo && !full && (
            <div className="text-xs text-muted-foreground italic">Preço aparecerá aqui</div>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {installmentsMax > 0 && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-5">
                <CreditCard className="w-2.5 h-2.5 mr-1" />
                até {installmentsMax}x{noInterest > 0 ? ` (${noInterest}x s/ juros)` : ""}
              </Badge>
            )}
            {pixPct > 0 && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-5 border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
                {pixPct}% off no PIX
              </Badge>
            )}
            {seatsLeft > 0 && seatsLeft <= 5 && (
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-5 border-rose-500/40 text-rose-700 dark:text-rose-400">
                {seatsLeft} {seatsLeft === 1 ? "vaga" : "vagas"}
              </Badge>
            )}
          </div>
          <Button size="sm" className="w-full mt-2.5 h-9 text-xs font-semibold pointer-events-none">
            Garantir vaga
          </Button>
        </Card>

        {/* Por que vale a pena */}
        {highlights.length > 0 && (
          <Card className="p-4">
            <h2 className="font-serif text-base mb-2.5">Por que vale a pena</h2>
            <div className="grid grid-cols-1 gap-2">
              {highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[12px]">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Sobre essa viagem */}
        {form.description && (
          <Card className="p-4">
            <h2 className="font-serif text-base mb-1.5">Sobre essa viagem</h2>
            <div className="text-[12px] text-foreground/80 whitespace-pre-line leading-relaxed">
              {form.description}
            </div>
          </Card>
        )}

        {/* Galeria */}
        {allImages.length > 0 && (
          <Card className="p-4">
            <h2 className="font-serif text-base mb-2.5 flex items-center gap-1.5">
              <Images className="w-4 h-4 text-muted-foreground" />
              Galeria
              <span className="text-[10px] text-muted-foreground tabular-nums font-normal font-sans">
                {allImages.length} {allImages.length === 1 ? "foto" : "fotos"}
              </span>
            </h2>
            <div className="space-y-1.5">
              <div className="relative w-full aspect-[16/9] overflow-hidden rounded-lg bg-muted">
                <img src={allImages[0]} alt="" className="w-full h-full object-cover" />
                {allImages.length > 1 && (
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-full bg-black/55 backdrop-blur-sm text-white text-[10px] tabular-nums">
                    1 / {allImages.length}
                  </div>
                )}
              </div>
              {allImages.length > 1 && (
                <div className="grid grid-cols-4 gap-1.5">
                  {allImages.slice(1, 5).map((url, i) => {
                    const isLast = i === 3 && allImages.length > 5;
                    return (
                      <div key={i} className="relative aspect-square overflow-hidden rounded-md bg-muted">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        {isLast && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-semibold text-[11px]">
                            +{allImages.length - 5}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Logística */}
        {(form.airline || form.hotel_name || form.origin_city || form.nights || form.departure_date || form.return_date) && (
          <Card className="p-4">
            <h2 className="font-serif text-base mb-2.5">Logística</h2>
            <div className="grid grid-cols-1 gap-2 text-[12px]">
              {hasAereo && form.origin_city && (
                <div className="flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5 text-muted-foreground" />
                  <span><span className="text-muted-foreground">Saída:</span> {form.origin_city}{form.origin_iata ? ` (${form.origin_iata})` : ""}</span>
                </div>
              )}
              {hasAereo && form.airline && (
                <div className="flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5 text-muted-foreground" />
                  <span><span className="text-muted-foreground">Cia aérea:</span> {form.airline}</span>
                </div>
              )}
              {hasHospedagem && form.hotel_name && (
                <div className="flex items-center gap-1.5">
                  <Hotel className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>
                    <span className="text-muted-foreground">Hotel:</span> {form.hotel_name}{" "}
                    {form.hotel_stars && Array.from({ length: Math.max(0, Math.min(5, Number(form.hotel_stars))) }).map((_, k) => (
                      <Star key={k} className="inline w-3 h-3 text-amber-500 fill-amber-500" />
                    ))}
                  </span>
                </div>
              )}
              {form.departure_date && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span><span className="text-muted-foreground">Data de ida:</span> {fmtDate(form.departure_date)}</span>
                </div>
              )}
              {form.return_date && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span><span className="text-muted-foreground">Data de volta:</span> {fmtDate(form.return_date)}</span>
                </div>
              )}
              {form.nights && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span><span className="text-muted-foreground">Duração:</span> {form.nights} noite(s)</span>
                </div>
              )}
              {form.duration && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span><span className="text-muted-foreground">Tempo:</span> {form.duration}</span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Includes / Excludes */}
        {(includes.length > 0 || excludes.length > 0) && (
          <div className="grid grid-cols-1 gap-2">
            {includes.length > 0 && (
              <Card className="p-4">
                <h3 className="font-medium text-[12.5px] mb-2 text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" /> Está incluso
                </h3>
                <ul className="space-y-1.5 text-[12px]">
                  {includes.map((it, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <Check className="w-3 h-3 text-emerald-600 mt-0.5 shrink-0" /> <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {excludes.length > 0 && (
              <Card className="p-4">
                <h3 className="font-medium text-[12.5px] mb-2 text-muted-foreground flex items-center gap-1.5">
                  <X className="w-3.5 h-3.5" /> Não está incluso
                </h3>
                <ul className="space-y-1.5 text-[12px]">
                  {excludes.map((it, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <X className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" /> <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}

        {form.how_it_works && (
          <Card className="p-4">
            <h2 className="font-serif text-base mb-1.5">Como funciona</h2>
            <div className="text-[12px] text-foreground/80 whitespace-pre-line leading-relaxed">
              {form.how_it_works}
            </div>
          </Card>
        )}

        {form.recommendations && (
          <Card className="p-4">
            <h2 className="font-serif text-base mb-1.5">Recomendações</h2>
            <div className="text-[12px] text-foreground/80 whitespace-pre-line leading-relaxed">
              {form.recommendations}
            </div>
          </Card>
        )}

        {form.pickup_info && (
          <Card className="p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Pickup</div>
            <div className="text-[12px] text-foreground/80">{form.pickup_info}</div>
          </Card>
        )}

        {form.payment_terms && (
          <Card className="p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Condições de pagamento</div>
            <div className="text-[12px] text-foreground/80 whitespace-pre-line">{form.payment_terms}</div>
          </Card>
        )}
      </div>
    </div>
  );
}
