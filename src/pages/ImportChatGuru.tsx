import { useState, useCallback, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload, Loader2, CheckCircle, AlertCircle, FileSpreadsheet,
  MessageSquare, Users, ArrowRight, ArrowLeft, Eye, Trash2,
  Pause, Play, XCircle, RotateCcw, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

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

interface JobStatus {
  id: string;
  status: string;
  total_rows: number;
  processed_rows: number;
  progress: number;
  conversations_created: number;
  conversations_updated: number;
  messages_created: number;
  messages_deduplicated: number;
  contacts_created: number;
  errors: number;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
}

const REQUIRED_COLS = ["created", "chat_id", "chat_name", "phone", "texto_mensagem", "from_device", "type"];

export default function ImportChatGuru() {
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [allMessages, setAllMessages] = useState<ParsedMessage[]>([]);
  const [preview, setPreview] = useState<ParsedMessage[]>([]);
  const [missingCols, setMissingCols] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const [createContacts, setCreateContacts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobStatus | null>(null);
  const [uploading, setUploading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processingRef = useRef(false);
  const { toast } = useToast();

  const uniqueChats = new Set(allMessages.map((m) => m.chat_id)).size;

  // Check for existing running job on mount
  useEffect(() => {
    checkExistingJob();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  const checkExistingJob = async () => {
    const { data } = await supabase
      .from("import_jobs")
      .select("*")
      .in("status", ["queued", "running", "paused"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setJobId(data.id);
      setJob(data as any);
      setStep(4);
      if (data.status === "running" || data.status === "queued") {
        startPollingAndProcessing(data.id);
      }
    }
  };

  const startPollingAndProcessing = (id: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    
    // Poll status every 3s
    pollingRef.current = setInterval(async () => {
      const { data } = await supabase.functions.invoke("import-chatguru", {
        body: { action: "status", job_id: id },
      });
      if (data) {
        setJob(data);
        if (data.status === "completed" || data.status === "cancelled" || data.status === "failed") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          if (data.status === "completed") setStep(5);
        }
      }
    }, 3000);

    // Start processing loop
    if (!processingRef.current) {
      processingRef.current = true;
      processLoop(id);
    }
  };

  const processLoop = async (id: string) => {
    try {
      while (true) {
        const { data, error: fnErr } = await supabase.functions.invoke("import-chatguru", {
          body: { action: "process", job_id: id },
        });
        
        if (fnErr) {
          console.error("Process error:", fnErr);
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }

        if (data?.done || data?.status === "completed" || data?.status === "cancelled") {
          break;
        }
        if (data?.status === "paused") {
          break;
        }
        
        // Small delay between chunks
        await new Promise(r => setTimeout(r, 500));
      }
    } finally {
      processingRef.current = false;
    }
  };

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter(
      (f) => f.name.endsWith(".csv") || f.name.endsWith(".xlsx")
    );
    setFiles((prev) => [...prev, ...dropped]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const parseFiles = async () => {
    setParsing(true);
    setError(null);
    const all: ParsedMessage[] = [];

    try {
      for (const file of files) {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        if (lines.length < 2) continue;

        const rows = lines.map(line => parseCSVLine(line));
        let headerIdx = 0;
        let headers: string[] = [];
        
        for (let i = 0; i < Math.min(rows.length, 5); i++) {
          const normalized = rows[i].map((c) => c.trim().toLowerCase());
          if (normalized.includes("created") && normalized.includes("chat_id")) {
            headerIdx = i;
            headers = rows[i].map((c) => c.trim().toLowerCase());
            break;
          }
          if (i === 0 && !normalized.includes("created")) {
            headers = [
              "created", "send_date", "responsavel", "chat_id", "chat_name", "phone",
              "numero_lead", "sender_name", "texto_mensagem", "is_template",
              "interactive_list", "interactive_quick_reply", "interactive_product",
              "from_device", "order_details", "call_log_answered", "deleted", "edits",
              "type", "message_status"
            ];
            headerIdx = -1;
            break;
          }
        }

        const missing = REQUIRED_COLS.filter((c) => !headers.includes(c));
        if (missing.length > 0) setMissingCols(missing);

        const colIdx = (name: string) => headers.indexOf(name);
        const startRow = headerIdx + 1;

        for (let i = startRow; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 5) continue;
          const chatId = (row[colIdx("chat_id")] || "").trim();
          if (!chatId) continue;
          const created = (row[colIdx("created")] || "").trim();
          if (!created) continue;

          all.push({
            created,
            chat_id: chatId,
            chat_name: (row[colIdx("chat_name")] || "").trim(),
            phone: (row[colIdx("phone")] || "").trim(),
            numero_lead: (row[colIdx("numero_lead")] || "").trim(),
            responsavel: (row[colIdx("responsavel")] || "").trim(),
            sender_name: (row[colIdx("sender_name")] || "").trim(),
            texto_mensagem: (row[colIdx("texto_mensagem")] || "").trim(),
            from_device: Number(row[colIdx("from_device")] || 0),
            type: (row[colIdx("type")] || "chat").trim(),
            message_status: (row[colIdx("message_status")] || "").trim(),
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

  const handleStartImport = async () => {
    setUploading(true);
    setError(null);

    try {
      // Upload all messages as JSON to storage
      const storagePath = `import_${Date.now()}.json`;
      const jsonBlob = new Blob([JSON.stringify(allMessages)], { type: "application/json" });

      const { error: uploadErr } = await supabase.storage
        .from("chatguru-imports")
        .upload(storagePath, jsonBlob, { contentType: "application/json", upsert: true });

      if (uploadErr) throw uploadErr;

      // Create job
      const { data, error: jobErr } = await supabase.functions.invoke("import-chatguru", {
        body: {
          action: "create_job",
          storage_path: storagePath,
          total_rows: allMessages.length,
          create_contacts: createContacts,
          file_names: files.map(f => f.name),
        },
      });

      if (jobErr) throw jobErr;
      if (data?.error) throw new Error(data.error);

      const newJobId = data.job_id;
      setJobId(newJobId);
      setStep(4);

      toast({ title: "Importação iniciada!", description: "O processo roda em background. Pode navegar livremente." });

      // Start processing
      startPollingAndProcessing(newJobId);
    } catch (err: any) {
      console.error("Start import error:", err);
      setError(err.message);
      toast({ title: "Erro ao iniciar importação", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handlePause = async () => {
    if (!jobId) return;
    await supabase.functions.invoke("import-chatguru", { body: { action: "pause", job_id: jobId } });
    toast({ title: "Importação pausada" });
  };

  const handleResume = async () => {
    if (!jobId) return;
    await supabase.functions.invoke("import-chatguru", { body: { action: "resume", job_id: jobId } });
    startPollingAndProcessing(jobId);
    toast({ title: "Importação retomada" });
  };

  const handleCancel = async () => {
    if (!jobId) return;
    await supabase.functions.invoke("import-chatguru", { body: { action: "cancel", job_id: jobId } });
    if (pollingRef.current) clearInterval(pollingRef.current);
    toast({ title: "Importação cancelada" });
  };

  const handleReset = async () => {
    if (!confirm("Isso irá apagar TODAS as conversas e mensagens importadas do ChatGuru. Tem certeza?")) return;
    setResetting(true);
    try {
      const { data, error: err } = await supabase.functions.invoke("import-chatguru", {
        body: { action: "reset" },
      });
      if (err) throw err;
      toast({
        title: "Reset concluído!",
        description: `${data.conversations_deleted} conversas e ${data.messages_deleted} mensagens apagadas.`,
      });
      setJob(null);
      setJobId(null);
      setStep(1);
      setFiles([]);
      setAllMessages([]);
    } catch (err: any) {
      toast({ title: "Erro no reset", description: err.message, variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  const getETA = () => {
    if (!job?.started_at || !job.processed_rows || job.processed_rows === 0) return null;
    const elapsed = Date.now() - new Date(job.started_at).getTime();
    const rate = job.processed_rows / elapsed;
    const remaining = job.total_rows - job.processed_rows;
    const etaMs = remaining / rate;
    const mins = Math.ceil(etaMs / 60000);
    if (mins < 1) return "< 1 min";
    return `~${mins} min`;
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">📥 Importar Conversas do ChatGuru</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Importação em background — pode navegar livremente
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={handleReset} disabled={resetting}>
          {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-1" />}
          Resetar Import
        </Button>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 text-xs font-medium">
        {["Upload", "Prévia", "Configurar", "Importar", "Relatório"].map((label, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step > i + 1 ? "bg-primary text-primary-foreground"
                : step === i + 1 ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                : "bg-muted text-muted-foreground"
            }`}>
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
          <input type="file" accept=".csv,.xlsx" multiple className="hidden" id="chatguru-files" onChange={handleFileSelect} />

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                  <FileSpreadsheet className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-medium truncate flex-1">{f.name}</span>
                  <Badge variant="secondary" className="text-[10px]">{(f.size / (1024 * 1024)).toFixed(1)} MB</Badge>
                  <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button onClick={parseFiles} disabled={files.length === 0 || parsing} className="w-full">
            {parsing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</> : <><Eye className="w-4 h-4 mr-2" /> Analisar Arquivos</>}
          </Button>
        </Card>
      )}

      {/* STEP 2: Preview */}
      {step === 2 && (
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2"><Eye className="w-4 h-4 text-primary" /> Prévia dos Dados</h2>
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
              <div><strong>Colunas não encontradas:</strong> {missingCols.join(", ")}</div>
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
                    <td className="px-2 py-1 max-w-[200px] truncate">{m.texto_mensagem || `[${m.type}]`}</td>
                    <td className="px-2 py-1"><Badge variant="secondary" className="text-[9px]">{m.type}</Badge></td>
                    <td className="px-2 py-1">
                      <Badge variant={m.from_device === 1 ? "default" : "outline"} className="text-[9px]">
                        {m.from_device === 1 || m.responsavel ? "→" : "←"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
            <Button onClick={() => setStep(3)} className="flex-1">Configurar <ArrowRight className="w-4 h-4 ml-1" /></Button>
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
                <div className="text-xs text-muted-foreground">chat_id já existente → mensagens novas são adicionadas</div>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30">
              <Checkbox checked disabled className="mt-0.5" />
              <div>
                <div className="text-sm font-medium">Deduplicar mensagens</div>
                <div className="text-xs text-muted-foreground">Mensagens duplicadas ignoradas automaticamente (obrigatório)</div>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30" onClick={() => setCreateContacts(!createContacts)}>
              <Checkbox checked={createContacts} className="mt-0.5" />
              <div>
                <div className="text-sm font-medium">Criar contatos automaticamente</div>
                <div className="text-xs text-muted-foreground">Se não existir cliente com o telefone, cria no CRM</div>
              </div>
            </label>
          </div>

          <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
            <strong className="text-foreground">Resumo:</strong>{" "}
            {allMessages.length.toLocaleString()} mensagens em {uniqueChats.toLocaleString()} conversas.
            Importação roda em background — pode navegar livremente.
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
            <Button onClick={handleStartImport} disabled={uploading} className="flex-1">
              {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando dados...</> : <>Iniciar Importação <ArrowRight className="w-4 h-4 ml-1" /></>}
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 4: Import Progress */}
      {step === 4 && (
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              {job?.status === "running" && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
              {job?.status === "paused" && <Pause className="w-4 h-4 text-accent-foreground" />}
              {job?.status === "completed" && <CheckCircle className="w-4 h-4 text-primary" />}
              {job?.status === "failed" && <AlertCircle className="w-4 h-4 text-destructive" />}
              🚀 Importação {job?.status === "running" ? "em andamento" : job?.status === "paused" ? "pausada" : job?.status || "..."}
            </h2>
            {getETA() && job?.status === "running" && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="w-3 h-3 mr-1" /> ETA: {getETA()}
              </Badge>
            )}
          </div>

          <div>
            <Progress value={job?.progress || 0} className="h-3" />
            <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
              <span>{(job?.processed_rows || 0).toLocaleString()} / {(job?.total_rows || 0).toLocaleString()} mensagens</span>
              <span>{job?.progress || 0}%</span>
            </div>
          </div>

          {/* Live stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Conversas criadas", value: job?.conversations_created || 0, icon: MessageSquare },
              { label: "Mensagens importadas", value: job?.messages_created || 0, icon: CheckCircle },
              { label: "Duplicadas ignoradas", value: job?.messages_deduplicated || 0, icon: AlertCircle },
              { label: "Erros", value: job?.errors || 0, icon: AlertCircle },
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

          {job?.error_message && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 inline mr-1" /> {job.error_message}
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            ✅ Pode navegar livremente — a importação continua em background
          </p>

          {/* Control buttons */}
          <div className="flex gap-2 justify-center">
            {job?.status === "running" && (
              <Button variant="outline" size="sm" onClick={handlePause}>
                <Pause className="w-4 h-4 mr-1" /> Pausar
              </Button>
            )}
            {job?.status === "paused" && (
              <Button variant="outline" size="sm" onClick={handleResume}>
                <Play className="w-4 h-4 mr-1" /> Retomar
              </Button>
            )}
            {(job?.status === "running" || job?.status === "paused") && (
              <Button variant="destructive" size="sm" onClick={handleCancel}>
                <XCircle className="w-4 h-4 mr-1" /> Cancelar
              </Button>
            )}
            {job?.status === "completed" && (
              <Button onClick={() => setStep(5)} className="flex-1">
                Ver Relatório <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* STEP 5: Report */}
      {step === 5 && job && (
        <Card className="p-6 space-y-5 border-primary/20">
          <div className="flex items-center gap-2 text-primary">
            <CheckCircle className="w-6 h-6" />
            <h2 className="text-lg font-bold">Importação Concluída!</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Conversas criadas", value: job.conversations_created, icon: MessageSquare },
              { label: "Conversas atualizadas", value: job.conversations_updated, icon: MessageSquare },
              { label: "Mensagens importadas", value: job.messages_created, icon: CheckCircle },
              { label: "Duplicadas (ignoradas)", value: job.messages_deduplicated, icon: AlertCircle },
              { label: "Contatos criados", value: job.contacts_created, icon: Users },
              { label: "Erros", value: job.errors, icon: AlertCircle },
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
            <Button variant="outline" onClick={() => { setStep(1); setFiles([]); setAllMessages([]); setJob(null); setJobId(null); }}>
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
