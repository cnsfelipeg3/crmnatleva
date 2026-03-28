import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, Sparkles, Loader2, CheckCircle, AlertCircle, FileSpreadsheet, Users, ShoppingCart, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ImportResult {
  paxCreated: number;
  paxUpdated: number;
  salesCreated: number;
  costsCreated: number;
  linksCreated: number;
}

function normalizeHeader(h: any): string {
  if (!h) return "";
  return String(h).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}

function findCol(headers: string[], ...keywords: string[]): number {
  const normalized = headers.map(normalizeHeader);
  for (const kw of keywords) {
    const kwNorm = normalizeHeader(kw);
    // exact
    let idx = normalized.indexOf(kwNorm);
    if (idx !== -1) return idx;
    // starts with
    idx = normalized.findIndex(h => h.startsWith(kwNorm));
    if (idx !== -1) return idx;
    // contains
    idx = normalized.findIndex(h => h.includes(kwNorm));
    if (idx !== -1) return idx;
  }
  return -1;
}

function cellStr(row: any[], idx: number): string | null {
  if (idx < 0 || !row[idx]) return null;
  return String(row[idx]).trim() || null;
}

function cellNum(row: any[], idx: number): number | null {
  if (idx < 0 || row[idx] === undefined || row[idx] === null || row[idx] === "") return null;
  const v = row[idx];
  if (typeof v === "number") return v;
  let s = String(v).replace(/\s/g, "").replace(/[R$]/g, "");
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function formatExcelDate(val: any): string | null {
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
}

function cellDate(row: any[], idx: number): string | null {
  if (idx < 0) return null;
  return formatExcelDate(row[idx]);
}

export default function ImportData() {
  const [clientsFile, setClientsFile] = useState<File | null>(null);
  const [salesFile, setSalesFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const parseClientsXlsx = (file: File): Promise<any[]> => {
    return new Promise(async (resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const XLSX = await import("xlsx");
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array", cellDates: true });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];

          // Find header row dynamically
          let headerIdx = -1;
          let headers: string[] = [];
          for (let i = 0; i < Math.min(rows.length, 15); i++) {
            const row = rows[i];
            if (!row) continue;
            const asStr = row.map((c: any) => normalizeHeader(c));
            if (asStr.some(h => h.includes("nome")) && asStr.some(h => h.includes("cpf") || h.includes("cnpj"))) {
              headerIdx = i;
              headers = row.map((c: any) => String(c ?? ""));
              break;
            }
          }
          if (headerIdx === -1) { reject("Cabeçalho não encontrado na planilha de clientes (procurando 'Nome' e 'CPF')"); return; }

          // Map columns
          const colName = findCol(headers, "Nome");
          const colPhone = findCol(headers, "Telefone");
          const colEmail = findCol(headers, "Email");
          const colCpf = findCol(headers, "CPF/CNPJ", "CPF");
          const colRg = findCol(headers, "RG ou Certidao", "RG");
          const colBirth = findCol(headers, "Data de Nascimento", "Nascimento");
          const colPassport = findCol(headers, "Numero do Passaporte", "Passaporte");
          const colPassportExpiry = findCol(headers, "Vencimento do Passaporte");
          const colCity = findCol(headers, "Cidade");
          const colAddress = findCol(headers, "Endereco");
          const colNumber = findCol(headers, "Numero");
          const colComplement = findCol(headers, "Complemento");
          const colCep = findCol(headers, "CEP");
          const colCategoria = findCol(headers, "Categoria");

          // Column mapping resolved

          const passengers: any[] = [];
          for (let i = headerIdx + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row) continue;
            const name = cellStr(row, colName);
            if (!name || name.length < 2 || name === "Criar nome") continue;

            passengers.push({
              full_name: name,
              phone: cellStr(row, colPhone),
              email: cellStr(row, colEmail),
              cpf: cellStr(row, colCpf),
              rg: cellStr(row, colRg),
              birth_date: cellDate(row, colBirth),
              passport_number: cellStr(row, colPassport),
              passport_expiry: cellDate(row, colPassportExpiry),
              city: cellStr(row, colCity),
              address: cellStr(row, colAddress),
              cep: cellStr(row, colCep),
              complement: cellStr(row, colComplement),
              categoria: cellStr(row, colCategoria) || "SILVER",
            });
          }
          // Passengers parsed
          resolve(passengers);
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const parseSalesXlsx = (file: File): Promise<any[]> => {
    return new Promise(async (resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const XLSX = await import("xlsx");
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array", cellDates: true });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];

          // Find header row
          let headerIdx = -1;
          let headers: string[] = [];
          for (let i = 0; i < Math.min(rows.length, 15); i++) {
            const row = rows[i];
            if (!row) continue;
            const asStr = row.map((c: any) => normalizeHeader(c));
            if (asStr.some(h => h.includes("venda") || h.includes("nome")) && 
                asStr.some(h => h.includes("vendedor") || h.includes("fechamento"))) {
              headerIdx = i;
              headers = row.map((c: any) => String(c ?? ""));
              break;
            }
          }
          if (headerIdx === -1) { reject("Cabeçalho não encontrado na planilha de vendas"); return; }

          // Map columns dynamically
          const col = {
            id: findCol(headers, "ID da Venda"),
            name: findCol(headers, "Nome Cliente Principal", "Nome Cliente"),
            seller: findCol(headers, "Vendedor"),
            closeDate: findCol(headers, "Data de Fechamento"),
            status: findCol(headers, "Status da Venda"),
            tagChatguru: findCol(headers, "TAG ChatGuru"),
            linkChat: findCol(headers, "Link Chat"),
            totalValue: findCol(headers, "Valor Total da Venda", "Valor Total"),
            paymentMethod: findCol(headers, "Forma de Pagamento"),
            receivedValue: findCol(headers, "Valor Liquido Recebido", "Valor Liquido"),
            totalCost: findCol(headers, "Custo Total"),
            profit: findCol(headers, "Lucro Bruto", "Lucro"),
            margin: findCol(headers, "Margem"),
            products: findCol(headers, "Produtos Contratados", "Produtos"),
            departureDate: findCol(headers, "Data de Ida"),
            returnDate: findCol(headers, "Data de Volta"),
            origin: findCol(headers, "Origem"),
            destination: findCol(headers, "Destino"),
            airline: findCol(headers, "Companhia Aerea"),
            flightClass: findCol(headers, "Classe"),
            connections: findCol(headers, "Conexoes"),
            hotel: findCol(headers, "Hotel"),
            room: findCol(headers, "Quarto"),
            mealPlan: findCol(headers, "Alimentacao"),
            locators: findCol(headers, "Localizadores"),
            hotelCode: findCol(headers, "Codigo Reserva Hotel"),
            otherCodes: findCol(headers, "Outros Codigos"),
            totalPax: findCol(headers, "Total Passageiros"),
            adults: findCol(headers, "Adultos"),
            children: findCol(headers, "Criancas"),
            childrenAges: findCol(headers, "Idade das Criancas"),
            observations: findCol(headers, "Observacoes"),
          };

          console.log("Sales column map:", col);

          const sales: any[] = [];
          for (let i = headerIdx + 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row) continue;
            const saleId = cellStr(row, col.id);
            const name = cellStr(row, col.name);
            if (!name || name.length < 2 || name === "teste") continue;

            const receivedValue = cellNum(row, col.receivedValue) ?? cellNum(row, col.totalValue) ?? 0;
            const totalCost = cellNum(row, col.totalCost) ?? 0;
            const profit = cellNum(row, col.profit) ?? 0;

            // The "Nome Cliente Principal" contains the passenger/client name
            // Use it as both sale name and passenger name
            const saleName = name;
            
            // Extract IATA from origin/destination
            const originText = cellStr(row, col.origin) || "";
            const destText = cellStr(row, col.destination) || "";

            // Trim observations to avoid huge payloads (keep first 2000 chars)
            let obs = cellStr(row, col.observations) || "";
            if (obs && obs.length > 2000) obs = obs.substring(0, 2000);

            sales.push({
              name: saleName,
              passengers: saleName, // link passenger by this name
              close_date: cellDate(row, col.closeDate),
              received_value: receivedValue,
              total_cost: totalCost,
              profit: profit,
              payment_method: cellStr(row, col.paymentMethod),
              products: cellStr(row, col.products),
              departure_date: cellDate(row, col.departureDate),
              return_date: cellDate(row, col.returnDate),
              origin: originText,
              destination: destText,
              adults: cellNum(row, col.adults) ?? 1,
              children: cellNum(row, col.children) ?? 0,
              children_ages: cellStr(row, col.childrenAges),
              flight_class: cellStr(row, col.flightClass),
              observations: obs ? obs.replace(/<br\/>/g, "\n") : null,
              airline: cellStr(row, col.airline),
              connections: cellStr(row, col.connections),
              hotel_name: cellStr(row, col.hotel),
              hotel_room: cellStr(row, col.room),
              hotel_meal_plan: cellStr(row, col.mealPlan),
              tag_chatguru: cellStr(row, col.tagChatguru),
              link_chat: cellStr(row, col.linkChat),
              locators: cellStr(row, col.locators),
              other_codes: cellStr(row, col.otherCodes),
              hotel_reservation_code: cellStr(row, col.hotelCode),
              cost_items: [],
            });
          }

          console.log(`Parsed ${sales.length} sales from sales file`);
          resolve(sales);
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
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
    setProgressText("Lendo planilhas...");

    try {
      let passengers: any[] = [];
      let sales: any[] = [];

      if (clientsFile) {
        setProgress(15);
        setProgressText("Processando clientes...");
        passengers = await parseClientsXlsx(clientsFile);
      }

      if (salesFile) {
        setProgress(30);
        setProgressText("Processando vendas...");
        sales = await parseSalesXlsx(salesFile);
      }

      setProgress(40);
      setProgressText(`Enviando ${passengers.length} passageiros e ${sales.length} vendas...`);

      // Send in batches to avoid payload size limits
      const PAX_BATCH = 50;
      const SALE_BATCH = 20;
      let totalResult: ImportResult = { paxCreated: 0, paxUpdated: 0, salesCreated: 0, costsCreated: 0, linksCreated: 0 };

      // Import passengers first (in batches)
      for (let i = 0; i < passengers.length; i += PAX_BATCH) {
        const batch = passengers.slice(i, i + PAX_BATCH);
        setProgressText(`Importando passageiros ${i + 1}-${Math.min(i + PAX_BATCH, passengers.length)} de ${passengers.length}...`);
        setProgress(40 + (i / Math.max(passengers.length, 1)) * 20);

        const { data, error: fnError } = await supabase.functions.invoke("import-monday-data", {
          body: { passengers: batch, sales: [] },
        });

        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);
        totalResult.paxCreated += data.paxCreated || 0;
        totalResult.paxUpdated += data.paxUpdated || 0;
      }

      // Import sales (in batches)
      for (let i = 0; i < sales.length; i += SALE_BATCH) {
        const batch = sales.slice(i, i + SALE_BATCH);
        setProgressText(`Importando vendas ${i + 1}-${Math.min(i + SALE_BATCH, sales.length)} de ${sales.length}...`);
        setProgress(60 + (i / Math.max(sales.length, 1)) * 35);

        const { data, error: fnError } = await supabase.functions.invoke("import-monday-data", {
          body: { passengers: [], sales: batch },
        });

        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);
        totalResult.salesCreated += data.salesCreated || 0;
        totalResult.costsCreated += data.costsCreated || 0;
        totalResult.linksCreated += data.linksCreated || 0;
        totalResult.paxCreated += data.paxCreated || 0;
      }

      setProgress(100);
      setProgressText("Concluído!");
      setResult(totalResult);
      toast({
        title: "Importação concluída!",
        description: `${totalResult.paxCreated} passageiros criados, ${totalResult.salesCreated} vendas importadas`,
      });
    } catch (err: any) {
      console.error("Import error:", err);
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
        <Card className="p-5 space-y-3">
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
                <FileSpreadsheet className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium">{clientsFile.name}</span>
                <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded">{(clientsFile.size / 1024).toFixed(0)} KB</span>
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
        <Card className="p-5 space-y-3">
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
                <FileSpreadsheet className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium">{salesFile.name}</span>
                <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded">{(salesFile.size / 1024).toFixed(0)} KB</span>
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

      {importing && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">{progressText}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <Card className="p-5 border-green-500/30 space-y-3">
          <div className="flex items-center gap-2 text-green-600">
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
              <span><strong>{result.paxUpdated}</strong> atualizados</span>
            </div>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground" />
              <span><strong>{result.salesCreated}</strong> vendas criadas</span>
            </div>
            <div className="flex items-center gap-2">
              <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span><strong>{result.linksCreated}</strong> vínculos pax↔venda</span>
            </div>
          </div>
        </Card>
      )}

      {error && (
        <Card className="p-5 border-destructive/30">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </Card>
      )}
    </div>
  );
}
