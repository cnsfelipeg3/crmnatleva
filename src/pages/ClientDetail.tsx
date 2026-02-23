import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateBR } from "@/lib/dateFormat";
import AirlineLogo from "@/components/AirlineLogo";
import {
  ArrowLeft, Users, Phone, Mail, MapPin, Plus, Tag, DollarSign,
  TrendingUp, Target, Plane, Hotel, Calendar, Eye, Clock,
  AlertTriangle, CheckCircle2, Send, FileText, Loader2,
} from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface ClientData {
  id: string;
  display_name: string;
  client_type: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  tags: string[];
  observations: string | null;
}

interface SaleRow {
  id: string; display_id: string; name: string; status: string;
  origin_iata: string | null; destination_iata: string | null;
  departure_date: string | null; return_date: string | null;
  received_value: number; total_cost: number; profit: number; margin: number;
  products: string[]; airline: string | null; hotel_name: string | null;
  hotel_checkin_date: string | null; hotel_checkout_date: string | null;
  created_at: string; close_date: string | null;
}

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [client, setClient] = useState<ClientData | null>(null);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [checkinTasks, setCheckinTasks] = useState<any[]>([]);
  const [lodgingTasks, setLodgingTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [timelineTab, setTimelineTab] = useState<"all" | "past" | "future">("all");

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      const [clientRes, salesRes, notesRes] = await Promise.all([
        supabase.from("clients").select("*").eq("id", id).single(),
        supabase.from("sales").select("*").eq("client_id", id).order("departure_date", { ascending: false }),
        supabase.from("client_notes").select("*, profiles:author_id(full_name)").eq("client_id", id).order("created_at", { ascending: false }),
      ]);

      setClient(clientRes.data as ClientData | null);
      const salesData = (salesRes.data || []) as SaleRow[];
      setSales(salesData);
      setNotes(notesRes.data || []);

      // Fetch operational tasks for this client's sales
      const saleIds = salesData.map(s => s.id);
      if (saleIds.length > 0) {
        const [checkinRes, lodgingRes] = await Promise.all([
          supabase.from("checkin_tasks").select("*, flight_segments(*)").in("sale_id", saleIds).not("status", "eq", "CONCLUIDO").order("departure_datetime_utc"),
          supabase.from("lodging_confirmation_tasks").select("*").in("sale_id", saleIds).not("status", "in", '("CONFIRMADO","CANCELADO")').order("scheduled_at_utc"),
        ]);
        setCheckinTasks(checkinRes.data || []);
        setLodgingTasks(lodgingRes.data || []);
      }

      setLoading(false);
    };
    fetchAll();
  }, [id]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !id) return;
    setSavingNote(true);
    const { error } = await supabase.from("client_notes").insert({
      client_id: id,
      content: newNote.trim(),
      author_id: user?.id,
    });
    if (error) {
      toast({ title: "Erro ao salvar nota", variant: "destructive" });
    } else {
      setNewNote("");
      // Refresh notes
      const { data } = await supabase.from("client_notes").select("*, profiles:author_id(full_name)").eq("client_id", id).order("created_at", { ascending: false });
      setNotes(data || []);
      toast({ title: "Nota adicionada!" });
    }
    setSavingNote(false);
  };

  // KPIs
  const kpis = useMemo(() => {
    const totalReceived = sales.reduce((s, v) => s + (v.received_value || 0), 0);
    const totalCost = sales.reduce((s, v) => s + (v.total_cost || 0), 0);
    const totalProfit = totalReceived - totalCost;
    const avgMargin = sales.length > 0 ? sales.reduce((s, v) => s + (v.margin || 0), 0) / sales.length : 0;
    const avgTicket = sales.length > 0 ? totalReceived / sales.length : 0;

    // Top destinations
    const destCount: Record<string, number> = {};
    sales.forEach(s => { if (s.destination_iata) destCount[s.destination_iata] = (destCount[s.destination_iata] || 0) + 1; });
    const topDests = Object.entries(destCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d]) => d);

    // Last & next trip
    const now = new Date();
    const pastSales = sales.filter(s => s.departure_date && new Date(s.departure_date) < now).sort((a, b) => new Date(b.departure_date!).getTime() - new Date(a.departure_date!).getTime());
    const futureSales = sales.filter(s => s.departure_date && new Date(s.departure_date) >= now).sort((a, b) => new Date(a.departure_date!).getTime() - new Date(b.departure_date!).getTime());

    return {
      totalReceived, totalCost, totalProfit, avgMargin, avgTicket,
      totalSales: sales.length, topDests,
      lastTrip: pastSales[0] || null,
      nextTrip: futureSales[0] || null,
    };
  }, [sales]);

  // Timeline
  const timelineSales = useMemo(() => {
    const now = new Date();
    if (timelineTab === "past") return sales.filter(s => !s.departure_date || new Date(s.departure_date) < now);
    if (timelineTab === "future") return sales.filter(s => s.departure_date && new Date(s.departure_date) >= now);
    return sales;
  }, [sales, timelineTab]);

  if (loading) return <div className="p-6 text-center text-muted-foreground animate-fade-in">Carregando...</div>;
  if (!client) return (
    <div className="p-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
      <p className="mt-8 text-center text-muted-foreground">Cliente não encontrado.</p>
    </div>
  );

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-2xl font-serif text-foreground flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" /> {client.display_name}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Badge variant="outline" className="text-[10px]">
                {client.client_type === "pessoa_fisica" ? "Pessoa Física" : client.client_type === "familia" ? "Família" : "Empresa"}
              </Badge>
              {client.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{[client.city, client.state].filter(Boolean).join("/")}</span>}
              {client.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</span>}
              {client.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{client.email}</span>}
            </div>
            {client.tags?.length > 0 && (
              <div className="flex gap-1 mt-1.5">
                {client.tags.map(t => <Badge key={t} variant="secondary" className="text-[10px]"><Tag className="w-2.5 h-2.5 mr-0.5" />{t}</Badge>)}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => navigate("/sales/new")}><Plus className="w-4 h-4 mr-1" /> Nova Venda</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Total Gasto", value: fmt(kpis.totalReceived), icon: DollarSign, color: "text-success" },
          { label: "Vendas", value: kpis.totalSales.toString(), icon: FileText, color: "text-primary" },
          { label: "Ticket Médio", value: fmt(kpis.avgTicket), icon: DollarSign, color: "text-info" },
          { label: "Lucro Total", value: fmt(kpis.totalProfit), icon: TrendingUp, color: "text-primary" },
          { label: "Margem Média", value: `${kpis.avgMargin.toFixed(1)}%`, icon: Target, color: "text-accent" },
          { label: "Top Destinos", value: kpis.topDests.join(", ") || "—", icon: Plane, color: "text-primary" },
          { label: "Última Viagem", value: kpis.lastTrip ? formatDateBR(kpis.lastTrip.departure_date) : "—", icon: Calendar, color: "text-muted-foreground" },
          { label: "Próxima Viagem", value: kpis.nextTrip ? formatDateBR(kpis.nextTrip.departure_date) : "—", icon: Calendar, color: "text-info" },
        ].map(k => (
          <Card key={k.label} className="p-3 glass-card">
            <div className="flex items-center gap-1.5 mb-1">
              <k.icon className={`w-3.5 h-3.5 ${k.color}`} />
              <span className="text-[10px] text-muted-foreground">{k.label}</span>
            </div>
            <p className="text-sm font-bold text-foreground truncate">{k.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Timeline */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5 glass-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Timeline de Vendas</h3>
              <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                {(["all", "past", "future"] as const).map(t => (
                  <button key={t} onClick={() => setTimelineTab(t)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${timelineTab === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
                  >
                    {t === "all" ? "Todas" : t === "past" ? "Passadas" : "Futuras"}
                  </button>
                ))}
              </div>
            </div>

            {timelineSales.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma venda encontrada</p>
            ) : (
              <div className="space-y-3">
                {timelineSales.map(sale => (
                  <div key={sale.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/60 cursor-pointer transition-colors border border-border/50"
                    onClick={() => navigate(`/sales/${sale.id}`)}
                  >
                    <div className="mt-1 shrink-0">
                      {sale.airline && <AirlineLogo iata={sale.airline} size={24} />}
                      {!sale.airline && <Plane className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {sale.destination_iata || sale.name}
                        </span>
                        <Badge variant="outline" className="text-[10px] shrink-0">{sale.status}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">{sale.origin_iata || "?"} → {sale.destination_iata || "?"}</span>
                        {sale.departure_date && <span>· {formatDateBR(sale.departure_date)}</span>}
                        {sale.return_date && <span>→ {formatDateBR(sale.return_date)}</span>}
                      </div>
                      <div className="flex gap-1.5 mt-1">
                        {sale.products?.map(p => (
                          <Badge key={p} variant="secondary" className="text-[10px] h-4 px-1.5">
                            {p === "Aéreo" && <Plane className="w-2.5 h-2.5 mr-0.5" />}
                            {p === "Hotel" && <Hotel className="w-2.5 h-2.5 mr-0.5" />}
                            {p}
                          </Badge>
                        ))}
                      </div>
                      {sale.hotel_name && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">🏨 {sale.hotel_name}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-success">{fmt(sale.received_value || 0)}</p>
                      <p className="text-[10px] text-muted-foreground">Custo: {fmt(sale.total_cost || 0)}</p>
                      <p className="text-[10px] font-medium text-primary">{fmt(sale.profit || 0)} ({(sale.margin || 0).toFixed(1)}%)</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Operational */}
          {(checkinTasks.length > 0 || lodgingTasks.length > 0) && (
            <Card className="p-4 glass-card">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" /> Pendências Operacionais
              </h3>
              {checkinTasks.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase">Check-ins</p>
                  {checkinTasks.slice(0, 5).map(t => {
                    const sale = sales.find(s => s.id === t.sale_id);
                    return (
                      <div key={t.id}
                        className="flex items-center gap-2 p-2 rounded bg-muted/50 mb-1 cursor-pointer hover:bg-muted"
                        onClick={() => navigate("/checkin")}
                      >
                        <Clock className="w-3 h-3 text-warning shrink-0" />
                        <span className="text-xs text-foreground truncate">
                          {sale?.destination_iata || "?"} · {t.direction}
                        </span>
                        <Badge variant="outline" className="text-[10px] ml-auto shrink-0">{t.status}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
              {lodgingTasks.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase">Hospedagens</p>
                  {lodgingTasks.slice(0, 5).map(t => (
                    <div key={t.id}
                      className="flex items-center gap-2 p-2 rounded bg-muted/50 mb-1 cursor-pointer hover:bg-muted"
                      onClick={() => navigate("/hospedagem")}
                    >
                      <Hotel className="w-3 h-3 text-accent shrink-0" />
                      <span className="text-xs text-foreground truncate">{t.hotel_name || "Hotel"}</span>
                      <Badge variant="outline" className="text-[10px] ml-auto shrink-0">{t.milestone}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Notes */}
          <Card className="p-4 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-info" /> Notas Internas
            </h3>
            <div className="flex gap-2 mb-3">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Adicionar nota..."
                rows={2}
                className="text-xs"
              />
              <Button size="sm" onClick={handleAddNote} disabled={savingNote || !newNote.trim()} className="shrink-0 self-end">
                {savingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </Button>
            </div>
            {notes.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">Nenhuma nota ainda</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {notes.map(n => (
                  <div key={n.id} className="p-2.5 rounded bg-muted/50 text-xs">
                    <p className="text-foreground whitespace-pre-wrap">{n.content}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {n.profiles?.full_name || "Sistema"} · {new Date(n.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Preferences (auto-generated) */}
          {sales.length >= 2 && (
            <Card className="p-4 glass-card">
              <h3 className="text-sm font-semibold text-foreground mb-3">Perfil do Cliente</h3>
              <div className="space-y-2 text-xs">
                {(() => {
                  const avgValue = kpis.totalReceived / kpis.totalSales;
                  const style = avgValue > 8000 ? "Premium" : avgValue > 3000 ? "Conforto" : "Econômico";
                  return <div className="flex justify-between"><span className="text-muted-foreground">Estilo</span><Badge variant="secondary" className="text-[10px]">{style}</Badge></div>;
                })()}
                {kpis.topDests.length > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Destinos preferidos</span><span className="font-mono">{kpis.topDests.join(", ")}</span></div>
                )}
                {(() => {
                  const hotels = sales.map(s => s.hotel_name).filter(Boolean);
                  const unique = [...new Set(hotels)];
                  if (unique.length > 0) return <div className="flex justify-between"><span className="text-muted-foreground">Hotéis</span><span className="truncate max-w-[120px]">{unique.slice(0, 2).join(", ")}</span></div>;
                  return null;
                })()}
              </div>
            </Card>
          )}

          {/* Observations */}
          {client.observations && (
            <Card className="p-4 glass-card">
              <h3 className="text-sm font-semibold text-foreground mb-2">Observações</h3>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{client.observations}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
