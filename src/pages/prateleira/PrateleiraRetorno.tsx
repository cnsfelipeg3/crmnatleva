import { useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock, ExternalLink, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildWhatsAppLink } from "@/components/ui/phone-input";
import { DEFAULT_AGENCY_WHATSAPP } from "@/lib/natleva/whatsapp";

export default function PrateleiraRetorno() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const receiptUrl = params.get("receipt_url");
  const captureMethod = params.get("capture_method");
  const transactionNsu = params.get("transaction_nsu");
  const orderNsu = params.get("order_nsu");

  const confirmed = !!(receiptUrl || transactionNsu);

  useEffect(() => {
    document.title = confirmed ? "Pagamento recebido · NatLeva" : "Confirmando pagamento · NatLeva";
  }, [confirmed]);

  const methodLabel =
    captureMethod === "pix" ? "Pix" : captureMethod === "credit_card" ? "Cartão de crédito" : null;

  const wppMsg = `Olá! Acabei de finalizar o pagamento do pacote${slug ? ` (${slug})` : ""}. Pode confirmar o recebimento e me passar os próximos passos?`;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <Card className="max-w-lg w-full p-8 text-center space-y-5">
        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${confirmed ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}`}>
          {confirmed ? <CheckCircle2 className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
        </div>
        <div>
          <h1 className="font-serif text-2xl">
            {confirmed ? "Pagamento recebido!" : "Estamos confirmando seu pagamento"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {confirmed
              ? "Recebemos a confirmação da InfinitePay. Nossa equipe já foi notificada e em breve entra em contato com os próximos passos."
              : "Assim que o pagamento for confirmado, você receberá os detalhes pelo WhatsApp e e-mail."}
          </p>
        </div>

        {(methodLabel || transactionNsu) && (
          <div className="text-xs text-muted-foreground border border-border/40 rounded-lg p-3 space-y-1 text-left">
            {methodLabel && <div><span className="font-medium text-foreground">Método:</span> {methodLabel}</div>}
            {transactionNsu && <div className="truncate"><span className="font-medium text-foreground">Transação:</span> {transactionNsu}</div>}
            {orderNsu && <div className="truncate"><span className="font-medium text-foreground">Pedido:</span> {orderNsu}</div>}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {receiptUrl && (
            <Button asChild className="w-full">
              <a href={receiptUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" /> Ver comprovante
              </a>
            </Button>
          )}
          <Button asChild variant="outline" className="w-full">
            <a href={buildWhatsAppLink(DEFAULT_AGENCY_WHATSAPP, wppMsg)} target="_blank" rel="noopener noreferrer">
              Falar com a Nath no WhatsApp
            </a>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link to={slug ? `/loja/${slug}` : "/loja"}>
              <Home className="w-4 h-4 mr-2" /> {slug ? "Voltar para o pacote" : "Ver outros pacotes"}
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
