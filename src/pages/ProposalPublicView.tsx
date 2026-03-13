import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Plane, MapPin, Hotel, Sparkles, Star, CheckCircle, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import logoNatleva from "@/assets/logo-natleva-clean.png";

const fallbackCover = "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1920&h=1080&fit=crop&q=80";

const destinationImages: Record<string, string> = {
  roma: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=600&fit=crop&q=80",
  florença: "https://images.unsplash.com/photo-1543429776-2782fc8e117a?w=800&h=600&fit=crop&q=80",
  veneza: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&h=600&fit=crop&q=80",
  paris: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=600&fit=crop&q=80",
  londres: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop&q=80",
  dubai: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=600&fit=crop&q=80",
  miami: "https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=800&h=600&fit=crop&q=80",
  orlando: "https://images.unsplash.com/photo-1575089976121-8ed7b2a54265?w=800&h=600&fit=crop&q=80",
};

function getDestImage(name: string, fallback?: string) {
  const key = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return destinationImages[key] || fallback || `https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&h=600&fit=crop&q=80`;
}

function fmtCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function fmtDate(d: string) {
  return format(new Date(d + "T00:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export default function ProposalPublicView() {
  const { slug } = useParams();
  const [proposal, setProposal] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("slug", slug)
        .single();
      if (error || !data) { setNotFound(true); setLoading(false); return; }
      setProposal(data);

      const { data: itemsData } = await supabase
        .from("proposal_items")
        .select("*")
        .eq("proposal_id", data.id)
        .order("position");
      setItems(itemsData || []);
      setLoading(false);

      // Track view
      await supabase.from("proposal_views").insert({
        proposal_id: data.id,
        device_type: /Mobi/i.test(navigator.userAgent) ? "mobile" : "desktop",
        user_agent: navigator.userAgent.slice(0, 200),
      });
      await supabase.from("proposals").update({ views_count: (data.views_count || 0) + 1, last_viewed_at: new Date().toISOString() }).eq("id", data.id);
    })();

    return () => {
      // Track duration on unmount
      if (proposal?.id) {
        const duration = Math.round((Date.now() - startTime) / 1000);
        supabase.from("proposal_views").update({ duration_seconds: duration }).eq("proposal_id", proposal.id).order("viewed_at", { ascending: false }).limit(1);
      }
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando proposta...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-2xl font-serif text-foreground mb-2">Proposta não encontrada</p>
          <p className="text-muted-foreground">O link pode estar incorreto ou a proposta foi removida.</p>
        </div>
      </div>
    );
  }

  const destinations = items.filter((i) => i.item_type === "destination");
  const flights = items.filter((i) => i.item_type === "flight");
  const hotels = items.filter((i) => i.item_type === "hotel");
  const experiences = items.filter((i) => i.item_type === "experience");
  const paymentConditions = (proposal.payment_conditions as any[]) || [];

  const dateRange =
    proposal.travel_start_date && proposal.travel_end_date
      ? `${format(new Date(proposal.travel_start_date + "T00:00:00"), "dd", { locale: ptBR })} — ${format(new Date(proposal.travel_end_date + "T00:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`
      : proposal.travel_start_date
        ? fmtDate(proposal.travel_start_date)
        : "";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* HERO COVER */}
      <section className="relative h-screen flex items-end justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${proposal.cover_image_url || fallbackCover})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="relative z-10 text-center text-white pb-20 px-6 max-w-3xl"
        >
          {proposal.client_name && (
            <p className="text-sm tracking-[0.3em] uppercase opacity-70 mb-4">{proposal.client_name}</p>
          )}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold leading-tight mb-4">{proposal.title}</h1>
          {dateRange && <p className="text-lg opacity-80 font-light">{dateRange}</p>}
          <p className="text-xs tracking-[0.2em] uppercase opacity-50 mt-8">Preparado por NatLeva Viagens</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        >
          <ChevronDown className="w-6 h-6 text-white/50 animate-bounce" />
        </motion.div>
      </section>

      {/* INTRO */}
      {proposal.intro_text && (
        <section className="max-w-3xl mx-auto py-20 px-6">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-lg sm:text-xl leading-relaxed text-muted-foreground text-center font-light italic"
          >
            "{proposal.intro_text}"
          </motion.p>
        </section>
      )}

      {/* DESTINATIONS */}
      {(destinations.length > 0 || (proposal.destinations?.length > 0 && destinations.length === 0)) && (
        <section className="py-16 px-6">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-3xl font-serif text-center mb-12"
          >
            Seus Destinos
          </motion.h2>
          <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(destinations.length > 0 ? destinations : proposal.destinations.map((d: string, i: number) => ({ title: d, image_url: null, description: null, id: i }))).map((dest: any, idx: number) => (
              <motion.div
                key={dest.id || idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="group rounded-2xl overflow-hidden relative h-72"
              >
                <img
                  src={dest.image_url || getDestImage(dest.title || "")}
                  alt={dest.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-xl font-serif font-bold text-white">{dest.title}</h3>
                  {dest.description && <p className="text-sm text-white/70 mt-1">{dest.description}</p>}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* FLIGHTS */}
      {flights.length > 0 && (
        <section className="py-16 px-6 bg-muted/30">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-3xl font-serif text-center mb-12">
            Voos
          </motion.h2>
          <div className="max-w-4xl mx-auto space-y-4">
            {flights.map((f, idx) => (
              <motion.div
                key={f.id || idx}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="rounded-2xl bg-card border border-border/40 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Plane className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{f.title || "Voo"}</p>
                  {f.data?.airline && <p className="text-sm text-muted-foreground">{f.data.airline} {f.data.flight_number && `· ${f.data.flight_number}`}</p>}
                  <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm">
                    {f.data?.origin && f.data?.destination && (
                      <span className="text-foreground font-medium">{f.data.origin} → {f.data.destination}</span>
                    )}
                    {f.data?.departure && (
                      <span className="text-muted-foreground">
                        {format(new Date(f.data.departure), "dd MMM · HH:mm", { locale: ptBR })}
                      </span>
                    )}
                    {f.data?.baggage && <span className="text-muted-foreground">🧳 {f.data.baggage}</span>}
                  </div>
                  {f.description && <p className="text-sm text-muted-foreground mt-2">{f.description}</p>}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* HOTELS */}
      {hotels.length > 0 && (
        <section className="py-16 px-6">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-3xl font-serif text-center mb-12">
            Hospedagens
          </motion.h2>
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {hotels.map((h, idx) => (
              <motion.div
                key={h.id || idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="rounded-2xl overflow-hidden border border-border/40 bg-card"
              >
                <div className="h-48 overflow-hidden">
                  <img
                    src={h.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop&q=80"}
                    alt={h.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-lg text-foreground">{h.title || "Hotel"}</h3>
                    {h.data?.stars && (
                      <div className="flex gap-0.5">
                        {Array.from({ length: parseInt(h.data.stars) || 0 }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        ))}
                      </div>
                    )}
                  </div>
                  {h.data?.location && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5" /> {h.data.location}
                    </p>
                  )}
                  {h.description && <p className="text-sm text-muted-foreground mt-3">{h.description}</p>}
                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                    {h.data?.room_type && <span className="bg-muted px-2.5 py-1 rounded-full">{h.data.room_type}</span>}
                    {h.data?.meal_plan && <span className="bg-muted px-2.5 py-1 rounded-full">{h.data.meal_plan}</span>}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* EXPERIENCES */}
      {experiences.length > 0 && (
        <section className="py-16 px-6 bg-muted/30">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-3xl font-serif text-center mb-12">
            Experiências Incluídas
          </motion.h2>
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {experiences.map((exp, idx) => (
              <motion.div
                key={exp.id || idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="rounded-2xl overflow-hidden border border-border/40 bg-card"
              >
                {exp.image_url && (
                  <div className="h-40 overflow-hidden">
                    <img src={exp.image_url} alt={exp.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-foreground">{exp.title}</h3>
                  </div>
                  {exp.description && <p className="text-sm text-muted-foreground">{exp.description}</p>}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* FINANCIAL SUMMARY */}
      {(proposal.total_value || proposal.value_per_person) && (
        <section className="py-16 px-6">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-3xl font-serif text-center mb-12">
            Investimento
          </motion.h2>
          <div className="max-w-2xl mx-auto">
            <div className="rounded-2xl border border-border/40 bg-card p-8 text-center space-y-6">
              {proposal.value_per_person && (
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Valor por pessoa</p>
                  <p className="text-3xl font-serif font-bold text-foreground">{fmtCurrency(proposal.value_per_person)}</p>
                </div>
              )}
              {proposal.total_value && (
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Valor total da viagem</p>
                  <p className="text-4xl font-serif font-bold text-primary">{fmtCurrency(proposal.total_value)}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* PAYMENT CONDITIONS */}
      {paymentConditions.length > 0 && (
        <section className="py-16 px-6 bg-muted/30">
          <motion.h2 initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-3xl font-serif text-center mb-12">
            Condições de Pagamento
          </motion.h2>
          <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
            {paymentConditions.map((pc: any, idx: number) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="rounded-xl border border-border/40 bg-card p-5 text-center"
              >
                <p className="font-semibold text-foreground">{pc.method}</p>
                {pc.details && <p className="text-sm text-muted-foreground mt-1">{pc.details}</p>}
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="text-3xl font-serif mb-4">Pronto para viver essa experiência?</h2>
          <p className="text-muted-foreground mb-8">Entre em contato e garanta sua reserva</p>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Olá! Gostaria de reservar a viagem "${proposal.title}". Proposta: ${window.location.href}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-full text-lg font-semibold hover:bg-primary/90 transition-colors shadow-lg"
          >
            <CheckCircle className="w-5 h-5" />
            Quero reservar esta viagem
          </a>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-6 border-t border-border/30 text-center">
        <img src={logoNatleva} alt="NatLeva Viagens" className="h-8 mx-auto opacity-50 mb-3" />
        <p className="text-xs text-muted-foreground/50">
          Proposta exclusiva · {proposal.consultant_name && `Preparada por ${proposal.consultant_name}`}
        </p>
      </footer>
    </div>
  );
}
