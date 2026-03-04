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
import logoNatleva from "@/assets/logo-natleva-premium.jpg";

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

    const brandGreen: [number, number, number] = [30, 60, 28];
    const softGreen: [number, number, number] = [240, 247, 240];
    const cardBorder: [number, number, number] = [200, 220, 200];
    const mutedText: [number, number, number] = [150, 150, 150];
    const bodyText: [number, number, number] = [60, 60, 60];
    const bgCream: [number, number, number] = [252, 250, 243];

    // Full page cream background
    doc.setFillColor(...bgCream);
    doc.rect(0, 0, pageW, pageH, "F");

    // Logo
    const logoW = 50;
    const logoH = 50;
    try {
      doc.addImage(logoNatleva, "JPEG", centerX - logoW / 2, 20, logoW, logoH, undefined, "FAST");
    } catch {
      doc.setFontSize(28);
      doc.setTextColor(...brandGreen);
      doc.setFont("helvetica", "bold");
      doc.text("natleva", centerX, 46, { align: "center" });
    }

    // Elegant divider
    const lineY = 78;
    const lineW = 60;
    doc.setDrawColor(...brandGreen);
    doc.setLineWidth(0.4);
    doc.line(centerX - lineW / 2, lineY, centerX + lineW / 2, lineY);

    // Title
    doc.setFontSize(20);
    doc.setTextColor(...brandGreen);
    doc.setFont("helvetica", "bold");
    doc.text("Simulação de Parcelamento", centerX, 92, { align: "center" });

    // Date subtitle
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mutedText);
    doc.text(
      `Simulação realizada em ${new Date().toLocaleDateString("pt-BR")}`,
      centerX, 100, { align: "center" }
    );

    // Card dimensions
    const cardW = 150;
    const cardX = centerX - cardW / 2;
    const rowH = 13;
    const headerH = 14;
    const tableTopY = 114;
    const padTop = 6;
    const padBottom = 6;
    const cardH = padTop + headerH + rows.length * rowH + padBottom;

    // Card shadow
    doc.setFillColor(230, 235, 230);
    doc.roundedRect(cardX + 1, tableTopY + 1.5, cardW, cardH, 5, 5, "F");

    // Card body
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cardX, tableTopY, cardW, cardH, 5, 5, "F");

    // Card border
    doc.setDrawColor(...cardBorder);
    doc.setLineWidth(0.35);
    doc.roundedRect(cardX, tableTopY, cardW, cardH, 5, 5, "S");

    // Table header
    const headerY = tableTopY + padTop;
    doc.setFillColor(...softGreen);
    doc.roundedRect(cardX + 2, headerY, cardW - 4, headerH, 3, 3, "F");

    const col1X = cardX + cardW * 0.3;
    const col2X = cardX + cardW * 0.7;

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...brandGreen);
    doc.text("PARCELAS", col1X, headerY + 9.5, { align: "center" });
    doc.text("VALOR DA PARCELA", col2X, headerY + 9.5, { align: "center" });

    // Table rows
    rows.forEach((row, i) => {
      const y = headerY + headerH + i * rowH;

      if (i % 2 === 1) {
        doc.setFillColor(248, 252, 248);
        doc.rect(cardX + 2, y, cardW - 4, rowH, "F");
      }

      if (i > 0) {
        doc.setDrawColor(230, 238, 230);
        doc.setLineWidth(0.15);
        doc.line(cardX + 12, y, cardX + cardW - 12, y);
      }

      const textY = y + rowH * 0.62;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...bodyText);
      doc.text(`${row.installments}x`, col1X, textY, { align: "center" });

      doc.setFontSize(12.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...brandGreen);
      doc.text(fmt(row.installmentValue), col2X, textY, { align: "center" });
    });

    // Bottom accent line
    const accentY = tableTopY + cardH + 16;
    doc.setDrawColor(...brandGreen);
    doc.setLineWidth(0.3);
    doc.line(centerX - lineW / 2, accentY, centerX + lineW / 2, accentY);

    // Disclaimer
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...mutedText);
    doc.text(
      "Simulação estimada. Valores podem variar conforme operadora de pagamento.",
      centerX, accentY + 8, { align: "center" }
    );

    // Footer bar
    doc.setFillColor(...brandGreen);
    doc.rect(0, pageH - 3, pageW, 3, "F");

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
