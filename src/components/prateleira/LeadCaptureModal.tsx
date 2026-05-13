import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput, buildWhatsAppLink } from "@/components/ui/phone-input";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { Mail, User, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    slug: string;
    title: string;
    whatsapp_cta_text?: string | null;
    payment_terms?: string | null;
    installments_max?: number | null;
    installments_no_interest?: boolean | null;
    pix_discount_percent?: number | null;
    departure_date?: string | null;
  };
  agencyWhatsApp?: string;
}

function buildCtaMessage(p: Props["product"]): string {
  if (p.whatsapp_cta_text && p.whatsapp_cta_text.trim()) return p.whatsapp_cta_text.trim();

  const parts: string[] = [];
  parts.push(`Olá! Tenho interesse no pacote "${p.title}".`);

  const pay: string[] = [];
  if (p.installments_max && p.installments_max > 1) {
    pay.push(`parcelado em até ${p.installments_max}x${p.installments_no_interest ? " sem juros" : ""}`);
  }
  if (p.pix_discount_percent && p.pix_discount_percent > 0) {
    pay.push(`com ${p.pix_discount_percent}% de desconto no PIX`);
  }
  if (p.payment_terms && p.payment_terms.trim() && pay.length === 0) {
    const t = p.payment_terms.trim().replace(/\s+/g, " ");
    pay.push(t.length > 80 ? t.slice(0, 77) + "..." : t);
  }
  if (pay.length) parts.push(`Forma de pagamento: ${pay.join(" · ")}.`);

  if (p.departure_date) {
    try {
      const d = new Date(p.departure_date + "T00:00:00");
      parts.push(`Saída prevista: ${d.toLocaleDateString("pt-BR")}.`);
    } catch {}
  }

  parts.push("Pode me passar as próximas etapas?");
  // Mantém mensagem curta para evitar bug em link de WhatsApp
  let msg = parts.join(" ");
  if (msg.length > 380) msg = msg.slice(0, 377) + "...";
  return msg;
}

export default function LeadCaptureModal({ open, onOpenChange, product, agencyWhatsApp }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("BR");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Informe seu nome");
    if (!phone || phoneDigits.length < 8) return toast.error("Informe um WhatsApp válido");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("E-mail inválido");

    setSaving(true);
    try {
      const utm = new URLSearchParams(window.location.search);
      await (supabase as any).from("prateleira_leads").insert({
        product_id: product.id,
        product_slug: product.slug,
        product_title: product.title,
        name: name.trim(),
        email: email.trim() || null,
        phone,
        country_code: phoneCountry,
        message: message.trim() || null,
        device: /mobile|android|iphone/i.test(navigator.userAgent) ? "mobile" : "desktop",
        user_agent: navigator.userAgent.slice(0, 500),
        utm_source: utm.get("utm_source"),
        utm_medium: utm.get("utm_medium"),
        utm_campaign: utm.get("utm_campaign"),
        utm_content: utm.get("utm_content"),
        utm_term: utm.get("utm_term"),
      });

      // Increment lead_count via RPC-less update
      await (supabase as any).rpc("noop").catch(() => null);
      await (supabase as any).from("experience_products")
        .select("lead_count").eq("id", product.id).single()
        .then(({ data }: any) => {
          if (data) (supabase as any).from("experience_products")
            .update({ lead_count: (data.lead_count ?? 0) + 1 }).eq("id", product.id);
        });

      toast.success("Recebemos seu interesse! Em instantes a NatLeva entra em contato.");

      // Open WhatsApp
      if (agencyWhatsApp) {
        const ctaMsg = product.whatsapp_cta_text || `Olá! Tenho interesse no produto "${product.title}" da Prateleira NatLeva.`;
        window.open(buildWhatsAppLink(agencyWhatsApp, ctaMsg), "_blank");
      }

      onOpenChange(false);
      setName(""); setEmail(""); setPhone(""); setPhoneDigits(""); setMessage("");
    } catch (err: any) {
      toast.error("Erro ao enviar", { description: err?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tenho interesse</DialogTitle>
          <DialogDescription>
            Preencha seus dados que a gente entra em contato com todas as condições especiais.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Nome
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> E-mail (opcional)
            </label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80 flex items-center gap-1.5">
              <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
            </label>
            <PhoneInput
              value={phone}
              countryCode={phoneCountry}
              onChange={(e164, parts) => { setPhone(e164); setPhoneDigits(parts.nationalDigits); }}
              onCountryChange={(c) => setPhoneCountry(c.code)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground/80">Mensagem (opcional)</label>
            <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Datas, número de pessoas, dúvidas..." />
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : <><Send className="w-4 h-4 mr-2" /> Quero saber mais</>}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
