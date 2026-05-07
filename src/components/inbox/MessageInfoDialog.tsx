import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { CheckCheck, Check, Users, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  /** Phone do contato em conversas 1:1 (usado pra sintetizar recipient quando ainda não houve receipt). */
  contactPhone?: string | null;
  contactName?: string | null;
  /** Status atual da mensagem (sent/delivered/read) — usado pra estimar estado quando o receipt detalhado ainda não chegou. */
  messageStatus?: string | null;
  /** ID da conversa no DB · usado para buscar/cachear participantes do grupo. */
  conversationDbId?: string | null;
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function normalizeParticipants(raw: any): Array<{ phone: string; name: string | null }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((p: any) => {
      const phone = String(p?.phone || p?.id || p?.participant || "")
        .replace(/@(c\.us|s\.whatsapp\.net|lid|g\.us)/gi, "")
        .replace(/\D/g, "");
      const name = p?.short || p?.name || p?.pushname || p?.notify || p?.shortName || p?.contactName || null;
      return phone ? { phone, name } : null;
    })
    .filter(Boolean) as Array<{ phone: string; name: string | null }>;
}

export function MessageInfoDialog({ open, onOpenChange, externalMessageId, groupParticipants, isGroup, contactPhone, contactName, messageStatus, conversationDbId }: Props) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<RecipientStatus[]>([]);
  const [resolvedParticipants, setResolvedParticipants] = useState<Array<{ phone: string; name: string | null }>>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

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

    const channel = supabase
      .channel(`mrs-${externalMessageId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_recipient_status", filter: `external_message_id=eq.${externalMessageId}` },
        async () => {
          const { data } = await (supabase as any)
            .from("message_recipient_status")
            .select("participant_phone, participant_name, delivered_at, read_at, played_at")
            .eq("external_message_id", externalMessageId);
          if (!cancel) setRows(((data as any[]) || []) as RecipientStatus[]);
        }
      )
      .subscribe();

    return () => { cancel = true; supabase.removeChannel(channel); };
  }, [open, externalMessageId]);

  // ── Auto-resolve participantes do grupo ──
  const fetchGroupParticipants = async (forceFresh = false) => {
    if (!isGroup) return;
    // 1. Prop (cache do conversations.group_participants já vindo da página)
    if (!forceFresh) {
      const fromProp = normalizeParticipants(groupParticipants);
      if (fromProp.length > 0) { setResolvedParticipants(fromProp); return; }
    }

    // 2. DB (cache existente)
    let groupPhone: string | null = contactPhone || null;
    if (conversationDbId) {
      const { data: conv } = await (supabase as any)
        .from("conversations")
        .select("group_participants, phone")
        .eq("id", conversationDbId)
        .maybeSingle();
      groupPhone = (conv?.phone as string) || groupPhone;
      if (!forceFresh) {
        const fromDb = normalizeParticipants(conv?.group_participants);
        if (fromDb.length > 0) { setResolvedParticipants(fromDb); return; }
      }
    }

    // 3. Fetch fresh via Z-API
    if (!groupPhone) return;
    setLoadingParticipants(true);
    try {
      const { data, error } = await supabase.functions.invoke("zapi-proxy", {
        body: { action: "group-metadata", payload: { phone: groupPhone } },
      });
      if (error) throw error;
      const fresh = normalizeParticipants((data as any)?.participants);
      setResolvedParticipants(fresh);
      if (fresh.length > 0 && conversationDbId) {
        await (supabase as any)
          .from("conversations")
          .update({
            group_participants: (data as any)?.participants || fresh,
            group_subject: (data as any)?.subject || null,
            group_description: (data as any)?.description || null,
            group_photo_url: (data as any)?.pictureUrl || null,
            group_metadata_fetched_at: new Date().toISOString(),
            is_group: true,
          })
          .eq("id", conversationDbId);
      }
    } catch (e) {
      console.error("[MessageInfoDialog] group-metadata failed:", e);
    } finally {
      setLoadingParticipants(false);
    }
  };

  useEffect(() => {
    if (!open || !isGroup) { setResolvedParticipants([]); return; }
    fetchGroupParticipants(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isGroup, conversationDbId]);

  // Mescla participantes (grupo) ou cria recipient sintético (1:1)
  const merged = (() => {
    const byPhone = new Map<string, RecipientStatus>();
    rows.forEach(r => byPhone.set(String(r.participant_phone).replace(/\D/g, ""), r));

    if (isGroup && resolvedParticipants.length > 0) {
      resolvedParticipants.forEach(p => {
        const phone = p.phone;
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
    } else if (isGroup) {
      // Sem lista resolvida ainda · placeholder vazio (o effect vai popular)
    } else if (!isGroup && contactPhone) {
      // 1:1 — sintetiza recipient com o contato; estima estado pelo messageStatus
      const phone = String(contactPhone).replace(/\D/g, "");
      if (phone && !byPhone.has(phone)) {
        const status = (messageStatus || "").toLowerCase();
        const inferDelivered = status === "delivered" || status === "read" || status === "played";
        const inferRead = status === "read" || status === "played";
        byPhone.set(phone, {
          participant_phone: phone,
          participant_name: contactName || null,
          delivered_at: inferDelivered ? null : null, // sem timestamp real, deixa só na seção
          read_at: inferRead ? null : null,
          played_at: null,
        });
        // Reposicionamento de seção via flags auxiliares
        (byPhone.get(phone) as any)._inferred = { delivered: inferDelivered, read: inferRead };
      }
    }
    return Array.from(byPhone.values());
  })();

  const read = merged.filter(r => r.read_at || (r as any)._inferred?.read);
  const delivered = merged.filter(r => !(r.read_at || (r as any)._inferred?.read) && (r.delivered_at || (r as any)._inferred?.delivered));
  const pending = merged.filter(r => !(r.read_at || (r as any)._inferred?.read) && !(r.delivered_at || (r as any)._inferred?.delivered));

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
            <Section title="Pendente" icon={<Check className="h-4 w-4 text-muted-foreground" />} items={pending} dateKey={null} />
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
