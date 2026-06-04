import { useEffect, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logoNatleva from "@/assets/logo-natleva.webp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Mail, Lock } from "lucide-react";
import { toast } from "sonner";

export default function VitrineLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return;
      const { data } = await supabase
        .from("affiliates")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (data) navigate("/vitrine", { replace: true });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setLoading(false);
    if (error) return toast.error(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos" : error.message);
    const from = (location.state as any)?.from?.pathname || "/vitrine";
    navigate(from, { replace: true });
  };

  const handleResend = async () => {
    if (!email.trim()) return toast.error("Informe seu e-mail primeiro");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/vitrine/login` },
    });
    if (error) return toast.error(error.message);
    toast.success("E-mail de confirmação reenviado");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-background via-background to-amber-50/30 dark:to-amber-950/10">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border/60 bg-card/95 backdrop-blur-md shadow-[0_30px_80px_-20px_rgba(0,0,0,0.25)] overflow-hidden">
          <div className="px-7 pt-8 pb-7">
            <img src={logoNatleva} alt="NatLeva" className="h-9 mx-auto mb-6 dark:invert" />
            <div className="flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400 font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Vitrine NatLeva · Afiliados
            </div>
            <h1 className="font-serif text-2xl text-foreground text-center">Bem-vindo de volta</h1>
            <p className="text-sm text-muted-foreground text-center mt-1">Acesse a vitrine e veja seus bônus de indicação</p>

            <form onSubmit={handleSubmit} className="space-y-4 mt-7">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide flex items-center gap-1.5"><Mail className="w-3 h-3" /> E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-wide flex items-center gap-1.5"><Lock className="w-3 h-3" /> Senha</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" required minLength={6} />
              </div>

              <Button type="submit" disabled={loading} className="w-full h-11 mt-2 text-sm font-semibold">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Entrando...</> : "Entrar"}
              </Button>
            </form>

            <button onClick={handleResend} className="text-[11px] text-muted-foreground hover:text-foreground w-full text-center mt-4 transition-colors">
              Não recebeu o e-mail de confirmação? Reenviar
            </button>

            <div className="mt-6 pt-5 border-t border-border/50 text-center text-sm">
              <span className="text-muted-foreground">Ainda não é afiliado? </span>
              <Link to="/vitrine/cadastro" className="text-amber-600 dark:text-amber-400 font-semibold hover:underline">
                Cadastre-se aqui
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
