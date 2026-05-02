import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useExternalSellers } from "@/hooks/useExternalSellers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Archive, ArchiveRestore } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
};

export function ExternalSellersDialog({ open, onOpenChange, onChanged }: Props) {
  const { sellers, reload } = useExternalSellers();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("external_sellers").insert({
      name: newName.trim(),
      notes: newNotes.trim() || null,
      active: true,
      created_by: user?.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`"${newName}" cadastrado`);
    setNewName("");
    setNewNotes("");
    setCreating(false);
    reload();
    onChanged?.();
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase
      .from("external_sellers")
      .update({
        active: !active,
        archived_at: active ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(active ? "Arquivado" : "Reativado");
    reload();
    onChanged?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Vendedores Externos</DialogTitle>
          <DialogDescription>
            Sem login. Para ex-funcionários ou parceiros que aparecem no histórico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
          {sellers.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum cadastrado ainda.
            </p>
          )}
          {sellers.map((s) => (
            <div
              key={s.id}
              className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border/30 bg-card/40"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">
                  {s.name}
                  {!s.active && (
                    <span className="ml-2 text-[10px] text-muted-foreground font-normal">
                      (arquivado)
                    </span>
                  )}
                </p>
                {s.notes && (
                  <p className="text-xs text-muted-foreground mt-0.5">{s.notes}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title={s.active ? "Arquivar" : "Reativar"}
                onClick={() => handleToggleActive(s.id, s.active)}
              >
                {s.active ? (
                  <Archive className="h-4 w-4" />
                ) : (
                  <ArchiveRestore className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </div>

        {creating ? (
          <div className="space-y-2 pt-2 border-t border-border/20">
            <Input
              placeholder="Nome do vendedor"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <Textarea
              placeholder="Observações (opcional)"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setCreating(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleCreate}>
                Criar
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setCreating(true)} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Adicionar vendedor externo
          </Button>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
