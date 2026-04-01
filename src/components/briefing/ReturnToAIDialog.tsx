import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RotateCcw } from "lucide-react";

interface ReturnToAIDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

export default function ReturnToAIDialog({ open, onClose, onSubmit }: ReturnToAIDialogProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    await onSubmit(reason.trim());
    setReason("");
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-purple-400" />
            Devolver para IA
          </DialogTitle>
          <DialogDescription>
            O ATLAS vai retomar a conversa com o lead de forma natural para coletar as informações que faltam.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="O que precisa ser perguntado ao lead? Ex: Confirmar se aceitam hotel em Kissimmee ou só na International Drive..."
          rows={4}
          className="resize-none"
        />

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason.trim() || submitting}
            className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <RotateCcw className="w-4 h-4" />
            {submitting ? "Enviando..." : "Devolver"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
