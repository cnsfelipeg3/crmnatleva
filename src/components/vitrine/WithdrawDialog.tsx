import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  KeyRound,
  ShieldCheck,
  Loader2,
  Clock3,
  User2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Receipt,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const pixTypeLabel: Record<string, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "E-mail",
  phone: "Celular",
  random: "Chave aleatória",
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  affiliateId: string;
  available: number;
  pixKey: string;
  pixKeyType: "cpf" | "cnpj" | "email" | "phone" | "random";
  holderName?: string | null;
};

export default function WithdrawDialog({
  open,
  onOpenChange,
  affiliateId,
  available,
  pixKey,
  pixKeyType,
  holderName,
}: Props) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [partial, setPartial] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [showList, setShowList] = useState(false);
  const [success, setSuccess] = useState(false);

  // Fetch commissions that compose the available balance
  const { data: availableItems = [] } = useQuery({
    queryKey: ["affiliate-available-commissions", affiliateId],
    enabled: !!affiliateId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_commissions")
        .select(
          "id, commission_value, sale_value, created_at, product:experience_products(title, destination)"
        )
        .eq("affiliate_id", affiliateId)
        .eq("status", "available")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const parsedAmount = Number((amount || "").replace(",", "."));
  const customValue = isFinite(parsedAmount) ? parsedAmount : 0;
  const valueToWithdraw = partial ? customValue : available;
  const isValid = valueToWithdraw > 0 && valueToWithdraw <= available;

  const reset = () => {
    setAmount("");
    setPartial(false);
    setShowList(false);
    setSuccess(false);
  };

  const handleConfirm = async () => {
    if (!isValid) return;
    setLoading(true);
    const { error } = await supabase.from("affiliate_payouts").insert({
      affiliate_id: affiliateId,
      amount: valueToWithdraw,
      pix_key: pixKey,
      pix_key_type: pixKeyType,
      status: "requested",
    });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível solicitar o saque: " + error.message);
      return;
    }
    setSuccess(true);
    qc.invalidateQueries({ queryKey: ["affiliate-payouts"] });
    qc.invalidateQueries({ queryKey: ["affiliate-stats"] });
  };

  const handleClose = (v: boolean) => {
    if (loading) return;
    if (!v) reset();
    onOpenChange(v);
  };

  // ===== Success view =====
  if (success) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="py-4 text-center space-y-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 grid place-items-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-700" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-2xl">Saque solicitado!</h3>
              <p className="text-sm text-muted-foreground">
                {fmtBRL(valueToWithdraw)} a caminho da sua chave PIX.
              </p>
            </div>
            <div className="rounded-lg border bg-emerald-50/60 border-emerald-200 p-3 text-left space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-emerald-800 font-medium">
                <Clock3 className="h-3.5 w-3.5" /> Prazo de pagamento
              </div>
              <p className="text-emerald-900/80">
                A equipe NatLeva libera o PIX em até <strong>72 horas úteis</strong>. Você acompanha o
                status aqui na aba Comissões.
              </p>
            </div>
            <Button
              onClick={() => handleClose(false)}
              className="w-full bg-emerald-700 hover:bg-emerald-800"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-xl">
            <Wallet className="h-5 w-5 text-emerald-700" /> Solicitar saque
          </DialogTitle>
          <DialogDescription className="text-xs">
            Revise os dados abaixo e confirme. O valor será transferido pra sua chave PIX cadastrada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Valor total disponível */}
          <div
            className="rounded-xl p-4 text-white"
            style={{
              background:
                "radial-gradient(120% 120% at 0% 0%, #1a5a3f 0%, #0d3a28 60%, #051f15 100%)",
            }}
          >
            <p className="text-[10px] uppercase tracking-wider text-white/60">Saldo disponível</p>
            <div className="font-serif text-3xl mt-0.5">{fmtBRL(available)}</div>
            <p className="text-[11px] text-white/70 mt-1">
              {availableItems.length} comissão(ões) liberada(s) pra saque
            </p>
          </div>

          {/* Comissões inclusas */}
          {availableItems.length > 0 && (
            <div className="rounded-lg border bg-muted/20">
              <button
                type="button"
                onClick={() => setShowList((v) => !v)}
                className="w-full flex items-center justify-between p-3 text-xs hover:bg-muted/40 transition-colors"
              >
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Receipt className="h-3.5 w-3.5" />
                  Comissões inclusas neste saque
                </span>
                {showList ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
              {showList && (
                <div className="border-t divide-y max-h-48 overflow-y-auto">
                  {availableItems.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between p-2.5 text-xs">
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {c.product?.title || "Pacote"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {c.product?.destination || ""} ·{" "}
                          {new Date(c.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <span className="font-semibold text-emerald-700 shrink-0 ml-2">
                        {fmtBRL(Number(c.commission_value || 0))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Dados de destino */}
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Conta de destino
            </p>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <User2 className="h-3.5 w-3.5" /> Titular
              </span>
              <span className="font-medium">{holderName || "—"}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <KeyRound className="h-3.5 w-3.5" /> Tipo de chave
              </span>
              <Badge variant="outline" className="text-[10px]">
                {pixTypeLabel[pixKeyType] || pixKeyType.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="text-muted-foreground shrink-0">Chave PIX</span>
              <span className="font-mono text-[11px] truncate" title={pixKey}>
                {pixKey}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground pt-1 border-t">
              O PIX é roteado automaticamente pro banco vinculado à chave. Confira se os dados estão
              corretos antes de confirmar.
            </p>
          </div>

          {/* Saque parcial (opcional) */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={partial}
                onChange={(e) => setPartial(e.target.checked)}
                className="accent-emerald-700"
              />
              Sacar valor parcial
            </label>
            {partial && (
              <div>
                <Label htmlFor="payout-amount" className="text-[11px] text-muted-foreground">
                  Valor a sacar (máx. {fmtBRL(available)})
                </Label>
                <Input
                  id="payout-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
                  className="mt-1 h-9"
                />
                {!!amount && !isValid && (
                  <p className="text-[11px] text-rose-600 mt-1">
                    {customValue <= 0
                      ? "Informe um valor maior que zero."
                      : "Valor acima do saldo disponível."}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Prazo */}
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-900">
            <Clock3 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <div>
              <strong>Prazo: até 72h úteis</strong> · A equipe NatLeva processa o pagamento e o
              valor cai direto na sua chave PIX. Você acompanha o status aqui na aba Comissões.
            </div>
          </div>

          <div className="flex items-start gap-2 text-[10px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3 mt-0.5 shrink-0 text-emerald-700" />
            <span>
              Transação registrada e auditada. Em caso de divergência, fale com o time NatLeva
              antes de processar.
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || loading}
            className="bg-emerald-700 hover:bg-emerald-800 gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4" />
                Solicitar {fmtBRL(valueToWithdraw)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
