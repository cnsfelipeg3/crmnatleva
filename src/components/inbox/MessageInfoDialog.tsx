import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { CheckCheck, Check, Eye, Users, Loader2 } from "lucide-react";
import { formatPhoneDisplay } from "@/components/inbox/helpers";

interface RecipientStatus {
  participant_phone: string;
  participant_name: string | null;
  delivered_at: string | null;
  read_at: string | null;
  played_at: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  externalMessageId: string | null;
  groupParticipants?: Array<{ phone?: string; name?: string }> | null;
  isGroup?: boolean;
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function MessageInfoDialog({ open, onOpenChange, externalMessageId, groupParticipants, isGroup }: Props) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<RecipientStatus[]>([]);

  useEffect(() => {
    if (!open || !externalMessageId) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("message_recipient_status")
        .select("participant_phone, participant_name, delivered_at, read_at, played_at")
        .eq("external_message_id", externalMessageId);
      if (!cancel) {
        setRows(((data as any[]) || []) as RecipientStatus[]);
        setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [open, externalMessageId]);

  // Mescla participantes do grupo com receipts (mostra também quem ainda não recebeu)
  const merged = (() => {
    const byPhone = new Map<string, RecipientStatus>();
    rows.forEach(r => byPhone.set(String(r.participant_phone).replace(/\D/g, ""), r));
    if (isGroup && groupParticipants?.length) {
      groupParticipants.forEach(p => {
        const phone = String(p.phone || "").replace(/\D/g, "");
        if (!phone) return;
        if (!byPhone.has(phone)) {
          byPhone.set(phone, {
            participant_phone: phone,
            participant_name: p.name || null,
            delivered_at: null,
            read_at: null,
            played_at: null,
          });
        } else if (p.name && !byPhone.get(phone)!.participant_name) {
          byPhone.get(phone)!.participant_name = p.name;
        }
      });
    }
    return Array.from(byPhone.values());
  })();

  const read = merged.filter(r => r.read_at);
  const delivered = merged.filter(r => !r.read_at && r.delivered_at);
  const pending = merged.filter(r => !r.read_at && !r.delivered_at);

  const Section = ({ title, icon, items, dateKey }: { title: string; icon: React.ReactNode; items: RecipientStatus[]; dateKey: "read_at" | "delivered_at" | null }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        <span>{title}</span>
        <span className="text-xs text-muted-foreground">({items.length})</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground pl-6">Ninguém ainda</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map(r => (
            <li key={r.participant_phone} className="flex items-center justify-between gap-3 pl-6 text-sm">
              <div className="min-w-0 flex-1 truncate">
                <span className="text-foreground">{r.participant_name || formatPhoneDisplay(r.participant_phone)}</span>
                {r.participant_name && (
                  <span className="ml-2 text-xs text-muted-foreground">{formatPhoneDisplay(r.participant_phone)}</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {dateKey ? fmtDateTime(r[dateKey]) : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Dados da mensagem
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2">
            <Section title="Lida por" icon={<CheckCheck className="h-4 w-4 text-primary" />} items={read} dateKey="read_at" />
            <Section title="Entregue para" icon={<CheckCheck className="h-4 w-4 text-muted-foreground" />} items={delivered} dateKey="delivered_at" />
            {isGroup && (
              <Section title="Pendente" icon={<Check className="h-4 w-4 text-muted-foreground" />} items={pending} dateKey={null} />
            )}
            {merged.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sem informações de entrega ainda. Os dados aparecem conforme cada destinatário recebe e lê a mensagem.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
