import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Ship, Anchor, Waves, CheckCircle2, XCircle } from "lucide-react";

interface ItineraryDay {
  day?: number;
  date?: string;
  port?: string;
  country?: string;
  arrival_time?: string;
  departure_time?: string;
  is_sea_day?: boolean;
  description?: string;
}

interface Props {
  data: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

const CABIN_CATEGORIES = ["Interna", "Externa", "Balcony", "Varanda", "Suíte", "Suíte Premium", "Yacht Club", "The Haven", "Concierge", "Outra"];

export default function CruiseQuickFields({ data, onChange }: Props) {
  const itinerary: ItineraryDay[] = Array.isArray(data.itinerary) ? data.itinerary : [];

  const updateDay = (i: number, key: keyof ItineraryDay, value: any) => {
    const next = itinerary.map((d, idx) => (idx === i ? { ...d, [key]: value } : d));
    onChange("itinerary", next);
  };

  const addDay = () => {
    const nextDay = itinerary.length + 1;
    onChange("itinerary", [...itinerary, { day: nextDay, port: "", arrival_time: "", departure_time: "" }]);
  };

  const removeDay = (i: number) => {
    onChange("itinerary", itinerary.filter((_, idx) => idx !== i).map((d, idx) => ({ ...d, day: idx + 1 })));
  };

  // Section helper for visual grouping
  const Section = ({ title, icon: Icon, children }: { title: string; icon?: any; children: React.ReactNode }) => (
    <div className="rounded-xl border border-border/50 bg-background/60 p-3 sm:p-4 space-y-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-3 sm:space-y-4 rounded-xl border border-border/50 bg-muted/10 p-3 sm:p-4">
      {/* ─── Identidade do navio ─── */}
      <Section title="Navio & Roteiro" icon={Ship}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="space-y-1.5 min-w-0">
            <Label className="text-xs">Companhia</Label>
            <Input value={data.cruise_line || ""} onChange={(e) => onChange("cruise_line", e.target.value)} placeholder="MSC, Costa, NCL..." className="w-full" />
          </div>
          <div className="space-y-1.5 min-w-0">
            <Label className="text-xs">Navio</Label>
            <Input value={data.ship_name || ""} onChange={(e) => onChange("ship_name", e.target.value)} placeholder="MSC Seaside" className="w-full" />
          </div>
          <div className="space-y-1.5 min-w-0">
            <Label className="text-xs">Região</Label>
            <Input value={data.region || ""} onChange={(e) => onChange("region", e.target.value)} placeholder="Caribe, Mediterrâneo..." className="w-full" />
          </div>
        </div>
      </Section>

      {/* ─── Embarque & noites ─── */}
      <Section title="Embarque" icon={Anchor}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5 min-w-0">
            <Label className="text-xs">Porto de embarque</Label>
            <Input value={data.embark_port || ""} onChange={(e) => onChange("embark_port", e.target.value)} placeholder="Santos" className="w-full" />
          </div>
          <div className="space-y-1.5 min-w-0">
            <Label className="text-xs">Porto de desembarque</Label>
            <Input value={data.disembark_port || ""} onChange={(e) => onChange("disembark_port", e.target.value)} placeholder="Santos" className="w-full" />
          </div>
          <div className="space-y-1.5 min-w-0">
            <Label className="text-xs">Data de embarque</Label>
            <Input type="date" value={data.embark_date || ""} onChange={(e) => onChange("embark_date", e.target.value)} className="w-full" />
          </div>
          <div className="space-y-1.5 min-w-0">
            <Label className="text-xs">Noites a bordo</Label>
            <Input type="number" min={1} value={data.nights || ""} onChange={(e) => onChange("nights", Number(e.target.value) || undefined)} placeholder="7" className="w-full" />
          </div>
        </div>
      </Section>

      {/* ─── Cabine ─── */}
      <Section title="Cabine & Regime">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5 min-w-0">
            <Label className="text-xs">Categoria</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={data.cabin_category || ""}
              onChange={(e) => onChange("cabin_category", e.target.value)}
            >
              <option value="">Selecione...</option>
              {CABIN_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 min-w-0">
            <Label className="text-xs">Nome / Tipo da cabine</Label>
            <Input value={data.cabin_type || ""} onChange={(e) => onChange("cabin_type", e.target.value)} placeholder="Balcony Aurea" className="w-full" />
          </div>
          <div className="space-y-1.5 min-w-0">
            <Label className="text-xs">Regime de bordo</Label>
            <Input value={data.meal_plan || ""} onChange={(e) => onChange("meal_plan", e.target.value)} placeholder="Pensão completa" className="w-full" />
          </div>
        </div>
      </Section>

      {/* ─── Itinerário dia-a-dia ─── */}
      <Section title={`Itinerário · ${itinerary.length} dia${itinerary.length === 1 ? "" : "s"}`} icon={Anchor}>
        <div className="flex justify-end -mt-2">
          <Button size="sm" variant="outline" onClick={addDay} className="h-8 gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Adicionar dia
          </Button>
        </div>

        {itinerary.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4 bg-muted/30 rounded-lg border border-dashed border-border/50">
            Nenhum dia cadastrado · use o extrator de IA acima ou adicione manualmente
          </p>
        ) : (
          <div className="space-y-2.5">
            {itinerary.map((day, i) => (
              <div key={i} className="rounded-lg border border-border/50 bg-background p-3 space-y-2.5">
                {/* Linha 1: número + porto + mar + remover */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {day.day || i + 1}
                  </div>
                  <Input
                    value={day.port || ""}
                    onChange={(e) => updateDay(i, "port", e.target.value)}
                    placeholder={day.is_sea_day ? "Dia no Mar" : "Porto / Cidade"}
                    className="h-9 text-sm flex-1 min-w-0"
                  />
                  <label className="flex items-center gap-1 text-[11px] text-muted-foreground whitespace-nowrap shrink-0 cursor-pointer px-2 py-1 rounded-md hover:bg-muted/50">
                    <input
                      type="checkbox"
                      checked={!!day.is_sea_day}
                      onChange={(e) => updateDay(i, "is_sea_day", e.target.checked)}
                      className="w-3.5 h-3.5"
                    />
                    <Waves className="w-3 h-3" /> Mar
                  </label>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeDay(i)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Linha 2: data + país (sempre 2 colunas) */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1 min-w-0">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Data</Label>
                    <Input type="date" value={day.date || ""} onChange={(e) => updateDay(i, "date", e.target.value)} className="h-8 text-xs w-full" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">País</Label>
                    <Input value={day.country || ""} onChange={(e) => updateDay(i, "country", e.target.value)} placeholder="País" className="h-8 text-xs w-full" />
                  </div>
                </div>

                {/* Linha 3: chegada + saída (apenas se não for dia no mar) */}
                {!day.is_sea_day && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1 min-w-0">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Chegada</Label>
                      <Input type="time" value={day.arrival_time || ""} onChange={(e) => updateDay(i, "arrival_time", e.target.value)} className="h-8 text-xs w-full" />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Saída</Label>
                      <Input type="time" value={day.departure_time || ""} onChange={(e) => updateDay(i, "departure_time", e.target.value)} className="h-8 text-xs w-full" />
                    </div>
                  </div>
                )}

                {/* Linha 4: descrição */}
                <Textarea
                  rows={2}
                  value={day.description || ""}
                  onChange={(e) => updateDay(i, "description", e.target.value)}
                  placeholder="Destaques do dia, excursões sugeridas..."
                  className="text-xs min-h-[44px] resize-y"
                />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ─── Includes / Excludes ─── */}
      <Section title="O que está incluso">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5 min-w-0">
            <Label className="text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Inclusos (um por linha)
            </Label>
            <Textarea
              rows={5}
              value={Array.isArray(data.includes) ? data.includes.join("\n") : (data.includes || "")}
              onChange={(e) => onChange("includes", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
              placeholder={"Pensão completa\nBebidas inclusas\nGorjetas\nTaxas portuárias"}
              className="text-xs resize-y"
            />
          </div>
          <div className="space-y-1.5 min-w-0">
            <Label className="text-xs flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-rose-500" /> Não inclusos (um por linha)
            </Label>
            <Textarea
              rows={5}
              value={Array.isArray(data.excludes) ? data.excludes.join("\n") : (data.excludes || "")}
              onChange={(e) => onChange("excludes", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
              placeholder={"Excursões em terra\nBebidas premium\nSpa"}
              className="text-xs resize-y"
            />
          </div>
        </div>
      </Section>
    </div>
  );
}
