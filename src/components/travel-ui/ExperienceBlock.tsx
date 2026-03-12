import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Download, Calendar, Clock, MapPin, Users, Info, ExternalLink, Tag } from "lucide-react";

interface ExperienceBlockProps {
  service: {
    id?: string;
    description?: string;
    category?: string;
    product_type?: string;
    reservation_code?: string;
    date?: string;
    time?: string;
    end_time?: string;
    duration?: string;
    location?: string;
    meeting_point?: string;
    notes?: string;
    voucher_url?: string;
    included?: string;
    not_included?: string;
    provider?: string;
    provider_phone?: string;
    participants?: string;
    cancellation_policy?: string;
    important_info?: string;
    booking_url?: string;
  };
  index?: number;
}

function getEmoji(category: string) {
  const c = category.toLowerCase();
  if (c.includes("transfer") || c.includes("transporte")) return "🚙";
  if (c.includes("seguro")) return "🛡";
  if (c.includes("passeio") || c.includes("experiencia") || c.includes("experiência")) return "🏔";
  if (c.includes("ingresso") || c.includes("parque")) return "🎢";
  if (c.includes("gastronomia") || c.includes("restaurante") || c.includes("jantar")) return "🍽";
  if (c.includes("mergulho") || c.includes("aqua")) return "🤿";
  if (c.includes("foto")) return "📸";
  if (c.includes("carro") || c.includes("aluguel")) return "🚗";
  if (c.includes("chip")) return "📱";
  return "⭐";
}

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
};

export default function ExperienceBlock({ service: s, index = 0 }: ExperienceBlockProps) {
  const [open, setOpen] = useState(false);
  const cat = s.product_type || s.category || "";
  const emoji = getEmoji(cat);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.03 + index * 0.04 }}
      className="rounded-2xl border border-border/40 hover:border-accent/20 hover:shadow-md hover:shadow-accent/5 transition-all bg-card cursor-pointer overflow-hidden"
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center gap-4 p-4">
        <span className="text-2xl flex-shrink-0">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{s.description || s.category}</p>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-0.5">
            {s.reservation_code && <p className="text-[10px] text-muted-foreground font-mono">Cód: {s.reservation_code}</p>}
            {s.date && <p className="text-[10px] text-muted-foreground">{fmtDate(s.date)}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-muted-foreground font-medium bg-muted/40 px-2.5 py-1 rounded-full hidden sm:inline">{cat}</span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground/40 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 pb-4 border-t border-border/30">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-4">
                {s.date && <DetailItem label="Data" value={fmtDate(s.date)} />}
                {s.time && <DetailItem label="Horário" value={`${s.time}${s.end_time ? ` · ${s.end_time}` : ""}`} />}
                {s.duration && <DetailItem label="Duração" value={s.duration} />}
                {s.location && <DetailItem label="Local" value={s.location} />}
                {s.meeting_point && <DetailItem label="Ponto de encontro" value={s.meeting_point} />}
                {s.provider && <DetailItem label="Fornecedor" value={s.provider} />}
                {s.provider_phone && <DetailItem label="Telefone" value={s.provider_phone} />}
                {s.participants && <DetailItem label="Participantes" value={s.participants} />}
                {s.reservation_code && <DetailItem label="Código de reserva" value={s.reservation_code} />}
              </div>

              {s.included && (
                <div className="mt-3">
                  <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.15em] mb-1">O que está incluso</p>
                  <p className="text-xs text-foreground leading-relaxed">{s.included}</p>
                </div>
              )}

              {s.not_included && (
                <div className="mt-3">
                  <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.15em] mb-1">Não incluso</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.not_included}</p>
                </div>
              )}

              {s.important_info && (
                <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5">
                  <Info className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-foreground/80 leading-relaxed">{s.important_info}</p>
                </div>
              )}

              {s.notes && !s.important_info && (
                <p className="text-xs text-muted-foreground italic mt-3 leading-relaxed">{s.notes}</p>
              )}

              {s.cancellation_policy && (
                <div className="mt-3">
                  <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.15em] mb-1">Política de cancelamento</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.cancellation_policy}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border/20">
                {s.voucher_url && (
                  <ActionLink href={s.voucher_url} icon={<Download className="h-3.5 w-3.5" />} label="Voucher" />
                )}
                {s.booking_url && (
                  <ActionLink href={s.booking_url} icon={<ExternalLink className="h-3.5 w-3.5" />} label="Ver detalhes" />
                )}
                {!s.voucher_url && !s.booking_url && (
                  <p className="text-xs text-muted-foreground/40 italic flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" />
                    Detalhes serão atualizados pela equipe NatLeva
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.15em] mb-0.5">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function ActionLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-xs font-semibold text-accent hover:text-accent/80 bg-accent/5 hover:bg-accent/10 px-4 py-2.5 rounded-xl transition-colors"
    >
      {icon} {label}
    </a>
  );
}
