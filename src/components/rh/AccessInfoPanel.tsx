import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Key, Mail, Clock, CheckCircle2, Loader2, Copy, AlertCircle, Pencil, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type AccessInfo = {
  found: boolean;
  email?: string;
  created_at?: string;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
};

const PRESIDENT_EMAILS = ["nathalia@natleva.com"];

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
  const { user, profile, role } = useAuth();
  const callerEmail = (profile?.email || user?.email || "").toLowerCase();
  const canManage = role === "admin" || PRESIDENT_EMAILS.includes(callerEmail);

  const [info, setInfo] = useState<AccessInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit states
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  const [editingPassword, setEditingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const fetchInfo = () => {
    setLoading(true); setError(null);
    supabase.functions
      .invoke("get-employee-access", { body: { user_id: userId } })
      .then(({ data, error }) => {
        if (error) { setError(error.message); return; }
        if (data?.error) { setError(data.error); return; }
        setInfo(data as AccessInfo);
        setNewEmail((data as AccessInfo)?.email || "");
      })
      .finally(() => setLoading(false));
  };

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
        setNewEmail((data as AccessInfo)?.email || "");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [userId]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const saveEmail = async () => {
    if (!newEmail.trim() || !/.+@.+\..+/.test(newEmail)) {
      toast.error("E-mail inválido"); return;
    }
    setSavingEmail(true);
    const { data, error } = await supabase.functions.invoke("update-employee-access", {
      body: { user_id: userId, new_email: newEmail.trim().toLowerCase() },
    });
    setSavingEmail(false);
    if (error || data?.error) {
      toast.error(error?.message || data?.error || "Erro ao atualizar login");
      return;
    }
    toast.success("Login atualizado");
    setEditingEmail(false);
    fetchInfo();
  };

  const savePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("Senha precisa ter ao menos 6 caracteres"); return;
    }
    setSavingPwd(true);
    const { data, error } = await supabase.functions.invoke("update-employee-access", {
      body: { user_id: userId, new_password: newPassword },
    });
    setSavingPwd(false);
    if (error || data?.error) {
      toast.error(error?.message || data?.error || "Erro ao redefinir senha");
      return;
    }
    toast.success("Senha redefinida com sucesso");
    copy(newPassword);
    toast.message("Nova senha copiada para a área de transferência");
    setEditingPassword(false);
    setNewPassword("");
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    let p = "";
    for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)];
    setNewPassword(p);
    setShowPwd(true);
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
          {/* LOGIN */}
          <div className="flex items-start gap-3">
            <Mail className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Login (e-mail)</p>
              {editingEmail ? (
                <div className="flex flex-col sm:flex-row gap-2 mt-1">
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="h-9"
                    placeholder="novo.email@dominio.com"
                  />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={saveEmail} disabled={savingEmail}>
                      {savingEmail ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salvar"}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => { setEditingEmail(false); setNewEmail(info.email || ""); }}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <p className="text-sm font-medium truncate">{info.email}</p>
                  <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs"
                    onClick={() => info.email && copy(info.email)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                  {canManage && (
                    <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs"
                      onClick={() => setEditingEmail(true)}>
                      <Pencil className="w-3 h-3 mr-1" /> Editar
                    </Button>
                  )}
                </div>
              )}
              {info.email_confirmed_at && !editingEmail && (
                <p className="text-[10px] text-emerald-600 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" /> E-mail confirmado
                </p>
              )}
            </div>
          </div>

          {/* SENHA */}
          {canManage && (
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Senha</p>
                {editingPassword ? (
                  <div className="space-y-2 mt-1">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showPwd ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="h-9 pr-9"
                          placeholder="Mínimo 6 caracteres"
                        />
                        <button type="button" onClick={() => setShowPwd((s) => !s)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <Button type="button" size="sm" variant="outline" onClick={generatePassword}>
                        Gerar
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={savePassword} disabled={savingPwd}>
                        {savingPwd ? <Loader2 className="w-3 h-3 animate-spin" /> : "Redefinir senha"}
                      </Button>
                      <Button type="button" size="sm" variant="ghost"
                        onClick={() => { setEditingPassword(false); setNewPassword(""); }}>
                        Cancelar
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      A nova senha será copiada automaticamente para você compartilhar com o colaborador.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm font-medium tracking-widest">••••••••</p>
                    <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs"
                      onClick={() => setEditingPassword(true)}>
                      <Pencil className="w-3 h-3 mr-1" /> Redefinir
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ÚLTIMO ACESSO */}
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

      {!canManage && (
        <p className="text-[11px] text-muted-foreground px-1">
          🔒 Apenas presidente/admin pode editar login ou redefinir senha.
        </p>
      )}
    </div>
  );
}
