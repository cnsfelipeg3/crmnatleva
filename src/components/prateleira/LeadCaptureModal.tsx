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
  };
  agencyWhatsApp?: string;
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
