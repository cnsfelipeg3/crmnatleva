// Página /livechat/status — Status do WhatsApp
import { useMemo, useState } from "react";
import { Camera, Plus, Eye, Image as ImageIcon, Video, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/states/EmptyState";
import {
  useMyStatuses, useContactStatuses, useSeenStatusIds, useStatusRealtime,
  type WhatsAppStatus,
} from "@/hooks/useWhatsAppStatus";
import { StatusViewer } from "@/components/whatsapp/StatusViewer";
import { PostStatusDialog } from "@/components/whatsapp/PostStatusDialog";
import { StatusViewersDialog } from "@/components/whatsapp/StatusViewersDialog";
import { formatPhoneDisplay } from "@/lib/phone";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function WhatsAppStatus() {
  useStatusRealtime();
  const { data: mine = [] } = useMyStatuses();
  const { data: contacts = [] } = useContactStatuses();
  const { data: seenIds = new Set<string>() } = useSeenStatusIds();

  const [postOpen, setPostOpen] = useState(false);
  const [viewerStatuses, setViewerStatuses] = useState<WhatsAppStatus[] | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewersDialogId, setViewersDialogId] = useState<string | null>(null);

  // Agrupa status por contato (phone)
  const grouped = useMemo(() => {
    const map = new Map<string, WhatsAppStatus[]>();
    for (const s of contacts) {
      const arr = map.get(s.phone) || [];
      arr.push(s);
      map.set(s.phone, arr);
    }
    // Ordena cada grupo por tempo crescente (visualização sequencial)
    for (const arr of map.values()) arr.sort((a, b) => +new Date(a.posted_at) - +new Date(b.posted_at));
    // Ordena grupos pelo mais recente
    return Array.from(map.entries()).sort(([, a], [, b]) =>
      +new Date(b[b.length - 1].posted_at) - +new Date(a[a.length - 1].posted_at)
    );
  }, [contacts]);

  function openContactStatuses(arr: WhatsAppStatus[]) {
    const firstUnseenIdx = arr.findIndex(s => !seenIds.has(s.id));
    setViewerStatuses(arr);
    setViewerIndex(firstUnseenIdx >= 0 ? firstUnseenIdx : 0);
  }

  function openMineStatuses(initial: number) {
    setViewerStatuses(mine);
    setViewerIndex(initial);
  }

  function statusIcon(t: WhatsAppStatus["status_type"]) {
    if (t === "image") return <ImageIcon className="h-4 w-4" />;
    if (t === "video") return <Video className="h-4 w-4" />;
    return <Type className="h-4 w-4" />;
  }

  return (
    <div className="container max-w-5xl mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Camera className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Status do WhatsApp</h1>
            <p className="text-sm text-muted-foreground">Veja e publique status que expiram em 24h</p>
          </div>
        </div>
        <Button onClick={() => setPostOpen(true)}>
          <Plus className="h-4 w-4" /> Publicar status
        </Button>
      </header>

      {/* Meus status */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Meus status</h2>
        {mine.length === 0 ? (
          <Card className="p-6">
            <EmptyState icon={Camera} title="Você ainda não publicou status" description="Use o botão acima para publicar seu primeiro status do dia." />
          </Card>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {mine.map((s, i) => (
              <button
                key={s.id}
                onClick={() => openMineStatuses(i)}
                className="relative flex-shrink-0 w-32 aspect-[9/16] rounded-xl overflow-hidden border border-border bg-muted group hover:ring-2 hover:ring-primary transition"
              >
                {s.status_type === "image" && s.media_url && (
                  <img src={s.media_thumbnail_url || s.media_url} alt="" className="w-full h-full object-cover" />
                )}
                {s.status_type === "video" && s.media_url && (
                  <video src={s.media_url} className="w-full h-full object-cover" muted />
                )}
                {s.status_type === "text" && (
                  <div className="w-full h-full flex items-center justify-center px-2 text-white text-xs font-semibold text-center"
                    style={{ backgroundColor: s.background_color || "#075E54" }}>
                    {(s.text_content || "").slice(0, 60)}
                  </div>
                )}
                <div className="absolute top-1 left-1 bg-black/50 text-white p-1 rounded">{statusIcon(s.status_type)}</div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-white text-[10px]">
                  <div className="flex items-center justify-between">
                    <span>{formatDistanceToNow(new Date(s.posted_at), { locale: ptBR, addSuffix: true })}</span>
                    <span
                      className="flex items-center gap-1 cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); setViewersDialogId(s.id); }}
                    >
                      <Eye className="h-3 w-3" /> {s.view_count}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Status de contatos */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Status dos contatos</h2>
        {grouped.length === 0 ? (
          <Card className="p-6 space-y-3">
            <EmptyState
              icon={Camera}
              title="Nenhum status de contato recebido"
              description="A Z-API ainda não enviou eventos de status (stories) para o webhook nas últimas 24h. Isso geralmente acontece quando o webhook 'Ao receber status' não está configurado no painel da Z-API."
            />
            <div className="text-xs text-muted-foreground border-t pt-3 space-y-1">
              <p className="font-semibold text-foreground">Como ativar:</p>
              <p>1. Acesse o painel da Z-API · sua instância · Webhooks</p>
              <p>2. Em "Ao receber status", cole a mesma URL usada em "Ao receber mensagem" (zapi-webhook)</p>
              <p>3. Salve · novos status de contatos passam a aparecer aqui automaticamente</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-2">
            {grouped.map(([phone, arr]) => {
              const last = arr[arr.length - 1];
              const hasUnseen = arr.some(s => !seenIds.has(s.id));
              return (
                <button
                  key={phone}
                  onClick={() => openContactStatuses(arr)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition text-left"
                >
                  <div className={`p-[3px] rounded-full ${hasUnseen ? "bg-gradient-to-br from-[#25d366] to-[#128c7e]" : "bg-muted-foreground/30"}`}>
                    <div className="bg-background p-[2px] rounded-full">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>{(last.contact_name?.[0] || "?").toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{last.contact_name || formatPhoneDisplay(phone)}</p>
                    <p className="text-xs text-muted-foreground">
                      {arr.length} {arr.length === 1 ? "status" : "status"} · {formatDistanceToNow(new Date(last.posted_at), { locale: ptBR, addSuffix: true })}
                    </p>
                  </div>
                  {hasUnseen && <span className="h-2 w-2 rounded-full bg-primary" aria-label="Não visto" />}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <PostStatusDialog open={postOpen} onOpenChange={setPostOpen} />
      <StatusViewersDialog statusId={viewersDialogId} open={!!viewersDialogId} onOpenChange={(v) => !v && setViewersDialogId(null)} />
      {viewerStatuses && (
        <StatusViewer
          statuses={viewerStatuses}
          initialIndex={viewerIndex}
          onClose={() => setViewerStatuses(null)}
        />
      )}
    </div>
  );
}
