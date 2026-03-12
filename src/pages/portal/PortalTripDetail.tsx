import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PortalLayout from "@/components/portal/PortalLayout";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Plane, Hotel, Users, DollarSign, FileText, Calendar, MapPin,
  Clock, Download, Eye, Shield, Briefcase, MessageCircle, Phone, CheckCircle2,
  AlertTriangle, Info, CreditCard, ChevronDown, ChevronUp, Map as MapIcon,
} from "lucide-react";
import AirlineLogo from "@/components/AirlineLogo";
import { iataToLabel } from "@/lib/iataUtils";
import PortalJourneyMap from "@/components/portal/PortalJourneyMap";

const fmt = (v: number) => v?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "R$ 0,00";
const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
};
const fmtDateShort = (d: string | null) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

function Section({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 sm:p-6 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-accent" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground">{title}</h3>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0">{children}</div>}
    </Card>
  );
}

export default function PortalTripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: res } = await supabase.functions.invoke("portal-api", {
        body: { action: "trip-detail", sale_id: id },
      });
      if (res && !res.error) setData(res);
      setLoading(false);
    };
    if (id) fetch();
  }, [id]);

  if (loading) {
    return (
      <PortalLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-[3px] border-accent/20 border-t-accent rounded-full animate-spin" />
        </div>
      </PortalLayout>
    );
  }

  if (!data || data.error) {
    return (
      <PortalLayout>
        <div className="text-center py-20">
          <AlertTriangle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">Viagem não encontrada.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/portal")}>Voltar</Button>
        </div>
      </PortalLayout>
    );
  }

  const { sale, published, segments, hotels, services, lodging, attachments, financial, passengers, sellerName } = data;
  const allHotels = [...(hotels || []), ...(lodging || [])];

  const totalReceivable = financial?.receivables?.reduce((s: number, r: any) => s + (r.gross_value || 0), 0) || 0;
  const totalPaid = financial?.receivables?.filter((r: any) => r.status === "recebido")?.reduce((s: number, r: any) => s + (r.gross_value || 0), 0) || 0;
  const totalPending = totalReceivable - totalPaid;

  const docCategories = [
    { key: "aereo", label: "Aéreo", icon: Plane },
    { key: "hotel", label: "Hotel", icon: Hotel },
    { key: "seguro", label: "Seguro", icon: Shield },
    { key: "comprovante", label: "Comprovantes", icon: FileText },
    { key: "roteiro", label: "Roteiro", icon: MapPin },
    { key: "ingresso", label: "Ingressos", icon: Briefcase },
  ];

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Back button */}
        <button onClick={() => navigate("/portal")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar ao início
        </button>

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative overflow-hidden rounded-2xl h-[200px] sm:h-[280px]">
            <img
              src={published?.cover_image_url || "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1200&h=600&fit=crop"}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 sm:bottom-8 sm:left-8 sm:right-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                {published?.custom_title || sale?.name || "Detalhes da Viagem"}
              </h1>
              <div className="flex flex-wrap gap-3 mt-2 text-white/70 text-sm">
                {sale?.origin_iata && sale?.destination_iata && (
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{iataToLabel(sale.origin_iata)} → {iataToLabel(sale.destination_iata)}</span>
                )}
                {sale?.departure_date && (
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{fmtDate(sale.departure_date)}{sale.return_date && ` — ${fmtDate(sale.return_date)}`}</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Overview Cards */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
              <Badge className="mt-2 bg-accent/10 text-accent border-accent/20">{sale?.status || "Confirmada"}</Badge>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Passageiros</p>
              <p className="text-xl font-bold text-foreground mt-1">{passengers?.length || 0}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Voos</p>
              <p className="text-xl font-bold text-foreground mt-1">{segments?.length || 0}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Consultor</p>
              <p className="text-sm font-semibold text-foreground mt-1 truncate">{sellerName || "NatLeva"}</p>
            </Card>
          </div>
        </motion.div>

        {/* Notes from NatLeva */}
        {published?.notes_for_client && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="p-5 bg-accent/5 border-accent/20">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">Mensagem da NatLeva</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{published.notes_for_client}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Flights */}
        {segments?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Section title="Voos" icon={Plane}>
              <div className="space-y-3">
                {segments.map((seg: any, i: number) => (
                  <div key={seg.id || i} className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-3 sm:w-32 flex-shrink-0">
                      <AirlineLogo iata={seg.airline} size={32} />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{seg.airline}</p>
                        <p className="text-xs text-muted-foreground">{seg.flight_number || "—"}</p>
                      </div>
                    </div>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Origem</p>
                        <p className="text-sm font-semibold">{iataToLabel(seg.origin_iata)}</p>
                        {seg.departure_date && <p className="text-xs text-muted-foreground">{fmtDateShort(seg.departure_date)} {seg.departure_time || ""}</p>}
                      </div>
                      <div className="hidden sm:flex items-center justify-center">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="w-8 h-px bg-border" />
                          <Plane className="h-3.5 w-3.5 text-accent" />
                          <div className="w-8 h-px bg-border" />
                        </div>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-xs text-muted-foreground">Destino</p>
                        <p className="text-sm font-semibold">{iataToLabel(seg.destination_iata)}</p>
                        {seg.arrival_time && <p className="text-xs text-muted-foreground">{seg.arrival_time}</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:w-auto sm:flex-col sm:items-end justify-start">
                      {seg.flight_class && <Badge variant="secondary" className="text-xs">{seg.flight_class}</Badge>}
                      {seg.terminal && <Badge variant="outline" className="text-xs">Terminal {seg.terminal}</Badge>}
                      {seg.direction && (
                        <Badge variant="outline" className="text-xs">
                          {seg.direction === "ida" ? "Ida" : seg.direction === "volta" ? "Volta" : seg.direction}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </motion.div>
        )}

        {/* Hotels */}
        {allHotels.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Section title="Hospedagem" icon={Hotel}>
              <div className="space-y-3">
                {allHotels.map((h: any, i: number) => (
                  <div key={h.id || i} className="p-4 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-foreground">
                          {h.hotel_name || h.description || "Hotel"}
                        </p>
                        {h.hotel_reservation_code && (
                          <p className="text-xs text-muted-foreground mt-0.5">Reserva: {h.hotel_reservation_code}</p>
                        )}
                        {h.reservation_code && (
                          <p className="text-xs text-muted-foreground mt-0.5">Reserva: {h.reservation_code}</p>
                        )}
                      </div>
                      {h.status && (
                        <Badge variant={h.status === "CONFIRMADO" ? "default" : "secondary"} className="flex-shrink-0">
                          {h.status}
                        </Badge>
                      )}
                    </div>
                    {h.hotel_checkin_datetime_utc && (
                      <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Check-in: {new Date(h.hotel_checkin_datetime_utc).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                    {h.notes && <p className="text-xs text-muted-foreground mt-2 italic">{h.notes}</p>}
                  </div>
                ))}
              </div>
            </Section>
          </motion.div>
        )}

        {/* Services */}
        {services?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Section title="Serviços Adicionais" icon={Briefcase} defaultOpen={false}>
              <div className="space-y-2">
                {services.map((s: any, i: number) => (
                  <div key={s.id || i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.description || s.category}</p>
                      {s.reservation_code && <p className="text-xs text-muted-foreground">Código: {s.reservation_code}</p>}
                    </div>
                    <Badge variant="secondary" className="text-xs">{s.product_type || s.category}</Badge>
                  </div>
                ))}
              </div>
            </Section>
          </motion.div>
        )}

        {/* Documents */}
        {attachments?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Section title="Documentos" icon={FileText}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attachments.map((att: any, i: number) => (
                  <div key={att.id || i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{att.file_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{att.category || "Documento"}</p>
                    </div>
                    <div className="flex gap-1">
                      <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-muted transition-colors" title="Visualizar">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </a>
                      <a href={att.file_url} download className="p-2 rounded-lg hover:bg-muted transition-colors" title="Baixar">
                        <Download className="h-4 w-4 text-muted-foreground" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </motion.div>
        )}

        {/* Financial */}
        {financial?.receivables?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Section title="Financeiro" icon={DollarSign}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <Card className="p-4 bg-accent/5 border-accent/20">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Valor Total</p>
                  <p className="text-xl font-bold text-foreground mt-1">{fmt(totalReceivable)}</p>
                </Card>
                <Card className="p-4 bg-success/5 border-success/20">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Pago</p>
                  <p className="text-xl font-bold text-success mt-1">{fmt(totalPaid)}</p>
                </Card>
                <Card className="p-4 bg-warning/5 border-warning/20">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Pendente</p>
                  <p className="text-xl font-bold text-warning mt-1">{fmt(totalPending)}</p>
                </Card>
              </div>

              {/* Payment progress bar */}
              {totalReceivable > 0 && (
                <div className="mb-5">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Progresso do pagamento</span>
                    <span>{Math.round((totalPaid / totalReceivable) * 100)}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-accent to-success rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (totalPaid / totalReceivable) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {financial.receivables.map((r: any, i: number) => (
                  <div key={r.id || i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${r.status === "recebido" ? "bg-success" : "bg-warning"}`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {r.description || `Parcela ${r.installment_number || i + 1}`}
                          {r.installment_total > 1 && ` de ${r.installment_total}`}
                        </p>
                        {r.due_date && <p className="text-xs text-muted-foreground">Vencimento: {fmtDate(r.due_date)}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{fmt(r.gross_value)}</p>
                      {r.payment_method && <p className="text-xs text-muted-foreground">{r.payment_method}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </motion.div>
        )}

        {/* Passengers */}
        {passengers?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <Section title="Passageiros" icon={Users}>
              <div className="space-y-3">
                {passengers.map((pax: any, i: number) => (
                  <div key={pax.id || i} className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <Users className="h-5 w-5 text-accent" />
                    </div>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{pax.full_name}</p>
                        {pax.role && <Badge variant="secondary" className="text-xs mt-1">{pax.role}</Badge>}
                      </div>
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        {pax.cpf && <p>CPF: {pax.cpf}</p>}
                        {pax.passport_number && <p>Passaporte: {pax.passport_number}</p>}
                        {pax.passport_expiry && <p>Validade: {fmtDate(pax.passport_expiry)}</p>}
                        {pax.birth_date && <p>Nascimento: {fmtDate(pax.birth_date)}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </motion.div>
        )}

        {/* Observations */}
        {sale?.observations && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Section title="Observações Importantes" icon={AlertTriangle} defaultOpen={false}>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{sale.observations}</p>
            </Section>
          </motion.div>
        )}

        {/* Support CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <Card className="p-6 sm:p-8 bg-gradient-to-r from-primary to-[hsl(160,30%,15%)] text-primary-foreground rounded-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">Precisa de ajuda?</h3>
                <p className="text-sm text-primary-foreground/70 mt-1">
                  {sellerName ? `Fale com ${sellerName} ou com nossa equipe` : "Nossa equipe está pronta para ajudar"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="lg"
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl"
                  onClick={() => window.open("https://wa.me/5511999999999", "_blank")}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </PortalLayout>
  );
}
