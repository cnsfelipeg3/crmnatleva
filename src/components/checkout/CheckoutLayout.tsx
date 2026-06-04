import { useEffect, useMemo } from "react";
import { Navigate, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { Loader2, ShieldCheck, Check } from "lucide-react";
import { useCheckoutDraft, type CheckoutDraft } from "@/hooks/useCheckoutDraft";
import { CHECKOUT_STEPS, stepIndex, type CheckoutStep } from "@/lib/checkout/helpers";

export interface CheckoutCtx {
  orderId: string;
  draft: CheckoutDraft;
  update: (patch: Record<string, unknown>) => Promise<CheckoutDraft | null>;
  reload: () => Promise<void>;
}

const LABELS: Record<CheckoutStep, string> = {
  resumo: "Resumo",
  contato: "Contato",
  passageiros: "Passageiros",
  termos: "Termos",
  pagamento: "Pagamento",
};

export default function CheckoutLayout() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { draft, loading, error, redirectTo, update, reload } = useCheckoutDraft(orderId);

  // Detecta a etapa atual pela URL
  const currentStep = useMemo<CheckoutStep>(() => {
    const seg = location.pathname.split("/").pop() ?? "resumo";
    return (CHECKOUT_STEPS as readonly string[]).includes(seg) ? (seg as CheckoutStep) : "resumo";
  }, [location.pathname]);

  // Guard: redireciona se necessário
  useEffect(() => {
    if (!draft || !orderId) return;
    // Pedido não-rascunho · vai pra retorno
    if (redirectTo && draft.status !== "draft") {
      navigate(redirectTo, { replace: true });
      return;
    }
    // Impede pular etapas
    const savedIdx = stepIndex(draft.checkout_step || "resumo");
    const wantedIdx = stepIndex(currentStep);
    if (wantedIdx > savedIdx) {
      const target = CHECKOUT_STEPS[savedIdx];
      navigate(`/checkout/${orderId}/${target}`, { replace: true });
    }
  }, [draft, redirectTo, currentStep, navigate, orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando reserva…
      </div>
    );
  }

  if (error || !draft) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-muted-foreground mb-4">
            Não foi possível carregar este pedido. {error}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="text-sm underline text-foreground"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  if (redirectTo && draft.status !== "draft") {
    return <Navigate to={redirectTo} replace />;
  }

  const ctx: CheckoutCtx = { orderId: orderId!, draft, update, reload };
  const currentIdx = stepIndex(currentStep);

  return (
    <div className="min-h-screen bg-background">
      {/* Topo · marca + segurança */}
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate(`/loja/${draft.product?.slug ?? ""}`)}
            className="text-sm font-serif text-foreground hover:text-foreground/70"
          >
            ← {draft.product?.title ?? "Voltar"}
          </button>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Checkout seguro · InfinitePay
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-3">
          <ol className="flex items-center gap-1.5 sm:gap-2">
            {CHECKOUT_STEPS.map((s, i) => {
              const done = i < currentIdx;
              const active = i === currentIdx;
              return (
                <li key={s} className="flex-1 flex items-center gap-1.5 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 transition-colors ${
                      done
                        ? "bg-emerald-600 text-white"
                        : active
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  <span
                    className={`text-[11px] truncate ${
                      active ? "font-medium text-foreground" : "text-muted-foreground"
                    } hidden sm:inline`}
                  >
                    {LABELS[s]}
                  </span>
                  {i < CHECKOUT_STEPS.length - 1 && (
                    <div className={`h-px flex-1 ${done ? "bg-emerald-600/50" : "bg-border"}`} />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <Outlet context={ctx} />
      </main>
    </div>
  );
}
