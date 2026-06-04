import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Loader2, MessageCircle, Link as LinkIcon, Zap, CreditCard, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildWhatsAppLink } from "@/components/ui/phone-input";
import { DEFAULT_AGENCY_WHATSAPP } from "@/lib/natleva/whatsapp";

type Intent = "pix" | "cartao" | "entrada";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productTitle: string;
  hasEntryPlan?: boolean;
}

const OPTIONS: Array<{ id: Intent; icon: typeof Zap; label: string }> = [
  { id: "pix", icon: Zap, label: "Pix (à vista)" },
  { id: "cartao", icon: CreditCard, label: "Cartão" },
  { id: "entrada", icon: Wallet, label: "Pagar entrada" },
];

export default function GeneratePaymentLinkDialog({
  open,
  onOpenChange,
  productId,
  productTitle,
  hasEntryPlan,
}: Props) {
  const [intent, setIntent] = useState<Intent>("cartao");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  const reset = () => {
    setLink(null);
    setIntent("cartao");
    setName(""); setEmail(""); setPhone("");
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("infinitepay-create-link", {
        body: {
          product_id: productId,
          payment_intent: intent,
          buyer: (name || email || phone)
            ? { name: name || undefined, email: email || undefined, phone: phone || undefined }
            : undefined,
          source: "link_avulso",
        },
      });
      if (error) throw error;
      const url = (data as { checkout_url?: string })?.checkout_url;
      if (!url) throw new Error("Link não retornado");
      setLink(url);
      toast.success("Link gerado!");
    } catch (e: any) {
      toast.error("Falha ao gerar link", { description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const sendWhats = () => {
    if (!link) return;
    const msg = `Olá! Segue o link de pagamento do pacote "${productTitle}":\n\n${link}\n\nQualquer dúvida, estou por aqui.`;
    const wpp = phone?.trim() || DEFAULT_AGENCY_WHATSAPP;
    window.open(buildWhatsAppLink(wpp, msg), "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4" /> Gerar link de pagamento
          </DialogTitle>
          <DialogDescription className="truncate">{productTitle}</DialogDescription>
        </DialogHeader>

        {!link ? (
          <div className="space-y-4">
            <div>
              <Label className="text-xs mb-2 block">Método</Label>
              <div className="grid grid-cols-3 gap-2">
                {OPTIONS.filter((o) => o.id !== "entrada" || hasEntryPlan).map((o) => {
                  const Icon = o.icon;
                  const active = intent === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setIntent(o.id)}
                      className={`rounded-lg border px-2 py-2.5 flex flex-col items-center gap-1 text-[11px] transition-all ${
                        active ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <Label htmlFor="ipay-name" className="text-xs">Nome do cliente (opcional)</Label>
                <Input id="ipay-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="ipay-email" className="text-xs">E-mail</Label>
                  <Input id="ipay-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="ipay-phone" className="text-xs">WhatsApp</Label>
                  <Input id="ipay-phone" placeholder="5511..." value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>
            </div>
            <Button onClick={generate} disabled={loading} className="w-full">
              {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gerando…</>) : "Gerar link"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">Link pronto:</div>
            <div className="text-xs break-all rounded-lg bg-muted p-3 border border-border/40">{link}</div>
            <div className="flex gap-2">
              <Button onClick={copy} variant="outline" className="flex-1">
                <Copy className="w-4 h-4 mr-2" /> Copiar
              </Button>
              <Button onClick={sendWhats} className="flex-1">
                <MessageCircle className="w-4 h-4 mr-2" /> Enviar WhatsApp
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="w-full" onClick={reset}>
              Gerar outro
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
