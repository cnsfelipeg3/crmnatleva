import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import PortalExpenseSplit from "@/components/portal/PortalExpenseSplit";
import CurrencyPanel from "@/components/portal/CurrencyPanel";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import PortalLayout from "@/components/portal/PortalLayout";
import { getMockTripDetail } from "@/lib/portalMockTrips";
import { getMockFinanceData } from "@/lib/portalMockFinance";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  CircleDollarSign, Wallet, CreditCard, PiggyBank, TrendingUp,
  Plus, ArrowUpRight, ArrowDownRight, Receipt, ShoppingBag,
  UtensilsCrossed, Car, Ticket, ShieldCheck, Package, Sparkles,
  ChevronRight, Calendar, Clock, CheckCircle2, AlertCircle,
  Banknote, BadgeDollarSign, BarChart3, PieChart, Target,
  X, Save, Trash2, Edit2, Zap, Eye, EyeOff, ArrowRight,
  Flame, TrendingDown, Activity, Gauge, DollarSign,
  Plane, Coffee, Heart, Globe, Shield, Star,
  Camera, ImageIcon, Users,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

/* ─── Helpers ─── */
const fmt = (v: number, currency = "BRL") =>
  v?.toLocaleString("pt-BR", { style: "currency", currency }) || "R$ 0,00";
const pct = (used: number, total: number) =>
  total > 0 ? Math.round((used / total) * 100) : 0;
const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
const fmtDateFull = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

const CATEGORY_ICONS: Record<string, any> = {
  alimentacao: UtensilsCrossed,
  transporte: Car,
  compras: ShoppingBag,
  passeios: Ticket,
  hospedagem: ShieldCheck,
  emergencias: AlertCircle,
  outros: Package,
};

const CATEGORY_COLORS: Record<string, string> = {
  alimentacao: "hsl(var(--chart-1))",
  transporte: "hsl(var(--chart-2))",
  compras: "hsl(var(--chart-3))",
  passeios: "hsl(var(--chart-4))",
  hospedagem: "hsl(var(--chart-5))",
  emergencias: "hsl(var(--destructive))",
  outros: "hsl(var(--muted-foreground))",
};

const PAYMENT_METHODS = [
  { value: "cartao_credito", label: "Cartão de Crédito", icon: CreditCard },
  { value: "cartao_debito", label: "Cartão de Débito", icon: CreditCard },
  { value: "dinheiro", label: "Dinheiro", icon: Banknote },
  { value: "pix", label: "PIX", icon: Zap },
  { value: "outro", label: "Outro", icon: DollarSign },
];

const DEFAULT_CATEGORIES = [
  { name: "Alimentação", icon: "alimentacao", color: CATEGORY_COLORS.alimentacao },
  { name: "Transporte", icon: "transporte", color: CATEGORY_COLORS.transporte },
  { name: "Compras", icon: "compras", color: CATEGORY_COLORS.compras },
  { name: "Passeios", icon: "passeios", color: CATEGORY_COLORS.passeios },
  { name: "Hospedagem Extra", icon: "hospedagem", color: CATEGORY_COLORS.hospedagem },
  { name: "Emergências", icon: "emergencias", color: CATEGORY_COLORS.emergencias },
  { name: "Outros", icon: "outros", color: CATEGORY_COLORS.outros },
];

/* ─── Animated Counter ─── */
function AnimatedNumber({ value, prefix = "" }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 1200;
    const start = Date.now();
    const from = display;
    const step = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplay(from + (value - from) * eased);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);
  return <span>{prefix}{fmt(Math.round(display))}</span>;
}

/* ─── Circular Gauge ─── */
function CircularGauge({ percentage, size = 120, strokeWidth = 8, color = "accent", children }: {
  percentage: number; size?: number; strokeWidth?: number; color?: string; children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="hsl(var(--muted) / 0.2)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={`hsl(var(--${color}))`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: `drop-shadow(0 0 6px hsl(var(--${color}) / 0.4))` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

/* ═══ TRIP SELECTOR (when no sale is selected) ═══ */
function PortalFinanceTripSelector({ onSelect }: { onSelect: (saleId: string) => void }) {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const { data } = await supabase.functions.invoke("portal-api", { body: { action: "trips" } });
        const apiTrips = data?.trips || [];
        const mockTrips = getMockTripDetail("mock-trip-1") ? [
          { sale_id: "mock-trip-1", sale: { destination: "Itália", destination_iata: "FCO", departure_date: "2026-03-20", return_date: "2026-04-02", name: "Viagem Itália" } },
          { sale_id: "mock-trip-2", sale: { destination: "Maldivas", destination_iata: "MLE", departure_date: "2026-06-15", return_date: "2026-06-25", name: "Lua de Mel Maldivas" } },
        ] : [];
        const existingIds = new Set(apiTrips.map((t: any) => t.sale_id));
        const newMocks = mockTrips.filter((m) => !existingIds.has(m.sale_id));
        setTrips([...apiTrips, ...newMocks]);
      } catch {
        setTrips([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, []);

  return (
    <PortalLayout>
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-accent/10 animate-ping" style={{ animationDuration: "3s" }} />
            <div className="relative h-20 w-20 rounded-full bg-accent/5 border border-accent/20 flex items-center justify-center">
              <Wallet className="h-8 w-8 text-accent/60" />
            </div>
          </div>
          <h1 className="text-3xl font-black text-foreground">Meu Financeiro</h1>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Selecione uma viagem para acessar seu painel de controle financeiro
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-[3px] border-accent/20 border-t-accent rounded-full animate-spin" />
          </div>
        ) : trips.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
            <Plane className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Nenhuma viagem encontrada</p>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-3">
            {trips.map((trip, i) => {
              const sale = trip.sale || {};
              const dest = sale.destination || sale.name || "Viagem";
              const depDate = sale.departure_date;
              const retDate = sale.return_date;
              return (
                <motion.button
                  key={trip.sale_id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => onSelect(trip.sale_id)}
                  className="w-full flex items-center gap-4 p-5 rounded-2xl border border-border/30 bg-card hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 text-left group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center shrink-0 group-hover:from-accent/25 group-hover:to-accent/10 transition-all">
                    <Plane className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{dest}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {depDate ? new Date(depDate + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : ""}
                      {retDate ? ` — ${new Date(retDate + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}` : ""}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-accent transition-colors" />
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </div>
    </PortalLayout>
  );
}

/* MAIN PAGE */
export default function PortalFinance() {
  const { portalAccess } = usePortalAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const saleId = searchParams.get("sale");

  const [receivables, setReceivables] = useState<any[]>([]);
  const [sale, setSale] = useState<any>(null);
  const [budget, setBudget] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [cashItems, setCashItems] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [balanceVisible, setBalanceVisible] = useState(true);

  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [cashDialogOpen, setCashDialogOpen] = useState(false);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const isMock = saleId?.startsWith("mock-") || false;

  useEffect(() => {
    if (!saleId) return;

    // Mock data for demo trips
    if (isMock) {
      const mock = getMockFinanceData(saleId);
      if (mock) {
        setSale(mock.sale);
        setReceivables(mock.receivables);
        setBudget(mock.budget);
        setCategories(mock.categories);
        setExpenses(mock.expenses);
        setCashItems(mock.cashItems);
        setCards(mock.cards);
      }
      return;
    }

    if (!portalAccess?.client_id) return;
    loadAllData();
  }, [saleId, portalAccess?.client_id]);

  const loadAllData = async () => {
    if (!saleId || !portalAccess?.client_id || isMock) return;
    const { data: saleData } = await supabase
      .from("sales").select("id, locator, destination, total_received, total_cost, sale_date")
      .eq("id", saleId).single();
    setSale(saleData);

    const { data: recvData } = await supabase
      .from("accounts_receivable").select("*").eq("sale_id", saleId).order("due_date");
    setReceivables(recvData || []);

    const { data: budgetData } = await supabase
      .from("portal_travel_budgets" as any).select("*")
      .eq("sale_id", saleId).eq("client_id", portalAccess!.client_id).maybeSingle();

    if (budgetData) {
      setBudget(budgetData);
      const bid = (budgetData as any).id;
      const [catRes, expRes, cashRes, cardRes] = await Promise.all([
        supabase.from("portal_budget_categories" as any).select("*").eq("budget_id", bid).order("sort_order"),
        supabase.from("portal_expenses" as any).select("*").eq("budget_id", bid).order("expense_date", { ascending: false }),
        supabase.from("portal_cash_tracking" as any).select("*").eq("budget_id", bid),
        supabase.from("portal_travel_cards" as any).select("*").eq("budget_id", bid),
      ]);
      setCategories((catRes.data as any[]) || []);
      setExpenses((expRes.data as any[]) || []);
      setCashItems((cashRes.data as any[]) || []);
      setCards((cardRes.data as any[]) || []);
    }
  };

  const ensureBudget = async () => {
    if (budget) return budget;
    if (!saleId || !portalAccess?.client_id) return null;
    const { data, error } = await supabase
      .from("portal_travel_budgets" as any)
      .insert({ sale_id: saleId, client_id: portalAccess.client_id, total_budget: 0 } as any)
      .select().single();
    if (error) { toast.error("Erro ao criar orçamento"); return null; }
    const bid = (data as any).id;
    const cats = DEFAULT_CATEGORIES.map((c, i) => ({
      budget_id: bid, name: c.name, icon: c.icon, color: c.color, planned_amount: 0, sort_order: i,
    }));
    await supabase.from("portal_budget_categories" as any).insert(cats as any);
    setBudget(data);
    await loadAllData();
    return data;
  };

  const agencyTotal = receivables.reduce((s, r) => s + (r.gross_value || 0), 0);
  const agencyPaid = receivables.filter(r => r.status === "recebido").reduce((s, r) => s + (r.gross_value || 0), 0);
  const totalBudget = budget?.total_budget || 0;
  const totalSpent = expenses.reduce((s, e) => s + ((e as any).amount || 0), 0);
  const budgetRemaining = totalBudget - totalSpent;
  const totalCashInitial = cashItems.reduce((s, c) => s + ((c as any).initial_amount || 0), 0);
  const cashSpent = expenses.filter(e => (e as any).payment_method === "dinheiro").reduce((s, e) => s + ((e as any).amount || 0), 0);
  const cashRemaining = totalCashInitial - cashSpent;
  const cardTotalSpent = expenses.filter((e: any) => e.payment_method === "cartao_credito" || e.payment_method === "cartao_debito").reduce((s, e) => s + ((e as any).amount || 0), 0);

  const categorySpending = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e: any) => { map[e.category_id || "outros"] = (map[e.category_id || "outros"] || 0) + (e.amount || 0); });
    return map;
  }, [expenses]);

  const cardSpending = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.filter((e: any) => e.card_id).forEach((e: any) => { map[e.card_id] = (map[e.card_id] || 0) + (e.amount || 0); });
    return map;
  }, [expenses]);

  const dailySpending = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e: any) => { map[e.expense_date] = (map[e.expense_date] || 0) + (e.amount || 0); });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-7);
  }, [expenses]);

  if (!saleId) {
    return <PortalFinanceTripSelector onSelect={(id) => setSearchParams({ sale: id })} />;
  }

  return (
    <PortalLayout>
      <div className="relative">
        {/* ═══ HERO HEADER ═══ */}
        <div className="relative overflow-hidden">
          {/* Ambient background */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-accent/[0.04] blur-[100px]" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-chart-2/[0.03] blur-[80px]" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
              className="absolute top-10 right-10 w-[500px] h-[500px] opacity-[0.02]"
              style={{
                background: "conic-gradient(from 0deg, hsl(var(--accent)), transparent, hsl(var(--chart-3)), transparent, hsl(var(--accent)))",
                borderRadius: "50%",
              }}
            />
          </div>

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-6">
            {/* Breadcrumb */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-6"
            >
              <Globe className="h-3.5 w-3.5 text-accent" />
              <span>Portal do Viajante</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground">{sale?.destination || "Viagem"}</span>
            </motion.div>

            {/* Title + Hide balance */}
            <div className="flex items-start justify-between gap-3 mb-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="min-w-0">
                <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground mb-1">
                  Meu Financeiro
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground/70 max-w-md">
                  Controle total sobre investimento, gastos e orçamento
                </p>
              </motion.div>
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                onClick={() => setBalanceVisible(!balanceVisible)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted/30 text-[11px] font-medium text-muted-foreground hover:bg-muted/50 transition-all shrink-0 mt-1"
              >
                {balanceVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                <span className="hidden sm:inline">{balanceVisible ? "Ocultar" : "Mostrar"}</span>
              </motion.button>
            </div>

            {/* ═══ HERO BALANCE CARD ═══ */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative rounded-3xl border border-accent/10 bg-gradient-to-br from-accent/[0.06] via-card/90 to-card/80 backdrop-blur-xl p-6 sm:p-8 overflow-hidden mb-6"
            >
              {/* Shimmer */}
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 6 }}
                className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-accent/[0.04] to-transparent pointer-events-none"
              />

              <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                {/* Main balance */}
                <div className="col-span-2 lg:col-span-1">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-accent/60 mb-1.5">
                    Investimento Total
                  </p>
                  <p className="text-xl sm:text-3xl font-black tabular-nums text-foreground mb-1">
                    {balanceVisible ? <AnimatedNumber value={agencyTotal} /> : "••••••"}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className={`h-1.5 w-1.5 rounded-full ${agencyPaid >= agencyTotal ? "bg-accent" : "bg-warning animate-pulse"}`} />
                    <span className="text-[11px] text-muted-foreground">
                      {balanceVisible ? `${pct(agencyPaid, agencyTotal)}% quitado` : "••••"}
                    </span>
                  </div>
                </div>

                {/* Mini metrics */}
                <MiniMetric
                  icon={CheckCircle2} label="Pago" value={agencyPaid} color="accent"
                  visible={balanceVisible}
                />
                <MiniMetric
                  icon={Clock} label="Pendente" value={agencyTotal - agencyPaid} color="warning"
                  visible={balanceVisible}
                />
                <MiniMetric
                  icon={Activity} label="Gastos Viagem" value={totalSpent} color="chart-3"
                  visible={balanceVisible}
                />
              </div>
            </motion.div>

            {/* ═══ QUICK ACTIONS ═══ */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
            >
              <QuickActionPill icon={Plus} label="Registrar Gasto" onClick={async () => { await ensureBudget(); setExpenseDialogOpen(true); }} accent />
              <QuickActionPill icon={Target} label="Definir Budget" onClick={async () => { await ensureBudget(); setBudgetDialogOpen(true); }} />
              <QuickActionPill icon={CreditCard} label="Adicionar Cartão" onClick={async () => { await ensureBudget(); setCardDialogOpen(true); }} />
              <QuickActionPill icon={Banknote} label="Registrar Cash" onClick={async () => { await ensureBudget(); setCashDialogOpen(true); }} />
            </motion.div>
          </div>
        </div>

        {/* ═══ MAIN CONTENT ═══ */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-8">

          {/* ═══ GAUGES ROW ═══ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <GaugeCard
              label="Budget Usado"
              percentage={pct(totalSpent, totalBudget)}
              value={totalBudget > 0 ? fmt(budgetRemaining) : "—"}
              sub={totalBudget > 0 ? "restante" : "Defina seu budget"}
              color={pct(totalSpent, totalBudget) > 80 ? "destructive" : "accent"}
            />
            <GaugeCard
              label="Agência"
              percentage={pct(agencyPaid, agencyTotal)}
              value={fmt(agencyPaid)}
              sub={`de ${fmt(agencyTotal)}`}
              color="accent"
            />
            <GaugeCard
              label="Cash Disponível"
              percentage={totalCashInitial > 0 ? pct(cashRemaining, totalCashInitial) : 0}
              value={balanceVisible ? fmt(cashRemaining) : "••••"}
              sub={totalCashInitial > 0 ? `de ${fmt(totalCashInitial)}` : "Registre"}
              color="chart-2"
            />
            <GaugeCard
              label="Cartões"
              percentage={0}
              value={balanceVisible ? fmt(cardTotalSpent) : "••••"}
              sub={`${cards.length} cartão(ões)`}
              color="chart-4"
              noGauge
              icon={CreditCard}
            />
          </motion.div>

          {/* ═══ TABS ═══ */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-card/80 backdrop-blur-sm border border-border/30 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl w-full justify-start overflow-x-auto h-auto gap-0.5 sm:gap-1 scrollbar-hide flex-nowrap">
              {[
                { v: "overview", icon: PieChart, l: "Visão Geral" },
                { v: "agency", icon: Shield, l: "Agência" },
                { v: "expenses", icon: Receipt, l: "Gastos" },
                { v: "cards", icon: CreditCard, l: "Cartões" },
                { v: "split", icon: Users, l: "Rateio" },
                { v: "cambio", icon: Globe, l: "Câmbio" },
                { v: "history", icon: Calendar, l: "Histórico" },
              ].map(t => (
                <TabsTrigger
                  key={t.v}
                  value={t.v}
                  className="rounded-lg sm:rounded-xl text-[11px] sm:text-sm gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-2.5 sm:px-4 data-[state=active]:bg-accent/10 data-[state=active]:text-accent data-[state=active]:shadow-none transition-all whitespace-nowrap shrink-0"
                >
                  <t.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {t.l}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <OverviewSection
                categories={categories} categorySpending={categorySpending}
                totalBudget={totalBudget} totalSpent={totalSpent}
                agencyTotal={agencyTotal} agencyPaid={agencyPaid}
                expenses={expenses} dailySpending={dailySpending}
                balanceVisible={balanceVisible}
              />
            </TabsContent>

            <TabsContent value="agency" className="space-y-6">
              <AgencySection receivables={receivables} agencyTotal={agencyTotal} agencyPaid={agencyPaid} balanceVisible={balanceVisible} />
            </TabsContent>

            <TabsContent value="expenses" className="space-y-6">
              <ExpensesSection
                expenses={expenses} categories={categories} cards={cards}
                onAddExpense={async () => { await ensureBudget(); setExpenseDialogOpen(true); }}
              />
            </TabsContent>

            <TabsContent value="cards" className="space-y-6">
              <CardsAndCashSection
                cards={cards} cardSpending={cardSpending}
                cashItems={cashItems} cashRemaining={cashRemaining}
                totalCashInitial={totalCashInitial} cashSpent={cashSpent}
                balanceVisible={balanceVisible}
                onAddCard={async () => { await ensureBudget(); setCardDialogOpen(true); }}
                onAddCash={async () => { await ensureBudget(); setCashDialogOpen(true); }}
              />
            </TabsContent>

            <TabsContent value="split" className="space-y-6">
              <PortalExpenseSplit saleId={saleId!} />
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <HistorySection expenses={expenses} receivables={receivables} categories={categories} cards={cards} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ═══ DIALOGS ═══ */}
      <AddExpenseDialog open={expenseDialogOpen} onClose={() => setExpenseDialogOpen(false)} budgetId={budget?.id} categories={categories} cards={cards} onSaved={loadAllData} />
      <AddCardDialog open={cardDialogOpen} onClose={() => setCardDialogOpen(false)} budgetId={budget?.id} onSaved={loadAllData} />
      <AddCashDialog open={cashDialogOpen} onClose={() => setCashDialogOpen(false)} budgetId={budget?.id} onSaved={loadAllData} />
      <BudgetDialog open={budgetDialogOpen} onClose={() => setBudgetDialogOpen(false)} budget={budget} categories={categories} onSaved={loadAllData} />
    </PortalLayout>
  );
}

/* ═══════════════════════════════════════════════════════
   MINI METRIC (Hero card)
   ═══════════════════════════════════════════════════════ */
function MiniMetric({ icon: Icon, label, value, color, visible }: any) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <Icon className={`h-3 w-3 sm:h-3.5 sm:w-3.5 text-${color}`} />
        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50">{label}</span>
      </div>
      <p className={`text-base sm:text-xl font-black tabular-nums text-${color} truncate`}>
        {visible ? fmt(value) : "••••"}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   QUICK ACTION PILL
   ═══════════════════════════════════════════════════════ */
function QuickActionPill({ icon: Icon, label, onClick, accent }: { icon: any; label: string; onClick: () => void; accent?: boolean }) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
        accent
          ? "bg-accent text-accent-foreground shadow-lg shadow-accent/20"
          : "bg-card/80 border border-border/30 text-foreground hover:border-accent/30"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════════
   GAUGE CARD
   ═══════════════════════════════════════════════════════ */
function GaugeCard({ label, percentage, value, sub, color, noGauge, icon: Icon }: {
  label: string; percentage: number; value: string; sub: string; color: string; noGauge?: boolean; icon?: any;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-xl sm:rounded-2xl border border-border/20 bg-card/60 backdrop-blur-sm p-3 sm:p-5 flex flex-col items-center text-center overflow-hidden group hover:border-accent/10 transition-all"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-muted/[0.03] opacity-0 group-hover:opacity-100 transition-opacity" />

      {noGauge && Icon ? (
        <div className={`h-10 w-10 sm:h-16 sm:w-16 rounded-xl sm:rounded-2xl bg-${color}/10 flex items-center justify-center mb-2 sm:mb-3`}>
          <Icon className={`h-5 w-5 sm:h-7 sm:w-7 text-${color}`} />
        </div>
      ) : (
        <div className="mb-2 sm:mb-3">
          <CircularGauge percentage={percentage} size={68} strokeWidth={5} color={color}>
            <span className="text-sm sm:text-lg font-black tabular-nums text-foreground">{percentage}%</span>
          </CircularGauge>
        </div>
      )}

      <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50 mb-0.5 sm:mb-1">{label}</p>
      <p className="text-xs sm:text-base font-black tabular-nums text-foreground truncate w-full">{value}</p>
      <p className="text-[9px] sm:text-[10px] text-muted-foreground/40 mt-0.5 truncate w-full">{sub}</p>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   OVERVIEW SECTION
   ═══════════════════════════════════════════════════════ */
function OverviewSection({ categories, categorySpending, totalBudget, totalSpent, agencyTotal, agencyPaid, expenses, dailySpending, balanceVisible }: any) {
  const usedPct = pct(totalSpent, totalBudget);
  const maxDaily = Math.max(...dailySpending.map(([, v]: any) => v), 1);

  return (
    <>
      {/* Budget progress — immersive */}
      {totalBudget > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl sm:rounded-3xl border border-border/20 bg-gradient-to-br from-card/90 to-muted/10 backdrop-blur-sm p-4 sm:p-8 overflow-hidden"
        >
          <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full opacity-[0.04]"
            style={{ background: "radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%)" }}
          />

          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-accent/10 flex items-center justify-center">
                <Target className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-foreground">Budget da Viagem</p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground/60">Planejamento vs. realizado</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl sm:text-3xl font-black tabular-nums text-foreground">{usedPct}%</p>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground/50">utilizado</p>
            </div>
          </div>

          {/* Animated bar */}
          <div className="relative h-3 sm:h-4 w-full overflow-hidden rounded-full bg-muted/20 mb-3 sm:mb-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(usedPct, 100)}%` }}
              transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
              className={`h-full rounded-full relative ${
                usedPct > 90 ? "bg-destructive" : usedPct > 70 ? "bg-warning" : "bg-accent"
              }`}
              style={{ boxShadow: `0 0 20px hsl(var(--${usedPct > 90 ? "destructive" : usedPct > 70 ? "warning" : "accent"}) / 0.3)` }}
            >
              <motion.div
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              />
            </motion.div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div>
              <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Planejado</p>
              <p className="text-sm sm:text-lg font-black tabular-nums truncate">{balanceVisible ? fmt(totalBudget) : "••••"}</p>
            </div>
            <div>
              <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-accent/50">Gasto</p>
              <p className="text-sm sm:text-lg font-black tabular-nums text-accent truncate">{balanceVisible ? fmt(totalSpent) : "••••"}</p>
            </div>
            <div>
              <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Restante</p>
              <p className={`text-sm sm:text-lg font-black tabular-nums truncate ${(totalBudget - totalSpent) < 0 ? "text-destructive" : ""}`}>
                {balanceVisible ? fmt(totalBudget - totalSpent) : "••••"}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Daily spending mini chart */}
      {dailySpending.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border/20 bg-card/60 backdrop-blur-sm p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-accent" />
            <span className="text-sm font-bold text-foreground">Gastos Diários</span>
            <span className="text-[10px] text-muted-foreground/40 ml-auto">Últimos 7 dias</span>
          </div>
          <div className="flex items-end gap-1.5 h-24">
            {dailySpending.map(([date, val]: [string, number], i: number) => {
              const h = (val / maxDaily) * 100;
              return (
                <motion.div
                  key={date}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.8, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-1 rounded-t-lg bg-accent/20 hover:bg-accent/40 transition-colors relative group cursor-default min-h-[4px]"
                >
                  {/* Tooltip */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg px-2 py-1 text-[9px] font-bold text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg pointer-events-none">
                    {fmt(val)}
                  </div>
                </motion.div>
              );
            })}
          </div>
          <div className="flex gap-1.5 mt-2">
            {dailySpending.map(([date]: [string, number]) => (
              <span key={date} className="flex-1 text-center text-[8px] text-muted-foreground/40 tabular-nums">
                {new Date(date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit" })}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Category breakdown — visual ring + bars */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border border-border/20 bg-card/60 backdrop-blur-sm p-4 sm:p-6"
      >
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 className="h-4 w-4 text-accent" />
          <span className="text-sm font-bold text-foreground">Gastos por Categoria</span>
          {totalSpent > 0 && (
            <span className="text-[10px] text-muted-foreground/40 ml-auto tabular-nums">{fmt(totalSpent)} total</span>
          )}
        </div>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Registre gastos para ver a distribuição</p>
        ) : (
          <div className="space-y-3">
            {categories
              .map((cat: any) => ({ ...cat, spent: categorySpending[cat.id] || 0 }))
              .sort((a: any, b: any) => b.spent - a.spent)
              .map((cat: any, i: number) => {
                const spent = cat.spent;
                const planned = cat.planned_amount || 0;
                const catPct = planned > 0
                  ? pct(spent, planned)
                  : totalSpent > 0
                    ? pct(spent, totalSpent)
                    : 0;
                const shareOfTotal = totalSpent > 0 ? pct(spent, totalSpent) : 0;
                const IconComp = CATEGORY_ICONS[cat.icon] || Package;

                return (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group"
                  >
                    <div className="flex items-center gap-3 mb-1.5">
                      <div
                        className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                        style={{ backgroundColor: (spent > 0 ? cat.color : "hsl(var(--muted))") + "15" }}
                      >
                        <IconComp className="h-4 w-4" style={{ color: spent > 0 ? cat.color : "hsl(var(--muted-foreground))" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-foreground truncate">{cat.name}</span>
                          <div className="flex items-baseline gap-1.5 shrink-0">
                            <span className={`text-sm font-black tabular-nums ${spent > 0 ? "text-foreground" : "text-muted-foreground/30"}`}>
                              {spent > 0 ? fmt(spent) : "—"}
                            </span>
                            {planned > 0 && (
                              <span className="text-[10px] text-muted-foreground/50">/ {fmt(planned)}</span>
                            )}
                          </div>
                        </div>
                        {spent > 0 && totalSpent > 0 && (
                          <span className="text-[9px] text-muted-foreground/40 font-medium">{shareOfTotal}% do total</span>
                        )}
                      </div>
                    </div>
                    <div className="ml-12 relative">
                      <div className="h-2 w-full rounded-full bg-muted/20 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(catPct, 100)}%` }}
                          transition={{ duration: 1.2, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: spent === 0
                              ? "transparent"
                              : catPct > 90
                                ? "hsl(var(--destructive))"
                                : cat.color,
                            boxShadow: spent > 0
                              ? `0 0 8px ${catPct > 90 ? "hsl(var(--destructive) / 0.3)" : cat.color + "40"}`
                              : "none",
                          }}
                        />
                      </div>
                      {planned > 0 && spent > 0 && (
                        <span className={`text-[9px] font-bold mt-0.5 inline-block ${catPct > 90 ? "text-destructive" : "text-muted-foreground/40"}`}>
                          {catPct}%
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
          </div>
        )}
      </motion.div>

      {/* Recent expenses */}
      {expenses.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border/20 bg-card/60 backdrop-blur-sm overflow-hidden"
        >
          <div className="p-5 flex items-center gap-2 border-b border-border/10">
            <Flame className="h-4 w-4 text-accent" />
            <span className="text-sm font-bold text-foreground">Últimos Gastos</span>
            <span className="text-[10px] text-muted-foreground/40 ml-auto">{expenses.length} total</span>
          </div>
          <div className="divide-y divide-border/5">
            {expenses.slice(0, 5).map((e: any, i: number) => {
              const cat = categories.find((c: any) => c.id === e.category_id);
              const IconComp = CATEGORY_ICONS[cat?.icon] || Package;
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 + i * 0.04 }}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: (cat?.color || "hsl(var(--muted))") + "12" }}>
                      <IconComp className="h-4 w-4" style={{ color: cat?.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{e.description}</p>
                      <p className="text-[10px] text-muted-foreground/50">{fmtDate(e.expense_date)} · {cat?.name || "Outros"}</p>
                    </div>
                  </div>
                  <p className="text-sm font-black tabular-nums">{fmt(e.amount)}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   AGENCY SECTION
   ═══════════════════════════════════════════════════════ */
function AgencySection({ receivables, agencyTotal, agencyPaid, balanceVisible }: any) {
  const progressPct = pct(agencyPaid, agencyTotal);
  const paidCount = receivables.filter((r: any) => r.status === "recebido").length;

  return (
    <>
      {/* Progress ring */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl sm:rounded-3xl border border-border/20 bg-card/60 backdrop-blur-sm p-5 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <CircularGauge percentage={progressPct} size={100} strokeWidth={8} color="accent">
            <p className="text-xl font-black tabular-nums text-foreground">{progressPct}%</p>
            <p className="text-[7px] font-bold uppercase tracking-widest text-muted-foreground/40">quitado</p>
          </CircularGauge>
          <div className="flex-1 space-y-3 text-center sm:text-left w-full">
            <h3 className="text-sm sm:text-lg font-black text-foreground">Investimento com a NatLeva</h3>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div>
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Total</p>
                <p className="text-sm sm:text-xl font-black tabular-nums truncate">{balanceVisible ? fmt(agencyTotal) : "••••"}</p>
              </div>
              <div>
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-accent/50">Pago</p>
                <p className="text-sm sm:text-xl font-black tabular-nums text-accent truncate">{balanceVisible ? fmt(agencyPaid) : "••••"}</p>
              </div>
              <div>
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-warning/50">Pendente</p>
                <p className="text-sm sm:text-xl font-black tabular-nums text-warning truncate">{balanceVisible ? fmt(agencyTotal - agencyPaid) : "••••"}</p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground/50">{paidCount} de {receivables.length} parcelas pagas</p>
          </div>
        </div>
      </motion.div>

      {/* Parcelas timeline */}
      <div className="rounded-2xl border border-border/20 bg-card/60 backdrop-blur-sm overflow-hidden">
        <div className="p-5 border-b border-border/10 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-accent" />
          <span className="text-sm font-bold text-foreground">Cronograma de Parcelas</span>
        </div>
        {receivables.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Nenhuma parcela encontrada</p>
        ) : (
          <div className="p-4 space-y-2">
            {receivables.map((r: any, i: number) => {
              const isPaid = r.status === "recebido";
              const isOverdue = !isPaid && r.due_date && new Date(r.due_date + "T00:00:00") < new Date();
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`relative flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 sm:py-4 rounded-xl transition-all hover:scale-[1.005] ${
                    isPaid ? "bg-accent/[0.03] border border-accent/[0.08]" : isOverdue ? "bg-destructive/[0.03] border border-destructive/[0.08]" : "bg-warning/[0.02] border border-warning/[0.06]"
                  }`}
                >
                  {/* Timeline dot */}
                  <div className={`relative flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl flex items-center justify-center text-[10px] sm:text-xs font-black ${
                    isPaid ? "bg-accent/10 text-accent" : isOverdue ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                  }`}>
                    {isPaid ? <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" /> : r.installment_number || i + 1}
                    {!isPaid && isOverdue && (
                      <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                      {r.description || `Parcela ${r.installment_number || i + 1}`}
                      {(r.installment_total || 0) > 1 && <span className="text-muted-foreground/40 font-normal"> / {r.installment_total}</span>}
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground/50 mt-0.5 truncate">
                      {r.due_date ? fmtDateFull(r.due_date) : "Sem vencimento"}
                      {isOverdue && " · Vencida"}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <p className="text-xs sm:text-sm font-black tabular-nums whitespace-nowrap">{fmt(r.gross_value)}</p>
                    <span className={`text-[8px] sm:text-[9px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full ${
                      isPaid ? "bg-accent/10 text-accent" : isOverdue ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                    }`}>
                      {isPaid ? "✓ Pago" : isOverdue ? "Vencida" : "Pendente"}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   EXPENSES SECTION
   ═══════════════════════════════════════════════════════ */
function ExpensesSection({ expenses, categories, cards, onAddExpense }: any) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-bold text-foreground block">Gastos da Viagem</span>
          <span className="text-[10px] text-muted-foreground/50">{expenses.length} registros</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onAddExpense}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-accent-foreground text-xs font-bold shadow-lg shadow-accent/20"
        >
          <Plus className="h-3.5 w-3.5" /> Registrar Gasto
        </motion.button>
      </div>

      {expenses.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-3xl border border-dashed border-border/30 p-16 text-center">
          <div className="relative mx-auto w-20 h-20 mb-4">
            <div className="absolute inset-0 rounded-full bg-accent/5 animate-ping" style={{ animationDuration: "3s" }} />
            <div className="relative h-20 w-20 rounded-full bg-muted/20 flex items-center justify-center">
              <Receipt className="h-8 w-8 text-muted-foreground/20" />
            </div>
          </div>
          <p className="text-sm font-bold text-muted-foreground mb-1">Nenhum gasto registrado</p>
          <p className="text-xs text-muted-foreground/50 max-w-xs mx-auto">Comece registrando seus gastos para ter controle total do seu orçamento de viagem</p>
        </motion.div>
      ) : (
        <div className="rounded-2xl border border-border/20 bg-card/60 backdrop-blur-sm overflow-hidden">
          <div className="divide-y divide-border/5">
            {expenses.map((e: any, i: number) => {
              const cat = categories.find((c: any) => c.id === e.category_id);
              const card = cards.find((c: any) => c.id === e.card_id);
              const IconComp = CATEGORY_ICONS[cat?.icon] || Package;
              const pm = PAYMENT_METHODS.find(p => p.value === e.payment_method);
              const PmIcon = pm?.icon || DollarSign;

              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-muted/10 transition-colors group"
                >
                  <div className="h-10 w-10 flex-shrink-0 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110" style={{ backgroundColor: (cat?.color || "hsl(var(--muted))") + "12" }}>
                    <IconComp className="h-4.5 w-4.5" style={{ color: cat?.color || "hsl(var(--muted-foreground))" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{e.description}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <PmIcon className="h-2.5 w-2.5 text-muted-foreground/30" />
                      <p className="text-[10px] text-muted-foreground/50">
                        {fmtDate(e.expense_date)}
                        {pm && ` · ${pm.label}`}
                        {card && ` · •••${card.last_digits}`}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-black tabular-nums text-foreground flex-shrink-0">{fmt(e.amount)}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   CARDS & CASH SECTION
   ═══════════════════════════════════════════════════════ */
function CardsAndCashSection({ cards, cardSpending, cashItems, cashRemaining, totalCashInitial, cashSpent, balanceVisible, onAddCard, onAddCash }: any) {
  return (
    <>
      {/* Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-foreground block">Meus Cartões</span>
            <span className="text-[10px] text-muted-foreground/50">{cards.length} cadastrado(s)</span>
          </div>
          <Button size="sm" variant="outline" onClick={onAddCard} className="rounded-xl gap-1.5 text-xs border-border/30 hover:border-accent/30">
            <Plus className="h-3 w-3" /> Adicionar
          </Button>
        </div>

        {cards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/30 p-10 text-center">
            <CreditCard className="h-10 w-10 mx-auto text-muted-foreground/15 mb-3" />
            <p className="text-xs text-muted-foreground/50">Adicione cartões para rastrear gastos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cards.map((card: any, i: number) => {
              const spent = cardSpending[card.id] || 0;
              const brandColors: Record<string, string> = {
                visa: "from-blue-900/40 to-blue-800/20",
                mastercard: "from-orange-900/30 to-red-900/20",
                elo: "from-yellow-900/30 to-amber-900/20",
                amex: "from-slate-800/40 to-slate-700/20",
              };
              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  className={`relative rounded-2xl bg-gradient-to-br ${brandColors[card.brand] || "from-card to-muted/20"} border border-border/20 p-5 sm:p-6 overflow-hidden cursor-default`}
                >
                  {/* Card chip decoration */}
                  <div className="absolute top-4 right-5 opacity-[0.06]">
                    <div className="w-10 h-7 rounded-md border-2 border-foreground" />
                  </div>

                  <div className="relative">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 block mb-4">
                      {card.brand?.toUpperCase() || "CARTÃO"} · {card.card_type === "credito" ? "CRÉDITO" : card.card_type === "debito" ? "DÉBITO" : "MÚLTIPLO"}
                    </span>
                    <p className="text-lg font-mono tabular-nums text-foreground/70 mb-4 tracking-[0.3em]">
                      •••• •••• •••• {card.last_digits || "0000"}
                    </p>
                    <p className="text-xs font-bold text-foreground mb-4">{card.nickname}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase tracking-widest text-muted-foreground/30">Total na viagem</span>
                      <span className="text-xl font-black tabular-nums text-foreground">{balanceVisible ? fmt(spent) : "••••"}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cash */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-foreground block">Dinheiro em Espécie</span>
            <span className="text-[10px] text-muted-foreground/50">Controle de cash</span>
          </div>
          <Button size="sm" variant="outline" onClick={onAddCash} className="rounded-xl gap-1.5 text-xs border-border/30 hover:border-accent/30">
            <Plus className="h-3 w-3" /> Registrar
          </Button>
        </div>

        <div className="rounded-2xl border border-border/20 bg-card/60 backdrop-blur-sm p-6">
          {cashItems.length === 0 ? (
            <div className="text-center py-6">
              <div className="relative mx-auto w-16 h-16 mb-3">
                <div className="absolute inset-0 rounded-full bg-chart-2/5 animate-ping" style={{ animationDuration: "4s" }} />
                <div className="relative h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center">
                  <Banknote className="h-7 w-7 text-muted-foreground/15" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground/50">Registre quanto levou em dinheiro</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-center">
                <CircularGauge
                  percentage={totalCashInitial > 0 ? pct(cashRemaining, totalCashInitial) : 0}
                  size={120} strokeWidth={8} color="chart-2"
                >
                  <Banknote className="h-4 w-4 text-muted-foreground/30 mb-0.5" />
                  <span className="text-lg font-black tabular-nums text-foreground">
                    {balanceVisible ? fmt(cashRemaining) : "••••"}
                  </span>
                </CircularGauge>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Inicial</p>
                  <p className="text-base font-black tabular-nums">{balanceVisible ? fmt(totalCashInitial) : "••••"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-destructive/40">Usado</p>
                  <p className="text-base font-black tabular-nums text-destructive">{balanceVisible ? fmt(cashSpent) : "••••"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-accent/40">Saldo</p>
                  <p className="text-base font-black tabular-nums text-accent">{balanceVisible ? fmt(cashRemaining) : "••••"}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   HISTORY SECTION
   ═══════════════════════════════════════════════════════ */
function HistorySection({ expenses, receivables, categories, cards }: any) {
  const events = useMemo(() => {
    const items: any[] = [];
    receivables.forEach((r: any) => {
      const isPaid = r.status === "recebido";
      items.push({
        date: isPaid ? (r.received_date || r.due_date || r.created_at?.slice(0, 10)) : (r.due_date || r.created_at?.slice(0, 10)),
        type: isPaid ? "Pagamento NatLeva" : "Parcela pendente",
        description: r.description || `Parcela ${r.installment_number || ""}`,
        amount: r.gross_value || 0,
        icon: isPaid ? CheckCircle2 : Clock,
        color: isPaid ? "text-accent" : "text-warning",
        isAgency: true,
        meta: r.payment_method || undefined,
      });
    });
    expenses.forEach((e: any) => {
      const cat = categories.find((c: any) => c.id === e.category_id);
      const card = cards.find((c: any) => c.id === e.card_id);
      const pm = PAYMENT_METHODS.find(p => p.value === e.payment_method);
      items.push({
        date: e.expense_date,
        type: cat?.name || "Gasto",
        description: e.description,
        amount: e.amount,
        icon: CATEGORY_ICONS[cat?.icon] || Receipt,
        color: "text-foreground",
        catColor: cat?.color,
        meta: [pm?.label, card ? `•••${card.last_digits}` : null].filter(Boolean).join(" · "),
      });
    });
    items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return items;
  }, [expenses, receivables, categories, cards]);

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    events.forEach(e => { const d = e.date || "sem-data"; if (!map[d]) map[d] = []; map[d].push(e); });
    return Object.entries(map);
  }, [events]);

  return (
    <div className="rounded-2xl border border-border/20 bg-card/60 backdrop-blur-sm overflow-hidden">
      <div className="p-5 border-b border-border/10 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-accent" />
        <span className="text-sm font-bold text-foreground">Timeline Financeira</span>
        <span className="text-[10px] text-muted-foreground/40 ml-auto">{events.length} movimentações</span>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">Nenhuma movimentação registrada</p>
      ) : (
        <div>
          {grouped.map(([date, items], gi) => (
            <div key={date}>
              <div className="px-5 py-3 bg-muted/10 border-b border-border/5 sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-accent/10 flex items-center justify-center">
                    <span className="text-[9px] font-black text-accent tabular-nums">
                      {date !== "sem-data" ? new Date(date + "T00:00:00").getDate() : "?"}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-foreground">
                    {date !== "sem-data" ? fmtDateFull(date) : "Sem data"}
                  </span>
                  <span className="text-[10px] text-muted-foreground/40 ml-auto tabular-nums">
                    {fmt(items.reduce((s: number, e: any) => s + e.amount, 0))}
                  </span>
                </div>
              </div>
              {items.map((ev, i) => {
                const Icon = ev.icon;
                return (
                  <motion.div
                    key={`${date}-${i}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (gi * items.length + i) * 0.02 }}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/10 transition-colors relative"
                  >
                    {/* Timeline line */}
                    {i < items.length - 1 && (
                      <div className="absolute left-[37px] top-[44px] bottom-0 w-px bg-border/10" />
                    )}
                    <div className={`relative z-10 h-8 w-8 flex-shrink-0 rounded-lg flex items-center justify-center ${
                      ev.isAgency ? "bg-accent/10" : "bg-muted/20"
                    }`} style={ev.catColor ? { backgroundColor: ev.catColor + "12" } : undefined}>
                      <Icon className={`h-3.5 w-3.5 ${ev.color}`} style={ev.catColor ? { color: ev.catColor } : undefined} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{ev.description}</p>
                      <p className="text-[9px] text-muted-foreground/40">
                        {ev.type}{ev.meta && ` · ${ev.meta}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className="text-sm font-black tabular-nums">{fmt(ev.amount)}</p>
                      {ev.isAgency && (
                        <Shield className="h-3 w-3 text-accent/40" />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ADD EXPENSE DIALOG (with AI Receipt Scanner)
   ═══════════════════════════════════════════════════════ */
function AddExpenseDialog({ open, onClose, budgetId, categories, cards, onSaved }: any) {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [catId, setCatId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState("cartao_credito");
  const [cardId, setCardId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // AI Receipt Scanner state
  const [scanning, setScanning] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [aiApplied, setAiApplied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setDesc(""); setAmount(""); setCatId(""); setNotes(""); setCardId("");
    setPreviewUrl(null); setAiConfidence(null); setAiApplied(false);
  };

  const handleSave = async () => {
    if (!desc || !amount || !budgetId) return;
    setSaving(true);
    const { error } = await supabase.from("portal_expenses" as any).insert({
      budget_id: budgetId, description: desc, amount: parseFloat(amount),
      category_id: catId || null, expense_date: date, payment_method: payMethod,
      card_id: cardId || null, notes: notes || null,
    } as any);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar gasto"); return; }
    toast.success("Gasto registrado!");
    resetForm();
    onClose(); onSaved();
  };

  const processReceipt = async (file: File) => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setScanning(true);
    setAiApplied(false);

    try {
      // Convert to base64
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke("receipt-extract", {
        body: { image_base64: base64 },
      });

      if (error) throw error;
      if (!data?.success || !data?.data) throw new Error("Extraction failed");

      const extracted = data.data;
      // Apply extracted data to form
      if (extracted.description) setDesc(extracted.description);
      if (extracted.amount) setAmount(String(extracted.amount));
      if (extracted.date) setDate(extracted.date);
      if (extracted.payment_method) setPayMethod(extracted.payment_method);
      if (extracted.notes) setNotes(extracted.notes);
      if (extracted.confidence) setAiConfidence(extracted.confidence);

      // Match category by icon key
      if (extracted.category && categories.length > 0) {
        const match = categories.find((c: any) => c.icon === extracted.category);
        if (match) setCatId(match.id);
      }

      setAiApplied(true);
      toast.success("Dados extraídos com IA! Revise antes de salvar.", { duration: 4000 });
    } catch (e: any) {
      console.error("Receipt scan error:", e);
      toast.error("Não foi possível ler o comprovante. Preencha manualmente.");
    } finally {
      setScanning(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processReceipt(file);
    e.target.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose(); } }}>
      <DialogContent className="sm:max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="h-8 w-8 rounded-xl bg-accent/10 flex items-center justify-center">
              <Receipt className="h-4 w-4 text-accent" />
            </div>
            Registrar Gasto
          </DialogTitle>
        </DialogHeader>

        {/* AI Receipt Scanner */}
        <div className="space-y-3">
          {!previewUrl && !scanning && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-2 border-dashed border-accent/30 rounded-2xl p-5 text-center bg-accent/[0.03] hover:bg-accent/[0.06] transition-colors"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-3">
                <Camera className="w-5 h-5 text-accent" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">Escanear Comprovante</p>
              <p className="text-xs text-muted-foreground mb-4">Tire uma foto ou envie uma imagem do recibo e a IA preenche tudo automaticamente</p>
              <div className="flex gap-2 justify-center">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => cameraInputRef.current?.click()}
                  className="rounded-xl gap-2 text-xs"
                >
                  <Camera className="w-3.5 h-3.5" /> Câmera
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl gap-2 text-xs"
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Galeria
                </Button>
              </div>
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </motion.div>
          )}

          {scanning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border border-accent/20 rounded-2xl p-5 text-center bg-accent/[0.03]"
            >
              {previewUrl && (
                <div className="relative mx-auto w-32 h-32 mb-4 rounded-xl overflow-hidden border border-border">
                  <img src={previewUrl} alt="Receipt" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full"
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center justify-center gap-2 text-sm text-accent font-medium">
                <Sparkles className="w-4 h-4 animate-pulse" />
                Analisando comprovante com IA...
              </div>
              <p className="text-xs text-muted-foreground mt-1">Extraindo valores, categoria e data</p>
            </motion.div>
          )}

          {previewUrl && !scanning && aiApplied && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-accent/5 border border-accent/20"
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden border border-border shrink-0">
                <img src={previewUrl} alt="Receipt" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                  <Sparkles className="w-3 h-3" /> IA preencheu os campos
                </div>
                {aiConfidence !== null && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Confiança: {Math.round(aiConfidence * 100)}% — revise e edite se necessário
                  </p>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => { setPreviewUrl(null); setAiApplied(false); setAiConfidence(null); }}
                className="shrink-0 text-muted-foreground hover:text-destructive h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </div>

        {/* Divider */}
        {!scanning && (
          <>
            {(previewUrl || !previewUrl) && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
                <div className="flex-1 h-px bg-border" />
                {!previewUrl ? "ou preencha manualmente" : "edite os campos abaixo"}
                <div className="flex-1 h-px bg-border" />
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground/60 mb-1.5 block">Descrição *</label>
                <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex: Almoço no restaurante" className="rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground/60 mb-1.5 block">Valor (R$) *</label>
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className="rounded-xl" />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground/60 mb-1.5 block">Data</label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground/60 mb-1.5 block">Categoria</label>
                <Select value={catId} onValueChange={setCatId}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{categories.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground/60 mb-1.5 block">Pagamento</label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_METHODS.map(p => (<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              {(payMethod === "cartao_credito" || payMethod === "cartao_debito") && cards.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-muted-foreground/60 mb-1.5 block">Cartão</label>
                  <Select value={cardId} onValueChange={setCardId}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{cards.map((c: any) => (<SelectItem key={c.id} value={c.id}>{c.nickname} •{c.last_digits}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-muted-foreground/60 mb-1.5 block">Observação</label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" rows={2} className="rounded-xl" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="ghost" className="rounded-xl">Cancelar</Button></DialogClose>
              <Button onClick={handleSave} disabled={saving || !desc || !amount} className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl shadow-lg shadow-accent/20">
                {saving ? "Salvando..." : "Salvar Gasto"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════
   ADD CARD DIALOG
   ═══════════════════════════════════════════════════════ */
function AddCardDialog({ open, onClose, budgetId, onSaved }: any) {
  const [nickname, setNickname] = useState("");
  const [brand, setBrand] = useState("visa");
  const [lastDigits, setLastDigits] = useState("");
  const [cardType, setCardType] = useState("credito");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nickname || !budgetId) return;
    setSaving(true);
    const { error } = await supabase.from("portal_travel_cards" as any).insert({
      budget_id: budgetId, nickname, brand, last_digits: lastDigits, card_type: cardType,
    } as any);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar cartão"); return; }
    toast.success("Cartão adicionado!");
    setNickname(""); setLastDigits("");
    onClose(); onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="h-8 w-8 rounded-xl bg-accent/10 flex items-center justify-center">
              <CreditCard className="h-4 w-4 text-accent" />
            </div>
            Adicionar Cartão
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-bold text-muted-foreground/60 mb-1.5 block">Apelido *</label>
            <Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Ex: Nubank Crédito" className="rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground/60 mb-1.5 block">Bandeira</label>
              <Select value={brand} onValueChange={setBrand}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="visa">Visa</SelectItem>
                  <SelectItem value="mastercard">Mastercard</SelectItem>
                  <SelectItem value="elo">Elo</SelectItem>
                  <SelectItem value="amex">Amex</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground/60 mb-1.5 block">Final</label>
              <Input value={lastDigits} onChange={(e) => setLastDigits(e.target.value.slice(0, 4))} placeholder="1234" maxLength={4} className="rounded-xl" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground/60 mb-1.5 block">Tipo</label>
            <Select value={cardType} onValueChange={setCardType}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="credito">Crédito</SelectItem>
                <SelectItem value="debito">Débito</SelectItem>
                <SelectItem value="multiplo">Múltiplo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost" className="rounded-xl">Cancelar</Button></DialogClose>
          <Button onClick={handleSave} disabled={saving || !nickname} className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl shadow-lg shadow-accent/20">
            {saving ? "Salvando..." : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════
   ADD CASH DIALOG
   ═══════════════════════════════════════════════════════ */
function AddCashDialog({ open, onClose, budgetId, onSaved }: any) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!amount || !budgetId) return;
    setSaving(true);
    const { error } = await supabase.from("portal_cash_tracking" as any).insert({
      budget_id: budgetId, initial_amount: parseFloat(amount), currency, description: desc || null,
    } as any);
    setSaving(false);
    if (error) { toast.error("Erro ao registrar"); return; }
    toast.success("Dinheiro registrado!");
    setAmount(""); setDesc("");
    onClose(); onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="h-8 w-8 rounded-xl bg-chart-2/10 flex items-center justify-center">
              <Banknote className="h-4 w-4 text-chart-2" />
            </div>
            Registrar Dinheiro
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-bold text-muted-foreground/60 mb-1.5 block">Valor Inicial *</label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className="rounded-xl" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground/60 mb-1.5 block">Moeda</label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">BRL · Real</SelectItem>
                <SelectItem value="USD">USD · Dólar</SelectItem>
                <SelectItem value="EUR">EUR · Euro</SelectItem>
                <SelectItem value="GBP">GBP · Libra</SelectItem>
                <SelectItem value="ARS">ARS · Peso Argentino</SelectItem>
                <SelectItem value="CLP">CLP · Peso Chileno</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground/60 mb-1.5 block">Descrição</label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex: Câmbio no aeroporto" className="rounded-xl" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost" className="rounded-xl">Cancelar</Button></DialogClose>
          <Button onClick={handleSave} disabled={saving || !amount} className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl shadow-lg shadow-accent/20">
            {saving ? "Salvando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════════════════
   BUDGET DIALOG
   ═══════════════════════════════════════════════════════ */
function BudgetDialog({ open, onClose, budget, categories, onSaved }: any) {
  const [totalBudget, setTotalBudget] = useState("");
  const [catBudgets, setCatBudgets] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (budget) setTotalBudget(String(budget.total_budget || ""));
    const map: Record<string, string> = {};
    categories.forEach((c: any) => { map[c.id] = String(c.planned_amount || ""); });
    setCatBudgets(map);
  }, [budget, categories]);

  const handleSave = async () => {
    if (!budget) return;
    setSaving(true);
    await supabase.from("portal_travel_budgets" as any).update({ total_budget: parseFloat(totalBudget) || 0 } as any).eq("id", budget.id);
    for (const cat of categories) {
      await supabase.from("portal_budget_categories" as any).update({ planned_amount: parseFloat(catBudgets[cat.id]) || 0 } as any).eq("id", cat.id);
    }
    setSaving(false);
    toast.success("Orçamento atualizado!");
    onClose(); onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="h-8 w-8 rounded-xl bg-accent/10 flex items-center justify-center">
              <Target className="h-4 w-4 text-accent" />
            </div>
            Definir Orçamento
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-bold text-muted-foreground/60 mb-1.5 block">Orçamento Total (R$)</label>
            <Input type="number" value={totalBudget} onChange={(e) => setTotalBudget(e.target.value)} placeholder="5000" className="rounded-xl text-lg font-black" />
          </div>
          <div className="border-t border-border/10 pt-4">
            <p className="text-xs font-bold text-muted-foreground/60 mb-3">Por Categoria</p>
            <div className="space-y-3">
              {categories.map((cat: any) => {
                const IconComp = CATEGORY_ICONS[cat.icon] || Package;
                return (
                  <div key={cat.id} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: cat.color + "12" }}>
                      <IconComp className="h-3.5 w-3.5" style={{ color: cat.color }} />
                    </div>
                    <span className="text-xs font-semibold text-foreground flex-1">{cat.name}</span>
                    <Input
                      type="number"
                      value={catBudgets[cat.id] || ""}
                      onChange={(e) => setCatBudgets(prev => ({ ...prev, [cat.id]: e.target.value }))}
                      placeholder="0"
                      className="w-28 text-right rounded-xl"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost" className="rounded-xl">Cancelar</Button></DialogClose>
          <Button onClick={handleSave} disabled={saving} className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl shadow-lg shadow-accent/20">
            {saving ? "Salvando..." : "Salvar Orçamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
