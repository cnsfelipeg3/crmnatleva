import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import PortalLayout from "@/components/portal/PortalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plane, MapPin, CalendarDays, Users, Sparkles, Hotel, Shield, Car,
  ChevronRight, ChevronLeft, Check, Plus, Trash2, Send, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getProductLabel } from "@/lib/productTypes";

const STEPS = [
  { id: 0, label: "Destino", icon: MapPin },
  { id: 1, label: "Datas", icon: CalendarDays },
  { id: 2, label: "Viajantes", icon: Users },
  { id: 3, label: "Detalhes", icon: Sparkles },
  { id: 4, label: "Enviar", icon: Send },
];

const CABIN_OPTIONS = [
  { value: "economy", label: "Econômica", emoji: "💺" },
  { value: "premium_economy", label: "Premium Economy", emoji: "✨" },
  { value: "business", label: "Executiva", emoji: "🥂" },
  { value: "first", label: "Primeira Classe", emoji: "👑" },
];

const BUDGET_OPTIONS = [
  { value: "ate_5k", label: "Até R$ 5.000", color: "from-emerald-500/20 to-emerald-600/10" },
  { value: "5k_10k", label: "R$ 5.000 – 10.000", color: "from-blue-500/20 to-blue-600/10" },
  { value: "10k_20k", label: "R$ 10.000 – 20.000", color: "from-violet-500/20 to-violet-600/10" },
  { value: "20k_50k", label: "R$ 20.000 – 50.000", color: "from-amber-500/20 to-amber-600/10" },
  { value: "acima_50k", label: "Acima de R$ 50.000", color: "from-rose-500/20 to-rose-600/10" },
  { value: "aberto", label: "Orçamento aberto", color: "from-primary/20 to-accent/10" },
];

export default function PortalNewQuote() {
  const { user, portalAccess } = usePortalAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [originCity, setOriginCity] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [tripType, setTripType] = useState<"roundtrip" | "oneway" | "multicity">("roundtrip");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [travelerNames, setTravelerNames] = useState<string[]>([""]);
  const [cabinClass, setCabinClass] = useState("economy");
  const [hotelNeeded, setHotelNeeded] = useState(false);
  const [hotelPreferences, setHotelPreferences] = useState("");
  const [transferNeeded, setTransferNeeded] = useState(false);
  const [insuranceNeeded, setInsuranceNeeded] = useState(false);
  const [budgetRange, setBudgetRange] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  const totalPax = adults + children + infants;

  const updateTravelerCount = (newTotal: number) => {
    setTravelerNames((prev) => {
      if (newTotal > prev.length) return [...prev, ...Array(newTotal - prev.length).fill("")];
      return prev.slice(0, Math.max(1, newTotal));
    });
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from("portal_quote_requests").insert({
        portal_user_id: user.id,
        client_id: portalAccess?.client_id && portalAccess.client_id !== "admin" ? portalAccess.client_id : null,
        origin_city: originCity,
        destination_city: destinationCity,
        trip_type: tripType,
        departure_date: departureDate || null,
        return_date: returnDate || null,
        flexible_dates: flexibleDates,
        adults,
        children,
        infants,
        cabin_class: cabinClass,
        hotel_needed: hotelNeeded,
        hotel_preferences: hotelPreferences || null,
        transfer_needed: transferNeeded,
        insurance_needed: insuranceNeeded,
        budget_range: budgetRange || null,
        special_requests: specialRequests || null,
        traveler_names: travelerNames.filter((n) => n.trim()),
      });
      if (error) throw error;
      setSubmitted(true);
      toast({ title: "Solicitação enviada! ✈️", description: "Nossa equipe entrará em contato em breve." });
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const canAdvance = () => {
    if (step === 0) return destinationCity.trim().length >= 2;
    if (step === 1) return departureDate || flexibleDates;
    if (step === 2) return adults >= 1;
    return true;
  };

  if (submitted) {
    return (
      <PortalLayout>
        <div className="min-h-[70vh] flex items-center justify-center px-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.4 }}
            className="text-center max-w-md"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
              className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center"
            >
              <Check className="w-12 h-12 text-accent" />
            </motion.div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Solicitação Enviada!</h1>
            <p className="text-muted-foreground mb-8">
              Recebemos seu pedido de cotação para <strong className="text-foreground">{destinationCity}</strong>.
              Nossa equipe entrará em contato em breve com as melhores opções.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => navigate("/portal")} variant="outline" className="gap-2">
                <ChevronLeft className="w-4 h-4" /> Voltar ao Portal
              </Button>
              <Button
                onClick={() => { setSubmitted(false); setStep(0); setDestinationCity(""); setOriginCity(""); setDepartureDate(""); setReturnDate(""); }}
                className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <Plus className="w-4 h-4" /> Nova Cotação
              </Button>
            </div>
          </motion.div>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-semibold mb-4">
            <Plane className="w-3.5 h-3.5" /> Solicitar Cotação
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Para onde vamos?</h1>
          <p className="text-muted-foreground mt-1 text-sm">Preencha as informações e receba uma proposta personalizada.</p>
        </motion.div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1">
              <button
                onClick={() => i <= step && setStep(i)}
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center transition-all text-xs font-bold",
                  i < step && "bg-accent text-accent-foreground",
                  i === step && "bg-accent/20 text-accent ring-2 ring-accent/40",
                  i > step && "bg-muted text-muted-foreground"
                )}
              >
                {i < step ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
              </button>
              {i < STEPS.length - 1 && (
                <div className={cn("w-6 h-0.5 rounded-full transition-all", i < step ? "bg-accent" : "bg-border")} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-sm"
          >
            {/* STEP 0 — Destination */}
            {step === 0 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-accent" /> Origem e Destino
                </h2>

                {/* Trip Type */}
                <div className="flex gap-2">
                  {(["roundtrip", "oneway", "multicity"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTripType(t)}
                      className={cn(
                        "flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all border",
                        tripType === t
                          ? "bg-accent/10 border-accent text-accent"
                          : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {t === "roundtrip" ? "Ida e Volta" : t === "oneway" ? "Somente Ida" : "Múltiplos Destinos"}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Cidade de Origem</label>
                    <Input
                      value={originCity}
                      onChange={(e) => setOriginCity(e.target.value)}
                      placeholder="Ex: São Paulo"
                      className="h-12 text-base"
                    />
                  </div>
                  <div className="flex justify-center">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <ArrowRight className="w-4 h-4 text-accent rotate-90" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Destino desejado</label>
                    <Input
                      value={destinationCity}
                      onChange={(e) => setDestinationCity(e.target.value)}
                      placeholder="Ex: Paris, Maldivas, Orlando..."
                      className="h-12 text-base"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 1 — Dates */}
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-accent" /> Quando você quer viajar?
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Data de ida</label>
                    <Input
                      type="date"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      className="h-12"
                      disabled={flexibleDates}
                    />
                  </div>
                  {tripType === "roundtrip" && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Data de volta</label>
                      <Input
                        type="date"
                        value={returnDate}
                        onChange={(e) => setReturnDate(e.target.value)}
                        className="h-12"
                        min={departureDate}
                        disabled={flexibleDates}
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setFlexibleDates(!flexibleDates)}
                  className={cn(
                    "w-full py-3 px-4 rounded-xl border text-sm font-medium transition-all flex items-center gap-3",
                    flexibleDates
                      ? "bg-accent/10 border-accent text-accent"
                      : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                  )}
                >
                  <CalendarDays className="w-4 h-4" />
                  <span>Tenho datas flexíveis</span>
                  <div className={cn("ml-auto w-10 h-5 rounded-full transition-all relative", flexibleDates ? "bg-accent" : "bg-border")}>
                    <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all", flexibleDates ? "left-5" : "left-0.5")} />
                  </div>
                </button>
              </div>
            )}

            {/* STEP 2 — Travelers */}
            {step === 2 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Users className="w-5 h-5 text-accent" /> Quem vai viajar?
                </h2>

                <div className="space-y-3">
                  {[
                    { label: "Adultos", sublabel: "12+ anos", value: adults, set: setAdults, min: 1 },
                    { label: "Crianças", sublabel: "2-11 anos", value: children, set: setChildren, min: 0 },
                    { label: "Bebês", sublabel: "0-1 ano", value: infants, set: setInfants, min: 0 },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between bg-muted/30 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.sublabel}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => { const v = Math.max(item.min, item.value - 1); item.set(v); updateTravelerCount(v + (item.label === "Adultos" ? children : item.label === "Crianças" ? adults : adults + children) + (item.label !== "Bebês" ? infants : 0)); }}
                          disabled={item.value <= item.min}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-foreground hover:bg-muted disabled:opacity-30 transition-all"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-bold text-foreground">{item.value}</span>
                        <button
                          onClick={() => { const v = item.value + 1; item.set(v); }}
                          className="w-8 h-8 rounded-full border border-accent/40 bg-accent/10 flex items-center justify-center text-accent hover:bg-accent/20 transition-all"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Traveler names */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Nomes dos viajantes (opcional)</label>
                  {travelerNames.map((name, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={name}
                        onChange={(e) => {
                          const arr = [...travelerNames];
                          arr[i] = e.target.value;
                          setTravelerNames(arr);
                        }}
                        placeholder={`Viajante ${i + 1}`}
                        className="h-10"
                      />
                      {travelerNames.length > 1 && (
                        <button
                          onClick={() => setTravelerNames(travelerNames.filter((_, j) => j !== i))}
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setTravelerNames([...travelerNames, ""])}
                    className="text-xs text-accent hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Adicionar viajante
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 — Details */}
            {step === 3 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" /> Personalize sua viagem
                </h2>

                {/* Cabin class */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Classe do voo</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CABIN_OPTIONS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setCabinClass(c.value)}
                        className={cn(
                          "py-3 px-3 rounded-xl border text-sm font-medium transition-all text-left",
                          cabinClass === c.value
                            ? "bg-accent/10 border-accent text-accent"
                            : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/60"
                        )}
                      >
                        <span className="mr-1">{c.emoji}</span> {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Extras */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Precisa de algo mais?</label>
                  {[
                    { icon: Hotel, label: getProductLabel("hospedagem"),    value: hotelNeeded,     toggle: () => setHotelNeeded(!hotelNeeded) },
                    { icon: Car,   label: getProductLabel("transfer"),       value: transferNeeded,  toggle: () => setTransferNeeded(!transferNeeded) },
                    { icon: Shield,label: getProductLabel("seguro-viagem"),  value: insuranceNeeded, toggle: () => setInsuranceNeeded(!insuranceNeeded) },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={item.toggle}
                      className={cn(
                        "w-full flex items-center gap-3 py-3 px-4 rounded-xl border text-sm font-medium transition-all",
                        item.value
                          ? "bg-accent/10 border-accent text-accent"
                          : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/60"
                      )}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                      <div className={cn("ml-auto w-10 h-5 rounded-full transition-all relative", item.value ? "bg-accent" : "bg-border")}>
                        <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all", item.value ? "left-5" : "left-0.5")} />
                      </div>
                    </button>
                  ))}
                </div>

                {hotelNeeded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Preferências de hospedagem</label>
                    <Textarea
                      value={hotelPreferences}
                      onChange={(e) => setHotelPreferences(e.target.value)}
                      placeholder="Ex: Resort all-inclusive, hotel boutique no centro..."
                      rows={2}
                    />
                  </motion.div>
                )}

                {/* Budget */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Orçamento estimado (por pessoa)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {BUDGET_OPTIONS.map((b) => (
                      <button
                        key={b.value}
                        onClick={() => setBudgetRange(budgetRange === b.value ? "" : b.value)}
                        className={cn(
                          "py-2.5 px-3 rounded-xl border text-xs font-medium transition-all",
                          budgetRange === b.value
                            ? "bg-accent/10 border-accent text-accent"
                            : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/60"
                        )}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Pedidos especiais (opcional)</label>
                  <Textarea
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Aniversário durante a viagem, acessibilidade, lua de mel..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* STEP 4 — Review */}
            {step === 4 && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Send className="w-5 h-5 text-accent" /> Revise sua solicitação
                </h2>

                <div className="space-y-3">
                  {[
                    { label: "Origem", value: originCity || "Não informada" },
                    { label: "Destino", value: destinationCity },
                    { label: "Tipo", value: tripType === "roundtrip" ? "Ida e Volta" : tripType === "oneway" ? "Somente Ida" : "Múltiplos" },
                    { label: "Ida", value: departureDate ? new Date(departureDate + "T12:00:00").toLocaleDateString("pt-BR") : flexibleDates ? "Datas flexíveis" : "—" },
                    ...(tripType === "roundtrip" ? [{ label: "Volta", value: returnDate ? new Date(returnDate + "T12:00:00").toLocaleDateString("pt-BR") : "—" }] : []),
                    { label: "Viajantes", value: `${adults} adulto${adults > 1 ? "s" : ""}${children ? `, ${children} criança${children > 1 ? "s" : ""}` : ""}${infants ? `, ${infants} bebê${infants > 1 ? "s" : ""}` : ""}` },
                    { label: "Classe", value: CABIN_OPTIONS.find((c) => c.value === cabinClass)?.label || cabinClass },
                    ...(hotelNeeded ? [{ label: getProductLabel("hospedagem"), value: "Sim" }] : []),
                    ...(transferNeeded ? [{ label: "Transfer", value: "Sim" }] : []),
                    ...(insuranceNeeded ? [{ label: "Seguro", value: "Sim" }] : []),
                    ...(budgetRange ? [{ label: "Orçamento", value: BUDGET_OPTIONS.find((b) => b.value === budgetRange)?.label || budgetRange }] : []),
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <span className="text-sm font-medium text-foreground">{item.value}</span>
                    </div>
                  ))}
                  {specialRequests && (
                    <div className="pt-2">
                      <span className="text-xs text-muted-foreground">Observações</span>
                      <p className="text-sm text-foreground mt-1">{specialRequests}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => step === 0 ? navigate("/portal") : setStep(step - 1)}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 0 ? "Voltar" : "Anterior"}
          </Button>

          {step < 4 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canAdvance()}
              className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              Próximo <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {submitting ? "Enviando..." : "Enviar Cotação"} <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
