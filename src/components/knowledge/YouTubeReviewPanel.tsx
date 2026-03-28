import { useState, useEffect } from "react";
import {
  ArrowLeft, Youtube, Sparkles, Loader2, CheckCircle, Brain,
  Play, Zap, BookOpen, Shield, AlertTriangle, Lightbulb, MessageSquare,
  ClipboardPaste, Map,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import TaxonomyPreview, { Taxonomy } from "./TaxonomyPreview";

const CATEGORIES = [
  "geral", "destinos", "scripts", "preços", "fornecedores", "processos", "treinamento", "compliance",
];

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

// ─── Main Panel ───
interface YouTubeReviewPanelProps {
  onBack: () => void;
  onSaved: () => void;
}

export default function YouTubeReviewPanel({ onBack, onSaved }: YouTubeReviewPanelProps) {
  const [ytUrl, setYtUrl] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [organizing, setOrganizing] = useState(false);
  const [result, setResult] = useState<{
    title: string;
    transcript: string;
    structured_knowledge: string;
    videoId: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("destinos");
  const [showTranscript, setShowTranscript] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualTranscript, setManualTranscript] = useState("");
  const [errorVideoTitle, setErrorVideoTitle] = useState("");

  // Taxonomy state
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [resumo, setResumo] = useState("");

  // Processing step: idle -> transcribing -> organizing -> ready
  const [step, setStep] = useState<"idle" | "transcribing" | "organizing" | "ready">("idle");

  useEffect(() => {
    setVideoId(extractYouTubeId(ytUrl));
  }, [ytUrl]);

  const handleTranscribe = async (useManual = false) => {
    if (!videoId) return;
    setTranscribing(true);
    setStep("transcribing");
    setResult(null);
    setTaxonomy(null);
    try {
      const body: any = { url: ytUrl };
      if (useManual && manualTranscript.trim()) {
        body.manual_transcript = manualTranscript.trim();
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 180_000); // 3 min timeout
      let data: any, error: any;
      try {
        const res = await supabase.functions.invoke("youtube-transcribe", { body, signal: controller.signal as any });
        data = res.data;
        error = res.error;
      } catch (abortErr: any) {
        clearTimeout(timeout);
        if (abortErr.name === "AbortError") {
          toast.error("A extração demorou demais. Tente colar a transcrição manualmente.", { duration: 8000 });
          setShowManualInput(true);
          setStep("idle");
          return;
        }
        throw abortErr;
      }
      clearTimeout(timeout);

      let errorBody: any = null;
      if (error) {
        try {
          const ctx = (error as any).context;
          if (ctx instanceof Response) { errorBody = await ctx.json().catch(() => null); }
        } catch {}
        if (!errorBody) errorBody = data;
        if (!errorBody) {
          try { errorBody = JSON.parse(String(error.message)); } catch {}
        }
      }
      const body422 = errorBody || data;
      if (body422?.error === "TRANSCRIPT_UNAVAILABLE") {
        setShowManualInput(true);
        setErrorVideoTitle(body422?.videoTitle || "");
        setStep("idle");
        toast.error("Extração automática bloqueada. Cole a transcrição manualmente.", { duration: 6000 });
        return;
      }
      if (error) throw error;
      if (data?.error) { toast.error(data.error); setStep("idle"); return; }

      setResult(data);
      setShowManualInput(false);
      setEditTitle(data.title || "");

      // Auto-run ÓRION (organize with AI)
      setStep("organizing");
      setOrganizing(true);
      try {
        const { data: orgData, error: orgErr } = await supabase.functions.invoke("organize-knowledge", {
          body: { content: data.structured_knowledge || "", transcript: data.transcript || "" },
        });
        if (orgErr) throw orgErr;
        if (orgData?.taxonomy) {
          setTaxonomy(orgData.taxonomy.taxonomia || orgData.taxonomy);
          setTags(orgData.taxonomy.tags || []);
          setResumo(orgData.taxonomy.resumo || "");
          if (orgData.taxonomy.titulo_sugerido) {
            setEditTitle(orgData.taxonomy.titulo_sugerido);
          }
          toast.success("ÓRION analisou o conteúdo com sucesso!");
        } else if (orgData?.organized_content) {
          setResumo(orgData.organized_content);
          toast.success("Conhecimento organizado!");
        }
      } catch (orgE: any) {
        console.error("Organize error:", orgE);
        toast.error("Erro ao processar com ÓRION. Salvando conteúdo bruto.");
      }
      setOrganizing(false);
      setStep("ready");
    } catch (err: any) {
      toast.error("Erro ao transcrever: " + (err.message || "Erro desconhecido"));
      setStep("idle");
    } finally {
      setTranscribing(false);
    }
  };

  const handleReOrganize = async () => {
    if (!result) return;
    setOrganizing(true);
    try {
      const { data: orgData, error: orgErr } = await supabase.functions.invoke("organize-knowledge", {
        body: { content: result.structured_knowledge || "", transcript: result.transcript || "" },
      });
      if (orgErr) throw orgErr;
      if (orgData?.taxonomy) {
        setTaxonomy(orgData.taxonomy.taxonomia || orgData.taxonomy);
        setTags(orgData.taxonomy.tags || []);
        setResumo(orgData.taxonomy.resumo || "");
        if (orgData.taxonomy.titulo_sugerido) setEditTitle(orgData.taxonomy.titulo_sugerido);
        toast.success("Re-analisado pelo ÓRION!");
      }
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setOrganizing(false);
    }
  };

  const handleApprove = async () => {
    if (!editTitle.trim()) {
      toast.error("Título obrigatório");
      return;
    }
    setSaving(true);
    try {
      // Build content - resumo + markdown fallback
      const contentText = resumo || result?.structured_knowledge || "";

      const payload: any = {
        title: editTitle.trim(),
        category: editCategory,
        description: `Transcrito do YouTube: ${ytUrl}`,
        content_text: contentText.trim(),
        file_url: ytUrl,
        file_type: "video/youtube",
        file_name: `youtube-${videoId}.txt`,
        tags: tags.length > 0 ? tags : null,
        confidence: taxonomy?.confianca || null,
      };

      // Save taxonomy as JSONB
      if (taxonomy) {
        payload.taxonomy = taxonomy;
      }

      const { error } = await supabase.from("ai_knowledge_base").insert(payload);
      if (error) throw error;

      const tagCount = tags.length;
      const passeioCount = taxonomy?.experiencias?.passeios?.length || 0;
      const hotelCount = taxonomy?.hospedagem?.hoteis?.length || 0;
      toast.success(`Conhecimento importado! ${tagCount} tags · ${passeioCount} passeios · ${hotelCount} hotéis`);
      onSaved();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const transcript = result?.transcript || "";
  const charCount = transcript.length;
  const wordCount = transcript.split(/\s+/).filter(Boolean).length;

  return (
    <div className="min-h-screen animate-in fade-in duration-300">
      {/* ─── TOP BAR ─── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar à Base
          </button>

          {step === "ready" && (
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={handleReOrganize}
                disabled={organizing}
                className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
              >
                {organizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                Re-analisar com ÓRION
              </Button>
              <Button size="sm" onClick={handleApprove} disabled={saving || !editTitle.trim()} className="gap-1.5">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Aprovar e Adicionar à Base
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* ─── STEP 1: URL + VIDEO PREVIEW ─── */}
        {step === "idle" && !result && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
                <Youtube className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold">Extrair Conhecimento do YouTube</h1>
              <p className="text-sm text-muted-foreground">Cole a URL → Transcrição automática → ÓRION analisa e tagueia tudo</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <Youtube className="w-4 h-4 text-red-500" /> URL do YouTube
              </Label>
              <Input value={ytUrl} onChange={(e) => setYtUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="font-mono text-sm h-11" />
            </div>

            {videoId && (
              <div className="rounded-xl overflow-hidden border border-border/40 bg-black shadow-lg">
                <iframe src={`https://www.youtube.com/embed/${videoId}`} className="w-full aspect-video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="YouTube Preview" />
              </div>
            )}

            {videoId && (
              <div className="space-y-4">
                {!showManualInput && (
                  <Button onClick={() => handleTranscribe(false)} disabled={transcribing} className="w-full gap-2 h-12 text-base">
                    {transcribing ? <><Loader2 className="w-5 h-5 animate-spin" /> Transcrevendo...</> : <><Sparkles className="w-5 h-5" /> Transcrever e Analisar com ÓRION</>}
                  </Button>
                )}

                {/* Manual transcript section */}
                <div className={cn(
                  "space-y-3 rounded-xl border p-4 transition-all duration-300",
                  showManualInput ? "border-amber-400 dark:border-amber-600 bg-amber-50/60 dark:bg-amber-950/30 shadow-md" : "border-border/40 bg-muted/30"
                )}>
                  {showManualInput && (
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-1">
                      <AlertTriangle className="w-4.5 h-4.5" />
                      <span className="text-sm font-bold">Extração automática bloqueada pelo YouTube</span>
                    </div>
                  )}
                  <div className={cn("text-xs space-y-2", showManualInput ? "text-foreground/80" : "text-muted-foreground")}>
                    <p className="font-semibold">{showManualInput ? "Siga estes passos:" : "Ou cole a transcrição manualmente:"}</p>
                    <ol className="list-decimal list-inside space-y-1 pl-1">
                      <li>Abra o vídeo no YouTube</li>
                      <li>Clique nos <strong>3 pontos (⋯)</strong></li>
                      <li>Clique em <strong>"Mostrar transcrição"</strong></li>
                      <li>Selecione tudo e cole abaixo</li>
                    </ol>
                  </div>
                  <textarea value={manualTranscript} onChange={(e) => setManualTranscript(e.target.value)} placeholder="Cole a transcrição aqui..." className="w-full min-h-[180px] rounded-lg border border-border bg-background p-3 text-sm font-mono resize-y focus:ring-2 focus:ring-primary/30" />
                  <Button onClick={() => handleTranscribe(true)} disabled={transcribing || manualTranscript.trim().length < 20} className="w-full gap-2 h-11">
                    {transcribing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</> : <><ClipboardPaste className="w-4 h-4" /> Processar Transcrição</>}
                  </Button>
                </div>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={onBack} className="w-full">Cancelar</Button>
          </div>
        )}

        {/* ─── PROCESSING STATES ─── */}
        {(step === "transcribing" || step === "organizing") && (
          <div className="max-w-md mx-auto text-center py-20 space-y-6">
            <div className={cn(
              "w-20 h-20 rounded-2xl flex items-center justify-center mx-auto animate-pulse",
              step === "transcribing" ? "bg-red-500/10" : "bg-amber-500/10"
            )}>
              {step === "transcribing" ? <Youtube className="w-10 h-10 text-red-500" /> : <Brain className="w-10 h-10 text-amber-500" />}
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {step === "transcribing" ? "Buscando legendas do vídeo..." : "ÓRION analisando conteúdo..."}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {step === "transcribing" ? "Extraindo transcrição automática" : "Classificando, tagueando e estruturando o conhecimento"}
              </p>
            </div>
            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={cn(
                "h-full rounded-full animate-[indeterminate_1.5s_ease-in-out_infinite]",
                step === "transcribing" ? "bg-red-500" : "bg-amber-500"
              )} style={{
                width: "40%",
                animation: "indeterminate 1.5s ease-in-out infinite",
              }} />
            </div>
            <style>{`
              @keyframes indeterminate {
                0% { margin-left: 0%; width: 30%; }
                50% { margin-left: 30%; width: 40%; }
                100% { margin-left: 70%; width: 30%; }
              }
            `}</style>
          </div>
        )}

        {/* ─── STEP 3: FULL REVIEW WITH TAXONOMY ─── */}
        {step === "ready" && result && (
          <div className="space-y-6">
            {/* Success banner */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Conhecimento extraído e classificado!</p>
                <p className="text-xs text-muted-foreground">
                  {tags.length} tags · {taxonomy?.experiencias?.passeios?.length || 0} passeios · {taxonomy?.hospedagem?.hoteis?.length || 0} hotéis · Confiança {Math.round((taxonomy?.confianca || 0) * 100)}%
                </p>
              </div>
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
              {/* LEFT: Video + Metadata */}
              <div className="space-y-4">
                {videoId && (
                  <div className="rounded-xl overflow-hidden border border-border/40 bg-black shadow-lg sticky top-20">
                    <iframe src={`https://www.youtube.com/embed/${videoId}`} className="w-full aspect-video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={editTitle} />
                    <div className="bg-card p-4 space-y-3 border-t border-border/40">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Título</Label>
                        <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-sm font-medium" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Categoria</Label>
                        <Select value={editCategory} onValueChange={setEditCategory}>
                          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Tags */}
                      {tags.length > 0 && (
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Tags ({tags.length})</Label>
                          <div className="flex flex-wrap gap-1">
                            {tags.map((tag, i) => (
                              <Badge key={i} variant="secondary" className="text-[9px]">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                          <p className="text-lg font-bold text-foreground">{charCount.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">caracteres</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                          <p className="text-lg font-bold text-foreground">{wordCount.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">palavras</p>
                        </div>
                      </div>

                      {/* Resumo */}
                      {resumo && (
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Resumo Executivo</Label>
                          <p className="text-xs text-muted-foreground leading-relaxed">{resumo}</p>
                        </div>
                      )}

                      {/* Transcript toggle */}
                      <button onClick={() => setShowTranscript(!showTranscript)} className="flex items-center gap-2 text-xs font-bold text-primary hover:underline w-full">
                        <Play className="w-3.5 h-3.5" />
                        {showTranscript ? "Ocultar Transcrição" : "Ver Transcrição Completa"}
                      </button>
                      {showTranscript && (
                        <div className="max-h-[400px] overflow-y-auto rounded-lg bg-muted/30 p-3 border border-border/30">
                          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">{transcript}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT: Taxonomy Preview */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <Brain className="w-5 h-5 text-amber-500" />
                  <h2 className="text-lg font-bold">Taxonomia do ÓRION</h2>
                </div>

                {taxonomy ? (
                  <TaxonomyPreview taxonomy={taxonomy} onChange={setTaxonomy} />
                ) : (
                  <div className="rounded-xl border border-border/40 bg-card p-8 text-center">
                    <Brain className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Taxonomia não disponível</p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={handleReOrganize} disabled={organizing}>
                      {organizing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                      Processar com ÓRION
                    </Button>
                  </div>
                )}

                {/* Bottom action bar */}
                <div className="flex items-center justify-between pt-4 border-t border-border/40">
                  <Button variant="outline" size="sm" onClick={onBack}>Cancelar</Button>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={handleReOrganize} disabled={organizing}
                      className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30">
                      {organizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                      Re-analisar
                    </Button>
                    <Button onClick={handleApprove} disabled={saving} className="gap-1.5">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Aprovar e Adicionar à Base
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
