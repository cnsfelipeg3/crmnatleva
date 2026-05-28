/**
 * Dialog that lets the user pick which voucher(s) to generate for a sale
 * (one PDF per hotel, plus a single Aéreo voucher when flight_segments exist),
 * previews it, and exports as PDF using html2pdf.js.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Plane, Hotel, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  HotelVoucher, AereoVoucher,
  type HotelVoucherData, type AereoVoucherData,
} from "./ConfirmationVoucher";
import { iataToLabel } from "@/lib/iataUtils";
import { ALL_AIRLINES } from "@/lib/airlinesData";
import { ScrollArea } from "@/components/ui/scroll-area";

// IATA → city short label (e.g. "São Paulo / CGH") to keep one-line layout in the PDF
function shortAirportLabel(iata?: string | null): string {
  if (!iata) return "—";
  const full = iataToLabel(iata) || iata;
  // iataToLabel returns "São Paulo (Congonhas) (CGH)" → keep only city + IATA
  const city = full.replace(/\s*\(.*\)\s*/g, "").trim();
  return `${city} / ${iata.toUpperCase()}`;
}

function prettyAirline(code?: string | null): string {
  if (!code) return "—";
  const c = code.trim().toUpperCase();
  const found = ALL_AIRLINES.find((a) => a.iata === c || a.icao === c);
  if (!found) return c;
  // Short marketing name: "GOL Linhas Aéreas" → "GOL"
  return found.name.split(/\s+/)[0];
}

function cleanFlightNumber(airline?: string | null, flightNumber?: string | null): string {
  const air = (airline || "").trim().toUpperCase();
  const fn = (flightNumber || "").trim().toUpperCase();
  if (!fn) return air || "—";
  // Strip any leading airline prefix (one or repeated) from flight_number
  const stripped = fn.replace(new RegExp(`^(?:${air}\\s*)+`, "i"), "").trim();
  return air ? `${air} ${stripped || fn}` : fn;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  saleId: string;
}

type VoucherKind =
  | { type: "aereo"; id: "aereo"; label: string; data: AereoVoucherData }
  | { type: "hotel"; id: string; label: string; data: HotelVoucherData };

export default function ConfirmationVoucherDialog({ open, onOpenChange, saleId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [vouchers, setVouchers] = useState<VoucherKind[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [clientFileName, setClientFileName] = useState("voucher");

  useEffect(() => {
    if (!open || !saleId) return;
    void load();
  }, [open, saleId]);

  const load = async () => {
    setLoading(true);
    try {
      const [saleRes, segRes, costRes, paxRes] = await Promise.all([
        supabase.from("sales").select("*").eq("id", saleId).single(),
        supabase.from("flight_segments").select("*").eq("sale_id", saleId).order("segment_order"),
        supabase.from("cost_items").select("*").eq("sale_id", saleId),
        supabase.from("sale_passengers").select("*, passengers(*)").eq("sale_id", saleId),
      ]);

      const sale = saleRes.data;
      const segments = segRes.data || [];
      const costItems = costRes.data || [];
      const passengersRaw = (paxRes.data || []).map((sp: any) => sp.passengers).filter(Boolean);

      let clientName = sale?.name || "voucher";
      if (sale?.client_id) {
        const { data: c } = await supabase.from("clients").select("display_name").eq("id", sale.client_id).single();
        if (c?.display_name) clientName = c.display_name;
      }
      setClientFileName(clientName.replace(/[^\w\-]+/g, "_"));

      const out: VoucherKind[] = [];

      // ─── Aéreo voucher (one consolidated)
      if (segments.length > 0) {
        const aereoCost = costItems.find((c: any) => c.category === "aereo");
        const passengers = passengersRaw.map((p: any) => ({
          name: p.full_name,
          type: inferPaxType(p.birth_date),
          doc: p.passport_number || p.cpf || p.rg || null,
        }));
        const aereoData: AereoVoucherData = {
          flight_class: prettyClass(sale?.flight_class),
          emission_date: sale?.emission_date || sale?.close_date,
          reservation_code:
            aereoCost?.reservation_code ||
            (Array.isArray(sale?.locators) ? sale.locators[0] : sale?.locators) ||
            null,
          passengers,
          segments: segments.map((s: any) => ({
            flight_number: cleanFlightNumber(s.airline, s.flight_number),
            origin_label: shortAirportLabel(s.origin_iata),
            origin_iata: s.origin_iata,
            destination_label: shortAirportLabel(s.destination_iata),
            destination_iata: s.destination_iata,
            airline: prettyAirline(s.airline),
            date: s.departure_date,
            departure_time: s.departure_time,
            arrival_time: s.arrival_time,
          })),
        };
        out.push({ type: "aereo", id: "aereo", label: "Voucher Aéreo", data: aereoData });
      }

      // ─── Hotel vouchers (one per hotel cost item, fallback to sale.hotel_*)
      const hotelCosts = costItems.filter((c: any) => c.category === "hotel");
      const guests = passengersRaw.map((p: any) => ({
        name: p.full_name,
        doc: p.cpf || p.passport_number || p.rg || null,
      }));
      const sources: any[] = hotelCosts.length > 0
        ? hotelCosts.map((h: any) => ({
            name: h.description || sale?.hotel_name,
            reservation_code: h.reservation_code,
            meal_plan: sale?.hotel_meal_plan,
            room_type: sale?.hotel_room,
            address: sale?.hotel_address,
            checkin_date: sale?.hotel_checkin_date,
            checkout_date: sale?.hotel_checkout_date,
            id: h.id,
          }))
        : sale?.hotel_name
        ? [{
            name: sale.hotel_name,
            reservation_code: sale.hotel_reservation_code,
            meal_plan: sale.hotel_meal_plan,
            room_type: sale.hotel_room,
            address: sale.hotel_address,
            checkin_date: sale.hotel_checkin_date,
            checkout_date: sale.hotel_checkout_date,
            id: "hotel-main",
          }]
        : [];

      sources.forEach((h, i) => {
        out.push({
          type: "hotel",
          id: `hotel-${h.id || i}`,
          label: `Voucher Hospedagem — ${h.name || `Hotel ${i + 1}`}`,
          data: {
            hotel_name: h.name,
            meal_plan: h.meal_plan,
            room_type: h.room_type,
            reservation_code: h.reservation_code,
            pin_code: null,
            address: h.address,
            checkin_date: h.checkin_date,
            checkout_date: h.checkout_date,
            guests,
          },
        });
      });

      setVouchers(out);
      setSelectedId(out[0]?.id || null);
    } catch (e: any) {
      toast({ title: "Erro ao carregar dados", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const current = useMemo(
    () => vouchers.find((v) => v.id === selectedId) || null,
    [vouchers, selectedId],
  );

  const handleExport = async () => {
    if (!current || !previewRef.current) return;
    setExporting(true);
    try {
      const html2pdfMod = await import("html2pdf.js");
      const html2pdf = (html2pdfMod as any).default || html2pdfMod;
      const fileName = `${current.type === "aereo" ? "Voucher-Aereo" : "Voucher-Hotel"}_${clientFileName}.pdf`;
      await html2pdf()
        .set({
          margin: 0,
          filename: fileName,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait", compress: true },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .from(previewRef.current)
        .save();
      toast({ title: "PDF gerado!", description: fileName });
    } catch (e: any) {
      toast({ title: "Erro ao gerar PDF", description: e.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerar PDF de Confirmação</DialogTitle>
          <DialogDescription>
            Escolha qual voucher deseja gerar e baixar em PDF para enviar ao cliente.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : vouchers.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Esta venda ainda não tem trechos aéreos nem hospedagem cadastrados.
          </div>
        ) : (
          <div className="flex gap-4 flex-1 min-h-0">
            {/* Sidebar */}
            <div className="w-64 flex flex-col gap-1.5 shrink-0">
              {vouchers.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedId(v.id)}
                  className={`text-left px-3 py-2.5 rounded-md border text-sm flex items-start gap-2 transition-colors ${
                    selectedId === v.id
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {v.type === "aereo" ? <Plane className="w-4 h-4 mt-0.5" /> : <Hotel className="w-4 h-4 mt-0.5" />}
                  <span className="flex-1">{v.label}</span>
                </button>
              ))}
              <Button onClick={handleExport} disabled={!current || exporting} className="mt-3">
                {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Baixar PDF
              </Button>
            </div>

            {/* Preview */}
            <ScrollArea className="flex-1 border rounded-md bg-muted/30">
              <div className="flex justify-center p-6">
                <div style={{ transform: "scale(0.78)", transformOrigin: "top center" }}>
                  {current?.type === "aereo" && <AereoVoucher ref={previewRef} data={current.data} />}
                  {current?.type === "hotel" && <HotelVoucher ref={previewRef} data={current.data} />}
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function inferPaxType(birth?: string | null): string {
  if (!birth) return "Adulto";
  const b = new Date(birth);
  if (isNaN(b.getTime())) return "Adulto";
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
