import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { Mail, User, Loader2, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Props {
  productTitle?: string;
  destination?: string;
  coverImage?: string;
  loading?: boolean;
  onSubmit: (data: { name: string; email: string; phone: string; countryCode: string }) => void;
}

export default function PrateleiraEmailGate({ productTitle, destination, coverImage, loading, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("BR");
  const [phoneDigits, setPhoneDigits] = useState("");

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Informe seu nome");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("Informe um e-mail válido");
    if (!phone || phoneDigits.length < 8) return toast.error("Informe um WhatsApp válido");
    onSubmit({ name: name.trim(), email: email.trim().toLowerCase(), phone, countryCode: phoneCountry });
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-10 bg-background overflow-hidden">
      {/* Background cinematográfico */}
      {coverImage && (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center scale-110 blur-2xl opacity-40"
            style={{ backgroundImage: `url(${coverImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/85 to-background" />
        </>
      )}

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        <div className="rounded-2xl border border-border/70 bg-card/95 backdrop-blur-md shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] overflow-hidden">
          {coverImage && (
            <div className="relative h-40 overflow-hidden">
              <img src={coverImage} alt={productTitle} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
            </div>
          )}

          <div className="px-6 sm:px-8 pt-6 pb-7">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400 font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Acesso exclusivo NatLeva
            </div>
            <h1 className="font-serif text-[22px] sm:text-2xl leading-tight text-foreground">
              {productTitle || "Sua experiência"}
            </h1>
            {destination && (
              <p className="text-sm text-muted-foreground mt-1">{destination}</p>
            )}
            <p className="text-sm text-foreground/80 mt-4 leading-relaxed">
              Pra liberar todos os detalhes, condições e o valor especial, deixa só seu contato · a gente te avisa de qualquer ajuste de preço ou disponibilidade.
            </p>

            <form onSubmit={handle} className="space-y-3.5 mt-6">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-foreground/70 flex items-center gap-1.5 uppercase tracking-wide">
                  <User className="w-3 h-3" /> Nome
                </label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" autoFocus />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-foreground/70 flex items-center gap-1.5 uppercase tracking-wide">
                  <Mail className="w-3 h-3" /> E-mail
                </label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-foreground/70 flex items-center gap-1.5 uppercase tracking-wide">
                  <WhatsAppIcon className="w-3 h-3 text-emerald-600" /> WhatsApp
                </label>
                <PhoneInput
                  value={phone}
                  countryCode={phoneCountry}
                  onChange={(e164, parts) => { setPhone(e164); setPhoneDigits(parts.nationalDigits); }}
                  onCountryChange={(c) => setPhoneCountry(c.code)}
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full h-11 mt-2 text-sm font-semibold">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Liberando acesso...</> : <>Ver experiência completa</>}
              </Button>

              <p className="text-[11px] text-muted-foreground/80 text-center flex items-center justify-center gap-1.5 pt-1">
                <Lock className="w-3 h-3" /> Seus dados ficam protegidos · sem spam
              </p>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
