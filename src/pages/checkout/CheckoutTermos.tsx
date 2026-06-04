import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { CheckoutCtx } from "@/components/checkout/CheckoutLayout";
import { TERMS_MARKDOWN, TERMS_TITLE } from "@/lib/checkout/termsContent";
import { TERMS_VERSION } from "@/lib/checkout/helpers";

function renderMarkdown(md: string) {
  return md.split(/\n\n+/).map((para, i) => {
    const m = para.match(/^\*\*(.+?)\*\*$/);
    if (m) return <h3 key={i} className="font-semibold text-foreground mt-4 mb-1 text-sm">{m[1]}</h3>;
    return <p key={i} className="text-sm text-muted-foreground leading-relaxed">{para}</p>;
  });
}

export default function CheckoutTermos() {
  const { orderId, draft, update } = useOutletContext<CheckoutCtx>();
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState<boolean>(!!draft.terms_accepted_at);
  const [saving, setSaving] = useState(false);

  const onContinue = async () => {
    if (!accepted) return;
    setSaving(true);
    try {
      await update({ step: "termos", terms_version: TERMS_VERSION });
      navigate(`/checkout/${orderId}/pagamento`);
    } catch (e: any) {
      toast.error("Não foi possível registrar a aceitação", { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif text-xl mb-1 flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-600" /> {TERMS_TITLE}
        </h1>
        <p className="text-sm text-muted-foreground">
          Leia com atenção. Versão {TERMS_VERSION}.
        </p>
      </div>

      <Card className="p-5 sm:p-6 max-h-[55vh] overflow-y-auto space-y-2">
        {renderMarkdown(TERMS_MARKDOWN)}
      </Card>

      <Card className="p-4 flex items-start gap-3">
        <Checkbox
          id="accept-terms"
          checked={accepted}
          onCheckedChange={(v) => setAccepted(v === true)}
          className="mt-0.5"
        />
        <label htmlFor="accept-terms" className="text-sm leading-snug cursor-pointer select-none">
          Li e aceito os Termos e Condições da reserva.
        </label>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate(`/checkout/${orderId}/passageiros`)} disabled={saving}>
          Voltar
        </Button>
        <Button onClick={onContinue} disabled={!accepted || saving} className="flex-1 h-12 font-semibold">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando…</> : "Continuar"}
        </Button>
      </div>
    </div>
  );
}
