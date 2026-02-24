import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Users } from "lucide-react";
import { fetchAllRows } from "@/lib/fetchAll";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Comissoes() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ seller_id: "", product_type: "", commission_type: "percentual", commission_value: "" });

  const { data: rules = [] } = useQuery({
    queryKey: ["commission-rules"],
    queryFn: async () => {
      const { data } = await supabase.from("commission_rules").select("*").order("created_at");
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["com-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name");
      return data || [];
    },
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["com-sales"],
    queryFn: async () => {
      const data = await fetchAllRows("sales", "id, seller_id, received_value, total_cost, products");
      return data || [];
    },
  });

  // Calculate commissions per seller
  const commissionSummary = useMemo(() => {
    const map: Record<string, { name: string; receita: number; comissao: number }> = {};
    sales.forEach((s: any) => {
      const sid = s.seller_id;
      if (!sid) return;
      const profile = profiles.find((p: any) => p.id === sid);
      if (!map[sid]) map[sid] = { name: profile?.full_name || sid, receita: 0, comissao: 0 };
      map[sid].receita += s.received_value || 0;

      // Find applicable rule
      const rule = rules.find((r: any) => r.seller_id === sid && r.is_active) || rules.find((r: any) => !r.seller_id && r.is_active);
      if (rule) {
        if (rule.commission_type === 'percentual') map[sid].comissao += ((s.received_value || 0) * rule.commission_value) / 100;
        else if (rule.commission_type === 'fixa') map[sid].comissao += rule.commission_value;
        else if (rule.commission_type === 'margem') {
          const lucro = (s.received_value || 0) - (s.total_cost || 0);
          map[sid].comissao += (lucro * rule.commission_value) / 100;
        }
      }
    });
    return Object.values(map).sort((a, b) => b.comissao - a.comissao);
  }, [sales, rules, profiles]);

  const handleSave = async () => {
    const { error } = await supabase.from("commission_rules").insert({
      seller_id: form.seller_id || null,
      product_type: form.product_type || null,
      commission_type: form.commission_type,
      commission_value: Number(form.commission_value) || 0,
    });
    if (error) { toast.error("Erro"); return; }
    toast.success("Regra criada!");
    qc.invalidateQueries({ queryKey: ["commission-rules"] });
    setShowForm(false);
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-display">Comissões</h1>
          <p className="text-sm text-muted-foreground">Regras e cálculo automático</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> Nova Regra</Button>
      </div>

      {/* Rules */}
      <Card className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border"><h3 className="text-sm font-semibold">Regras Configuradas</h3></div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Vendedor</TableHead>
              <TableHead className="text-xs">Produto</TableHead>
              <TableHead className="text-xs">Tipo</TableHead>
              <TableHead className="text-xs text-right">Valor</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((r: any) => {
              const seller = profiles.find((p: any) => p.id === r.seller_id);
              return (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{seller?.full_name || 'Todos'}</TableCell>
                  <TableCell className="text-xs">{r.product_type || 'Todos'}</TableCell>
                  <TableCell className="text-xs capitalize">{r.commission_type}</TableCell>
                  <TableCell className="text-xs text-right font-mono">
                    {r.commission_type === 'fixa' ? fmt(r.commission_value) : `${r.commission_value}%`}
                  </TableCell>
                  <TableCell className="text-xs">{r.is_active ? '✅ Ativa' : '❌ Inativa'}</TableCell>
                </TableRow>
              );
            })}
            {rules.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-sm">Nenhuma regra</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>

      {/* Summary */}
      {commissionSummary.length > 0 && (
        <Card className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border"><h3 className="text-sm font-semibold">Comissões Calculadas</h3></div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Vendedor</TableHead>
                <TableHead className="text-xs text-right">Receita</TableHead>
                <TableHead className="text-xs text-right">Comissão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissionSummary.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs flex items-center gap-2"><Users className="w-4 h-4 text-muted-foreground" /> {s.name}</TableCell>
                  <TableCell className="text-xs text-right">{fmt(s.receita)}</TableCell>
                  <TableCell className="text-xs text-right font-semibold text-emerald-500">{fmt(s.comissao)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Regra de Comissão</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Vendedor (vazio = todos)</Label>
              <Select value={form.seller_id || "__all__"} onValueChange={(v) => setForm({ ...form, seller_id: v === "__all__" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {profiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={form.commission_type} onValueChange={(v) => setForm({ ...form, commission_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentual">Percentual sobre receita</SelectItem>
                  <SelectItem value="fixa">Valor fixo por venda</SelectItem>
                  <SelectItem value="margem">Percentual sobre margem</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Valor ({form.commission_type === 'fixa' ? 'R$' : '%'})</Label>
              <Input type="number" value={form.commission_value} onChange={(e) => setForm({ ...form, commission_value: e.target.value })} />
            </div>
            <Button onClick={handleSave} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
