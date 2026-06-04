import { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { Loader2, ShieldCheck, Check, ChevronDown } from "lucide-react";
import { useCheckoutDraft, type CheckoutDraft } from "@/hooks/useCheckoutDraft";
import { CHECKOUT_STEPS, stepIndex, type CheckoutStep } from "@/lib/checkout/helpers";
import CheckoutSidebar from "./CheckoutSidebar";

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
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  const currentStep = useMemo<CheckoutStep>(() => {
    const seg = location.pathname.split("/").pop() ?? "resumo";
    return (CHECKOUT_STEPS as readonly string[]).includes(seg) ? (seg as CheckoutStep) : "resumo";
  }, [location.pathname]);

  useEffect(() => {
    if (!draft || !orderId) return;
    if (redirectTo && draft.status !== "draft") {
      navigate(redirectTo, { replace: true });
      return;
    }
    const savedIdx = stepIndex(draft.checkout_step || "resumo");
    const wantedIdx = stepIndex(currentStep);
    if (wantedIdx > savedIdx) {
      const target = CHECKOUT_STEPS[savedIdx];
      navigate(`/checkout/${orderId}/${target}`, { replace: true });
    }
  }, [draft, redirectTo, currentStep, navigate, orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground bg-gradient-to-b from-background to-muted/30">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Preparando sua reserva…
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
          <button onClick={() => navigate(-1)} className="text-sm underline text-foreground">
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
  const isResumo = currentStep === "resumo";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Topo */}
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate(`/loja/${draft.product?.slug ?? ""}`)}
            className="text-sm font-serif text-foreground hover:text-foreground/70 truncate"
          >
            ← {draft.product?.title ?? "Voltar"}
          </button>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Checkout seguro ·</span> InfinitePay
          </div>
        </div>

        {/* Progress stepper */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-3">
          <ol className="flex items-center gap-1.5 sm:gap-2">
            {CHECKOUT_STEPS.map((s, i) => {
              const done = i < currentIdx;
              const active = i === currentIdx;
              return (
                <li key={s} className="flex-1 flex items-center gap-1.5 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 transition-all ${
                      done
                        ? "bg-emerald-600 text-white scale-100"
                        : active
                        ? "bg-foreground text-background ring-4 ring-foreground/10 scale-110"
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
                    <div className={`h-px flex-1 transition-colors ${done ? "bg-emerald-600/60" : "bg-border"}`} />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </header>

      {/* Mobile summary toggle (escondido no resumo, que já tem hero) */}
      {!isResumo && (
        <div className="lg:hidden max-w-6xl mx-auto px-4 sm:px-6 pt-4">
          <button
            onClick={() => setMobileSummaryOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-sm shadow-sm"
          >
            <div className="flex items-center gap-2 min-w-0">
              {draft.product?.cover_image_url && (
                <img src={draft.product.cover_image_url} alt="" className="w-9 h-9 rounded-md object-cover shrink-0" />
              )}
              <div className="min-w-0 text-left">
                <div className="font-medium text-[12px] truncate">{draft.product?.title}</div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {[draft.product?.destination, draft.product?.destination_country].filter(Boolean).join(" · ")}
                </div>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${mobileSummaryOpen ? "rotate-180" : ""}`} />
          </button>
          {mobileSummaryOpen && (
            <div className="mt-3">
              <CheckoutSidebar draft={draft} compact />
            </div>
          )}
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 lg:py-10">
        <div className="grid lg:grid-cols-[1fr_360px] gap-6 lg:gap-10 items-start">
          <div className="min-w-0">
            <Outlet context={ctx} />
          </div>
          <div className="hidden lg:block">
            <CheckoutSidebar draft={draft} />
          </div>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-4 sm:px-6 pb-10 pt-4 text-center text-[11px] text-muted-foreground">
        Atendimento humano por WhatsApp · respondemos em poucos minutos.
      </footer>
    </div>
  );
}
