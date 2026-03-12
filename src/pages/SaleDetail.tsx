import { useParams, useNavigate } from "react-router-dom";
import { formatDateBR } from "@/lib/dateFormat";
import { useState, useEffect } from "react";
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
import { ArrowLeft, Plane, Hotel, Users, DollarSign, Copy, FileText, Loader2, Pencil, Save, X } from "lucide-react";
import FlightTimeline, { type FlightSegment } from "@/components/FlightTimeline";
import { useToast } from "@/hooks/use-toast";
import AirportAutocomplete from "@/components/AirportAutocomplete";
import AirlineAutocomplete from "@/components/AirlineAutocomplete";
import FlightEnrichmentDialog from "@/components/FlightEnrichmentDialog";
import HotelAutocomplete from "@/components/HotelAutocomplete";
import AirlineLogo, { AirlineLogosStack } from "@/components/AirlineLogo";
import ClientAutocomplete from "@/components/ClientAutocomplete";
import SalePassengersManager from "@/components/SalePassengersManager";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function SaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sale, setSale] = useState<any>(null);
  const [segments, setSegments] = useState<FlightSegment[]>([]);
  const [costItems, setCostItems] = useState<any[]>([]);
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

  useEffect(() => {
    const fetchData = async () => {
      const { data: saleData } = await supabase.from("sales").select("*").eq("id", id).single();
      setSale(saleData);
      if (saleData) {
        setEditForm(saleData);
        setPayerPassengerId(saleData.payer_passenger_id || null);
        if (saleData.client_id) {
          const { data: clientData } = await supabase.from("clients").select("display_name").eq("id", saleData.client_id).single();
          if (clientData) setClientName(clientData.display_name);
        }
      }

      const { data: segData } = await supabase.from("flight_segments").select("*").eq("sale_id", id).order("segment_order");
      setSegments((segData || []) as FlightSegment[]);

      const { data: costData } = await supabase.from("cost_items").select("*").eq("sale_id", id);
      setCostItems(costData || []);

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

  if (loading) return <div className="p-6 text-center text-muted-foreground animate-fade-in">Carregando...</div>;
  if (!sale) return (
    <div className="p-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate("/sales")}><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
      <p className="mt-8 text-center text-muted-foreground">Venda não encontrada.</p>
    </div>
  );

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/sales")}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-2xl font-serif text-foreground">{sale.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{sale.display_id} · {formatDateBR(sale.close_date)}</span>
              {sale.client_id && clientName && (
                <button onClick={() => navigate(`/clients/${sale.client_id}`)} className="text-primary hover:underline text-xs font-medium">
                  👤 {clientName}
                </button>
              )}
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
              <Button variant="outline" size="sm" onClick={startEdit}><Pencil className="w-4 h-4 mr-1" /> Editar</Button>
              <Button size="sm" onClick={handleGenerateSummary}>
                <FileText className="w-4 h-4 mr-1" /> Resumo NatLeva
              </Button>
            </>
          )}
          <Badge variant="outline" className="self-center">{sale.status}</Badge>
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
        /* View mode */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Financial */}
          <Card className="p-5 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-accent" /> Financeiro
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-muted-foreground text-sm">Valor Recebido</span><span className="font-semibold text-success">{fmt(sale.received_value || 0)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground text-sm">Custo Total</span><span className="font-medium">{fmt(sale.total_cost || 0)}</span></div>
              <div className="border-t border-border pt-2 flex justify-between"><span className="text-muted-foreground text-sm">Lucro</span><span className="font-bold text-primary">{fmt(sale.profit || 0)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground text-sm">Margem</span><span className="font-bold text-accent">{(sale.margin || 0).toFixed(1)}%</span></div>
              {sale.payment_method && <div className="flex justify-between"><span className="text-muted-foreground text-sm">Pagamento</span><span className="text-sm">{sale.payment_method}</span></div>}
            </div>

            {costItems.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground">Detalhamento de Custos</h4>
                {costItems.map((ci: any) => (
                  <div key={ci.id} className="text-xs bg-muted/50 rounded p-2 space-y-1">
                    <div className="flex justify-between"><span className="font-medium capitalize">{ci.category}</span><span className="font-semibold">{fmt(ci.total_item_cost || 0)}</span></div>
                    {ci.cash_value > 0 && <div className="flex justify-between text-muted-foreground"><span>Cash</span><span>{fmt(ci.cash_value)}</span></div>}
                    {ci.miles_cost_brl > 0 && <div className="flex justify-between text-muted-foreground"><span>Milhas ({ci.miles_quantity?.toLocaleString()} × R${ci.miles_price_per_thousand})</span><span>{fmt(ci.miles_cost_brl)}</span></div>}
                    {ci.taxes > 0 && <div className="flex justify-between text-muted-foreground"><span>Taxas{ci.taxes_included_in_cash ? " (incl.)" : ""}</span><span>{fmt(ci.taxes)}</span></div>}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Flight */}
          <Card className="p-5 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Plane className="w-4 h-4 text-primary" /> Aéreo
            </h3>
            <div className="flex items-center justify-center gap-4 py-3">
              <div className="text-center">
                <p className="text-2xl font-bold font-mono text-primary">{sale.origin_iata || "?"}</p>
              </div>
              <div className="flex-1 border-t border-dashed border-border relative">
                <Plane className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground bg-card" />
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold font-mono text-primary">{sale.destination_iata || "?"}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {sale.departure_date && <div className="flex justify-between"><span className="text-muted-foreground">Ida</span><span>{formatDateBR(sale.departure_date)}</span></div>}
              {sale.return_date && <div className="flex justify-between"><span className="text-muted-foreground">Volta</span><span>{formatDateBR(sale.return_date)}</span></div>}
              {sale.airline && <div className="flex justify-between items-center"><span className="text-muted-foreground">Companhia</span><span className="flex items-center gap-2"><AirlineLogo iata={sale.airline} size={28} />{sale.airline}</span></div>}
              {sale.locators?.length > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Localizador</span><span className="font-mono font-semibold">{sale.locators.join(", ")}</span></div>}
              {sale.miles_program && <div className="flex justify-between"><span className="text-muted-foreground">Milhas</span><Badge variant="outline">{sale.miles_program}</Badge></div>}
            </div>

            {segments.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                <FlightTimeline segments={segments} showAll />
              </div>
            )}
          </Card>

          {/* PAX & Hotel */}
          <div className="space-y-4">
            {/* Passengers linked - view mode */}
            <Card className="p-5 glass-card">
              <SalePassengersManager
                saleId={id!}
                payerPassengerId={payerPassengerId}
                onPayerChange={setPayerPassengerId}
                editable={true}
              />
            </Card>

            <Card className="p-5 glass-card">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-info" /> Contagem PAX
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Adultos</span><span>{sale.adults}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Crianças</span><span>{sale.children}</span></div>
                {sale.children_ages?.length > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Idades</span><span>{sale.children_ages.join(", ")} anos</span></div>}
                <div className="flex justify-between font-semibold border-t border-border pt-2"><span>PAX Total</span><span>{(sale.adults || 0) + (sale.children || 0)}</span></div>
              </div>
            </Card>

            {sale.hotel_name && (
              <Card className="p-5 glass-card">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Hotel className="w-4 h-4 text-accent" /> Hotel
                </h3>
                <p className="text-sm font-medium">{sale.hotel_name}</p>
                {sale.hotel_city && <p className="text-xs text-muted-foreground">📍 {[sale.hotel_city, sale.hotel_country].filter(Boolean).join(", ")}</p>}
                {sale.hotel_room && <p className="text-xs text-muted-foreground">🛏️ {sale.hotel_room}</p>}
                {sale.hotel_meal_plan && <p className="text-xs text-muted-foreground">🍽️ {sale.hotel_meal_plan}</p>}
                {sale.hotel_reservation_code && <p className="text-xs font-mono mt-1">📋 {sale.hotel_reservation_code}</p>}
                {sale.hotel_checkin_date && <p className="text-xs text-muted-foreground">📅 Check-in: {formatDateBR(sale.hotel_checkin_date)}</p>}
                {sale.hotel_checkout_date && <p className="text-xs text-muted-foreground">📅 Check-out: {formatDateBR(sale.hotel_checkout_date)}</p>}
              </Card>
            )}

            {sale.observations && (
              <Card className="p-5 glass-card">
                <h3 className="text-sm font-semibold text-foreground mb-2">Observações</h3>
                <p className="text-sm text-muted-foreground">{sale.observations}</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
