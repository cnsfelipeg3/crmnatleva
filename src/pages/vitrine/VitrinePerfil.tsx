import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAffiliateProfile } from "@/components/vitrine/useAffiliateProfile";
import { UserCog, Mail, Phone, CheckCircle2, KeyRound, BellRing, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { smartCapitalizeName } from "@/lib/nameUtils";
import { validatePixKey, formatPixKeyMasked, type PixKeyType } from "@/lib/pixValidation";

const TYPE_LABELS: Record<PixKeyType, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "E-mail",
  phone: "Telefone",
  random: "Chave aleatória",
};

const PLACEHOLDERS: Record<PixKeyType, string> = {
  cpf: "000.000.000-00",
  cnpj: "00.000.000/0000-00",
  email: "voce@email.com",
  phone: "(11) 99999-9999",
  random: "Cole a chave aleatória (UUID)",
};

export default function VitrinePerfil() {
  const { data: affiliate, isLoading } = useAffiliateProfile();
  const qc = useQueryClient();

  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>("cpf");
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (affiliate) {
      setPixKey(affiliate.pix_key || "");
      setPixKeyType((affiliate.pix_key_type as PixKeyType) || "cpf");
      setTouched(false);
    }
  }, [affiliate?.id]);

  const validation = validatePixKey(pixKeyType, pixKey);
  const showError = touched && !validation.ok && pixKey.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!validation.ok) {
      toast.error(validation.error || "Chave PIX inválida.");
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmedSave = async () => {
    if (!affiliate) return;
    setSaving(true);
    const { error } = await supabase
      .from("affiliates")
      .update({
        pix_key: validation.normalized,
        pix_key_type: pixKeyType,
      })
      .eq("id", affiliate.id);
    setSaving(false);
    setConfirmOpen(false);
    if (error) {
      toast.error("Não foi possível salvar: " + error.message);
      return;
    }
    toast.success("Chave PIX salva com sucesso!", {
      description: "Você já pode solicitar saques na aba Comissões.",
    });
    qc.invalidateQueries({ queryKey: ["affiliate-self-profile"] });
  };

  const handleTypeChange = (v: PixKeyType) => {
    setPixKeyType(v);
    setPixKey("");
    setTouched(false);
  };

  const handleKeyChange = (raw: string) => {
    if (pixKeyType === "cpf" || pixKeyType === "cnpj" || pixKeyType === "phone") {
      setPixKey(formatPixKeyMasked(pixKeyType, raw));
    } else {
      setPixKey(raw);
    }
  };

  const isSameAsSaved = affiliate?.pix_key === validation.normalized && affiliate?.pix_key_type === pixKeyType;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="font-serif text-2xl sm:text-3xl">Meu perfil</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Seus dados pessoais e a chave PIX onde você recebe as comissões.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCog className="h-4 w-4" /> Dados pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome completo</Label>
              <Input value={smartCapitalizeName(affiliate?.full_name)} disabled />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> E-mail</Label>
              <Input value={affiliate?.email || ""} disabled />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> Telefone</Label>
              <Input value={affiliate?.phone || ""} disabled />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status do cadastro</Label>
              <div className="h-9 flex items-center">
                {affiliate?.status === "approved" ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1.5">
                    <CheckCircle2 className="h-3 w-3" /> Aprovado
                  </Badge>
                ) : (
                  <Badge variant="outline">{affiliate?.status || "·"}</Badge>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Seu código de afiliado</Label>
              <Input value={affiliate?.ref_code || ""} disabled className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Comissão padrão</Label>
              <Input value={`${affiliate?.commission_percent ?? 10}%`} disabled />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Pra alterar nome, e-mail ou telefone, entre em contato com a equipe NatLeva.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-emerald-700" /> Chave PIX para receber
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {affiliate?.pix_key && (
              <div className="rounded-lg border bg-emerald-50 border-emerald-200 px-3 py-2.5 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-700 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <p className="text-emerald-800 font-medium">Chave atual cadastrada</p>
                  <p className="text-emerald-700/80 font-mono text-[11px] mt-0.5">
                    {TYPE_LABELS[(affiliate.pix_key_type as PixKeyType) || "cpf"]} · {affiliate.pix_key}
                  </p>
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de chave</Label>
                <Select value={pixKeyType} onValueChange={(v) => handleTypeChange(v as PixKeyType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="cnpj">CNPJ</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="phone">Telefone</SelectItem>
                    <SelectItem value="random">Chave aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Chave PIX</Label>
                <Input
                  value={pixKey}
                  onChange={(e) => handleKeyChange(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder={PLACEHOLDERS[pixKeyType]}
                  aria-invalid={showError}
                  className={showError ? "border-rose-400 focus-visible:ring-rose-300" : ""}
                  maxLength={pixKeyType === "email" ? 100 : pixKeyType === "random" ? 40 : 30}
                />
                {showError ? (
                  <p className="text-[11px] text-rose-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {validation.error}
                  </p>
                ) : validation.ok && touched ? (
                  <p className="text-[11px] text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Chave válida
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    {pixKeyType === "phone" && "Inclua DDD. Ex.: (11) 99999-9999"}
                    {pixKeyType === "cpf" && "Apenas o titular da conta deve cadastrar seu CPF."}
                    {pixKeyType === "cnpj" && "Confira o CNPJ antes de salvar."}
                    {pixKeyType === "email" && "Use um e-mail já cadastrado como chave PIX no seu banco."}
                    {pixKeyType === "random" && "Cole o UUID gerado pelo app do banco."}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <Button
                type="submit"
                disabled={saving || !validation.ok || isSameAsSaved}
                className="bg-emerald-700 hover:bg-emerald-800 w-full sm:w-auto"
              >
                {saving ? (
                  <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Salvando...</>
                ) : isSameAsSaved && affiliate?.pix_key ? (
                  "Chave já cadastrada"
                ) : affiliate?.pix_key ? (
                  "Atualizar chave PIX"
                ) : (
                  "Cadastrar chave PIX"
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Confirmamos a chave antes de salvar pra evitar erros de transferência.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BellRing className="h-4 w-4 text-amber-600" /> Notificações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Em breve · escolha receber avisos de novas indicações e comissões por WhatsApp ou e-mail.
          </p>
        </CardContent>
      </Card>

      {isLoading && (
        <p className="text-xs text-muted-foreground text-center">Carregando dados...</p>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-700" /> Confirmar chave PIX
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Confira com atenção. Os pagamentos serão enviados pra essa chave.</p>
                <div className="rounded-md border bg-muted/40 px-3 py-2 space-y-1">
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p className="font-semibold text-foreground">{TYPE_LABELS[pixKeyType]}</p>
                  <p className="text-xs text-muted-foreground mt-2">Chave</p>
                  <p className="font-mono text-sm text-foreground break-all">{validation.normalized}</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Conferir de novo</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button onClick={handleConfirmedSave} disabled={saving} className="bg-emerald-700 hover:bg-emerald-800">
                {saving ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Salvando...</> : "Confirmar e salvar"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
