import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Detecta se o usuário logado é AFILIADO PURO (tem registro em `affiliates`
 * e NÃO tem registro em `employees`).
 *
 * SEGURANÇA: usuários afiliados puros NÃO podem acessar nenhuma rota interna
 * do sistema NatLeva (CRM, financeiro, AI, etc) · só /vitrine/*.
 *
 * Cache em memória por user_id para evitar queries duplicadas.
 */
type State = { loading: boolean; isAffiliateOnly: boolean };

const cache = new Map<string, boolean>();

export function useIsAffiliateOnly(): State {
  const { user, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<State>(() => {
    if (!user) return { loading: authLoading, isAffiliateOnly: false };
    const cached = cache.get(user.id);
    if (cached !== undefined) return { loading: false, isAffiliateOnly: cached };
    return { loading: true, isAffiliateOnly: false };
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setState({ loading: false, isAffiliateOnly: false });
      return;
    }
    const cached = cache.get(user.id);
    if (cached !== undefined) {
      setState({ loading: false, isAffiliateOnly: cached });
      return;
    }
    let cancelled = false;
    (async () => {
      const [aff, emp] = await Promise.all([
        supabase.from("affiliates").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.from("employees").select("id").eq("user_id", user.id).maybeSingle(),
      ]);
      const isAffiliateOnly = !!aff.data && !emp.data;
      cache.set(user.id, isAffiliateOnly);
      if (!cancelled) setState({ loading: false, isAffiliateOnly });
    })().catch(() => {
      if (!cancelled) setState({ loading: false, isAffiliateOnly: false });
    });
    return () => { cancelled = true; };
  }, [user, authLoading]);

  return state;
}
