import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, Circle, AlertTriangle, Info, FileText, CreditCard, Plane,
  Luggage, Shield, MapPin, ChevronDown, ChevronRight, ExternalLink, Download,
  Eye, Upload,
} from "lucide-react";

interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  description?: string;
  status: "concluido" | "pendente" | "atencao" | "informativo";
  isMandatory: boolean;
  action?: { label: string; type: "link" | "download" | "upload"; url?: string };
}

interface PortalChecklistProps {
  sale: any;
  segments: any[];
  hotels: any[];
  services: any[];
  passengers: any[];
  attachments: any[];
  financial: { receivables: any[] };
  lodging: any[];
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: any }> = {
  documentacao: { label: "Documentação", icon: FileText },
  documentos_viagem: { label: "Documentos da Viagem", icon: FileText },
  pagamentos: { label: "Pagamentos", icon: CreditCard },
  checkin: { label: "Check-in Aéreo", icon: Plane },
  bagagem: { label: "Bagagem", icon: Luggage },
  seguro: { label: "Seguro Viagem", icon: Shield },
  servicos: { label: "Serviços", icon: MapPin },
  destino: { label: "Informações do Destino", icon: Info },
};

const STATUS_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  concluido: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Concluído" },
  pendente: { icon: Circle, color: "text-amber-500", bg: "bg-amber-500/10", label: "Pendente" },
  atencao: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", label: "Atenção" },
  informativo: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10", label: "Informativo" },
};

function isInternational(sale: any): boolean {
  const domestic = ["GRU", "CGH", "GIG", "SDU", "BSB", "CNF", "SSA", "REC", "FOR", "POA", "CWB", "BEL", "MAO", "VCP", "FLN", "NAT", "MCZ", "AJU", "SLZ", "THE", "CGB", "CGR", "GYN", "VIX", "JPA", "PMW", "PVH", "MCP", "BVB", "RBR"];
  return sale?.destination_iata && !domestic.includes(sale.destination_iata);
}

function generateChecklist(props: PortalChecklistProps): ChecklistItem[] {
  const { sale, segments, hotels, services, passengers, attachments, financial, lodging } = props;
  const items: ChecklistItem[] = [];
  const intl = isInternational(sale);
  let id = 0;
  const nextId = () => `auto-${++id}`;

  // === DOCUMENTAÇÃO ===
  if (intl) {
    const paxWithPassport = passengers.filter((p: any) => p.passport_number);
    const paxWithExpiry = passengers.filter((p: any) => {
      if (!p.passport_expiry) return false;
      const exp = new Date(p.passport_expiry);
      const dep = sale?.departure_date ? new Date(sale.departure_date) : new Date();
      const sixMonths = new Date(dep);
      sixMonths.setMonth(sixMonths.getMonth() + 6);
      return exp < sixMonths;
    });

    if (paxWithExpiry.length > 0) {
      items.push({
        id: nextId(), category: "documentacao",
        title: "Passaporte com validade insuficiente",
        description: `${paxWithExpiry.map((p: any) => p.full_name).join(", ")} — passaporte expira em menos de 6 meses da viagem.`,
        status: "atencao", isMandatory: true,
      });
    } else if (paxWithPassport.length === passengers.length && passengers.length > 0) {
      items.push({
        id: nextId(), category: "documentacao",
        title: "Passaportes válidos",
        description: "Todos os passageiros possuem passaporte válido.",
        status: "concluido", isMandatory: true,
      });
    } else {
      items.push({
        id: nextId(), category: "documentacao",
        title: "Verificar passaportes",
        description: "Confirme a validade dos passaportes de todos os passageiros.",
        status: "pendente", isMandatory: true,
      });
    }

    items.push({
      id: nextId(), category: "documentacao",
      title: "Verificar necessidade de visto",
      description: "Confira se o destino exige visto de entrada.",
      status: "informativo", isMandatory: false,
    });
  }

  items.push({
    id: nextId(), category: "documentacao",
    title: "Documentos pessoais em dia",
    description: "RG ou passaporte válidos para todos os passageiros.",
    status: passengers.length > 0 ? "concluido" : "pendente",
    isMandatory: true,
  });

  // === DOCUMENTOS DA VIAGEM ===
  const hasTickets = attachments.some((a: any) => a.category === "aereo");
  const hasVouchers = attachments.some((a: any) => a.category === "hotel" || a.category === "voucher");
  const hasInsurance = attachments.some((a: any) => a.category === "seguro");

  items.push({
    id: nextId(), category: "documentos_viagem",
    title: "Passagens aéreas",
    description: hasTickets ? "Passagens disponíveis para download." : "Aguardando envio das passagens.",
    status: hasTickets ? "concluido" : segments.length > 0 ? "pendente" : "informativo",
    isMandatory: segments.length > 0,
    action: hasTickets ? { label: "Ver documentos", type: "link" } : undefined,
  });

  if (hotels.length > 0 || lodging.length > 0) {
    items.push({
      id: nextId(), category: "documentos_viagem",
      title: "Vouchers de hotel",
      description: hasVouchers ? "Vouchers disponíveis." : "Aguardando confirmação dos vouchers.",
      status: hasVouchers ? "concluido" : "pendente",
      isMandatory: true,
    });
  }

  if (attachments.length > 0) {
    items.push({
      id: nextId(), category: "documentos_viagem",
      title: `${attachments.length} documento(s) disponíveis`,
      description: "Todos os documentos podem ser acessados na seção de Documentos.",
      status: "concluido", isMandatory: false,
    });
  }

  // === PAGAMENTOS ===
  const receivables = financial?.receivables || [];
  const totalReceivable = receivables.reduce((s: number, r: any) => s + (r.gross_value || 0), 0);
  const totalPaid = receivables.filter((r: any) => r.status === "recebido").reduce((s: number, r: any) => s + (r.gross_value || 0), 0);
  const pending = totalReceivable - totalPaid;

  if (totalReceivable > 0) {
    if (pending <= 0) {
      items.push({
        id: nextId(), category: "pagamentos",
        title: "Viagem totalmente paga",
        description: `Valor total: R$ ${totalReceivable.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        status: "concluido", isMandatory: true,
      });
    } else {
      const nextDue = receivables.find((r: any) => r.status !== "recebido" && r.due_date);
      items.push({
        id: nextId(), category: "pagamentos",
        title: "Pagamento pendente",
        description: `Saldo restante: R$ ${pending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}${nextDue?.due_date ? ` — Próximo vencimento: ${new Date(nextDue.due_date + "T00:00:00").toLocaleDateString("pt-BR")}` : ""}`,
        status: pending > 0 ? "atencao" : "pendente", isMandatory: true,
      });
    }
  }

  // === CHECK-IN ===
  if (segments.length > 0) {
    const now = new Date();
    const firstFlight = segments[0];
    const depDate = firstFlight?.departure_date ? new Date(firstFlight.departure_date + "T00:00:00") : null;
    const hoursUntil = depDate ? (depDate.getTime() - now.getTime()) / (1000 * 60 * 60) : Infinity;

    if (hoursUntil <= 48 && hoursUntil > 0) {
      items.push({
        id: nextId(), category: "checkin",
        title: "Check-in online disponível!",
        description: `Realize o check-in do voo ${firstFlight.airline || ""} ${firstFlight.flight_number || ""}.`,
        status: "atencao", isMandatory: true,
      });
    } else {
      items.push({
        id: nextId(), category: "checkin",
        title: "Realizar check-in online",
        description: "O check-in abre normalmente 48h antes do voo.",
        status: hoursUntil <= 72 ? "pendente" : "informativo",
        isMandatory: false,
      });
    }
  }

  // === BAGAGEM ===
  if (segments.length > 0) {
    items.push({
      id: nextId(), category: "bagagem",
      title: "Verificar franquia de bagagem",
      description: "Confira o peso e dimensões permitidos pela companhia aérea.",
      status: "informativo", isMandatory: false,
    });
    items.push({
      id: nextId(), category: "bagagem",
      title: "Preparar bagagem",
      description: "Revise os itens proibidos e restrições do destino.",
      status: "informativo", isMandatory: false,
    });
  }

  // === SEGURO ===
  const hasSeguro = services.some((s: any) => s.category === "seguro" || s.product_type === "seguro") || hasInsurance;
  items.push({
    id: nextId(), category: "seguro",
    title: hasSeguro ? "Seguro viagem emitido" : "Contratar seguro viagem",
    description: hasSeguro ? "Seu seguro viagem está ativo." : "Recomendamos a contratação de um seguro viagem.",
    status: hasSeguro ? "concluido" : intl ? "atencao" : "informativo",
    isMandatory: intl,
  });

  // === SERVIÇOS ===
  const transfers = services.filter((s: any) => s.category === "transfer" || s.product_type === "transfer");
  const tours = services.filter((s: any) => s.category !== "transfer" && s.product_type !== "transfer" && s.category !== "seguro" && s.product_type !== "seguro");

  if (transfers.length > 0) {
    items.push({
      id: nextId(), category: "servicos",
      title: `${transfers.length} transfer(s) confirmado(s)`,
      description: "Transfers registrados na viagem.",
      status: "concluido", isMandatory: false,
    });
  }
  if (tours.length > 0) {
    items.push({
      id: nextId(), category: "servicos",
      title: `${tours.length} serviço(s) / passeio(s)`,
      description: "Serviços e experiências registrados.",
      status: "concluido", isMandatory: false,
    });
  }

  // === DESTINO ===
  if (intl) {
    items.push(
      { id: nextId(), category: "destino", title: "Verificar moeda local", description: "Pesquise câmbio e meios de pagamento no destino.", status: "informativo", isMandatory: false },
      { id: nextId(), category: "destino", title: "Verificar clima e roupas adequadas", description: "Confira a previsão do tempo para as datas da viagem.", status: "informativo", isMandatory: false },
      { id: nextId(), category: "destino", title: "Verificar tomadas e adaptadores", description: "Verifique o padrão de tomadas do destino.", status: "informativo", isMandatory: false },
    );
  }

  return items;
}

function CategoryGroup({ category, items, isOpen, onToggle }: {
  category: string; items: ChecklistItem[]; isOpen: boolean; onToggle: () => void;
}) {
  const config = CATEGORY_CONFIG[category] || { label: category, icon: Info };
  const Icon = config.icon;
  const done = items.filter(i => i.status === "concluido").length;

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
      >
        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
          <Icon className="h-4.5 w-4.5 text-accent" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-foreground">{config.label}</p>
          <p className="text-xs text-muted-foreground">{done}/{items.length} concluídos</p>
        </div>
        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {items.map((item) => {
                const sc = STATUS_CONFIG[item.status];
                const StatusIcon = sc.icon;
                return (
                  <div key={item.id} className={`flex items-start gap-3 p-3 rounded-lg ${sc.bg} border border-transparent`}>
                    <StatusIcon className={`h-5 w-5 ${sc.color} flex-shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                    </div>
                    {!item.isMandatory && item.status === "informativo" && (
                      <Badge variant="outline" className="text-[10px] flex-shrink-0">Dica</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PortalChecklist(props: PortalChecklistProps) {
  const items = useMemo(() => generateChecklist(props), [props]);
  const categories = useMemo(() => {
    const cats: string[] = [];
    items.forEach(i => { if (!cats.includes(i.category)) cats.push(i.category); });
    return cats;
  }, [items]);

  const [openCats, setOpenCats] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    categories.forEach(c => { map[c] = true; });
    return map;
  });

  const total = items.filter(i => i.status !== "informativo").length;
  const done = items.filter(i => i.status === "concluido").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const hasAttention = items.some(i => i.status === "atencao");

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Preparação da viagem</span>
            <span>{done} de {total} itens concluídos</span>
          </div>
          <Progress value={pct} className="h-2.5" />
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-2xl font-bold text-foreground">{pct}%</p>
        </div>
      </div>

      {hasAttention && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-sm">
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <span className="text-red-600 dark:text-red-400 font-medium">Existem itens que precisam da sua atenção.</span>
        </div>
      )}

      {/* Categories */}
      <div className="space-y-2">
        {categories.map(cat => (
          <CategoryGroup
            key={cat}
            category={cat}
            items={items.filter(i => i.category === cat)}
            isOpen={openCats[cat] ?? true}
            onToggle={() => setOpenCats(prev => ({ ...prev, [cat]: !prev[cat] }))}
          />
        ))}
      </div>
    </div>
  );
}
