import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, MailX, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type State =
  | { kind: "loading" }
  | { kind: "valid" }
  | { kind: "already" }
  | { kind: "invalid" }
  | { kind: "processing" }
  | { kind: "done" }
  | { kind: "error"; message: string };

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid" });
      return;
    }
    (async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`,
          { headers: { apikey: SUPABASE_ANON_KEY } },
        );
        const data = await res.json().catch(() => ({}));
        if (data?.valid) setState({ kind: "valid" });
        else if (data?.reason === "already_unsubscribed") setState({ kind: "already" });
        else setState({ kind: "invalid" });
      } catch {
        setState({ kind: "error", message: "Não conseguimos validar o link." });
      }
    })();
  }, [token]);

  async function confirm() {
    if (!token) return;
    setState({ kind: "processing" });
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/handle-email-unsubscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.success) setState({ kind: "done" });
      else if (data?.reason === "already_unsubscribed") setState({ kind: "already" });
      else setState({ kind: "error", message: "Não foi possível concluir agora." });
    } catch {
      setState({ kind: "error", message: "Erro de conexão." });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 border-t-4 border-t-[#C9A84C]">
        <div className="text-center mb-6">
          <p className="text-xs tracking-[4px] font-bold text-foreground">NATLEVA</p>
          <p className="text-[10px] tracking-[2px] uppercase text-[#C9A84C] mt-1">
            Preferências de e-mail
          </p>
        </div>

        {state.kind === "loading" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Validando link...</p>
          </div>
        )}

        {state.kind === "valid" && (
          <div className="text-center space-y-4">
            <MailX className="h-10 w-10 mx-auto text-muted-foreground" />
            <h1 className="text-lg font-semibold">Cancelar inscrição</h1>
            <p className="text-sm text-muted-foreground">
              Confirme que você quer parar de receber e-mails da NatLeva.
              Você ainda receberá comunicados essenciais da sua conta.
            </p>
            <Button onClick={confirm} className="w-full">
              Confirmar cancelamento
            </Button>
          </div>
        )}

        {state.kind === "processing" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Processando...</p>
          </div>
        )}

        {state.kind === "done" && (
          <div className="text-center space-y-3 py-4">
            <CheckCircle2 className="h-10 w-10 mx-auto text-green-600" />
            <h1 className="text-lg font-semibold">Pronto!</h1>
            <p className="text-sm text-muted-foreground">
              Sua inscrição foi cancelada. Sentiremos sua falta.
            </p>
          </div>
        )}

        {state.kind === "already" && (
          <div className="text-center space-y-3 py-4">
            <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground" />
            <h1 className="text-lg font-semibold">Já cancelado</h1>
            <p className="text-sm text-muted-foreground">
              Este e-mail já estava fora da nossa lista.
            </p>
          </div>
        )}

        {state.kind === "invalid" && (
          <div className="text-center space-y-3 py-4">
            <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
            <h1 className="text-lg font-semibold">Link inválido</h1>
            <p className="text-sm text-muted-foreground">
              Este link expirou ou não é mais válido.
            </p>
          </div>
        )}

        {state.kind === "error" && (
          <div className="text-center space-y-3 py-4">
            <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
            <h1 className="text-lg font-semibold">Algo deu errado</h1>
            <p className="text-sm text-muted-foreground">{state.message}</p>
          </div>
        )}
      </Card>
    </div>
  );
}
