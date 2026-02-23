import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plane, Hotel, Users, DollarSign, Copy, FileText } from "lucide-react";
import FlightTimeline, { type FlightSegment } from "@/components/FlightTimeline";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function SaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sale, setSale] = useState<any>(null);
  const [segments, setSegments] = useState<FlightSegment[]>([]);
  const [costItems, setCostItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: saleData } = await supabase.from("sales").select("*").eq("id", id).single();
      setSale(saleData);

      const { data: segData } = await supabase.from("flight_segments").select("*").eq("sale_id", id).order("segment_order");
      setSegments((segData || []) as FlightSegment[]);

      const { data: costData } = await supabase.from("cost_items").select("*").eq("sale_id", id);
      setCostItems(costData || []);

      setLoading(false);
    };
    if (id) fetch();
  }, [id]);

  if (loading) return <div className="p-6 text-center text-muted-foreground animate-fade-in">Carregando...</div>;
  if (!sale) return (
    <div className="p-6 animate-fade-in">
      <Button variant="ghost" onClick={() => navigate("/sales")}><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
      <p className="mt-8 text-center text-muted-foreground">Venda não encontrada.</p>
    </div>
  );

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/sales")}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-2xl font-serif text-foreground">{sale.name}</h1>
            <p className="text-sm text-muted-foreground">{sale.display_id} · {sale.close_date || "Sem data"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Copy className="w-4 h-4 mr-1" /> Duplicar</Button>
          <Button variant="outline" size="sm"><FileText className="w-4 h-4 mr-1" /> Resumo NatLeva</Button>
          <Badge variant="outline" className="self-center">{sale.status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Financial */}
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-accent" /> Financeiro
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Valor Recebido</span><span className="font-semibold text-success">{fmt(sale.received_value || 0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Custo Total</span><span className="font-medium">{fmt(sale.total_cost || 0)}</span></div>
            <div className="border-t border-border pt-2 flex justify-between"><span className="text-muted-foreground text-sm">Lucro</span><span className="font-bold text-primary">{fmt(sale.profit || 0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground text-sm">Margem</span><span className="font-bold text-accent">{(sale.margin || 0).toFixed(1)}%</span></div>
            {sale.payment_method && <div className="flex justify-between"><span className="text-muted-foreground text-sm">Pagamento</span><span className="text-sm">{sale.payment_method}</span></div>}
          </div>

          {costItems.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground">Detalhamento de Custos</h4>
              {costItems.map((ci: any) => (
                <div key={ci.id} className="text-xs bg-muted/50 rounded p-2 space-y-1">
                  <div className="flex justify-between"><span className="font-medium capitalize">{ci.category}</span><span className="font-semibold">{fmt(ci.total_item_cost || 0)}</span></div>
                  {ci.cash_value > 0 && <div className="flex justify-between text-muted-foreground"><span>Cash</span><span>{fmt(ci.cash_value)}</span></div>}
                  {ci.miles_cost_brl > 0 && <div className="flex justify-between text-muted-foreground"><span>Milhas ({ci.miles_quantity?.toLocaleString()} × R${ci.miles_price_per_thousand})</span><span>{fmt(ci.miles_cost_brl)}</span></div>}
                  {ci.taxes > 0 && <div className="flex justify-between text-muted-foreground"><span>Taxas{ci.taxes_included_in_cash ? " (incl.)" : ""}</span><span>{fmt(ci.taxes)}</span></div>}
                  {ci.miles_program && <div className="text-muted-foreground">Programa: {ci.miles_program}</div>}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Flight */}
        <Card className="p-5 glass-card">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Plane className="w-4 h-4 text-primary" /> Aéreo
          </h3>
          <div className="flex items-center justify-center gap-4 py-3">
            <div className="text-center">
              <p className="text-2xl font-bold font-mono text-primary">{sale.origin_iata || "?"}</p>
            </div>
            <div className="flex-1 border-t border-dashed border-border relative">
              <Plane className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground bg-card" />
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold font-mono text-primary">{sale.destination_iata || "?"}</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            {sale.departure_date && <div className="flex justify-between"><span className="text-muted-foreground">Ida</span><span>{sale.departure_date}</span></div>}
            {sale.return_date && <div className="flex justify-between"><span className="text-muted-foreground">Volta</span><span>{sale.return_date}</span></div>}
            {sale.airline && <div className="flex justify-between"><span className="text-muted-foreground">Companhia</span><span>{sale.airline}</span></div>}
            {sale.locators?.length > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Localizador</span><span className="font-mono font-semibold">{sale.locators.join(", ")}</span></div>}
            {sale.miles_program && <div className="flex justify-between"><span className="text-muted-foreground">Milhas</span><Badge variant="outline">{sale.miles_program}</Badge></div>}
          </div>

          {/* Flight segments timeline */}
          {segments.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border space-y-3">
              <FlightTimeline segments={segments} direction="ida" />
              <FlightTimeline segments={segments} direction="volta" />
            </div>
          )}
        </Card>

        {/* PAX & Hotel */}
        <div className="space-y-4">
          <Card className="p-5 glass-card">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-info" /> Passageiros
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Adultos</span><span>{sale.adults}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Crianças</span><span>{sale.children}</span></div>
              {sale.children_ages?.length > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Idades</span><span>{sale.children_ages.join(", ")} anos</span></div>}
              <div className="flex justify-between font-semibold border-t border-border pt-2"><span>PAX Total</span><span>{(sale.adults || 0) + (sale.children || 0)}</span></div>
            </div>
          </Card>

          {sale.hotel_name && (
            <Card className="p-5 glass-card">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Hotel className="w-4 h-4 text-accent" /> Hotel
              </h3>
              <p className="text-sm font-medium">{sale.hotel_name}</p>
              {sale.hotel_room && <p className="text-xs text-muted-foreground">{sale.hotel_room}</p>}
              {sale.hotel_meal_plan && <p className="text-xs text-muted-foreground">{sale.hotel_meal_plan}</p>}
              {sale.hotel_reservation_code && <p className="text-xs font-mono mt-1">{sale.hotel_reservation_code}</p>}
            </Card>
          )}

          {sale.observations && (
            <Card className="p-5 glass-card">
              <h3 className="text-sm font-semibold text-foreground mb-2">Observações</h3>
              <p className="text-sm text-muted-foreground">{sale.observations}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
