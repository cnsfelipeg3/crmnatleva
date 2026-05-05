import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Participant = {
  id: string;
  user_id: string;
  added_at: string;
};

/**
 * Hook de delegação. `conversationDbId` deve ser o UUID real (db_id),
 * não o id sintético "wa_<phone>" usado na UI.
 */
export function useConversationDelegation(conversationDbId: string | null) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!conversationDbId) {
      setParticipants([]);
      return;
    }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("conversation_participants")
      .select("id, user_id, added_at")
      .eq("conversation_id", conversationDbId)
      .is("removed_at", null)
      .order("added_at");
    setParticipants((data as Participant[]) || []);
    setLoading(false);
  }, [conversationDbId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!conversationDbId) return;
    const channel = supabase
      .channel(`conv_part_${conversationDbId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_participants",
          filter: `conversation_id=eq.${conversationDbId}`,
        },
        () => reload(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationDbId, reload]);

  const delegate = useCallback(
    async (toUserId: string | null, reason?: string) => {
      if (!conversationDbId) return false;
      const { error } = await supabase
        .from("conversations")
        .update({ assigned_to: toUserId } as any)
        .eq("id", conversationDbId);
      if (error) {
        if (error.code === "42501" || /admin|gestor/i.test(error.message)) {
          toast.error("Apenas admin ou gestor pode delegar conversas.");
        } else {
          toast.error(`Erro ao delegar: ${error.message}`);
        }
        return false;
      }
      if (reason) {
        const { data: lastLog } = await (supabase as any)
          .from("conversation_assignments_log")
          .select("id")
          .eq("conversation_id", conversationDbId)
          .order("changed_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastLog) {
          await (supabase as any)
            .from("conversation_assignments_log")
            .update({ reason })
            .eq("id", lastLog.id);
        }
      }
      toast.success(toUserId ? "Conversa delegada." : "Atribuição removida.");
      return true;
    },
    [conversationDbId],
  );

  const addParticipants = useCallback(
    async (userIds: string[]) => {
      if (!conversationDbId || userIds.length === 0) return false;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;
      const rows = userIds.map((uid) => ({
        conversation_id: conversationDbId,
        user_id: uid,
        added_by: user.id,
      }));
      const { error } = await (supabase as any)
        .from("conversation_participants")
        .insert(rows);
      if (error) {
        toast.error(`Erro ao adicionar: ${error.message}`);
        return false;
      }
      toast.success(`${userIds.length} participante(s) adicionado(s).`);
      await reload();
      return true;
    },
    [conversationDbId, reload],
  );

  const removeParticipant = useCallback(
    async (participantId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;
      const { error } = await (supabase as any)
        .from("conversation_participants")
        .update({ removed_at: new Date().toISOString(), removed_by: user.id })
        .eq("id", participantId);
      if (error) {
        toast.error(
          error.message.includes("policy")
            ? "Apenas gestão pode remover participantes."
            : error.message,
        );
        return false;
      }
      toast.success("Participante removido.");
      await reload();
      return true;
    },
    [reload],
  );

  return { participants, loading, reload, delegate, addParticipants, removeParticipant };
}
