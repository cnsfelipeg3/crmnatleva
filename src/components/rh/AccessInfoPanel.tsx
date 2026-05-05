import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Key, Mail, Clock, CheckCircle2, Loader2, Copy, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type AccessInfo = {
  found: boolean;
  email?: string;
  created_at?: string;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
};

function formatDateTime(iso?: string | null) {
  if (!iso) return "Nunca acessou";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function relativeTime(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `há ${days} dia${days > 1 ? "s" : ""}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} ${months > 1 ? "meses" : "mês"}`;
  return `há ${Math.floor(months / 12)} ano${Math.floor(months / 12) > 1 ? "s" : ""}`;
}

export default function AccessInfoPanel({ userId }: { userId: string }) {
  const [info, setInfo] = useState<AccessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    supabase.functions
      .invoke("get-employee-access", { body: { user_id: userId } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { setError(error.message); return; }
        if (data?.error) { setError(data.error); return; }
        setInfo(data as AccessInfo);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [userId]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 p-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando dados de acesso...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
        <div>
          <p className="text-sm font-medium text-destructive">Não foi possível carregar os dados</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!info?.found) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-1">
        <p className="text-sm font-medium text-amber-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> Vínculo órfão
        </p>
        <p className="text-xs text-muted-foreground">
          Este colaborador está vinculado a um usuário (ID: {userId.slice(0, 8)}...) que não existe mais no sistema de autenticação.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-700">Usuário ativo no sistema</p>
        </div>

        <div className="grid gap-3 pt-1">
          <div className="flex items-start gap-3">
            <Mail className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Login (e-mail)</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-sm font-medium truncate">{info.email}</p>
                <Button
                  type="button" variant="ghost" size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => info.email && copy(info.email)}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              {info.email_confirmed_at && (
                <p className="text-[10px] text-emerald-600 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" /> E-mail confirmado
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Último acesso</p>
              <p className="text-sm font-medium">{formatDateTime(info.last_sign_in_at)}</p>
              {info.last_sign_in_at && (
                <p className="text-[10px] text-muted-foreground">{relativeTime(info.last_sign_in_at)}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Conta criada em</p>
              <p className="text-sm font-medium">{formatDateTime(info.created_at)}</p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground px-1">
        🔒 Por segurança, senhas nunca são exibidas · ficam armazenadas com criptografia bcrypt e não podem ser lidas por ninguém. Se o colaborador esquecer a senha, ele deve usar "Esqueci minha senha" na tela de login.
      </p>
    </div>
  );
}
