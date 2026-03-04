import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, CreditCard, ChevronDown, ChevronRight } from "lucide-react";

export default function GatewayPagamentos() {
  const qc = useQueryClient();
  const [showGatewayForm, setShowGatewayForm] = useState(false);
  const [showFeeForm, setShowFeeForm] = useState<string | null>(null);
  const [expandedGateway, setExpandedGateway] = useState<string | null>(null);
  const [gatewayName, setGatewayName] = useState("");
  const [feeForm, setFeeForm] = useState({ installments: "1", fee_percent: "", fee_fixed: "" });
  const [editingFee, setEditingFee] = useState<string | null>(null);
  const [editFeeForm, setEditFeeForm] = useState({ installments: "1", fee_percent: "", fee_fixed: "" });

  const { data: rules = [] } = useQuery({
    queryKey: ["gateway-fee-rules"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_fee_rules").select("*").order("acquirer").order("installments");
      return data || [];
    },
  });

  // Group rules by acquirer (gateway)
  const gateways = rules.reduce((acc: Record<string, any[]>, r: any) => {
    const key = r.acquirer || "Sem gateway";
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {} as Record<string, any[]>);

  const handleAddGateway = async () => {
    const name = gatewayName.trim();
    if (!name) { toast.error("Nome do gateway obrigatório"); return; }
    if (gateways[name]) { toast.error("Gateway já existe"); return; }
    // Create a default entry for 1x
    const { error } = await supabase.from("payment_fee_rules").insert({
      payment_method: "cartao_credito",
      installments: 1,
      fee_percent: 0,
      fee_fixed: 0,
      acquirer: name,
    });
    if (error) { toast.error("Erro ao criar gateway"); return; }
    toast.success("Gateway cadastrado!");
    qc.invalidateQueries({ queryKey: ["gateway-fee-rules"] });
    setShowGatewayForm(false);
    setGatewayName("");
    setExpandedGateway(name);
  };

  const handleAddFee = async (gateway: string) => {
    const inst = Number(feeForm.installments) || 1;
    const existing = (gateways[gateway] || []).find((r: any) => r.installments === inst);
    if (existing) { toast.error(`Parcela ${inst}x já cadastrada para este gateway`); return; }
    const { error } = await supabase.from("payment_fee_rules").insert({
      payment_method: "cartao_credito",
      installments: inst,
      fee_percent: Number(feeForm.fee_percent) || 0,
      fee_fixed: Number(feeForm.fee_fixed) || 0,
      acquirer: gateway,
    });
    if (error) { toast.error("Erro ao adicionar taxa"); return; }
    toast.success(`Taxa ${inst}x adicionada!`);
    qc.invalidateQueries({ queryKey: ["gateway-fee-rules"] });
    setShowFeeForm(null);
    setFeeForm({ installments: "1", fee_percent: "", fee_fixed: "" });
  };

  const handleDeleteFee = async (id: string) => {
    const { error } = await supabase.from("payment_fee_rules").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Taxa removida");
    qc.invalidateQueries({ queryKey: ["gateway-fee-rules"] });
  };

  const handleDeleteGateway = async (gateway: string) => {
    const ids = (gateways[gateway] || []).map((r: any) => r.id);
    if (ids.length === 0) return;
    const { error } = await supabase.from("payment_fee_rules").delete().in("id", ids);
    if (error) { toast.error("Erro ao excluir gateway"); return; }
    toast.success("Gateway removido");
    qc.invalidateQueries({ queryKey: ["gateway-fee-rules"] });
    if (expandedGateway === gateway) setExpandedGateway(null);
  };

  const startEditFee = (r: any) => {
    setEditingFee(r.id);
    setEditFeeForm({
      installments: String(r.installments),
      fee_percent: String(r.fee_percent || 0),
      fee_fixed: String(r.fee_fixed || 0),
    });
  };

  const saveEditFee = async (id: string) => {
    const { error } = await supabase.from("payment_fee_rules").update({
      installments: Number(editFeeForm.installments) || 1,
      fee_percent: Number(editFeeForm.fee_percent) || 0,
      fee_fixed: Number(editFeeForm.fee_fixed) || 0,
    }).eq("id", id);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Taxa atualizada");
    setEditingFee(null);
    qc.invalidateQueries({ queryKey: ["gateway-fee-rules"] });
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-display">Gateway de Pagamentos</h1>
          <p className="text-sm text-muted-foreground">Gerencie gateways e taxas por parcelamento</p>
        </div>
        <Button size="sm" onClick={() => setShowGatewayForm(true)}>
          <Plus className="w-4 h-4 mr-1" /> Novo Gateway
        </Button>
      </div>

      {Object.keys(gateways).length === 0 && (
        <Card className="glass-card p-8 text-center text-muted-foreground text-sm">
          Nenhum gateway cadastrado. Clique em "Novo Gateway" para começar.
        </Card>
      )}

      {Object.entries(gateways).map(([gateway, gatewayRules]) => (
        <Card key={gateway} className="glass-card overflow-hidden">
          <button
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
            onClick={() => setExpandedGateway(expandedGateway === gateway ? null : gateway)}
          >
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-primary" />
              <div>
                <span className="font-semibold text-sm">{gateway}</span>
                <Badge variant="secondary" className="ml-2 text-[10px]">
                  {gatewayRules.length} {gatewayRules.length === 1 ? "faixa" : "faixas"}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive h-7 px-2"
                onClick={(e) => { e.stopPropagation(); handleDeleteGateway(gateway); }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
              {expandedGateway === gateway ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </button>

          {expandedGateway === gateway && (
            <div className="border-t">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Parcelas</TableHead>
                    <TableHead className="text-xs text-right">Taxa %</TableHead>
                    <TableHead className="text-xs text-right">Taxa Fixa R$</TableHead>
                    <TableHead className="text-xs text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gatewayRules.sort((a: any, b: any) => a.installments - b.installments).map((r: any) => (
                    <TableRow key={r.id}>
                      {editingFee === r.id ? (
                        <>
                          <TableCell>
                            <Input type="number" className="h-7 w-16 text-xs" value={editFeeForm.installments}
                              onChange={(e) => setEditFeeForm({ ...editFeeForm, installments: e.target.value })} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input type="number" step="0.01" className="h-7 w-20 text-xs ml-auto" value={editFeeForm.fee_percent}
                              onChange={(e) => setEditFeeForm({ ...editFeeForm, fee_percent: e.target.value })} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Input type="number" step="0.01" className="h-7 w-20 text-xs ml-auto" value={editFeeForm.fee_fixed}
                              onChange={(e) => setEditFeeForm({ ...editFeeForm, fee_fixed: e.target.value })} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => saveEditFee(r.id)}>✓</Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingFee(null)}>✕</Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="text-xs font-mono">{r.installments}x</TableCell>
                          <TableCell className="text-xs text-right font-mono">{r.fee_percent}%</TableCell>
                          <TableCell className="text-xs text-right font-mono">R$ {(r.fee_fixed || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => startEditFee(r)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => handleDeleteFee(r.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-3 border-t">
                <Button size="sm" variant="outline" className="text-xs" onClick={() => {
                  setShowFeeForm(gateway);
                  const maxInst = Math.max(0, ...gatewayRules.map((r: any) => r.installments));
                  setFeeForm({ installments: String(maxInst + 1), fee_percent: "", fee_fixed: "" });
                }}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Parcela
                </Button>
              </div>
            </div>
          )}
        </Card>
      ))}

      {/* New Gateway Dialog */}
      <Dialog open={showGatewayForm} onOpenChange={setShowGatewayForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Gateway de Pagamento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Nome do Gateway *</Label>
              <Input value={gatewayName} onChange={(e) => setGatewayName(e.target.value)} placeholder="Ex: Stone, Cielo, PagSeguro" />
            </div>
            <Button onClick={handleAddGateway} className="w-full">Cadastrar Gateway</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Fee Dialog */}
      <Dialog open={!!showFeeForm} onOpenChange={() => setShowFeeForm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar Taxa — {showFeeForm}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Parcelas</Label><Input type="number" value={feeForm.installments} onChange={(e) => setFeeForm({ ...feeForm, installments: e.target.value })} /></div>
            <div><Label className="text-xs">Taxa %</Label><Input type="number" step="0.01" value={feeForm.fee_percent} onChange={(e) => setFeeForm({ ...feeForm, fee_percent: e.target.value })} placeholder="Ex: 3.49" /></div>
            <div><Label className="text-xs">Taxa Fixa R$</Label><Input type="number" step="0.01" value={feeForm.fee_fixed} onChange={(e) => setFeeForm({ ...feeForm, fee_fixed: e.target.value })} placeholder="Ex: 0.50" /></div>
            <Button onClick={() => showFeeForm && handleAddFee(showFeeForm)} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
