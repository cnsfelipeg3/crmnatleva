import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  saleId: string;
  saleLabel?: string;
  variant?: "icon" | "full";
  onDeleted?: (saleId: string) => void;
}

/**
 * Botão de exclusão (soft delete) de uma venda/viagem.
 * Visível APENAS para administradores (presidentes).
 */
export default function DeleteSaleButton({ saleId, saleLabel, variant = "icon", onDeleted }: Props) {
  const { role, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (role !== "admin") return null;

  const handleDelete = async () => {
    setLoading(true);
    const { error } = await (supabase as any).rpc("soft_delete_sale", { _sale_id: saleId });
    setLoading(false);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return;
    }
    toast.success("Venda excluída");
    setOpen(false);
    onDeleted?.(saleId);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
        {variant === "icon" ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Excluir venda"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        ) : (
          <Button variant="destructive" size="sm">
            <Trash2 className="w-4 h-4 mr-2" /> Excluir
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir esta venda?</AlertDialogTitle>
          <AlertDialogDescription>
            {saleLabel ? (
              <>A venda <strong>{saleLabel}</strong> será removida das listas (vendas, viagens, financeiro, dashboard).</>
            ) : (
              <>Esta venda será removida das listas (vendas, viagens, financeiro, dashboard).</>
            )}
            {" "}O registro fica arquivado no banco e pode ser restaurado por um administrador.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Sim, excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
