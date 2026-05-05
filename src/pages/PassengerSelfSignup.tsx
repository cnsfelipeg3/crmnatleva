import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle, Plus } from "lucide-react";
import logo from "@/assets/logo-natleva.png";
import { useToast } from "@/hooks/use-toast";
import PassengerFormCard, {
  emptyPassenger,
  validateDob,
  type PassengerFormState,
} from "@/components/passenger-signup/PassengerFormCard";

export default function PassengerSelfSignup() {
  const { slug } = useParams();
  const { toast } = useToast();
  const [linkState, setLinkState] = useState<"loading" | "valid" | "invalid">("loading");
  const [reason, setReason] = useState<string>("");
  const [passengers, setPassengers] = useState<PassengerFormState[]>([{ ...emptyPassenger }]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [blockedMsg, setBlockedMsg] = useState<string>("");

  const fnUrl = useMemo(() => {
    const projectId = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
    return `https://${projectId}.supabase.co/functions/v1/passenger-self-signup`;
  }, []);

  useEffect(() => {
    if (!slug) return;
    const bust = Date.now();
    fetch(`${fnUrl}?slug=${encodeURIComponent(slug)}&_=${bust}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.valid) setLinkState("valid");
        else { setLinkState("invalid"); setReason(d.reason || ""); }
      })
      .catch(() => setLinkState("valid"));
  }, [slug, fnUrl]);

  const updatePassenger = (idx: number, next: PassengerFormState) => {
    setPassengers((arr) => arr.map((p, i) => (i === idx ? next : p)));
  };
  const removePassenger = (idx: number) => {
    setPassengers((arr) => arr.filter((_, i) => i !== idx));
  };
  const addPassenger = () => {
    setPassengers((arr) => [...arr, { ...emptyPassenger }]);
    requestAnimationFrame(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    });
  };

  const validatePassenger = (p: PassengerFormState, idx: number): string | null => {
    if (!p.full_name.trim() || p.full_name.trim().length < 3) {
      return `Passageiro ${idx + 1}: informe o nome completo`;
    }
    const phoneDigits = (p.phone || "").replace(/\D/g, "");
    if (!p.phone.startsWith("+") || phoneDigits.length < 8 || phoneDigits.length > 15) {
      return `Passageiro ${idx + 1}: telefone inválido`;
    }
    if (p.birth_date) {
      const err = validateDob(p.birth_date);
      if (err) return `Passageiro ${idx + 1}: ${err}`;
    }
    if (p.international_outside_sa && (!p.passport_number || !p.passport_expiry)) {
      return `Passageiro ${idx + 1}: passaporte e validade são obrigatórios para viagem internacional fora da América do Sul`;
    }
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;
    setBlockedMsg("");

    for (let i = 0; i < passengers.length; i++) {
      const err = validatePassenger(passengers[i], i);
      if (err) {
        toast({ title: "Verifique os dados", description: err, variant: "destructive" });
        return;
      }
    }

    setSubmitting(true);
    let successCount = 0;
    try {
      for (let i = 0; i < passengers.length; i++) {
        const r = await fetch(fnUrl, {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, payload: passengers[i] }),
        });
        const j = await r.json();
        if (!r.ok || j.error) {
          if (r.status === 429 || r.status === 409 || j.code) {
            setBlockedMsg(
              successCount > 0
                ? `${successCount} de ${passengers.length} cadastros foram enviados. ${j.error || "Não foi possível concluir o restante."}`
                : (j.error || "Não foi possível concluir o cadastro agora."),
            );
          } else {
            toast({
              title: `Erro no passageiro ${i + 1}`,
              description: j.error || "Tente novamente",
              variant: "destructive",
            });
          }
          setSubmitting(false);
          return;
        }
        successCount++;
      }
      setDoneCount(successCount);
      setDone(true);
    } catch {
      toast({ title: "Erro de conexão", description: "Verifique sua internet e tente novamente.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (linkState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (linkState === "invalid") {
    const map: Record<string, string> = {
      not_found: "Este link de cadastro não existe.",
      inactive: "Este link de cadastro foi desativado.",
      expired: "Este link expirou.",
      limit_reached: "Este link já atingiu o limite de cadastros.",
    };
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="p-8 sm:p-10 max-w-md w-full text-center space-y-4">
          <img src={logo} alt="NatLeva" className="h-10 mx-auto" />
          <h1 className="text-xl font-display">Link indisponível</h1>
          <p className="text-sm text-muted-foreground">{map[reason] || "Não foi possível abrir este formulário."}</p>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="p-8 sm:p-10 max-w-md w-full text-center space-y-5">
          <CheckCircle2 className="w-14 h-14 text-primary mx-auto" />
          <img src={logo} alt="NatLeva" className="h-8 mx-auto opacity-80" />
          <h1 className="text-2xl font-display">
            {doneCount > 1 ? `${doneCount} cadastros recebidos!` : "Cadastro recebido!"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {doneCount > 1
              ? "Recebemos os dados de todos os passageiros. Nossa equipe já está com tudo em mãos para cuidar da viagem de vocês."
              : "Obrigado por compartilhar seus dados com a gente. Nossa equipe já está com tudo em mãos para cuidar da sua viagem."}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center">
      <header className="w-full border-b border-border/30">
        <div className="w-full max-w-xl mx-auto px-5 sm:px-6 py-8 sm:py-10 text-center space-y-3">
          <img src={logo} alt="NatLeva" className="h-10 sm:h-12 mx-auto" />
          <h1 className="text-2xl sm:text-3xl font-display tracking-tight">Cadastro de passageiros</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Preenche com calma. Se a viagem for em grupo ou família, você pode adicionar mais passageiros no mesmo formulário.
          </p>
        </div>
      </header>

      <form onSubmit={onSubmit} className="w-full max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 [&_input]:h-11">
        {passengers.map((p, idx) => (
          <PassengerFormCard
            key={idx}
            index={idx}
            value={p}
            onChange={(next) => updatePassenger(idx, next)}
            onRemove={() => removePassenger(idx)}
            canRemove={passengers.length > 1}
          />
        ))}

        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={addPassenger}
          className="w-full border-dashed"
        >
          <Plus className="w-4 h-4 mr-2" /> Adicionar outro passageiro
        </Button>

        {blockedMsg && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{blockedMsg}</p>
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {passengers.length > 1
            ? `Enviar dados de ${passengers.length} passageiros`
            : "Enviar meus dados"}
        </Button>

        <p className="text-center text-xs text-muted-foreground pb-6">
          Os dados são tratados com sigilo e usados apenas para organizar a viagem.
        </p>
      </form>
    </div>
  );
}
