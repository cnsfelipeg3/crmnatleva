// Modal "Quem visualizou meu status"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useStatusViewers } from "@/hooks/useWhatsAppStatus";
import { formatPhoneDisplay } from "@/lib/phone";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Eye } from "lucide-react";

interface Props {
  statusId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function StatusViewersDialog({ statusId, open, onOpenChange }: Props) {
  const { data: viewers = [], isLoading } = useStatusViewers(statusId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {viewers.length} {viewers.length === 1 ? "pessoa viu" : "pessoas viram"} este status
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
        ) : viewers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Ninguém visualizou ainda</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {viewers.map(v => (
              <div key={v.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <Avatar><AvatarFallback>{(v.viewer_name?.[0] || "?").toUpperCase()}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{v.viewer_name || formatPhoneDisplay(v.viewer_phone)}</p>
                  <p className="text-xs text-muted-foreground">
                    visto há {formatDistanceToNow(new Date(v.viewed_at), { locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default StatusViewersDialog;
