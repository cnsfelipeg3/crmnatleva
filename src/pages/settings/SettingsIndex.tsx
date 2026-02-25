import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Users, Plane, MapPin, Award, CreditCard, Tag, Package, Shield, Calculator } from "lucide-react";

const items = [
  { label: "Vendedores", icon: Users, path: "/settings/sellers" },
  { label: "Companhias Aéreas", icon: Plane, path: "/settings/airlines" },
  { label: "Aeroportos", icon: MapPin, path: "/settings/airports" },
  { label: "Programas de Milhas", icon: Award, path: "/settings/miles-programs" },
  { label: "Meios de Pagamento", icon: CreditCard, path: "/settings/payment-methods" },
  { label: "Tags", icon: Tag, path: "/settings/tags" },
  { label: "Produtos", icon: Package, path: "/settings/products" },
  { label: "Permissões", icon: Shield, path: "/settings/permissions" },
  { label: "Regras de Cálculo", icon: Calculator, path: "/settings/calc-rules" },
  { label: "Localizações", icon: MapPin, path: "/settings/user-locations" },
];

export default function SettingsIndex() {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl sm:text-2xl font-serif text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie cadastros, permissões e regras</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {items.map((item) => (
          <Card
            key={item.label}
            className="p-5 glass-card hover:shadow-md transition-shadow cursor-pointer hover:border-primary/30"
            onClick={() => navigate(item.path)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium text-foreground">{item.label}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
