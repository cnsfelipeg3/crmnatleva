import { useState } from "react";
import {
  ArrowLeft, Youtube, Loader2, CheckCircle, XCircle, Clock,
  ListPlus, Play, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { logAITeamAudit, AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/aiTeamAudit";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BatchItem {
  url: string;
  videoId: string | null;
  status: "waiting" | "processing" | "done" | "error";
  title?: string;
  error?: string;
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

interface YouTubeBatchImportProps {
  onBack: () => void;
  onSaved: () => void;
}

export default function YouTubeBatchImport({ onBack, onSaved }: YouTubeBatchImportProps) {
  const [urlsText, setUrlsText] = useState("");
  const [items, setItems] = useState<BatchItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const parseUrls = () => {
    const lines = urlsText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) { toast.error("Cole pelo menos uma URL"); return; }
    if (lines.length > 10) { toast.error("Máximo de 10 vídeos por lote"); return; }

    const parsed: BatchItem[] = lines.map(url => ({
      url,
      videoId: extractYouTubeId(url),
      status: extractYouTubeId(url) ? "waiting" : "error",
      error: extractYouTubeId(url) ? undefined : "URL inválida",
    }));

    setItems(parsed);
  };

  const handleProcess = async () => {
    setProcessing(true);
    let successCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.status === "error") continue;

      setCurrentIndex(i);
      setItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: "processing" } : it));

      try {
        const { data, error } = await supabase.functions.invoke("youtube-transcribe", {
          body: { url: item.url },
        });

        // Handle 422 TRANSCRIPT_UNAVAILABLE
        let errorBody: any = null;
        if (error) {
          try {
            const ctx = (error as any).context;
            if (ctx instanceof Response) errorBody = await ctx.json().catch(() => null);
          } catch {}
          if (!errorBody) errorBody = data;
        }
        const body422 = errorBody || data;
        if (body422?.error === "TRANSCRIPT_UNAVAILABLE") {
          setItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: "error", error: "Transcrição indisponível" } : it));
          continue;
        }
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        // Run ÓRION taxonomy extraction
        let taxonomy = null;
        let tags: string[] = [];
        let confidence: number | null = null;
        let contentText = data.structured_knowledge || data.transcript || "";
        try {
          const { data: orgData } = await supabase.functions.invoke("organize-knowledge", {
            body: { content: data.structured_knowledge || "", transcript: data.transcript || "" },
          });
          if (orgData?.taxonomy) {
            taxonomy = orgData.taxonomy.taxonomia || orgData.taxonomy;
            tags = orgData.taxonomy.tags || [];
            confidence = orgData.taxonomy.confianca ?? taxonomy?.confianca ?? null;
            contentText = orgData.taxonomy.resumo || contentText;
          }
        } catch (orgErr) {
          console.error("ÓRION error in batch:", orgErr);
        }

        // Save to KB with taxonomy
        const payload: any = {
          title: data.title || `Vídeo YouTube`,
          category: "destinos",
          description: `Transcrito do YouTube: ${item.url}`,
          content_text: contentText,
          file_url: item.url,
          file_type: "video/youtube",
          file_name: `youtube-${item.videoId}.txt`,
        };
        if (taxonomy) payload.taxonomy = taxonomy;
        if (tags.length > 0) payload.tags = tags;
        if (confidence !== null) payload.confidence = confidence;

        await supabase.from("ai_knowledge_base").insert(payload);

        setItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: "done", title: data.title } : it));
        successCount++;
        logAITeamAudit({
          action_type: AUDIT_ACTIONS.CREATE,
          entity_type: AUDIT_ENTITIES.KNOWLEDGE,
          entity_name: data.title || item.url,
          description: `YouTube batch import: ${data.title || item.url}`,
          performed_by: "ÓRION",
          details: { source: "youtube_batch", url: item.url },
        });
      } catch (err: any) {
        setItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: "error", error: err.message || "Erro" } : it));
      }

      // Small delay between requests
      if (i < items.length - 1) await new Promise(r => setTimeout(r, 1500));
    }

    setProcessing(false);
    setCurrentIndex(-1);
    if (successCount > 0) {
      toast.success(`${successCount} vídeo(s) importado(s) com sucesso!`);
      onSaved();
    } else {
      toast.error("Nenhum vídeo foi importado com sucesso");
    }
  };

  const doneCount = items.filter(i => i.status === "done").length;
  const errorCount = items.filter(i => i.status === "error").length;
  const totalValid = items.filter(i => i.videoId).length;
  const progress = totalValid > 0 ? ((doneCount + errorCount) / totalValid) * 100 : 0;

  return (
    <div className="min-h-screen animate-in fade-in duration-300">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar à Base
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
            <ListPlus className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold">Importação em Lote — YouTube</h1>
          <p className="text-sm text-muted-foreground">Cole até 10 URLs de vídeos do YouTube (uma por linha)</p>
        </div>

        {/* URL input */}
        {items.length === 0 && (
          <div className="space-y-3">
            <Label className="text-xs font-bold">URLs dos Vídeos (uma por linha)</Label>
            <textarea
              value={urlsText}
              onChange={e => setUrlsText(e.target.value)}
              placeholder={"https://www.youtube.com/watch?v=abc123\nhttps://youtu.be/def456\nhttps://www.youtube.com/watch?v=ghi789"}
              className="w-full min-h-[200px] rounded-lg border border-border bg-background p-3 text-sm font-mono resize-y focus:ring-2 focus:ring-primary/30"
            />
            <div className="flex gap-2">
              <Button onClick={parseUrls} className="flex-1 gap-2 h-11">
                <Play className="w-4 h-4" /> Validar URLs
              </Button>
              <Button variant="outline" onClick={onBack}>Cancelar</Button>
            </div>
          </div>
        )}

        {/* Items list */}
        {items.length > 0 && (
          <div className="space-y-4">
            {processing && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Processando {currentIndex + 1} de {totalValid}...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <div className="space-y-2">
              {items.map((item, idx) => {
                const StatusIcon = item.status === "done" ? CheckCircle :
                  item.status === "error" ? XCircle :
                  item.status === "processing" ? Loader2 : Clock;

                return (
                  <div key={idx} className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all",
                    item.status === "done" && "border-emerald-500/30 bg-emerald-500/5",
                    item.status === "error" && "border-red-500/30 bg-red-500/5",
                    item.status === "processing" && "border-primary/30 bg-primary/5",
                    item.status === "waiting" && "border-border/40",
                  )}>
                    <StatusIcon className={cn(
                      "w-5 h-5 shrink-0",
                      item.status === "done" && "text-emerald-500",
                      item.status === "error" && "text-red-500",
                      item.status === "processing" && "text-primary animate-spin",
                      item.status === "waiting" && "text-muted-foreground",
                    )} />

                    {item.videoId && (
                      <img
                        src={`https://img.youtube.com/vi/${item.videoId}/default.jpg`}
                        className="w-16 h-12 rounded object-cover shrink-0"
                        alt=""
                      />
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title || item.url}</p>
                      {item.error && <p className="text-xs text-red-500 mt-0.5">{item.error}</p>}
                      {item.status === "processing" && <p className="text-xs text-primary mt-0.5">Transcrevendo e processando com IA...</p>}
                    </div>

                    <Badge variant="outline" className={cn(
                      "text-[9px] shrink-0",
                      item.status === "done" && "border-emerald-500/40 text-emerald-600",
                      item.status === "error" && "border-red-500/40 text-red-600",
                    )}>
                      {item.status === "waiting" && "Aguardando"}
                      {item.status === "processing" && "Processando"}
                      {item.status === "done" && "Concluído"}
                      {item.status === "error" && "Erro"}
                    </Badge>
                  </div>
                );
              })}
            </div>

            {!processing && (
              <div className="flex gap-2">
                <Button onClick={handleProcess} disabled={totalValid === 0} className="flex-1 gap-2 h-11">
                  <Youtube className="w-4 h-4" /> Processar {totalValid} Vídeo(s)
                </Button>
                <Button variant="outline" onClick={() => { setItems([]); setUrlsText(""); }}>Limpar</Button>
              </div>
            )}

            {!processing && doneCount > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  {doneCount} vídeo(s) importado(s) com sucesso!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}