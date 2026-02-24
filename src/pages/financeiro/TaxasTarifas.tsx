import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Percent } from "lucide-react";

export default function TaxasTarifas() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ payment_method: "", installments: "1", fee_percent: "", fee_fixed: "", acquirer: "" });

  const { data: rules = [] } = useQuery({
    queryKey: ["payment-fee-rules"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_fee_rules").select("*").order("payment_method");
      return data || [];
    },
  });

  const handleSave = async () => {
    if (!form.payment_method.trim()) { toast.error("Meio obrigatório"); return; }
    const { error } = await supabase.from("payment_fee_rules").insert({
      payment_method: form.payment_method,
      installments: Number(form.installments) || 1,
      fee_percent: Number(form.fee_percent) || 0,
      fee_fixed: Number(form.fee_fixed) || 0,
      acquirer: form.acquirer || null,
    });
    if (error) { toast.error("Erro"); return; }
    toast.success("Taxa cadastrada!");
    qc.invalidateQueries({ queryKey: ["payment-fee-rules"] });
    setShowForm(false);
    setForm({ payment_method: "", installments: "1", fee_percent: "", fee_fixed: "", acquirer: "" });
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-display">Taxas & Tarifas</h1>
          <p className="text-sm text-muted-foreground">Configuração de taxas por meio de pagamento</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> Nova Taxa</Button>
      </div>

      <Card className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Meio</TableHead>
              <TableHead className="text-xs">Parcelas</TableHead>
              <TableHead className="text-xs text-right">Taxa %</TableHead>
              <TableHead className="text-xs text-right">Taxa Fixa</TableHead>
              <TableHead className="text-xs">Adquirente</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs flex items-center gap-2"><Percent className="w-4 h-4 text-muted-foreground" /> {r.payment_method}</TableCell>
                <TableCell className="text-xs font-mono">{r.installments}x</TableCell>
                <TableCell className="text-xs text-right font-mono">{r.fee_percent}%</TableCell>
                <TableCell className="text-xs text-right font-mono">R$ {r.fee_fixed?.toFixed(2) || '0.00'}</TableCell>
                <TableCell className="text-xs">{r.acquirer || '-'}</TableCell>
                <TableCell className="text-xs">{r.is_active ? '✅' : '❌'}</TableCell>
              </TableRow>
            ))}
            {rules.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6 text-sm">Nenhuma taxa configurada</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Taxa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Meio de Pagamento *</Label><Input value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} placeholder="Ex: Cartão de crédito" /></div>
            <div><Label className="text-xs">Parcelas</Label><Input type="number" value={form.installments} onChange={(e) => setForm({ ...form, installments: e.target.value })} /></div>
            <div><Label className="text-xs">Taxa %</Label><Input type="number" step="0.01" value={form.fee_percent} onChange={(e) => setForm({ ...form, fee_percent: e.target.value })} /></div>
            <div><Label className="text-xs">Taxa Fixa R$</Label><Input type="number" step="0.01" value={form.fee_fixed} onChange={(e) => setForm({ ...form, fee_fixed: e.target.value })} /></div>
            <div><Label className="text-xs">Adquirente</Label><Input value={form.acquirer} onChange={(e) => setForm({ ...form, acquirer: e.target.value })} placeholder="Ex: Stone, Cielo" /></div>
            <Button onClick={handleSave} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
