import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Globe, Eye, Plane, Hotel, Users, FileText, DollarSign,
  ClipboardCheck, Bell, Calendar, MapPin, Edit, Send, CheckCircle2,
  Shield, Clock, Luggage, Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateBR } from "@/lib/dateFormat";
import { toast } from "sonner";
import AirlineLogo from "@/components/AirlineLogo";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function getTripStatus(sale: any): string {
  const dep = sale?.departure_date ? new Date(sale.departure_date + "T00:00:00") : null;
  const ret = sale?.return_date ? new Date(sale.return_date + "T23:59:59") : null;
  const now = new Date();
  if (!dep) return "planejamento";
  if (sale.status === "Cancelado" || sale.status === "Cancelada") return "cancelada";
  if (dep > now) return "confirmada";
  if (dep <= now && ret && ret >= now) return "em_andamento";
  if (ret && ret < now) return "concluida";
  return "planejamento";
}

const statusLabel: Record<string, string> = {
  planejamento: "Planejamento",
  confirmada: "Confirmada",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};
const statusStyle: Record<string, string> = {
  planejamento: "bg-muted text-muted-foreground",
  confirmada: "bg-info/10 text-info border-info/20",
  em_andamento: "bg-accent/10 text-accent border-accent/20",
  concluida: "bg-success/15 text-success border-success/20",
  cancelada: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function PortalAdminTripDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sale, setSale] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [segments, setSegments] = useState<any[]>([]);
  const [costItems, setCostItems] = useState<any[]>([]);
  const [passengers, setPassengers] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibilityMap, setVisibilityMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (authLoading || !id) return;

    Promise.all([
      supabase.from("sales").select("*").eq("id", id).maybeSingle(),
      supabase.from("flight_segments").select("*").eq("sale_id", id).order("segment_order"),
      supabase.from("cost_items").select("*").eq("sale_id", id),
      supabase.from("sale_passengers").select("passenger_id, passengers(*)").eq("sale_id", id),
      supabase.from("attachments").select("*").eq("sale_id", id),
    ]).then(async ([saleRes, segRes, costRes, paxRes, attRes]) => {
      const saleData = saleRes.data;
      setSale(saleData);
      setSegments(segRes.data || []);
      setCostItems(costRes.data || []);
      setPassengers((paxRes.data || []).map((p: any) => p.passengers).filter(Boolean));
      setAttachments(attRes.data || []);

      if (saleData?.client_id) {
        const { data: clientData } = await supabase.from("clients").select("*").eq("id", saleData.client_id).maybeSingle();
        setClient(clientData);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, user, authLoading]);

  const handlePublishToPortal = () => {
    toast.success("Viagem publicada no portal do cliente!");
  };

  const handlePreviewPortal = () => {
    window.open(`/portal/viagem/${id}`, "_blank");
  };

  const toggleVisibility = (key: string) => {
    setVisibilityMap(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Carregando viagem...</div>;
  if (!sale) return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">Viagem não encontrada</div>;

  const st = getTripStatus(sale);

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-serif text-foreground">{sale.name}</h1>
              <Badge variant="outline" className={cn("text-xs", statusStyle[st])}>{statusLabel[st]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {sale.display_id} · {client?.display_name || "Sem cliente"} · {sale.origin_iata || "?"} → {sale.destination_iata || "?"}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handlePreviewPortal}>
            <Eye className="w-4 h-4 mr-1" /> Visualizar Portal
          </Button>
          <Button size="sm" onClick={handlePublishToPortal} className="bg-primary">
            <Send className="w-4 h-4 mr-1" /> Publicar no Portal
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="resumo" className="w-full">
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {[
            { value: "resumo", icon: Globe, label: "Resumo" },
            { value: "passageiros", icon: Users, label: "Passageiros" },
            { value: "voos", icon: Plane, label: "Voos" },
            { value: "hoteis", icon: Hotel, label: "Hotéis" },
            { value: "servicos", icon: Luggage, label: "Serviços" },
            { value: "documentos", icon: FileText, label: "Documentos" },
            { value: "financeiro", icon: DollarSign, label: "Financeiro" },
            { value: "checklist", icon: ClipboardCheck, label: "Checklist" },
            { value: "notificacoes", icon: Bell, label: "Notificações" },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs gap-1.5 px-3">
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Resumo */}
        <TabsContent value="resumo" className="mt-4 space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="p-4 glass-card space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Datas</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Embarque</span><span className="font-medium">{sale.departure_date ? formatDateBR(sale.departure_date) : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Retorno</span><span className="font-medium">{sale.return_date ? formatDateBR(sale.return_date) : "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Criado em</span><span className="font-medium">{formatDateBR(sale.created_at)}</span></div>
              </div>
            </Card>

            <Card className="p-4 glass-card space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Destino</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Rota</span><span className="font-mono font-medium">{sale.origin_iata || "?"} → {sale.destination_iata || "?"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Cia Aérea</span><span className="font-medium flex items-center gap-1">{sale.airline && <AirlineLogo iata={sale.airline} size={16} />}{sale.airline || "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Hotel</span><span className="font-medium">{sale.hotel_name || "—"}</span></div>
              </div>
            </Card>

            <Card className="p-4 glass-card space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Passageiros</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Adultos</span><span className="font-medium">{sale.adults || 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Crianças</span><span className="font-medium">{sale.children || 0}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-medium">{(sale.adults || 0) + (sale.children || 0)}</span></div>
              </div>
            </Card>

            <Card className="p-4 glass-card space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> Financeiro</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Receita</span><span className="font-medium">{fmt(sale.received_value || 0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Custo</span><span className="font-medium">{fmt(sale.total_cost || 0)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Margem</span><span className={cn("font-medium", (sale.margin || 0) > 25 ? "text-success" : "")}>{(sale.margin || 0).toFixed(1)}%</span></div>
              </div>
            </Card>

            <Card className="p-4 glass-card space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Controle do Portal</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Visível no portal</Label>
                  <Switch checked={visibilityMap["trip_visible"] !== false} onCheckedChange={() => toggleVisibility("trip_visible")} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Exibir financeiro</Label>
                  <Switch checked={visibilityMap["show_financial"] !== false} onCheckedChange={() => toggleVisibility("show_financial")} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Exibir documentos</Label>
                  <Switch checked={visibilityMap["show_documents"] !== false} onCheckedChange={() => toggleVisibility("show_documents")} />
                </div>
              </div>
            </Card>

            <Card className="p-4 glass-card space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Status</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Status Venda</span><span className="font-medium">{sale.status}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status Portal</span><Badge variant="outline" className={cn("text-[10px]", statusStyle[st])}>{statusLabel[st]}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Emissão</span><span className="font-medium">{sale.emission_status || "—"}</span></div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Passageiros */}
        <TabsContent value="passageiros" className="mt-4">
          <Card className="p-4 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-3">Passageiros da Viagem</h3>
            {passengers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum passageiro vinculado.</p>
            ) : (
              <div className="space-y-2">
                {passengers.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium text-foreground">{p.full_name}</p>
                      <p className="text-xs text-muted-foreground">{p.cpf || "Sem CPF"} · {p.passport_number || "Sem passaporte"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Visível</Label>
                      <Switch checked={visibilityMap[`pax_${p.id}`] !== false} onCheckedChange={() => toggleVisibility(`pax_${p.id}`)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Voos */}
        <TabsContent value="voos" className="mt-4">
          <Card className="p-4 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-3">Voos</h3>
            {segments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum voo registrado.</p>
            ) : (
              <div className="space-y-3">
                {segments.map(seg => (
                  <div key={seg.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      {seg.airline && <AirlineLogo iata={seg.airline} size={24} />}
                      <div>
                        <p className="font-medium text-foreground font-mono text-sm">
                          {seg.origin_iata} → {seg.destination_iata}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {seg.flight_number || "—"} · {seg.departure_date ? formatDateBR(seg.departure_date) : "—"} · {seg.departure_time || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{seg.direction}</Badge>
                      <Switch checked={visibilityMap[`seg_${seg.id}`] !== false} onCheckedChange={() => toggleVisibility(`seg_${seg.id}`)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Hotéis */}
        <TabsContent value="hoteis" className="mt-4">
          <Card className="p-4 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-3">Hospedagem</h3>
            {sale.hotel_name ? (
              <div className="p-3 rounded-lg bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Hotel className="w-5 h-5 text-accent" />
                  <div>
                    <p className="font-medium text-foreground">{sale.hotel_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {sale.hotel_checkin_date ? formatDateBR(sale.hotel_checkin_date) : "—"} → {sale.hotel_checkout_date ? formatDateBR(sale.hotel_checkout_date) : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">{sale.hotel_room || ""} · {sale.hotel_meal_plan || ""}</p>
                  </div>
                </div>
                <Switch checked={visibilityMap["hotel"] !== false} onCheckedChange={() => toggleVisibility("hotel")} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma hospedagem registrada.</p>
            )}
          </Card>
        </TabsContent>

        {/* Serviços */}
        <TabsContent value="servicos" className="mt-4">
          <Card className="p-4 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-3">Serviços Extras</h3>
            {costItems.filter(c => c.category !== "aereo" && c.category !== "hotel").length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum serviço extra registrado.</p>
            ) : (
              <div className="space-y-2">
                {costItems.filter(c => c.category !== "aereo" && c.category !== "hotel").map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium text-foreground text-sm">{item.description || item.category}</p>
                      <p className="text-xs text-muted-foreground">{fmt(item.total_item_cost || item.cash_value || 0)}</p>
                    </div>
                    <Switch checked={visibilityMap[`svc_${item.id}`] !== false} onCheckedChange={() => toggleVisibility(`svc_${item.id}`)} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Documentos */}
        <TabsContent value="documentos" className="mt-4">
          <Card className="p-4 glass-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Documentos</h3>
              <Button variant="outline" size="sm"><FileText className="w-3.5 h-3.5 mr-1" /> Adicionar</Button>
            </div>
            {attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p>
            ) : (
              <div className="space-y-2">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground text-sm">{att.file_name}</p>
                        <p className="text-xs text-muted-foreground">{att.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => window.open(att.file_url, "_blank")}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Switch checked={visibilityMap[`att_${att.id}`] !== false} onCheckedChange={() => toggleVisibility(`att_${att.id}`)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Financeiro */}
        <TabsContent value="financeiro" className="mt-4">
          <Card className="p-4 glass-card space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Resumo Financeiro</h3>
            <div className="grid sm:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground">Receita</p>
                <p className="text-lg font-bold text-foreground">{fmt(sale.received_value || 0)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground">Custo Total</p>
                <p className="text-lg font-bold text-foreground">{fmt(sale.total_cost || 0)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground">Lucro</p>
                <p className="text-lg font-bold text-success">{fmt(sale.profit || 0)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground">Margem</p>
                <p className={cn("text-lg font-bold", (sale.margin || 0) > 25 ? "text-success" : "text-foreground")}>{(sale.margin || 0).toFixed(1)}%</p>
              </div>
            </div>
            <Separator />
            <h4 className="text-sm font-semibold text-foreground">Itens de Custo</h4>
            {costItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum item de custo.</p>
            ) : (
              <div className="space-y-2">
                {costItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded bg-muted/20 text-sm">
                    <span className="text-foreground">{item.description || item.category}</span>
                    <span className="font-medium">{fmt(item.total_item_cost || item.cash_value || 0)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Checklist */}
        <TabsContent value="checklist" className="mt-4">
          <Card className="p-4 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-3">Checklist da Viagem</h3>
            <div className="space-y-2">
              {[
                { label: "Voos confirmados", done: segments.length > 0 },
                { label: "Hotel confirmado", done: !!sale.hotel_name },
                { label: "Passageiros cadastrados", done: passengers.length > 0 },
                { label: "Documentos anexados", done: attachments.length > 0 },
                { label: "Pagamento recebido", done: (sale.received_value || 0) > 0 },
                { label: "Emissão realizada", done: sale.emission_status === "Emitido" },
                { label: "Itinerário gerado", done: false },
                { label: "Publicado no portal", done: false },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded bg-muted/20">
                  <CheckCircle2 className={cn("w-4 h-4", item.done ? "text-success" : "text-muted-foreground/30")} />
                  <span className={cn("text-sm", item.done ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Notificações */}
        <TabsContent value="notificacoes" className="mt-4">
          <Card className="p-4 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-3">Notificações Enviadas</h3>
            <p className="text-sm text-muted-foreground mb-4">Nenhuma notificação enviada ainda.</p>
            <Button variant="outline" size="sm">
              <Bell className="w-3.5 h-3.5 mr-1" /> Enviar Notificação ao Cliente
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
