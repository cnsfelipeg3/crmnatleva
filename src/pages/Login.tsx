import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logoNatleva from "@/assets/logo-natleva.webp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plane } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isSignUp) {
      const { error: err } = await signUp(email, password, fullName);
      if (err) {
        setError(err);
      } else {
        navigate(from, { replace: true });
      }
    } else {
      const { error: err } = await signIn(email, password);
      if (err) {
        setError(err);
      } else {
        navigate(from, { replace: true });
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-10">
          {[...Array(5)].map((_, i) => (
            <Plane
              key={i}
              className="absolute text-sidebar-accent-foreground"
              style={{
                width: `${40 + i * 20}px`,
                height: `${40 + i * 20}px`,
                top: `${15 + i * 18}%`,
                left: `${10 + i * 15}%`,
                transform: `rotate(${-30 + i * 15}deg)`,
              }}
            />
          ))}
        </div>
        <div className="relative z-10 text-center px-12">
          <img src={logoNatleva} alt="NatLeva Viagens" className="h-16 mx-auto mb-8 brightness-0 invert" />
          <h1 className="text-3xl font-serif text-sidebar-accent-foreground mb-4">Sistema Interno</h1>
          <p className="text-sidebar-accent-foreground/70 text-lg">CRM de Vendas & Inteligência Operacional</p>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="lg:hidden mb-8 text-center">
            <img src={logoNatleva} alt="NatLeva" className="h-12 mx-auto mb-4" />
          </div>
          <h2 className="text-2xl font-serif text-foreground mb-1">
            {isSignUp ? "Criar conta" : "Bem-vindo de volta"}
          </h2>
          <p className="text-muted-foreground mb-8">
            {isSignUp ? "Cadastre-se na NatLeva" : "Acesse sua conta NatLeva"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input
                  id="fullName"
                  placeholder="Seu nome"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={isSignUp}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@natleva.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Carregando..." : isSignUp ? "Criar conta" : "Entrar"}
            </Button>
          </form>

          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground w-full text-center transition-colors"
          >
            {isSignUp ? "Já tem conta? Entrar" : "Não tem conta? Criar agora"}
          </button>
        </div>
      </div>
    </div>
  );
}
