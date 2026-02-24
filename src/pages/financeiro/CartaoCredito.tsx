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
import { Plus, CreditCard as CreditCardIcon } from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CartaoCredito() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nickname: "", bank: "", last_digits: "", credit_limit: "", closing_day: "1", due_day: "10", responsible: "" });

  const { data: cards = [] } = useQuery({
    queryKey: ["credit-cards"],
    queryFn: async () => {
      const { data } = await supabase.from("credit_cards").select("*").order("nickname");
      return data || [];
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["credit-card-items"],
    queryFn: async () => {
      const { data } = await supabase.from("credit_card_items").select("*").order("transaction_date", { ascending: false });
      return data || [];
    },
  });

  const handleSave = async () => {
    if (!form.nickname.trim()) { toast.error("Apelido obrigatório"); return; }
    const { error } = await supabase.from("credit_cards").insert({
      nickname: form.nickname, bank: form.bank, last_digits: form.last_digits,
      credit_limit: Number(form.credit_limit) || 0, closing_day: Number(form.closing_day) || 1,
      due_day: Number(form.due_day) || 10, responsible: form.responsible,
    });
    if (error) { toast.error("Erro"); return; }
    toast.success("Cartão cadastrado!");
    qc.invalidateQueries({ queryKey: ["credit-cards"] });
    setShowForm(false);
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-display">Cartões de Crédito</h1>
          <p className="text-sm text-muted-foreground">{cards.length} cartões cadastrados</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> Novo Cartão</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card: any) => {
          const cardItems = items.filter((i: any) => i.credit_card_id === card.id);
          const openItems = cardItems.filter((i: any) => i.status === 'aberto');
          const totalOpen = openItems.reduce((s: number, i: any) => s + (i.value || 0), 0);
          const used = totalOpen;
          const limit = card.credit_limit || 0;
          const usedPct = limit > 0 ? (used / limit) * 100 : 0;

          return (
            <Card key={card.id} className="p-5 glass-card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <CreditCardIcon className="w-4 h-4 text-primary" /> {card.nickname}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">{card.bank} •••• {card.last_digits}</p>
                </div>
                <span className={`text-xs font-mono px-2 py-0.5 rounded ${usedPct > 80 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {usedPct.toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 mb-3">
                <div className={`h-2 rounded-full transition-all ${usedPct > 80 ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${Math.min(usedPct, 100)}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Limite:</span> {fmt(limit)}</div>
                <div><span className="text-muted-foreground">Usado:</span> {fmt(used)}</div>
                <div><span className="text-muted-foreground">Fechamento:</span> dia {card.closing_day}</div>
                <div><span className="text-muted-foreground">Vencimento:</span> dia {card.due_day}</div>
                <div><span className="text-muted-foreground">Lançamentos:</span> {openItems.length}</div>
                <div><span className="text-muted-foreground">Responsável:</span> {card.responsible || '-'}</div>
              </div>
            </Card>
          );
        })}
        {cards.length === 0 && (
          <Card className="p-8 glass-card col-span-full text-center text-muted-foreground">
            Nenhum cartão cadastrado
          </Card>
        )}
      </div>

      {items.length > 0 && (
        <Card className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold">Últimos Lançamentos</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Cartão</TableHead>
                  <TableHead className="text-xs">Descrição</TableHead>
                  <TableHead className="text-xs">Parcela</TableHead>
                  <TableHead className="text-xs text-right">Valor</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.slice(0, 50).map((item: any) => {
                  const card = cards.find((c: any) => c.id === item.credit_card_id);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs">{new Date(item.transaction_date + "T00:00:00").toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-xs">{card?.nickname || '-'}</TableCell>
                      <TableCell className="text-xs">{item.description || '-'}</TableCell>
                      <TableCell className="text-xs font-mono">{item.installment_number}/{item.installment_total}</TableCell>
                      <TableCell className="text-xs text-right font-semibold">{fmt(item.value || 0)}</TableCell>
                      <TableCell className="text-xs">{item.status}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Cartão</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {[
              { key: "nickname", label: "Apelido *", placeholder: "Ex: Itaú PJ" },
              { key: "bank", label: "Banco" },
              { key: "last_digits", label: "Últimos 4 dígitos" },
              { key: "credit_limit", label: "Limite", type: "number" },
              { key: "closing_day", label: "Dia fechamento", type: "number" },
              { key: "due_day", label: "Dia vencimento", type: "number" },
              { key: "responsible", label: "Responsável" },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <Label className="text-xs">{label}</Label>
                <Input type={type || "text"} placeholder={placeholder} value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
            <Button onClick={handleSave} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
