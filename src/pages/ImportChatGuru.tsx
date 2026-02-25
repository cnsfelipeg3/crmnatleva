import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload, Loader2, CheckCircle, AlertCircle, FileSpreadsheet,
  MessageSquare, Users, ArrowRight, ArrowLeft, Eye, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface ParsedMessage {
  created: string;
  chat_id: string;
  chat_name: string;
  phone: string;
  numero_lead: string;
  responsavel: string;
  sender_name: string;
  texto_mensagem: string;
  from_device: number;
  type: string;
  message_status: string;
  deleted: number;
  edits: number;
  is_template: number;
}

interface ImportStats {
  conversationsCreated: number;
  conversationsUpdated: number;
  messagesImported: number;
  messagesDeduplicated: number;
  contactsCreated: number;
  errors: number;
  chatsProcessed: number;
}

const REQUIRED_COLS = ["created", "chat_id", "chat_name", "phone", "texto_mensagem", "from_device", "type"];

export default function ImportChatGuru() {
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [allMessages, setAllMessages] = useState<ParsedMessage[]>([]);
  const [preview, setPreview] = useState<ParsedMessage[]>([]);
  const [missingCols, setMissingCols] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [createContacts, setCreateContacts] = useState(true);
  const [result, setResult] = useState<ImportStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const uniqueChats = new Set(allMessages.map((m) => m.chat_id)).size;

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter(
      (f) => f.name.endsWith(".csv") || f.name.endsWith(".xlsx")
    );
    setFiles((prev) => [...prev, ...dropped]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const parseFiles = async () => {
    setParsing(true);
    setError(null);
    const all: ParsedMessage[] = [];

    try {
      for (const file of files) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(data), { type: "array", cellDates: false });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];

        if (rows.length < 2) continue;

        // Find header row (first row with 'created' and 'chat_id')
        let headerIdx = 0;
        let headers: string[] = [];
        for (let i = 0; i < Math.min(rows.length, 5); i++) {
          const row = rows[i];
          const normalized = row.map((c: any) => String(c || "").trim().toLowerCase());
          if (normalized.includes("created") && normalized.includes("chat_id")) {
            headerIdx = i;
            headers = row.map((c: any) => String(c || "").trim().toLowerCase());
            break;
          }
          // If no header found in first row, the file might start without headers (continuation file)
          if (i === 0 && !normalized.includes("created")) {
            // Could be a continuation CSV without header - use default column order
            headers = [
              "created", "send_date", "responsavel", "chat_id", "chat_name", "phone",
              "numero_lead", "sender_name", "texto_mensagem", "is_template",
              "interactive_list", "interactive_quick_reply", "interactive_product",
              "from_device", "order_details", "call_log_answered", "deleted", "edits",
              "type", "message_status"
            ];
            headerIdx = -1; // no header row to skip
            break;
          }
        }

        // Check missing columns
        const missing = REQUIRED_COLS.filter((c) => !headers.includes(c));
        if (missing.length > 0) {
          setMissingCols(missing);
        }

        const colIdx = (name: string) => headers.indexOf(name);

        const startRow = headerIdx + 1;
        for (let i = startRow; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 5) continue;

          const chatId = String(row[colIdx("chat_id")] || "").trim();
          if (!chatId) continue;

          const created = String(row[colIdx("created")] || "").trim();
          if (!created) continue;

          all.push({
            created,
            chat_id: chatId,
            chat_name: String(row[colIdx("chat_name")] || "").trim(),
            phone: String(row[colIdx("phone")] || "").trim(),
            numero_lead: String(row[colIdx("numero_lead")] || "").trim(),
            responsavel: String(row[colIdx("responsavel")] || "").trim(),
            sender_name: String(row[colIdx("sender_name")] || "").trim(),
            texto_mensagem: String(row[colIdx("texto_mensagem")] || "").trim(),
            from_device: Number(row[colIdx("from_device")] || 0),
            type: String(row[colIdx("type")] || "chat").trim(),
            message_status: String(row[colIdx("message_status")] || "").trim(),
            deleted: Number(row[colIdx("deleted")] || 0),
            edits: Number(row[colIdx("edits")] || 0),
            is_template: Number(row[colIdx("is_template")] || 0),
          });
        }
      }

      setAllMessages(all);
      setPreview(all.slice(0, 20));
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Erro ao processar arquivos");
      toast({ title: "Erro ao processar", description: err.message, variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    setResult(null);
    setProgress(5);
    setProgressText("Preparando importação...");

    try {
      const BATCH_SIZE = 500;
      const totalBatches = Math.ceil(allMessages.length / BATCH_SIZE);
      const cumulative: ImportStats = {
        conversationsCreated: 0,
        conversationsUpdated: 0,
        messagesImported: 0,
        messagesDeduplicated: 0,
        contactsCreated: 0,
        errors: 0,
        chatsProcessed: 0,
      };

      for (let i = 0; i < allMessages.length; i += BATCH_SIZE) {
        const batch = allMessages.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        setProgressText(
          `Importando lote ${batchNum}/${totalBatches} (${i + 1}-${Math.min(i + BATCH_SIZE, allMessages.length)} de ${allMessages.length} mensagens)...`
        );
        setProgress(5 + (i / allMessages.length) * 90);

        const { data, error: fnError } = await supabase.functions.invoke("import-chatguru", {
          body: { messages: batch, createContacts },
        });

        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);

        cumulative.conversationsCreated += data.conversationsCreated || 0;
        cumulative.conversationsUpdated += data.conversationsUpdated || 0;
        cumulative.messagesImported += data.messagesImported || 0;
        cumulative.messagesDeduplicated += data.messagesDeduplicated || 0;
        cumulative.contactsCreated += data.contactsCreated || 0;
        cumulative.errors += data.errors || 0;
        cumulative.chatsProcessed += data.chatsProcessed || 0;
      }

      setProgress(100);
      setProgressText("Concluído!");
      setResult(cumulative);
      setStep(5);
      toast({
        title: "Importação concluída!",
        description: `${cumulative.messagesImported} mensagens importadas de ${cumulative.chatsProcessed} conversas`,
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
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">📥 Importar Conversas do ChatGuru</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Importe histórico de mensagens do ChatGuru (CSV) para o LiveChat
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 text-xs font-medium">
        {["Upload", "Prévia", "Configurar", "Importar", "Relatório"].map((label, i) => (
          <div key={i} className="flex items-center gap-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step > i + 1
                  ? "bg-primary text-primary-foreground"
                  : step === i + 1
                  ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step > i + 1 ? "✓" : i + 1}
            </div>
            <span className={step === i + 1 ? "text-foreground" : "text-muted-foreground"}>{label}</span>
            {i < 4 && <ArrowRight className="w-3 h-3 text-muted-foreground/40 mx-1" />}
          </div>
        ))}
      </div>

      {/* STEP 1: Upload */}
      {step === 1 && (
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" /> Selecionar Arquivos CSV
          </h2>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => document.getElementById("chatguru-files")?.click()}
            className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Arraste os CSVs do ChatGuru aqui ou clique para selecionar</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Suporta múltiplos arquivos (2023, 2024, 2025...)</p>
          </div>
          <input
            type="file"
            accept=".csv,.xlsx"
            multiple
            className="hidden"
            id="chatguru-files"
            onChange={handleFileSelect}
          />

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <FileSpreadsheet className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-medium truncate flex-1">{f.name}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {(f.size / (1024 * 1024)).toFixed(1)} MB
                  </Badge>
                  <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button onClick={parseFiles} disabled={files.length === 0 || parsing} className="w-full">
            {parsing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
            ) : (
              <><Eye className="w-4 h-4 mr-2" /> Analisar Arquivos</>
            )}
          </Button>
        </Card>
      )}

      {/* STEP 2: Preview */}
      {step === 2 && (
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" /> Prévia dos Dados
          </h2>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <div className="text-2xl font-bold text-foreground">{allMessages.length.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Mensagens</div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <div className="text-2xl font-bold text-foreground">{uniqueChats.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Conversas</div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <div className="text-2xl font-bold text-foreground">{files.length}</div>
              <div className="text-xs text-muted-foreground">Arquivos</div>
            </div>
          </div>

          {missingCols.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Colunas não encontradas:</strong> {missingCols.join(", ")}
                <br />
                <span className="text-xs">A importação pode ter dados incompletos.</span>
              </div>
            </div>
          )}

          <div className="border rounded-lg overflow-auto max-h-60">
            <table className="w-full text-xs">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="px-2 py-1.5 text-left">Data</th>
                  <th className="px-2 py-1.5 text-left">Nome</th>
                  <th className="px-2 py-1.5 text-left">Telefone</th>
                  <th className="px-2 py-1.5 text-left">Mensagem</th>
                  <th className="px-2 py-1.5 text-left">Tipo</th>
                  <th className="px-2 py-1.5 text-left">Dir</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((m, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-2 py-1 whitespace-nowrap">{m.created.substring(0, 16)}</td>
                    <td className="px-2 py-1 max-w-[120px] truncate">{m.chat_name}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{m.phone}</td>
                    <td className="px-2 py-1 max-w-[200px] truncate">
                      {m.texto_mensagem || `[${m.type}]`}
                    </td>
                    <td className="px-2 py-1">
                      <Badge variant="secondary" className="text-[9px]">{m.type}</Badge>
                    </td>
                    <td className="px-2 py-1">
                      <Badge
                        variant={m.from_device === 1 ? "default" : "outline"}
                        className="text-[9px]"
                      >
                        {m.from_device === 1 || m.responsavel ? "→" : "←"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
            <Button onClick={() => setStep(3)} className="flex-1">
              Configurar Importação <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 3: Config */}
      {step === 3 && (
        <Card className="p-6 space-y-5">
          <h2 className="text-sm font-semibold">⚙️ Configurações da Importação</h2>

          <div className="space-y-4">
            <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30">
              <Checkbox checked disabled className="mt-0.5" />
              <div>
                <div className="text-sm font-medium">Mesclar com conversas existentes</div>
                <div className="text-xs text-muted-foreground">
                  Se o chat_id já existir, as mensagens novas serão adicionadas à conversa existente
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30">
              <Checkbox checked disabled className="mt-0.5" />
              <div>
                <div className="text-sm font-medium">Deduplicar mensagens</div>
                <div className="text-xs text-muted-foreground">
                  Mensagens duplicadas serão ignoradas automaticamente (obrigatório)
                </div>
              </div>
            </label>

            <label
              className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30"
              onClick={() => setCreateContacts(!createContacts)}
            >
              <Checkbox checked={createContacts} className="mt-0.5" />
              <div>
                <div className="text-sm font-medium">Criar contatos automaticamente</div>
                <div className="text-xs text-muted-foreground">
                  Se não existir um cliente com o telefone, cria um contato novo no CRM
                </div>
              </div>
            </label>
          </div>

          <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
            <strong className="text-foreground">Resumo:</strong>{" "}
            {allMessages.length.toLocaleString()} mensagens em {uniqueChats.toLocaleString()} conversas
            serão importadas. Estimativa: ~{Math.ceil(allMessages.length / 500)} lotes.
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
            <Button onClick={() => setStep(4)} className="flex-1">
              Iniciar Importação <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 4: Import */}
      {step === 4 && (
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-semibold">🚀 Importação</h2>

          {!importing && !result && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Pronto para importar <strong>{allMessages.length.toLocaleString()}</strong> mensagens
                em <strong>{uniqueChats.toLocaleString()}</strong> conversas.
              </p>
              <Button onClick={handleImport} size="lg">
                <Loader2 className="w-4 h-4 mr-2" /> Iniciar Importação
              </Button>
            </div>
          )}

          {importing && (
            <div className="space-y-3 py-4">
              <Progress value={progress} className="h-3" />
              <p className="text-xs text-muted-foreground text-center">{progressText}</p>
              <p className="text-[10px] text-muted-foreground/60 text-center">
                Não feche esta página durante a importação
              </p>
            </div>
          )}
        </Card>
      )}

      {/* STEP 5: Report */}
      {step === 5 && result && (
        <Card className="p-6 space-y-5 border-primary/20">
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle className="w-6 h-6" />
            <h2 className="text-lg font-bold">Importação Concluída!</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Conversas criadas", value: result.conversationsCreated, icon: MessageSquare },
              { label: "Conversas atualizadas", value: result.conversationsUpdated, icon: MessageSquare },
              { label: "Mensagens importadas", value: result.messagesImported, icon: CheckCircle },
              { label: "Duplicadas (ignoradas)", value: result.messagesDeduplicated, icon: AlertCircle },
              { label: "Contatos criados", value: result.contactsCreated, icon: Users },
              { label: "Erros", value: result.errors, icon: AlertCircle },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <div className="text-lg font-bold">{value.toLocaleString()}</div>
                  <div className="text-[10px] text-muted-foreground">{label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setStep(1);
                setFiles([]);
                setAllMessages([]);
                setResult(null);
              }}
            >
              Importar mais
            </Button>
            <Button onClick={() => (window.location.href = "/livechat")} className="flex-1">
              <MessageSquare className="w-4 h-4 mr-2" /> Ver Conversas Importadas
            </Button>
          </div>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="p-4 border-destructive/30">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </Card>
      )}
    </div>
  );
}
