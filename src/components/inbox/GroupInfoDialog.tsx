import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Crown, Phone, RefreshCw, Image as ImageIcon, FileText, Video as VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneDisplay } from "@/lib/phone";
import { toast } from "sonner";

interface Participant {
  phone: string;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  short?: string;
  name?: string | null;
}

interface GroupMetadata {
  subject?: string;
  description?: string;
  owner?: string;
  participants?: Participant[];
  pictureUrl?: string | null;
  creation?: number | string;
}

interface GroupInfoDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  conversationDbId: string | null;
  conversationPhone: string;
  groupName: string;
}

export function GroupInfoDialog({
  open,
  onOpenChange,
  conversationDbId,
  conversationPhone,
  groupName,
}: GroupInfoDialogProps) {
  const [meta, setMeta] = useState<GroupMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [media, setMedia] = useState<any[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  const loadFromCache = async () => {
    if (!conversationDbId) return;
    const { data } = await (supabase as any)
      .from("conversations")
      .select("group_metadata, group_description, group_subject, group_metadata_fetched_at")
      .eq("id", conversationDbId)
      .maybeSingle();
    if (data?.group_metadata) {
      setMeta({
        ...data.group_metadata,
        subject: data.group_subject || data.group_metadata.subject || groupName,
        description: data.group_description || data.group_metadata.description,
      });
      setCachedAt(data.group_metadata_fetched_at || null);
    }
  };

  const fetchFresh = async () => {
    if (!conversationPhone) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("zapi-proxy", {
        body: { action: "group-metadata", payload: { phone: conversationPhone } },
      });
      if (error) throw error;
      const m: GroupMetadata = data || {};
      setMeta(m);
      if (conversationDbId) {
        await (supabase as any)
          .from("conversations")
          .update({
            group_metadata: m,
            group_description: m.description || null,
            group_subject: m.subject || null,
            group_metadata_fetched_at: new Date().toISOString(),
            is_group: true,
          })
          .eq("id", conversationDbId);
        setCachedAt(new Date().toISOString());
      }
    } catch (e: any) {
      toast.error("Não foi possível carregar dados do grupo", { description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  const loadMedia = async () => {
    if (!conversationDbId) return;
    setLoadingMedia(true);
    try {
      const { data } = await (supabase as any)
        .from("conversation_messages")
        .select("id, message_type, media_url, media_storage_url, media_filename, sender_name, created_at")
        .eq("conversation_id", conversationDbId)
        .in("message_type", ["image", "video", "document"])
        .order("created_at", { ascending: false })
        .limit(80);
      setMedia(data || []);
    } finally {
      setLoadingMedia(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadFromCache();
    loadMedia();
    // Auto-fetch fresh metadata if cache older than 1h
    if (!cachedAt || Date.now() - new Date(cachedAt).getTime() > 60 * 60 * 1000) {
      fetchFresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, conversationDbId]);

  const participants = meta?.participants || [];
  const admins = participants.filter(p => p.isAdmin || p.isSuperAdmin);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <div className="flex items-center gap-3">
            {meta?.pictureUrl ? (
              <img src={meta.pictureUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1 text-left">
              <DialogTitle className="text-base truncate">{meta?.subject || groupName}</DialogTitle>
              <p className="text-[11px] text-muted-foreground">
                {participants.length > 0 ? `${participants.length} participantes` : "Grupo do WhatsApp"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchFresh}
              disabled={loading}
              title="Atualizar dados do grupo"
              className="h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-3 grid grid-cols-3">
            <TabsTrigger value="info">Sobre</TabsTrigger>
            <TabsTrigger value="participants">Pessoas ({participants.length})</TabsTrigger>
            <TabsTrigger value="media">Mídias ({media.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="flex-1 min-h-0 mt-3">
            <ScrollArea className="h-[400px] px-5 pb-5">
              <div className="space-y-4">
                <section>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Descrição</h4>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">
                    {meta?.description?.trim() || (loading ? "Carregando…" : "Sem descrição.")}
                  </p>
                </section>

                {admins.length > 0 && (
                  <section>
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Administradores</h4>
                    <div className="space-y-1.5">
                      {admins.map(a => (
                        <div key={a.phone} className="flex items-center gap-2 text-sm">
                          <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span className="font-medium truncate">{a.name || a.short || formatPhoneDisplay(a.phone)}</span>
                          {a.isSuperAdmin && <span className="text-[9px] text-amber-600 font-semibold uppercase">criador</span>}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {cachedAt && (
                  <p className="text-[10px] text-muted-foreground italic">
                    Atualizado em {new Date(cachedAt).toLocaleString("pt-BR")}
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="participants" className="flex-1 min-h-0 mt-3">
            <ScrollArea className="h-[400px] px-5 pb-5">
              {loading && participants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Carregando participantes…</p>
              ) : participants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum participante encontrado.</p>
              ) : (
                <div className="space-y-1">
                  {participants.map(p => {
                    const display = p.name || p.short || formatPhoneDisplay(p.phone);
                    const isAdmin = p.isAdmin || p.isSuperAdmin;
                    return (
                      <div key={p.phone} className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/50">
                        <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold">{display.slice(0, 2).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium truncate">{display}</span>
                            {isAdmin && <Crown className="h-3 w-3 text-amber-500 shrink-0" />}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Phone className="h-2.5 w-2.5" />
                            <span className="truncate">{formatPhoneDisplay(p.phone)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="media" className="flex-1 min-h-0 mt-3">
            <ScrollArea className="h-[400px] px-5 pb-5">
              {loadingMedia ? (
                <p className="text-sm text-muted-foreground text-center py-8">Carregando mídias…</p>
              ) : media.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mídia encontrada nessa conversa.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {media.map(m => {
                    const url = m.media_storage_url || m.media_url;
                    if (m.message_type === "image" && url) {
                      return (
                        <a key={m.id} href={url} target="_blank" rel="noreferrer" className="aspect-square bg-muted rounded-md overflow-hidden">
                          <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform" loading="lazy" />
                        </a>
                      );
                    }
                    if (m.message_type === "video" && url) {
                      return (
                        <a key={m.id} href={url} target="_blank" rel="noreferrer" className="aspect-square bg-muted rounded-md flex items-center justify-center">
                          <VideoIcon className="h-6 w-6 text-muted-foreground" />
                        </a>
                      );
                    }
                    return (
                      <a key={m.id} href={url || "#"} target="_blank" rel="noreferrer" className="aspect-square bg-muted rounded-md flex flex-col items-center justify-center p-2 text-center">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                        <span className="text-[9px] truncate w-full mt-1">{m.media_filename || "doc"}</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
