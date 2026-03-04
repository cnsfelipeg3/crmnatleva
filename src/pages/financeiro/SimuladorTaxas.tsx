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
    const brandGreen: [number, number, number] = [30, 70, 32];
    const darkText: [number, number, number] = [30, 30, 30];
    const mutedText: [number, number, number] = [120, 120, 120];
    const lineColor: [number, number, number] = [200, 210, 200];
    const headerBg: [number, number, number] = [235, 245, 235];

    // ── Top accent bar
    doc.setFillColor(...brandGreen);
    doc.rect(0, 0, pageW, 4, "F");

    // ── Logo
    const logoW = 50;
    const logoH = 18;
    const logoX = (pageW - logoW) / 2;
    try {
      doc.addImage(logoNatleva, "PNG", logoX, 12, logoW, logoH);
    } catch {
      doc.setFontSize(22);
      doc.setTextColor(...brandGreen);
      doc.setFont("helvetica", "bold");
      doc.text("natleva", pageW / 2, 24, { align: "center" });
    }

    // ── Divider line under logo
    const divY = 36;
    doc.setDrawColor(...brandGreen);
    doc.setLineWidth(0.5);
    doc.line(30, divY, pageW - 30, divY);

    // ── Title
    doc.setFontSize(16);
    doc.setTextColor(...brandGreen);
    doc.setFont("helvetica", "bold");
    doc.text("Simulação de Parcelamento", pageW / 2, divY + 12, { align: "center" });

    // ── Info block
    const infoY = divY + 22;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mutedText);

    const modeLabel = mode === "charge" ? "Valor Cobrado" : "Valor Líquido Desejado";
    const infoLines = [
      `Gateway: ${selectedGateway}`,
      `Modo: ${mode === "charge" ? "Quanto vou receber" : "Quanto devo cobrar"}`,
      `${modeLabel}: ${fmt(value)}`,
      `Data: ${new Date().toLocaleDateString("pt-BR")}`,
    ];
    infoLines.forEach((line, i) => {
      doc.text(line, 25, infoY + i * 6);
    });

    // ── Table
    const tableY = infoY + infoLines.length * 6 + 8;
    const marginX = 25;
    const tableW = pageW - marginX * 2;
    const colWidths = [tableW * 0.35, tableW * 0.65];
    const rowH = 10;

    // Header
    doc.setFillColor(...headerBg);
    doc.roundedRect(marginX, tableY, tableW, rowH, 2, 2, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...brandGreen);
    doc.text("Parcelas", marginX + 6, tableY + 7);
    doc.text("Valor da Parcela", marginX + colWidths[0] + 6, tableY + 7);

    // Rows
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...darkText);

    rows.forEach((row, i) => {
      const y = tableY + rowH + i * rowH;

      // Alternate row bg
      if (i % 2 === 0) {
        doc.setFillColor(248, 250, 248);
        doc.rect(marginX, y, tableW, rowH, "F");
      }

      // Row border bottom
      doc.setDrawColor(...lineColor);
      doc.setLineWidth(0.2);
      doc.line(marginX, y + rowH, marginX + tableW, y + rowH);

      doc.setFontSize(10);
      doc.text(`${row.installments}x`, marginX + 6, y + 7);
      doc.text(fmt(row.installmentValue), marginX + colWidths[0] + 6, y + 7);
    });

    // Table outer border
    const tableEndY = tableY + rowH + rows.length * rowH;
    doc.setDrawColor(...brandGreen);
    doc.setLineWidth(0.4);
    doc.roundedRect(marginX, tableY, tableW, tableEndY - tableY, 2, 2, "S");

    // ── Footer
    const footerY = Math.min(tableEndY + 16, 270);
    doc.setDrawColor(...lineColor);
    doc.setLineWidth(0.3);
    doc.line(30, footerY, pageW - 30, footerY);

    doc.setFontSize(8);
    doc.setTextColor(...mutedText);
    doc.setFont("helvetica", "italic");
    doc.text("Documento gerado automaticamente pelo sistema NatLeva", pageW / 2, footerY + 6, { align: "center" });
    doc.text("As taxas podem variar conforme o gateway e a operadora.", pageW / 2, footerY + 11, { align: "center" });

    // ── Bottom accent bar
    doc.setFillColor(...brandGreen);
    doc.rect(0, doc.internal.pageSize.getHeight() - 4, pageW, 4, "F");

    doc.save(`simulacao-${selectedGateway.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.pdf`);
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
