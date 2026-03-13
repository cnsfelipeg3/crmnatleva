import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import PortalLayout from "@/components/portal/PortalLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  CircleDollarSign, Wallet, CreditCard, PiggyBank, TrendingUp,
  Plus, ArrowUpRight, ArrowDownRight, Receipt, ShoppingBag,
  UtensilsCrossed, Car, Ticket, ShieldCheck, Package, Sparkles,
  ChevronRight, Calendar, Clock, CheckCircle2, AlertCircle,
  Banknote, BadgeDollarSign, BarChart3, PieChart, Target,
  X, Save, Trash2, Edit2,
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
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "outro", label: "Outro" },
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

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════ */
export default function PortalFinance() {
  const { portalAccess } = usePortalAuth();
  const [searchParams] = useSearchParams();
  const saleId = searchParams.get("sale");

  // Agency receivables
  const [receivables, setReceivables] = useState<any[]>([]);
  const [sale, setSale] = useState<any>(null);

  // Personal finance
  const [budget, setBudget] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [cashItems, setCashItems] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);

  // Dialogs
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [cashDialogOpen, setCashDialogOpen] = useState(false);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);

  const [activeTab, setActiveTab] = useState("overview");

  // Load data
  useEffect(() => {
    if (!saleId || !portalAccess?.client_id) return;
    loadAllData();
  }, [saleId, portalAccess?.client_id]);

  const loadAllData = async () => {
    if (!saleId || !portalAccess?.client_id) return;

    // Sale info
    const { data: saleData } = await supabase
      .from("sales")
      .select("id, locator, destination, total_received, total_cost, sale_date")
      .eq("id", saleId)
      .single();
    setSale(saleData);

    // Receivables
    const { data: recvData } = await supabase
      .from("accounts_receivable")
      .select("*")
      .eq("sale_id", saleId)
      .order("due_date");
    setReceivables(recvData || []);

    // Budget
    const { data: budgetData } = await supabase
      .from("portal_travel_budgets" as any)
      .select("*")
      .eq("sale_id", saleId)
      .eq("client_id", portalAccess!.client_id)
      .maybeSingle();

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

  // Create budget if needed
  const ensureBudget = async () => {
    if (budget) return budget;
    if (!saleId || !portalAccess?.client_id) return null;

    const { data, error } = await supabase
      .from("portal_travel_budgets" as any)
      .insert({ sale_id: saleId, client_id: portalAccess.client_id, total_budget: 0 } as any)
      .select()
      .single();

    if (error) { toast.error("Erro ao criar orçamento"); return null; }

    // Create default categories
    const bid = (data as any).id;
    const cats = DEFAULT_CATEGORIES.map((c, i) => ({
      budget_id: bid, name: c.name, icon: c.icon, color: c.color, planned_amount: 0, sort_order: i,
    }));
    await supabase.from("portal_budget_categories" as any).insert(cats as any);

    setBudget(data);
    await loadAllData();
    return data;
  };

  /* ─── Computed values ─── */
  const agencyTotal = receivables.reduce((s, r) => s + (r.gross_value || 0), 0);
  const agencyPaid = receivables.filter(r => r.status === "recebido").reduce((s, r) => s + (r.gross_value || 0), 0);
  const agencyPending = agencyTotal - agencyPaid;

  const totalBudget = budget?.total_budget || 0;
  const totalSpent = expenses.reduce((s, e) => s + ((e as any).amount || 0), 0);
  const budgetRemaining = totalBudget - totalSpent;

  const totalCashInitial = cashItems.reduce((s, c) => s + ((c as any).initial_amount || 0), 0);
  const cashExpenses = expenses.filter(e => (e as any).payment_method === "dinheiro");
  const cashSpent = cashExpenses.reduce((s, e) => s + ((e as any).amount || 0), 0);
  const cashRemaining = totalCashInitial - cashSpent;

  const categorySpending = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e: any) => {
      const catId = e.category_id || "outros";
      map[catId] = (map[catId] || 0) + (e.amount || 0);
    });
    return map;
  }, [expenses]);

  const cardSpending = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.filter((e: any) => e.card_id).forEach((e: any) => {
      map[e.card_id] = (map[e.card_id] || 0) + (e.amount || 0);
    });
    return map;
  }, [expenses]);

  if (!saleId) {
    return (
      <PortalLayout>
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <Wallet className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Meu Financeiro</h1>
          <p className="text-muted-foreground">Selecione uma viagem para acessar o controle financeiro.</p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
        {/* ═══ HEADER ═══ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>Portal do Viajante</span>
            <ChevronRight className="h-3 w-3" />
            <span>{sale?.destination || "Viagem"}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            Meu Financeiro
          </h1>
          <p className="text-sm text-muted-foreground">
            Controle total sobre o investimento e gastos da sua viagem
          </p>
        </motion.div>

        {/* ═══ KPI STRIP ═══ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiCard
            icon={BadgeDollarSign} label="Investimento Total" value={fmt(agencyTotal)}
            sub={`${pct(agencyPaid, agencyTotal)}% pago`}
            accent
          />
          <KpiCard
            icon={Target} label="Budget da Viagem" value={fmt(totalBudget)}
            sub={totalBudget > 0 ? `${pct(totalSpent, totalBudget)}% usado` : "Defina seu budget"}
            onClick={async () => { await ensureBudget(); setBudgetDialogOpen(true); }}
          />
          <KpiCard
            icon={TrendingUp} label="Total Gasto" value={fmt(totalSpent)}
            sub={budgetRemaining >= 0 ? `${fmt(budgetRemaining)} restante` : `${fmt(Math.abs(budgetRemaining))} acima`}
            warning={budgetRemaining < 0}
          />
          <KpiCard
            icon={Banknote} label="Dinheiro em Espécie" value={fmt(cashRemaining)}
            sub={totalCashInitial > 0 ? `de ${fmt(totalCashInitial)}` : "Registre seu cash"}
          />
        </div>

        {/* ═══ TABS ═══ */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/30 p-1 rounded-xl w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview" className="rounded-lg text-xs sm:text-sm gap-1.5">
              <PieChart className="h-3.5 w-3.5" /> Visão Geral
            </TabsTrigger>
            <TabsTrigger value="agency" className="rounded-lg text-xs sm:text-sm gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Agência
            </TabsTrigger>
            <TabsTrigger value="expenses" className="rounded-lg text-xs sm:text-sm gap-1.5">
              <Receipt className="h-3.5 w-3.5" /> Gastos
            </TabsTrigger>
            <TabsTrigger value="cards" className="rounded-lg text-xs sm:text-sm gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> Cartões
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg text-xs sm:text-sm gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Histórico
            </TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW ── */}
          <TabsContent value="overview" className="space-y-6">
            <OverviewSection
              categories={categories}
              categorySpending={categorySpending}
              totalBudget={totalBudget}
              totalSpent={totalSpent}
              agencyTotal={agencyTotal}
              agencyPaid={agencyPaid}
              expenses={expenses}
            />
          </TabsContent>

          {/* ── AGENCY ── */}
          <TabsContent value="agency" className="space-y-6">
            <AgencySection receivables={receivables} agencyTotal={agencyTotal} agencyPaid={agencyPaid} />
          </TabsContent>

          {/* ── EXPENSES ── */}
          <TabsContent value="expenses" className="space-y-6">
            <ExpensesSection
              expenses={expenses}
              categories={categories}
              cards={cards}
              onAddExpense={async () => { await ensureBudget(); setExpenseDialogOpen(true); }}
            />
          </TabsContent>

          {/* ── CARDS & CASH ── */}
          <TabsContent value="cards" className="space-y-6">
            <CardsAndCashSection
              cards={cards}
              cardSpending={cardSpending}
              cashItems={cashItems}
              cashRemaining={cashRemaining}
              totalCashInitial={totalCashInitial}
              cashSpent={cashSpent}
              onAddCard={async () => { await ensureBudget(); setCardDialogOpen(true); }}
              onAddCash={async () => { await ensureBudget(); setCashDialogOpen(true); }}
            />
          </TabsContent>

          {/* ── HISTORY ── */}
          <TabsContent value="history" className="space-y-6">
            <HistorySection
              expenses={expenses}
              receivables={receivables}
              categories={categories}
              cards={cards}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* ═══ DIALOGS ═══ */}
      <AddExpenseDialog
        open={expenseDialogOpen}
        onClose={() => setExpenseDialogOpen(false)}
        budgetId={budget?.id}
        categories={categories}
        cards={cards}
        onSaved={loadAllData}
      />
      <AddCardDialog
        open={cardDialogOpen}
        onClose={() => setCardDialogOpen(false)}
        budgetId={budget?.id}
        onSaved={loadAllData}
      />
      <AddCashDialog
        open={cashDialogOpen}
        onClose={() => setCashDialogOpen(false)}
        budgetId={budget?.id}
        onSaved={loadAllData}
      />
      <BudgetDialog
        open={budgetDialogOpen}
        onClose={() => setBudgetDialogOpen(false)}
        budget={budget}
        categories={categories}
        onSaved={loadAllData}
      />
    </PortalLayout>
  );
}

/* ═══════════════════════════════════════════════════════
   KPI CARD
   ═══════════════════════════════════════════════════════ */
function KpiCard({ icon: Icon, label, value, sub, accent, warning, onClick }: {
  icon: any; label: string; value: string; sub: string; accent?: boolean; warning?: boolean; onClick?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={onClick ? { scale: 1.02 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all ${
        accent ? "border-accent/20 bg-accent/[0.04]" : "border-border/30 bg-card/80"
      } ${warning ? "border-destructive/20" : ""} ${onClick ? "cursor-pointer" : ""} backdrop-blur-sm`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
          accent ? "bg-accent/10" : warning ? "bg-destructive/10" : "bg-muted/50"
        }`}>
          <Icon className={`h-4.5 w-4.5 ${accent ? "text-accent" : warning ? "text-destructive" : "text-muted-foreground"}`} />
        </div>
        {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground/40" />}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 mb-1">{label}</p>
      <p className="text-xl sm:text-2xl font-black tabular-nums text-foreground">{value}</p>
      <p className={`text-[11px] mt-1 ${warning ? "text-destructive" : "text-muted-foreground/60"}`}>{sub}</p>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   OVERVIEW SECTION
   ═══════════════════════════════════════════════════════ */
function OverviewSection({ categories, categorySpending, totalBudget, totalSpent, agencyTotal, agencyPaid, expenses }: any) {
  const usedPct = pct(totalSpent, totalBudget);

  return (
    <>
      {/* Budget progress */}
      {totalBudget > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-accent" />
              <span className="text-sm font-bold text-foreground">Budget da Viagem</span>
            </div>
            <span className="text-2xl font-black tabular-nums text-foreground">{usedPct}%</span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted/30 mb-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(usedPct, 100)}%` }}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
              className={`h-full rounded-full ${
                usedPct > 90 ? "bg-destructive" : usedPct > 70 ? "bg-warning" : "bg-accent"
              }`}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{fmt(totalSpent)} gasto</span>
            <span>{fmt(totalBudget - totalSpent)} restante</span>
          </div>
        </motion.div>
      )}

      {/* Category breakdown */}
      <div className="rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 className="h-4 w-4 text-accent" />
          <span className="text-sm font-bold text-foreground">Gastos por Categoria</span>
        </div>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Registre gastos para ver a distribuição por categoria
          </p>
        ) : (
          <div className="space-y-3">
            {categories.map((cat: any) => {
              const spent = categorySpending[cat.id] || 0;
              const planned = cat.planned_amount || 0;
              const catPct = planned > 0 ? pct(spent, planned) : 0;
              const IconComp = CATEGORY_ICONS[cat.icon] || Package;
              return (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color + "15" }}>
                        <IconComp className="h-3.5 w-3.5" style={{ color: cat.color }} />
                      </div>
                      <span className="text-xs font-semibold text-foreground">{cat.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black tabular-nums text-foreground">{fmt(spent)}</span>
                      {planned > 0 && (
                        <span className="text-[10px] text-muted-foreground ml-1">/ {fmt(planned)}</span>
                      )}
                    </div>
                  </div>
                  {planned > 0 && (
                    <div className="h-1.5 w-full rounded-full bg-muted/30 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(catPct, 100)}%`,
                          backgroundColor: catPct > 90 ? "hsl(var(--destructive))" : cat.color,
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Agency summary mini */}
      <div className="rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-4 w-4 text-accent" />
          <span className="text-sm font-bold text-foreground">Investimento na Agência</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Total</p>
            <p className="text-lg font-black tabular-nums">{fmt(agencyTotal)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-accent/60">Pago</p>
            <p className="text-lg font-black tabular-nums text-accent">{fmt(agencyPaid)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-warning/60">Pendente</p>
            <p className="text-lg font-black tabular-nums text-warning">{fmt(agencyTotal - agencyPaid)}</p>
          </div>
        </div>
      </div>

      {/* Recent expenses */}
      {expenses.length > 0 && (
        <div className="rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-accent" />
            <span className="text-sm font-bold text-foreground">Últimos Gastos</span>
          </div>
          <div className="space-y-2">
            {expenses.slice(0, 5).map((e: any) => {
              const cat = categories.find((c: any) => c.id === e.category_id);
              const IconComp = CATEGORY_ICONS[cat?.icon] || Package;
              return (
                <div key={e.id} className="flex items-center justify-between py-2 border-b border-border/10 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-muted/40">
                      <IconComp className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{e.description}</p>
                      <p className="text-[10px] text-muted-foreground">{fmtDate(e.expense_date)}</p>
                    </div>
                  </div>
                  <p className="text-sm font-black tabular-nums text-foreground">{fmt(e.amount)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   AGENCY SECTION
   ═══════════════════════════════════════════════════════ */
function AgencySection({ receivables, agencyTotal, agencyPaid }: any) {
  const agencyPending = agencyTotal - agencyPaid;
  const progressPct = pct(agencyPaid, agencyTotal);
  const paidCount = receivables.filter((r: any) => r.status === "recebido").length;

  return (
    <>
      {/* Progress */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-foreground">Progresso do Pagamento</span>
          <span className="text-xl font-black tabular-nums">{progressPct}%</span>
        </div>
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted/30 mb-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            className="h-full rounded-full bg-accent"
            style={{ boxShadow: "0 0 12px hsl(var(--accent) / 0.3)" }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{paidCount} de {receivables.length} parcelas pagas</span>
          <span>{fmt(agencyPending)} pendente</span>
        </div>
      </motion.div>

      {/* Parcelas */}
      <div className="rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm overflow-hidden">
        <div className="p-5 border-b border-border/20">
          <span className="text-sm font-bold text-foreground">Cronograma de Parcelas</span>
        </div>
        <div className="divide-y divide-border/10">
          {receivables.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma parcela encontrada</p>
          ) : (
            receivables.map((r: any, i: number) => {
              const isPaid = r.status === "recebido";
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs font-black ${
                      isPaid ? "bg-accent/10 text-accent" : "bg-warning/10 text-warning"
                    }`}>
                      {r.installment_number || i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {r.description || `Parcela ${r.installment_number || i + 1}`}
                        {(r.installment_total || 0) > 1 && (
                          <span className="text-muted-foreground/50 font-normal"> / {r.installment_total}</span>
                        )}
                      </p>
                      {r.due_date && (
                        <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                          Vencimento: {fmtDate(r.due_date)}
                          {r.payment_method && ` · ${r.payment_method}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-black tabular-nums">{fmt(r.gross_value)}</p>
                    <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      isPaid ? "bg-accent/10 text-accent" : "bg-warning/10 text-warning"
                    }`}>
                      {isPaid ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {isPaid ? "Pago" : "Aberto"}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
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
        <span className="text-sm font-bold text-foreground">Gastos da Viagem</span>
        <Button size="sm" onClick={onAddExpense} className="rounded-xl gap-1.5 bg-accent hover:bg-accent/90 text-accent-foreground">
          <Plus className="h-3.5 w-3.5" /> Registrar Gasto
        </Button>
      </div>

      {expenses.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-dashed border-border/40 p-12 text-center"
        >
          <Receipt className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" />
          <p className="text-sm font-semibold text-muted-foreground mb-1">Nenhum gasto registrado</p>
          <p className="text-xs text-muted-foreground/60">Comece registrando seus gastos durante a viagem</p>
        </motion.div>
      ) : (
        <div className="rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm overflow-hidden divide-y divide-border/10">
          {expenses.map((e: any, i: number) => {
            const cat = categories.find((c: any) => c.id === e.category_id);
            const card = cards.find((c: any) => c.id === e.card_id);
            const IconComp = CATEGORY_ICONS[cat?.icon] || Package;
            const pm = PAYMENT_METHODS.find(p => p.value === e.payment_method);

            return (
              <motion.div
                key={e.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between px-5 py-4 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 flex-shrink-0 rounded-xl flex items-center justify-center" style={{ backgroundColor: (cat?.color || "hsl(var(--muted))") + "15" }}>
                    <IconComp className="h-4 w-4" style={{ color: cat?.color || "hsl(var(--muted-foreground))" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{e.description}</p>
                    <p className="text-[10px] text-muted-foreground/60">
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
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   CARDS & CASH SECTION
   ═══════════════════════════════════════════════════════ */
function CardsAndCashSection({ cards, cardSpending, cashItems, cashRemaining, totalCashInitial, cashSpent, onAddCard, onAddCash }: any) {
  return (
    <>
      {/* Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">Meus Cartões</span>
          <Button size="sm" variant="outline" onClick={onAddCard} className="rounded-xl gap-1.5 text-xs">
            <Plus className="h-3 w-3" /> Adicionar
          </Button>
        </div>

        {cards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/40 p-8 text-center">
            <CreditCard className="h-10 w-10 mx-auto text-muted-foreground/20 mb-2" />
            <p className="text-xs text-muted-foreground">Adicione cartões para rastrear gastos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cards.map((card: any) => {
              const spent = cardSpending[card.id] || 0;
              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative rounded-2xl border border-border/30 bg-gradient-to-br from-card to-muted/20 p-5 overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-accent/[0.03] -translate-y-1/2 translate-x-1/2" />
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">
                      {card.brand || "Cartão"}
                    </span>
                    <CreditCard className="h-4 w-4 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm font-bold text-foreground mb-0.5">{card.nickname}</p>
                  <p className="text-xs text-muted-foreground/60 tabular-nums mb-3">
                    •••• •••• •••• {card.last_digits || "0000"}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40">Gasto na viagem</span>
                    <span className="text-lg font-black tabular-nums text-foreground">{fmt(spent)}</span>
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
          <span className="text-sm font-bold text-foreground">Dinheiro em Espécie</span>
          <Button size="sm" variant="outline" onClick={onAddCash} className="rounded-xl gap-1.5 text-xs">
            <Plus className="h-3 w-3" /> Registrar
          </Button>
        </div>

        <div className="rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm p-6">
          {cashItems.length === 0 ? (
            <div className="text-center py-4">
              <Banknote className="h-10 w-10 mx-auto text-muted-foreground/20 mb-2" />
              <p className="text-xs text-muted-foreground">Registre quanto levou em dinheiro</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Inicial</p>
                  <p className="text-lg font-black tabular-nums text-foreground">{fmt(totalCashInitial)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-destructive/50">Usado</p>
                  <p className="text-lg font-black tabular-nums text-destructive">{fmt(cashSpent)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-accent/50">Saldo</p>
                  <p className="text-lg font-black tabular-nums text-accent">{fmt(cashRemaining)}</p>
                </div>
              </div>
              {totalCashInitial > 0 && (
                <div className="h-2 w-full rounded-full bg-muted/30 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-700"
                    style={{ width: `${Math.max(0, pct(cashRemaining, totalCashInitial))}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   HISTORY SECTION (Timeline Financeira)
   ═══════════════════════════════════════════════════════ */
function HistorySection({ expenses, receivables, categories, cards }: any) {
  // Merge all financial events into a single sorted list
  const events = useMemo(() => {
    const items: { date: string; type: string; description: string; amount: number; icon: any; color: string; meta?: string }[] = [];

    // Agency payments
    receivables.forEach((r: any) => {
      const isPaid = r.status === "recebido";
      items.push({
        date: isPaid ? (r.received_date || r.due_date || r.created_at?.slice(0, 10)) : (r.due_date || r.created_at?.slice(0, 10)),
        type: isPaid ? "Pagamento NatLeva" : "Parcela pendente",
        description: r.description || `Parcela ${r.installment_number || ""}`,
        amount: r.gross_value || 0,
        icon: isPaid ? CheckCircle2 : Clock,
        color: isPaid ? "text-accent" : "text-warning",
        meta: r.payment_method || undefined,
      });
    });

    // Personal expenses
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
        meta: [pm?.label, card ? `•••${card.last_digits}` : null].filter(Boolean).join(" · "),
      });
    });

    // Sort by date descending
    items.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return items;
  }, [expenses, receivables, categories, cards]);

  // Group by date
  const grouped = useMemo(() => {
    const map: Record<string, typeof events> = {};
    events.forEach(e => {
      const d = e.date || "sem-data";
      if (!map[d]) map[d] = [];
      map[d].push(e);
    });
    return Object.entries(map);
  }, [events]);

  return (
    <div className="rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm overflow-hidden">
      <div className="p-5 border-b border-border/20">
        <span className="text-sm font-bold text-foreground">Histórico Financeiro</span>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">Nenhuma movimentação registrada</p>
      ) : (
        <div className="divide-y divide-border/10">
          {grouped.map(([date, items]) => (
            <div key={date}>
              {/* Date header */}
              <div className="px-5 py-2.5 bg-muted/20 sticky top-0">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
                  {date !== "sem-data" ? fmtDate(date) : "Sem data"}
                </span>
              </div>
              {items.map((ev, i) => {
                const Icon = ev.icon;
                return (
                  <motion.div
                    key={`${date}-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-8 w-8 flex-shrink-0 rounded-lg flex items-center justify-center bg-muted/40`}>
                        <Icon className={`h-3.5 w-3.5 ${ev.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{ev.description}</p>
                        <p className="text-[10px] text-muted-foreground/60">
                          {ev.type}
                          {ev.meta && ` · ${ev.meta}`}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-black tabular-nums text-foreground flex-shrink-0 ml-3">
                      {fmt(ev.amount)}
                    </p>
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
   ADD EXPENSE DIALOG
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

  const handleSave = async () => {
    if (!desc || !amount || !budgetId) return;
    setSaving(true);
    const { error } = await supabase.from("portal_expenses" as any).insert({
      budget_id: budgetId,
      description: desc,
      amount: parseFloat(amount),
      category_id: catId || null,
      expense_date: date,
      payment_method: payMethod,
      card_id: cardId || null,
      notes: notes || null,
    } as any);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar gasto"); return; }
    toast.success("Gasto registrado!");
    setDesc(""); setAmount(""); setCatId(""); setNotes(""); setCardId("");
    onClose();
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-accent" /> Registrar Gasto
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Descrição *</label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex: Almoço no restaurante" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Valor (R$) *</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Data</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Categoria</label>
            <Select value={catId} onValueChange={setCatId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {categories.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Forma de Pagamento</label>
            <Select value={payMethod} onValueChange={setPayMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(payMethod === "cartao_credito" || payMethod === "cartao_debito") && cards.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Cartão</label>
              <Select value={cardId} onValueChange={setCardId}>
                <SelectTrigger><SelectValue placeholder="Selecione o cartão" /></SelectTrigger>
                <SelectContent>
                  {cards.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.nickname} •{c.last_digits}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Observação</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost">Cancelar</Button></DialogClose>
          <Button onClick={handleSave} disabled={saving || !desc || !amount} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            {saving ? "Salvando..." : "Salvar Gasto"}
          </Button>
        </DialogFooter>
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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-accent" /> Adicionar Cartão
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Apelido do Cartão *</label>
            <Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Ex: Nubank Crédito" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Bandeira</label>
              <Select value={brand} onValueChange={setBrand}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Final</label>
              <Input value={lastDigits} onChange={(e) => setLastDigits(e.target.value.slice(0, 4))} placeholder="1234" maxLength={4} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Tipo</label>
            <Select value={cardType} onValueChange={setCardType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="credito">Crédito</SelectItem>
                <SelectItem value="debito">Débito</SelectItem>
                <SelectItem value="multiplo">Múltiplo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost">Cancelar</Button></DialogClose>
          <Button onClick={handleSave} disabled={saving || !nickname} className="bg-accent hover:bg-accent/90 text-accent-foreground">
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
    if (error) { toast.error("Erro ao registrar dinheiro"); return; }
    toast.success("Dinheiro registrado!");
    setAmount(""); setDesc("");
    onClose(); onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-accent" /> Registrar Dinheiro
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Valor Inicial *</label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Moeda</label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">BRL - Real</SelectItem>
                <SelectItem value="USD">USD - Dólar</SelectItem>
                <SelectItem value="EUR">EUR - Euro</SelectItem>
                <SelectItem value="GBP">GBP - Libra</SelectItem>
                <SelectItem value="ARS">ARS - Peso Argentino</SelectItem>
                <SelectItem value="CLP">CLP - Peso Chileno</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Descrição</label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex: Dinheiro trocado no aeroporto" />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost">Cancelar</Button></DialogClose>
          <Button onClick={handleSave} disabled={saving || !amount} className="bg-accent hover:bg-accent/90 text-accent-foreground">
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

    await supabase
      .from("portal_travel_budgets" as any)
      .update({ total_budget: parseFloat(totalBudget) || 0 } as any)
      .eq("id", budget.id);

    for (const cat of categories) {
      const val = parseFloat(catBudgets[cat.id]) || 0;
      await supabase
        .from("portal_budget_categories" as any)
        .update({ planned_amount: val } as any)
        .eq("id", cat.id);
    }

    setSaving(false);
    toast.success("Orçamento atualizado!");
    onClose();
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" /> Definir Orçamento
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Orçamento Total da Viagem (R$)</label>
            <Input type="number" value={totalBudget} onChange={(e) => setTotalBudget(e.target.value)} placeholder="5000" />
          </div>
          <div className="border-t border-border/20 pt-3">
            <p className="text-xs font-bold text-muted-foreground mb-3">Orçamento por Categoria</p>
            <div className="space-y-2.5">
              {categories.map((cat: any) => {
                const IconComp = CATEGORY_ICONS[cat.icon] || Package;
                return (
                  <div key={cat.id} className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color + "15" }}>
                      <IconComp className="h-3.5 w-3.5" style={{ color: cat.color }} />
                    </div>
                    <span className="text-xs font-medium text-foreground flex-1">{cat.name}</span>
                    <Input
                      type="number"
                      value={catBudgets[cat.id] || ""}
                      onChange={(e) => setCatBudgets(prev => ({ ...prev, [cat.id]: e.target.value }))}
                      placeholder="0"
                      className="w-28 text-right"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost">Cancelar</Button></DialogClose>
          <Button onClick={handleSave} disabled={saving} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            {saving ? "Salvando..." : "Salvar Orçamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
