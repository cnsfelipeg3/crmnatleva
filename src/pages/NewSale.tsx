import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Check, ChevronLeft, ChevronRight, Upload, Sparkles, Loader2, Plus, Trash2, Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import FlightTimeline, { type FlightSegment } from "@/components/FlightTimeline";
import AirportAutocomplete from "@/components/AirportAutocomplete";
import AirlineAutocomplete from "@/components/AirlineAutocomplete";
import FlightEnrichmentDialog from "@/components/FlightEnrichmentDialog";

const steps = [
  { id: 1, label: "Upload & IA" },
  { id: 2, label: "Dados Básicos" },
  { id: 3, label: "Passageiros" },
  { id: 4, label: "Aéreo" },
  { id: 5, label: "Segmentos de Voo" },
  { id: 6, label: "Hotel" },
  { id: 7, label: "Financeiro" },
  { id: 8, label: "Revisão" },
];

interface ExtractedField {
  value: any;
  confidence: number;
}

interface ExtractionResult {
  fields: Record<string, ExtractedField | ExtractedField[]>;
  raw_text?: string;
  confidence?: number;
  conflicts?: any[];
}

const defaultSegment: FlightSegment = {
  direction: "ida", segment_order: 1, airline: "", flight_number: "",
  origin_iata: "", destination_iata: "", departure_date: "", departure_time: "",
  arrival_time: "", duration_minutes: 0, flight_class: "", cabin_type: "",
  operated_by: "", connection_time_minutes: 0, terminal: "",
};

export default function NewSale() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Upload & extraction
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [textInput, setTextInput] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);

  // Form data
  const [form, setForm] = useState({
    name: "", close_date: "", payment_method: "", observations: "",
    tag_chatguru: "", link_chat: "", adults: 1, children: 0, children_ages: "",
    origin_iata: "", destination_iata: "", departure_date: "", return_date: "",
    airline: "", flight_class: "", locator: "", connections: "", miles_program: "",
    emission_source: "",
    hotel_name: "", hotel_room: "", hotel_meal_plan: "", hotel_reservation_code: "",
    received_value: "", 
    // Cost items
    air_cash: "", air_miles_qty: "", air_miles_price: "", air_taxes: "",
    air_taxes_included: false, air_emission_source: "", air_miles_program: "",
    hotel_cash: "", hotel_miles_qty: "", hotel_miles_price: "", hotel_taxes: "",
    hotel_taxes_included: false, hotel_emission_source: "", hotel_miles_program: "",
  });

  const [segments, setSegments] = useState<FlightSegment[]>([
    { ...defaultSegment, direction: "ida", segment_order: 1 },
  ]);

  const [saving, setSaving] = useState(false);
  const [enrichmentOpen, setEnrichmentOpen] = useState(false);

  const updateForm = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    setFiles(prev => [...prev, ...Array.from(newFiles)]);
  };

  const handleExtract = async () => {
    if (!files.length && !textInput.trim()) {
      toast({ title: "Forneça arquivos ou texto para extrair", variant: "destructive" });
      return;
    }
    setExtracting(true);
    try {
      const images: string[] = [];
      for (const file of files) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        images.push(base64);
      }

      const { data, error } = await supabase.functions.invoke("extract-sale-data", {
        body: { images, text_input: textInput },
      });

      if (error) throw error;
      setExtraction(data as ExtractionResult);

      // Auto-fill form from extraction
      const f = data?.fields;
      if (f) {
        const get = (key: string) => {
          const v = f[key];
          if (!v) return "";
          if (Array.isArray(v)) return v.map((i: any) => i.value).join(", ");
          return v.value?.toString() || "";
        };
        setForm(prev => ({
          ...prev,
          name: get("sale_name") || prev.name,
          origin_iata: get("origin_iata") || prev.origin_iata,
          destination_iata: get("destination_iata") || prev.destination_iata,
          departure_date: get("departure_date") || prev.departure_date,
          return_date: get("return_date") || prev.return_date,
          airline: get("airline") || prev.airline,
          locator: get("locators") || prev.locator,
          flight_class: get("flight_class") || prev.flight_class,
          miles_program: get("miles_program") || prev.miles_program,
          hotel_name: get("hotel_name") || prev.hotel_name,
          hotel_reservation_code: get("hotel_code") || prev.hotel_reservation_code,
          hotel_room: get("hotel_room") || prev.hotel_room,
          hotel_meal_plan: get("hotel_meal_plan") || prev.hotel_meal_plan,
          connections: get("connections") || prev.connections,
          payment_method: get("payment_method") || prev.payment_method,
          observations: get("observations") || prev.observations,
          emission_source: get("emission_source") || prev.emission_source,
          adults: f.adults?.value ? Number(f.adults.value) : prev.adults,
          children: f.children?.value ? Number(f.children.value) : prev.children,
          children_ages: f.children_ages?.value ? (Array.isArray(f.children_ages.value) ? f.children_ages.value.join(", ") : String(f.children_ages.value)) : prev.children_ages,
          received_value: get("received_value") || prev.received_value,
          air_cash: get("air_cash") || get("cash_value") || prev.air_cash,
          air_miles_qty: get("air_miles_qty") || get("miles_quantity") || prev.air_miles_qty,
          air_miles_price: get("air_miles_price") || prev.air_miles_price,
          air_taxes: get("air_taxes") || get("taxes") || prev.air_taxes,
          air_emission_source: get("emission_source") || prev.air_emission_source,
          air_miles_program: get("miles_program") || prev.air_miles_program,
          hotel_cash: get("hotel_cash") || prev.hotel_cash,
          hotel_miles_qty: get("hotel_miles_qty") || prev.hotel_miles_qty,
          hotel_miles_price: get("hotel_miles_price") || prev.hotel_miles_price,
          hotel_taxes: get("hotel_taxes") || prev.hotel_taxes,
        }));

        // Fill flight segments if extracted
        if (f.flight_segments && Array.isArray(f.flight_segments)) {
          const extracted = f.flight_segments.map((s: any, i: number) => ({
            ...defaultSegment,
            direction: s.direction || "ida",
            segment_order: i + 1,
            airline: s.airline || "",
            flight_number: s.flight_number || "",
            origin_iata: s.origin_iata || "",
            destination_iata: s.destination_iata || "",
            departure_date: s.departure_date || "",
            departure_time: s.departure_time || "",
            arrival_time: s.arrival_time || "",
            flight_class: s.class || "",
          }));
          if (extracted.length > 0) setSegments(extracted);
        }
      }

      toast({ title: "Extração concluída!", description: "Campos preenchidos automaticamente." });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro na extração", description: err.message, variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  const addSegment = (direction: "ida" | "volta") => {
    const dirSegs = segments.filter(s => s.direction === direction);
    setSegments(prev => [...prev, { ...defaultSegment, direction, segment_order: dirSegs.length + 1 }]);
  };

  const updateSegment = (index: number, field: string, value: any) => {
    setSegments(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const removeSegment = (index: number) => {
    setSegments(prev => prev.filter((_, i) => i !== index));
  };

  // Cost calculations
  const airMilesCost = (() => {
    const qty = parseFloat(form.air_miles_qty) || 0;
    const price = parseFloat(form.air_miles_price) || 0;
    const taxes = parseFloat(form.air_taxes) || 0;
    return (qty / 1000) * price + (form.air_taxes_included ? 0 : taxes);
  })();
  const airCash = parseFloat(form.air_cash) || 0;
  const airTotal = airCash + airMilesCost;

  const hotelMilesCost = (() => {
    const qty = parseFloat(form.hotel_miles_qty) || 0;
    const price = parseFloat(form.hotel_miles_price) || 0;
    const taxes = parseFloat(form.hotel_taxes) || 0;
    return (qty / 1000) * price + (form.hotel_taxes_included ? 0 : taxes);
  })();
  const hotelCash = parseFloat(form.hotel_cash) || 0;
  const hotelTotal = hotelCash + hotelMilesCost;

  const totalCost = airTotal + hotelTotal;
  const receivedValue = parseFloat(form.received_value) || 0;
  const profit = receivedValue - totalCost;
  const margin = receivedValue > 0 ? (profit / receivedValue) * 100 : 0;

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Nome da venda é obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const products: string[] = [];
      if (airTotal > 0 || form.airline) products.push("Aéreo");
      if (hotelTotal > 0 || form.hotel_name) products.push("Hotel");

      const { data: saleData, error: saleError } = await supabase.from("sales").insert({
        name: form.name,
        seller_id: user?.id,
        close_date: form.close_date || null,
        payment_method: form.payment_method || null,
        products,
        observations: form.observations || null,
        tag_chatguru: form.tag_chatguru || null,
        link_chat: form.link_chat || null,
        origin_iata: form.origin_iata || null,
        origin_city: null,
        destination_iata: form.destination_iata || null,
        destination_city: null,
        departure_date: form.departure_date || null,
        return_date: form.return_date || null,
        airline: form.airline || null,
        flight_class: form.flight_class || null,
        locators: form.locator ? [form.locator] : [],
        connections: form.connections ? form.connections.split(",").map(c => c.trim()) : [],
        miles_program: form.miles_program || null,
        emission_source: form.emission_source || null,
        hotel_name: form.hotel_name || null,
        hotel_room: form.hotel_room || null,
        hotel_meal_plan: form.hotel_meal_plan || null,
        hotel_reservation_code: form.hotel_reservation_code || null,
        adults: form.adults,
        children: form.children,
        children_ages: form.children_ages ? form.children_ages.split(",").map(a => parseInt(a.trim())).filter(Boolean) : [],
        received_value: receivedValue,
        total_cost: totalCost,
        profit,
        margin: parseFloat(margin.toFixed(2)),
        status: "Rascunho",
        created_by: user?.id,
      }).select("id").single();

      if (saleError) throw saleError;
      const saleId = (saleData as any).id;

      // Insert cost items
      const costItems = [];
      if (airTotal > 0) {
        costItems.push({
          sale_id: saleId, category: "aereo" as const,
          description: "Aéreo",
          cash_value: airCash, miles_quantity: parseInt(form.air_miles_qty) || 0,
          miles_price_per_thousand: parseFloat(form.air_miles_price) || 0,
          taxes: parseFloat(form.air_taxes) || 0,
          taxes_included_in_cash: form.air_taxes_included,
          emission_source: form.air_emission_source || null,
          miles_program: form.air_miles_program || null,
          miles_cost_brl: airMilesCost, total_item_cost: airTotal,
        });
      }
      if (hotelTotal > 0) {
        costItems.push({
          sale_id: saleId, category: "hotel" as const,
          description: "Hotel",
          cash_value: hotelCash, miles_quantity: parseInt(form.hotel_miles_qty) || 0,
          miles_price_per_thousand: parseFloat(form.hotel_miles_price) || 0,
          taxes: parseFloat(form.hotel_taxes) || 0,
          taxes_included_in_cash: form.hotel_taxes_included,
          emission_source: form.hotel_emission_source || null,
          miles_program: form.hotel_miles_program || null,
          miles_cost_brl: hotelMilesCost, total_item_cost: hotelTotal,
        });
      }
      if (costItems.length > 0) {
        await supabase.from("cost_items").insert(costItems);
      }

      // Insert flight segments
      const validSegments = segments.filter(s => s.origin_iata && s.destination_iata);
      if (validSegments.length > 0) {
        await supabase.from("flight_segments").insert(
          validSegments.map(s => ({
            sale_id: saleId,
            direction: s.direction,
            segment_order: s.segment_order,
            airline: s.airline || null,
            flight_number: s.flight_number || null,
            origin_iata: s.origin_iata,
            destination_iata: s.destination_iata,
            departure_date: s.departure_date || null,
            departure_time: s.departure_time || null,
            arrival_time: s.arrival_time || null,
            duration_minutes: s.duration_minutes || null,
            flight_class: s.flight_class || null,
            cabin_type: s.cabin_type || null,
            operated_by: s.operated_by || null,
            connection_time_minutes: s.connection_time_minutes || null,
            terminal: s.terminal || null,
          }))
        );
      }

      // Save extraction if exists
      if (extraction) {
        await supabase.from("extraction_runs").insert({
          sale_id: saleId,
          source_text: extraction.raw_text || textInput,
          extracted_json: extraction as any,
          confidence: extraction.confidence || 0,
          status: "completed",
          created_by: user?.id,
        });
      }

      toast({ title: "Venda salva com sucesso!" });
      navigate("/sales");
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const next = () => setStep(s => Math.min(s + 1, 8));
  const prev = () => setStep(s => Math.max(s - 1, 1));

  const confidenceBadge = (confidence?: number) => {
    if (!confidence) return null;
    const color = confidence >= 0.8 ? "bg-success/15 text-success" : confidence >= 0.5 ? "bg-warning/15 text-warning-foreground" : "bg-destructive/15 text-destructive";
    const label = confidence >= 0.8 ? "Alto" : confidence >= 0.5 ? "Médio" : "Baixo";
    return <Badge variant="outline" className={`${color} text-[10px] ml-1`}>{label} {(confidence * 100).toFixed(0)}%</Badge>;
  };

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-serif text-foreground">Nova Venda</h1>
        <p className="text-sm text-muted-foreground">Registre uma nova venda passo a passo</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {steps.map((s) => (
          <button key={s.id} onClick={() => setStep(s.id)} className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
            step === s.id ? "bg-primary text-primary-foreground" : step > s.id ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
          )}>
            {step > s.id ? <Check className="w-3.5 h-3.5" /> : <span className="w-5 h-5 rounded-full bg-current/10 flex items-center justify-center text-[10px]">{s.id}</span>}
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      <Card className="p-6 glass-card min-h-[400px]">
        {/* Step 1 - Upload & AI */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-serif text-foreground mb-1">Captura Inteligente</h2>
              <p className="text-sm text-muted-foreground">Upload de prints/documentos + texto complementar. A IA preencherá automaticamente.</p>
            </div>

            <div
              className={cn("border-2 border-dashed rounded-xl p-8 text-center transition-colors", dragOver ? "border-primary bg-primary/5" : "border-border")}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            >
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground mb-1">Arraste arquivos ou clique</p>
              <p className="text-xs text-muted-foreground mb-3">PNG, JPG, PDF — prints de emissão, WhatsApp, comprovantes</p>
              <input type="file" accept="image/*,.pdf" multiple onChange={(e) => handleFiles(e.target.files)} className="hidden" id="file-upload" />
              <label htmlFor="file-upload">
                <Button variant="outline" size="sm" asChild><span>Selecionar</span></Button>
              </label>
            </div>

            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <Badge key={i} variant="secondary" className="flex items-center gap-1">
                    {f.name}
                    <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="ml-1 hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label>Texto complementar (cole informações adicionais aqui)</Label>
              <Textarea
                placeholder="Cole aqui qualquer informação: conversa do WhatsApp, dados do cliente, detalhes da reserva..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={4}
              />
            </div>

            <Button onClick={handleExtract} disabled={extracting} className="w-full">
              {extracting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Extraindo com IA...</> : <><Sparkles className="w-4 h-4 mr-2" /> Extrair Dados com IA</>}
            </Button>

            {/* Extraction results */}
            {extraction && (
              <Card className="p-4 bg-muted/50 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" /> Dados Extraídos
                  {confidenceBadge(extraction.confidence)}
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {extraction.fields && Object.entries(extraction.fields).map(([key, val]) => {
                    if (!val) return null;
                    const v = Array.isArray(val) ? val.map(i => i.value).join(", ") : (val as ExtractedField).value;
                    const c = Array.isArray(val) ? val[0]?.confidence : (val as ExtractedField).confidence;
                    if (!v) return null;
                    return (
                      <div key={key} className="flex items-center justify-between bg-card rounded px-2 py-1">
                        <span className="text-muted-foreground text-xs">{key}</span>
                        <span className="text-xs font-medium flex items-center gap-1">
                          {String(v).slice(0, 30)} {confidenceBadge(c)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {extraction.raw_text && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground">Texto detectado</summary>
                    <pre className="mt-1 whitespace-pre-wrap bg-card p-2 rounded max-h-32 overflow-auto">{extraction.raw_text}</pre>
                  </details>
                )}
              </Card>
            )}

            <div className="flex items-center gap-4">
              <div className="flex-1 border-t border-border" />
              <span className="text-xs text-muted-foreground">ou</span>
              <div className="flex-1 border-t border-border" />
            </div>
            <Button variant="outline" onClick={next} className="w-full">Preencher Manualmente</Button>
          </div>
        )}

        {/* Step 2 - Basic data */}
        {step === 2 && (
          <div className="space-y-5 max-w-2xl">
            <h2 className="text-lg font-serif text-foreground">Dados Básicos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Venda *</Label>
                <Input value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="Ex: Roma - Família Silva" />
              </div>
              <div className="space-y-2">
                <Label>Data de Fechamento</Label>
                <Input type="date" value={form.close_date} onChange={(e) => updateForm("close_date", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select value={form.payment_method} onValueChange={(v) => updateForm("payment_method", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="Cartão de crédito">Cartão de crédito</SelectItem>
                    <SelectItem value="Transferência">Transferência</SelectItem>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>TAG ChatGuru</Label>
                <Input value={form.tag_chatguru} onChange={(e) => updateForm("tag_chatguru", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.observations} onChange={(e) => updateForm("observations", e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Link Chat</Label>
              <Input value={form.link_chat} onChange={(e) => updateForm("link_chat", e.target.value)} placeholder="https://wa.me/..." />
            </div>
          </div>
        )}

        {/* Step 3 - Passengers */}
        {step === 3 && (
          <div className="space-y-5 max-w-2xl">
            <h2 className="text-lg font-serif text-foreground">Passageiros</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Adultos (18+)</Label>
                <Input type="number" min={1} value={form.adults} onChange={(e) => updateForm("adults", parseInt(e.target.value) || 1)} />
              </div>
              <div className="space-y-2">
                <Label>Crianças (0-17)</Label>
                <Input type="number" min={0} value={form.children} onChange={(e) => updateForm("children", parseInt(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Idades das Crianças</Label>
                <Input value={form.children_ages} onChange={(e) => updateForm("children_ages", e.target.value)} placeholder="3, 8" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Gerencie passageiros individuais na página <button onClick={() => navigate("/passengers")} className="text-primary underline">Passageiros</button>.</p>
          </div>
        )}

        {/* Step 4 - Flight */}
        {step === 4 && (
          <div className="space-y-5 max-w-2xl">
            <h2 className="text-lg font-serif text-foreground">Aéreo</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Origem (IATA)</Label><AirportAutocomplete value={form.origin_iata} onChange={(iata) => updateForm("origin_iata", iata)} placeholder="GRU" /></div>
              <div className="space-y-2"><Label>Destino (IATA)</Label><AirportAutocomplete value={form.destination_iata} onChange={(iata) => updateForm("destination_iata", iata)} placeholder="FCO" /></div>
              <div className="space-y-2"><Label>Data Ida</Label><Input type="date" value={form.departure_date} onChange={(e) => updateForm("departure_date", e.target.value)} /></div>
              <div className="space-y-2"><Label>Data Volta</Label><Input type="date" value={form.return_date} onChange={(e) => updateForm("return_date", e.target.value)} /></div>
              <div className="space-y-2"><Label>Companhia Aérea</Label><AirlineAutocomplete value={form.airline} onChange={(iata) => updateForm("airline", iata)} /></div>
              <div className="space-y-2"><Label>Classe</Label>
                <Select value={form.flight_class} onValueChange={(v) => updateForm("flight_class", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Econômica">Econômica</SelectItem>
                    <SelectItem value="Premium Economy">Premium Economy</SelectItem>
                    <SelectItem value="Executiva">Executiva</SelectItem>
                    <SelectItem value="Primeira">Primeira</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Localizador</Label><Input value={form.locator} onChange={(e) => updateForm("locator", e.target.value.toUpperCase())} className="font-mono" /></div>
              <div className="space-y-2"><Label>Conexões</Label><Input value={form.connections} onChange={(e) => updateForm("connections", e.target.value.toUpperCase())} placeholder="LIS, MAD" /></div>
              <div className="space-y-2"><Label>Programa de Milhas</Label><Input value={form.miles_program} onChange={(e) => updateForm("miles_program", e.target.value)} placeholder="Smiles" /></div>
              <div className="space-y-2"><Label>Emissão por</Label><Input value={form.emission_source} onChange={(e) => updateForm("emission_source", e.target.value)} placeholder="Smiles (site/app)" /></div>
            </div>
          </div>
        )}

        {/* Step 5 - Flight Segments */}
        {step === 5 && (
          <div className="space-y-5">
            <h2 className="text-lg font-serif text-foreground">Segmentos de Voo</h2>
            <p className="text-sm text-muted-foreground">Detalhe cada trecho do voo para conexões.</p>

            {/* Amadeus enrichment button */}
            {form.origin_iata && form.destination_iata && form.departure_date && (
              <Button variant="outline" onClick={() => setEnrichmentOpen(true)} className="w-full">
                <Plane className="w-4 h-4 mr-2" /> Enriquecer com Amadeus
              </Button>
            )}

            <FlightEnrichmentDialog
              open={enrichmentOpen}
              onOpenChange={setEnrichmentOpen}
              origin={form.origin_iata}
              destination={form.destination_iata}
              departureDate={form.departure_date}
              returnDate={form.return_date}
              airline={form.airline}
              currentSegments={segments}
              onApply={(newSegs) => setSegments(newSegs)}
            />

            {/* Preview timeline */}
            {segments.filter(s => s.origin_iata && s.destination_iata).length > 0 && (
              <Card className="p-4 bg-muted/30">
                <FlightTimeline segments={segments} direction="ida" />
                <div className="my-3 border-t border-border" />
                <FlightTimeline segments={segments} direction="volta" />
              </Card>
            )}

            {["ida", "volta"].map((dir) => (
              <div key={dir} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold capitalize flex items-center gap-2">
                    <Plane className={cn("w-4 h-4", dir === "volta" && "rotate-180")} /> {dir}
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => addSegment(dir as "ida" | "volta")}>
                    <Plus className="w-3 h-3 mr-1" /> Segmento
                  </Button>
                </div>
                {segments.map((seg, i) => seg.direction !== dir ? null : (
                  <Card key={i} className="p-4 glass-card space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Segmento {seg.segment_order}</span>
                      {segments.filter(s => s.direction === dir).length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeSegment(i)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Origem</Label><Input value={seg.origin_iata} onChange={(e) => updateSegment(i, "origin_iata", e.target.value.toUpperCase())} maxLength={3} className="font-mono" /></div>
                      <div className="space-y-1"><Label className="text-xs">Destino</Label><Input value={seg.destination_iata} onChange={(e) => updateSegment(i, "destination_iata", e.target.value.toUpperCase())} maxLength={3} className="font-mono" /></div>
                      <div className="space-y-1"><Label className="text-xs">Companhia</Label><Input value={seg.airline} onChange={(e) => updateSegment(i, "airline", e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Nº Voo</Label><Input value={seg.flight_number} onChange={(e) => updateSegment(i, "flight_number", e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Data</Label><Input type="date" value={seg.departure_date} onChange={(e) => updateSegment(i, "departure_date", e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Partida</Label><Input type="time" value={seg.departure_time} onChange={(e) => updateSegment(i, "departure_time", e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Chegada</Label><Input type="time" value={seg.arrival_time} onChange={(e) => updateSegment(i, "arrival_time", e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Duração (min)</Label><Input type="number" value={seg.duration_minutes || ""} onChange={(e) => updateSegment(i, "duration_minutes", parseInt(e.target.value) || 0)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Classe</Label><Input value={seg.flight_class} onChange={(e) => updateSegment(i, "flight_class", e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Operado por</Label><Input value={seg.operated_by} onChange={(e) => updateSegment(i, "operated_by", e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Tempo Conexão (min)</Label><Input type="number" value={seg.connection_time_minutes || ""} onChange={(e) => updateSegment(i, "connection_time_minutes", parseInt(e.target.value) || 0)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Terminal</Label><Input value={seg.terminal} onChange={(e) => updateSegment(i, "terminal", e.target.value)} /></div>
                    </div>
                  </Card>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Step 6 - Hotel */}
        {step === 6 && (
          <div className="space-y-5 max-w-2xl">
            <h2 className="text-lg font-serif text-foreground">Hotel</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Hotel</Label><Input value={form.hotel_name} onChange={(e) => updateForm("hotel_name", e.target.value)} /></div>
              <div className="space-y-2"><Label>Quarto</Label><Input value={form.hotel_room} onChange={(e) => updateForm("hotel_room", e.target.value)} /></div>
              <div className="space-y-2"><Label>Alimentação</Label>
                <Select value={form.hotel_meal_plan} onValueChange={(v) => updateForm("hotel_meal_plan", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sem alimentação">Sem alimentação</SelectItem>
                    <SelectItem value="Café da manhã">Café da manhã</SelectItem>
                    <SelectItem value="Meia pensão">Meia pensão</SelectItem>
                    <SelectItem value="Pensão completa">Pensão completa</SelectItem>
                    <SelectItem value="All inclusive">All inclusive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Código Reserva</Label><Input value={form.hotel_reservation_code} onChange={(e) => updateForm("hotel_reservation_code", e.target.value)} className="font-mono" /></div>
            </div>
          </div>
        )}

        {/* Step 7 - Financial */}
        {step === 7 && (
          <div className="space-y-5 max-w-2xl">
            <h2 className="text-lg font-serif text-foreground">Financeiro</h2>
            <div className="space-y-2">
              <Label>Valor Recebido (R$)</Label>
              <Input type="number" step="0.01" value={form.received_value} onChange={(e) => updateForm("received_value", e.target.value)} />
            </div>

            {/* Air costs */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">✈️ Custos — Aéreo</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Valor pago R$</Label><Input type="number" step="0.01" value={form.air_cash} onChange={(e) => updateForm("air_cash", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Milhas</Label><Input type="number" value={form.air_miles_qty} onChange={(e) => updateForm("air_miles_qty", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Preço Milheiro R$</Label><Input type="number" step="0.01" value={form.air_miles_price} onChange={(e) => updateForm("air_miles_price", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Taxas R$</Label><Input type="number" step="0.01" value={form.air_taxes} onChange={(e) => updateForm("air_taxes", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Emissão por</Label><Input value={form.air_emission_source} onChange={(e) => updateForm("air_emission_source", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Programa</Label><Input value={form.air_miles_program} onChange={(e) => updateForm("air_miles_program", e.target.value)} /></div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Checkbox checked={form.air_taxes_included} onCheckedChange={(v) => updateForm("air_taxes_included", !!v)} id="air-tax" />
                <label htmlFor="air-tax" className="text-xs text-muted-foreground">Taxas já incluídas no valor pago em R$</label>
              </div>
              {airMilesCost > 0 && (
                <p className="text-xs text-muted-foreground mt-2">Custo milhas: R$ {airMilesCost.toFixed(2)} | Total aéreo: R$ {airTotal.toFixed(2)}</p>
              )}
            </div>

            {/* Hotel costs */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">🏨 Custos — Hotel</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Valor pago R$</Label><Input type="number" step="0.01" value={form.hotel_cash} onChange={(e) => updateForm("hotel_cash", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Milhas</Label><Input type="number" value={form.hotel_miles_qty} onChange={(e) => updateForm("hotel_miles_qty", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Preço Milheiro R$</Label><Input type="number" step="0.01" value={form.hotel_miles_price} onChange={(e) => updateForm("hotel_miles_price", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Taxas R$</Label><Input type="number" step="0.01" value={form.hotel_taxes} onChange={(e) => updateForm("hotel_taxes", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Emissão por</Label><Input value={form.hotel_emission_source} onChange={(e) => updateForm("hotel_emission_source", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Programa</Label><Input value={form.hotel_miles_program} onChange={(e) => updateForm("hotel_miles_program", e.target.value)} /></div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Checkbox checked={form.hotel_taxes_included} onCheckedChange={(v) => updateForm("hotel_taxes_included", !!v)} id="hotel-tax" />
                <label htmlFor="hotel-tax" className="text-xs text-muted-foreground">Taxas já incluídas no valor pago em R$</label>
              </div>
              {hotelMilesCost > 0 && (
                <p className="text-xs text-muted-foreground mt-2">Custo milhas: R$ {hotelMilesCost.toFixed(2)} | Total hotel: R$ {hotelTotal.toFixed(2)}</p>
              )}
            </div>

            {/* Summary */}
            <Card className="p-4 bg-muted/50">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Custo Total</span>
                <span className="font-semibold text-right">R$ {totalCost.toFixed(2)}</span>
                <span className="text-muted-foreground">Valor Recebido</span>
                <span className="font-semibold text-right text-success">R$ {receivedValue.toFixed(2)}</span>
                <span className="text-muted-foreground">Lucro</span>
                <span className={cn("font-bold text-right", profit >= 0 ? "text-primary" : "text-destructive")}>R$ {profit.toFixed(2)}</span>
                <span className="text-muted-foreground">Margem</span>
                <span className="font-bold text-right text-accent">{margin.toFixed(1)}%</span>
              </div>
            </Card>
          </div>
        )}

        {/* Step 8 - Review */}
        {step === 8 && (
          <div className="space-y-5 max-w-2xl">
            <h2 className="text-lg font-serif text-foreground">Revisão Final</h2>
            <div className="p-4 bg-muted/50 rounded-xl space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Nome</span><span className="font-medium">{form.name || "—"}</span>
                <span className="text-muted-foreground">Rota</span><span className="font-mono">{form.origin_iata || "?"} → {form.destination_iata || "?"}</span>
                <span className="text-muted-foreground">Datas</span><span>{form.departure_date || "?"} — {form.return_date || "?"}</span>
                <span className="text-muted-foreground">Companhia</span><span>{form.airline || "—"}</span>
                <span className="text-muted-foreground">PAX</span><span>{form.adults + form.children}</span>
                <span className="text-muted-foreground">Hotel</span><span>{form.hotel_name || "—"}</span>
                <span className="text-muted-foreground">Receita</span><span className="text-success font-semibold">R$ {receivedValue.toFixed(2)}</span>
                <span className="text-muted-foreground">Custo</span><span>R$ {totalCost.toFixed(2)}</span>
                <span className="text-muted-foreground">Lucro</span><span className="font-bold text-primary">R$ {profit.toFixed(2)}</span>
                <span className="text-muted-foreground">Margem</span><span className="font-bold text-accent">{margin.toFixed(1)}%</span>
                <span className="text-muted-foreground">Segmentos</span><span>{segments.filter(s => s.origin_iata).length} trecho(s)</span>
              </div>
            </div>
            <Button className="w-full" size="lg" onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : <><Check className="w-4 h-4 mr-2" /> Salvar Venda</>}
            </Button>
          </div>
        )}
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={prev} disabled={step === 1}><ChevronLeft className="w-4 h-4 mr-1" /> Anterior</Button>
        {step < 8 && <Button onClick={next}>Próximo <ChevronRight className="w-4 h-4 ml-1" /></Button>}
      </div>
    </div>
  );
}
