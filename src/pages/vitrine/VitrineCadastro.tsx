import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logoNatleva from "@/assets/logo-natleva.webp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { Loader2, Sparkles, Mail, Lock, User, MailCheck } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { toast } from "sonner";

export default function VitrineCadastro() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("BR");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return toast.error("Informe seu nome completo");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("E-mail inválido");
    if (password.length < 6) return toast.error("Senha precisa ter ao menos 6 caracteres");
    if (phoneDigits.length < 8) return toast.error("WhatsApp inválido");

    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.functions.invoke("affiliate-self-signup", {
        body: {
          full_name: fullName.trim(),
          email: cleanEmail,
          password,
          phone,
        },
      });
      if (error) throw new Error((data as any)?.error || error.message);
      if ((data as any)?.error) throw new Error((data as any).error);

      setDone(true);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao criar cadastro");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-background via-background to-amber-50/30 dark:to-amber-950/10">
        <div className="max-w-md w-full text-center space-y-5 p-8 rounded-2xl border border-border/60 bg-card/95 shadow-xl">
          <img src={logoNatleva} alt="NatLeva" className="h-9 mx-auto dark:invert" />
          <div className="flex justify-center"><MailCheck className="w-14 h-14 text-emerald-500" /></div>
          <h1 className="font-serif text-2xl text-foreground">Quase lá!</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Enviamos um e-mail de confirmação para <strong className="text-foreground">{email}</strong>. Clique no link pra ativar sua conta.
          </p>
          <p className="text-xs text-muted-foreground/80">
            Depois da confirmação, nosso time analisa seu cadastro de afiliado · você recebe um aviso quando o acesso for liberado.
          </p>
          <Button onClick={() => navigate("/vitrine/login")} className="w-full">Ir para o login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-background via-background to-amber-50/30 dark:to-amber-950/10">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md shadow-[0_30px_80px_-20px_rgba(0,0,0,0.25)] overflow-hidden">
          <div className="px-7 pt-8 pb-7">
            <img src={logoNatleva} alt="NatLeva" className="h-9 mx-auto mb-6 dark:invert" />
            <div className="flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400 font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Programa de Afiliados
            </div>
            <h1 className="font-serif text-2xl text-foreground text-center">Crie sua conta</h1>
            <p className="text-sm text-muted-foreground text-center mt-1">Indique viagens e ganhe comissão no Pix no mesmo dia</p>

            <form onSubmit={handleSubmit} className="space-y-4 mt-7">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide flex items-center gap-1.5"><User className="w-3 h-3" /> Nome completo</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Como você quer ser chamado" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide flex items-center gap-1.5"><Mail className="w-3 h-3" /> E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide flex items-center gap-1.5"><WhatsAppIcon className="w-3 h-3 text-emerald-600" /> WhatsApp</Label>
                <PhoneInput
                  value={phone}
                  countryCode={phoneCountry}
                  onChange={(e164, parts) => { setPhone(e164); setPhoneDigits(parts.nationalDigits); }}
                  onCountryChange={(c) => setPhoneCountry(c.code)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide flex items-center gap-1.5"><Lock className="w-3 h-3" /> Senha</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} />
              </div>

              <Button type="submit" disabled={loading} className="w-full h-11 mt-2 text-sm font-semibold">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando conta...</> : "Criar conta de afiliado"}
              </Button>

              <p className="text-[11px] text-muted-foreground/80 text-center pt-1">
                Após confirmar seu e-mail, seu cadastro passa por uma análise rápida do nosso time.
              </p>
            </form>

            <div className="mt-6 pt-5 border-t border-border/50 text-center text-sm">
              <span className="text-muted-foreground">Já tem conta? </span>
              <Link to="/vitrine/login" className="text-amber-600 dark:text-amber-400 font-semibold hover:underline">
                Fazer login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
