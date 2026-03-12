import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plane, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import logoNatleva from "@/assets/logo-natleva-clean.png";

export default function PortalLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error("Credenciais inválidas. Verifique e tente novamente.");
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Erro ao verificar acesso.");
      setLoading(false);
      return;
    }

    const { data: portal } = await supabase
      .from("portal_access" as any)
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!portal) {
      toast.error("Você não tem acesso ao portal de viagens.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    toast.success("Bem-vindo ao seu portal de viagens!");
    navigate("/portal");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Informe seu e-mail."); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/portal/login",
    });
    if (error) toast.error("Erro ao enviar e-mail.");
    else toast.success("E-mail de recuperação enviado!");
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(158,45%,6%)] via-[hsl(160,30%,12%)] to-[hsl(200,40%,10%)]" />

      {/* Ambient lights */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-accent/15 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-info/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-warning/8 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "4s" }} />
      </div>

      {/* Grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-8 md:p-10 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <img src={logoNatleva} alt="NatLeva" className="h-12 mb-5 brightness-0 invert opacity-90" />
            <h1 className="text-2xl font-bold text-white tracking-tight font-sans">Minhas Viagens</h1>
            <p className="text-white/40 text-sm mt-1.5">
              {forgotMode ? "Recupere seu acesso" : "Acesse seu portal exclusivo"}
            </p>
          </div>

          <form onSubmit={forgotMode ? handleForgotPassword : handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-white/60 text-xs uppercase tracking-wider font-medium">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/20 pl-10 h-12 rounded-xl focus:border-accent focus:ring-accent/20 transition-all"
                  required
                />
              </div>
            </div>

            {!forgotMode && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                <Label className="text-white/60 text-xs uppercase tracking-wider font-medium">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/20 pl-10 pr-10 h-12 rounded-xl focus:border-accent focus:ring-accent/20 transition-all"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </motion.div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-accent to-[hsl(158,60%,30%)] hover:from-[hsl(160,60%,48%)] hover:to-[hsl(158,60%,35%)] text-white font-semibold text-base shadow-lg shadow-accent/20 transition-all duration-300"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Aguarde...
                </span>
              ) : forgotMode ? "Enviar link de recuperação" : (
                <span className="flex items-center gap-2"><Plane className="h-4 w-4" /> Entrar</span>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => { setForgotMode(!forgotMode); }} className="text-white/35 hover:text-white/60 text-sm transition-colors">
              {forgotMode ? "← Voltar ao login" : "Esqueci minha senha"}
            </button>
          </div>
        </div>

        <p className="text-center text-white/15 text-xs mt-6">Portal exclusivo NatLeva Viagens © {new Date().getFullYear()}</p>
      </motion.div>
    </div>
  );
}
