import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Download, Calendar, Clock, MapPin } from "lucide-react";

interface ExperienceBlockProps {
  service: {
    id?: string;
    description?: string;
    category?: string;
    product_type?: string;
    reservation_code?: string;
    date?: string;
    time?: string;
    duration?: string;
    location?: string;
    notes?: string;
    voucher_url?: string;
    included?: string;
    provider?: string;
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

export default function ExperienceBlock({ service: s, index = 0 }: ExperienceBlockProps) {
  const [open, setOpen] = useState(false);
  const cat = s.product_type || s.category || "";
  const emoji = getEmoji(cat);

  const hasDetails = s.date || s.time || s.duration || s.location || s.notes || s.voucher_url || s.included || s.provider;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.03 + index * 0.04 }}
      className="rounded-2xl border border-border/40 hover:border-accent/20 hover:shadow-md hover:shadow-accent/5 transition-all bg-card cursor-pointer overflow-hidden"
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center gap-4 p-4">
        <span className="text-2xl group-hover:scale-110 transition-transform flex-shrink-0">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{s.description || s.category}</p>
          {s.reservation_code && <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Cód: {s.reservation_code}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-muted-foreground font-medium bg-muted/40 px-2.5 py-1 rounded-full hidden sm:inline">{cat}</span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground/40 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
        </div>
      </div>

      {/* Expandable details */}
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
            <div className="px-4 pb-4 pt-1 border-t border-border/30">
              {hasDetails ? (
                <>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {s.date && (
                      <DetailItem icon={<Calendar className="h-3.5 w-3.5" />} label="Data" value={new Date(s.date + "T00:00:00").toLocaleDateString("pt-BR")} />
                    )}
                    {s.time && (
                      <DetailItem icon={<Clock className="h-3.5 w-3.5" />} label="Horário" value={s.time} />
                    )}
                    {s.duration && (
                      <DetailItem icon={<Clock className="h-3.5 w-3.5" />} label="Duração" value={s.duration} />
                    )}
                    {s.location && (
                      <DetailItem icon={<MapPin className="h-3.5 w-3.5" />} label="Local" value={s.location} />
                    )}
                    {s.provider && (
                      <DetailItem icon={<MapPin className="h-3.5 w-3.5" />} label="Fornecedor" value={s.provider} />
                    )}
                  </div>

                  {s.included && (
                    <div className="mt-3">
                      <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-1">Incluso</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{s.included}</p>
                    </div>
                  )}

                  {s.notes && (
                    <p className="text-xs text-muted-foreground italic mt-3 leading-relaxed">{s.notes}</p>
                  )}

                  <div className="flex flex-wrap gap-2 mt-4">
                    {s.voucher_url && (
                      <a
                        href={s.voucher_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs font-semibold text-accent hover:text-accent/80 bg-accent/5 hover:bg-accent/10 px-4 py-2.5 rounded-xl transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" /> Voucher
                      </a>
                    )}
                    {!s.voucher_url && (
                      <p className="text-xs text-muted-foreground/50 italic">Detalhes serão atualizados em breve</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground/50 italic mt-3">Detalhes serão atualizados pela equipe NatLeva</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground/50 mt-0.5">{icon}</span>
      <div>
        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
      </div>
    </div>
  );
}
