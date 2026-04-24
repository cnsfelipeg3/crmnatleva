import { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
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
  Check, Upload, Sparkles, Loader2, Plus, Trash2, Plane, Hotel, CreditCard,
  ShoppingBag, Paperclip, Eye, ChevronDown, Camera, Car, Shield, Ticket,
  UtensilsCrossed, MapPin, CalendarDays, Users, FileText, DollarSign, Train,
  ArrowLeft, ArrowRight, AlertCircle, CheckCircle2, Building2, UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import FlightTimeline, { type FlightSegment } from "@/components/FlightTimeline";
import FlightRegistrationSection from "@/components/FlightRegistrationSection";
import AirCostBlocksEditor, { type AirCostBlock, createEmptyAirCostBlock, calcBlockCost } from "@/components/AirCostBlocksEditor";
import HotelEntriesEditor, { type HotelEntry, createEmptyHotelEntry, calcHotelCost } from "@/components/HotelEntriesEditor";
import { classifyItinerary, assignDirections } from "@/lib/itineraryClassifier";
import { smartCapitalizeName } from "@/lib/nameUtils";
import PassengerSelector, { type SelectedPassenger } from "@/components/PassengerSelector";
import SalePaymentsEditor, { type SalePayment } from "@/components/SalePaymentsEditor";
import TariffConditionsCard, { type TariffCondition, EMPTY_TARIFF } from "@/components/TariffConditionsCard";
import { useQuery } from "@tanstack/react-query";
import { getProductSlug } from "@/lib/productTypes";

/* ─── Types ────────────────────────────────────────────── */

interface ExtractedField { value: any; confidence: number; }
interface ExtractionResult {
  fields: Record<string, ExtractedField | ExtractedField[]>;
  raw_text?: string; confidence?: number; conflicts?: any[];
}

interface OtherProduct {
  id: string; type: string; description: string; supplier_id: string;
  date: string; emission_type: "milhas" | "pagante";
  miles_program: string; miles_qty: string; miles_tax: string; cash_value: string;
  reservation_code: string;
  tariff: TariffCondition;
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
  { value: "roteiro", label: "Roteiro Personalizado", icon: MapPin },
  { value: "outros", label: "Outros", icon: ShoppingBag },
];

const TAB_IDS = ["info", "passageiros", "aereo", "hospedagem", "produtos", "pagamentos", "anexos", "revisao"] as const;
type TabId = typeof TAB_IDS[number];

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* ─── Component ────────────────────────────────────────── */

export default function NewSale() {
  const [activeTab, setActiveTab] = useState<string>("info");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const { id: editId } = useParams<{ id: string }>();
  const isEditMode = !!editId;

  // Upload & extraction
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [textInput, setTextInput] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);

  // Form (basic sale info)
  const [form, setForm] = useState({
    name: "", close_date: "", payment_method: "", observations: "",
    link_chat: "", adults: 1, children: 0, children_ages: "",
    origin_iata: "", destination_iata: "", departure_date: "", return_date: "",
    airline: "", flight_class: "", locator: "", connections: "", miles_program: "",
    emission_source: "", lead_type: "agencia" as "agencia" | "organico",
    // Payment
    received_value: "", paid_value: "", payment_gateway: "", payment_installments: "1",
  });

  const [segments, setSegments] = useState<FlightSegment[]>([
    { ...defaultSegment, direction: "ida", segment_order: 1 },
  ]);
  const [groupLocators, setGroupLocators] = useState<string[]>([]);
  
  // NEW: Air cost blocks (replaces single air cost)
  const [airCostBlocks, setAirCostBlocks] = useState<AirCostBlock[]>([]);
  
  // NEW: Multiple hotels (replaces single hotel)
  const [hotelEntries, setHotelEntries] = useState<HotelEntry[]>([]);
  
  const [otherProducts, setOtherProducts] = useState<OtherProduct[]>([]);
  const [salePayments, setSalePayments] = useState<SalePayment[]>([]);
  const [airTariff, setAirTariff] = useState<TariffCondition>({ ...EMPTY_TARIFF });
  const [hotelTariff, setHotelTariff] = useState<TariffCondition>({ ...EMPTY_TARIFF });
  const [saving, setSaving] = useState(false);
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

  const [editLoading, setEditLoading] = useState(false);

  // Load existing sale data in edit mode
  useEffect(() => {
    if (!editId) return;
    setEditLoading(true);
    (async () => {
      try {
        const { data: sale } = await supabase.from("sales").select("*").eq("id", editId).single();
        if (!sale) { toast({ title: "Venda não encontrada", variant: "destructive" }); navigate("/sales"); return; }

        setForm({
          name: sale.name || "", close_date: sale.close_date || "", payment_method: sale.payment_method || "",
          observations: sale.observations || "", link_chat: sale.link_chat || "",
          adults: sale.adults || 1, children: sale.children || 0,
          children_ages: sale.children_ages ? (sale.children_ages as number[]).join(", ") : "",
          origin_iata: sale.origin_iata || "", destination_iata: sale.destination_iata || "",
          departure_date: sale.departure_date || "", return_date: sale.return_date || "",
          airline: sale.airline || "", flight_class: sale.flight_class || "",
          locator: (sale.locators as string[])?.join(", ") || "", connections: (sale.connections as string[])?.join(", ") || "",
          miles_program: sale.miles_program || "", emission_source: sale.emission_source || "",
          lead_type: (sale.lead_type as "agencia" | "organico") || "agencia",
          received_value: sale.received_value ? String(sale.received_value) : "",
          paid_value: "", payment_gateway: "", payment_installments: "1",
        });
        setGroupLocators((sale.locators as string[]) || []);

        // Load flight segments
        const { data: segs } = await supabase.from("flight_segments").select("*").eq("sale_id", editId).order("segment_order");
        const loadedSegs = (segs && segs.length > 0) ? segs as FlightSegment[] : [];
        if (loadedSegs.length > 0) setSegments(loadedSegs);

        // Build a lookup of valid segments for index matching
        const validSegs = loadedSegs.filter(s => s.origin_iata && s.destination_iata);

        // Load cost items and reconstruct blocks
        const { data: costs } = await supabase.from("cost_items").select("*").eq("sale_id", editId);
        if (costs) {
          const airBlocks: AirCostBlock[] = [];
          const hotels: HotelEntry[] = [];
          const prods: OtherProduct[] = [];

          for (const c of costs) {
            if (c.category === "aereo") {
              // Reconstruct segment_indices from description parenthetical
              let reconstructedIndices: number[] = [];
              const parenMatch = (c.description || "").match(/\(([^)]+)\)$/);
              if (parenMatch) {
                const segLabels = parenMatch[1].split(",").map(s => s.trim());
                for (const label of segLabels) {
                  const [orig, dest] = label.split("→").map(s => s.trim());
                  if (orig && dest) {
                    const idx = validSegs.findIndex(s => s.origin_iata === orig && s.destination_iata === dest);
                    if (idx >= 0 && !reconstructedIndices.includes(idx)) reconstructedIndices.push(idx);
                  }
                }
              }

              airBlocks.push({
                ...createEmptyAirCostBlock(),
                id: c.id,
                label: (c.description || "").replace("Aéreo: ", "").split(" (")[0],
                emission_type: (c.miles_quantity && c.miles_quantity > 0) ? "milhas" : "pagante",
                supplier_id: c.supplier_id || "",
                miles_program: c.miles_program || "",
                miles_qty: c.miles_quantity ? String(c.miles_quantity) : "",
                miles_price: c.miles_price_per_thousand ? String(c.miles_price_per_thousand) : "",
                taxes: c.taxes ? String(c.taxes) : "",
                cash_value: c.cash_value ? String(c.cash_value) : "",
                emission_source: c.emission_source || "",
                reservation_code: c.reservation_code || "",
                segment_indices: reconstructedIndices,
              });
            } else if (c.category === "hotel") {
              const h = createEmptyHotelEntry();
              h.id = c.id;
              h.hotel_name = (c.description || "").replace("Hotel: ", "").split(" (")[0];
              h.emission_type = (c.miles_quantity && c.miles_quantity > 0) ? "milhas" : "pagante";
              h.supplier_id = c.supplier_id || "";
              h.miles_program = c.miles_program || "";
              h.miles_qty = c.miles_quantity ? String(c.miles_quantity) : "";
              h.miles_price = c.miles_price_per_thousand ? String(c.miles_price_per_thousand) : "";
              h.taxes = c.taxes ? String(c.taxes) : "";
              h.cash_value = c.cash_value ? String(c.cash_value) : "";
              h.hotel_reservation_code = c.reservation_code || "";
              hotels.push(h);
            } else {
              prods.push({
                id: c.id, type: c.product_type || "outros",
                description: (c.description || "").split(" - ").slice(1).join(" - "),
                supplier_id: c.supplier_id || "", date: "",
                emission_type: (c.miles_quantity && c.miles_quantity > 0) ? "milhas" : "pagante",
                miles_program: "", miles_qty: c.miles_quantity ? String(c.miles_quantity) : "",
                miles_tax: c.taxes ? String(c.taxes) : "",
                cash_value: c.cash_value ? String(c.cash_value) : "",
                reservation_code: c.reservation_code || "",
                tariff: { ...EMPTY_TARIFF },
              });
            }
          }
          if (airBlocks.length > 0) setAirCostBlocks(airBlocks);
          if (hotels.length > 0) setHotelEntries(hotels);
          if (prods.length > 0) setOtherProducts(prods);
        }

        // Load passengers
        const { data: paxLinks } = await supabase.from("sale_passengers").select("passenger_id, passengers(id, full_name, cpf, birth_date)").eq("sale_id", editId);
        if (paxLinks) {
          setSelectedPassengers(paxLinks.map((l: any) => ({
            id: l.passengers.id,
            full_name: l.passengers.full_name,
            cpf: l.passengers.cpf || "",
            birth_date: l.passengers.birth_date || "",
            passport_number: l.passengers.passport_number || "",
            passport_expiry: l.passengers.passport_expiry || "",
            phone: l.passengers.phone || "",
            incomplete: false,
          })));
        }

        // Load sale payments
        const { data: payments } = await supabase.from("sale_payments").select("*").eq("sale_id", editId);
        if (payments && payments.length > 0) {
          setSalePayments(payments.map((p: any) => ({
            id: p.id,
            payment_method: p.payment_method || "",
            gateway: p.gateway || "",
            installments: p.installments || 1,
            gross_value: p.gross_value || 0,
            fee_percent: p.fee_percent || 0,
            fee_fixed: p.fee_fixed || 0,
            fee_total: p.fee_total || 0,
            net_value: p.net_value || 0,
            receiving_account_id: p.receiving_account_id || "",
            payment_date: p.payment_date || "",
            due_date: p.due_date || "",
            status: p.status || "pago",
            notes: p.notes || "",
          })));
        }

        // Load hotel data from sale itself for first hotel entry
        if (sale.hotel_name && hotelEntries.length === 0) {
          const h = createEmptyHotelEntry();
          h.hotel_name = sale.hotel_name || "";
          h.hotel_room = sale.hotel_room || "";
          h.hotel_meal_plan = sale.hotel_meal_plan || "";
          h.hotel_reservation_code = sale.hotel_reservation_code || "";
          h.hotel_checkin_date = sale.hotel_checkin_date || "";
          h.hotel_checkout_date = sale.hotel_checkout_date || "";
          h.hotel_city = sale.hotel_city || "";
          h.hotel_country = sale.hotel_country || "";
          h.hotel_address = sale.hotel_address || "";
          setHotelEntries([h]);
        }
      } catch (err) {
        console.error("Error loading sale for edit:", err);
      } finally {
        setEditLoading(false);
      }
    })();
  }, [editId]);

  const getSupplierPrograms = (supplierId: string) => {
    const programs = allMilesPrograms.filter((p: any) => p.supplier_id === supplierId);
    return [...new Set(programs.map((p: any) => p.program_name))];
  };

  const autoFillMilesPriceCallback = (supplierId: string, programName: string, milesQty: string, callback: (price: string) => void) => {
    const qty = parseInt(milesQty) || 0;
    const tiers = allMilesPrograms
      .filter((p: any) => p.supplier_id === supplierId && p.program_name === programName && p.is_active)
      .sort((a: any, b: any) => a.min_miles - b.min_miles);
    if (tiers.length === 0) return;
    const tier = tiers.find((t: any) => t.max_miles ? qty >= t.min_miles && qty <= t.max_miles : qty >= t.min_miles) || tiers[tiers.length - 1];
    if (tier) callback(String(tier.price_per_thousand));
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
          connections: get("connections") || prev.connections,
          payment_method: get("payment_method") || prev.payment_method,
          observations: get("observations") || prev.observations,
          emission_source: get("emission_source") || prev.emission_source,
          adults: f.adults?.value ? Number(f.adults.value) : prev.adults,
          children: f.children?.value ? Number(f.children.value) : prev.children,
          children_ages: f.children_ages?.value ? (Array.isArray(f.children_ages.value) ? f.children_ages.value.join(", ") : String(f.children_ages.value)) : prev.children_ages,
          received_value: get("received_value") || prev.received_value,
        }));

        // Extract hotel info into first hotel entry
        const hotelName = get("hotel_name");
        if (hotelName && hotelEntries.length === 0) {
          const entry = createEmptyHotelEntry();
          entry.hotel_name = hotelName;
          entry.hotel_reservation_code = get("hotel_code") || "";
          entry.hotel_room = get("hotel_room") || "";
          entry.hotel_meal_plan = get("hotel_meal_plan") || "";
          setHotelEntries([entry]);
        }

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
      id: crypto.randomUUID(), type: "transfer", description: "", supplier_id: "",
      date: "", emission_type: "pagante", miles_program: "", miles_qty: "",
      miles_tax: "", cash_value: "", reservation_code: "",
      tariff: { ...EMPTY_TARIFF },
    }]);
  };
  const updateProduct = (id: string, field: string, value: any) => {
    setOtherProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };
  const removeProduct = (id: string) => {
    setOtherProducts(prev => prev.filter(p => p.id !== id));
  };

  // ─── Cost calculations ─────────────────────────────
  const airCost = airCostBlocks.reduce((sum, b) => sum + calcBlockCost(b), 0);
  const hotelCost = hotelEntries.reduce((sum, h) => sum + calcHotelCost(h), 0);

  const productsCost = otherProducts.reduce((sum, p) => {
    if (p.emission_type === "pagante") return sum + (parseFloat(p.cash_value) || 0);
    const qty = parseFloat(p.miles_qty) || 0;
    const tax = parseFloat(p.miles_tax) || 0;
    return sum + tax;
  }, 0);

  const totalCost = airCost + hotelCost + productsCost;
  const paymentsNet = salePayments.reduce((s, p) => s + p.net_value, 0);
  const receivedValue = paymentsNet > 0 ? paymentsNet : parseFloat(form.received_value) || 0;
  const profit = receivedValue - totalCost;
  const margin = receivedValue > 0 ? (profit / receivedValue) * 100 : 0;

  const totalMiles = airCostBlocks.filter(b => b.emission_type === "milhas").reduce((s, b) => s + (parseFloat(b.miles_qty) || 0), 0)
    + hotelEntries.filter(h => h.emission_type === "milhas").reduce((s, h) => s + (parseFloat(h.miles_qty) || 0), 0)
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
      // Use first hotel for legacy fields (declarado antes para alimentar a inferência)
      const firstHotel = hotelEntries[0];

      // Monta array de products como SLUGS canônicos via fonte única (productTypes.inferProductSlugsFromSale)
      const products = inferProductSlugsFromSale({
        airline: form.airline,
        origin_iata: form.origin_iata,
        destination_iata: form.destination_iata,
        departure_date: form.departure_date,
        hotel_name: firstHotel?.hotel_name,
        hotel_city: firstHotel?.hotel_city,
        hotel_checkin_date: firstHotel?.hotel_checkin_date,
        hotel_reservation_code: firstHotel?.hotel_reservation_code,
        hotel_address: firstHotel?.hotel_address,
        airCost,
        hotelCost,
        flightSegmentsCount: segments.length,
        hotelEntriesCount: hotelEntries.length,
        explicitOtherSlugs: otherProducts.map(p => p.type),
      });

      // Auto-derive origin/destination from segments if not set manually
      const validSegs = segments.filter(s => s.origin_iata && s.destination_iata);
      const idaSegs = validSegs.filter(s => s.direction === "ida");
      const derivedOrigin = form.origin_iata || (idaSegs.length > 0 ? idaSegs[0].origin_iata : validSegs[0]?.origin_iata) || null;
      const derivedDestination = form.destination_iata || (idaSegs.length > 0 ? idaSegs[idaSegs.length - 1].destination_iata : validSegs[validSegs.length - 1]?.destination_iata) || null;

      const salePayload = {
        name: smartCapitalizeName(form.name),
        seller_id: user?.id,
        close_date: form.close_date || null,
        payment_method: salePayments.length > 0 ? salePayments.map(p => p.payment_method).join(", ") : form.payment_method || null,
        products, observations: form.observations || null,
        link_chat: form.link_chat || null,
        origin_iata: derivedOrigin, origin_city: null,
        destination_iata: derivedDestination, destination_city: null,
        departure_date: form.departure_date || null, return_date: form.return_date || null,
        airline: form.airline || null, flight_class: form.flight_class || null,
        locators: groupLocators.length > 0 ? groupLocators : (form.locator ? [form.locator] : []),
        connections: form.connections ? form.connections.split(",").map(c => c.trim()) : [],
        miles_program: form.miles_program || null,
        emission_source: form.emission_source || null,
        hotel_name: firstHotel?.hotel_name || null,
        hotel_room: firstHotel?.hotel_room || null,
        hotel_meal_plan: firstHotel?.hotel_meal_plan || null,
        hotel_reservation_code: firstHotel?.hotel_reservation_code || null,
        hotel_checkin_date: firstHotel?.hotel_checkin_date || null,
        hotel_checkout_date: firstHotel?.hotel_checkout_date || null,
        hotel_city: firstHotel?.hotel_city || null,
        hotel_country: firstHotel?.hotel_country || null,
        hotel_address: firstHotel?.hotel_address || null,
        hotel_lat: firstHotel?.hotel_lat || null,
        hotel_lng: firstHotel?.hotel_lng || null,
        hotel_place_id: firstHotel?.hotel_place_id || null,
        adults: form.adults, children: form.children,
        children_ages: form.children_ages ? form.children_ages.split(",").map(a => parseInt(a.trim())).filter(Boolean) : [],
        received_value: receivedValue, total_cost: totalCost,
        profit, margin: parseFloat(margin.toFixed(2)),
        lead_type: form.lead_type,
      };

      let saleId: string;

      if (isEditMode && editId) {
        // UPDATE existing sale
        const { error: updateError } = await supabase.from("sales").update(salePayload).eq("id", editId);
        if (updateError) throw updateError;
        saleId = editId;

        // Delete old related data to re-insert
        await Promise.all([
          supabase.from("cost_items").delete().eq("sale_id", saleId),
          supabase.from("flight_segments").delete().eq("sale_id", saleId),
          supabase.from("sale_passengers").delete().eq("sale_id", saleId),
          supabase.from("sale_payments").delete().eq("sale_id", saleId),
          supabase.from("tariff_conditions").delete().eq("sale_id", saleId),
        ]);
      } else {
        // INSERT new sale
        const { data: saleData, error: saleError } = await supabase.from("sales").insert({
          ...salePayload,
          status: "Rascunho", created_by: user?.id,
        }).select("id").single();
        if (saleError) throw saleError;
        saleId = (saleData as any).id;
      }

      // Cost items — one per air cost block + one per hotel + others
      const costItems: any[] = [];
      
      for (const block of airCostBlocks) {
        const cost = calcBlockCost(block);
        if (cost > 0 || block.reservation_code) {
          const segmentLabels = block.segment_indices
            .map(i => {
              const seg = segments.filter(s => s.origin_iata && s.destination_iata)[i];
              return seg ? `${seg.origin_iata}→${seg.destination_iata}` : "";
            })
            .filter(Boolean)
            .join(", ");
          
          costItems.push({
            sale_id: saleId,
            category: "aereo",
            description: `Aéreo: ${block.label}${segmentLabels ? ` (${segmentLabels})` : ""}`,
            cash_value: block.emission_type === "pagante" ? parseFloat(block.cash_value) || 0 : 0,
            miles_quantity: parseInt(block.miles_qty) || 0,
            miles_price_per_thousand: parseFloat(block.miles_price) || 0,
            taxes: parseFloat(block.taxes) || 0,
            taxes_included_in_cash: false,
            emission_source: block.emission_source || null,
            miles_program: block.miles_program || null,
            miles_cost_brl: block.emission_type === "milhas" ? cost : 0,
            total_item_cost: cost,
            supplier_id: block.supplier_id || null,
            reservation_code: block.reservation_code || null,
          });
        }
      }

      for (const hotel of hotelEntries) {
        const cost = calcHotelCost(hotel);
        if (cost > 0 || hotel.hotel_name) {
          costItems.push({
            sale_id: saleId,
            category: "hotel",
            description: `Hotel: ${hotel.hotel_name || "Sem nome"}${hotel.hotel_city ? ` (${hotel.hotel_city})` : ""}`,
            cash_value: hotel.emission_type === "pagante" ? parseFloat(hotel.cash_value) || 0 : 0,
            miles_quantity: parseInt(hotel.miles_qty) || 0,
            miles_price_per_thousand: parseFloat(hotel.miles_price) || 0,
            taxes: parseFloat(hotel.taxes) || 0,
            taxes_included_in_cash: false,
            emission_source: hotel.emission_source || null,
            miles_program: hotel.miles_program || null,
            miles_cost_brl: hotel.emission_type === "milhas" ? cost : 0,
            total_item_cost: cost,
            supplier_id: hotel.supplier_id || null,
            reservation_code: hotel.hotel_reservation_code || null,
          });
        }
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
            supplier_id: p.supplier_id || null,
          });
        }
      }
      if (costItems.length > 0) await supabase.from("cost_items").insert(costItems);

      // Tariff conditions
      const tariffConditions: any[] = [];
      if (airTariff.fare_name) {
        tariffConditions.push({ sale_id: saleId, product_type: "aereo", product_label: "Aéreo", ...airTariff });
      }
      if (hotelTariff.fare_name) {
        tariffConditions.push({ sale_id: saleId, product_type: "hotel", product_label: "Hospedagem", ...hotelTariff });
      }
      // Product-level tariffs
      for (const p of otherProducts) {
        if (p.tariff.fare_name) {
          const label = PRODUCT_TYPES.find(t => t.value === p.type)?.label || p.type;
          tariffConditions.push({ sale_id: saleId, product_type: p.type, product_label: `${label} — ${p.description || ""}`.trim(), ...p.tariff });
        }
      }
      if (tariffConditions.length > 0) await supabase.from("tariff_conditions").insert(tariffConditions);

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

      toast({ title: isEditMode ? "Venda atualizada com sucesso!" : "Venda salva com sucesso!" });
      try { await Promise.all([supabase.functions.invoke("checkin-generate"), supabase.functions.invoke("lodging-generate")]); } catch {}
      navigate(isEditMode ? `/sales/${editId}` : "/sales");
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

  // ─── Render ─────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-serif text-foreground">{isEditMode ? "Editar Venda" : "Nova Venda"}</h1>
        <p className="text-sm text-muted-foreground">{isEditMode ? "Edite os detalhes desta venda" : "Registre todos os detalhes da viagem de forma organizada"}</p>
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
                <Label>Origem do Lead</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => updateForm("lead_type", "agencia")}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                      form.lead_type === "agencia"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/30 hover:border-border/60"
                    )}
                  >
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", form.lead_type === "agencia" ? "bg-primary/15" : "bg-muted")}>
                      <Building2 className={cn("w-4.5 h-4.5", form.lead_type === "agencia" ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div>
                      <p className={cn("text-sm font-medium", form.lead_type === "agencia" ? "text-foreground" : "text-muted-foreground")}>Lead da Agência</p>
                      <p className="text-[11px] text-muted-foreground">Comissão 15% sobre lucro</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateForm("lead_type", "organico")}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                      form.lead_type === "organico"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/30 hover:border-border/60"
                    )}
                  >
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", form.lead_type === "organico" ? "bg-primary/15" : "bg-muted")}>
                      <UserCheck className={cn("w-4.5 h-4.5", form.lead_type === "organico" ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div>
                      <p className={cn("text-sm font-medium", form.lead_type === "organico" ? "text-foreground" : "text-muted-foreground")}>Lead Orgânico</p>
                      <p className="text-[11px] text-muted-foreground">Comissão 30% sobre lucro</p>
                    </div>
                  </button>
                </div>
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

            <div className="border-t pt-5">
              <PassengerSelector selected={selectedPassengers} onChange={setSelectedPassengers} />
            </div>

            <StepNavigation />
          </Card>
        </TabsContent>

        {/* ═══════════════ 3. AÉREO ═══════════════ */}
        <TabsContent value="aereo">
          <div className="space-y-4">
            {/* Flight structure */}
            <FlightRegistrationSection
              segments={segments}
              onSegmentsChange={setSegments}
              formOrigin={form.origin_iata}
              formDestination={form.destination_iata}
              formDepartureDate={form.departure_date}
              formReturnDate={form.return_date}
              formAirline={form.airline}
              formLocator={form.locator}
              formFlightClass={form.flight_class}
              onFormChange={updateForm}
              onGroupLocatorsChange={setGroupLocators}
            />

            {/* Air Cost Blocks */}
            <AirCostBlocksEditor
              blocks={airCostBlocks}
              onChange={setAirCostBlocks}
              segments={segments}
              suppliers={suppliers}
              allMilesPrograms={allMilesPrograms}
              getSupplierPrograms={getSupplierPrograms}
              autoFillMilesPrice={autoFillMilesPriceCallback}
            />

            {/* Air Tariff Conditions */}
            <TariffConditionsCard
              value={airTariff}
              onChange={setAirTariff}
              productLabel="Aéreo"
              compact
            />
            <StepNavigation />
          </div>
        </TabsContent>

        {/* ═══════════════ 4. HOSPEDAGEM ═══════════════ */}
        <TabsContent value="hospedagem">
          <div className="space-y-4">
            <Card className="p-6">
              <SectionTitle icon={Hotel} title="Hospedagem" subtitle="Cadastre uma ou mais hospedagens com seus custos individuais" />
            </Card>

            <HotelEntriesEditor
              hotels={hotelEntries}
              onChange={setHotelEntries}
              suppliers={suppliers}
              getSupplierPrograms={getSupplierPrograms}
              autoFillMilesPrice={autoFillMilesPriceCallback}
            />

            {/* Hotel Tariff Conditions */}
            <TariffConditionsCard
              value={hotelTariff}
              onChange={setHotelTariff}
              productLabel="Hospedagem"
              compact
            />
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
                      <div className="space-y-2">
                        <Label>Fornecedor</Label>
                        <div className="flex gap-2">
                          <Select value={product.supplier_id} onValueChange={(v) => updateProduct(product.id, "supplier_id", v)}>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              {suppliers.map((s: any) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button type="button" variant="outline" size="icon" className="shrink-0" title="Cadastrar novo fornecedor" onClick={() => window.open("/financeiro/fornecedores", "_blank")}>
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2"><Label>Descrição</Label><Input value={product.description} onChange={(e) => updateProduct(product.id, "description", e.target.value)} placeholder="Detalhes do produto" /></div>
                      <div className="space-y-2"><Label>Data</Label><Input type="date" value={product.date} onChange={(e) => updateProduct(product.id, "date", e.target.value)} /></div>
                      <div className="space-y-2"><Label>Código de Reserva</Label><Input value={product.reservation_code} onChange={(e) => updateProduct(product.id, "reservation_code", e.target.value.toUpperCase())} placeholder="Localizador / confirmação" className="font-mono" /></div>
                    </div>

                    <div className="space-y-2">
                      <Label>Tipo de Emissão</Label>
                      <div className="flex gap-2">
                        <Button type="button" variant={product.emission_type === "milhas" ? "default" : "outline"} size="sm" onClick={() => updateProduct(product.id, "emission_type", "milhas")} className="flex-1">
                          🎯 Milhas
                        </Button>
                        <Button type="button" variant={product.emission_type === "pagante" ? "default" : "outline"} size="sm" onClick={() => updateProduct(product.id, "emission_type", "pagante")} className="flex-1">
                          💰 Pagante
                        </Button>
                      </div>
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


                    {/* Tariff conditions for this product */}
                    <TariffConditionsCard
                      value={product.tariff}
                      onChange={(v) => updateProduct(product.id, "tariff", v)}
                      productLabel={typeInfo?.label || "Produto"}
                      compact
                    />
                  </Card>
                );
              })}
            </div>

            {otherProducts.length > 0 && (
              <Button variant="outline" onClick={addProduct} className="w-full mt-4"><Plus className="w-4 h-4 mr-2" /> Adicionar Outro Produto</Button>
            )}
            <StepNavigation />
          </Card>
        </TabsContent>

        {/* ═══════════════ 6. PAGAMENTOS ═══════════════ */}
        <TabsContent value="pagamentos">
          <Card className="p-6">
            <SectionTitle icon={DollarSign} title="Pagamentos da Venda" subtitle="Registre um ou mais pagamentos (PIX, cartão, transferência...)" />

            <SalePaymentsEditor
              payments={salePayments}
              onChange={setSalePayments}
              totalSaleValue={receivedValue > 0 && salePayments.length === 0 ? receivedValue : undefined}
            />

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
                    <span className="text-sm flex items-center gap-2"><Plane className="w-4 h-4" /> Aéreo ({airCostBlocks.length} bloco{airCostBlocks.length !== 1 ? "s" : ""})</span>
                    <span className="text-sm font-semibold">{fmt(airCost)}</span>
                  </div>
                )}
                {hotelCost > 0 && (
                  <div className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-lg">
                    <span className="text-sm flex items-center gap-2"><Hotel className="w-4 h-4" /> Hospedagem ({hotelEntries.length} hotel{hotelEntries.length !== 1 ? "éis" : ""})</span>
                    <span className="text-sm font-semibold">{fmt(hotelCost)}</span>
                  </div>
                )}
                {productsCost > 0 && (
                  <div className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-lg">
                    <span className="text-sm flex items-center gap-2"><ShoppingBag className="w-4 h-4" /> Outros Produtos</span>
                    <span className="text-sm font-semibold">{fmt(productsCost)}</span>
                  </div>
                )}
              </div>

              {/* Miles breakdown */}
              {totalMiles > 0 && (() => {
                const milesDetails: { source: string; program: string; qty: number; pricePerK: number; cost: number }[] = [];
                airCostBlocks.filter(b => b.emission_type === "milhas" && (parseFloat(b.miles_qty) || 0) > 0).forEach(b => {
                  const supplierName = suppliers.find((s: any) => s.id === b.supplier_id)?.name || "—";
                  milesDetails.push({
                    source: `Aéreo – ${supplierName}`, program: b.miles_program || "—",
                    qty: parseFloat(b.miles_qty) || 0, pricePerK: parseFloat(b.miles_price) || 0,
                    cost: ((parseFloat(b.miles_qty) || 0) / 1000) * (parseFloat(b.miles_price) || 0),
                  });
                });
                hotelEntries.filter(h => h.emission_type === "milhas" && (parseFloat(h.miles_qty) || 0) > 0).forEach(h => {
                  const supplierName = suppliers.find((s: any) => s.id === h.supplier_id)?.name || "—";
                  milesDetails.push({
                    source: `Hotel – ${supplierName}`, program: h.miles_program || "—",
                    qty: parseFloat(h.miles_qty) || 0, pricePerK: parseFloat(h.miles_price) || 0,
                    cost: ((parseFloat(h.miles_qty) || 0) / 1000) * (parseFloat(h.miles_price) || 0),
                  });
                });
                otherProducts.filter(p => p.emission_type === "milhas" && (parseFloat(p.miles_qty) || 0) > 0).forEach(p => {
                  const supplierName = suppliers.find((s: any) => s.id === p.supplier_id)?.name || "—";
                  milesDetails.push({
                    source: `${PRODUCT_TYPES.find(t => t.value === p.type)?.label || p.type} – ${supplierName}`,
                    program: p.miles_program || "—",
                    qty: parseFloat(p.miles_qty) || 0, pricePerK: 0, cost: parseFloat(p.miles_tax) || 0,
                  });
                });

                return (
                  <Card className="p-4 mt-4 bg-muted/20 border-muted">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">🎯 Detalhamento de Milhas</h4>
                    <div className="space-y-2">
                      {milesDetails.map((m, i) => (
                        <div key={i} className="grid grid-cols-5 gap-2 text-xs items-center py-1.5 px-2 bg-background rounded-md">
                          <span className="col-span-2 font-medium truncate" title={m.source}>{m.source}</span>
                          <span className="text-muted-foreground">{m.program}</span>
                          <span className="text-right font-mono">{m.qty.toLocaleString()} mi</span>
                          <span className="text-right font-mono">{m.pricePerK > 0 ? `R$ ${m.pricePerK.toFixed(2)}/k` : "—"}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center mt-3 pt-2 border-t text-sm">
                      <span className="font-semibold">Total Milhas</span>
                      <span className="font-bold">{totalMiles.toLocaleString()}</span>
                    </div>
                  </Card>
                );
              })()}

              <Card className="p-4 mt-4 bg-primary/5 border-primary/20">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <span className="text-muted-foreground">Custo Total</span>
                  <span className="font-bold text-right">{fmt(totalCost)}</span>
                  <span className="text-muted-foreground">Valor Recebido</span>
                  <span className="font-bold text-right text-success">{fmt(receivedValue)}</span>
                  <div className="col-span-2 border-t my-1" />
                  <span className="text-muted-foreground font-semibold">Lucro</span>
                  <span className={cn("font-bold text-right text-lg", profit >= 0 ? "text-primary" : "text-destructive")}>{fmt(profit)}</span>
                  <span className="text-muted-foreground">Margem</span>
                  <span className="font-bold text-right text-accent">{margin.toFixed(1)}%</span>
                </div>
              </Card>
            </div>
            <StepNavigation />
          </Card>
        </TabsContent>

        {/* ═══════════════ 7. ANEXOS / IA ═══════════════ */}
        <TabsContent value="anexos">
          <Card className="p-6">
            <SectionTitle icon={Sparkles} title="Anexos e Extração com IA" subtitle="Envie comprovantes e deixe a IA preencher automaticamente" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div
                  className={cn("border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer", dragOver ? "border-primary bg-primary/5" : "border-border")}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                  onClick={() => document.getElementById("file-upload-new")?.click()}
                >
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground mb-1">Anexar espelho da emissão</p>
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
            <StepNavigation />
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
                        <span className="font-medium">{fmt(p.gross_value)}{p.fee_total > 0 ? ` (líq: ${fmt(p.net_value)})` : ""}</span>
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
              {(form.origin_iata || form.airline || airCostBlocks.length > 0 || segments.some(s => s.origin_iata)) && (
                <div className="bg-muted/30 rounded-xl p-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Plane className="w-4 h-4 text-primary" /> Aéreo</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <span className="text-muted-foreground">Rota</span><span className="font-mono">{form.origin_iata || segments.find(s => s.direction === "ida" && s.origin_iata)?.origin_iata || segments[0]?.origin_iata || "?"} → {form.destination_iata || segments.filter(s => s.direction === "ida" && s.destination_iata).slice(-1)[0]?.destination_iata || segments.slice(-1)[0]?.destination_iata || "?"}</span>
                    <span className="text-muted-foreground">Datas</span><span>{form.departure_date || "?"} — {form.return_date || "?"}</span>
                    <span className="text-muted-foreground">Companhia</span><span>{form.airline || "—"}</span>
                    <span className="text-muted-foreground">Segmentos</span><span>{segments.filter(s => s.origin_iata).length} trecho(s)</span>
                  </div>
                  {airCostBlocks.length > 0 && (
                    <div className="border-t pt-2 space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Blocos de custo</p>
                      {airCostBlocks.map(b => (
                        <div key={b.id} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{b.label} ({b.emission_type})</span>
                          <span className="font-medium">{fmt(calcBlockCost(b))}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                        <span>Total Aéreo</span>
                        <span className="text-primary">{fmt(airCost)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Hotels */}
              {hotelEntries.length > 0 && (
                <div className="bg-muted/30 rounded-xl p-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Hotel className="w-4 h-4 text-primary" /> Hospedagem ({hotelEntries.length})</h3>
                  <div className="space-y-2">
                    {hotelEntries.map(h => (
                      <div key={h.id} className="flex justify-between text-sm">
                        <div>
                          <span className="font-medium">{h.hotel_name || "Hotel sem nome"}</span>
                          {h.hotel_city && <span className="text-muted-foreground text-xs ml-2">({h.hotel_city})</span>}
                          {h.hotel_checkin_date && <span className="text-muted-foreground text-xs ml-2">{h.hotel_checkin_date} → {h.hotel_checkout_date || "?"}</span>}
                        </div>
                        <span className="font-semibold">{fmt(calcHotelCost(h))}</span>
                      </div>
                    ))}
                    {hotelCost > 0 && (
                      <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                        <span>Total Hospedagem</span>
                        <span className="text-primary">{fmt(hotelCost)}</span>
                      </div>
                    )}
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
                        <span className="font-semibold">{fmt(p.emission_type === "pagante" ? parseFloat(p.cash_value) || 0 : parseFloat(p.miles_tax) || 0)}</span>
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
                  <span className="font-bold text-right">{fmt(totalCost)}</span>
                  <span className="text-muted-foreground">Total de Milhas</span>
                  <span className="font-bold text-right">{totalMiles.toLocaleString()}</span>
                  <span className="text-muted-foreground">Valor Recebido</span>
                  <span className="font-bold text-right text-success">{fmt(receivedValue)}</span>
                  <div className="col-span-2 border-t my-1" />
                  <span className="font-semibold">Lucro</span>
                  <span className={cn("font-bold text-right text-xl", profit >= 0 ? "text-primary" : "text-destructive")}>{fmt(profit)}</span>
                  <span className="text-muted-foreground">Margem</span>
                  <span className="font-bold text-right text-accent text-lg">{margin.toFixed(1)}%</span>
                </div>
              </Card>

              <div className="flex items-center gap-3 mt-6 pt-4 border-t">
                <Button variant="outline" onClick={goPrev}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                </Button>
                <Button data-testid="btn-save-sale" className="flex-1" size="lg" onClick={handleSave} disabled={saving}>
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : <><Check className="w-4 h-4 mr-2" /> {isEditMode ? "Atualizar Venda" : "Confirmar e Salvar Venda"}</>}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
