import { Card } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-serif text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie cadastros, permissões e regras</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          "Vendedores",
          "Companhias Aéreas",
          "Aeroportos",
          "Programas de Milhas",
          "Meios de Pagamento",
          "Tags",
          "Produtos",
          "Permissões",
          "Regras de Cálculo",
        ].map((item) => (
          <Card key={item} className="p-5 glass-card hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
              <SettingsIcon className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium text-foreground">{item}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
