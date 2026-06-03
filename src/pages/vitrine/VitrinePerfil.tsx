import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAffiliateProfile } from "@/components/vitrine/useAffiliateProfile";
import { UserCog, Mail, Phone, CheckCircle2, KeyRound, BellRing } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type PixType = "cpf" | "cnpj" | "email" | "phone" | "random";

export default function VitrinePerfil() {
  const { data: affiliate, isLoading } = useAffiliateProfile();
  const qc = useQueryClient();

  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState<PixType>("cpf");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (affiliate) {
      setPixKey(affiliate.pix_key || "");
      setPixKeyType((affiliate.pix_key_type as PixType) || "cpf");
    }
  }, [affiliate?.id]);

  const savePix = async () => {
    if (!affiliate) return;
    if (!pixKey.trim()) {
      toast.error("Informe sua chave PIX.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("affiliates")
      .update({ pix_key: pixKey.trim(), pix_key_type: pixKeyType })
      .eq("id", affiliate.id);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar: " + error.message);
      return;
    }
    toast.success("Chave PIX salva!");
    qc.invalidateQueries({ queryKey: ["affiliate-self-profile"] });
  };

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
              <Input value={affiliate?.full_name || ""} disabled />
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
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de chave</Label>
              <Select value={pixKeyType} onValueChange={(v) => setPixKeyType(v as PixType)}>
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
              <Input value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="Sua chave PIX" />
            </div>
          </div>
          <Button onClick={savePix} disabled={saving} className="w-full sm:w-auto">
            {saving ? "Salvando..." : "Salvar chave PIX"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Esta chave é usada pra receber suas comissões. Confira com cuidado antes de salvar.
          </p>
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
    </div>
  );
}
