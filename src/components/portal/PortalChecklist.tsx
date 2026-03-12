import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, Circle, AlertTriangle, Info, FileText, CreditCard, Plane,
  Luggage, Shield, MapPin, ChevronDown, ChevronRight,
} from "lucide-react";

/* ── Types ── */
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

/* ── Config ── */
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

const STATUS_META: Record<string, { icon: any; accent: string; label: string }> = {
  concluido: { icon: CheckCircle2, accent: "text-accent", label: "Concluído" },
  pendente: { icon: Circle, accent: "text-warning", label: "Pendente" },
  atencao: { icon: AlertTriangle, accent: "text-destructive", label: "Atenção" },
  informativo: { icon: Info, accent: "text-muted-foreground", label: "Info" },
};

/* ── Helpers ── */
function isInternational(sale: any): boolean {
  const domestic = ["GRU","CGH","GIG","SDU","BSB","CNF","SSA","REC","FOR","POA","CWB","BEL","MAO","VCP","FLN","NAT","MCZ","AJU","SLZ","THE","CGB","CGR","GYN","VIX","JPA","PMW","PVH","MCP","BVB","RBR"];
  return sale?.destination_iata && !domestic.includes(sale.destination_iata);
}

function generateChecklist(props: PortalChecklistProps): ChecklistItem[] {
  const { sale, segments, hotels, services, passengers, attachments, financial, lodging } = props;
  const items: ChecklistItem[] = [];
  const intl = isInternational(sale);
  let id = 0;
  const nextId = () => `auto-${++id}`;

  // Documentação
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
      items.push({ id: nextId(), category: "documentacao", title: "Passaporte com validade insuficiente", description: `${paxWithExpiry.map((p: any) => p.full_name).join(", ")} — passaporte expira em menos de 6 meses da viagem.`, status: "atencao", isMandatory: true });
    } else if (paxWithPassport.length === passengers.length && passengers.length > 0) {
      items.push({ id: nextId(), category: "documentacao", title: "Passaportes válidos", description: "Todos os passageiros possuem passaporte válido.", status: "concluido", isMandatory: true });
    } else {
      items.push({ id: nextId(), category: "documentacao", title: "Verificar passaportes", description: "Confirme a validade dos passaportes de todos os passageiros.", status: "pendente", isMandatory: true });
    }
    items.push({ id: nextId(), category: "documentacao", title: "Verificar necessidade de visto", description: "Confira se o destino exige visto de entrada.", status: "informativo", isMandatory: false });
  }
  items.push({ id: nextId(), category: "documentacao", title: "Documentos pessoais em dia", description: "RG ou passaporte válidos para todos os passageiros.", status: passengers.length > 0 ? "concluido" : "pendente", isMandatory: true });

  // Documentos da viagem
  const hasTickets = attachments.some((a: any) => a.category === "aereo");
  const hasVouchers = attachments.some((a: any) => a.category === "hotel" || a.category === "voucher");
  const hasInsurance = attachments.some((a: any) => a.category === "seguro");
  items.push({ id: nextId(), category: "documentos_viagem", title: "Passagens aéreas", description: hasTickets ? "Passagens disponíveis para download." : "Aguardando envio das passagens.", status: hasTickets ? "concluido" : segments.length > 0 ? "pendente" : "informativo", isMandatory: segments.length > 0 });
  if (hotels.length > 0 || lodging.length > 0) {
    items.push({ id: nextId(), category: "documentos_viagem", title: "Vouchers de hotel", description: hasVouchers ? "Vouchers disponíveis." : "Aguardando confirmação dos vouchers.", status: hasVouchers ? "concluido" : "pendente", isMandatory: true });
  }
  if (attachments.length > 0) {
    items.push({ id: nextId(), category: "documentos_viagem", title: `${attachments.length} documento(s) disponíveis`, description: "Todos os documentos podem ser acessados na seção de Documentos.", status: "concluido", isMandatory: false });
  }

  // Pagamentos
  const receivables = financial?.receivables || [];
  const totalReceivable = receivables.reduce((s: number, r: any) => s + (r.gross_value || 0), 0);
  const totalPaid = receivables.filter((r: any) => r.status === "recebido").reduce((s: number, r: any) => s + (r.gross_value || 0), 0);
  const pending = totalReceivable - totalPaid;
  if (totalReceivable > 0) {
    if (pending <= 0) {
      items.push({ id: nextId(), category: "pagamentos", title: "Viagem totalmente paga", description: `Valor total: R$ ${totalReceivable.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, status: "concluido", isMandatory: true });
    } else {
      const nextDue = receivables.find((r: any) => r.status !== "recebido" && r.due_date);
      items.push({ id: nextId(), category: "pagamentos", title: "Pagamento pendente", description: `Saldo restante: R$ ${pending.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}${nextDue?.due_date ? ` — Próximo vencimento: ${new Date(nextDue.due_date + "T00:00:00").toLocaleDateString("pt-BR")}` : ""}`, status: "atencao", isMandatory: true });
    }
  }

  // Check-in
  if (segments.length > 0) {
    const now = new Date();
    const firstFlight = segments[0];
    const depDate = firstFlight?.departure_date ? new Date(firstFlight.departure_date + "T00:00:00") : null;
    const hoursUntil = depDate ? (depDate.getTime() - now.getTime()) / (1000 * 60 * 60) : Infinity;
    if (hoursUntil <= 48 && hoursUntil > 0) {
      items.push({ id: nextId(), category: "checkin", title: "Check-in online disponível!", description: `Realize o check-in do voo ${firstFlight.airline || ""} ${firstFlight.flight_number || ""}.`, status: "atencao", isMandatory: true });
    } else {
      items.push({ id: nextId(), category: "checkin", title: "Realizar check-in online", description: "O check-in abre normalmente 48h antes do voo.", status: hoursUntil <= 72 ? "pendente" : "informativo", isMandatory: false });
    }
  }

  // Bagagem
  if (segments.length > 0) {
    items.push({ id: nextId(), category: "bagagem", title: "Verificar franquia de bagagem", description: "Confira o peso e dimensões permitidos pela companhia aérea.", status: "informativo", isMandatory: false });
    items.push({ id: nextId(), category: "bagagem", title: "Preparar bagagem", description: "Revise os itens proibidos e restrições do destino.", status: "informativo", isMandatory: false });
  }

  // Seguro
  const hasSeguro = services.some((s: any) => s.category === "seguro" || s.product_type === "seguro") || hasInsurance;
  items.push({ id: nextId(), category: "seguro", title: hasSeguro ? "Seguro viagem emitido" : "Contratar seguro viagem", description: hasSeguro ? "Seu seguro viagem está ativo." : "Recomendamos a contratação de um seguro viagem.", status: hasSeguro ? "concluido" : intl ? "atencao" : "informativo", isMandatory: intl });

  // Serviços
  const transfers = services.filter((s: any) => s.category === "transfer" || s.product_type === "transfer");
  const tours = services.filter((s: any) => s.category !== "transfer" && s.product_type !== "transfer" && s.category !== "seguro" && s.product_type !== "seguro");
  if (transfers.length > 0) items.push({ id: nextId(), category: "servicos", title: `${transfers.length} transfer(s) confirmado(s)`, description: "Transfers registrados na viagem.", status: "concluido", isMandatory: false });
  if (tours.length > 0) items.push({ id: nextId(), category: "servicos", title: `${tours.length} serviço(s) / passeio(s)`, description: "Serviços e experiências registrados.", status: "concluido", isMandatory: false });

  // Destino
  if (intl) {
    items.push(
      { id: nextId(), category: "destino", title: "Verificar moeda local", description: "Pesquise câmbio e meios de pagamento no destino.", status: "informativo", isMandatory: false },
      { id: nextId(), category: "destino", title: "Verificar clima e roupas adequadas", description: "Confira a previsão do tempo para as datas da viagem.", status: "informativo", isMandatory: false },
      { id: nextId(), category: "destino", title: "Verificar tomadas e adaptadores", description: "Verifique o padrão de tomadas do destino.", status: "informativo", isMandatory: false },
    );
  }

  return items;
}

/* ── Status indicator (left accent bar) ── */
function StatusBar({ status }: { status: string }) {
  const colors: Record<string, string> = {
    concluido: "bg-accent",
    pendente: "bg-warning",
    atencao: "bg-destructive",
    informativo: "bg-muted-foreground/30",
  };
  return <div className={`w-0.5 self-stretch rounded-full ${colors[status] || "bg-border"}`} />;
}

/* ── Single checklist row ── */
function ChecklistRow({ item }: { item: ChecklistItem }) {
  const meta = STATUS_META[item.status];
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="group flex items-start gap-3 py-3 px-1 transition-colors hover:bg-muted/30 rounded-lg"
    >
      <StatusBar status={item.status} />
      <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${meta.accent}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-tight">{item.title}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.description}</p>
        )}
      </div>
      {!item.isMandatory && item.status === "informativo" && (
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium flex-shrink-0 mt-0.5">
          dica
        </span>
      )}
    </motion.div>
  );
}

/* ── Category block ── */
function CategoryBlock({ category, items, isOpen, onToggle }: {
  category: string; items: ChecklistItem[]; isOpen: boolean; onToggle: () => void;
}) {
  const config = CATEGORY_CONFIG[category] || { label: category, icon: Info };
  const Icon = config.icon;
  const done = items.filter(i => i.status === "concluido").length;
  const total = items.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const hasAttention = items.some(i => i.status === "atencao");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="group/block"
    >
      <div className="border border-border/40 rounded-xl bg-card/50 backdrop-blur-sm overflow-hidden transition-shadow hover:shadow-md hover:border-border/60">
        {/* Header */}
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-4 p-5 text-left transition-colors hover:bg-muted/20"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/8 border border-border/30 flex items-center justify-center flex-shrink-0">
            <Icon className="h-4.5 w-4.5 text-foreground/70" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground tracking-tight">{config.label}</h3>
              {hasAttention && (
                <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex-1 max-w-[120px]">
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground font-medium tabular-nums">
                {done}/{total}
              </span>
            </div>
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground/50" />
          </motion.div>
        </button>

        {/* Items */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="border-t border-border/30 mx-5" />
              <div className="px-4 py-3 space-y-0.5">
                {items.map((item) => (
                  <ChecklistRow key={item.id} item={item} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ── Main component ── */
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
  const attentionCount = items.filter(i => i.status === "atencao").length;
  const pendingCount = items.filter(i => i.status === "pendente").length;

  const summaryMessage = attentionCount > 0
    ? `${attentionCount} ponto${attentionCount > 1 ? "s" : ""} exige${attentionCount > 1 ? "m" : ""} atenção`
    : pendingCount > 0
    ? `${pendingCount} item${pendingCount > 1 ? "ns" : ""} pendente${pendingCount > 1 ? "s" : ""}`
    : "Tudo essencial está encaminhado";

  return (
    <div className="space-y-6">
      {/* ── Premium Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-6"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-accent/3 pointer-events-none" />
        
        <div className="relative flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground tracking-tight">
              Preparação da Viagem
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{summaryMessage}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 sm:w-40">
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                />
              </div>
            </div>
            <span className="text-2xl font-bold text-foreground tabular-nums tracking-tighter">
              {pct}<span className="text-base font-medium text-muted-foreground">%</span>
            </span>
          </div>
        </div>

        {/* Status pills */}
        <div className="relative flex flex-wrap gap-2 mt-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 text-accent text-[11px] font-medium">
            <CheckCircle2 className="h-3 w-3" /> {done} concluído{done !== 1 ? "s" : ""}
          </span>
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/10 text-warning text-[11px] font-medium">
              <Circle className="h-3 w-3" /> {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
            </span>
          )}
          {attentionCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-[11px] font-medium">
              <AlertTriangle className="h-3 w-3" /> {attentionCount} atenção
            </span>
          )}
        </div>
      </motion.div>

      {/* ── Category blocks ── */}
      <div className="space-y-3">
        {categories.map((cat, i) => (
          <motion.div
            key={cat}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
          >
            <CategoryBlock
              category={cat}
              items={items.filter(i => i.category === cat)}
              isOpen={openCats[cat] ?? true}
              onToggle={() => setOpenCats(prev => ({ ...prev, [cat]: !prev[cat] }))}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
