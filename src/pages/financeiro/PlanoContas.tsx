import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, FolderTree, TrendingUp, TrendingDown } from "lucide-react";

export default function PlanoContas() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "receita", code: "" });

  const { data: accounts = [] } = useQuery({
    queryKey: ["chart-of-accounts"],
    queryFn: async () => {
      const { data } = await supabase.from("chart_of_accounts").select("*").order("code");
      return data || [];
    },
  });

  const receitas = accounts.filter((a: any) => a.type === 'receita');
  const despesas = accounts.filter((a: any) => a.type === 'despesa');

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome obrigatório"); return; }
    const { error } = await supabase.from("chart_of_accounts").insert(form);
    if (error) { toast.error("Erro"); return; }
    toast.success("Categoria criada!");
    qc.invalidateQueries({ queryKey: ["chart-of-accounts"] });
    setShowForm(false);
    setForm({ name: "", type: "receita", code: "" });
  };

  const AccountList = ({ items, title, icon: Icon, color }: { items: any[]; title: string; icon: any; color: string }) => (
    <Card className="glass-card p-5">
      <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${color}`}>
        <Icon className="w-4 h-4" /> {title}
      </h3>
      <div className="space-y-1">
        {items.map((a: any) => (
          <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground">{a.code}</span>
              <span className="text-sm">{a.name}</span>
            </div>
            <span className={`text-[10px] ${a.is_active ? 'text-emerald-500' : 'text-muted-foreground'}`}>
              {a.is_active ? 'Ativa' : 'Inativa'}
            </span>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma categoria</p>}
      </div>
    </Card>
  );

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-display">Plano de Contas</h1>
          <p className="text-sm text-muted-foreground">Categorias de receitas e despesas</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" /> Nova Categoria</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AccountList items={receitas} title="Receitas" icon={TrendingUp} color="text-emerald-500" />
        <AccountList items={despesas} title="Despesas" icon={TrendingDown} color="text-red-400" />
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Categoria</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Código</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Ex: R08" /></div>
            <Button onClick={handleSave} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
