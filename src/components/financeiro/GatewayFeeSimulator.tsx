import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calculator, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

interface FeeRule {
  installments: number;
  fee_percent: number;
  fee_fixed: number;
}

interface Props {
  gateways: Record<string, any[]>;
}

export default function GatewayFeeSimulator({ gateways }: Props) {
  const [selectedGateway, setSelectedGateway] = useState<string>("__none__");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"receive" | "charge">("charge");

  const rules: FeeRule[] = useMemo(() => {
    if (selectedGateway === "__none__") return [];
    return (gateways[selectedGateway] || [])
      .map((r: any) => ({
        installments: r.installments,
        fee_percent: Number(r.fee_percent) || 0,
        fee_fixed: Number(r.fee_fixed) || 0,
      }))
      .sort((a, b) => a.installments - b.installments);
  }, [selectedGateway, gateways]);

  const value = Number(amount) || 0;

  const rows = useMemo(() => {
    if (!value || rules.length === 0) return [];

    return rules.map((r) => {
      const pct = r.fee_percent / 100;
      const fixed = r.fee_fixed;

      if (mode === "charge") {
        // User charges X, calculate what they receive
        const feeValue = value * pct + fixed;
        const netValue = value - feeValue;
        return {
          installments: r.installments,
          grossValue: value,
          feePercent: r.fee_percent,
          feeFixed: fixed,
          feeTotal: feeValue,
          netValue,
          installmentValue: value / r.installments,
        };
      } else {
        // User wants to receive X, calculate what client must pay
        // net = gross - (gross * pct + fixed)
        // net = gross * (1 - pct) - fixed
        // gross = (net + fixed) / (1 - pct)
        const grossValue = pct < 1 ? (value + fixed) / (1 - pct) : 0;
        const feeValue = grossValue - value;
        return {
          installments: r.installments,
          grossValue,
          feePercent: r.fee_percent,
          feeFixed: fixed,
          feeTotal: feeValue,
          netValue: value,
          installmentValue: grossValue / r.installments,
        };
      }
    });
  }, [value, rules, mode]);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const gatewayNames = Object.keys(gateways);

  return (
    <Card className="glass-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Calculator className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-sm">Simulador de Taxas</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Gateway</Label>
          <Select value={selectedGateway} onValueChange={setSelectedGateway}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Selecione um gateway</SelectItem>
              {gatewayNames.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Valor (R$)</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            className="h-9 text-xs"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div>
          <Label className="text-xs">Modo</Label>
          <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
            <TabsList className="w-full h-9">
              <TabsTrigger value="charge" className="flex-1 text-[11px] gap-1">
                <ArrowDownToLine className="w-3.5 h-3.5" />
                Cobrar
              </TabsTrigger>
              <TabsTrigger value="receive" className="flex-1 text-[11px] gap-1">
                <ArrowUpFromLine className="w-3.5 h-3.5" />
                Receber
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {mode === "charge" && (
        <p className="text-[11px] text-muted-foreground">
          Informe quanto você vai <strong>cobrar do cliente</strong> e veja quanto vai <strong>receber líquido</strong> em cada parcela.
        </p>
      )}
      {mode === "receive" && (
        <p className="text-[11px] text-muted-foreground">
          Informe quanto você quer <strong>receber líquido</strong> e veja quanto o <strong>cliente precisa pagar</strong> em cada parcela.
        </p>
      )}

      {rows.length > 0 ? (
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Parcelas</TableHead>
                <TableHead className="text-xs text-right">
                  {mode === "charge" ? "Valor Cobrado" : "Cliente Paga"}
                </TableHead>
                <TableHead className="text-xs text-right">Parcela</TableHead>
                <TableHead className="text-xs text-right">Taxa %</TableHead>
                <TableHead className="text-xs text-right">Taxa R$</TableHead>
                <TableHead className="text-xs text-right">Total Taxas</TableHead>
                <TableHead className="text-xs text-right">
                  {mode === "charge" ? "Você Recebe" : "Valor Líquido"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.installments}>
                  <TableCell className="text-xs font-mono">{r.installments}x</TableCell>
                  <TableCell className="text-xs text-right font-mono">{fmt(r.grossValue)}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{fmt(r.installmentValue)}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{r.feePercent}%</TableCell>
                  <TableCell className="text-xs text-right font-mono">{fmt(r.feeFixed)}</TableCell>
                  <TableCell className="text-xs text-right font-mono text-destructive">{fmt(r.feeTotal)}</TableCell>
                  <TableCell className="text-xs text-right font-mono font-semibold text-primary">
                    {fmt(r.netValue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        selectedGateway !== "__none__" && value > 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nenhuma faixa de parcelamento cadastrada para este gateway.
          </p>
        )
      )}

      {!value && selectedGateway !== "__none__" && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Digite um valor para simular.
        </p>
      )}
    </Card>
  );
}
