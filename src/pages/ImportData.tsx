import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, Sparkles, Loader2, CheckCircle, AlertCircle, FileSpreadsheet, Users, ShoppingCart, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface ImportResult {
  paxCreated: number;
  paxUpdated: number;
  salesCreated: number;
  costsCreated: number;
  linksCreated: number;
}

export default function ImportData() {
  const [clientsFile, setClientsFile] = useState<File | null>(null);
  const [salesFile, setSalesFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const parseClientsXlsx = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array", cellDates: true });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];

          // Find header row (contains "Nome" and "CPF")
          let headerIdx = -1;
          for (let i = 0; i < Math.min(rows.length, 15); i++) {
            const row = rows[i];
            if (row && row.some((cell: any) => String(cell).includes("Nome")) && row.some((cell: any) => String(cell).includes("CPF"))) {
              headerIdx = i;
              break;
            }
          }
          if (headerIdx === -1) { reject("Header row not found in clients file"); return; }

          const passengers: any[] = [];
          for (let i = headerIdx + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !row[0] || String(row[0]).trim().length < 2) continue;
            const name = String(row[0]).trim();
            if (name === "Criar nome" || name.startsWith("=")) continue;

            passengers.push({
              full_name: name,
              phone: row[2] ? String(row[2]) : null,
              email: row[3] ? String(row[3]).trim() : null,
              cpf: row[4] ? String(row[4]) : null,
              rg: row[5] ? String(row[5]).trim() : null,
              birth_date: row[6] ? formatExcelDate(row[6]) : null,
              passport_number: row[7] ? String(row[7]).trim() : null,
              passport_expiry: row[8] ? formatExcelDate(row[8]) : null,
              city: row[9] ? String(row[9]).trim() : null,
              address: row[10] ? String(row[10]).trim() : null,
              cep: row[11] ? String(row[11]).trim() : null,
              complement: row[12] ? String(row[12]).trim() : null,
              categoria: row[14] ? String(row[14]).trim() : "SILVER",
            });
          }
          resolve(passengers);
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const parseSalesXlsx = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array", cellDates: true });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];

          // Find header row
          let headerIdx = -1;
          for (let i = 0; i < Math.min(rows.length, 15); i++) {
            const row = rows[i];
            if (row && row.some((cell: any) => String(cell).includes("Nome")) && 
                row.some((cell: any) => String(cell).includes("Vendedor") || String(cell).includes("Passageiros"))) {
              headerIdx = i;
              break;
            }
          }
          if (headerIdx === -1) { reject("Header row not found in sales file"); return; }

          const sales: any[] = [];
          let currentSale: any = null;

          for (let i = headerIdx + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !row[0]) continue;
            const col0 = String(row[0]).trim();
            
            // Skip empty, formula, or summary rows
            if (!col0 || col0.startsWith("=") || col0.length < 2) continue;

            // Subitems header row
            if (col0 === "Subitems") continue;

            // Check if this is a cost subitem (col0 is empty but col1 has data)
            if (col0 === "" && row[1] && String(row[1]).trim()) {
              // This is a cost item for the current sale
              if (currentSale) {
                const costName = String(row[1]).trim();
                if (costName && costName !== "Nome") {
                  currentSale.cost_items.push({
                    description: costName,
                    miles_program: row[2] ? String(row[2]).trim() : null,
                    miles_quantity: row[3] || null,
                    miles_price_per_thousand: row[4] || null,
                    cash_value: row[5] || null,
                    taxes: row[6] || null,
                    total_cost: row[7] || null,
                    emission_source: row[8] ? String(row[8]).trim() : null,
                  });
                }
              }
              continue;
            }

            // Check if it's a date range separator like "24 a 31/07"
            if (/^\d+\s+a\s+\d+/.test(col0)) continue;

            // Check if this row is a subitem data row (no name in col0 but data in other cols)
            // This happens when col0 is blank and it's cost data
            if (!col0) continue;

            // This is a new sale row
            // But first check - if col0 is just a subitem cost row (blank in main cols)
            if (col0 === "Subitems" || col0 === "teste") continue;

            // Save previous sale
            if (currentSale) sales.push(currentSale);

            currentSale = {
              name: col0,
              seller: row[1] ? String(row[1]).trim() : null,
              passengers: row[2] ? String(row[2]).trim() : null,
              close_date: row[3] ? formatExcelDate(row[3]) : null,
              paid_value: row[4] || null,
              received_value: row[5] || null,
              payment_method: row[6] ? String(row[6]).trim() : null,
              total_cost: row[7] || null,
              profit: row[8] || null,
              products: row[13] ? String(row[13]).trim() : null,
              departure_date: row[14] ? formatExcelDate(row[14]) : null,
              return_date: row[15] ? formatExcelDate(row[15]) : null,
              origin: row[16] ? String(row[16]).trim() : null,
              destination: row[17] ? String(row[17]).trim() : null,
              adults: row[18] || null,
              children: row[19] || null,
              children_ages: row[20] ? String(row[20]) : null,
              flight_class: row[21] ? String(row[21]).trim() : null,
              observations: row[22] ? String(row[22]).replace(/<br\/>/g, "\n").trim() : null,
              airline: row[24] ? String(row[24]).trim() : null,
              connections: row[25] ? String(row[25]).trim() : null,
              hotel_name: row[26] ? String(row[26]).trim() : null,
              hotel_room: row[27] ? String(row[27]).trim() : null,
              hotel_meal_plan: row[28] ? String(row[28]).trim() : null,
              tag_chatguru: row[29] ? String(row[29]).trim() : null,
              link_chat: row[30] ? String(row[30]).trim() : null,
              locators: row[31] ? String(row[31]).trim() : null,
              other_codes: row[32] ? String(row[32]).trim() : null,
              hotel_reservation_code: row[33] ? String(row[33]).trim() : null,
              cost_items: [] as any[],
            };
          }
          // Don't forget the last sale
          if (currentSale) sales.push(currentSale);

          resolve(sales);
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const formatExcelDate = (val: any): string | null => {
    if (!val) return null;
    if (val instanceof Date) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, "0");
      const d = String(val.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    const s = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
    const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
    return null;
  };

  const handleImport = async () => {
    if (!clientsFile && !salesFile) {
      toast({ title: "Selecione pelo menos um arquivo", variant: "destructive" });
      return;
    }

    setImporting(true);
    setError(null);
    setResult(null);
    setProgress(10);

    try {
      let passengers: any[] = [];
      let sales: any[] = [];

      if (clientsFile) {
        setProgress(20);
        passengers = await parseClientsXlsx(clientsFile);
      }

      if (salesFile) {
        setProgress(40);
        sales = await parseSalesXlsx(salesFile);
      }

      setProgress(60);

      const { data, error: fnError } = await supabase.functions.invoke("import-monday-data", {
        body: { passengers, sales },
      });

      if (fnError) throw fnError;

      setProgress(100);
      setResult(data);
      toast({
        title: "Importação concluída!",
        description: `${data.paxCreated} passageiros, ${data.salesCreated} vendas importadas`,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro desconhecido");
      toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Importar do Monday</h1>
        <p className="text-sm text-muted-foreground mt-1">Migre seus dados de clientes e vendas para o sistema</p>
      </div>

      <div className="grid gap-4">
        {/* Clients File */}
        <Card className="p-5 glass-card space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Planilha de Clientes → Passageiros</h3>
          </div>
          <div
            className="border border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => document.getElementById("clients-file")?.click()}
          >
            {clientsFile ? (
              <div className="flex items-center justify-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-success" />
                <span className="text-sm font-medium">{clientsFile.name}</span>
                <Badge variant="secondary" className="text-[10px]">{(clientsFile.size / 1024).toFixed(0)} KB</Badge>
              </div>
            ) : (
              <>
                <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Clique para selecionar CLIENTES.xlsx</p>
              </>
            )}
          </div>
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" id="clients-file"
            onChange={(e) => setClientsFile(e.target.files?.[0] || null)} />
        </Card>

        {/* Sales File */}
        <Card className="p-5 glass-card space-y-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Planilha de Vendas → Vendas + Custos</h3>
          </div>
          <div
            className="border border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => document.getElementById("sales-file")?.click()}
          >
            {salesFile ? (
              <div className="flex items-center justify-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-success" />
                <span className="text-sm font-medium">{salesFile.name}</span>
                <Badge variant="secondary" className="text-[10px]">{(salesFile.size / 1024).toFixed(0)} KB</Badge>
              </div>
            ) : (
              <>
                <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Clique para selecionar VENDAS.xlsx</p>
              </>
            )}
          </div>
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" id="sales-file"
            onChange={(e) => setSalesFile(e.target.files?.[0] || null)} />
        </Card>
      </div>

      {/* Import Button */}
      <Button onClick={handleImport} disabled={importing || (!clientsFile && !salesFile)} className="w-full" size="lg">
        {importing ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importando...</>
        ) : (
          <><Sparkles className="w-4 h-4 mr-2" /> Importar Dados</>
        )}
      </Button>

      {importing && <Progress value={progress} className="h-2" />}

      {/* Result */}
      {result && (
        <Card className="p-5 glass-card border-success/30 space-y-3">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle className="w-5 h-5" />
            <h3 className="text-sm font-bold">Importação concluída!</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span><strong>{result.paxCreated}</strong> passageiros criados</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span><strong>{result.paxUpdated}</strong> passageiros atualizados</span>
            </div>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground" />
              <span><strong>{result.salesCreated}</strong> vendas criadas</span>
            </div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground" />
              <span><strong>{result.costsCreated}</strong> itens de custo</span>
            </div>
            <div className="flex items-center gap-2">
              <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span><strong>{result.linksCreated}</strong> vínculos pax↔venda</span>
            </div>
          </div>
        </Card>
      )}

      {error && (
        <Card className="p-5 glass-card border-destructive/30">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </Card>
      )}
    </div>
  );
}
