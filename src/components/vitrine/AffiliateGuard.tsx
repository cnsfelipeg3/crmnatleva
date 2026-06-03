import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Clock, MailWarning } from "lucide-react";
import logoNatleva from "@/assets/logo-natleva.webp";
import { Button } from "@/components/ui/button";
import { smartCapitalizeName } from "@/lib/nameUtils";

type AffiliateState =
  | { status: "loading" }
  | { status: "unauth" }
  | { status: "unconfirmed"; email: string }
  | { status: "no_record" }
  | { status: "pending" | "rejected" | "approved"; name: string };

export function useAffiliateState(): AffiliateState {
  const [state, setState] = useState<AffiliateState>({ status: "loading" });

  useEffect(() => {
    let mounted = true;

    const loadFromSession = async (session: any) => {
      if (!mounted) return;
      if (!session?.user) return setState({ status: "unauth" });

      if (!session.user.email_confirmed_at && !session.user.confirmed_at) {
        return setState({ status: "unconfirmed", email: session.user.email ?? "" });
      }

      try {
        const { data, error } = await supabase
          .from("affiliates")
          .select("status, full_name")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!mounted) return;
        if (error || !data) return setState({ status: "no_record" });
        setState({ status: data.status as any, name: data.full_name });
      } catch {
        if (mounted) setState({ status: "no_record" });
      }
    };

    // Fail-safe: never stay in loading forever
    const failSafe = window.setTimeout(() => {
      if (mounted) setState((s) => (s.status === "loading" ? { status: "unauth" } : s));
    }, 4000);

    // Initial session load
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadFromSession(session);
    }).catch(() => { if (mounted) setState({ status: "unauth" }); });

    // Subsequent auth changes · fire-and-forget (no await inside callback)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => loadFromSession(session), 0);
    });

    return () => {
      mounted = false;
      window.clearTimeout(failSafe);
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export default function AffiliateGuard({ children }: { children: ReactNode }) {
  const state = useAffiliateState();
  const location = useLocation();

  if (state.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state.status === "unauth" || state.status === "no_record") {
    return <Navigate to="/vitrine/login" replace state={{ from: location }} />;
  }

  if (state.status === "unconfirmed") {
    return <StatusScreen
      icon={<MailWarning className="w-12 h-12 text-amber-500" />}
      title="Confirme seu e-mail"
      message={`Enviamos um link de confirmação para ${state.email}. Confirme pra liberar o acesso à vitrine.`}
    />;
  }

  if (state.status === "pending") {
    return <StatusScreen
      icon={<Clock className="w-12 h-12 text-amber-500" />}
      title={`Olá, ${smartCapitalizeName(state.name.split(" ")[0])}!`}
      message="Seu cadastro foi recebido e está em análise. Assim que aprovarmos seu acesso de afiliado, a gente te avisa por e-mail."
    />;
  }

  if (state.status === "rejected") {
    return <StatusScreen
      icon={<MailWarning className="w-12 h-12 text-destructive" />}
      title="Cadastro não aprovado"
      message="Seu acesso de afiliado não foi liberado. Entre em contato com a equipe NatLeva pra entender os próximos passos."
    />;
  }

  return <>{children}</>;
}

function StatusScreen({ icon, title, message }: { icon: ReactNode; title: string; message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="max-w-md w-full text-center space-y-5 p-8 rounded-2xl border border-border/60 bg-card/95 shadow-xl">
        <img src={logoNatleva} alt="NatLeva" className="h-10 mx-auto dark:invert" />
        <div className="flex justify-center">{icon}</div>
        <h1 className="font-serif text-2xl text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
        <Button
          variant="outline"
          className="w-full"
          onClick={async () => { await supabase.auth.signOut(); window.location.href = "/vitrine/login"; }}
        >
          Sair
        </Button>
      </div>
    </div>
  );
}
