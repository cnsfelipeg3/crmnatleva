import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Building2, CheckCircle2, Loader2 } from "lucide-react";

export default function SupplierRegistration() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [supplier, setSupplier] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", razao_social: "", cnpj: "", contact_name: "",
    phone: "", email: "", bank_pix_key: "",
    responsavel_name: "", responsavel_phone: "",
    endereco: "", bairro: "", cidade: "", estado: "", cep: "",
    payment_conditions: "", category: "",
  });

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("suppliers")
        .select("*")
        .eq("registration_token", token)
        .single();
      if (data) {
        setSupplier(data);
        setForm({
          name: data.name || "",
          razao_social: data.razao_social || "",
          cnpj: data.cnpj || "",
          contact_name: data.contact_name || "",
          phone: data.phone || "",
          email: data.email || "",
          bank_pix_key: data.bank_pix_key || "",
          responsavel_name: data.responsavel_name || "",
          responsavel_phone: data.responsavel_phone || "",
          endereco: data.endereco || "",
          bairro: data.bairro || "",
          cidade: data.cidade || "",
          estado: data.estado || "",
          cep: data.cep || "",
          payment_conditions: data.payment_conditions || "",
          category: data.category || "",
        });
      }
      setLoading(false);
    })();
  }, [token]);

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error("Nome / Razão Social é obrigatório"); return; }
    if (!form.cnpj.trim()) { toast.error("CNPJ é obrigatório"); return; }
    setSaving(true);
    const { error } = await supabase
      .from("suppliers")
      .update(form)
      .eq("registration_token", token);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar. Tente novamente."); return; }
    setSaved(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!token || !supplier) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-xl font-bold mb-2">Link inválido</h1>
          <p className="text-sm text-muted-foreground">Este link de cadastro não é válido ou já expirou.</p>
        </Card>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <CheckCircle2 className="w-16 h-16 mx-auto text-primary mb-4" />
          <h1 className="text-xl font-bold mb-2">Cadastro enviado com sucesso!</h1>
          <p className="text-sm text-muted-foreground">
            Suas informações foram recebidas. Entraremos em contato em breve. Obrigado!
          </p>
        </Card>
      </div>
    );
  }

  const fields: { key: string; label: string; required?: boolean; placeholder?: string; colSpan?: number }[] = [
    { key: "name", label: "Nome Fantasia *", required: true, placeholder: "Nome da empresa" },
    { key: "razao_social", label: "Razão Social", placeholder: "Razão social completa" },
    { key: "cnpj", label: "CNPJ *", required: true, placeholder: "00.000.000/0000-00" },
    { key: "email", label: "Email", placeholder: "contato@empresa.com" },
    { key: "responsavel_name", label: "Nome do Responsável", placeholder: "Nome completo" },
    { key: "responsavel_phone", label: "Telefone do Responsável", placeholder: "(11) 99999-9999" },
    { key: "contact_name", label: "Pessoa de Contato", placeholder: "Quem fala conosco" },
    { key: "phone", label: "Telefone Comercial", placeholder: "(11) 3333-4444" },
    { key: "cep", label: "CEP", placeholder: "00000-000" },
    { key: "endereco", label: "Endereço", placeholder: "Rua, número, complemento" },
    { key: "bairro", label: "Bairro", placeholder: "Bairro" },
    { key: "cidade", label: "Cidade", placeholder: "Cidade" },
    { key: "estado", label: "Estado", placeholder: "UF" },
    { key: "bank_pix_key", label: "Chave Pix", placeholder: "CPF, CNPJ, email ou telefone" },
    { key: "payment_conditions", label: "Condições de Pagamento", placeholder: "Ex: 30/60/90 dias", colSpan: 2 },
  ];

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Building2 className="w-12 h-12 mx-auto text-primary mb-3" />
          <h1 className="text-2xl font-bold">Cadastro de Fornecedor</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Preencha seus dados para se cadastrar como fornecedor.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados da Empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map(({ key, label, placeholder, colSpan }) => (
                <div key={key} className={colSpan === 2 ? "md:col-span-2" : ""}>
                  <Label className="text-xs">{label}</Label>
                  <Input
                    value={(form as any)[key]}
                    onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>

            <Button className="w-full mt-6" size="lg" onClick={handleSubmit} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : "Enviar Cadastro"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
