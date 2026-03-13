import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Users, Receipt, ArrowRight, Check, Trash2, Edit2,
  Camera, CircleDollarSign, PieChart, BarChart3, UserPlus,
  ChevronRight, Loader2, X, DollarSign, UtensilsCrossed,
  Car, ShoppingBag, Ticket, ShieldCheck, AlertCircle, Package,
  Sparkles, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

/* ─── Constants ─── */
const CURRENCIES = [
  { value: "BRL", label: "R$ (BRL)", symbol: "R$" },
  { value: "USD", label: "$ (USD)", symbol: "$" },
  { value: "EUR", label: "€ (EUR)", symbol: "€" },
  { value: "GBP", label: "£ (GBP)", symbol: "£" },
];

const CATEGORIES = [
  { value: "alimentacao", label: "Alimentação", icon: UtensilsCrossed, emoji: "🍽" },
  { value: "transporte", label: "Transporte", icon: Car, emoji: "🚕" },
  { value: "passeios", label: "Passeios", icon: Ticket, emoji: "🎟" },
  { value: "compras", label: "Compras", icon: ShoppingBag, emoji: "🛍" },
  { value: "hospedagem", label: "Hotel", icon: ShieldCheck, emoji: "🏨" },
  { value: "bar", label: "Bar & Drinks", icon: CircleDollarSign, emoji: "🍸" },
  { value: "outros", label: "Outros", icon: Package, emoji: "🧾" },
];

const AVATAR_COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

const fmt = (v: number, currency = "BRL") => {
  const symbols: Record<string, string> = { BRL: "R$", USD: "$", EUR: "€", GBP: "£" };
  const sym = symbols[currency] || currency;
  return `${sym} ${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/* ─── Types ─── */
interface Group { id: string; name: string; currency: string; sale_id: string; client_id: string; created_at: string; }
interface Member { id: string; group_id: string; name: string; avatar_color: string; passenger_id: string | null; }
interface Expense { id: string; group_id: string; description: string; amount: number; currency: string; category: string; paid_by_member_id: string; split_type: string; expense_date: string; notes: string | null; receipt_url: string | null; }
interface Split { id: string; expense_id: string; member_id: string; amount: number; }
interface Settlement { id: string; group_id: string; from_member_id: string; to_member_id: string; amount: number; currency: string; is_paid: boolean; paid_at: string | null; }

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export default function PortalExpenseSplit({ saleId, passengers }: { saleId: string; passengers?: any[] }) {
  const { portalAccess } = usePortalAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [splits, setSplits] = useState<Split[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);

  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const clientId = portalAccess?.client_id;

  // Load groups
  useEffect(() => {
    if (!clientId || !saleId) return;
    loadGroups();
  }, [clientId, saleId]);

  const loadGroups = async () => {
    setLoading(true);
    const isMock = saleId?.startsWith("mock-");
    let query = supabase
      .from("portal_expense_groups" as any)
      .select("*")
      .eq("client_id", clientId!)
      .order("created_at", { ascending: false });
    if (!isMock && saleId) query = query.eq("sale_id", saleId);
    const { data } = await query;
    const g = (data as any[] || []) as Group[];
    setGroups(g);
    if (g.length > 0 && !selectedGroup) setSelectedGroup(g[0]);
    setLoading(false);
  };

  // Load group data
  useEffect(() => {
    if (!selectedGroup) return;
    loadGroupData(selectedGroup.id);
  }, [selectedGroup?.id]);

  const loadGroupData = async (groupId: string) => {
    const [memRes, expRes, splitRes, settleRes] = await Promise.all([
      supabase.from("portal_expense_group_members" as any).select("*").eq("group_id", groupId),
      supabase.from("portal_group_expenses" as any).select("*").eq("group_id", groupId).order("expense_date", { ascending: false }),
      supabase.from("portal_expense_splits" as any).select("*").eq("expense_id", "placeholder_unused"),
      supabase.from("portal_expense_settlements" as any).select("*").eq("group_id", groupId),
    ]);
    setMembers((memRes.data as any[] || []) as Member[]);
    const exps = (expRes.data as any[] || []) as Expense[];
    setExpenses(exps);
    setSettlements((settleRes.data as any[] || []) as Settlement[]);

    // Load all splits for these expenses
    if (exps.length > 0) {
      const expIds = exps.map(e => e.id);
      const { data: allSplits } = await supabase
        .from("portal_expense_splits" as any)
        .select("*")
        .in("expense_id", expIds);
      setSplits((allSplits as any[] || []) as Split[]);
    } else {
      setSplits([]);
    }
  };

  // Calculate balances
  const balances = useMemo(() => {
    const bal: Record<string, number> = {};
    members.forEach(m => { bal[m.id] = 0; });

    expenses.forEach(exp => {
      // The payer paid the full amount
      bal[exp.paid_by_member_id] = (bal[exp.paid_by_member_id] || 0) + Number(exp.amount);
      // Each member owes their split
      const expSplits = splits.filter(s => s.expense_id === exp.id);
      expSplits.forEach(s => {
        bal[s.member_id] = (bal[s.member_id] || 0) - Number(s.amount);
      });
    });

    // Account for settlements
    settlements.filter(s => s.is_paid).forEach(s => {
      bal[s.from_member_id] = (bal[s.from_member_id] || 0) + Number(s.amount);
      bal[s.to_member_id] = (bal[s.to_member_id] || 0) - Number(s.amount);
    });

    return bal;
  }, [members, expenses, splits, settlements]);

  // Optimized settlements (minimize transactions)
  const optimizedSettlements = useMemo(() => {
    const debts: { from: string; to: string; amount: number }[] = [];
    const debtors = members.filter(m => (balances[m.id] || 0) < -0.01).map(m => ({ id: m.id, amount: Math.abs(balances[m.id] || 0) }));
    const creditors = members.filter(m => (balances[m.id] || 0) > 0.01).map(m => ({ id: m.id, amount: balances[m.id] || 0 }));

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const payment = Math.min(debtors[i].amount, creditors[j].amount);
      if (payment > 0.01) {
        debts.push({ from: debtors[i].id, to: creditors[j].id, amount: Math.round(payment * 100) / 100 });
      }
      debtors[i].amount -= payment;
      creditors[j].amount -= payment;
      if (debtors[i].amount < 0.01) i++;
      if (creditors[j].amount < 0.01) j++;
    }
    return debts;
  }, [balances, members]);

  const totalGroupSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => { map[e.category] = (map[e.category] || 0) + Number(e.amount); });
    return Object.entries(map).sort(([, a], [, b]) => b - a);
  }, [expenses]);

  const memberSpending = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => { map[e.paid_by_member_id] = (map[e.paid_by_member_id] || 0) + Number(e.amount); });
    return map;
  }, [expenses]);

  const getMember = (id: string) => members.find(m => m.id === id);
  const currency = selectedGroup?.currency || "BRL";

  // Mark settlement as paid
  const markSettled = async (fromId: string, toId: string, amount: number) => {
    if (!selectedGroup) return;
    const { error } = await supabase.from("portal_expense_settlements" as any).insert({
      group_id: selectedGroup.id,
      from_member_id: fromId,
      to_member_id: toId,
      amount,
      currency: selectedGroup.currency,
      is_paid: true,
      paid_at: new Date().toISOString(),
    } as any);
    if (error) { toast.error("Erro ao marcar pagamento"); return; }
    toast.success("Pagamento registrado!");
    loadGroupData(selectedGroup.id);
  };

  const deleteExpense = async (expenseId: string) => {
    await supabase.from("portal_expense_splits" as any).delete().eq("expense_id", expenseId);
    await supabase.from("portal_group_expenses" as any).delete().eq("id", expenseId);
    toast.success("Despesa removida");
    loadGroupData(selectedGroup!.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  // No groups yet — show creation CTA
  if (groups.length === 0) {
    return (
      <>
        <EmptyState onCreateGroup={() => setCreateGroupOpen(true)} />
        <CreateGroupDialog
          open={createGroupOpen}
          onClose={() => setCreateGroupOpen(false)}
          saleId={saleId}
          clientId={clientId!}
          passengers={passengers}
          onCreated={(g) => { setGroups([g]); setSelectedGroup(g); setCreateGroupOpen(false); }}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Group selector */}
      {groups.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
      {groups.map(g => (
            <button
              key={g.id}
              onClick={() => setSelectedGroup(g)}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                selectedGroup?.id === g.id
                  ? "bg-gradient-to-r from-accent to-accent/80 text-accent-foreground shadow-[0_0_16px_-4px_hsl(var(--accent)/0.4)] scale-[1.02]"
                  : "bg-card/60 backdrop-blur-sm text-muted-foreground border border-border/30 hover:border-accent/30 hover:text-accent hover:shadow-sm"
              }`}
            >
              {g.name}
            </button>
          ))}
          <button onClick={() => setCreateGroupOpen(true)} className="px-3 py-2.5 rounded-xl border-2 border-dashed border-accent/25 text-accent/60 hover:border-accent/50 hover:text-accent hover:bg-accent/5 hover:shadow-[0_0_12px_-4px_hsl(var(--accent)/0.2)] transition-all duration-200">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}

      {selectedGroup && (
        <>
          {/* ═══ SUMMARY CARDS ═══ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard icon={CircleDollarSign} label="Total Gasto" value={fmt(totalGroupSpent, currency)} color="accent" />
            <SummaryCard icon={Users} label="Participantes" value={String(members.length)} color="chart-2" />
            <SummaryCard icon={Receipt} label="Despesas" value={String(expenses.length)} color="chart-3" />
            <SummaryCard icon={ArrowRight} label="Transações" value={`${optimizedSettlements.length} pendente${optimizedSettlements.length !== 1 ? "s" : ""}`} color="warning" />
          </div>

          {/* ═══ MEMBERS ═══ */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Participantes</h3>
              <button onClick={() => setAddMemberOpen(true)} className="flex items-center gap-1.5 text-xs text-accent-foreground font-bold bg-gradient-to-r from-accent to-accent/80 px-3 py-1.5 rounded-lg shadow-sm hover:shadow-[0_0_12px_-3px_hsl(var(--accent)/0.4)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-200">
                <UserPlus className="h-3.5 w-3.5" /> Adicionar
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {members.map(m => {
                const bal = balances[m.id] || 0;
                const paid = memberSpending[m.id] || 0;
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative p-4 rounded-2xl border border-border/30 bg-card hover:border-accent/20 transition-all group"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0"
                        style={{ backgroundColor: m.avatar_color }}
                      >
                        {m.name[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{m.name}</p>
                        <p className="text-[10px] text-muted-foreground">Pagou {fmt(paid, currency)}</p>
                      </div>
                    </div>
                    <div className={`text-base font-black tabular-nums ${bal > 0.01 ? "text-accent" : bal < -0.01 ? "text-destructive" : "text-muted-foreground"}`}>
                      {bal > 0.01 && <ArrowUpRight className="inline h-3.5 w-3.5 mr-0.5" />}
                      {bal < -0.01 && <ArrowDownRight className="inline h-3.5 w-3.5 mr-0.5" />}
                      {bal > 0.01 ? `+${fmt(bal, currency)}` : bal < -0.01 ? `-${fmt(Math.abs(bal), currency)}` : fmt(0, currency)}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {bal > 0.01 ? "a receber" : bal < -0.01 ? "deve pagar" : "zerado ✓"}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* ═══ SETTLEMENTS ═══ */}
          {optimizedSettlements.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                Liquidação Otimizada
              </h3>
              <p className="text-xs text-muted-foreground -mt-1">Menor número de transações para zerar as contas</p>
              <div className="space-y-2">
                {optimizedSettlements.map((s, i) => {
                  const from = getMember(s.from);
                  const to = getMember(s.to);
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-4 rounded-2xl border border-border/30 bg-card hover:border-accent/20 transition-all"
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0" style={{ backgroundColor: from?.avatar_color || "#888" }}>
                        {from?.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">
                          <strong>{from?.name}</strong> paga <strong className="text-accent">{fmt(s.amount, currency)}</strong> para <strong>{to?.name}</strong>
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="gap-1.5 text-xs rounded-xl bg-gradient-to-r from-accent to-accent/80 text-accent-foreground font-bold shadow-[0_0_12px_-3px_hsl(var(--accent)/0.35)] hover:shadow-[0_0_20px_-3px_hsl(var(--accent)/0.5)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-200"
                        onClick={() => markSettled(s.from, s.to, s.amount)}
                      >
                        <Check className="h-3 w-3" /> Pago
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ═══ QUICK ACTIONS ═══ */}
          <div className="flex gap-2">
            <Button onClick={() => setAddExpenseOpen(true)} className="flex-1 sm:flex-none gap-2 rounded-xl bg-gradient-to-r from-accent to-accent/80 text-accent-foreground font-bold shadow-[0_0_16px_-4px_hsl(var(--accent)/0.35)] hover:shadow-[0_0_24px_-4px_hsl(var(--accent)/0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 h-12 text-sm">
              <Plus className="h-5 w-5" /> Adicionar Despesa
            </Button>
          </div>

          {/* ═══ CATEGORY BREAKDOWN (Mini chart) ═══ */}
          {categoryBreakdown.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <PieChart className="h-4 w-4 text-accent" /> Distribuição por Categoria
              </h3>
              <div className="space-y-2">
                {categoryBreakdown.map(([cat, amount]) => {
                  const catDef = CATEGORIES.find(c => c.value === cat) || CATEGORIES[6];
                  const pct = totalGroupSpent > 0 ? (amount / totalGroupSpent * 100) : 0;
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-lg">{catDef.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-foreground">{catDef.label}</span>
                          <span className="text-xs font-bold tabular-nums text-foreground">{fmt(amount, currency)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="h-full rounded-full bg-accent"
                          />
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground w-10 text-right">{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ═══ WHO PAID MOST (Bar chart) ═══ */}
          {members.length > 1 && expenses.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-accent" /> Quem pagou mais
              </h3>
              <div className="space-y-2">
                {members
                  .sort((a, b) => (memberSpending[b.id] || 0) - (memberSpending[a.id] || 0))
                  .map(m => {
                    const paid = memberSpending[m.id] || 0;
                    const pct = totalGroupSpent > 0 ? (paid / totalGroupSpent * 100) : 0;
                    return (
                      <div key={m.id} className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[10px] shrink-0" style={{ backgroundColor: m.avatar_color }}>
                          {m.name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-foreground">{m.name}</span>
                            <span className="text-xs font-bold tabular-nums text-foreground">{fmt(paid, currency)}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: m.avatar_color }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          )}

          {/* ═══ EXPENSE LIST ═══ */}
          {expenses.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <h3 className="text-sm font-bold text-foreground">Despesas Registradas</h3>
              <div className="space-y-2">
                {expenses.map((exp, i) => {
                  const payer = getMember(exp.paid_by_member_id);
                  const cat = CATEGORIES.find(c => c.value === exp.category) || CATEGORIES[6];
                  const expSplits = splits.filter(s => s.expense_id === exp.id);
                  return (
                    <motion.div
                      key={exp.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 p-4 rounded-2xl border border-border/30 bg-card group hover:border-accent/20 transition-all"
                    >
                      <span className="text-xl">{cat.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{exp.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(exp.expense_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                          {" · "}Pago por <strong>{payer?.name || "?"}</strong>
                          {expSplits.length > 0 && ` · Dividido com ${expSplits.length}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black tabular-nums text-foreground">{fmt(Number(exp.amount), exp.currency)}</p>
                        <p className="text-[10px] text-muted-foreground">{cat.label}</p>
                      </div>
                      <button onClick={() => deleteExpense(exp.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {expenses.length === 0 && (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Nenhuma despesa registrada</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Adicione a primeira despesa do grupo</p>
            </div>
          )}
        </>
      )}

      {/* ═══ DIALOGS ═══ */}
      <CreateGroupDialog
        open={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        saleId={saleId}
        clientId={clientId!}
        passengers={passengers}
        onCreated={(g) => { setGroups(prev => [g, ...prev]); setSelectedGroup(g); setCreateGroupOpen(false); }}
      />
      <AddExpenseDialog
        open={addExpenseOpen}
        onClose={() => setAddExpenseOpen(false)}
        group={selectedGroup}
        members={members}
        onSaved={() => { setAddExpenseOpen(false); loadGroupData(selectedGroup!.id); }}
        recentExpenses={expenses}
      />
      <AddMemberDialog
        open={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        groupId={selectedGroup?.id || ""}
        existingMembers={members}
        passengers={passengers}
        onSaved={() => { setAddMemberOpen(false); loadGroupData(selectedGroup!.id); }}
      />
    </div>
  );
}

/* ═══ EMPTY STATE ═══ */
function EmptyState({ onCreateGroup }: { onCreateGroup: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-6">
      <div className="relative mx-auto w-20 h-20">
        <div className="absolute inset-0 rounded-full bg-accent/10 animate-ping" style={{ animationDuration: "3s" }} />
        <div className="relative w-20 h-20 rounded-full bg-accent/5 border border-accent/20 flex items-center justify-center">
          <Users className="h-8 w-8 text-accent/60" />
        </div>
      </div>
      <div>
        <h3 className="text-2xl font-black text-foreground">Rateio de Despesas</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
          Organize e divida despesas da viagem com seus companheiros. Simples como o Splitwise, integrado à sua viagem.
        </p>
      </div>
      <Button onClick={onCreateGroup} size="lg" className="gap-2.5 rounded-2xl bg-gradient-to-r from-accent to-accent/80 text-accent-foreground font-bold text-base px-8 h-14 shadow-[0_0_24px_-4px_hsl(var(--accent)/0.4)] hover:shadow-[0_0_36px_-4px_hsl(var(--accent)/0.55)] hover:scale-[1.03] active:scale-[0.97] transition-all duration-200">
        <Plus className="h-5 w-5" /> Criar Grupo de Despesas
      </Button>
    </motion.div>
  );
}

/* ═══ SUMMARY CARD ═══ */
function SummaryCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative p-4 rounded-2xl border border-border/30 bg-card overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-accent/[0.03] -mr-4 -mt-4" />
      <div className="relative">
        <Icon className={`h-4 w-4 text-${color} mb-2`} />
        <p className="text-xl font-black tabular-nums text-foreground">{value}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mt-1">{label}</p>
      </div>
    </motion.div>
  );
}

/* ═══ CREATE GROUP DIALOG ═══ */
function CreateGroupDialog({ open, onClose, saleId, clientId, passengers, onCreated }: {
  open: boolean; onClose: () => void; saleId: string; clientId: string; passengers?: any[]; onCreated: (g: Group) => void;
}) {
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("BRL");
  const [memberNames, setMemberNames] = useState<string[]>([""]);
  const [selectedPassengers, setSelectedPassengers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const addMemberField = () => setMemberNames(prev => [...prev, ""]);
  const removeMemberField = (idx: number) => setMemberNames(prev => prev.filter((_, i) => i !== idx));
  const updateMemberField = (idx: number, val: string) => setMemberNames(prev => prev.map((v, i) => i === idx ? val : v));

  const togglePassenger = (pax: any) => {
    const n = pax.full_name || `${pax.first_name || ""} ${pax.last_name || ""}`.trim();
    setSelectedPassengers(prev => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n); else next.add(n);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Informe o nome do grupo"); return; }
    const allNames = [
      ...Array.from(selectedPassengers),
      ...memberNames.filter(n => n.trim()),
    ];
    if (allNames.length < 2) { toast.error("Adicione pelo menos 2 participantes"); return; }
    setLoading(true);

    const isMock = saleId?.startsWith("mock-");
    const insertPayload: Record<string, any> = { client_id: clientId, name: name.trim(), currency };
    if (!isMock && saleId) insertPayload.sale_id = saleId;

    const { data: group, error } = await supabase
      .from("portal_expense_groups" as any)
      .insert(insertPayload as any)
      .select().single();
    if (error || !group) { toast.error("Erro ao criar grupo"); setLoading(false); return; }

    const membersToInsert = allNames.map((n, i) => ({
      group_id: (group as any).id,
      name: n,
      avatar_color: AVATAR_COLORS[i % AVATAR_COLORS.length],
    }));

    await supabase.from("portal_expense_group_members" as any).insert(membersToInsert as any);
    toast.success("Grupo criado com sucesso!");
    setLoading(false);
    setName(""); setMemberNames([""]); setSelectedPassengers(new Set());
    onCreated(group as any);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" /> Criar Grupo de Despesas
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Nome do grupo</label>
            <Input placeholder="Ex: Viagem Itália Março 2026" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Moeda principal</label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Select from passengers */}
          {passengers && passengers.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Passageiros da reserva</label>
              <div className="flex flex-wrap gap-2">
                {passengers.map((pax: any, i: number) => {
                  const n = pax.full_name || `${pax.first_name || ""} ${pax.last_name || ""}`.trim();
                  const selected = selectedPassengers.has(n);
                  return (
                    <button
                      key={i}
                      onClick={() => togglePassenger(pax)}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border-2 transition-all duration-200 ${
                        selected
                          ? "bg-gradient-to-r from-accent/12 to-accent/5 border-accent/40 text-accent shadow-[0_0_10px_-4px_hsl(var(--accent)/0.25)] scale-[1.01]"
                          : "bg-card/50 backdrop-blur-sm border-border/20 text-muted-foreground hover:border-accent/25 hover:text-accent hover:bg-accent/5"
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[10px] font-black transition-all duration-200 ${selected ? "ring-2 ring-accent/30 ring-offset-1 ring-offset-background" : ""}`}>
                        {n[0]?.toUpperCase()}
                      </div>
                      {n}
                      {selected && <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center ml-auto"><Check className="h-2.5 w-2.5 text-accent-foreground" /></div>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Manual members */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Outros participantes</label>
            {memberNames.map((n, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder={`Nome do participante ${i + 1}`} value={n} onChange={e => updateMemberField(i, e.target.value)} />
                {memberNames.length > 1 && (
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removeMemberField(i)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" className="gap-1.5 text-xs rounded-xl border-accent/30 text-accent font-bold hover:bg-accent/10 hover:border-accent/50 hover:shadow-[0_0_10px_-3px_hsl(var(--accent)/0.2)] transition-all duration-200" onClick={addMemberField}>
              <Plus className="h-3 w-3" /> Adicionar nome
            </Button>
          </div>

          <Button onClick={handleCreate} disabled={loading} className="w-full gap-2 rounded-xl bg-gradient-to-r from-accent to-accent/80 text-accent-foreground font-bold h-12 text-sm shadow-[0_0_16px_-4px_hsl(var(--accent)/0.35)] hover:shadow-[0_0_24px_-4px_hsl(var(--accent)/0.5)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Criar Grupo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Category Split Intelligence ─── */
const CATEGORY_SUGGESTIONS: Record<string, { default: string; label: string; options: { type: string; label: string; desc: string }[] }> = {
  alimentacao: {
    default: "equal",
    label: "Gasto compartilhado de alimentação",
    options: [
      { type: "equal", label: "Dividir igualmente", desc: "Cada um paga a mesma parte" },
      { type: "present", label: "Só quem participou", desc: "Selecione quem estava presente" },
      { type: "custom", label: "Por consumo", desc: "Informe quanto cada um consumiu" },
    ],
  },
  bar: {
    default: "equal",
    label: "Conta de bar ou drinks",
    options: [
      { type: "equal", label: "Dividir igualmente", desc: "Dividir a conta inteira" },
      { type: "custom", label: "Por consumo", desc: "Cada um informa o que bebeu" },
      { type: "present", label: "Só quem participou", desc: "Selecione quem estava" },
    ],
  },
  transporte: {
    default: "equal",
    label: "Transporte compartilhado",
    options: [
      { type: "equal", label: "Dividir entre passageiros", desc: "Todos que usaram o transporte" },
      { type: "present", label: "Selecionar quem usou", desc: "Nem todos foram nesse trajeto" },
      { type: "solo", label: "Despesa individual", desc: "Só uma pessoa usou" },
    ],
  },
  passeios: {
    default: "present",
    label: "Passeio ou ingresso",
    options: [
      { type: "present", label: "Entre participantes", desc: "Selecione quem foi ao passeio" },
      { type: "equal", label: "Dividir igualmente", desc: "Todos participaram" },
      { type: "solo", label: "Despesa individual", desc: "Ingresso para uma pessoa" },
    ],
  },
  hospedagem: {
    default: "equal",
    label: "Hospedagem compartilhada",
    options: [
      { type: "equal", label: "Dividir por hóspede", desc: "Igualmente entre todos" },
      { type: "custom", label: "Por quarto", desc: "Valores diferentes por quarto" },
    ],
  },
  compras: {
    default: "solo",
    label: "Compra pessoal",
    options: [
      { type: "solo", label: "Despesa individual", desc: "Compra pessoal, sem divisão" },
      { type: "equal", label: "Presente coletivo", desc: "Dividir igualmente" },
      { type: "custom", label: "Divisão personalizada", desc: "Cada um contribuiu diferente" },
    ],
  },
  outros: {
    default: "equal",
    label: "Despesa geral",
    options: [
      { type: "equal", label: "Dividir igualmente", desc: "Valor igual para todos" },
      { type: "present", label: "Só quem participou", desc: "Selecione os envolvidos" },
      { type: "custom", label: "Personalizar", desc: "Definir valores manualmente" },
    ],
  },
};

/* ═══ ADD EXPENSE DIALOG (SMART) ═══ */
function AddExpenseDialog({ open, onClose, group, members, onSaved, recentExpenses }: {
  open: boolean; onClose: () => void; group: Group | null; members: Member[];
  onSaved: () => void; recentExpenses?: Expense[];
}) {
  const [step, setStep] = useState<"form" | "split" | "preview">("form");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(group?.currency || "BRL");
  const [category, setCategory] = useState("outros");
  const [paidBy, setPaidBy] = useState("");
  const [splitType, setSplitType] = useState("equal");
  const [splitAmong, setSplitAmong] = useState<Set<string>>(new Set());
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  // Restaurant mode
  const [serviceCharge, setServiceCharge] = useState(false);
  const [servicePercent, setServicePercent] = useState("10");
  const [tipIncluded, setTipIncluded] = useState(false);
  const [tipAmount, setTipAmount] = useState("");

  useEffect(() => {
    if (open && members.length > 0) {
      setPaidBy(members[0].id);
      setSplitAmong(new Set(members.map(m => m.id)));
      setCurrency(group?.currency || "BRL");
      setStep("form");
      setServiceCharge(false);
      setTipIncluded(false);
      setTipAmount("");
      setCustomAmounts({});
    }
  }, [open, members, group]);

  // Auto-suggest split type based on category
  useEffect(() => {
    const suggestion = CATEGORY_SUGGESTIONS[category];
    if (suggestion) {
      const defaultType = suggestion.default;
      if (defaultType === "solo") {
        setSplitType("equal");
        setSplitAmong(new Set([paidBy]));
      } else if (defaultType === "present") {
        setSplitType("equal");
      } else {
        setSplitType(defaultType);
        setSplitAmong(new Set(members.map(m => m.id)));
      }
    }
  }, [category]);

  const toggleSplitMember = (id: string) => {
    setSplitAmong(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleReceiptScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const { data, error } = await supabase.functions.invoke("receipt-extract", {
          body: { image_base64: base64 },
        });
        if (error || !data) throw error || new Error("No data");
        if (data.description) setDescription(data.description);
        if (data.amount) setAmount(String(data.amount));
        if (data.category) setCategory(data.category);
        if (data.date) setDate(data.date);
        if (data.notes) setNotes(data.notes);
        toast.success("Recibo processado pela IA!");
        setScanning(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Erro ao processar recibo");
      setScanning(false);
    }
  };

  // Compute effective amount (with service/tip)
  const baseAmount = parseFloat(amount) || 0;
  const serviceVal = serviceCharge ? baseAmount * (parseFloat(servicePercent) || 0) / 100 : 0;
  const tipVal = tipIncluded ? (parseFloat(tipAmount) || 0) : 0;
  const effectiveAmount = baseAmount + serviceVal + tipVal;

  // Compute split preview
  const computedSplits = useMemo(() => {
    const splitMembers = Array.from(splitAmong);
    if (splitMembers.length === 0 || effectiveAmount <= 0) return [];

    if (splitType === "equal") {
      const perPerson = Math.round((effectiveAmount / splitMembers.length) * 100) / 100;
      return splitMembers.map(mid => ({ member_id: mid, amount: perPerson }));
    } else if (splitType === "custom") {
      return splitMembers.map(mid => ({
        member_id: mid,
        amount: parseFloat(customAmounts[mid] || "0"),
      }));
    } else if (splitType === "percentage") {
      return splitMembers.map(mid => {
        const pctVal = parseFloat(customAmounts[mid] || "0");
        return { member_id: mid, amount: Math.round((effectiveAmount * pctVal / 100) * 100) / 100 };
      });
    }
    return [];
  }, [splitAmong, effectiveAmount, splitType, customAmounts]);

  // Payer's net result
  const payerOwes = computedSplits.find(s => s.member_id === paidBy)?.amount || 0;
  const payerNet = effectiveAmount - payerOwes; // how much others owe the payer

  const isRestaurantCategory = category === "alimentacao" || category === "bar";
  const suggestion = CATEGORY_SUGGESTIONS[category] || CATEGORY_SUGGESTIONS.outros;

  const goToSplit = () => {
    if (!description.trim() || !amount) { toast.error("Preencha descrição e valor"); return; }
    if (parseFloat(amount) <= 0) { toast.error("Valor inválido"); return; }
    setStep("split");
  };

  const goToPreview = () => {
    if (splitAmong.size === 0) { toast.error("Selecione pelo menos 1 participante"); return; }
    if (splitType === "custom") {
      const totalCustom = Array.from(splitAmong).reduce((s, mid) => s + (parseFloat(customAmounts[mid] || "0")), 0);
      if (Math.abs(totalCustom - effectiveAmount) > 0.02) {
        toast.error(`A soma dos valores (${fmt(totalCustom, currency)}) difere do total (${fmt(effectiveAmount, currency)})`);
        return;
      }
    }
    if (splitType === "percentage") {
      const totalPct = Array.from(splitAmong).reduce((s, mid) => s + (parseFloat(customAmounts[mid] || "0")), 0);
      if (Math.abs(totalPct - 100) > 0.5) {
        toast.error(`Os percentuais somam ${totalPct.toFixed(1)}%, devem somar 100%`);
        return;
      }
    }
    setStep("preview");
  };

  const handleSave = async () => {
    if (!group) return;
    setLoading(true);
    const fullDesc = isRestaurantCategory && (serviceCharge || tipIncluded)
      ? `${description.trim()}${serviceCharge ? ` (+${servicePercent}% serviço)` : ""}${tipIncluded ? ` (+gorjeta ${fmt(tipVal, currency)})` : ""}`
      : description.trim();

    const { data: expense, error } = await supabase
      .from("portal_group_expenses" as any)
      .insert({
        group_id: group.id, description: fullDesc, amount: effectiveAmount,
        currency, category, paid_by_member_id: paidBy, split_type: splitType,
        expense_date: date, notes: notes || null,
      } as any).select().single();

    if (error || !expense) { toast.error("Erro ao salvar despesa"); setLoading(false); return; }

    const splitsToInsert = computedSplits.map(s => ({
      expense_id: (expense as any).id, member_id: s.member_id, amount: s.amount,
    }));

    await supabase.from("portal_expense_splits" as any).insert(splitsToInsert as any);
    toast.success("Despesa registrada!");
    setLoading(false);
    setDescription(""); setAmount(""); setCategory("outros"); setNotes("");
    setStep("form");
    onSaved();
  };

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || "?";
  const getMemberColor = (id: string) => members.find(m => m.id === id)?.avatar_color || "#888";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-accent" />
            {step === "form" ? "Nova Despesa" : step === "split" ? "Como dividir?" : "Confirmar Divisão"}
          </DialogTitle>
        </DialogHeader>

        {/* ═══ STEP INDICATOR ═══ */}
        <div className="flex items-center gap-1 mb-2">
          {["form", "split", "preview"].map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div className={`h-1 flex-1 rounded-full transition-all ${
                step === s ? "bg-accent" : i < ["form", "split", "preview"].indexOf(step) ? "bg-accent/40" : "bg-muted/30"
              }`} />
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ═══ STEP 1: FORM ═══ */}
          {step === "form" && (
            <motion.div key="form" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {/* Receipt scanner */}
              <label className="flex items-center justify-center gap-2.5 px-4 py-4 rounded-2xl border-2 border-dashed border-accent/30 bg-gradient-to-br from-accent/[0.04] to-accent/[0.08] text-accent text-sm font-bold cursor-pointer hover:border-accent/50 hover:from-accent/[0.06] hover:to-accent/[0.12] hover:shadow-[0_0_20px_-5px_hsl(var(--accent)/0.2)] active:scale-[0.99] transition-all duration-200">
                {scanning ? <><Loader2 className="h-5 w-5 animate-spin" /> Processando recibo...</> : <><Camera className="h-5 w-5" /> Escanear Recibo com IA</>}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleReceiptScan} disabled={scanning} />
              </label>

              <Input placeholder="Descrição (ex: Jantar no restaurante)" value={description} onChange={e => setDescription(e.target.value)} />

              <div className="grid grid-cols-2 gap-3">
                <Input type="number" step="0.01" placeholder="Valor" value={amount} onChange={e => setAmount(e.target.value)} />
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Categoria</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Data</label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
              </div>

              {/* Restaurant extras */}
              {isRestaurantCategory && baseAmount > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-3 p-4 rounded-2xl bg-accent/[0.03] border border-accent/10">
                  <p className="text-xs font-bold text-accent flex items-center gap-1.5">
                    <UtensilsCrossed className="h-3.5 w-3.5" /> Modo Restaurante
                  </p>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-foreground font-medium">Taxa de serviço</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setServiceCharge(!serviceCharge)}
                        className={`w-10 h-5 rounded-full transition-all flex items-center ${serviceCharge ? "bg-accent justify-end" : "bg-muted/40 justify-start"}`}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow mx-0.5" />
                      </button>
                      {serviceCharge && (
                        <Input type="number" value={servicePercent} onChange={e => setServicePercent(e.target.value)} className="w-16 h-7 text-xs text-center" />
                      )}
                      {serviceCharge && <span className="text-xs text-muted-foreground">%</span>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-foreground font-medium">Gorjeta extra</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTipIncluded(!tipIncluded)}
                        className={`w-10 h-5 rounded-full transition-all flex items-center ${tipIncluded ? "bg-accent justify-end" : "bg-muted/40 justify-start"}`}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow mx-0.5" />
                      </button>
                      {tipIncluded && (
                        <Input type="number" step="0.01" placeholder="Valor" value={tipAmount} onChange={e => setTipAmount(e.target.value)} className="w-20 h-7 text-xs" />
                      )}
                    </div>
                  </div>
                  {(serviceCharge || tipIncluded) && (
                    <div className="text-[11px] text-muted-foreground bg-card rounded-xl px-3 py-2 space-y-0.5">
                      <div className="flex justify-between"><span>Subtotal</span><span>{fmt(baseAmount, currency)}</span></div>
                      {serviceCharge && <div className="flex justify-between"><span>Serviço ({servicePercent}%)</span><span>+{fmt(serviceVal, currency)}</span></div>}
                      {tipIncluded && tipVal > 0 && <div className="flex justify-between"><span>Gorjeta</span><span>+{fmt(tipVal, currency)}</span></div>}
                      <div className="flex justify-between font-bold text-foreground border-t border-border/20 pt-1 mt-1">
                        <span>Total</span><span>{fmt(effectiveAmount, currency)}</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Quem pagou</label>
                <div className="flex flex-wrap gap-2">
                  {members.map(m => (
                    <button key={m.id} onClick={() => setPaidBy(m.id)}
                      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border-2 transition-all duration-200 ${
                        paidBy === m.id
                          ? "bg-gradient-to-r from-accent/15 to-accent/5 border-accent/40 text-accent shadow-[0_0_12px_-4px_hsl(var(--accent)/0.3)] scale-[1.02]"
                          : "bg-card/50 backdrop-blur-sm border-border/20 text-muted-foreground hover:border-accent/25 hover:text-accent hover:bg-accent/5"
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-black shrink-0 transition-all duration-200 ${paidBy === m.id ? "ring-2 ring-accent/40 ring-offset-1 ring-offset-background" : ""}`} style={{ backgroundColor: m.avatar_color }}>{m.name[0]?.toUpperCase()}</div>
                      {m.name}
                      {paidBy === m.id && <Check className="h-3 w-3 ml-auto text-accent" />}
                    </button>
                  ))}
                </div>
              </div>

              <Textarea placeholder="Observações (opcional)" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />

              <Button onClick={goToSplit} className="w-full gap-2.5 rounded-xl bg-gradient-to-r from-accent to-accent/80 text-accent-foreground font-bold h-12 text-sm shadow-[0_0_16px_-4px_hsl(var(--accent)/0.35)] hover:shadow-[0_0_24px_-4px_hsl(var(--accent)/0.5)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200">
                Próximo: Como dividir <ChevronRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {/* ═══ STEP 2: SMART SPLIT ═══ */}
          {step === "split" && (
            <motion.div key="split" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
              {/* Smart suggestion card */}
              <div className="p-4 rounded-2xl bg-accent/[0.04] border border-accent/15 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Sugestão inteligente</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Essa despesa parece ser <strong>{suggestion.label}</strong>.
                      {suggestion.default === "solo" ? " Sugerimos não dividir." : " Como deseja dividir?"}
                    </p>
                  </div>
                </div>

                {/* Quick suggestion buttons */}
                <div className="space-y-1.5">
                  {suggestion.options.map(opt => {
                    const isActive = (() => {
                      if (opt.type === "equal" && splitType === "equal" && splitAmong.size === members.length) return true;
                      if (opt.type === "present" && splitType === "equal" && splitAmong.size < members.length && splitAmong.size > 0) return true;
                      if (opt.type === "custom" && splitType === "custom") return true;
                      if (opt.type === "percentage" && splitType === "percentage") return true;
                      if (opt.type === "solo" && splitAmong.size === 1) return true;
                      return false;
                    })();

                    const handleClick = () => {
                      if (opt.type === "equal") {
                        setSplitType("equal");
                        setSplitAmong(new Set(members.map(m => m.id)));
                      } else if (opt.type === "present") {
                        setSplitType("equal");
                        // Keep current selection if already customized, otherwise default to all
                      } else if (opt.type === "custom") {
                        setSplitType("custom");
                        setSplitAmong(new Set(members.map(m => m.id)));
                      } else if (opt.type === "percentage") {
                        setSplitType("percentage");
                        setSplitAmong(new Set(members.map(m => m.id)));
                        // Auto-fill equal percentages
                        const eqPct = (100 / members.length).toFixed(1);
                        const newAmounts: Record<string, string> = {};
                        members.forEach(m => { newAmounts[m.id] = eqPct; });
                        setCustomAmounts(newAmounts);
                      } else if (opt.type === "solo") {
                        setSplitType("equal");
                        setSplitAmong(new Set([paidBy]));
                      }
                    };

                    return (
                      <button
                        key={opt.type}
                        onClick={handleClick}
                        className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all duration-200 ${
                          isActive
                            ? "bg-gradient-to-r from-accent/12 to-accent/5 border-accent/40 shadow-[0_0_14px_-4px_hsl(var(--accent)/0.25)] scale-[1.01]"
                            : "bg-card/60 backdrop-blur-sm border-border/15 hover:border-accent/25 hover:bg-accent/[0.03] hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${isActive ? "border-accent bg-accent" : "border-muted-foreground/30"}`}>
                            {isActive && <Check className="h-2.5 w-2.5 text-accent-foreground" />}
                          </div>
                          <p className={`text-xs font-bold ${isActive ? "text-accent" : "text-foreground"}`}>{opt.label}</p>
                          {opt.type === suggestion.default && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-accent/15 text-accent ml-auto">Recomendado</span>}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 ml-6">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Fine-tune: select participants */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Dividir entre</label>
                <div className="space-y-1.5">
                  {members.map(m => (
                    <div key={m.id} className="flex items-center gap-3">
                      <button
                        onClick={() => toggleSplitMember(m.id)}
                        className={`flex items-center gap-2.5 flex-1 px-3.5 py-3 rounded-xl text-xs font-bold border-2 transition-all duration-200 ${
                          splitAmong.has(m.id)
                            ? "bg-gradient-to-r from-accent/12 to-accent/5 border-accent/35 text-accent shadow-[0_0_10px_-4px_hsl(var(--accent)/0.2)]"
                            : "bg-card/50 backdrop-blur-sm border-border/20 text-muted-foreground hover:border-accent/20 hover:bg-accent/[0.03]"
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0 transition-all duration-200 ${splitAmong.has(m.id) ? "ring-2 ring-accent/30 ring-offset-1 ring-offset-background" : ""}`} style={{ backgroundColor: m.avatar_color }}>{m.name[0]?.toUpperCase()}</div>
                        {m.name}
                        {m.id === paidBy && <span className="text-[9px] px-2 py-0.5 rounded-full bg-accent/20 text-accent font-bold ml-1">pagou</span>}
                        <div className={`ml-auto w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${splitAmong.has(m.id) ? "border-accent bg-accent" : "border-muted-foreground/25"}`}>
                          {splitAmong.has(m.id) && <Check className="h-3 w-3 text-accent-foreground" />}
                        </div>
                      </button>
                      {(splitType === "custom" || splitType === "percentage") && splitAmong.has(m.id) && (
                        <Input
                          type="number" step="0.01"
                          placeholder={splitType === "percentage" ? "%" : fmt(0, currency)}
                          className="w-24 h-9 text-xs"
                          value={customAmounts[m.id] || ""}
                          onChange={e => setCustomAmounts(prev => ({ ...prev, [m.id]: e.target.value }))}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick preview */}
              {splitType === "equal" && splitAmong.size > 0 && effectiveAmount > 0 && (
                <div className="text-xs text-muted-foreground bg-muted/20 px-4 py-3 rounded-xl">
                  <strong className="text-foreground">{fmt(effectiveAmount / splitAmong.size, currency)}</strong> por pessoa ({splitAmong.size} participante{splitAmong.size > 1 ? "s" : ""})
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("form")} className="rounded-xl border-accent/20 text-accent font-bold hover:bg-accent/5 hover:border-accent/35 transition-all duration-200">Voltar</Button>
                <Button onClick={goToPreview} className="flex-1 gap-2.5 rounded-xl bg-gradient-to-r from-accent to-accent/80 text-accent-foreground font-bold shadow-[0_0_16px_-4px_hsl(var(--accent)/0.35)] hover:shadow-[0_0_24px_-4px_hsl(var(--accent)/0.5)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200">
                  Ver Resultado <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ═══ STEP 3: PREVIEW ═══ */}
          {step === "preview" && (
            <motion.div key="preview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
              {/* Expense summary */}
              <div className="p-4 rounded-2xl bg-card border border-border/30 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{CATEGORIES.find(c => c.value === category)?.emoji || "🧾"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{description}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
                      {" · "}Pago por <strong>{getMemberName(paidBy)}</strong>
                    </p>
                  </div>
                  <p className="text-lg font-black tabular-nums text-foreground">{fmt(effectiveAmount, currency)}</p>
                </div>
              </div>

              {/* Split results */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-foreground">Resultado da divisão</p>
                {computedSplits.map(s => {
                  const isPayerSelf = s.member_id === paidBy;
                  return (
                    <motion.div
                      key={s.member_id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border/20 bg-card"
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0" style={{ backgroundColor: getMemberColor(s.member_id) }}>
                        {getMemberName(s.member_id)[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground">{getMemberName(s.member_id)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {isPayerSelf ? "Absorve a própria parte" : `Deve para ${getMemberName(paidBy)}`}
                        </p>
                      </div>
                      <p className={`text-sm font-black tabular-nums ${isPayerSelf ? "text-muted-foreground" : "text-destructive"}`}>
                        {fmt(s.amount, currency)}
                      </p>
                    </motion.div>
                  );
                })}
              </div>

              {/* Net summary for payer */}
              {payerNet > 0.01 && (
                <div className="p-3 rounded-xl bg-accent/[0.05] border border-accent/15 text-xs text-foreground">
                  <strong>{getMemberName(paidBy)}</strong> receberá <strong className="text-accent">{fmt(payerNet, currency)}</strong> de volta dos outros participantes
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep("split")} className="rounded-xl border-accent/20 text-accent font-bold hover:bg-accent/5 hover:border-accent/35 transition-all duration-200">
                  <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Editar
                </Button>
                <Button onClick={handleSave} disabled={loading} className="flex-1 gap-2.5 rounded-xl bg-gradient-to-r from-accent to-accent/80 text-accent-foreground font-bold h-12 text-sm shadow-[0_0_20px_-4px_hsl(var(--accent)/0.4)] hover:shadow-[0_0_30px_-4px_hsl(var(--accent)/0.55)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Confirmar Despesa
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

/* ═══ ADD MEMBER DIALOG ═══ */
function AddMemberDialog({ open, onClose, groupId, existingMembers, passengers, onSaved }: {
  open: boolean; onClose: () => void; groupId: string; existingMembers: Member[]; passengers?: any[]; onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("portal_expense_group_members" as any).insert({
      group_id: groupId,
      name: name.trim(),
      avatar_color: AVATAR_COLORS[existingMembers.length % AVATAR_COLORS.length],
    } as any);
    if (error) { toast.error("Erro ao adicionar"); setLoading(false); return; }
    toast.success(`${name} adicionado!`);
    setName(""); setLoading(false);
    onSaved();
  };

  const addPassenger = async (pax: any) => {
    const n = pax.full_name || `${pax.first_name || ""} ${pax.last_name || ""}`.trim();
    if (existingMembers.some(m => m.name.toLowerCase() === n.toLowerCase())) {
      toast.info(`${n} já está no grupo`);
      return;
    }
    const { error } = await supabase.from("portal_expense_group_members" as any).insert({
      group_id: groupId,
      name: n,
      avatar_color: AVATAR_COLORS[existingMembers.length % AVATAR_COLORS.length],
    } as any);
    if (error) { toast.error("Erro ao adicionar"); return; }
    toast.success(`${n} adicionado!`);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-accent" /> Adicionar Participante
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {passengers && passengers.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Da reserva</label>
              <div className="flex flex-wrap gap-2">
                {passengers.map((pax: any, i: number) => {
                  const n = pax.full_name || `${pax.first_name || ""} ${pax.last_name || ""}`.trim();
                  const alreadyIn = existingMembers.some(m => m.name.toLowerCase() === n.toLowerCase());
                  return (
                    <button
                      key={i}
                      onClick={() => !alreadyIn && addPassenger(pax)}
                      disabled={alreadyIn}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border-2 transition-all duration-200 ${
                        alreadyIn
                          ? "opacity-40 cursor-not-allowed border-border/15 bg-muted/10"
                          : "border-border/20 bg-card/50 backdrop-blur-sm hover:border-accent/35 hover:text-accent hover:bg-accent/5 hover:shadow-[0_0_10px_-4px_hsl(var(--accent)/0.2)]"
                      }`}
                    >
                      {n} {alreadyIn && <Check className="inline h-3 w-3 text-accent ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Ou digite o nome</label>
            <div className="flex gap-2">
              <Input placeholder="Nome" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()} />
              <Button onClick={handleAdd} disabled={loading || !name.trim()} className="shrink-0 rounded-xl bg-gradient-to-r from-accent to-accent/80 text-accent-foreground shadow-[0_0_12px_-4px_hsl(var(--accent)/0.3)] hover:shadow-[0_0_18px_-4px_hsl(var(--accent)/0.45)] hover:scale-[1.05] active:scale-[0.95] transition-all duration-200">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
