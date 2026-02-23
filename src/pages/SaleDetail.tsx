import { useParams, useNavigate } from "react-router-dom";
import { MOCK_SALES } from "@/data/mockData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Plane,
  Hotel,
  Users,
  DollarSign,
  Copy,
  FileText,
  AlertTriangle,
} from "lucide-react";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function SaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const sale = MOCK_SALES.find((s) => s.id === id);

  if (!sale) {
    return (
      <div className="p-6 animate-fade-in">
        <Button variant="ghost" onClick={() => navigate("/sales")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <p className="mt-8 text-center text-muted-foreground">Venda não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/sales")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-serif text-foreground">{sale.name}</h1>
            <p className="text-sm text-muted-foreground">{sale.id} · Fechamento: {sale.closeDate}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Copy className="w-4 h-4 mr-1" /> Duplicar
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-1" /> Resumo NatLeva
          </Button>
          <Button size="sm">Editar</Button>
        </div>
      </div>

      {/* Alerts */}
      {sale.alerts.length > 0 && (
        <div className="space-y-2">
          {sale.alerts.map((a, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm ${
                a.type === "danger"
                  ? "bg-destructive/10 text-destructive"
                  : a.type === "warning"
                  ? "bg-warning/10 text-warning-foreground"
                  : "bg-info/10 text-info"
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {a.message}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Financial summary */}
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-accent" /> Financeiro
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">Valor Recebido</span>
              <span className="font-semibold text-success">{fmt(sale.receivedValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">Custo Total</span>
              <span className="font-medium">{fmt(sale.totalCost)}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between">
              <span className="text-muted-foreground text-sm">Lucro</span>
              <span className="font-bold text-primary">{fmt(sale.profit)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">Margem</span>
              <span className="font-bold text-accent">{sale.margin.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">Pagamento</span>
              <span className="text-sm">{sale.paymentMethod}</span>
            </div>
          </div>
        </Card>

        {/* Flight info */}
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Plane className="w-4 h-4 text-primary" /> Aéreo
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-4 py-3">
              <div className="text-center">
                <p className="text-2xl font-bold font-mono text-primary">{sale.origin.iata}</p>
                <p className="text-xs text-muted-foreground">{sale.origin.city}</p>
              </div>
              <div className="flex-1 border-t border-dashed border-border relative">
                <Plane className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground bg-card" />
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold font-mono text-primary">{sale.destination.iata}</p>
                <p className="text-xs text-muted-foreground">{sale.destination.city}</p>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ida</span>
              <span>{sale.departureDate}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Volta</span>
              <span>{sale.returnDate}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Companhia</span>
              <span>{sale.airline}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Localizador</span>
              <span className="font-mono font-semibold">{sale.locator}</span>
            </div>
            {sale.milesProgram && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Milhas</span>
                <Badge variant="outline">{sale.milesProgram}</Badge>
              </div>
            )}
          </div>
        </Card>

        {/* Passengers & Hotel */}
        <div className="space-y-4">
          <Card className="p-5 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-info" /> Passageiros
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Adultos</span>
                <span>{sale.pax.adults}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Crianças</span>
                <span>{sale.pax.children}</span>
              </div>
              {sale.pax.childrenAges.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Idades</span>
                  <span>{sale.pax.childrenAges.join(", ")} anos</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t border-border pt-2">
                <span>PAX Total</span>
                <span>{sale.pax.adults + sale.pax.children}</span>
              </div>
            </div>
          </Card>

          <Card className="p-5 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Hotel className="w-4 h-4 text-accent" /> Hotel
            </h3>
            <p className="text-sm font-medium">{sale.hotel}</p>
          </Card>

          {/* Score */}
          <Card className="p-5 glass-card flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold ${
                sale.score >= 90
                  ? "bg-success/15 text-success"
                  : sale.score >= 70
                  ? "bg-warning/15 text-warning-foreground"
                  : "bg-destructive/15 text-destructive"
              }`}
            >
              {sale.score}
            </div>
            <div>
              <p className="text-sm font-semibold">Score da Venda</p>
              <p className="text-xs text-muted-foreground">
                {sale.score >= 90 ? "Excelente" : sale.score >= 70 ? "Bom" : "Precisa atenção"}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
