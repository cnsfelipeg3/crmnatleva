import { motion } from "framer-motion";
import { Calendar, MapPin, Plane, Hotel, Star, ShieldCheck, Lock, Sparkles } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatMoneyBR } from "@/lib/prateleira/payment-plan";
import type { CheckoutDraft } from "@/hooks/useCheckoutDraft";

function fmt(d?: string | null) {
  if (!d) return null;
  try { return format(parseISO(d), "dd MMM", { locale: ptBR }); } catch { return d; }
}

interface Props {
  draft: CheckoutDraft;
  compact?: boolean;
}

export default function CheckoutSidebar({ draft, compact = false }: Props) {
  const p = draft.product || {};
  const cover: string | undefined =
    p.cover_image_url ||
    (Array.isArray(p.gallery) && p.gallery[0]?.url) ||
    undefined;
  const currency = draft.currency || p.currency || "BRL";
  const total = (draft.amount_cents ?? 0) / 100;
  const balance = (draft.balance_cents ?? 0) / 100;
  const pax = draft.pax || 1;

  return (
    <motion.aside
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={
        compact
          ? "rounded-2xl overflow-hidden border border-border bg-card shadow-sm"
          : "rounded-2xl overflow-hidden border border-border bg-card shadow-lg shadow-black/5 sticky top-24"
      }
    >
      {/* Hero image */}
      <div className={compact ? "relative h-32" : "relative h-56"}>
        {cover ? (
          <img
            src={cover}
            alt={p.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/30 to-emerald-700/40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/90 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
          <Sparkles className="w-3 h-3 text-amber-300" /> Sua reserva
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/70 mb-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {[p.destination, p.destination_country].filter(Boolean).join(" · ")}
          </div>
          <div className="font-serif text-lg leading-tight line-clamp-2">{p.title}</div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          {p.departure_date && (
            <div className="rounded-lg bg-muted/50 p-2">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Ida</div>
              <div className="font-semibold">{fmt(p.departure_date)}</div>
            </div>
          )}
          {p.return_date && (
            <div className="rounded-lg bg-muted/50 p-2">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Volta</div>
              <div className="font-semibold">{fmt(p.return_date)}</div>
            </div>
          )}
        </div>

        <ul className="space-y-1.5 text-[12px]">
          {p.airline && (
            <li className="flex items-center gap-2 text-muted-foreground">
              <Plane className="w-3.5 h-3.5 shrink-0" /> <span className="truncate text-foreground">{p.airline}</span>
            </li>
          )}
          {p.hotel_name && (
            <li className="flex items-center gap-2 text-muted-foreground">
              <Hotel className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate text-foreground">{p.hotel_name}</span>
              {p.hotel_stars ? (
                <span className="flex shrink-0">
                  {Array.from({ length: p.hotel_stars }).map((_, i) => (
                    <Star key={i} className="w-3 h-3 text-amber-500 fill-amber-500" />
                  ))}
                </span>
              ) : null}
            </li>
          )}
          {pax > 0 && (
            <li className="flex items-center gap-2 text-muted-foreground">
              <span className="w-3.5 h-3.5 inline-flex items-center justify-center text-[10px] font-bold rounded bg-muted text-foreground">{pax}</span>
              <span>{pax === 1 ? "passageiro" : "passageiros"}</span>
            </li>
          )}
        </ul>

        {total > 0 && (
          <div className="border-t border-border pt-3">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {draft.is_entry_only ? "Entrada agora" : "Total"}
                </div>
                <div className="text-2xl font-bold tabular-nums leading-none mt-0.5">
                  {formatMoneyBR(total, currency)}
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" /> Garantido
              </div>
            </div>
            {draft.is_entry_only && balance > 0 && (
              <div className="text-[11px] text-muted-foreground mt-1">
                Saldo combinado depois: <span className="font-semibold text-foreground">{formatMoneyBR(balance, currency)}</span>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-border pt-3 space-y-1.5 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5"><Lock className="w-3 h-3 text-emerald-600" /> Pagamento criptografado · InfinitePay</div>
          <div className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-emerald-600" /> Reserva confirmada por escrito em até 24h</div>
        </div>
      </div>
    </motion.aside>
  );
}
