import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Calculator, ArrowDownToLine, ArrowUpFromLine, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import logoNatleva from "@/assets/logo-natleva.png";

interface FeeRule {
  installments: number;
  fee_percent: number;
  fee_fixed: number;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function SimuladorTaxas() {
  const [selectedGateway, setSelectedGateway] = useState<string>("__none__");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<"receive" | "charge">("charge");

  const { data: allRules = [] } = useQuery({
    queryKey: ["simulator-fee-rules"],
    queryFn: async () => {
      const { data } = await supabase
        .from("payment_fee_rules")
        .select("*")
        .order("acquirer")
        .order("installments");
      return data || [];
    },
  });

  const gateways = useMemo(() => {
    return allRules.reduce((acc: Record<string, any[]>, r: any) => {
      const key = r.acquirer || "Sem gateway";
      if (!acc[key]) acc[key] = [];
      acc[key].push(r);
      return acc;
    }, {} as Record<string, any[]>);
  }, [allRules]);

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

  const gatewayNames = Object.keys(gateways);

  const generatePDF = () => {
    if (rows.length === 0) return;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const centerX = pageW / 2;
    const brandGreen: [number, number, number] = [30, 70, 32];
    const softGreen: [number, number, number] = [245, 250, 245];
    const mutedText: [number, number, number] = [140, 140, 140];
    const bodyText: [number, number, number] = [50, 50, 50];

    // ── Subtle top accent line
    doc.setFillColor(...brandGreen);
    doc.rect(0, 0, pageW, 2.5, "F");

    // ── Logo
    const logoW = 44;
    const logoH = 16;
    try {
      doc.addImage(logoNatleva, "PNG", centerX - logoW / 2, 16, logoW, logoH);
    } catch {
      doc.setFontSize(20);
      doc.setTextColor(...brandGreen);
      doc.setFont("helvetica", "bold");
      doc.text("natleva", centerX, 26, { align: "center" });
    }

    // ── Title
    doc.setFontSize(18);
    doc.setTextColor(...brandGreen);
    doc.setFont("helvetica", "bold");
    doc.text("Simulação de Parcelamento", centerX, 46, { align: "center" });

    // ── Subtitle (date only)
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mutedText);
    doc.text(
      `Simulação realizada em ${new Date().toLocaleDateString("pt-BR")}`,
      centerX,
      54,
      { align: "center" }
    );

    // ── Card dimensions
    const cardW = 140;
    const cardX = centerX - cardW / 2;
    const rowH = 12;
    const headerH = 13;
    const tableTopY = 68;
    const cardH = headerH + rows.length * rowH + 4;

    // ── Card shadow (layered rects)
    doc.setFillColor(220, 225, 220);
    doc.roundedRect(cardX + 1.5, tableTopY + 1.5, cardW, cardH, 4, 4, "F");
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cardX, tableTopY, cardW, cardH, 4, 4, "F");

    // ── Card border
    doc.setDrawColor(220, 230, 220);
    doc.setLineWidth(0.3);
    doc.roundedRect(cardX, tableTopY, cardW, cardH, 4, 4, "S");

    // ── Table header
    doc.setFillColor(...softGreen);
    doc.roundedRect(cardX + 1, tableTopY + 1, cardW - 2, headerH, 3, 3, "F");

    const col1X = cardX + cardW * 0.3;
    const col2X = cardX + cardW * 0.7;

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...brandGreen);
    doc.text("PARCELAS", col1X, tableTopY + 9, { align: "center" });
    doc.text("VALOR DA PARCELA", col2X, tableTopY + 9, { align: "center" });

    // ── Table rows
    rows.forEach((row, i) => {
      const y = tableTopY + headerH + i * rowH;

      // Zebra stripe
      if (i % 2 === 1) {
        doc.setFillColor(250, 253, 250);
        doc.rect(cardX + 1, y, cardW - 2, rowH, "F");
      }

      // Separator
      if (i > 0) {
        doc.setDrawColor(235, 240, 235);
        doc.setLineWidth(0.15);
        doc.line(cardX + 8, y, cardX + cardW - 8, y);
      }

      const textY = y + rowH * 0.65;

      // Parcelas (medium)
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...bodyText);
      doc.text(`${row.installments}x`, col1X, textY, { align: "center" });

      // Valor (bold, slightly larger)
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...brandGreen);
      doc.text(fmt(row.installmentValue), col2X, textY, { align: "center" });
    });

    // ── Disclaimer
    const disclaimerY = tableTopY + cardH + 12;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...mutedText);
    doc.text(
      "Simulação estimada. Valores podem variar conforme operadora de pagamento.",
      centerX,
      disclaimerY,
      { align: "center" }
    );

    // ── Bottom accent line
    doc.setFillColor(...brandGreen);
    doc.rect(0, pageH - 2.5, pageW, 2.5, "F");

    doc.save(`simulacao-parcelamento-${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[900px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-display">Simulador de Taxas</h1>
        <p className="text-sm text-muted-foreground">
          Simule o valor líquido ou bruto das vendas de acordo com o gateway e parcelamento
        </p>
      </div>

      <Card className="glass-card p-5 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <Calculator className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-sm">Configurar Simulação</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <Label className="text-xs">Modo de Simulação</Label>
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
          <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            💡 Informe quanto você vai <strong>cobrar do cliente</strong> e veja quanto vai <strong>receber líquido</strong> em cada parcela.
          </p>
        )}
        {mode === "receive" && (
          <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            💡 Informe quanto você quer <strong>receber líquido</strong> e veja quanto o <strong>cliente precisa pagar</strong> em cada parcela.
          </p>
        )}
      </Card>

      {rows.length > 0 && (
        <Card className="glass-card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-sm">Tabela de Parcelamento — {selectedGateway}</h3>
            <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={generatePDF}>
              <FileDown className="w-3.5 h-3.5" />
              Exportar PDF
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Parcelas</TableHead>
                <TableHead className="text-xs text-right">
                  {mode === "charge" ? "Valor Cobrado" : "Cliente Paga"}
                </TableHead>
                <TableHead className="text-xs text-right">Valor da Parcela</TableHead>
                <TableHead className="text-xs text-right">Taxa %</TableHead>
                <TableHead className="text-xs text-right">Taxa Fixa</TableHead>
                <TableHead className="text-xs text-right">Total Taxas</TableHead>
                <TableHead className="text-xs text-right">
                  {mode === "charge" ? "Você Recebe" : "Valor Líquido"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.installments}>
                  <TableCell className="text-xs font-mono font-medium">{r.installments}x</TableCell>
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
        </Card>
      )}

      {selectedGateway !== "__none__" && value > 0 && rows.length === 0 && (
        <Card className="glass-card p-8 text-center text-muted-foreground text-sm">
          Nenhuma faixa de parcelamento cadastrada para este gateway.
        </Card>
      )}

      {selectedGateway === "__none__" && (
        <Card className="glass-card p-8 text-center text-muted-foreground text-sm">
          Selecione um gateway para iniciar a simulação.
        </Card>
      )}

      {selectedGateway !== "__none__" && !value && (
        <Card className="glass-card p-8 text-center text-muted-foreground text-sm">
          Digite um valor para simular.
        </Card>
      )}
    </div>
  );
}
