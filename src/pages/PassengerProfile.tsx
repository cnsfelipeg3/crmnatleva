import { useState, useEffect, useMemo } from "react";
import { formatPhoneDisplay } from "@/lib/phone";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/fetchAll";
import { formatDateBR } from "@/lib/dateFormat";
import { smartCapitalizeName } from "@/lib/nameUtils";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PassengerAttachments from "@/components/passenger/PassengerAttachments";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  User, Pencil, Save, X, ShoppingCart, Plane, AlertTriangle,
  FileText, Upload, Download, Loader2, MessageCircle, ArrowLeft,
  Calendar, DollarSign, TrendingUp, MapPin, BarChart3, Brain,
  Clock, ExternalLink, Paperclip, Eye, Trash2, Phone, Copy,
} from "lucide-react";
import { toast } from "sonner";
import { DatePartsInput } from "@/components/ui/date-parts-input";
import { copyPassengersToClipboard } from "@/lib/passengerCopy";

interface Passenger {
  id: string;
  full_name: string;
  cpf: string | null;
  birth_date: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
  phone: string | null;
  email: string | null;
  rg: string | null;
  address_cep: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_country: string | null;
  address_notes: string | null;
  categoria: string | null;
  created_at: string;
}

interface SaleData {
  id: string;
  display_id: string;
  name: string;
  status: string;
  departure_date: string | null;
  return_date: string | null;
  destination_city: string | null;
  destination_iata: string | null;
  received_value: number | null;
  total_cost: number | null;
  profit: number | null;
  margin: number | null;
  seller_id: string | null;
  payer_passenger_id: string | null;
  close_date: string | null;
  role: string;
}

function formatCpf(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function formatCep(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function formatCurrency(v: number | null) {
  if (v == null) return "R$ 0,00";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function isPassportExpiringSoon(expiry: string | null): boolean {
  if (!expiry) return false;
  const exp = new Date(expiry);
  const sixMonths = new Date();
  sixMonths.setMonth(sixMonths.getMonth() + 6);
  return exp < sixMonths;
}

function isPassportExpired(expiry: string | null): boolean {
  if (!expiry) return false;
  return new Date(expiry) < new Date();
}

async function copyPassengerData(p: Passenger) {
  const ok = await copyPassengersToClipboard([{
    full_name: p.full_name,
    birth_date: p.birth_date,
    cpf: p.cpf,
    rg: p.rg,
    passport_number: p.passport_number,
    passport_expiry: p.passport_expiry,
  }]);
  if (ok) toast.success("Dados copiados para a área de transferência");
  else toast.error("Não foi possível copiar. Copie manualmente.");
}

export default function PassengerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [passenger, setPassenger] = useState<Passenger | null>(null);
  const [sales, setSales] = useState<SaleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Passenger>>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("resumo");

  useEffect(() => {
    if (!id) return;
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);

    // Fetch passenger
    const { data: paxData } = await supabase.from("passengers").select("*").eq("id", id!).single();
    if (paxData) setPassenger(paxData as any);

    // Fetch linked sales
    const { data: links } = await supabase
      .from("sale_passengers")
      .select("sale_id, role, sales:sale_id(id, display_id, name, status, departure_date, return_date, destination_city, destination_iata, received_value, total_cost, profit, margin, seller_id, payer_passenger_id, close_date)")
      .eq("passenger_id", id!);

    if (links) {
      const mapped: SaleData[] = links.map((l: any) => ({
        ...l.sales,
        role: l.role,
      })).filter(Boolean);
      setSales(mapped);
    }

    setLoading(false);
  };

  // Computed metrics
  const metrics = useMemo(() => {
    const totalAsPayer = sales.filter(s => s.payer_passenger_id === id).reduce((sum, s) => sum + (s.received_value || 0), 0);
    const totalAsPassenger = sales.reduce((sum, s) => sum + (s.received_value || 0), 0);
    const totalProfit = sales.reduce((sum, s) => sum + (s.profit || 0), 0);
    const avgTicket = sales.length > 0 ? totalAsPassenger / sales.length : 0;
    const now = new Date();
    const futureSales = sales.filter(s => s.departure_date && new Date(s.departure_date) > now);
    const pastSales = sales.filter(s => s.departure_date && new Date(s.departure_date) <= now);
    const sortedByValue = [...sales].sort((a, b) => (b.received_value || 0) - (a.received_value || 0));
    const maxSale = sortedByValue[0];
    const minSale = sortedByValue[sortedByValue.length - 1];
    const lastPurchase = sales.filter(s => s.close_date).sort((a, b) => new Date(b.close_date!).getTime() - new Date(a.close_date!).getTime())[0];
    const nextTrip = futureSales.sort((a, b) => new Date(a.departure_date!).getTime() - new Date(b.departure_date!).getTime())[0];

    return {
      totalSales: sales.length,
      totalAsPayer,
      totalAsPassenger,
      totalProfit,
      avgTicket,
      futureSales: futureSales.length,
      pastSales: pastSales.length,
      maxSale,
      minSale,
      lastPurchase,
      nextTrip,
    };
  }, [sales, id]);

  // Incomplete fields check
  const incompleteFields = useMemo(() => {
    if (!passenger) return [];
    const missing: string[] = [];
    if (!passenger.cpf) missing.push("CPF");
    if (!passenger.phone) missing.push("Telefone");
    if (!passenger.birth_date) missing.push("Data de Nascimento");
    return missing;
  }, [passenger]);

  const startEdit = () => {
    if (!passenger) return;
    setEditForm({ ...passenger });
    setEditing(true);
    setActiveTab("dados");
  };

  const handleCepLookup = async (cep: string) => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setEditForm(f => ({
          ...f,
          address_street: data.logradouro || f.address_street,
          address_neighborhood: data.bairro || f.address_neighborhood,
          address_city: data.localidade || f.address_city,
          address_state: data.uf || f.address_state,
        }));
      }
    } catch { /* ignore */ }
  };

  const handleSave = async () => {
    if (!passenger) return;
    setSaving(true);
    const capitalizedName = smartCapitalizeName(editForm.full_name || "");
    if (!capitalizedName || capitalizedName.length < 2) {
      toast.error("Nome inválido");
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("passengers").update({
      full_name: capitalizedName,
      cpf: editForm.cpf || null,
      birth_date: editForm.birth_date || null,
      passport_number: editForm.passport_number || null,
      passport_expiry: editForm.passport_expiry || null,
      phone: editForm.phone || null,
      rg: editForm.rg || null,
      address_cep: editForm.address_cep || null,
      address_street: editForm.address_street || null,
      address_number: editForm.address_number || null,
      address_complement: editForm.address_complement || null,
      address_neighborhood: editForm.address_neighborhood || null,
      address_city: editForm.address_city || null,
      address_state: editForm.address_state || null,
      address_notes: editForm.address_notes || null,
    }).eq("id", passenger.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Passageiro atualizado! Alterações sincronizadas globalmente.");
    const updated = { ...passenger, ...editForm, full_name: capitalizedName } as Passenger;
    setPassenger(updated);
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!passenger) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-muted-foreground">Passageiro não encontrado.</p>
        <Button variant="outline" onClick={() => navigate("/passengers")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigate("/passengers")} className="gap-1.5 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Passageiros
      </Button>

      {/* HEADER */}
      <Card className="p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          {/* Avatar */}
          <Avatar className="w-20 h-20 text-2xl border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
              {getInitials(passenger.full_name)}
            </AvatarFallback>
          </Avatar>

          {/* Identity */}
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <h1 className="text-xl md:text-2xl font-serif text-foreground">{passenger.full_name}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                  {passenger.cpf && <span className="font-mono">{passenger.cpf}</span>}
                  {passenger.cpf && passenger.passport_number && <span>•</span>}
                  {passenger.passport_number && <span className="font-mono">🛂 {passenger.passport_number}</span>}
                </div>
                {passenger.address_city && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {passenger.address_city}/{passenger.address_state}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {passenger.categoria && (
                  <Badge variant="secondary" className="text-[10px]">{passenger.categoria}</Badge>
                )}
                {incompleteFields.length > 0 && (
                  <Badge variant="destructive" className="text-[10px] gap-1">
                    <AlertTriangle className="w-3 h-3" /> Cadastro incompleto
                  </Badge>
                )}
                {isPassportExpired(passenger.passport_expiry) && (
                  <Badge variant="destructive" className="text-[10px]">🛂 Passaporte vencido</Badge>
                )}
                {!isPassportExpired(passenger.passport_expiry) && isPassportExpiringSoon(passenger.passport_expiry) && (
                  <Badge className="text-[10px] bg-warning text-warning-foreground">🛂 Vencendo em breve</Badge>
                )}
              </div>
            </div>

            {incompleteFields.length > 0 && (
              <p className="text-xs text-destructive">
                Campos faltando: {incompleteFields.join(", ")} — <button onClick={startEdit} className="underline">atualizar cadastro</button>
              </p>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/40">
          <Button size="sm" onClick={() => navigate("/sales/new", { state: { preSelectedPassengers: [{ id: passenger.id, full_name: passenger.full_name, cpf: passenger.cpf, birth_date: passenger.birth_date, passport_number: passenger.passport_number, passport_expiry: passenger.passport_expiry, phone: passenger.phone }] } })}>
            <ShoppingCart className="w-4 h-4 mr-1" /> Criar venda
          </Button>
          {passenger.phone && (
            <Button variant="outline" size="sm" asChild>
              <a href={`https://wa.me/55${passenger.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
              </a>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={startEdit}>
            <Pencil className="w-4 h-4 mr-1" /> Editar cadastro
          </Button>
          <Button variant="outline" size="sm" onClick={() => copyPassengerData(passenger)}>
            <Copy className="w-4 h-4 mr-1" /> Copiar dados
          </Button>
        </div>
      </Card>

      {/* TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="resumo" className="text-xs">📊 Resumo</TabsTrigger>
          <TabsTrigger value="viagens" className="text-xs">✈️ Viagens</TabsTrigger>
          <TabsTrigger value="dados" className="text-xs">📋 Dados Pessoais</TabsTrigger>
          <TabsTrigger value="anexos" className="text-xs">📎 Anexos</TabsTrigger>
        </TabsList>

        {/* TAB RESUMO */}
        <TabsContent value="resumo" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard icon={<Plane className="w-4 h-4" />} label="Total de Viagens" value={metrics.totalSales.toString()} />
            <MetricCard icon={<DollarSign className="w-4 h-4" />} label="Total Gasto" value={formatCurrency(metrics.totalAsPassenger)} />
            <MetricCard icon={<TrendingUp className="w-4 h-4" />} label="Ticket Médio" value={formatCurrency(metrics.avgTicket)} />
            <MetricCard icon={<DollarSign className="w-4 h-4" />} label="Lucro Gerado" value={formatCurrency(metrics.totalProfit)} />
            <MetricCard icon={<Calendar className="w-4 h-4" />} label="Viagens Futuras" value={metrics.futureSales.toString()} />
            <MetricCard icon={<Clock className="w-4 h-4" />} label="Viagens Concluídas" value={metrics.pastSales.toString()} />
            <MetricCard
              icon={<TrendingUp className="w-4 h-4" />}
              label="Maior Compra"
              value={metrics.maxSale ? formatCurrency(metrics.maxSale.received_value) : "—"}
              subtitle={metrics.maxSale?.destination_city || ""}
            />
            <MetricCard
              icon={<Calendar className="w-4 h-4" />}
              label="Última Compra"
              value={metrics.lastPurchase?.close_date ? formatDateBR(metrics.lastPurchase.close_date) : "—"}
            />
          </div>

          {metrics.nextTrip && (
            <Card className="p-4 border-primary/20 bg-primary/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Plane className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Próxima Viagem</p>
                  <p className="text-xs text-muted-foreground">
                    {metrics.nextTrip.destination_city || "Destino"} — {metrics.nextTrip.departure_date ? formatDateBR(metrics.nextTrip.departure_date) : ""}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate(`/sales/${metrics.nextTrip!.id}`)}>
                  <Eye className="w-4 h-4 mr-1" /> Ver
                </Button>
              </div>
            </Card>
          )}

          {/* Destinations visited */}
          {sales.length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Destinos Visitados
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {[...new Set(sales.map(s => s.destination_city).filter(Boolean))].map(dest => (
                  <Badge key={dest} variant="outline" className="text-xs">{dest}</Badge>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* TAB VIAGENS */}
        <TabsContent value="viagens" className="space-y-3 mt-4">
          {sales.length === 0 ? (
            <div className="text-center py-12">
              <Plane className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma viagem vinculada</p>
            </div>
          ) : (
            <>
              {/* Timeline-style cards */}
              {sales
                .sort((a, b) => {
                  const da = a.departure_date ? new Date(a.departure_date).getTime() : 0;
                  const db = b.departure_date ? new Date(b.departure_date).getTime() : 0;
                  return db - da;
                })
                .map(sale => {
                  const now = new Date();
                  const dep = sale.departure_date ? new Date(sale.departure_date) : null;
                  const ret = sale.return_date ? new Date(sale.return_date) : null;
                  const isFuture = dep && dep > now;
                  const isActive = dep && ret && dep <= now && ret >= now;
                  const isPast = !isFuture && !isActive;

                  return (
                    <Card
                      key={sale.id}
                      className={`p-4 cursor-pointer hover:shadow-md transition-shadow border-l-4 ${
                        isFuture ? "border-l-primary" : isActive ? "border-l-green-500" : "border-l-muted-foreground/20"
                      }`}
                      onClick={() => navigate(`/sales/${sale.id}`)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground truncate">{sale.name}</span>
                            <Badge variant="outline" className="text-[10px]">{sale.display_id}</Badge>
                            <Badge
                              variant={isFuture ? "default" : isActive ? "secondary" : "outline"}
                              className="text-[10px]"
                            >
                              {isFuture ? "Futura" : isActive ? "Em viagem" : "Concluída"}
                            </Badge>
                            {sale.payer_passenger_id === id && (
                              <Badge variant="secondary" className="text-[10px]">💳 Pagador</Badge>
                            )}
                          </div>
                          <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground">
                            {sale.destination_city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {sale.destination_city}
                              </span>
                            )}
                            {sale.departure_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {formatDateBR(sale.departure_date)}
                                {sale.return_date && ` → ${formatDateBR(sale.return_date)}`}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-foreground">{formatCurrency(sale.received_value)}</p>
                          {sale.profit != null && sale.profit > 0 && (
                            <p className="text-[10px] text-green-600">+{formatCurrency(sale.profit)}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
            </>
          )}
        </TabsContent>

        {/* TAB DADOS PESSOAIS */}
        <TabsContent value="dados" className="mt-4">
          <Card className="p-5">
            {!editing ? (
              <div className="space-y-4">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => copyPassengerData(passenger)}>
                    <Copy className="w-4 h-4 mr-1" /> Copiar dados
                  </Button>
                  <Button variant="outline" size="sm" onClick={startEdit}>
                    <Pencil className="w-4 h-4 mr-1" /> Editar
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DataField label="Nome Completo" value={passenger.full_name} />
                  <DataField label="CPF" value={passenger.cpf} mono />
                  <DataField label="RG" value={passenger.rg} mono />
                  <DataField label="Data de Nascimento" value={passenger.birth_date ? formatDateBR(passenger.birth_date) : null} />
                  <DataField label="Telefone" value={formatPhoneDisplay(passenger.phone)} />
                  <DataField label="Passaporte" value={passenger.passport_number} mono />
                  <DataField label="Validade Passaporte" value={passenger.passport_expiry ? formatDateBR(passenger.passport_expiry) : null}
                    alert={isPassportExpiringSoon(passenger.passport_expiry)} />
                  <DataField label="Categoria" value={passenger.categoria} />
                </div>

                {/* Address */}
                {(passenger.address_street || passenger.address_city) && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-foreground mb-3">Endereço</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DataField label="CEP" value={passenger.address_cep} />
                      <DataField label="Rua" value={passenger.address_street} />
                      <DataField label="Número" value={passenger.address_number} />
                      <DataField label="Complemento" value={passenger.address_complement} />
                      <DataField label="Bairro" value={passenger.address_neighborhood} />
                      <DataField label="Cidade/UF" value={passenger.address_city ? `${passenger.address_city}/${passenger.address_state}` : null} />
                      {passenger.address_notes && (
                        <div className="md:col-span-2">
                          <DataField label="Observações" value={passenger.address_notes} />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input value={editForm.full_name || ""} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>CPF</Label>
                    <Input value={editForm.cpf || ""} onChange={e => setEditForm(f => ({ ...f, cpf: formatCpf(e.target.value) }))} placeholder="000.000.000-00" />
                  </div>
                  <div className="space-y-2">
                    <Label>RG</Label>
                    <Input value={editForm.rg || ""} onChange={e => setEditForm(f => ({ ...f, rg: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Data de Nascimento</Label>
                    <DatePartsInput value={editForm.birth_date || ""} onChange={(iso) => setEditForm(f => ({ ...f, birth_date: iso }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input value={editForm.phone || ""} onChange={e => setEditForm(f => ({ ...f, phone: formatPhone(e.target.value) }))} placeholder="(11) 99999-9999" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Passaporte</Label>
                    <Input value={editForm.passport_number || ""} onChange={e => setEditForm(f => ({ ...f, passport_number: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Validade Passaporte</Label>
                    <DatePartsInput value={editForm.passport_expiry || ""} onChange={(iso) => setEditForm(f => ({ ...f, passport_expiry: iso }))} />
                  </div>
                </div>

                <div className="border-t pt-3">
                  <h4 className="text-sm font-semibold mb-3">Endereço</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>CEP</Label>
                      <Input value={editForm.address_cep || ""} onChange={e => {
                        const v = formatCep(e.target.value);
                        setEditForm(f => ({ ...f, address_cep: v }));
                        if (v.replace(/\D/g, "").length === 8) handleCepLookup(v);
                      }} placeholder="00000-000" />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Rua</Label>
                      <Input value={editForm.address_street || ""} onChange={e => setEditForm(f => ({ ...f, address_street: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div className="space-y-2">
                      <Label>Número</Label>
                      <Input value={editForm.address_number || ""} onChange={e => setEditForm(f => ({ ...f, address_number: e.target.value }))} />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Complemento</Label>
                      <Input value={editForm.address_complement || ""} onChange={e => setEditForm(f => ({ ...f, address_complement: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div className="space-y-2">
                      <Label>Bairro</Label>
                      <Input value={editForm.address_neighborhood || ""} onChange={e => setEditForm(f => ({ ...f, address_neighborhood: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Input value={editForm.address_city || ""} onChange={e => setEditForm(f => ({ ...f, address_city: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>UF</Label>
                      <Input value={editForm.address_state || ""} onChange={e => setEditForm(f => ({ ...f, address_state: e.target.value }))} maxLength={2} />
                    </div>
                  </div>
                  <div className="space-y-2 mt-3">
                    <Label>Observações <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                    <Textarea
                      value={editForm.address_notes || ""}
                      onChange={e => setEditForm(f => ({ ...f, address_notes: e.target.value }))}
                      placeholder="Ex.: ponto de referência, instruções de entrega…"
                      rows={2}
                      maxLength={500}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>
                    <X className="w-4 h-4 mr-1" /> Cancelar
                  </Button>
                  <Button className="flex-1" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                    Salvar
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="anexos" className="mt-4">
          {id && <PassengerAttachments passengerId={id} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ icon, label, value, subtitle }: { icon: React.ReactNode; label: string; value: string; subtitle?: string }) {
  return (
    <Card className="p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
      {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
    </Card>
  );
}

function DataField({ label, value, mono, alert: isAlert }: { label: string; value: string | null; mono?: boolean; alert?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      {value ? (
        <p className={`text-sm text-foreground ${mono ? "font-mono" : ""} ${isAlert ? "text-destructive" : ""}`}>
          {value}
          {isAlert && <AlertTriangle className="w-3 h-3 inline ml-1" />}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground/50 italic">atualizar campo</p>
      )}
    </div>
  );
}
