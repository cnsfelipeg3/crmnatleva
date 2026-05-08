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

  return (
    <div className="space-y-4 rounded-xl border border-border/50 bg-muted/10 p-3.5">
      {/* Identidade do navio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1"><Ship className="w-3 h-3" /> Companhia</Label>
          <Input value={data.cruise_line || ""} onChange={(e) => onChange("cruise_line", e.target.value)} placeholder="MSC, Costa, NCL..." />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Navio</Label>
          <Input value={data.ship_name || ""} onChange={(e) => onChange("ship_name", e.target.value)} placeholder="MSC Seaside" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Região do roteiro</Label>
          <Input value={data.region || ""} onChange={(e) => onChange("region", e.target.value)} placeholder="Caribe, Mediterrâneo..." />
        </div>
      </div>

      {/* Embarque & noites */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Embarque</Label>
          <Input value={data.embark_port || ""} onChange={(e) => onChange("embark_port", e.target.value)} placeholder="Santos" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Desembarque</Label>
          <Input value={data.disembark_port || ""} onChange={(e) => onChange("disembark_port", e.target.value)} placeholder="Santos" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Data embarque</Label>
          <Input type="date" value={data.embark_date || ""} onChange={(e) => onChange("embark_date", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Noites</Label>
          <Input type="number" min={1} value={data.nights || ""} onChange={(e) => onChange("nights", Number(e.target.value) || undefined)} />
        </div>
      </div>

      {/* Cabine */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Categoria de cabine</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={data.cabin_category || ""}
            onChange={(e) => onChange("cabin_category", e.target.value)}
          >
            <option value="">Selecione...</option>
            {CABIN_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Nome da cabine</Label>
          <Input value={data.cabin_type || ""} onChange={(e) => onChange("cabin_type", e.target.value)} placeholder="Balcony Aurea" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Regime</Label>
          <Input value={data.meal_plan || ""} onChange={(e) => onChange("meal_plan", e.target.value)} placeholder="Pensão completa" />
        </div>
      </div>

      {/* Itinerário dia-a-dia */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Anchor className="w-3 h-3" /> Itinerário dia-a-dia ({itinerary.length} dia{itinerary.length === 1 ? "" : "s"})
          </Label>
          <Button size="sm" variant="outline" onClick={addDay} className="h-7 gap-1 text-xs">
            <Plus className="w-3 h-3" /> Dia
          </Button>
        </div>

        {itinerary.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3 bg-background rounded-lg border border-dashed border-border/50">
            Nenhum dia cadastrado · use o extrator de IA acima ou adicione manualmente
          </p>
        ) : (
          <div className="space-y-2">
            {itinerary.map((day, i) => (
              <div key={i} className="rounded-lg border border-border/50 bg-background p-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {day.day || i + 1}
                  </div>
                  <Input
                    value={day.port || ""}
                    onChange={(e) => updateDay(i, "port", e.target.value)}
                    placeholder={day.is_sea_day ? "Dia no Mar" : "Porto / Cidade"}
                    className="h-8 text-sm flex-1"
                  />
                  <label className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!day.is_sea_day}
                      onChange={(e) => updateDay(i, "is_sea_day", e.target.checked)}
                      className="w-3 h-3"
                    />
                    <Waves className="w-3 h-3" /> Mar
                  </label>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeDay(i)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Input type="date" value={day.date || ""} onChange={(e) => updateDay(i, "date", e.target.value)} className="h-7 text-xs" />
                  <Input value={day.country || ""} onChange={(e) => updateDay(i, "country", e.target.value)} placeholder="País" className="h-7 text-xs" />
                  {!day.is_sea_day && (
                    <>
                      <Input type="time" value={day.arrival_time || ""} onChange={(e) => updateDay(i, "arrival_time", e.target.value)} placeholder="Chegada" className="h-7 text-xs" />
                      <Input type="time" value={day.departure_time || ""} onChange={(e) => updateDay(i, "departure_time", e.target.value)} placeholder="Saída" className="h-7 text-xs" />
                    </>
                  )}
                </div>
                <Textarea
                  rows={1}
                  value={day.description || ""}
                  onChange={(e) => updateDay(i, "description", e.target.value)}
                  placeholder="Destaques do dia, excursões sugeridas..."
                  className="text-xs min-h-[32px]"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
