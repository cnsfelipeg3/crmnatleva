import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plane, Hotel, Download, Pencil, FlaskConical, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HotelVoucher, AereoVoucher, type HotelVoucherData, type AereoVoucherData } from "./ConfirmationVoucher";
import { iataToLabel } from "@/lib/iataUtils";
import { ALL_AIRLINES } from "@/lib/airlinesData";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const PREVIEW_SCALE = 0.78;

type DbRecord = Record<string, unknown>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  saleId: string;
}

type VoucherKind =
  | { type: "aereo"; id: "aereo"; label: string; data: AereoVoucherData }
  | { type: "hotel"; id: string; label: string; data: HotelVoucherData };

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function shortAirportLabel(iata?: string | null): string {
  if (!iata) return "—";
  const full = iataToLabel(iata) || iata;
  const city = full.replace(/\s*\(.*\)\s*/g, "").trim();
  return `${city} / ${iata.toUpperCase()}`;
}

function prettyAirline(code?: string | null): string {
  if (!code) return "—";
  const c = code.trim().toUpperCase();
  const found = ALL_AIRLINES.find((a) => a.iata === c || a.icao === c);
  return found ? found.name.split(/\s+/)[0] : c;
}

function cleanFlightNumber(airline?: string | null, flightNumber?: string | null): string {
  const air = (airline || "").trim().toUpperCase();
  const fn = (flightNumber || "").trim().toUpperCase();
  if (!fn) return air || "—";
  const stripped = air ? fn.replace(new RegExp(`^(?:${air}\\s*)+`, "i"), "").trim() : fn;
  return air ? `${air} ${stripped || fn}` : fn;
}

function inferPaxType(birth?: string | null): string {
  if (!birth) return "Adulto";
  const b = new Date(birth);
  if (Number.isNaN(b.getTime())) return "Adulto";
  const age = (Date.now() - b.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (age < 2) return "Bebê";
  if (age < 12) return "Criança";
  return "Adulto";
}

function prettyClass(c?: string | null): string {
  if (!c) return "Econômica";
  const map: Record<string, string> = {
    economy: "Econômica",
    economica: "Econômica",
    premium_economy: "Premium Economy",
    business: "Executiva",
    executiva: "Executiva",
    first: "Primeira Classe",
    primeira: "Primeira Classe",
  };
  return map[c.toLowerCase()] || c;
}

function createLongTestVouchers(): VoucherKind[] {
  const passengers = [
    { name: "Maria Carolina Albuquerque Vasconcellos de Andrade", type: "Adulto", doc: "12345678900" },
    { name: "João Pedro Albuquerque Vasconcellos de Andrade Neto", type: "Adulto", doc: "98765432100" },
  ];

  return [
    {
      type: "aereo",
      id: "aereo",
      label: "Teste A4 · Voucher Aéreo",
      data: {
        flight_class: "Premium Economy",
        emission_date: "2026-07-16",
        reservation_code: "NATLEVA2026LONG",
        passengers,
        segments: [
          { flight_number: "LA 3278", origin_label: "São Paulo / GRU", destination_label: "Buenos Aires / EZE", airline: "LATAM", date: "2026-07-16", departure_time: "06:05", arrival_time: "09:10" },
          { flight_number: "AR 1894", origin_label: "Buenos Aires / EZE", destination_label: "Ushuaia / USH", airline: "Aerolíneas", date: "2026-07-16", departure_time: "11:45", arrival_time: "15:25" },
          { flight_number: "G3 1422", origin_label: "São Paulo / CGH", destination_label: "Cuiabá / CGB", airline: "GOL", date: "2026-07-18", departure_time: "14:20", arrival_time: "15:40" },
          { flight_number: "AD 4098", origin_label: "Belo Horizonte / CNF", destination_label: "Fernando de Noronha / FEN", airline: "Azul", date: "2026-07-22", departure_time: "08:35", arrival_time: "13:15" },
        ],
      },
    },
    {
      type: "hotel",
      id: "hotel-test",
      label: "Teste A4 · Voucher Hospedagem",
      data: {
        hotel_name: "Hotel Internacional Grand Resort & Convention Center Praia do Forte",
        meal_plan: "Café da manhã buffet incluso todos os dias",
        room_type: "Suíte Família Premium Vista Mar com varanda privativa",
        reservation_code: "HTL-LONG-2026-998877",
        pin_code: "4821",
        address: "Avenida das Nações Unidas, 12345, Torre Jardins, São Paulo, SP, Brasil",
        checkin_date: "2026-07-16",
        checkout_date: "2026-07-24",
        checkin_time: "15:00",
        checkout_time: "12:00",
        guests: passengers.map((p) => ({ name: p.name, doc: p.doc })),
      },
    },
  ];
}

export default function ConfirmationVoucherDialog({ open, onOpenChange, saleId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [realVouchers, setRealVouchers] = useState<VoucherKind[]>([]);
  const [draftVouchers, setDraftVouchers] = useState<VoucherKind[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [clientFileName, setClientFileName] = useState("voucher");
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !saleId) return;
    void load();
  }, [open, saleId]);

  const visibleVouchers = testMode ? createLongTestVouchers() : draftVouchers;
  const current = useMemo(() => visibleVouchers.find((v) => v.id === selectedId) || visibleVouchers[0] || null, [visibleVouchers, selectedId]);

  useEffect(() => {
    if (!current && visibleVouchers[0]) setSelectedId(visibleVouchers[0].id);
  }, [current, visibleVouchers]);

  const load = async () => {
    setLoading(true);
    try {
      const [saleRes, segRes, costRes, paxRes] = await Promise.all([
        supabase.from("sales").select("*").eq("id", saleId).single(),
        supabase.from("flight_segments").select("*").eq("sale_id", saleId).order("segment_order"),
        supabase.from("cost_items").select("*").eq("sale_id", saleId),
        supabase.from("sale_passengers").select("*, passengers(*)").eq("sale_id", saleId),
      ]);

      const sale = (saleRes.data || {}) as DbRecord;
      const segments = (segRes.data || []) as DbRecord[];
      const costItems = (costRes.data || []) as DbRecord[];
      const passengersRaw = (paxRes.data || [])
        .map((sp: DbRecord) => sp.passengers as DbRecord | null)
        .filter((p): p is DbRecord => Boolean(p));

      let clientName = asString(sale.name) || "voucher";
      const clientId = asString(sale.client_id);
      if (clientId) {
        const { data: c } = await supabase.from("clients").select("display_name").eq("id", clientId).single();
        if (c?.display_name) clientName = c.display_name;
      }
      setClientFileName(clientName.replace(/[^\w\-]+/g, "_"));

      const out: VoucherKind[] = [];
      if (segments.length > 0) {
        const aereoCost = costItems.find((c) => asString(c.category) === "aereo");
        const passengers = passengersRaw.map((p) => ({
          name: asString(p.full_name) || "—",
          type: inferPaxType(asString(p.birth_date)),
          doc: asString(p.passport_number) || asString(p.cpf) || asString(p.rg),
        }));
        out.push({
          type: "aereo",
          id: "aereo",
          label: "Voucher Aéreo",
          data: {
            flight_class: prettyClass(asString(sale.flight_class)),
            emission_date: asString(sale.emission_date) || asString(sale.close_date),
            reservation_code: asString(aereoCost?.reservation_code) || asArray(sale.locators)[0] || asString(sale.locators),
            passengers,
            segments: segments.map((s) => ({
              flight_number: cleanFlightNumber(asString(s.airline), asString(s.flight_number)),
              origin_label: shortAirportLabel(asString(s.origin_iata)),
              origin_iata: asString(s.origin_iata),
              destination_label: shortAirportLabel(asString(s.destination_iata)),
              destination_iata: asString(s.destination_iata),
              airline: prettyAirline(asString(s.airline)),
              date: asString(s.departure_date),
              departure_time: asString(s.departure_time),
              arrival_time: asString(s.arrival_time),
            })),
          },
        });
      }

      const guests = passengersRaw.map((p) => ({ name: asString(p.full_name) || "—", doc: asString(p.cpf) || asString(p.passport_number) || asString(p.rg) }));
      const hotelCosts = costItems.filter((c) => asString(c.category) === "hotel");
      const hotelSources = hotelCosts.length > 0
        ? hotelCosts.map((h) => ({
            id: asString(h.id) || crypto.randomUUID(),
            name: (asString(h.description) || asString(sale.hotel_name) || "").replace(/^Hotel:\s*/i, ""),
            reservation_code: asString(h.reservation_code),
          }))
        : asString(sale.hotel_name)
          ? [{ id: "hotel-main", name: asString(sale.hotel_name), reservation_code: asString(sale.hotel_reservation_code) }]
          : [];

      hotelSources.forEach((h, i) => {
        out.push({
          type: "hotel",
          id: `hotel-${h.id || i}`,
          label: `Voucher Hospedagem · ${h.name || `Hotel ${i + 1}`}`,
          data: {
            hotel_name: h.name,
            meal_plan: asString(sale.hotel_meal_plan),
            room_type: asString(sale.hotel_room),
            reservation_code: h.reservation_code,
            pin_code: null,
            address: asString(sale.hotel_address),
            checkin_date: asString(sale.hotel_checkin_date),
            checkout_date: asString(sale.hotel_checkout_date),
            guests,
          },
        });
      });

      setRealVouchers(out);
      setDraftVouchers(out);
      setSelectedId(out[0]?.id || null);
      setTestMode(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Não foi possível carregar os dados do voucher.";
      toast({ title: "Erro ao carregar dados", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateCurrent = (updater: (voucher: VoucherKind) => VoucherKind) => {
    if (testMode || !current) return;
    setDraftVouchers((items) => items.map((item) => (item.id === current.id ? updater(item) : item)));
  };

  const handleExport = async () => {
    if (!current || !previewRef.current) return;
    setExporting(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        width: A4_WIDTH_PX,
        height: Math.max(previewRef.current.scrollHeight, A4_HEIGHT_PX),
        windowWidth: A4_WIDTH_PX,
        windowHeight: Math.max(previewRef.current.scrollHeight, A4_HEIGHT_PX),
        scrollX: 0,
        scrollY: 0,
        logging: false,
      });
      const pdf = new jsPDF("p", "mm", "a4", true);
      const imgData = canvas.toDataURL("image/png");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }
      const fileName = `${current.type === "aereo" ? "Voucher-Aereo" : "Voucher-Hotel"}_${testMode ? "Teste-A4" : clientFileName}.pdf`;
      pdf.save(fileName);
      toast({ title: "PDF gerado", description: fileName });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Falha inesperada ao gerar PDF.";
      toast({ title: "Erro ao gerar PDF", description: message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const resetDraft = () => {
    setDraftVouchers(realVouchers);
    setEditMode(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] h-[92vh] overflow-hidden flex flex-col p-5 sm:p-6 rounded-xl">
        <DialogHeader>
          <div className="flex flex-col gap-3 pr-10 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <DialogTitle>Gerar PDF de Confirmação</DialogTitle>
              <DialogDescription>Valide o voucher em A4, ajuste campos se necessário e baixe o PDF final.</DialogDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => { setTestMode((v) => !v); setSelectedId("aereo"); }}>
                {testMode ? <Database className="w-4 h-4 mr-2" /> : <FlaskConical className="w-4 h-4 mr-2" />}
                {testMode ? "Dados reais" : "Teste A4"}
              </Button>
              <Button variant={editMode ? "default" : "outline"} size="sm" onClick={() => setEditMode((v) => !v)} disabled={testMode || !current}>
                <Pencil className="w-4 h-4 mr-2" /> Editar campos
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : visibleVouchers.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Esta venda ainda não tem trechos aéreos nem hospedagem cadastrados.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-4 flex-1 min-h-0">
            <div className="min-h-0 flex flex-col gap-3">
              {testMode && <Badge variant="outline" className="w-fit"><FlaskConical className="w-3.5 h-3.5 mr-1.5" /> Validação com dados longos</Badge>}
              <div className="grid gap-2">
                {visibleVouchers.map((v) => (
                  <button key={v.id} onClick={() => setSelectedId(v.id)} className={cn("min-h-11 text-left px-3 py-2.5 rounded-lg border text-sm flex items-start gap-2 transition-colors", selectedId === v.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted")}> 
                    {v.type === "aereo" ? <Plane className="w-4 h-4 mt-0.5 shrink-0" /> : <Hotel className="w-4 h-4 mt-0.5 shrink-0" />}
                    <span className="flex-1 leading-snug">{v.label}</span>
                  </button>
                ))}
              </div>
              {editMode && current && !testMode && <EditPanel voucher={current} onChange={updateCurrent} onReset={resetDraft} />}
              <Button onClick={handleExport} disabled={!current || exporting} className="mt-auto min-h-11">
                {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />} Baixar PDF
              </Button>
            </div>

            <ScrollArea className="min-h-0 border rounded-lg bg-muted/30 overflow-hidden">
              <div className="min-w-full flex justify-center px-4 py-6">
                <div style={{ width: A4_WIDTH_PX * PREVIEW_SCALE, minHeight: A4_HEIGHT_PX * PREVIEW_SCALE, position: "relative", flex: "0 0 auto" }}>
                  <div style={{ width: A4_WIDTH_PX, transform: `scale(${PREVIEW_SCALE})`, transformOrigin: "top left" }}>
                    {current?.type === "aereo" && <AereoVoucher ref={previewRef} data={current.data} />}
                    {current?.type === "hotel" && <HotelVoucher ref={previewRef} data={current.data} />}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditPanel({ voucher, onChange, onReset }: { voucher: VoucherKind; onChange: (updater: (voucher: VoucherKind) => VoucherKind) => void; onReset: () => void }) {
  if (voucher.type === "aereo") {
    const data = voucher.data;
    return (
      <ScrollArea className="border rounded-lg p-3 max-h-[42vh] bg-muted/20">
        <div className="space-y-3 pr-2">
          <Input value={data.flight_class || ""} placeholder="Classe" onChange={(e) => onChange((v) => v.type === "aereo" ? { ...v, data: { ...v.data, flight_class: e.target.value } } : v)} />
          <Input value={data.reservation_code || ""} placeholder="Código reserva" onChange={(e) => onChange((v) => v.type === "aereo" ? { ...v, data: { ...v.data, reservation_code: e.target.value } } : v)} />
          <Input value={data.emission_date || ""} placeholder="Data de emissão" onChange={(e) => onChange((v) => v.type === "aereo" ? { ...v, data: { ...v.data, emission_date: e.target.value } } : v)} />
          {data.segments.map((segment, index) => (
            <div key={`${segment.flight_number}-${index}`} className="rounded-lg border border-border/50 p-3 space-y-2">
              <p className="text-xs font-semibold text-foreground">Trecho {index + 1}</p>
              {(["flight_number", "origin_label", "destination_label", "airline", "date", "departure_time", "arrival_time"] as const).map((field) => (
                <Input key={field} value={segment[field] || ""} placeholder={field} onChange={(e) => onChange((v) => v.type === "aereo" ? { ...v, data: { ...v.data, segments: v.data.segments.map((s, i) => i === index ? { ...s, [field]: e.target.value } : s) } } : v)} />
              ))}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={onReset}>Restaurar dados</Button>
        </div>
      </ScrollArea>
    );
  }

  const data = voucher.data;
  return (
    <ScrollArea className="border rounded-lg p-3 max-h-[42vh] bg-muted/20">
      <div className="space-y-3 pr-2">
        {(["hotel_name", "meal_plan", "room_type", "reservation_code", "pin_code", "checkin_date", "checkout_date", "checkin_time", "checkout_time"] as const).map((field) => (
          <Input key={field} value={data[field] || ""} placeholder={field} onChange={(e) => onChange((v) => v.type === "hotel" ? { ...v, data: { ...v.data, [field]: e.target.value } } : v)} />
        ))}
        <Textarea value={data.address || ""} placeholder="Endereço" onChange={(e) => onChange((v) => v.type === "hotel" ? { ...v, data: { ...v.data, address: e.target.value } } : v)} />
        <Button type="button" variant="outline" size="sm" onClick={onReset}>Restaurar dados</Button>
      </div>
    </ScrollArea>
  );
}