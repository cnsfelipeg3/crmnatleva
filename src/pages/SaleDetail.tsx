import { useParams, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatDateBR } from "@/lib/dateFormat";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Plane, Hotel, Users, DollarSign, Copy, FileText, Loader2, Pencil, Save, X, MapPin, Calendar, CreditCard, TrendingUp, Clock, Tag, Briefcase, Globe, BookOpen, Paperclip, Download, ExternalLink, Image as ImageIcon, File, Hash, KeyRound, Building2, UserCheck, RefreshCw } from "lucide-react";
import { inferProductSlugsFromSale, normalizeProductsToSlugs } from "@/lib/productTypes";
import PublishToPortalDialog from "@/components/portal/PublishToPortalDialog";
import FlightTimeline, { type FlightSegment } from "@/components/FlightTimeline";
import { useToast } from "@/hooks/use-toast";
import AirportAutocomplete from "@/components/AirportAutocomplete";
import AirlineAutocomplete from "@/components/AirlineAutocomplete";
import FlightEnrichmentDialog from "@/components/FlightEnrichmentDialog";
import HotelAutocomplete from "@/components/HotelAutocomplete";
import AirlineLogo, { AirlineLogosStack } from "@/components/AirlineLogo";
import ClientAutocomplete from "@/components/ClientAutocomplete";
import SalePassengersManager from "@/components/SalePassengersManager";
import SaleAttachmentsSection from "@/components/SaleAttachmentsSection";
import DeleteSaleButton from "@/components/DeleteSaleButton";
import { iataToLabel } from "@/lib/iataUtils";
import { routeLabel, routeCode } from "@/lib/cityExtract";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function SaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sale, setSale] = useState<any>(null);
  const [segments, setSegments] = useState<FlightSegment[]>([]);
  const [costItems, setCostItems] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [clientName, setClientName] = useState("");
  const [payerPassengerId, setPayerPassengerId] = useState<string | null>(null);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [enrichmentOpen, setEnrichmentOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [clientEmail, setClientEmail] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: saleData } = await supabase.from("sales").select("*").eq("id", id).single();
      setSale(saleData);
      if (saleData) {
        setEditForm(saleData);
        setPayerPassengerId(saleData.payer_passenger_id || null);
        if (saleData.client_id) {
          const { data: clientData } = await supabase.from("clients").select("display_name, email").eq("id", saleData.client_id).single();
          if (clientData) {
            setClientName(clientData.display_name);
            setClientEmail(clientData.email || null);
          }
        }
      }

      const { data: segData } = await supabase.from("flight_segments").select("*").eq("sale_id", id).order("segment_order");
      setSegments((segData || []) as FlightSegment[]);

      const { data: costData } = await supabase.from("cost_items").select("*").eq("sale_id", id);
      setCostItems(costData || []);

      const { data: attData } = await supabase.from("attachments").select("*").eq("sale_id", id).order("created_at", { ascending: false });
      setAttachments(attData || []);

      setLoading(false);
    };
    if (id) fetchData();
  }, [id]);

  const startEdit = () => {
    setEditForm({ ...sale });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditForm({ ...sale });
    setEditing(false);
  };

  const handleRecalcProducts = async () => {
    if (!sale) return;
    const antes = normalizeProductsToSlugs(sale.products ?? []);
    const novos = inferProductSlugsFromSale({
      airline: sale.airline,
      origin_iata: sale.origin_iata,
      destination_iata: sale.destination_iata,
      departure_date: sale.departure_date,
      hotel_name: sale.hotel_name,
      hotel_city: sale.hotel_city,
      hotel_checkin_date: sale.hotel_checkin_date,
      hotel_reservation_code: sale.hotel_reservation_code,
      hotel_address: sale.hotel_address,
      airCost: 0,
      hotelCost: 0,
      flightSegmentsCount: segments.length,
      hotelEntriesCount: sale.hotel_name ? 1 : 0,
      // Preserva produtos explícitos (Seguro, Transfer, etc.) já existentes
      explicitOtherSlugs: antes.filter(s => !["aereo", "hospedagem", "pacote"].includes(s)),
    });

    if (JSON.stringify(antes) === JSON.stringify(novos)) {
      toast({ title: "Produtos já estão corretos", description: "Nenhuma mudança necessária." });
      return;
    }
    if (!confirm(`Produtos atuais: ${antes.join(", ") || "(vazio)"}\nNovos: ${novos.join(", ")}\n\nAtualizar?`)) return;

    const { error } = await supabase.from("sales").update({ products: novos }).eq("id", id);
    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      return;
    }
    setSale({ ...sale, products: novos });
    toast({ title: "Produtos recalculados!", description: `Array atualizado para: ${novos.join(", ")}` });
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const receivedValue = parseFloat(editForm.received_value) || 0;
      const totalCost = parseFloat(editForm.total_cost) || 0;
      const profit = receivedValue - totalCost;
      const margin = receivedValue > 0 ? (profit / receivedValue) * 100 : 0;

      const { error } = await supabase.from("sales").update({
        name: editForm.name,
        status: editForm.status,
        client_id: editForm.client_id || null,
        close_date: editForm.close_date || null,
        payment_method: editForm.payment_method || null,
        origin_iata: editForm.origin_iata || null,
        destination_iata: editForm.destination_iata || null,
        departure_date: editForm.departure_date || null,
        return_date: editForm.return_date || null,
        airline: editForm.airline || null,
        flight_class: editForm.flight_class || null,
        locators: editForm.locators || [],
        miles_program: editForm.miles_program || null,
        hotel_name: editForm.hotel_name || null,
        hotel_room: editForm.hotel_room || null,
        hotel_meal_plan: editForm.hotel_meal_plan || null,
        hotel_reservation_code: editForm.hotel_reservation_code || null,
        hotel_checkin_date: editForm.hotel_checkin_date || null,
        hotel_checkout_date: editForm.hotel_checkout_date || null,
        hotel_city: editForm.hotel_city || null,
        hotel_country: editForm.hotel_country || null,
        hotel_address: editForm.hotel_address || null,
        hotel_lat: editForm.hotel_lat || null,
        hotel_lng: editForm.hotel_lng || null,
        hotel_place_id: editForm.hotel_place_id || null,
        adults: parseInt(editForm.adults) || 1,
        children: parseInt(editForm.children) || 0,
        received_value: receivedValue,
        total_cost: totalCost,
        profit,
        margin: parseFloat(margin.toFixed(2)),
        lead_type: editForm.lead_type || "agencia",
        observations: editForm.observations || null,
      }).eq("id", id);

      if (error) throw error;

      const updated = { ...editForm, profit, margin: parseFloat(margin.toFixed(2)) };
      setSale(updated);
      setEditing(false);
      toast({ title: "Venda atualizada!" });

      try {
        // Audit log
        const changedFields: string[] = [];
        for (const key of Object.keys(editForm)) {
          if (sale[key] !== editForm[key] && key !== 'profit' && key !== 'margin') {
            changedFields.push(key);
          }
        }
        if (changedFields.length > 0) {
          await supabase.from("audit_log").insert({
            sale_id: id,
            action: "sale_updated",
            details: `Campos alterados: ${changedFields.join(", ")}`,
            old_value: Object.fromEntries(changedFields.map(k => [k, sale[k]])),
            new_value: Object.fromEntries(changedFields.map(k => [k, editForm[k]])),
            user_id: null, // will be set by RLS context
          });
        }

        // Sync financial: update accounts_receivable if received_value changed
        if (sale.received_value !== receivedValue) {
          // Update virtual receivables for this sale
          const { data: existingAR } = await supabase.from("accounts_receivable").select("id").eq("sale_id", id);
          if (!existingAR || existingAR.length === 0) {
            // Create one if none exists
            if (receivedValue > 0) {
              await supabase.from("accounts_receivable").insert({
                sale_id: id,
                description: editForm.name || "Venda",
                gross_value: receivedValue,
                net_value: receivedValue,
                status: "pendente",
                payment_method: editForm.payment_method || null,
              });
            }
          }
        }

        if (editForm.status === "Cancelado") {
          await Promise.all([
            supabase.from("checkin_tasks").update({ status: "CANCELADO" }).eq("sale_id", id).not("status", "in", '("CONCLUIDO","CANCELADO")'),
            supabase.from("lodging_confirmation_tasks").update({ status: "CANCELADO" }).eq("sale_id", id).not("status", "in", '("CONFIRMADO","CANCELADO")'),
          ]);
          // Mark receivables as cancelled
          await supabase.from("accounts_receivable").update({ status: "cancelado" }).eq("sale_id", id).neq("status", "recebido");
        } else {
          await Promise.all([
            supabase.functions.invoke("checkin-generate"),
            supabase.functions.invoke("lodging-generate"),
          ]);
        }
      } catch (syncErr) {
        console.warn("Task sync warning:", syncErr);
      }
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateEdit = (field: string, value: any) => setEditForm((f: any) => ({ ...f, [field]: value }));

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    setSummaryOpen(true);
    setSummary("");
    try {
      const { data, error } = await supabase.functions.invoke("generate-summary", {
        body: { sale: { ...sale, segments, costItems } },
      });
      if (error) throw error;
      setSummary(data.summary || "Erro ao gerar resumo.");
    } catch (err: any) {
      setSummary("Erro ao gerar resumo: " + (err.message || "Tente novamente."));
      toast({ title: "Erro ao gerar resumo", variant: "destructive" });
    } finally {
      setGeneratingSummary(false);
    }
  };

  const copySummary = () => {
    navigator.clipboard.writeText(summary);
    toast({ title: "Resumo copiado!" });
  };

  const statusColor: Record<string, string> = {
    "Rascunho": "bg-muted text-muted-foreground",
    "Pendente": "bg-amber-500/15 text-amber-700 border-amber-300",
    "Em andamento": "bg-blue-500/15 text-blue-700 border-blue-300",
    "Emitido": "bg-emerald-500/15 text-emerald-700 border-emerald-300",
    "Fechado": "bg-primary/15 text-primary border-primary/30",
    "Cancelado": "bg-destructive/15 text-destructive border-destructive/30",
    "Concluída": "bg-emerald-500/15 text-emerald-700 border-emerald-300",
    "Concluida": "bg-emerald-500/15 text-emerald-700 border-emerald-300",
  };

  const tripDays = useMemo(() => {
    if (!sale?.departure_date) return null;
    const end = sale.return_date || sale.departure_date;
    const d1 = new Date(sale.departure_date);
    const d2 = new Date(end);
    return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000));
  }, [sale]);

  const uniqueAirlines = useMemo(() => {
    const set = new Set<string>();
    if (sale?.airline) set.add(sale.airline);
    segments.forEach(s => { if (s.airline) set.add(s.airline); });
    return [...set];
  }, [sale, segments]);

  // Deriva origem/destino priorizando o que foi salvo em sale.origin_iata/destination_iata,
  // mas caindo para o primeiro/último segmento quando esses campos estão vazios
  // (acontece em vendas criadas antes da lógica de derivação em NewSale.tsx).
  const routeEndpoints = useMemo(() => {
    const validSegs = segments.filter(s => s.origin_iata && s.destination_iata);
    const idaSegs = validSegs.filter(s => s.direction === "ida");
    const originFromSeg = idaSegs.length > 0
      ? idaSegs[0].origin_iata
      : validSegs[0]?.origin_iata;
    const destinationFromSeg = idaSegs.length > 0
      ? idaSegs[idaSegs.length - 1].destination_iata
      : validSegs[validSegs.length - 1]?.destination_iata;
    return {
      originIata: sale?.origin_iata || originFromSeg || null,
      destinationIata: sale?.destination_iata || destinationFromSeg || null,
    };
  }, [sale, segments]);

  if (loading) return <DetailPageSkeleton />;
  if (!sale) return (
    <div className="p-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate("/sales")}><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
      <p className="mt-8 text-center text-muted-foreground">Venda não encontrada.</p>
    </div>
  );

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* ═══ HEADER ═══ */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/sales")} className="mt-1"><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-serif text-foreground">{sale.name}</h1>
              <Badge className={`text-[10px] px-2 py-0.5 border ${statusColor[sale.status] || "bg-muted"}`}>{sale.status}</Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
              <span className="font-mono text-xs">{sale.display_id}</span>
              <span>·</span>
              <span>{formatDateBR(sale.close_date)}</span>
              {sale.client_id && clientName && (
                <>
                  <span>·</span>
                  <button onClick={() => navigate(`/clients/${sale.client_id}`)} className="text-primary hover:underline text-xs font-medium flex items-center gap-1">
                    <Users className="w-3 h-3" /> {clientName}
                  </button>
                </>
              )}
            </div>
            {/* Quick trip badge row */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {(sale.destination_city || routeEndpoints.destinationIata) && (
                <Badge variant="outline" className="text-xs gap-1">
                  <MapPin className="w-3 h-3" /> {routeLabel(sale.destination_city, routeEndpoints.destinationIata)}
                </Badge>
              )}
              {sale.departure_date && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Calendar className="w-3 h-3" /> {formatDateBR(sale.departure_date)}
                  {sale.return_date && ` → ${formatDateBR(sale.return_date)}`}
                </Badge>
              )}
              {tripDays && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Clock className="w-3 h-3" /> {tripDays} {tripDays === 1 ? "dia" : "dias"}
                </Badge>
              )}
              {uniqueAirlines.length > 0 && (
                <Badge variant="outline" className="text-xs gap-1.5 pr-2">
                  <AirlineLogosStack airlines={uniqueAirlines} size={16} />
                  {uniqueAirlines.join(", ")}
                </Badge>
              )}
              {sale.miles_program && (
                <Badge variant="outline" className="text-xs gap-1 bg-accent/10">
                  <Tag className="w-3 h-3" /> {sale.miles_program}
                </Badge>
               )}
              <Badge variant="outline" className={cn("text-xs gap-1", sale.lead_type === "organico" ? "bg-success/10 text-success border-success/20" : "bg-accent/10 text-accent border-accent/20")}>
                {sale.lead_type === "organico" ? <UserCheck className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                {sale.lead_type === "organico" ? "Orgânico" : "Agência"}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {editing ? (
            <>
              <Button variant="outline" size="sm" onClick={cancelEdit}><X className="w-4 h-4 mr-1" /> Cancelar</Button>
              <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Salvar
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => navigate(`/sales/${id}/edit`)}><Pencil className="w-4 h-4 mr-1" /> Editar</Button>
              <Button variant="outline" size="sm" onClick={handleRecalcProducts}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Recalcular produtos
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPortalOpen(true)} className="text-accent border-accent/30 hover:bg-accent/10">
                <Globe className="w-4 h-4 mr-1" /> Portal do Cliente
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate(`/itinerario?sale_id=${id}`)}>
                <BookOpen className="w-4 h-4 mr-1" /> Itinerário
              </Button>
              <Button size="sm" onClick={handleGenerateSummary}>
                <FileText className="w-4 h-4 mr-1" /> Resumo NatLeva
              </Button>
              {sale && (
                <DeleteSaleButton
                  saleId={sale.id}
                  saleLabel={`${sale.display_id} — ${sale.name}`}
                  variant="full"
                  onDeleted={() => navigate("/sales")}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Summary Dialog */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Resumo NatLeva
            </DialogTitle>
          </DialogHeader>
          {generatingSummary ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
              <span className="text-muted-foreground">Gerando resumo com IA...</span>
            </div>
          ) : (
            <div className="space-y-3">
              <Textarea value={summary} readOnly rows={16} className="text-sm font-mono" />
              <Button onClick={copySummary} className="w-full">
                <Copy className="w-4 h-4 mr-1" /> Copiar Resumo
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {editing ? (
        /* Edit mode */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5 glass-card space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Dados Gerais</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Nome</Label><Input value={editForm.name || ""} onChange={e => updateEdit("name", e.target.value)} /></div>
              <div className="space-y-1">
                <Label className="text-xs">Cliente</Label>
                <ClientAutocomplete
                  value={editForm.client_id || null}
                  displayValue={clientName}
                  onChange={(clientId, client) => {
                    updateEdit("client_id", clientId);
                    setClientName(client?.display_name || "");
                  }}
                  onCreateNew={async (name) => {
                    const { data } = await supabase.from("clients").insert({ display_name: name, created_by: undefined }).select("id, display_name").single();
                    if (data) {
                      updateEdit("client_id", (data as any).id);
                      setClientName((data as any).display_name);
                    }
                  }}
                />
              </div>
              <div className="space-y-1"><Label className="text-xs">Status</Label>
                <Select value={editForm.status} onValueChange={v => updateEdit("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Rascunho", "Pendente", "Em andamento", "Emitido", "Fechado", "Cancelado"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Data Fechamento</Label><Input type="date" value={editForm.close_date || ""} onChange={e => updateEdit("close_date", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Pagamento</Label><Input value={editForm.payment_method || ""} onChange={e => updateEdit("payment_method", e.target.value)} /></div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Origem do Lead</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["agencia", "organico"] as const).map(lt => (
                    <button key={lt} type="button" onClick={() => updateEdit("lead_type", lt)}
                      className={cn("flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all text-left text-xs",
                        editForm.lead_type === lt ? "border-primary bg-primary/5" : "border-border/30 hover:border-border/60"
                      )}>
                      {lt === "agencia" ? <Building2 className="w-4 h-4 text-primary" /> : <UserCheck className="w-4 h-4 text-primary" />}
                      <span className="font-medium">{lt === "agencia" ? "Lead Agência" : "Lead Orgânico"}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
          <Card className="p-5 glass-card space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Aéreo</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Origem</Label><AirportAutocomplete value={editForm.origin_iata || ""} onChange={(iata) => updateEdit("origin_iata", iata)} /></div>
              <div className="space-y-1"><Label className="text-xs">Destino</Label><AirportAutocomplete value={editForm.destination_iata || ""} onChange={(iata) => updateEdit("destination_iata", iata)} /></div>
              <div className="space-y-1"><Label className="text-xs">Ida</Label><Input type="date" value={editForm.departure_date || ""} onChange={e => updateEdit("departure_date", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Volta</Label><Input type="date" value={editForm.return_date || ""} onChange={e => updateEdit("return_date", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Companhia</Label><AirlineAutocomplete value={editForm.airline || ""} onChange={(iata) => updateEdit("airline", iata)} /></div>
              <div className="space-y-1"><Label className="text-xs">Localizador</Label><Input value={editForm.locators?.join(", ") || ""} onChange={e => updateEdit("locators", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))} className="font-mono" /></div>
            </div>
            {editForm.origin_iata && editForm.destination_iata && editForm.departure_date && (
              <Button variant="outline" size="sm" onClick={() => setEnrichmentOpen(true)} className="w-full mt-2">
                <Plane className="w-4 h-4 mr-2" /> Enriquecer com Amadeus
              </Button>
            )}
            <FlightEnrichmentDialog
              open={enrichmentOpen}
              onOpenChange={setEnrichmentOpen}
              origin={editForm.origin_iata || ""}
              destination={editForm.destination_iata || ""}
              departureDate={editForm.departure_date || ""}
              returnDate={editForm.return_date}
              airline={editForm.airline}
              currentSegments={segments}
              onApply={(newSegs) => setSegments(newSegs)}
            />
          </Card>
          <Card className="p-5 glass-card space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Financeiro</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Valor Recebido</Label><Input type="number" step="0.01" value={editForm.received_value || ""} onChange={e => updateEdit("received_value", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Custo Total</Label><Input type="number" step="0.01" value={editForm.total_cost || ""} onChange={e => updateEdit("total_cost", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Adultos</Label><Input type="number" min={1} value={editForm.adults || 1} onChange={e => updateEdit("adults", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Crianças</Label><Input type="number" min={0} value={editForm.children || 0} onChange={e => updateEdit("children", e.target.value)} /></div>
            </div>
          </Card>
          <Card className="p-5 glass-card space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Hotel & Obs</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Hotel</Label>
                <HotelAutocomplete
                  value={editForm.hotel_name || ""}
                  onChange={(name) => updateEdit("hotel_name", name)}
                  onSelect={(hotel) => {
                    updateEdit("hotel_name", hotel.name);
                    updateEdit("hotel_city", hotel.city);
                    updateEdit("hotel_country", hotel.country);
                    updateEdit("hotel_address", hotel.address);
                    updateEdit("hotel_lat", hotel.lat);
                    updateEdit("hotel_lng", hotel.lng);
                    updateEdit("hotel_place_id", hotel.place_id);
                  }}
                />
                {editForm.hotel_city && (
                  <p className="text-[10px] text-muted-foreground">📍 {[editForm.hotel_city, editForm.hotel_country].filter(Boolean).join(", ")}</p>
                )}
              </div>
              <div className="space-y-1"><Label className="text-xs">Quarto</Label><Input value={editForm.hotel_room || ""} onChange={e => updateEdit("hotel_room", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Código Reserva</Label><Input value={editForm.hotel_reservation_code || ""} onChange={e => updateEdit("hotel_reservation_code", e.target.value)} className="font-mono" /></div>
              <div className="space-y-1"><Label className="text-xs">Check-in</Label><Input type="date" value={editForm.hotel_checkin_date || ""} onChange={e => updateEdit("hotel_checkin_date", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Check-out</Label><Input type="date" value={editForm.hotel_checkout_date || ""} onChange={e => updateEdit("hotel_checkout_date", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Milhas</Label><Input value={editForm.miles_program || ""} onChange={e => updateEdit("miles_program", e.target.value)} /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Observações</Label><Textarea value={editForm.observations || ""} onChange={e => updateEdit("observations", e.target.value)} rows={3} /></div>
          </Card>

          {/* Passengers management in edit mode */}
          <Card className="p-5 glass-card lg:col-span-2">
            <SalePassengersManager
              saleId={id!}
              payerPassengerId={payerPassengerId}
              onPayerChange={setPayerPassengerId}
              editable={true}
            />
          </Card>
        </div>
      ) : (
        <>
        {/* KPI Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4 glass-card">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Receita</span>
            </div>
            <p className="text-lg font-bold text-foreground">{fmt(sale.received_value || 0)}</p>
          </Card>
          <Card className="p-4 glass-card">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5 text-destructive" />
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Custo</span>
            </div>
            <p className="text-lg font-bold text-foreground">{fmt(sale.total_cost || 0)}</p>
          </Card>
          <Card className="p-4 glass-card">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Lucro</span>
            </div>
            <p className={`text-lg font-bold ${(sale.profit || 0) >= 0 ? "text-emerald-600" : "text-destructive"}`}>{fmt(sale.profit || 0)}</p>
          </Card>
          <Card className="p-4 glass-card">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-accent" />
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Margem</span>
            </div>
            <p className={`text-lg font-bold ${(sale.margin || 0) >= 10 ? "text-emerald-600" : (sale.margin || 0) >= 0 ? "text-amber-600" : "text-destructive"}`}>{(sale.margin || 0).toFixed(1)}%</p>
          </Card>
        </div>

        {/* Main Grid: 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* LEFT — Aéreo + Hotel (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            {/* Aéreo Section */}
            <Card className="p-5 glass-card">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Plane className="w-3.5 h-3.5 text-primary" />
                </div>
                Aéreo
              </h3>

              {/* Route visual */}
              <div className="flex items-center justify-center gap-6 py-4 mb-3">
                <div className="text-center">
                  <p className="text-3xl font-bold font-mono text-primary">{routeCode(sale.origin_city, routeEndpoints.originIata) || "?"}</p>
                  {(sale.origin_city || routeEndpoints.originIata) && <p className="text-[10px] text-muted-foreground mt-0.5">{routeLabel(sale.origin_city, routeEndpoints.originIata)}</p>}
                </div>
                <div className="flex-1 max-w-[200px] relative">
                  <div className="border-t-2 border-dashed border-border" />
                  <Plane className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-primary bg-card p-0.5" />
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold font-mono text-primary">{routeCode(sale.destination_city, routeEndpoints.destinationIata) || "?"}</p>
                  {(sale.destination_city || routeEndpoints.destinationIata) && <p className="text-[10px] text-muted-foreground mt-0.5">{routeLabel(sale.destination_city, routeEndpoints.destinationIata)}</p>}
                </div>
              </div>

              {/* Flight details grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
                {sale.departure_date && (
                  <div className="bg-muted/30 rounded-lg p-2.5">
                    <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Ida</span>
                    <span className="font-medium text-xs">{formatDateBR(sale.departure_date)}</span>
                  </div>
                )}
                {sale.return_date && (
                  <div className="bg-muted/30 rounded-lg p-2.5">
                    <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Volta</span>
                    <span className="font-medium text-xs">{formatDateBR(sale.return_date)}</span>
                  </div>
                )}
                {sale.airline && (
                  <div className="bg-muted/30 rounded-lg p-2.5">
                    <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Companhia</span>
                    <span className="font-medium text-xs flex items-center gap-1.5">
                      <AirlineLogo iata={sale.airline} size={18} />
                      {sale.airline}
                    </span>
                  </div>
                )}
                {sale.flight_class && (
                  <div className="bg-muted/30 rounded-lg p-2.5">
                    <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Classe</span>
                    <span className="font-medium text-xs capitalize">{sale.flight_class}</span>
                  </div>
                )}
                {sale.locators?.length > 0 && (
                  <div className="bg-muted/30 rounded-lg p-2.5">
                    <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Localizador</span>
                    <span className="font-mono font-bold text-xs">{sale.locators.join(", ")}</span>
                  </div>
                )}
              </div>

              {/* Flight segments timeline */}
              {segments.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-3">Trechos ({segments.length})</h4>
                  <FlightTimeline segments={segments} showAll />
                </div>
              )}
            </Card>

            {/* Hotel Section */}
            {sale.hotel_name && (
              <Card className="p-5 glass-card">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Hotel className="w-3.5 h-3.5 text-accent" />
                  </div>
                  Hospedagem
                </h3>
                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-2">
                    <p className="text-base font-semibold">{sale.hotel_name}</p>
                    {sale.hotel_city && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {[sale.hotel_city, sale.hotel_country].filter(Boolean).join(", ")}
                      </p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                      {sale.hotel_checkin_date && (
                        <div className="bg-muted/30 rounded-lg p-2.5">
                          <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Check-in</span>
                          <span className="font-medium text-xs">{formatDateBR(sale.hotel_checkin_date)}</span>
                        </div>
                      )}
                      {sale.hotel_checkout_date && (
                        <div className="bg-muted/30 rounded-lg p-2.5">
                          <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Check-out</span>
                          <span className="font-medium text-xs">{formatDateBR(sale.hotel_checkout_date)}</span>
                        </div>
                      )}
                      {sale.hotel_room && (
                        <div className="bg-muted/30 rounded-lg p-2.5">
                          <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Quarto</span>
                          <span className="font-medium text-xs">{sale.hotel_room}</span>
                        </div>
                      )}
                      {sale.hotel_meal_plan && (
                        <div className="bg-muted/30 rounded-lg p-2.5">
                          <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Alimentação</span>
                          <span className="font-medium text-xs">{sale.hotel_meal_plan}</span>
                        </div>
                      )}
                      {sale.hotel_reservation_code && (
                        <div className="bg-muted/30 rounded-lg p-2.5">
                          <span className="text-[10px] text-muted-foreground uppercase block mb-0.5">Reserva</span>
                          <span className="font-mono font-bold text-xs">{sale.hotel_reservation_code}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Códigos e Reservas */}
            {(() => {
              const locators = Array.isArray(sale.locators) ? sale.locators.filter(Boolean) : [];
              const otherCodes = Array.isArray(sale.other_codes) ? sale.other_codes.filter(Boolean) : [];
              const hotelCode = sale.hotel_reservation_code || "";
              if (locators.length === 0 && otherCodes.length === 0 && !hotelCode) return null;

              const copyToClipboard = (text: string) => {
                navigator.clipboard.writeText(text);
                toast({ title: "Copiado!", description: text });
              };

              return (
                <Card className="p-5 glass-card">
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <KeyRound className="w-3.5 h-3.5 text-primary" />
                    </div>
                    Códigos e Reservas
                  </h3>
                  <div className="space-y-4">
                    {locators.length > 0 && (
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-2">
                          <Plane className="w-3 h-3" /> Localizadores
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {locators.map((loc: string, i: number) => (
                            <button key={i} onClick={() => copyToClipboard(loc)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/8 border border-primary/15 text-xs font-mono font-bold text-primary hover:bg-primary/15 transition-colors">
                              {loc}
                              <Copy className="w-3 h-3 opacity-50" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {otherCodes.length > 0 && (
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-2">
                          <Hash className="w-3 h-3" /> Outros Códigos
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {otherCodes.map((code: string, i: number) => (
                            <button key={i} onClick={() => copyToClipboard(code)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/40 border border-border/30 text-xs font-mono font-semibold text-foreground hover:bg-muted/60 transition-colors">
                              {code}
                              <Copy className="w-3 h-3 opacity-50" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {hotelCode && (
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1 mb-2">
                          <Hotel className="w-3 h-3" /> Código de Reserva Hotel
                        </span>
                        <button onClick={() => copyToClipboard(hotelCode)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/8 border border-accent/15 text-xs font-mono font-bold text-accent hover:bg-accent/15 transition-colors">
                          {hotelCode}
                          <Copy className="w-3 h-3 opacity-50" />
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })()}

            {/* Financial Breakdown */}
            <Card className="p-5 glass-card">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                Detalhamento Financeiro
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Valor Recebido</span>
                  <span className="font-semibold text-emerald-600">{fmt(sale.received_value || 0)}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Custo Total</span>
                  <span className="font-medium">{fmt(sale.total_cost || 0)}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="font-semibold">Lucro</span>
                  <span className={`font-bold ${(sale.profit || 0) >= 0 ? "text-emerald-600" : "text-destructive"}`}>{fmt(sale.profit || 0)}</span>
                </div>
                {sale.payment_method && (
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">Forma de Pagamento</span>
                    <Badge variant="outline" className="text-xs">{sale.payment_method}</Badge>
                  </div>
                )}
              </div>

              {costItems.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Itens de Custo ({costItems.length})</h4>
                  {costItems.map((ci: any) => (
                    <div key={ci.id} className="bg-muted/30 rounded-lg p-3 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] capitalize">{ci.category}</Badge>
                          {ci.description && <span className="text-xs text-muted-foreground">{ci.description}</span>}
                          {ci.miles_program && <Badge variant="outline" className="text-[10px] bg-accent/10">{ci.miles_program}</Badge>}
                        </div>
                        <span className="font-bold text-sm">{fmt(ci.total_item_cost || 0)}</span>
                      </div>
                      <div className="flex gap-4 text-[11px] text-muted-foreground flex-wrap">
                        {ci.emission_source && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {ci.emission_source}</span>}
                        {ci.card_info && <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> {ci.card_info}</span>}
                        {ci.cash_value > 0 && <span>Cash: {fmt(ci.cash_value)}</span>}
                        {ci.miles_quantity > 0 && <span>Milhas: {ci.miles_quantity?.toLocaleString()} × R${ci.miles_price_per_thousand}</span>}
                        {ci.miles_cost_brl > 0 && <span>= {fmt(ci.miles_cost_brl)}</span>}
                        {ci.taxes > 0 && <span>Taxas: {fmt(ci.taxes)}{ci.taxes_included_in_cash ? " (incl.)" : ""}</span>}
                        {ci.reservation_code && <span className="font-mono">Loc: {ci.reservation_code}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* RIGHT — Passengers + PAX + Obs */}
          <div className="space-y-4">
            {/* Passengers */}
            <Card className="p-5 glass-card">
              <SalePassengersManager
                saleId={id!}
                payerPassengerId={payerPassengerId}
                onPayerChange={setPayerPassengerId}
                editable={true}
              />
            </Card>

            {/* PAX Count */}
            <Card className="p-4 glass-card">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                </div>
                Contagem PAX
              </h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Adultos</span><span className="font-medium">{sale.adults}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Crianças</span><span className="font-medium">{sale.children}</span></div>
                {sale.children_ages?.length > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Idades</span><span className="text-xs">{sale.children_ages.join(", ")} anos</span></div>}
                <div className="flex justify-between font-semibold border-t border-border pt-2">
                  <span>PAX Total</span>
                  <span className="text-primary">{(sale.adults || 0) + (sale.children || 0)}</span>
                </div>
              </div>
            </Card>

            {/* Observations */}
            {sale.observations && (
              <Card className="p-4 glass-card">
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                    <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  Observações
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{sale.observations}</p>
              </Card>
            )}

            {/* Arquivos e Documentos */}
            <SaleAttachmentsSection attachments={attachments} />
          </div>
        </div>
        </>
      )}
      <PublishToPortalDialog
        open={portalOpen}
        onOpenChange={setPortalOpen}
        saleId={id!}
        clientId={sale?.client_id}
        clientEmail={clientEmail}
        saleName={sale?.name}
      />
    </div>
  );
}
