import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export function useMyDelegations() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`my_delegations_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversation_assignments_log",
          filter: `to_user_id=eq.${user.id}`,
        },
        async (payload) => {
          const log: any = payload.new;
          if (log.changed_by === user.id) return;
          if (log.action !== "delegated") return;

          const { data: conv } = await (supabase as any)
            .from("conversations")
            .select("id, contact_name, display_name, phone")
            .eq("id", log.conversation_id)
            .maybeSingle();
          const name =
            conv?.display_name || conv?.contact_name || conv?.phone || "Nova conversa";

          toast.info(`Você recebeu uma conversa: ${name}`, {
            duration: 8000,
            action: {
              label: "Abrir",
              onClick: () => navigate(`/operacao/inbox?id=${log.conversation_id}`),
            },
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);
}
