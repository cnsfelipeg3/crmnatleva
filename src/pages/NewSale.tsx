import { useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Check, Upload, Sparkles, Loader2, Plus, Trash2, Plane, Hotel, CreditCard,
  ShoppingBag, Paperclip, Eye, ChevronDown, Camera, Car, Shield, Ticket,
  UtensilsCrossed, MapPin, CalendarDays, Users, FileText, DollarSign, Train,
  ArrowLeft, ArrowRight, AlertCircle, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import FlightTimeline, { type FlightSegment } from "@/components/FlightTimeline";
import AirportAutocomplete from "@/components/AirportAutocomplete";
import AirlineAutocomplete from "@/components/AirlineAutocomplete";
import FlightEnrichmentDialog from "@/components/FlightEnrichmentDialog";
import HotelAutocomplete from "@/components/HotelAutocomplete";
import { classifyItinerary, assignDirections } from "@/lib/itineraryClassifier";
import { smartCapitalizeName } from "@/lib/nameUtils";
import PassengerSelector, { type SelectedPassenger } from "@/components/PassengerSelector";
import SalePaymentsEditor, { type SalePayment } from "@/components/SalePaymentsEditor";
import { useQuery } from "@tanstack/react-query";

/* ─── Types ────────────────────────────────────────────── */

interface ExtractedField { value: any; confidence: number; }
interface ExtractionResult {
  fields: Record<string, ExtractedField | ExtractedField[]>;
  raw_text?: string; confidence?: number; conflicts?: any[];
}

interface OtherProduct {
  id: string; type: string; description: string; supplier: string;
  date: string; emission_type: "milhas" | "pagante";
  miles_program: string; miles_qty: string; miles_tax: string; cash_value: string;
  reservation_code: string;
}

const defaultSegment: FlightSegment = {
  direction: "ida", segment_order: 1, airline: "", flight_number: "",
  origin_iata: "", destination_iata: "", departure_date: "", departure_time: "",
  arrival_time: "", duration_minutes: 0, flight_class: "", cabin_type: "",
  operated_by: "", connection_time_minutes: 0, terminal: "",
};

const PRODUCT_TYPES = [
  { value: "transfer", label: "Transfer", icon: Car },
  { value: "trem", label: "Trem / Ferroviário", icon: Train },
  { value: "seguro", label: "Seguro Viagem", icon: Shield },
  { value: "passeio", label: "Passeio / Experiência", icon: Ticket },
  { value: "ingresso", label: "Ingresso", icon: Ticket },
  { value: "aluguel_carro", label: "Aluguel de Carro", icon: Car },
  { value: "outros", label: "Outros", icon: ShoppingBag },
];

const TAB_IDS = ["info", "passageiros", "aereo", "hospedagem", "produtos", "pagamentos", "anexos", "revisao"] as const;
type TabId = typeof TAB_IDS[number];

/* ─── Component ────────────────────────────────────────── */

export default function NewSale() {
  const [activeTab, setActiveTab] = useState<string>("info");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();

  // Upload & extraction
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [textInput, setTextInput] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);

  // Form
  const [form, setForm] = useState({
    name: "", close_date: "", payment_method: "", observations: "",
    link_chat: "", adults: 1, children: 0, children_ages: "",
    origin_iata: "", destination_iata: "", departure_date: "", return_date: "",
    airline: "", flight_class: "", locator: "", connections: "", miles_program: "",
    emission_source: "",
    // Air costs
    air_emission_type: "milhas" as "milhas" | "pagante",
    air_miles_qty: "", air_miles_price: "", air_taxes: "",
    air_emission_source: "", air_miles_program: "", air_supplier_id: "",
    air_cash_value: "",
    // Hotel
    hotel_name: "", hotel_room: "", hotel_meal_plan: "", hotel_reservation_code: "",
    hotel_checkin_date: "", hotel_checkout_date: "", hotel_qty_rooms: "1",
    hotel_city: "", hotel_country: "", hotel_address: "", hotel_lat: 0, hotel_lng: 0, hotel_place_id: "",
    // Hotel costs
    hotel_emission_type: "milhas" as "milhas" | "pagante",
    hotel_miles_qty: "", hotel_miles_price: "", hotel_taxes: "",
    hotel_emission_source: "", hotel_miles_program: "", hotel_supplier_id: "",
    hotel_cash_value: "",
    // Payment
    received_value: "", paid_value: "", payment_gateway: "", payment_installments: "1",
  });

  const [segments, setSegments] = useState<FlightSegment[]>([
    { ...defaultSegment, direction: "ida", segment_order: 1 },
  ]);
  const [otherProducts, setOtherProducts] = useState<OtherProduct[]>([]);
  const [salePayments, setSalePayments] = useState<SalePayment[]>([]);
  const [saving, setSaving] = useState(false);
  const [enrichmentOpen, setEnrichmentOpen] = useState(false);
  const [selectedPassengers, setSelectedPassengers] = useState<SelectedPassenger[]>(() => {
    const state = location.state as any;
    return state?.preSelectedPassengers || [];
  });

  // Queries
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("*").order("name");
      return data || [];
    },
  });
  const { data: allMilesPrograms = [] } = useQuery({
    queryKey: ["all_supplier_miles_programs"],
    queryFn: async () => {
      const { data } = await supabase.from("supplier_miles_programs").select("*").eq("is_active", true).order("program_name").order("min_miles");
      return data || [];
    },
  });

  const getSupplierPrograms = (supplierId: string) => {
    const programs = allMilesPrograms.filter((p: any) => p.supplier_id === supplierId);
    return [...new Set(programs.map((p: any) => p.program_name))];
  };

  const autoFillMilesPrice = (supplierId: string, programName: string, milesQty: string, prefix: "air" | "hotel") => {
    const qty = parseInt(milesQty) || 0;
    const tiers = allMilesPrograms
      .filter((p: any) => p.supplier_id === supplierId && p.program_name === programName && p.is_active)
      .sort((a: any, b: any) => a.min_miles - b.min_miles);
    if (tiers.length === 0) return;
    const tier = tiers.find((t: any) => t.max_miles ? qty >= t.min_miles && qty <= t.max_miles : qty >= t.min_miles) || tiers[tiers.length - 1];
    if (tier) setForm(f => ({ ...f, [`${prefix}_miles_price`]: String(tier.price_per_thousand) }));
  };

  const updateForm = (field: string, value: any) => setForm(f => ({ ...f, [field]: value }));

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    setFiles(prev => [...prev, ...Array.from(newFiles)]);
  };

  // ─── Extraction ─────────────────────────────────────
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
          air_miles_qty: get("air_miles_qty") || get("miles_quantity") || prev.air_miles_qty,
          air_miles_price: get("air_miles_price") || prev.air_miles_price,
          air_taxes: get("air_taxes") || get("taxes") || prev.air_taxes,
          air_emission_source: get("emission_source") || prev.air_emission_source,
          air_miles_program: get("miles_program") || prev.air_miles_program,
          hotel_miles_qty: get("hotel_miles_qty") || prev.hotel_miles_qty,
          hotel_miles_price: get("hotel_miles_price") || prev.hotel_miles_price,
          hotel_taxes: get("hotel_taxes") || prev.hotel_taxes,
        }));

        if (f.flight_segments && Array.isArray(f.flight_segments)) {
          const rawSegments = f.flight_segments.map((s: any, i: number) => ({
            ...defaultSegment, direction: "ida" as const, segment_order: i + 1,
            airline: s.airline || "", flight_number: s.flight_number || "",
            origin_iata: s.origin_iata || "", destination_iata: s.destination_iata || "",
            departure_date: s.departure_date || "", departure_time: s.departure_time || "",
            arrival_time: s.arrival_time || "", flight_class: s.class || "",
          }));
          if (rawSegments.length > 0) {
            const classification = classifyItinerary(rawSegments);
            const withDirections = assignDirections(rawSegments, classification);
            setSegments(withDirections as FlightSegment[]);
          }
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

  // ─── Segments ───────────────────────────────────────
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

  // ─── Other Products ─────────────────────────────────
  const addProduct = () => {
    setOtherProducts(prev => [...prev, {
      id: crypto.randomUUID(), type: "transfer", description: "", supplier: "",
      date: "", emission_type: "pagante", miles_program: "", miles_qty: "",
      miles_tax: "", cash_value: "", reservation_code: "",
    }]);
  };
  const updateProduct = (id: string, field: string, value: any) => {
    setOtherProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };
  const removeProduct = (id: string) => {
    setOtherProducts(prev => prev.filter(p => p.id !== id));
  };

  // ─── Cost calculations ─────────────────────────────
  const airCost = (() => {
    if (form.air_emission_type === "pagante") return parseFloat(form.air_cash_value) || 0;
    const qty = parseFloat(form.air_miles_qty) || 0;
    const price = parseFloat(form.air_miles_price) || 0;
    const taxes = parseFloat(form.air_taxes) || 0;
    return (qty / 1000) * price + taxes;
  })();

  const hotelCost = (() => {
    if (form.hotel_emission_type === "pagante") return parseFloat(form.hotel_cash_value) || 0;
    const qty = parseFloat(form.hotel_miles_qty) || 0;
    const price = parseFloat(form.hotel_miles_price) || 0;
    const taxes = parseFloat(form.hotel_taxes) || 0;
    return (qty / 1000) * price + taxes;
  })();

  const productsCost = otherProducts.reduce((sum, p) => {
    if (p.emission_type === "pagante") return sum + (parseFloat(p.cash_value) || 0);
    const qty = parseFloat(p.miles_qty) || 0;
    const tax = parseFloat(p.miles_tax) || 0;
    return sum + tax; // simplified — miles cost calculation would need price/thousand
  }, 0);

  const totalCost = airCost + hotelCost + productsCost;
  const paymentsGross = salePayments.reduce((s, p) => s + p.gross_value, 0);
  const receivedValue = paymentsGross > 0 ? paymentsGross : parseFloat(form.received_value) || 0;
  const profit = receivedValue - totalCost;
  const margin = receivedValue > 0 ? (profit / receivedValue) * 100 : 0;

  const totalMiles = (parseFloat(form.air_miles_qty) || 0) + (parseFloat(form.hotel_miles_qty) || 0)
    + otherProducts.filter(p => p.emission_type === "milhas").reduce((s, p) => s + (parseFloat(p.miles_qty) || 0), 0);

  // ─── Passenger validation ──────────────────────────
  const totalPassengersRequired = form.adults + form.children;
  const passengersValid = selectedPassengers.length === totalPassengersRequired;

  // ─── Tab navigation ────────────────────────────────
  const currentTabIndex = TAB_IDS.indexOf(activeTab as TabId);
  const canAdvanceFromPassengers = passengersValid;

  const goNext = () => {
    if (activeTab === "passageiros" && !canAdvanceFromPassengers) {
      toast({
        title: "Passageiros pendentes",
        description: `Esta venda possui ${totalPassengersRequired} passageiro(s), mas apenas ${selectedPassengers.length} foram vinculados.`,
        variant: "destructive",
      });
      return;
    }
    const next = currentTabIndex + 1;
    if (next < TAB_IDS.length) setActiveTab(TAB_IDS[next]);
  };
  const goPrev = () => {
    const prev = currentTabIndex - 1;
    if (prev >= 0) setActiveTab(TAB_IDS[prev]);
  };

  const StepNavigation = ({ hideNext }: { hideNext?: boolean }) => (
    <div className="flex items-center justify-between mt-6 pt-4 border-t">
      <Button variant="outline" onClick={goPrev} disabled={currentTabIndex === 0}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
      </Button>
      {!hideNext && (
        <Button onClick={goNext} disabled={currentTabIndex === TAB_IDS.length - 1}>
          Avançar <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      )}
    </div>
  );

  // ─── Save ───────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "Nome da venda é obrigatório", variant: "destructive" });
      setActiveTab("info");
      return;
    }
    setSaving(true);
    try {
      const products: string[] = [];
      if (airCost > 0 || form.airline) products.push("Aéreo");
      if (hotelCost > 0 || form.hotel_name) products.push("Hotel");
      otherProducts.forEach(p => {
        const label = PRODUCT_TYPES.find(t => t.value === p.type)?.label || p.type;
        if (!products.includes(label)) products.push(label);
      });

      const { data: saleData, error: saleError } = await supabase.from("sales").insert({
        name: smartCapitalizeName(form.name),
        seller_id: user?.id,
        close_date: form.close_date || null,
        payment_method: salePayments.length > 0 ? salePayments.map(p => p.payment_method).join(", ") : form.payment_method || null,
        products, observations: form.observations || null,
        link_chat: form.link_chat || null,
        origin_iata: form.origin_iata || null, origin_city: null,
        destination_iata: form.destination_iata || null, destination_city: null,
        departure_date: form.departure_date || null, return_date: form.return_date || null,
        airline: form.airline || null, flight_class: form.flight_class || null,
        locators: form.locator ? [form.locator] : [],
        connections: form.connections ? form.connections.split(",").map(c => c.trim()) : [],
        miles_program: form.miles_program || null,
        emission_source: form.emission_source || null,
        hotel_name: form.hotel_name || null, hotel_room: form.hotel_room || null,
        hotel_meal_plan: form.hotel_meal_plan || null,
        hotel_reservation_code: form.hotel_reservation_code || null,
        hotel_checkin_date: form.hotel_checkin_date || null,
        hotel_checkout_date: form.hotel_checkout_date || null,
        hotel_city: form.hotel_city || null, hotel_country: form.hotel_country || null,
        hotel_address: form.hotel_address || null,
        hotel_lat: form.hotel_lat || null, hotel_lng: form.hotel_lng || null,
        hotel_place_id: form.hotel_place_id || null,
        adults: form.adults, children: form.children,
        children_ages: form.children_ages ? form.children_ages.split(",").map(a => parseInt(a.trim())).filter(Boolean) : [],
        received_value: receivedValue, total_cost: totalCost,
        profit, margin: parseFloat(margin.toFixed(2)),
        status: "Rascunho", created_by: user?.id,
      }).select("id").single();

      if (saleError) throw saleError;
      const saleId = (saleData as any).id;

      // Cost items
      const costItems: any[] = [];
      if (airCost > 0) {
        costItems.push({
          sale_id: saleId, category: "aereo", description: "Aéreo",
          cash_value: form.air_emission_type === "pagante" ? parseFloat(form.air_cash_value) || 0 : 0,
          miles_quantity: parseInt(form.air_miles_qty) || 0,
          miles_price_per_thousand: parseFloat(form.air_miles_price) || 0,
          taxes: parseFloat(form.air_taxes) || 0, taxes_included_in_cash: false,
          emission_source: form.air_emission_source || null,
          miles_program: form.air_miles_program || null,
          miles_cost_brl: form.air_emission_type === "milhas" ? airCost : 0,
          total_item_cost: airCost,
          supplier_id: form.air_supplier_id || null,
        });
      }
      if (hotelCost > 0) {
        costItems.push({
          sale_id: saleId, category: "hotel", description: "Hotel",
          cash_value: form.hotel_emission_type === "pagante" ? parseFloat(form.hotel_cash_value) || 0 : 0,
          miles_quantity: parseInt(form.hotel_miles_qty) || 0,
          miles_price_per_thousand: parseFloat(form.hotel_miles_price) || 0,
          taxes: parseFloat(form.hotel_taxes) || 0, taxes_included_in_cash: false,
          emission_source: form.hotel_emission_source || null,
          miles_program: form.hotel_miles_program || null,
          miles_cost_brl: form.hotel_emission_type === "milhas" ? hotelCost : 0,
          total_item_cost: hotelCost,
          supplier_id: form.hotel_supplier_id || null,
        });
      }
      for (const p of otherProducts) {
        const cost = p.emission_type === "pagante" ? parseFloat(p.cash_value) || 0 : parseFloat(p.miles_tax) || 0;
        if (cost > 0 || p.description || p.reservation_code) {
          costItems.push({
            sale_id: saleId, category: "outros",
            product_type: p.type,
            description: `${PRODUCT_TYPES.find(t => t.value === p.type)?.label || p.type} - ${p.description}`,
            cash_value: p.emission_type === "pagante" ? parseFloat(p.cash_value) || 0 : 0,
            miles_quantity: parseInt(p.miles_qty) || 0,
            taxes: parseFloat(p.miles_tax) || 0,
            total_item_cost: cost,
            reservation_code: p.reservation_code || null,
          });
        }
      }
      if (costItems.length > 0) await supabase.from("cost_items").insert(costItems);

      // Flight segments
      const validSegments = segments.filter(s => s.origin_iata && s.destination_iata);
      if (validSegments.length > 0) {
        await supabase.from("flight_segments").insert(
          validSegments.map(s => ({
            sale_id: saleId, direction: s.direction, segment_order: s.segment_order,
            airline: s.airline || null, flight_number: s.flight_number || null,
            origin_iata: s.origin_iata, destination_iata: s.destination_iata,
            departure_date: s.departure_date || null, departure_time: s.departure_time || null,
            arrival_time: s.arrival_time || null, duration_minutes: s.duration_minutes || null,
            flight_class: s.flight_class || null, cabin_type: s.cabin_type || null,
            operated_by: s.operated_by || null, connection_time_minutes: s.connection_time_minutes || null,
            terminal: s.terminal || null,
          }))
        );
      }

      // Extraction log
      if (extraction) {
        await supabase.from("extraction_runs").insert({
          sale_id: saleId, source_text: extraction.raw_text || textInput,
          extracted_json: extraction as any, confidence: extraction.confidence || 0,
          status: "completed", created_by: user?.id,
        });
      }

      // Passengers from extraction
      if (extraction?.fields) {
        const paxDetails: any[] = (extraction.fields as any).passenger_details || [];
        const paxNames: any[] = (extraction.fields as any).passenger_names || [];
        const paxList: { full_name: string; cpf?: string; phone?: string; passport_number?: string; birth_date?: string }[] = [];
        for (const d of paxDetails) {
          const name = d.full_name || d.value;
          if (name && typeof name === "string" && name.trim().length >= 2)
            paxList.push({ full_name: name.trim(), cpf: d.cpf, phone: d.phone, passport_number: d.passport_number, birth_date: d.birth_date });
        }
        if (paxList.length === 0) {
          for (const n of paxNames) {
            const name = n.value || n;
            if (name && typeof name === "string" && name.trim().length >= 2)
              paxList.push({ full_name: name.trim() });
          }
        }
        for (const pax of paxList) {
          const cleanCpf = pax.cpf?.replace(/\D/g, "") || null;
          let passengerId: string | null = null;
          if (cleanCpf && cleanCpf.length === 11) {
            const { data: byCpf } = await supabase.from("passengers").select("id").eq("cpf", cleanCpf).maybeSingle();
            if (byCpf) passengerId = byCpf.id;
          }
          if (!passengerId) {
            const { data: byName } = await supabase.from("passengers").select("id, full_name").ilike("full_name", pax.full_name).maybeSingle();
            if (byName) passengerId = byName.id;
          }
          if (!passengerId) {
            const { data: newPax } = await supabase.from("passengers").insert({
              full_name: smartCapitalizeName(pax.full_name),
              cpf: cleanCpf && cleanCpf.length === 11 ? cleanCpf : null,
              phone: pax.phone || null, passport_number: pax.passport_number || null,
              birth_date: pax.birth_date || null, created_by: user?.id,
            }).select("id").single();
            if (newPax) passengerId = newPax.id;
          }
          if (passengerId) {
            const { data: existingLink } = await supabase.from("sale_passengers").select("id").eq("sale_id", saleId).eq("passenger_id", passengerId).maybeSingle();
            if (!existingLink) await supabase.from("sale_passengers").insert({ sale_id: saleId, passenger_id: passengerId });
          }
        }
      }

      // Link manually selected passengers
      for (const pax of selectedPassengers) {
        const { data: existingLink } = await supabase.from("sale_passengers").select("id").eq("sale_id", saleId).eq("passenger_id", pax.id).maybeSingle();
        if (!existingLink) await supabase.from("sale_passengers").insert({ sale_id: saleId, passenger_id: pax.id });
      }

      // Save sale payments
      if (salePayments.length > 0) {
        const todayStr = new Date().toISOString().slice(0, 10);
        await supabase.from("sale_payments").insert(
          salePayments.map(p => ({
            sale_id: saleId,
            payment_method: p.payment_method,
            gateway: p.gateway || null,
            installments: p.installments,
            gross_value: p.gross_value,
            fee_percent: p.fee_percent,
            fee_fixed: p.fee_fixed,
            fee_total: p.fee_total,
            net_value: p.net_value,
            receiving_account_id: p.receiving_account_id || null,
            payment_date: p.payment_date || null,
            due_date: p.due_date || null,
            status: p.status || "pago",
            notes: p.notes || null,
          }))
        );

        // Auto-create accounts_receivable entries
        for (const p of salePayments) {
          if (p.gross_value > 0) {
            const isPaid = p.status === "pago";
            await supabase.from("accounts_receivable").insert({
              sale_id: saleId,
              description: `Pagamento ${p.payment_method}${p.gateway ? ` (${p.gateway})` : ""}`,
              gross_value: p.gross_value,
              fee_percent: p.fee_percent,
              fee_value: p.fee_total,
              net_value: p.net_value,
              payment_method: p.payment_method,
              status: isPaid ? "recebido" : "pendente",
              received_date: isPaid ? (p.payment_date || todayStr) : null,
              due_date: p.due_date || p.payment_date || todayStr,
              seller_id: user?.id || null,
              created_by: user?.id || null,
              installment_number: 1,
              installment_total: p.installments,
            });
          }
        }
      }

      toast({ title: "Venda salva com sucesso!" });
      try { await Promise.all([supabase.functions.invoke("checkin-generate"), supabase.functions.invoke("lodging-generate")]); } catch {}
      navigate("/sales");
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  // ─── Helpers ────────────────────────────────────────
  const confidenceBadge = (confidence?: number) => {
    if (!confidence) return null;
    const color = confidence >= 0.8 ? "bg-success/15 text-success" : confidence >= 0.5 ? "bg-warning/15 text-warning-foreground" : "bg-destructive/15 text-destructive";
    const label = confidence >= 0.8 ? "Alto" : confidence >= 0.5 ? "Médio" : "Baixo";
    return <Badge variant="outline" className={`${color} text-[10px] ml-1`}>{label} {(confidence * 100).toFixed(0)}%</Badge>;
  };

  const SectionTitle = ({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) => (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );

  const EmissionTypeSelector = ({ value, onChange }: { value: "milhas" | "pagante"; onChange: (v: "milhas" | "pagante") => void }) => (
    <div className="flex gap-2">
      <Button type="button" variant={value === "milhas" ? "default" : "outline"} size="sm" onClick={() => onChange("milhas")} className="flex-1">
        🎯 Milhas
      </Button>
      <Button type="button" variant={value === "pagante" ? "default" : "outline"} size="sm" onClick={() => onChange("pagante")} className="flex-1">
        💰 Pagante
      </Button>
    </div>
  );

  // ─── Render ─────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-serif text-foreground">Nova Venda</h1>
        <p className="text-sm text-muted-foreground">Registre todos os detalhes da viagem de forma organizada</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1.5 rounded-xl">
          {[
            { id: "info", icon: FileText, label: "Venda" },
            { id: "passageiros", icon: Users, label: "Passageiros" },
            { id: "aereo", icon: Plane, label: "Aéreo" },
            { id: "hospedagem", icon: Hotel, label: "Hospedagem" },
            { id: "produtos", icon: ShoppingBag, label: "Produtos" },
            { id: "pagamentos", icon: DollarSign, label: "Pagamentos" },
            { id: "anexos", icon: Paperclip, label: "Anexos / IA" },
            { id: "revisao", icon: Eye, label: "Revisão" },
          ].map(t => (
            <TabsTrigger key={t.id} value={t.id} className="flex items-center gap-1.5 text-xs px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
              <t.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ═══════════════ 1. INFORMAÇÕES DA VENDA ═══════════════ */}
        <TabsContent value="info">
          <Card className="p-6">
            <SectionTitle icon={FileText} title="Informações da Venda" subtitle="Dados gerais do registro" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Venda *</Label>
                <Input data-testid="input-sale-name" value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="Ex: Roma - Família Silva" />
              </div>
              <div className="space-y-2">
                <Label>Data de Fechamento</Label>
                <Input type="date" value={form.close_date} onChange={(e) => updateForm("close_date", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Vendedor Responsável</Label>
                <Input value={user?.email || ""} disabled className="bg-muted/50" />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label>Link do Chat (WhatsApp / atendimento)</Label>
                <Input value={form.link_chat} onChange={(e) => updateForm("link_chat", e.target.value)} placeholder="https://wa.me/..." />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label>Observações da Venda</Label>
                <Textarea value={form.observations} onChange={(e) => updateForm("observations", e.target.value)} rows={3} placeholder="Detalhes adicionais, preferências do cliente..." />
              </div>
            </div>
            <StepNavigation />
          </Card>
        </TabsContent>

        {/* ═══════════════ 2. PASSAGEIROS ═══════════════ */}
        <TabsContent value="passageiros">
          <Card className="p-6">
            <SectionTitle icon={Users} title="Passageiros" subtitle="Adicione os viajantes desta venda" />
            
            {/* Bloco 1 — Quantidade */}
            <div className="grid grid-cols-3 gap-4 mb-4">
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

            {/* Bloco 3 — Validação visual */}
            <div className={cn(
              "rounded-lg px-4 py-3 mb-5 flex items-center gap-3 text-sm font-medium border",
              passengersValid
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
            )}>
              {passengersValid ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <span>
                Passageiros selecionados: <strong>{selectedPassengers.length}</strong> de <strong>{totalPassengersRequired}</strong>
                {passengersValid
                  ? " — ✅ Todos os passageiros obrigatórios foram vinculados"
                  : ` — Selecione ${totalPassengersRequired - selectedPassengers.length} passageiro(s) para continuar`}
              </span>
            </div>

            {/* Bloco 2 — Seleção */}
            <div className="border-t pt-5">
              <PassengerSelector selected={selectedPassengers} onChange={setSelectedPassengers} />
            </div>

            <StepNavigation />
          </Card>
        </TabsContent>

        {/* ═══════════════ 3. AÉREO ═══════════════ */}
        <TabsContent value="aereo">
          <div className="space-y-4">
            <Card className="p-6">
              <SectionTitle icon={Plane} title="Aéreo" subtitle="Dados do voo e segmentos" />
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="space-y-2"><Label>Origem</Label><AirportAutocomplete value={form.origin_iata} onChange={(iata) => updateForm("origin_iata", iata)} placeholder="GRU" /></div>
                <div className="space-y-2"><Label>Destino</Label><AirportAutocomplete value={form.destination_iata} onChange={(iata) => updateForm("destination_iata", iata)} placeholder="FCO" /></div>
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
              </div>

              {/* Segments */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-3 border-t">
                  <span className="text-sm font-semibold flex items-center gap-2"><Plane className="w-4 h-4" /> Segmentos de Voo</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-3">
                  {form.origin_iata && form.destination_iata && form.departure_date && (
                    <Button variant="outline" onClick={() => setEnrichmentOpen(true)} className="w-full" size="sm">
                      <Plane className="w-4 h-4 mr-2" /> Enriquecer com Amadeus
                    </Button>
                  )}
                  <FlightEnrichmentDialog open={enrichmentOpen} onOpenChange={setEnrichmentOpen}
                    origin={form.origin_iata} destination={form.destination_iata}
                    departureDate={form.departure_date} returnDate={form.return_date}
                    airline={form.airline} currentSegments={segments}
                    onApply={(newSegs) => setSegments(newSegs)} />

                  {segments.filter(s => s.origin_iata && s.destination_iata).length > 0 && (
                    <Card className="p-4 bg-muted/30"><FlightTimeline segments={segments} showAll /></Card>
                  )}

                  {(["ida", "volta"] as const).map((dir) => (
                    <div key={dir} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold capitalize flex items-center gap-2">
                          <Plane className={cn("w-4 h-4", dir === "volta" && "rotate-180")} /> {dir}
                        </h3>
                        <Button variant="outline" size="sm" onClick={() => addSegment(dir)}>
                          <Plus className="w-3 h-3 mr-1" /> Segmento
                        </Button>
                      </div>
                      {segments.map((seg, i) => seg.direction !== dir ? null : (
                        <Card key={i} className="p-4 space-y-3 bg-muted/20">
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
                            <div className="space-y-1"><Label className="text-xs">Classe</Label><Input value={seg.flight_class} onChange={(e) => updateSegment(i, "flight_class", e.target.value)} /></div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Air Cost */}
            <Card className="p-6">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">💰 Custo do Aéreo</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fornecedor</Label>
                    <Select value={form.air_supplier_id} onValueChange={(v) => { updateForm("air_supplier_id", v); updateForm("air_miles_program", ""); updateForm("air_miles_price", ""); }}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Emissão</Label>
                    <EmissionTypeSelector value={form.air_emission_type} onChange={(v) => updateForm("air_emission_type", v)} />
                  </div>
                </div>

                {form.air_emission_type === "milhas" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Programa de Milhas</Label>
                      <Select value={form.air_miles_program} onValueChange={(v) => {
                        updateForm("air_miles_program", v);
                        if (form.air_supplier_id && form.air_miles_qty) autoFillMilesPrice(form.air_supplier_id, v, form.air_miles_qty, "air");
                      }} disabled={!form.air_supplier_id}>
                        <SelectTrigger><SelectValue placeholder={form.air_supplier_id ? "Selecione" : "Selecione fornecedor"} /></SelectTrigger>
                        <SelectContent>{form.air_supplier_id && getSupplierPrograms(form.air_supplier_id).map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Qtd Milhas</Label><Input type="number" value={form.air_miles_qty} onChange={(e) => {
                      updateForm("air_miles_qty", e.target.value);
                      if (form.air_supplier_id && form.air_miles_program) autoFillMilesPrice(form.air_supplier_id, form.air_miles_program, e.target.value, "air");
                    }} /></div>
                    <div className="space-y-2"><Label>Preço Milheiro R$</Label><Input type="number" step="0.01" value={form.air_miles_price} onChange={(e) => updateForm("air_miles_price", e.target.value)} /></div>
                    <div className="space-y-2"><Label>Taxa em Dinheiro R$</Label><Input type="number" step="0.01" value={form.air_taxes} onChange={(e) => updateForm("air_taxes", e.target.value)} /></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Valor Pago em Dinheiro R$</Label><Input type="number" step="0.01" value={form.air_cash_value} onChange={(e) => updateForm("air_cash_value", e.target.value)} /></div>
                    <div className="space-y-2"><Label>Emissão por</Label><Input value={form.air_emission_source} onChange={(e) => updateForm("air_emission_source", e.target.value)} placeholder="Site, app..." /></div>
                  </div>
                )}

                {airCost > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3 text-sm font-medium">
                    Total Aéreo: <span className="text-primary">R$ {airCost.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </Card>
            <StepNavigation />
          </div>
        </TabsContent>

        {/* ═══════════════ 4. HOSPEDAGEM ═══════════════ */}
        <TabsContent value="hospedagem">
          <div className="space-y-4">
            <Card className="p-6">
              <SectionTitle icon={Hotel} title="Hospedagem" subtitle="Detalhes do hotel e reserva" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-2">
                  <Label>Hotel</Label>
                  <HotelAutocomplete value={form.hotel_name} onChange={(name) => updateForm("hotel_name", name)}
                    onSelect={(hotel) => {
                      updateForm("hotel_name", hotel.name); updateForm("hotel_city", hotel.city);
                      updateForm("hotel_country", hotel.country); updateForm("hotel_address", hotel.address);
                      updateForm("hotel_lat", hotel.lat); updateForm("hotel_lng", hotel.lng);
                      updateForm("hotel_place_id", hotel.place_id);
                    }} />
                  {form.hotel_city && <p className="text-xs text-muted-foreground">📍 {[form.hotel_city, form.hotel_country].filter(Boolean).join(", ")}</p>}
                </div>
                <div className="space-y-2"><Label>Destino</Label><Input value={form.hotel_city} onChange={(e) => updateForm("hotel_city", e.target.value)} /></div>
                <div className="space-y-2"><Label>Check-in</Label><Input type="date" value={form.hotel_checkin_date} onChange={(e) => updateForm("hotel_checkin_date", e.target.value)} /></div>
                <div className="space-y-2"><Label>Check-out</Label><Input type="date" value={form.hotel_checkout_date} onChange={(e) => updateForm("hotel_checkout_date", e.target.value)} /></div>
                <div className="space-y-2"><Label>Qtd Quartos</Label><Input type="number" min={1} value={form.hotel_qty_rooms} onChange={(e) => updateForm("hotel_qty_rooms", e.target.value)} /></div>
                <div className="space-y-2"><Label>Tipo de Quarto</Label><Input value={form.hotel_room} onChange={(e) => updateForm("hotel_room", e.target.value)} placeholder="Duplo, Suite..." /></div>
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
            </Card>

            {/* Hotel Cost */}
            <Card className="p-6">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">💰 Custo da Hospedagem</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fornecedor</Label>
                    <Select value={form.hotel_supplier_id} onValueChange={(v) => { updateForm("hotel_supplier_id", v); updateForm("hotel_miles_program", ""); updateForm("hotel_miles_price", ""); }}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Pagamento</Label>
                    <EmissionTypeSelector value={form.hotel_emission_type} onChange={(v) => updateForm("hotel_emission_type", v)} />
                  </div>
                </div>

                {form.hotel_emission_type === "milhas" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Programa de Pontos</Label>
                      <Select value={form.hotel_miles_program} onValueChange={(v) => {
                        updateForm("hotel_miles_program", v);
                        if (form.hotel_supplier_id && form.hotel_miles_qty) autoFillMilesPrice(form.hotel_supplier_id, v, form.hotel_miles_qty, "hotel");
                      }} disabled={!form.hotel_supplier_id}>
                        <SelectTrigger><SelectValue placeholder={form.hotel_supplier_id ? "Selecione" : "Selecione fornecedor"} /></SelectTrigger>
                        <SelectContent>{form.hotel_supplier_id && getSupplierPrograms(form.hotel_supplier_id).map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Qtd Pontos</Label><Input type="number" value={form.hotel_miles_qty} onChange={(e) => {
                      updateForm("hotel_miles_qty", e.target.value);
                      if (form.hotel_supplier_id && form.hotel_miles_program) autoFillMilesPrice(form.hotel_supplier_id, form.hotel_miles_program, e.target.value, "hotel");
                    }} /></div>
                    <div className="space-y-2"><Label>Preço Milheiro R$</Label><Input type="number" step="0.01" value={form.hotel_miles_price} onChange={(e) => updateForm("hotel_miles_price", e.target.value)} /></div>
                    <div className="space-y-2"><Label>Taxas R$</Label><Input type="number" step="0.01" value={form.hotel_taxes} onChange={(e) => updateForm("hotel_taxes", e.target.value)} /></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Valor em Dinheiro R$</Label><Input type="number" step="0.01" value={form.hotel_cash_value} onChange={(e) => updateForm("hotel_cash_value", e.target.value)} /></div>
                    <div className="space-y-2"><Label>Emissão por</Label><Input value={form.hotel_emission_source} onChange={(e) => updateForm("hotel_emission_source", e.target.value)} /></div>
                  </div>
                )}

                {hotelCost > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3 text-sm font-medium">
                    Total Hospedagem: <span className="text-primary">R$ {hotelCost.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </Card>
            <StepNavigation />
          </div>
        </TabsContent>

        {/* ═══════════════ 5. OUTROS PRODUTOS ═══════════════ */}
        <TabsContent value="produtos">
          <Card className="p-6">
            <SectionTitle icon={ShoppingBag} title="Outros Produtos" subtitle="Transfer, seguro, passeios, ingressos, aluguel de carro..." />

            {otherProducts.length === 0 && (
              <div className="text-center py-10 bg-muted/30 rounded-xl mb-4">
                <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-4">Nenhum produto adicional incluído</p>
                <Button onClick={addProduct}><Plus className="w-4 h-4 mr-2" /> Adicionar Produto</Button>
              </div>
            )}

            <div className="space-y-4">
              {otherProducts.map((product) => {
                const typeInfo = PRODUCT_TYPES.find(t => t.value === product.type);
                const Icon = typeInfo?.icon || ShoppingBag;
                return (
                  <Card key={product.id} className="p-5 bg-muted/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold">{typeInfo?.label || "Produto"}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeProduct(product.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tipo de Produto</Label>
                        <Select value={product.type} onValueChange={(v) => updateProduct(product.id, "type", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{PRODUCT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2"><Label>Fornecedor</Label><Input value={product.supplier} onChange={(e) => updateProduct(product.id, "supplier", e.target.value)} /></div>
                      <div className="space-y-2"><Label>Descrição</Label><Input value={product.description} onChange={(e) => updateProduct(product.id, "description", e.target.value)} placeholder="Detalhes do produto" /></div>
                      <div className="space-y-2"><Label>Data</Label><Input type="date" value={product.date} onChange={(e) => updateProduct(product.id, "date", e.target.value)} /></div>
                      <div className="space-y-2"><Label>Código de Reserva</Label><Input value={product.reservation_code} onChange={(e) => updateProduct(product.id, "reservation_code", e.target.value.toUpperCase())} placeholder="Localizador / confirmação" className="font-mono" /></div>
                    </div>

                    <div className="space-y-2">
                      <Label>Tipo de Emissão</Label>
                      <EmissionTypeSelector value={product.emission_type} onChange={(v) => updateProduct(product.id, "emission_type", v)} />
                    </div>

                    {product.emission_type === "milhas" ? (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2"><Label>Programa</Label><Input value={product.miles_program} onChange={(e) => updateProduct(product.id, "miles_program", e.target.value)} /></div>
                        <div className="space-y-2"><Label>Qtd Milhas</Label><Input type="number" value={product.miles_qty} onChange={(e) => updateProduct(product.id, "miles_qty", e.target.value)} /></div>
                        <div className="space-y-2"><Label>Taxa R$</Label><Input type="number" step="0.01" value={product.miles_tax} onChange={(e) => updateProduct(product.id, "miles_tax", e.target.value)} /></div>
                      </div>
                    ) : (
                      <div className="space-y-2"><Label>Valor Pago R$</Label><Input type="number" step="0.01" value={product.cash_value} onChange={(e) => updateProduct(product.id, "cash_value", e.target.value)} /></div>
                    )}
                  </Card>
                );
              })}
            </div>

            {otherProducts.length > 0 && (
              <Button variant="outline" onClick={addProduct} className="w-full mt-4"><Plus className="w-4 h-4 mr-2" /> Adicionar Outro Produto</Button>
            )}
          </Card>
        </TabsContent>

        {/* ═══════════════ 6. PAGAMENTOS E CUSTOS ═══════════════ */}
        <TabsContent value="pagamentos">
          <Card className="p-6">
            <SectionTitle icon={DollarSign} title="Pagamentos da Venda" subtitle="Registre um ou mais pagamentos (PIX, cartão, transferência...)" />

            <SalePaymentsEditor
              payments={salePayments}
              onChange={setSalePayments}
              totalSaleValue={receivedValue > 0 && salePayments.length === 0 ? receivedValue : undefined}
            />

            {/* Fallback: valor manual se nenhum pagamento registrado */}
            {salePayments.length === 0 && (
              <div className="mt-6 space-y-2 border-t pt-4">
                <Label className="text-xs text-muted-foreground">Ou informe o valor recebido manualmente:</Label>
                <Input data-testid="input-received-value" type="number" step="0.01" value={form.received_value} onChange={(e) => updateForm("received_value", e.target.value)} placeholder="Valor total recebido" />
              </div>
            )}

            {/* Cost summary */}
            <div className="border-t pt-5 mt-6">
              <h3 className="text-sm font-semibold mb-3">📊 Resumo de Custos</h3>
              <div className="space-y-2">
                {airCost > 0 && (
                  <div className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-lg">
                    <span className="text-sm flex items-center gap-2"><Plane className="w-4 h-4" /> Aéreo</span>
                    <span className="text-sm font-semibold">R$ {airCost.toFixed(2)}</span>
                  </div>
                )}
                {hotelCost > 0 && (
                  <div className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-lg">
                    <span className="text-sm flex items-center gap-2"><Hotel className="w-4 h-4" /> Hospedagem</span>
                    <span className="text-sm font-semibold">R$ {hotelCost.toFixed(2)}</span>
                  </div>
                )}
                {productsCost > 0 && (
                  <div className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-lg">
                    <span className="text-sm flex items-center gap-2"><ShoppingBag className="w-4 h-4" /> Outros Produtos</span>
                    <span className="text-sm font-semibold">R$ {productsCost.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <Card className="p-4 mt-4 bg-primary/5 border-primary/20">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <span className="text-muted-foreground">Custo Total</span>
                  <span className="font-bold text-right">R$ {totalCost.toFixed(2)}</span>
                  <span className="text-muted-foreground">Total Milhas Utilizadas</span>
                  <span className="font-bold text-right">{totalMiles.toLocaleString()}</span>
                  <span className="text-muted-foreground">Valor Recebido</span>
                  <span className="font-bold text-right text-success">R$ {receivedValue.toFixed(2)}</span>
                  <div className="col-span-2 border-t my-1" />
                  <span className="text-muted-foreground font-semibold">Lucro</span>
                  <span className={cn("font-bold text-right text-lg", profit >= 0 ? "text-primary" : "text-destructive")}>R$ {profit.toFixed(2)}</span>
                  <span className="text-muted-foreground">Margem</span>
                  <span className="font-bold text-right text-accent">{margin.toFixed(1)}%</span>
                </div>
              </Card>
            </div>
          </Card>
        </TabsContent>

        {/* ═══════════════ 7. ANEXOS / IA ═══════════════ */}
        <TabsContent value="anexos">
          <Card className="p-6">
            <SectionTitle icon={Sparkles} title="Anexos e Extração com IA" subtitle="Envie comprovantes e deixe a IA preencher automaticamente" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Upload area */}
              <div className="space-y-4">
                <div
                  className={cn("border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer", dragOver ? "border-primary bg-primary/5" : "border-border")}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                  onClick={() => document.getElementById("file-upload-new")?.click()}
                >
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground mb-1">Arraste arquivos ou clique</p>
                  <p className="text-xs text-muted-foreground">PDF, imagens, prints de emissão, WhatsApp, comprovantes</p>
                  <input type="file" accept="image/*,.pdf,.csv,.xlsx" multiple onChange={(e) => handleFiles(e.target.files)} className="hidden" id="file-upload-new" />
                </div>

                <Button variant="outline" className="w-full" onClick={() => document.getElementById("camera-capture")?.click()}>
                  <Camera className="w-4 h-4 mr-2" /> Abrir Câmera
                </Button>
                <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFiles(e.target.files)} className="hidden" id="camera-capture" />

                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {files.map((f, i) => (
                      <Badge key={i} variant="secondary" className="flex items-center gap-1 py-1">
                        <Paperclip className="w-3 h-3" />
                        {f.name.slice(0, 25)}
                        <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} className="ml-1 hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Text input */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Texto complementar</Label>
                  <Textarea placeholder="Cole informações: conversa do WhatsApp, dados do cliente, detalhes da reserva..." value={textInput} onChange={(e) => setTextInput(e.target.value)} rows={6} />
                </div>
              </div>
            </div>

            <Button onClick={handleExtract} disabled={extracting} className="w-full mt-6" size="lg">
              {extracting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Extraindo com IA...</> : <><Sparkles className="w-4 h-4 mr-2" /> Extrair Dados com IA</>}
            </Button>

            {extraction && (
              <Card className="p-4 bg-muted/50 space-y-3 mt-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" /> Dados Extraídos {confidenceBadge(extraction.confidence)}
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
                        <span className="text-xs font-medium flex items-center gap-1">{String(v).slice(0, 30)} {confidenceBadge(c)}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">✅ Campos preenchidos automaticamente nas abas correspondentes. Revise antes de salvar.</p>
              </Card>
            )}
          </Card>
        </TabsContent>

        {/* ═══════════════ 8. REVISÃO FINAL ═══════════════ */}
        <TabsContent value="revisao">
          <Card className="p-6">
            <SectionTitle icon={Eye} title="Revisão Final" subtitle="Confira todos os dados antes de salvar" />

            <div className="space-y-5">
              {/* Sale info */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><FileText className="w-4 h-4 text-primary" /> Dados da Venda</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Nome</span><span className="font-medium">{form.name || "—"}</span>
                  <span className="text-muted-foreground">Vendedor</span><span className="font-medium">{user?.email || "—"}</span>
                  <span className="text-muted-foreground">Data</span><span>{form.close_date || "—"}</span>
                  <span className="text-muted-foreground">Pagamentos</span>
                  <span>{salePayments.length > 0 ? `${salePayments.length} pagamento(s)` : form.payment_method || "—"}</span>
                </div>
                {salePayments.length > 0 && (
                  <div className="space-y-1 mt-2 pt-2 border-t">
                    {salePayments.map((p, i) => (
                      <div key={p.id} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {i + 1}. {p.payment_method}{p.gateway ? ` (${p.gateway})` : ""}{p.installments > 1 ? ` ${p.installments}x` : ""}
                        </span>
                        <span className="font-medium">R$ {p.gross_value.toFixed(2)}{p.fee_total > 0 ? ` (líq: R$ ${p.net_value.toFixed(2)})` : ""}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Passengers */}
              <div className="bg-muted/30 rounded-xl p-4">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Users className="w-4 h-4 text-primary" /> Passageiros ({selectedPassengers.length})</h3>
                <div className="text-sm space-y-1">
                  <p>{form.adults} adulto(s), {form.children} criança(s)</p>
                  {selectedPassengers.map(p => (
                    <Badge key={p.id} variant="secondary" className="mr-1">{p.full_name}</Badge>
                  ))}
                  {selectedPassengers.length === 0 && <p className="text-muted-foreground">Nenhum passageiro vinculado</p>}
                </div>
              </div>

              {/* Air */}
              {(form.origin_iata || form.airline) && (
                <div className="bg-muted/30 rounded-xl p-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Plane className="w-4 h-4 text-primary" /> Aéreo</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Rota</span><span className="font-mono">{form.origin_iata || "?"} → {form.destination_iata || "?"}</span>
                    <span className="text-muted-foreground">Datas</span><span>{form.departure_date || "?"} — {form.return_date || "?"}</span>
                    <span className="text-muted-foreground">Companhia</span><span>{form.airline || "—"}</span>
                    <span className="text-muted-foreground">Segmentos</span><span>{segments.filter(s => s.origin_iata).length} trecho(s)</span>
                    <span className="text-muted-foreground">Custo</span><span className="font-semibold">R$ {airCost.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Hotel */}
              {form.hotel_name && (
                <div className="bg-muted/30 rounded-xl p-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Hotel className="w-4 h-4 text-primary" /> Hospedagem</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Hotel</span><span>{form.hotel_name}</span>
                    <span className="text-muted-foreground">Datas</span><span>{form.hotel_checkin_date || "?"} — {form.hotel_checkout_date || "?"}</span>
                    <span className="text-muted-foreground">Custo</span><span className="font-semibold">R$ {hotelCost.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Other products */}
              {otherProducts.length > 0 && (
                <div className="bg-muted/30 rounded-xl p-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><ShoppingBag className="w-4 h-4 text-primary" /> Outros Produtos ({otherProducts.length})</h3>
                  <div className="space-y-1 text-sm">
                    {otherProducts.map(p => (
                      <div key={p.id} className="flex justify-between">
                        <span>{PRODUCT_TYPES.find(t => t.value === p.type)?.label} — {p.description || "Sem descrição"}</span>
                        <span className="font-semibold">R$ {(p.emission_type === "pagante" ? parseFloat(p.cash_value) || 0 : parseFloat(p.miles_tax) || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Financial summary */}
              <Card className="p-5 bg-primary/5 border-primary/20">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><DollarSign className="w-4 h-4 text-primary" /> Resumo Financeiro</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <span className="text-muted-foreground">Custo Total</span>
                  <span className="font-bold text-right">R$ {totalCost.toFixed(2)}</span>
                  <span className="text-muted-foreground">Total de Milhas</span>
                  <span className="font-bold text-right">{totalMiles.toLocaleString()}</span>
                  <span className="text-muted-foreground">Valor Recebido</span>
                  <span className="font-bold text-right text-success">R$ {receivedValue.toFixed(2)}</span>
                  <div className="col-span-2 border-t my-1" />
                  <span className="font-semibold">Lucro</span>
                  <span className={cn("font-bold text-right text-xl", profit >= 0 ? "text-primary" : "text-destructive")}>R$ {profit.toFixed(2)}</span>
                  <span className="text-muted-foreground">Margem</span>
                  <span className="font-bold text-right text-accent text-lg">{margin.toFixed(1)}%</span>
                </div>
              </Card>

              <Button data-testid="btn-save-sale" className="w-full" size="lg" onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : <><Check className="w-4 h-4 mr-2" /> Confirmar e Salvar Venda</>}
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
