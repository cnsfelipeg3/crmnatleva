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
    const { data } = await supabase
      .from("portal_expense_groups" as any)
      .select("*")
      .eq("sale_id", saleId)
      .eq("client_id", clientId!)
      .order("created_at", { ascending: false });
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
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                selectedGroup?.id === g.id
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "bg-muted/30 text-muted-foreground border border-border/30 hover:bg-muted/50"
              }`}
            >
              {g.name}
            </button>
          ))}
          <button onClick={() => setCreateGroupOpen(true)} className="px-3 py-2 rounded-xl border border-dashed border-border/40 text-muted-foreground hover:border-accent/30 hover:text-accent transition-all">
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
              <button onClick={() => setAddMemberOpen(true)} className="flex items-center gap-1 text-xs text-accent font-semibold hover:underline">
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
                        variant="outline"
                        className="gap-1 text-xs rounded-xl border-accent/20 text-accent hover:bg-accent/10"
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
            <Button onClick={() => setAddExpenseOpen(true)} className="flex-1 sm:flex-none gap-2 rounded-xl">
              <Plus className="h-4 w-4" /> Adicionar Despesa
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
      <Button onClick={onCreateGroup} size="lg" className="gap-2 rounded-xl">
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

    const { data: group, error } = await supabase
      .from("portal_expense_groups" as any)
      .insert({ sale_id: saleId, client_id: clientId, name: name.trim(), currency } as any)
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
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        selected
                          ? "bg-accent/10 border-accent/30 text-accent"
                          : "bg-muted/20 border-border/30 text-muted-foreground hover:border-accent/20"
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent text-[10px] font-black">
                        {n[0]?.toUpperCase()}
                      </div>
                      {n}
                      {selected && <Check className="h-3 w-3" />}
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
            <Button variant="outline" size="sm" className="gap-1 text-xs rounded-xl" onClick={addMemberField}>
              <Plus className="h-3 w-3" /> Adicionar nome
            </Button>
          </div>

          <Button onClick={handleCreate} disabled={loading} className="w-full gap-2 rounded-xl">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Criar Grupo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══ ADD EXPENSE DIALOG ═══ */
function AddExpenseDialog({ open, onClose, group, members, onSaved }: {
  open: boolean; onClose: () => void; group: Group | null; members: Member[]; onSaved: () => void;
}) {
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

  useEffect(() => {
    if (open && members.length > 0) {
      setPaidBy(members[0].id);
      setSplitAmong(new Set(members.map(m => m.id)));
      setCurrency(group?.currency || "BRL");
    }
  }, [open, members, group]);

  const toggleSplitMember = (id: string) => {
    setSplitAmong(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Receipt scanner
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

  const handleSave = async () => {
    if (!description.trim() || !amount || !paidBy || !group) { toast.error("Preencha todos os campos"); return; }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) { toast.error("Valor inválido"); return; }
    if (splitAmong.size === 0) { toast.error("Selecione pelo menos 1 participante para dividir"); return; }
    setLoading(true);

    const { data: expense, error } = await supabase
      .from("portal_group_expenses" as any)
      .insert({
        group_id: group.id,
        description: description.trim(),
        amount: amountNum,
        currency,
        category,
        paid_by_member_id: paidBy,
        split_type: splitType,
        expense_date: date,
        notes: notes || null,
      } as any)
      .select().single();

    if (error || !expense) { toast.error("Erro ao salvar despesa"); setLoading(false); return; }

    // Create splits
    const splitMembers = Array.from(splitAmong);
    let splitsToInsert: any[] = [];

    if (splitType === "equal") {
      const perPerson = Math.round((amountNum / splitMembers.length) * 100) / 100;
      splitsToInsert = splitMembers.map(mid => ({
        expense_id: (expense as any).id,
        member_id: mid,
        amount: perPerson,
      }));
    } else if (splitType === "custom") {
      splitsToInsert = splitMembers.map(mid => ({
        expense_id: (expense as any).id,
        member_id: mid,
        amount: parseFloat(customAmounts[mid] || "0"),
      }));
    } else if (splitType === "percentage") {
      splitsToInsert = splitMembers.map(mid => {
        const pct = parseFloat(customAmounts[mid] || "0");
        return {
          expense_id: (expense as any).id,
          member_id: mid,
          amount: Math.round((amountNum * pct / 100) * 100) / 100,
        };
      });
    }

    await supabase.from("portal_expense_splits" as any).insert(splitsToInsert as any);
    toast.success("Despesa registrada!");
    setLoading(false);
    setDescription(""); setAmount(""); setCategory("outros"); setNotes("");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-accent" /> Adicionar Despesa
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Receipt scanner */}
          <div className="relative">
            <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-accent/20 bg-accent/[0.03] text-accent text-sm font-semibold cursor-pointer hover:bg-accent/[0.06] transition-all">
              {scanning ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processando recibo...</>
              ) : (
                <><Camera className="h-4 w-4" /> Escanear Recibo com IA</>
              )}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleReceiptScan} disabled={scanning} />
            </label>
          </div>

          <Input placeholder="Descrição (ex: Jantar no restaurante)" value={description} onChange={e => setDescription(e.target.value)} />

          <div className="grid grid-cols-2 gap-3">
            <Input type="number" step="0.01" placeholder="Valor" value={amount} onChange={e => setAmount(e.target.value)} />
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Categoria</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.emoji} {c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Data</label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-foreground">Quem pagou</label>
            <div className="flex flex-wrap gap-2">
              {members.map(m => (
                <button
                  key={m.id}
                  onClick={() => setPaidBy(m.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    paidBy === m.id
                      ? "bg-accent/10 border-accent/30 text-accent"
                      : "bg-muted/20 border-border/30 text-muted-foreground hover:border-accent/20"
                  }`}
                >
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-black" style={{ backgroundColor: m.avatar_color }}>
                    {m.name[0]?.toUpperCase()}
                  </div>
                  {m.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Tipo de divisão</label>
            <div className="flex gap-2">
              {[
                { v: "equal", l: "Igual" },
                { v: "custom", l: "Por valor" },
                { v: "percentage", l: "Por %" },
              ].map(t => (
                <button
                  key={t.v}
                  onClick={() => setSplitType(t.v)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    splitType === t.v
                      ? "bg-accent/10 border-accent/30 text-accent"
                      : "bg-muted/20 border-border/30 text-muted-foreground"
                  }`}
                >
                  {t.l}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Dividir entre</label>
            <div className="space-y-1.5">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-3">
                  <button
                    onClick={() => toggleSplitMember(m.id)}
                    className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      splitAmong.has(m.id)
                        ? "bg-accent/10 border-accent/30 text-accent"
                        : "bg-muted/20 border-border/30 text-muted-foreground"
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-black" style={{ backgroundColor: m.avatar_color }}>
                      {m.name[0]?.toUpperCase()}
                    </div>
                    {m.name}
                    {splitAmong.has(m.id) && <Check className="h-3 w-3 ml-auto" />}
                  </button>
                  {splitType !== "equal" && splitAmong.has(m.id) && (
                    <Input
                      type="number"
                      step="0.01"
                      placeholder={splitType === "percentage" ? "%" : "Valor"}
                      className="w-24"
                      value={customAmounts[m.id] || ""}
                      onChange={e => setCustomAmounts(prev => ({ ...prev, [m.id]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>
            {splitType === "equal" && amount && splitAmong.size > 0 && (
              <p className="text-xs text-muted-foreground bg-muted/20 px-3 py-2 rounded-xl">
                {fmt(parseFloat(amount) / splitAmong.size, currency)} por pessoa
              </p>
            )}
          </div>

          <Textarea placeholder="Observações (opcional)" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />

          <Button onClick={handleSave} disabled={loading} className="w-full gap-2 rounded-xl">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Salvar Despesa
          </Button>
        </div>
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
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        alreadyIn ? "opacity-40 cursor-not-allowed border-border/20" : "border-border/30 hover:border-accent/30 hover:text-accent"
                      }`}
                    >
                      {n} {alreadyIn && "✓"}
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
              <Button onClick={handleAdd} disabled={loading || !name.trim()} className="shrink-0 rounded-xl">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
