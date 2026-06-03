import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, KeyRound, ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  affiliateId: string;
  available: number;
  pixKey: string;
  pixKeyType: "cpf" | "cnpj" | "email" | "phone" | "random";
};

export default function WithdrawDialog({
  open, onOpenChange, affiliateId, available, pixKey, pixKeyType,
}: Props) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const parsed = Number((amount || "").replace(",", "."));
  const value = isFinite(parsed) ? parsed : 0;
  const isValid = value > 0 && value <= available;

  const handleConfirm = async () => {
    if (!isValid) return;
    setLoading(true);
    const { error } = await supabase.from("affiliate_payouts").insert({
      affiliate_id: affiliateId,
      amount: value,
      pix_key: pixKey,
      pix_key_type: pixKeyType,
      status: "requested",
    });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível solicitar o saque: " + error.message);
      return;
    }
    toast.success(`Solicitação de ${fmtBRL(value)} enviada · cai no seu PIX em até 1 dia útil.`);
    qc.invalidateQueries({ queryKey: ["affiliate-payouts"] });
    qc.invalidateQueries({ queryKey: ["affiliate-stats"] });
    onOpenChange(false);
    setAmount("");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-700" /> Receber via PIX
          </AlertDialogTitle>
          <AlertDialogDescription>
            Confirme o valor que você quer transferir agora pra sua chave PIX cadastrada.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Saldo disponível</span>
              <span className="font-semibold text-emerald-700">{fmtBRL(available)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <KeyRound className="h-3 w-3" /> Chave PIX ({pixKeyType.toUpperCase()})
              </span>
              <span className="font-mono text-[11px] truncate max-w-[200px]" title={pixKey}>{pixKey}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payout-amount" className="text-xs">Valor a sacar (R$)</Label>
            <div className="flex gap-2">
              <Input
                id="payout-amount"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ""))}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAmount(available.toFixed(2).replace(".", ","))}
              >
                Tudo
              </Button>
            </div>
            {!!amount && !isValid && (
              <p className="text-[11px] text-rose-600">
                {value <= 0 ? "Informe um valor maior que zero." : "Valor acima do saldo disponível."}
              </p>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-md bg-emerald-50 border border-emerald-200 p-2.5 text-[11px] text-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>O pagamento é processado pela equipe NatLeva em até 1 dia útil. Você acompanha o status na aba Comissões.</span>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            asChild
            disabled={!isValid || loading}
          >
            <Button onClick={handleConfirm} disabled={!isValid || loading} className="bg-emerald-700 hover:bg-emerald-800">
              {loading ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Enviando...</> : `Solicitar ${value > 0 ? fmtBRL(value) : "saque"}`}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
