import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Clock, Users, Shield, Bell } from "lucide-react";

const configs = [
  { icon: Clock, title: "Jornadas & Escalas", desc: "Configure horários padrão, escalas de trabalho e tolerância de atraso", status: "Configurável via cadastro de colaborador" },
  { icon: Users, title: "Cargos & Áreas", desc: "SDR, Vendas, Consultor, Operação, Financeiro, Admin — editáveis no cadastro", status: "Ativo" },
  { icon: Shield, title: "Perfis de Acesso (RBAC)", desc: "Admin, Gestor, Financeiro, Comercial, Operacional, Colaborador — gerenciados em Permissões", status: "Ativo" },
  { icon: Bell, title: "Alertas & Notificações", desc: "Contratos a vencer, feedbacks pendentes, atrasos frequentes", status: "Automático" },
  { icon: Settings, title: "Regras de Bônus", desc: "Faixas de 80%, 100% e 120% configuráveis por meta individual", status: "Por meta" },
];

export default function ConfiguracoesRH() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Configurações RH</h1>
        <p className="text-sm text-muted-foreground">Parâmetros e regras do módulo de Gestão de Pessoas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {configs.map((c, i) => (
          <Card key={i} className="border-border/50 hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><c.icon className="w-4 h-4 text-primary" />{c.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">{c.desc}</p>
              <Badge variant="outline" className="text-[10px]">{c.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
