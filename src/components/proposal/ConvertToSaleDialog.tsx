import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart, ExternalLink, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { convertProposalToSale } from "@/lib/proposalToSaleBridge";

interface Props {
  open: boolean;
  onClose: () => void;
  proposalId: string;
  proposalTitle?: string | null;
  existingSaleId?: string | null;
}

export function ConvertToSaleDialog({
  open, onClose, proposalId, proposalTitle, existingSaleId,
}: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const alreadyLinked = !!existingSaleId;

  const handleConvert = async () => {
    if (alreadyLinked && existingSaleId) {
      navigate(`/sales/${existingSaleId}/edit`);
      onClose();
      return;
    }
    setLoading(true);
    try {
      const result = await convertProposalToSale(proposalId);
      if (result.already_existed) {
        toast.info("Esta proposta já tinha uma venda · abrindo a existente");
      } else {
        toast.success("Rascunho de venda criado · complete os dados pendentes");
      }
      navigate(`/sales/${result.sale_id}/edit`);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao converter proposta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !loading && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {alreadyLinked ? (
              <><ExternalLink className="w-5 h-5 text-accent" /> Abrir venda vinculada</>
            ) : (
              <><ShoppingCart className="w-5 h-5 text-accent" /> Converter em Venda</>
            )}
          </DialogTitle>
          <DialogDescription>
            {alreadyLinked
              ? "Esta proposta já gerou uma venda. Vamos abrir o rascunho existente para você continuar de onde parou."
              : "Vamos criar um rascunho de venda com base nesta proposta. Você revisa, completa o que faltar (fornecedor, localizadores, custo real, forma de pagamento) e só depois marca como concluída."}
          </DialogDescription>
        </DialogHeader>

        {!alreadyLinked && (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">O que será copiado:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Cliente, destino, datas e passageiros</li>
              <li>Voos (trecho a trecho) e hospedagem</li>
              <li>Valor da proposta como receita provisória</li>
              <li>Serviços extras (transfer, seguro, experiências)</li>
            </ul>
            <p className="pt-2 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
              <span>Custos entram zerados · você lança o custo real do fornecedor depois.</span>
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConvert} disabled={loading} className="gap-1.5">
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Convertendo...</>
            ) : alreadyLinked ? (
              <><ExternalLink className="w-4 h-4" /> Abrir venda</>
            ) : (
              <><ShoppingCart className="w-4 h-4" /> Criar rascunho</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
