import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  Brain, Loader2, Copy, Check, Mic, Image as ImageIcon, FileText, MessageSquare,
  User, Clock, Activity, Zap, AlertTriangle, TrendingUp, Calendar, Timer, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { SummaryPdfTemplate, type SummaryPdfData } from "./SummaryPdfTemplate";

interface SummaryStats {
  total: number;
  texts: number;
  audios: number;
  images: number;
  documents: number;
  processed: number;
  cached: number;
  failed: number;
  skipped?: number;
  attendantName?: string | null;
  clientMsgs?: number;
  agentMsgs?: number;
  avgResponseMs?: number | null;
  maxResponseMs?: number | null;
  firstResponseMs?: number | null;
  durationMs?: number;
  firstAt?: number;
  lastAt?: number;
  lastSender?: "cliente" | "atendente";
  minutesSinceLast?: number;
  responseSamples?: number;
}

interface ConversationSummaryDialogProps {
  open: boolean;
  onClose: () => void;
  conversationId: string | null;
  contactName: string;
  stage: string;
}

const SUMMARY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/livechat-summary`;

function formatDuration(ms: number | null | undefined): string {
  if (ms == null || ms < 0) return "·";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (h < 24) return rm ? `${h}h ${rm}min` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

function formatRange(start?: number, end?: number): string {
  if (!start || !end) return "·";
  const s = new Date(start);
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  const fmt = (d: Date) => d.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  return sameDay
    ? `${s.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} · ${s.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} → ${e.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
    : `${fmt(s)} → ${fmt(e)}`;
}

// Response-time qualitative band
function responseQuality(ms?: number | null): { label: string; tone: "good" | "ok" | "warn" | "bad" } {
  if (ms == null) return { label: "Sem dado", tone: "ok" };
  const m = ms / 60000;
  if (m < 5) return { label: "Excelente", tone: "good" };
  if (m < 30) return { label: "Bom", tone: "good" };
  if (m < 120) return { label: "Aceitável", tone: "ok" };
  if (m < 60 * 12) return { label: "Lento", tone: "warn" };
  return { label: "Crítico", tone: "bad" };
}

const toneColor: Record<"good" | "ok" | "warn" | "bad", string> = {
  good: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  ok: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20",
  warn: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
  bad: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
};

export function ConversationSummaryDialog({ open, onClose, conversationId, contactName, stage }: ConversationSummaryDialogProps) {
  const [summary, setSummary] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [phase, setPhase] = useState<"idle" | "processing_media" | "generating" | "done">("idle");
  const [exportingPdf, setExportingPdf] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  const generateSummary = useCallback(async () => {
    if (!conversationId) {
      toast({ title: "Conversa não identificada", description: "Aguarde sincronizar e tente novamente.", variant: "destructive" });
      return;
    }
    setIsStreaming(true);
    setSummary("");
    setStats(null);
    setHasGenerated(true);
    setPhase("processing_media");

    const controller = new AbortController();
    abortRef.current = controller;
    let fullText = "";

    try {
      const resp = await fetch(SUMMARY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ conversationId, contactName, stage, limit: 50 }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast({ title: "Limite de requisições", description: "Tente novamente em instantes.", variant: "destructive" });
        else if (resp.status === 402) toast({ title: "Créditos insuficientes", description: "Adicione créditos ao workspace.", variant: "destructive" });
        else {
          const errBody = await resp.json().catch(() => ({}));
          toast({ title: "Erro ao gerar resumo", description: errBody?.message || `Status ${resp.status}`, variant: "destructive" });
        }
        setIsStreaming(false);
        setPhase("idle");
        return;
      }

      const statsHeader = resp.headers.get("X-Summary-Stats");
      if (statsHeader) {
        try { setStats(JSON.parse(statsHeader)); } catch { /* ignore */ }
      }
      setPhase("generating");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || "";
            if (delta) { fullText += delta; setSummary(fullText); }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
      setPhase("done");
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast({ title: "Erro ao gerar resumo", description: err.message, variant: "destructive" });
      }
      setPhase("idle");
    } finally {
      setIsStreaming(false);
    }
  }, [conversationId, contactName, stage]);

  useEffect(() => {
    if (open && conversationId && !hasGenerated) generateSummary();
  }, [open, conversationId, hasGenerated, generateSummary]);

  useEffect(() => {
    if (!open) {
      setHasGenerated(false);
      setSummary("");
      setStats(null);
      setPhase("idle");
      abortRef.current?.abort();
    }
  }, [open]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Resumo copiado!" });
  };

  const handleClose = () => { abortRef.current?.abort(); onClose(); };

  const ratio = useMemo(() => {
    if (!stats?.clientMsgs && !stats?.agentMsgs) return null;
    const c = stats.clientMsgs || 0;
    const a = stats.agentMsgs || 0;
    const total = c + a || 1;
    return { client: Math.round((c / total) * 100), agent: Math.round((a / total) * 100) };
  }, [stats]);

  const avgQ = responseQuality(stats?.avgResponseMs);
  const firstQ = responseQuality(stats?.firstResponseMs);

  const pdfData: SummaryPdfData | null = useMemo(() => {
    if (!summary || !stats) return null;
    return {
      contactName,
      stage,
      summary,
      attendantName: stats.attendantName,
      generatedAt: new Date(),
      rangeLabel: formatRange(stats.firstAt, stats.lastAt),
      kpis: {
        firstResponse: formatDuration(stats.firstResponseMs),
        firstResponseHint: firstQ.label,
        avgResponse: formatDuration(stats.avgResponseMs),
        avgResponseHint: `${stats.responseSamples || 0} respostas · ${avgQ.label}`,
        maxWait: formatDuration(stats.maxResponseMs),
        maxWaitHint: responseQuality(stats.maxResponseMs).label,
        lastActivity: stats.minutesSinceLast != null ? formatDuration(stats.minutesSinceLast * 60_000) : "·",
        lastActivityHint: stats.lastSender === "cliente" ? "Cliente aguardando" : "Atendente respondeu",
      },
      balance: ratio ? {
        agentPct: ratio.agent,
        clientPct: ratio.client,
        agentMsgs: stats.agentMsgs || 0,
        clientMsgs: stats.clientMsgs || 0,
        total: stats.total,
      } : null,
      media: {
        texts: stats.texts,
        audios: stats.audios,
        images: stats.images,
        documents: stats.documents,
        cached: stats.cached,
        failed: stats.failed,
        skipped: stats.skipped || 0,
      },
    };
  }, [summary, stats, contactName, stage, ratio, avgQ.label, firstQ.label]);

  const handleExportPdf = async () => {
    if (!pdfRef.current || !pdfData) return;
    setExportingPdf(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      // Wait a tick to ensure render
      await new Promise((r) => setTimeout(r, 50));
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        backgroundColor: "#FFFFFF",
        useCORS: true,
        logging: false,
        windowWidth: 800,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      if (imgH <= pageH) {
        pdf.addImage(imgData, "PNG", 0, 0, imgW, imgH);
      } else {
        // Multi-page slicing
        let remaining = imgH;
        let position = 0;
        while (remaining > 0) {
          pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
          remaining -= pageH;
          position -= pageH;
          if (remaining > 0) pdf.addPage();
        }
      }
      const safeName = (contactName || "cliente").replace(/[^\w\sÀ-ÿ-]/g, "").replace(/\s+/g, "_").slice(0, 40);
      const ts = new Date().toISOString().slice(0, 10);
      pdf.save(`Natleva_Resumo_${safeName}_${ts}.pdf`);
      toast({ title: "PDF gerado", description: "Resumo exportado com sucesso." });
    } catch (e: any) {
      toast({ title: "Erro ao exportar PDF", description: e?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header com gradiente */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-40"
            style={{ background: "radial-gradient(circle at 0% 0%, hsl(var(--primary)/0.12), transparent 60%)" }} />
          <div className="relative">
            <DialogTitle className="flex items-center gap-2.5 text-lg">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Brain className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="leading-tight">Resumo Inteligente</span>
                <span className="text-xs text-muted-foreground font-normal">{contactName}</span>
              </div>
            </DialogTitle>

            {/* Linha meta: atendente + etapa + período */}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <User className="h-3 w-3" />
                Atendente:
                <span className="font-semibold text-foreground">
                  {stats?.attendantName || "Sem dono"}
                </span>
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Activity className="h-3 w-3" />
                Etapa: <span className="font-semibold text-foreground capitalize">{stage?.replace(/_/g, " ") || "·"}</span>
              </span>
              {stats?.firstAt && stats?.lastAt && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatRange(stats.firstAt, stats.lastAt)}
                  </span>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Indicadores */}
        {stats && (
          <div className="px-6 py-4 border-b border-border/40 bg-muted/20 space-y-3">
            {/* KPIs principais */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <KpiCard
                icon={<Zap className="h-3.5 w-3.5" />}
                label="1ª resposta"
                value={formatDuration(stats.firstResponseMs)}
                tone={firstQ.tone}
                hint={firstQ.label}
              />
              <KpiCard
                icon={<Timer className="h-3.5 w-3.5" />}
                label="Tempo médio"
                value={formatDuration(stats.avgResponseMs)}
                tone={avgQ.tone}
                hint={`${stats.responseSamples || 0} respostas`}
              />
              <KpiCard
                icon={<AlertTriangle className="h-3.5 w-3.5" />}
                label="Maior espera"
                value={formatDuration(stats.maxResponseMs)}
                tone={responseQuality(stats.maxResponseMs).tone}
              />
              <KpiCard
                icon={<Clock className="h-3.5 w-3.5" />}
                label="Última atividade"
                value={stats.minutesSinceLast != null ? formatDuration(stats.minutesSinceLast * 60_000) : "·"}
                tone={stats.lastSender === "cliente" && (stats.minutesSinceLast || 0) > 30 ? "warn" : "ok"}
                hint={stats.lastSender === "cliente" ? "Cliente aguardando" : "Atendente respondeu"}
              />
            </div>

            {/* Balanço de mensagens */}
            {ratio && (
              <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                <div className="flex items-center justify-between mb-2 text-[11px]">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <TrendingUp className="h-3 w-3 text-primary" />
                    Balanço da conversa
                  </span>
                  <span className="text-muted-foreground">{stats.total} mensagens</span>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                  <div className="bg-primary transition-all" style={{ width: `${ratio.agent}%` }} />
                  <div className="bg-amber-500 transition-all" style={{ width: `${ratio.client}%` }} />
                </div>
                <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
                  <span>🟢 Atendente {ratio.agent}% · {stats.agentMsgs}</span>
                  <span>🟡 Cliente {ratio.client}% · {stats.clientMsgs}</span>
                </div>
              </div>
            )}

            {/* Mídias */}
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              <Chip icon={<MessageSquare className="h-2.5 w-2.5" />} label={`${stats.texts} textos`} />
              {stats.audios > 0 && <Chip icon={<Mic className="h-2.5 w-2.5" />} label={`${stats.audios} áudios${stats.cached > 0 ? ` · ${stats.cached} cache` : ""}`} tone="sky" />}
              {stats.images > 0 && <Chip icon={<ImageIcon className="h-2.5 w-2.5" />} label={`${stats.images} imagens`} tone="emerald" />}
              {stats.documents > 0 && <Chip icon={<FileText className="h-2.5 w-2.5" />} label={`${stats.documents} docs`} tone="amber" />}
              {(stats.failed > 0 || (stats.skipped || 0) > 0) && (
                <Chip icon={<AlertTriangle className="h-2.5 w-2.5" />} label={`${(stats.failed || 0) + (stats.skipped || 0)} mídia(s) não processada(s)`} tone="rose" />
              )}
            </div>
          </div>
        )}

        {/* Conteúdo */}
        <div className="flex-1 overflow-hidden">
          {isStreaming && phase === "processing_media" && !summary && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 px-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processando áudios, imagens e documentos...
            </div>
          )}
          {isStreaming && phase === "generating" && !summary && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 px-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Gerando análise...
            </div>
          )}
          <ScrollArea className="h-[45vh] px-6 py-4">
            {summary ? (
              <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:mt-4 prose-headings:mb-2 prose-headings:scroll-m-20 prose-p:my-1.5 prose-ul:my-2 prose-li:my-0.5">
                <ReactMarkdown>{summary}</ReactMarkdown>
                {isStreaming && <span className="inline-block w-1.5 h-4 ml-0.5 bg-primary animate-pulse rounded-sm" />}
              </div>
            ) : !isStreaming && hasGenerated ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem resumo disponível.</p>
            ) : null}
          </ScrollArea>
        </div>

        {/* Rodapé */}
        <div className="border-t border-border/40 px-6 py-3 flex items-center justify-between bg-muted/10">
          <Button variant="outline" size="sm" onClick={generateSummary} disabled={isStreaming || exportingPdf} className="gap-1.5 text-xs">
            {isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
            {hasGenerated ? "Regenerar" : "Gerar resumo"}
          </Button>
          {summary && !isStreaming && (
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
              <Button
                size="sm"
                onClick={handleExportPdf}
                disabled={exportingPdf || !pdfData}
                className="gap-1.5 text-xs bg-primary hover:bg-primary/90"
              >
                {exportingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                {exportingPdf ? "Gerando PDF..." : "Exportar PDF"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Hidden PDF render — fora do viewport mas no DOM para html2canvas capturar */}
      {pdfData && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            top: 0,
            left: "-10000px",
            zIndex: -1,
            pointerEvents: "none",
            opacity: 0,
          }}
        >
          <SummaryPdfTemplate data={pdfData} innerRef={pdfRef} />
        </div>
      )}
    </Dialog>
  );
}

function KpiCard({
  icon, label, value, tone, hint,
}: { icon: React.ReactNode; label: string; value: string; tone: "good" | "ok" | "warn" | "bad"; hint?: string }) {
  return (
    <div className={`rounded-lg border p-2.5 transition-colors ${toneColor[tone]}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide opacity-80">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-base font-bold leading-tight">{value}</div>
      {hint && <div className="text-[9px] opacity-70 mt-0.5">{hint}</div>}
    </div>
  );
}

function Chip({ icon, label, tone = "muted" }: { icon: React.ReactNode; label: string; tone?: "muted" | "sky" | "emerald" | "amber" | "rose" }) {
  const map = {
    muted: "bg-muted text-muted-foreground border-border",
    sky: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${map[tone]}`}>
      {icon}
      {label}
    </span>
  );
}
