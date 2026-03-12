import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PortalLayout from "@/components/portal/PortalLayout";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Plane, Hotel, Users, DollarSign, FileText, Calendar, MapPin,
  Clock, Shield, Briefcase, MessageCircle, CheckCircle2,
  Info, ChevronDown, ChevronUp, Map as MapIcon, Star, Ticket,
} from "lucide-react";
import AirlineLogo from "@/components/AirlineLogo";
import { iataToLabel } from "@/lib/iataUtils";

const fmt = (v: number) => v?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "R$ 0,00";
const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
const fmtDateShort = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

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

// ===== MOCK DATA =====
const sale = {
  name: "Família Silva — Orlando Mágico 2025",
  origin_iata: "GRU",
  destination_iata: "MCO",
  departure_date: "2025-07-15",
  return_date: "2025-07-27",
  status: "Confirmada",
  observations: "Levar adaptador de tomada (padrão americano tipo A/B). Não esquecer autorização de viagem para menores notarizada. Protetor solar é indispensável!",
};

const segments = [
  { id: "1", airline: "LA", flight_number: "LA8180", origin_iata: "GRU", destination_iata: "MCO", departure_date: "2025-07-15", departure_time: "08:30", arrival_time: "16:45", flight_class: "Econômica Premium", direction: "ida", terminal: "3", duration_minutes: 615 },
  { id: "2", airline: "LA", flight_number: "LA8181", origin_iata: "MCO", destination_iata: "GRU", departure_date: "2025-07-27", departure_time: "20:15", arrival_time: "07:30+1", flight_class: "Econômica Premium", direction: "volta", terminal: "B", duration_minutes: 615 },
];

const hotels = [
  { id: "1", hotel_name: "Disney's All-Star Movies Resort", hotel_reservation_code: "DIS-2025-78432", status: "CONFIRMADO", hotel_checkin_datetime_utc: "2025-07-15T15:00:00Z", notes: "Quarto família com 2 camas queen. Vista para a piscina. Inclui transporte Disney Magical Express." },
  { id: "2", hotel_name: "Universal's Cabana Bay Beach Resort", hotel_reservation_code: "UNI-2025-11205", status: "CONFIRMADO", hotel_checkin_datetime_utc: "2025-07-22T16:00:00Z", notes: "Suite família com cozinha compacta. Acesso antecipado aos parques Universal." },
];

const passengers = [
  { id: "1", full_name: "Carlos Eduardo Silva", role: "Titular", cpf: "***.***.***-12", passport_number: "FX123456", passport_expiry: "2029-03-10", birth_date: "1985-04-22" },
  { id: "2", full_name: "Ana Paula Silva", role: "Cônjuge", cpf: "***.***.***-34", passport_number: "FX123457", passport_expiry: "2029-03-10", birth_date: "1987-09-15" },
  { id: "3", full_name: "Lucas Silva", role: "Filho", cpf: "***.***.***-56", passport_number: "FX123458", passport_expiry: "2029-03-10", birth_date: "2014-01-08" },
  { id: "4", full_name: "Maria Clara Silva", role: "Filha", cpf: "***.***.***-78", passport_number: "FX123459", passport_expiry: "2029-03-10", birth_date: "2017-06-20" },
];

const services = [
  { id: "1", description: "Ingresso Magic Kingdom — 3 dias (4 pessoas)", category: "Ingresso", product_type: "Parque Disney", reservation_code: "MK-2025-44210" },
  { id: "2", description: "Ingresso EPCOT — 2 dias (4 pessoas)", category: "Ingresso", product_type: "Parque Disney", reservation_code: "EP-2025-44211" },
  { id: "3", description: "Ingresso Hollywood Studios — 1 dia (4 pessoas)", category: "Ingresso", product_type: "Parque Disney", reservation_code: "HS-2025-44212" },
  { id: "4", description: "Ingresso Animal Kingdom — 1 dia (4 pessoas)", category: "Ingresso", product_type: "Parque Disney", reservation_code: "AK-2025-44213" },
  { id: "5", description: "Ingresso Universal Studios + Islands of Adventure — 2 dias Park-to-Park (4 pessoas)", category: "Ingresso", product_type: "Parque Universal", reservation_code: "UNI-2025-55301" },
  { id: "6", description: "Seguro Viagem Assist Card — Família (4 pessoas, 12 dias)", category: "Seguro", product_type: "Seguro Viagem", reservation_code: "AC-2025-998877" },
  { id: "7", description: "Transfer Aeroporto MCO → Disney Resort (ida e volta)", category: "Transfer", product_type: "Transfer", reservation_code: "TR-2025-3320" },
  { id: "8", description: "Aluguel de carro — Minivan Chrysler Pacifica (5 dias)", category: "Transporte", product_type: "Aluguel de carro", reservation_code: "HERTZ-2025-90021" },
  { id: "9", description: "Jantar no Be Our Guest Restaurant — Magic Kingdom", category: "Experiência", product_type: "Restaurante Disney", reservation_code: "BOG-2025-1120" },
  { id: "10", description: "Character Breakfast no Chef Mickey's", category: "Experiência", product_type: "Restaurante Disney", reservation_code: "CM-2025-3345" },
];

const financial = {
  receivables: [
    { id: "1", description: "Entrada — Pacote Orlando", gross_value: 8500, status: "recebido", due_date: "2025-03-01", payment_method: "PIX", installment_number: 1, installment_total: 4 },
    { id: "2", description: "2ª Parcela — Pacote Orlando", gross_value: 8500, status: "recebido", due_date: "2025-04-01", payment_method: "PIX", installment_number: 2, installment_total: 4 },
    { id: "3", description: "3ª Parcela — Pacote Orlando", gross_value: 8500, status: "pendente", due_date: "2025-05-01", payment_method: "Cartão de crédito", installment_number: 3, installment_total: 4 },
    { id: "4", description: "4ª Parcela — Pacote Orlando", gross_value: 8500, status: "pendente", due_date: "2025-06-01", payment_method: "Cartão de crédito", installment_number: 4, installment_total: 4 },
  ],
};

const totalReceivable = financial.receivables.reduce((s, r) => s + r.gross_value, 0);
const totalPaid = financial.receivables.filter(r => r.status === "recebido").reduce((s, r) => s + r.gross_value, 0);
const totalPending = totalReceivable - totalPaid;

export default function PortalDemoTrip() {
  const navigate = useNavigate();

  return (
    <PortalLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Demo Banner */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-3 bg-warning/10 border-warning/30 flex items-center gap-3">
            <Star className="h-5 w-5 text-warning flex-shrink-0" />
            <p className="text-sm text-foreground">
              <strong>Modo Demonstração</strong> — Esta é uma viagem fictícia para visualização do portal. Os dados são ilustrativos.
            </p>
            <Button variant="outline" size="sm" className="ml-auto flex-shrink-0" onClick={() => navigate("/portal")}>
              Voltar ao Portal
            </Button>
          </Card>
        </motion.div>

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative overflow-hidden rounded-2xl h-[200px] sm:h-[280px]">
            <img
              src="https://images.unsplash.com/photo-1575089976121-8ed7b2a54265?w=1200&h=600&fit=crop"
              alt="Orlando - Disney World"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 sm:bottom-8 sm:left-8 sm:right-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                ✨ Família Silva — Orlando Mágico 2025
              </h1>
              <div className="flex flex-wrap gap-3 mt-2 text-white/70 text-sm">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />São Paulo (GRU) → Orlando (MCO)</span>
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />15 jul 2025 — 27 jul 2025</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />4 passageiros</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Overview Cards */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Status</p>
              <Badge className="mt-2 bg-accent/10 text-accent border-accent/20">Confirmada</Badge>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Passageiros</p>
              <p className="text-xl font-bold text-foreground mt-1">4</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Duração</p>
              <p className="text-xl font-bold text-foreground mt-1">12 dias</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Consultor</p>
              <p className="text-sm font-semibold text-foreground mt-1">Tiago — NatLeva</p>
            </Card>
          </div>
        </motion.div>

        {/* Message */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="p-5 bg-accent/5 border-accent/20">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Mensagem da NatLeva</p>
                <p className="text-sm text-muted-foreground">
                  Olá família Silva! 🎉 Está tudo preparado para a viagem mágica de vocês a Orlando! 
                  Os ingressos dos parques já estão confirmados, assim como a hospedagem nos resorts Disney e Universal. 
                  Não esqueçam de baixar o app My Disney Experience e o Universal Orlando Resort para agilizar a entrada nos parques. 
                  Qualquer dúvida, estamos à disposição! Boa viagem! ✈️🏰
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Flights */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Section title="Voos" icon={Plane}>
            <div className="space-y-3">
              {segments.map((seg) => (
                <div key={seg.id} className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-3 sm:w-32 flex-shrink-0">
                    <AirlineLogo iata={seg.airline} size={32} />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{seg.airline}</p>
                      <p className="text-xs text-muted-foreground">{seg.flight_number}</p>
                    </div>
                  </div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Origem</p>
                      <p className="text-sm font-semibold">{iataToLabel(seg.origin_iata)}</p>
                      <p className="text-xs text-muted-foreground">{fmtDateShort(seg.departure_date)} {seg.departure_time}</p>
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
                      <p className="text-xs text-muted-foreground">{seg.arrival_time}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:w-auto sm:flex-col sm:items-end">
                    <Badge variant="secondary" className="text-xs">{seg.flight_class}</Badge>
                    <Badge variant="outline" className="text-xs">Terminal {seg.terminal}</Badge>
                    <Badge variant="outline" className="text-xs">{seg.direction === "ida" ? "✈️ Ida" : "✈️ Volta"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </motion.div>

        {/* Hotels */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Section title="Hospedagem" icon={Hotel}>
            <div className="space-y-3">
              {hotels.map((h) => (
                <div key={h.id} className="p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-foreground">{h.hotel_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Reserva: {h.hotel_reservation_code}</p>
                    </div>
                    <Badge className="bg-accent/10 text-accent border-accent/20 flex-shrink-0">{h.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Check-in: {new Date(h.hotel_checkin_datetime_utc).toLocaleDateString("pt-BR")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 italic">{h.notes}</p>
                </div>
              ))}
            </div>
          </Section>
        </motion.div>

        {/* Services / Parques / Ingressos */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Section title="Serviços, Ingressos e Experiências" icon={Ticket}>
            <div className="space-y-2">
              {services.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.description}</p>
                    <p className="text-xs text-muted-foreground">Código: {s.reservation_code}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs flex-shrink-0 ml-2">{s.product_type}</Badge>
                </div>
              ))}
            </div>
          </Section>
        </motion.div>

        {/* Financial */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Section title="Financeiro" icon={DollarSign}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <Card className="p-4 bg-accent/5 border-accent/20">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Valor Total</p>
                <p className="text-xl font-bold text-foreground mt-1">{fmt(totalReceivable)}</p>
              </Card>
              <Card className="p-4 bg-green-500/5 border-green-500/20">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Pago</p>
                <p className="text-xl font-bold text-green-600 mt-1">{fmt(totalPaid)}</p>
              </Card>
              <Card className="p-4 bg-yellow-500/5 border-yellow-500/20">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Pendente</p>
                <p className="text-xl font-bold text-yellow-600 mt-1">{fmt(totalPending)}</p>
              </Card>
            </div>

            {/* Progress */}
            <div className="mb-5">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Progresso do pagamento</span>
                <span>{Math.round((totalPaid / totalReceivable) * 100)}%</span>
              </div>
              <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${(totalPaid / totalReceivable) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              {financial.receivables.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${r.status === "recebido" ? "bg-green-500" : "bg-yellow-500"}`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {r.description}
                      </p>
                      <p className="text-xs text-muted-foreground">Vencimento: {fmtDate(r.due_date)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{fmt(r.gross_value)}</p>
                    <p className="text-xs text-muted-foreground">{r.payment_method}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </motion.div>

        {/* Passengers */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Section title="Passageiros" icon={Users}>
            <div className="space-y-3">
              {passengers.map((pax) => (
                <div key={pax.id} className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{pax.full_name}</p>
                      <Badge variant="secondary" className="text-xs mt-1">{pax.role}</Badge>
                    </div>
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      <p>CPF: {pax.cpf}</p>
                      <p>Passaporte: {pax.passport_number}</p>
                      <p>Validade: {fmtDate(pax.passport_expiry)}</p>
                      <p>Nascimento: {fmtDate(pax.birth_date)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </motion.div>

        {/* Observations */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Section title="Observações Importantes" icon={Info}>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{sale.observations}</p>
          </Section>
        </motion.div>

        {/* Support CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="p-6 sm:p-8 bg-gradient-to-r from-primary to-[hsl(160,30%,15%)] text-primary-foreground rounded-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">Precisa de ajuda?</h3>
                <p className="text-sm text-primary-foreground/70 mt-1">Fale com Tiago ou com nossa equipe NatLeva</p>
              </div>
              <Button
                size="lg"
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl"
                onClick={() => window.open("https://wa.me/5511999999999", "_blank")}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </PortalLayout>
  );
}
