import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateBR } from "@/lib/dateFormat";
import { getVisitedCountries } from "@/lib/countryFlags";
import AirlineLogo from "@/components/AirlineLogo";
import {
  ArrowLeft, Users, Phone, Mail, MapPin, Plus, Tag, DollarSign,
  TrendingUp, Target, Plane, Hotel, Calendar, Eye, Clock,
  AlertTriangle, CheckCircle2, Send, FileText, Loader2,
  Heart, Compass, Utensils, Armchair, Star, Save, Globe, Activity,
} from "lucide-react";
import ClientTimeline from "@/components/ClientTimeline";

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

interface TravelPreferences {
  seat_preference: string;
  meal_preference: string;
  cabin_class: string;
  hotel_category: string;
  trip_style: string;
  travel_pace: string;
  special_needs: string;
  loyalty_programs: string[];
  preferred_airlines: string[];
  preferred_hotel_chains: string[];
  notes: string;
}

const defaultPrefs: TravelPreferences = {
  seat_preference: "Indiferente",
  meal_preference: "Sem restrição",
  cabin_class: "Econômica",
  hotel_category: "Conforto",
  trip_style: "Lazer",
  travel_pace: "Moderado",
  special_needs: "",
  loyalty_programs: [],
  preferred_airlines: [],
  preferred_hotel_chains: [],
  notes: "",
};

const SEAT_OPTIONS = ["Janela", "Corredor", "Indiferente"];
const MEAL_OPTIONS = ["Sem restrição", "Vegetariano", "Vegano", "Sem glúten", "Sem lactose", "Kosher", "Halal"];
const CABIN_OPTIONS = ["Econômica", "Premium Economy", "Executiva", "Primeira Classe"];
const HOTEL_OPTIONS = ["Econômico", "Conforto", "Superior", "Luxo", "Resort"];
const STYLE_OPTIONS = ["Lazer", "Aventura", "Cultural", "Romântico", "Família", "Corporativo", "Lua de mel"];
const PACE_OPTIONS = ["Relaxado", "Moderado", "Intenso"];

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
  

  // Travel preferences
  const [prefs, setPrefs] = useState<TravelPreferences>({ ...defaultPrefs });
  const [editingPrefs, setEditingPrefs] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [newLoyalty, setNewLoyalty] = useState("");
  const [newAirline, setNewAirline] = useState("");
  const [newHotelChain, setNewHotelChain] = useState("");

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      const [clientRes, salesRes, notesRes, prefsRes] = await Promise.all([
        supabase.from("clients").select("*").eq("id", id).single(),
        supabase.from("sales").select("*").eq("client_id", id).order("departure_date", { ascending: false }),
        supabase.from("client_notes").select("*, profiles:author_id(full_name)").eq("client_id", id).order("created_at", { ascending: false }),
        supabase.from("client_travel_preferences").select("*").eq("client_id", id).maybeSingle(),
      ]);

      setClient(clientRes.data as ClientData | null);
      const salesData = (salesRes.data || []) as SaleRow[];
      setSales(salesData);
      setNotes(notesRes.data || []);

      if (prefsRes.data) {
        const p = prefsRes.data as any;
        setPrefs({
          seat_preference: p.seat_preference || defaultPrefs.seat_preference,
          meal_preference: p.meal_preference || defaultPrefs.meal_preference,
          cabin_class: p.cabin_class || defaultPrefs.cabin_class,
          hotel_category: p.hotel_category || defaultPrefs.hotel_category,
          trip_style: p.trip_style || defaultPrefs.trip_style,
          travel_pace: p.travel_pace || defaultPrefs.travel_pace,
          special_needs: p.special_needs || "",
          loyalty_programs: p.loyalty_programs || [],
          preferred_airlines: p.preferred_airlines || [],
          preferred_hotel_chains: p.preferred_hotel_chains || [],
          notes: p.notes || "",
        });
      }

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
      const { data } = await supabase.from("client_notes").select("*, profiles:author_id(full_name)").eq("client_id", id).order("created_at", { ascending: false });
      setNotes(data || []);
      toast({ title: "Nota adicionada!" });
    }
    setSavingNote(false);
  };

  const handleSavePrefs = async () => {
    if (!id) return;
    setSavingPrefs(true);
    try {
      const payload = {
        client_id: id,
        seat_preference: prefs.seat_preference,
        meal_preference: prefs.meal_preference,
        cabin_class: prefs.cabin_class,
        hotel_category: prefs.hotel_category,
        trip_style: prefs.trip_style,
        travel_pace: prefs.travel_pace,
        special_needs: prefs.special_needs || null,
        loyalty_programs: prefs.loyalty_programs,
        preferred_airlines: prefs.preferred_airlines,
        preferred_hotel_chains: prefs.preferred_hotel_chains,
        notes: prefs.notes || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("client_travel_preferences")
        .upsert(payload, { onConflict: "client_id" });

      if (error) throw error;
      toast({ title: "Preferências salvas!" });
      setEditingPrefs(false);
    } catch (err: any) {
      toast({ title: "Erro ao salvar preferências", description: err.message, variant: "destructive" });
    } finally {
      setSavingPrefs(false);
    }
  };

  // KPIs
  const kpis = useMemo(() => {
    const totalReceived = sales.reduce((s, v) => s + (v.received_value || 0), 0);
    const totalCost = sales.reduce((s, v) => s + (v.total_cost || 0), 0);
    const totalProfit = totalReceived - totalCost;
    const avgMargin = sales.length > 0 ? sales.reduce((s, v) => s + (v.margin || 0), 0) / sales.length : 0;
    const avgTicket = sales.length > 0 ? totalReceived / sales.length : 0;

    const destCount: Record<string, number> = {};
    sales.forEach(s => { if (s.destination_iata) destCount[s.destination_iata] = (destCount[s.destination_iata] || 0) + 1; });
    const topDests = Object.entries(destCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d]) => d);

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

  // Visited countries
  const visitedCountries = useMemo(() => {
    const destinations = sales.map(s => s.destination_iata);
    return getVisitedCountries(destinations);
  }, [sales]);

  // Timeline
  const timelineSales = useMemo(() => {
    const now = new Date();
    if (timelineTab === "past") return sales.filter(s => !s.departure_date || new Date(s.departure_date) < now);
    if (timelineTab === "future") return sales.filter(s => s.departure_date && new Date(s.departure_date) >= now);
    return sales;
  }, [sales, timelineTab]);

  const addToList = (field: "loyalty_programs" | "preferred_airlines" | "preferred_hotel_chains", value: string, setter: (v: string) => void) => {
    if (!value.trim()) return;
    setPrefs(prev => ({ ...prev, [field]: [...prev[field], value.trim()] }));
    setter("");
  };

  const removeFromList = (field: "loyalty_programs" | "preferred_airlines" | "preferred_hotel_chains", idx: number) => {
    setPrefs(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== idx) }));
  };

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

      {/* Visited Countries Flag Badges */}
      {visitedCountries.length > 0 && (
        <Card className="p-4 glass-card">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Países Visitados</h3>
            <Badge variant="secondary" className="text-[10px] ml-auto">{visitedCountries.length} {visitedCountries.length === 1 ? "país" : "países"}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {visitedCountries.map(c => (
              <div
                key={c.code}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/60 border border-border/50 hover:bg-muted transition-colors"
                title={c.name}
              >
                <span className="text-lg leading-none">{c.flag}</span>
                <span className="text-xs font-medium text-foreground">{c.name}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

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

      {/* Main Tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="timeline" className="text-xs gap-1.5"><Activity className="w-3.5 h-3.5" /> Timeline Completa</TabsTrigger>
          <TabsTrigger value="preferences" className="text-xs gap-1.5"><Heart className="w-3.5 h-3.5" /> Preferências de Viagem</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <ClientTimeline clientId={id!} clientPhone={client.phone} sales={sales} />
        </TabsContent>

        {/* Travel Preferences Tab */}
        <TabsContent value="preferences">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground tracking-tight">Preferências de Viagem</h3>
                  <p className="text-[11px] text-muted-foreground">Personalize a experiência do cliente</p>
                </div>
              </div>
              {!editingPrefs ? (
                <Button size="sm" variant="outline" onClick={() => setEditingPrefs(true)}
                  className="gap-1.5 rounded-xl border-accent/20 text-accent font-bold hover:bg-accent/5 hover:border-accent/35 transition-all duration-200">
                  <Compass className="w-3.5 h-3.5" /> Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSavePrefs} disabled={savingPrefs}
                    className="gap-1.5 rounded-xl bg-gradient-to-r from-accent to-accent/80 text-accent-foreground font-bold shadow-[0_0_12px_-3px_hsl(var(--accent)/0.35)] hover:shadow-[0_0_18px_-3px_hsl(var(--accent)/0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                    {savingPrefs ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Salvar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingPrefs(false)} className="rounded-xl text-muted-foreground">Cancelar</Button>
                </div>
              )}
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* ✈️ Voo */}
              <div className="rounded-2xl border border-border/30 bg-card overflow-hidden">
                <div className="px-5 py-3.5 bg-gradient-to-r from-accent/[0.06] to-transparent border-b border-border/20">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Plane className="w-4 h-4 text-accent" /> Voo
                  </h4>
                </div>
                <div className="p-5 space-y-4">
                  <PrefSelect label="Assento" value={prefs.seat_preference} options={SEAT_OPTIONS} editing={editingPrefs}
                    onChange={v => setPrefs(p => ({ ...p, seat_preference: v }))} icon={Armchair} />
                  <PrefSelect label="Classe" value={prefs.cabin_class} options={CABIN_OPTIONS} editing={editingPrefs}
                    onChange={v => setPrefs(p => ({ ...p, cabin_class: v }))} icon={Star} />
                  <PrefSelect label="Refeição" value={prefs.meal_preference} options={MEAL_OPTIONS} editing={editingPrefs}
                    onChange={v => setPrefs(p => ({ ...p, meal_preference: v }))} icon={Utensils} />
                </div>
              </div>

              {/* 🏨 Hospedagem */}
              <div className="rounded-2xl border border-border/30 bg-card overflow-hidden">
                <div className="px-5 py-3.5 bg-gradient-to-r from-chart-2/[0.06] to-transparent border-b border-border/20">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Hotel className="w-4 h-4 text-chart-2" /> Hospedagem
                  </h4>
                </div>
                <div className="p-5 space-y-4">
                  <PrefSelect label="Categoria" value={prefs.hotel_category} options={HOTEL_OPTIONS} editing={editingPrefs}
                    onChange={v => setPrefs(p => ({ ...p, hotel_category: v }))} icon={Star} />
                </div>
              </div>

              {/* 🧭 Estilo */}
              <div className="rounded-2xl border border-border/30 bg-card overflow-hidden">
                <div className="px-5 py-3.5 bg-gradient-to-r from-chart-4/[0.06] to-transparent border-b border-border/20">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Compass className="w-4 h-4 text-chart-4" /> Estilo de Viagem
                  </h4>
                </div>
                <div className="p-5 space-y-4">
                  <PrefSelect label="Tipo" value={prefs.trip_style} options={STYLE_OPTIONS} editing={editingPrefs}
                    onChange={v => setPrefs(p => ({ ...p, trip_style: v }))} icon={Heart} />
                  <PrefSelect label="Ritmo" value={prefs.travel_pace} options={PACE_OPTIONS} editing={editingPrefs}
                    onChange={v => setPrefs(p => ({ ...p, travel_pace: v }))} icon={Clock} />
                </div>
              </div>
            </div>

            {/* Loyalty & Preferences Chips */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ChipList
                label="Programas de Fidelidade"
                items={prefs.loyalty_programs}
                editing={editingPrefs}
                inputValue={newLoyalty}
                onInputChange={setNewLoyalty}
                onAdd={() => addToList("loyalty_programs", newLoyalty, setNewLoyalty)}
                onRemove={i => removeFromList("loyalty_programs", i)}
                placeholder="Ex: LATAM Pass"
                icon={Star}
                color="accent"
              />
              <ChipList
                label="Cias Aéreas Preferidas"
                items={prefs.preferred_airlines}
                editing={editingPrefs}
                inputValue={newAirline}
                onInputChange={setNewAirline}
                onAdd={() => addToList("preferred_airlines", newAirline, setNewAirline)}
                onRemove={i => removeFromList("preferred_airlines", i)}
                placeholder="Ex: LATAM"
                icon={Plane}
                color="chart-3"
              />
              <ChipList
                label="Redes Hoteleiras"
                items={prefs.preferred_hotel_chains}
                editing={editingPrefs}
                inputValue={newHotelChain}
                onInputChange={setNewHotelChain}
                onAdd={() => addToList("preferred_hotel_chains", newHotelChain, setNewHotelChain)}
                onRemove={i => removeFromList("preferred_hotel_chains", i)}
                placeholder="Ex: Marriott"
                icon={Hotel}
                color="chart-2"
              />
            </div>

            {/* Special needs & notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border/30 bg-card p-5">
                <label className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-warning" /> Necessidades Especiais
                </label>
                {editingPrefs ? (
                  <Textarea value={prefs.special_needs} onChange={e => setPrefs(p => ({ ...p, special_needs: e.target.value }))}
                    placeholder="Ex: Cadeira de rodas, alergia..." rows={3} className="text-xs mt-1 border-border/30 focus:border-accent/40" />
                ) : (
                  <p className="text-sm text-foreground mt-1">{prefs.special_needs || <span className="text-muted-foreground/50 italic text-xs">Nenhuma informada</span>}</p>
                )}
              </div>
              <div className="rounded-2xl border border-border/30 bg-card p-5">
                <label className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-chart-3" /> Observações de Viagem
                </label>
                {editingPrefs ? (
                  <Textarea value={prefs.notes} onChange={e => setPrefs(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Notas adicionais sobre preferências..." rows={3} className="text-xs mt-1 border-border/30 focus:border-accent/40" />
                ) : (
                  <p className="text-sm text-foreground mt-1">{prefs.notes || <span className="text-muted-foreground/50 italic text-xs">Nenhuma informada</span>}</p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Helper Components ───────────────────────────────────────── */

function PrefSelect({ label, value, options, editing, onChange, icon: Icon }: {
  label: string; value: string; options: string[]; editing: boolean;
  onChange: (v: string) => void; icon?: typeof Plane;
}) {
  return (
    <div>
      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3 text-accent/60" />} {label}
      </label>
      {editing ? (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-9 text-xs rounded-xl border-border/30 focus:border-accent/40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/30 border border-border/15">
          <span className="text-sm font-semibold text-foreground">{value}</span>
        </div>
      )}
    </div>
  );
}

function ChipList({ label, items, editing, inputValue, onInputChange, onAdd, onRemove, placeholder, icon: Icon, color = "accent" }: {
  label: string; items: string[]; editing: boolean;
  inputValue: string; onInputChange: (v: string) => void;
  onAdd: () => void; onRemove: (i: number) => void; placeholder: string;
  icon?: typeof Plane; color?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/30 bg-card p-5">
      <label className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
        {Icon && <Icon className={`w-3.5 h-3.5 text-${color}`} />} {label}
      </label>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
        {items.length === 0 && !editing && (
          <span className="text-xs text-muted-foreground/50 italic">Nenhum cadastrado</span>
        )}
        {items.map((item, i) => (
          <span key={i} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-${color}/10 text-${color} border border-${color}/15`}>
            {item}
            {editing && (
              <button onClick={() => onRemove(i)} className="hover:text-destructive transition-colors">
                <Plus className="w-3 h-3 rotate-45" />
              </button>
            )}
          </span>
        ))}
      </div>
      {editing && (
        <div className="flex gap-1.5 mt-2">
          <Input
            value={inputValue}
            onChange={e => onInputChange(e.target.value)}
            placeholder={placeholder}
            className="h-8 text-xs rounded-lg border-border/30 focus:border-accent/40"
            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), onAdd())}
          />
          <Button size="sm" variant="outline" className="h-8 px-2.5 rounded-lg border-accent/25 text-accent hover:bg-accent/5 hover:border-accent/40 transition-all" onClick={onAdd}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
