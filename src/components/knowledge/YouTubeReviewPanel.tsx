import { useState, useEffect } from "react";
import {
  ArrowLeft, Youtube, Sparkles, Loader2, CheckCircle, Brain,
  Play, Zap, BookOpen, Shield, AlertTriangle, Lightbulb, MessageSquare,
  LayoutGrid, List, ClipboardPaste,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import YouTubeActionCard, { ActionItem, ActionItemType, AgentOption, classifySection } from "./YouTubeActionCard";

const CATEGORIES = [
  "geral", "destinos", "scripts", "preços", "fornecedores", "processos", "treinamento", "compliance",
];

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

// ─── Parse markdown into action items ───
function parseToActionItems(content: string): ActionItem[] {
  const lines = content.split("\n");
  const items: ActionItem[] = [];
  let currentTitle = "";
  let currentBody: string[] = [];

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)/);
    if (h2Match) {
      if (currentTitle || currentBody.length > 0) {
        const body = currentBody.join("\n").trim();
        if (body.length > 0) {
          items.push({
            id: crypto.randomUUID(),
            type: classifySection(currentTitle),
            title: currentTitle,
            body,
            originalSection: currentTitle,
          });
        }
      }
      currentTitle = h2Match[1].trim();
      currentBody = [];
    } else if (line.match(/^#\s+/)) {
      continue;
    } else {
      currentBody.push(line);
    }
  }
  if (currentTitle || currentBody.length > 0) {
    const body = currentBody.join("\n").trim();
    if (body.length > 0) {
      items.push({
        id: crypto.randomUUID(),
        type: classifySection(currentTitle),
        title: currentTitle,
        body,
        originalSection: currentTitle,
      });
    }
  }
  return items;
}

// ─── Stats by type ───
const TYPE_COUNTS_CONFIG: { type: ActionItemType; icon: React.ElementType; label: string; color: string }[] = [
  { type: "skill", icon: Zap, label: "Skills", color: "text-violet-500" },
  { type: "knowledge", icon: BookOpen, label: "Conhecimento", color: "text-blue-500" },
  { type: "rule", icon: Shield, label: "Regras", color: "text-emerald-500" },
  { type: "script", icon: MessageSquare, label: "Scripts", color: "text-indigo-500" },
  { type: "alert", icon: AlertTriangle, label: "Alertas", color: "text-amber-500" },
  { type: "tip", icon: Lightbulb, label: "Dicas", color: "text-yellow-500" },
];

// ─── Organize with AI ───
function OrganizeWithAIButton({ content, transcript, onOrganized }: { content: string; transcript?: string; onOrganized: (v: string) => void }) {
  const [organizing, setOrganizing] = useState(false);

  const handleOrganize = async () => {
    if (!content.trim()) return;
    setOrganizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("organize-knowledge", {
        body: { content, transcript: transcript || "" },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      if (data?.organized_content) {
        onOrganized(data.organized_content);
        toast.success("Conhecimento reorganizado com IA!");
      }
    } catch (err: any) {
      toast.error("Erro ao organizar: " + (err.message || "Erro desconhecido"));
    } finally {
      setOrganizing(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleOrganize}
      disabled={organizing || !content.trim()}
      className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
    >
      {organizing ? (
        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Reorganizando...</>
      ) : (
        <><Sparkles className="w-3.5 h-3.5" /> Organizar com IA</>
      )}
    </Button>
  );
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
  const [result, setResult] = useState<{
    title: string;
    transcript: string;
    structured_knowledge: string;
    videoId: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("destinos");
  const [editContent, setEditContent] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [filterType, setFilterType] = useState<ActionItemType | "all">("all");
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualTranscript, setManualTranscript] = useState("");
  const [errorVideoTitle, setErrorVideoTitle] = useState("");

  // Fetch agents
  useEffect(() => {
    supabase.from("ai_team_agents").select("id, name, emoji, role").eq("is_active", true)
      .then(({ data }) => {
        if (data) setAgents(data.map(a => ({ id: a.id, name: a.name, emoji: a.emoji, role: a.role })));
      });
  }, []);

  useEffect(() => {
    setVideoId(extractYouTubeId(ytUrl));
  }, [ytUrl]);

  // Parse content into action items whenever editContent changes
  useEffect(() => {
    if (editContent) {
      setActionItems(parseToActionItems(editContent));
    }
  }, [editContent]);

  const handleTranscribe = async (useManual = false) => {
    if (!videoId) return;
    setTranscribing(true);
    setResult(null);
    try {
      const body: any = { url: ytUrl };
      if (useManual && manualTranscript.trim()) {
        body.manual_transcript = manualTranscript.trim();
      }
      const { data, error } = await supabase.functions.invoke("youtube-transcribe", { body });
      if (error) throw error;
      if (data?.error === "TRANSCRIPT_UNAVAILABLE") {
        // Show manual transcript input
        setShowManualInput(true);
        setErrorVideoTitle(data.videoTitle || "");
        toast.error("Extração automática bloqueada pelo YouTube. Cole a transcrição manualmente.", { duration: 6000 });
        return;
      }
      if (data?.error) { toast.error(data.error); return; }
      setResult(data);
      setShowManualInput(false);
      setEditTitle(data.title || "");
      setEditContent(data.structured_knowledge || "");
      const catMatch = data.structured_knowledge?.match(/Categoria sugerida[:\s]*(\w+)/i);
      if (catMatch && CATEGORIES.includes(catMatch[1].toLowerCase())) {
        setEditCategory(catMatch[1].toLowerCase());
      }
    } catch (err: any) {
      toast.error("Erro ao transcrever: " + (err.message || "Erro desconhecido"));
    } finally {
      setTranscribing(false);
    }
  };

  const handleApprove = async () => {
    if (!editTitle.trim() || actionItems.length === 0) {
      toast.error("Título e conteúdo são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      // Reconstruct content from action items
      const finalContent = actionItems.map(item => `## ${item.title}\n${item.body}`).join("\n\n");
      const { error } = await supabase.from("ai_knowledge_base").insert({
        title: editTitle.trim(),
        category: editCategory,
        description: `Transcrito do YouTube: ${ytUrl}`,
        content_text: finalContent.trim(),
        file_url: ytUrl,
        file_type: "video/youtube",
        file_name: `youtube-${videoId}.txt`,
      });
      if (error) throw error;
      toast.success("Conhecimento do vídeo adicionado à base!");
      onSaved();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleItemUpdate = (updated: ActionItem) => {
    setActionItems(prev => prev.map(item => item.id === updated.id ? updated : item));
  };

  const handleContentOrganized = (organized: string) => {
    setEditContent(organized);
  };

  const transcript = result?.transcript || "";
  const charCount = transcript.length;
  const wordCount = transcript.split(/\s+/).filter(Boolean).length;

  const filteredItems = filterType === "all"
    ? actionItems
    : actionItems.filter(i => i.type === filterType);

  // Count by type
  const typeCounts = TYPE_COUNTS_CONFIG.map(tc => ({
    ...tc,
    count: actionItems.filter(i => i.type === tc.type).length,
  })).filter(tc => tc.count > 0);

  return (
    <div className="min-h-screen animate-in fade-in duration-300">
      {/* ─── TOP BAR ─── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/40">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar à Base
          </button>

          {result && (
            <div className="flex items-center gap-3">
              <OrganizeWithAIButton
                content={editContent}
                transcript={transcript}
                onOrganized={handleContentOrganized}
              />
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={saving || !editTitle.trim()}
                className="gap-1.5"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Aprovar e Adicionar à Base
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6">

        {/* ─── STEP 1: URL + VIDEO PREVIEW ─── */}
        {!result && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
                <Youtube className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold">Extrair Conhecimento do YouTube</h1>
              <p className="text-sm text-muted-foreground">
                Cole a URL do vídeo para transcrever e extrair conhecimento útil para os agentes
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <Youtube className="w-4 h-4 text-red-500" /> URL do YouTube
              </Label>
              <Input
                value={ytUrl}
                onChange={(e) => setYtUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="font-mono text-sm h-11"
              />
            </div>

            {videoId && (
              <div className="rounded-xl overflow-hidden border border-border/40 bg-black shadow-lg">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}`}
                  className="w-full aspect-video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="YouTube Preview"
                />
              </div>
            )}

            {videoId && !showManualInput && (
              <Button
                onClick={() => handleTranscribe(false)}
                disabled={transcribing}
                className="w-full gap-2 h-12 text-base"
              >
                {transcribing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Transcrevendo e extraindo conhecimento...</>
                ) : (
                  <><Sparkles className="w-5 h-5" /> Transcrever e Extrair Conhecimento</>
                )}
              </Button>
            )}

            {videoId && showManualInput && (
              <div className="space-y-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 p-4">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">Extração automática bloqueada pelo YouTube</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  O YouTube bloqueia servidores em nuvem. Abra o vídeo, ative as legendas (CC), copie o texto e cole abaixo.
                  Dica: use extensões como "YouTube Transcript" para copiar facilmente.
                </p>
                <textarea
                  value={manualTranscript}
                  onChange={(e) => setManualTranscript(e.target.value)}
                  placeholder="Cole a transcrição do vídeo aqui..."
                  className="w-full min-h-[200px] rounded-lg border border-border bg-background p-3 text-sm font-mono resize-y"
                />
                <Button
                  onClick={() => handleTranscribe(true)}
                  disabled={transcribing || manualTranscript.trim().length < 20}
                  className="w-full gap-2 h-11"
                >
                  {transcribing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processando transcrição...</>
                  ) : (
                    <><ClipboardPaste className="w-4 h-4" /> Processar Transcrição Manual</>
                  )}
                </Button>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={onBack} className="w-full">
              Cancelar
            </Button>
          </div>
        )}

        {/* ─── STEP 2: FULL REVIEW PANEL ─── */}
        {result && (
          <div className="space-y-6">
            {/* Success banner */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  Conhecimento extraído com sucesso!
                </p>
                <p className="text-xs text-muted-foreground">
                  Revise cada item, atribua agentes e ajuste os tipos antes de aprovar
                </p>
              </div>
              <div className="flex items-center gap-2">
                {typeCounts.map(tc => {
                  const TIcon = tc.icon;
                  return (
                    <div key={tc.type} className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TIcon className={cn("w-3.5 h-3.5", tc.color)} />
                      <span className="font-bold">{tc.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">

              {/* LEFT: Video + Metadata + Transcript */}
              <div className="space-y-4">
                {videoId && (
                  <div className="rounded-xl overflow-hidden border border-border/40 bg-black shadow-lg sticky top-20">
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}`}
                      className="w-full aspect-video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={editTitle}
                    />

                    <div className="bg-card p-4 space-y-3 border-t border-border/40">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Título</Label>
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="text-sm font-medium"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Categoria</Label>
                        <Select value={editCategory} onValueChange={setEditCategory}>
                          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((c) => (
                              <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

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

                      {/* Type summary */}
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Itens Extraídos</Label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {typeCounts.map(tc => {
                            const TIcon = tc.icon;
                            return (
                              <button
                                key={tc.type}
                                onClick={() => setFilterType(filterType === tc.type ? "all" : tc.type)}
                                className={cn(
                                  "flex items-center gap-2 text-xs rounded-lg px-2.5 py-2 transition-colors",
                                  filterType === tc.type
                                    ? "bg-primary/10 text-primary font-bold"
                                    : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                )}
                              >
                                <TIcon className={cn("w-3.5 h-3.5", tc.color)} />
                                <span className="font-bold">{tc.count}</span>
                                <span className="truncate">{tc.label}</span>
                              </button>
                            );
                          })}
                          {filterType !== "all" && (
                            <button
                              onClick={() => setFilterType("all")}
                              className="col-span-2 text-xs text-primary hover:underline py-1"
                            >
                              Mostrar todos ({actionItems.length})
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Transcript toggle */}
                      <div>
                        <button
                          onClick={() => setShowTranscript(!showTranscript)}
                          className="flex items-center gap-2 text-xs font-bold text-primary hover:underline w-full"
                        >
                          <Play className="w-3.5 h-3.5" />
                          {showTranscript ? "Ocultar Transcrição" : "Ver Transcrição Completa"}
                        </button>
                        {showTranscript && (
                          <div className="mt-2 max-h-[400px] overflow-y-auto rounded-lg bg-muted/30 p-3 border border-border/30">
                            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
                              {transcript || "Transcrição não disponível"}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT: Action Cards */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <h2 className="text-lg font-bold">Itens Extraídos</h2>
                    <Badge variant="secondary" className="text-xs font-bold">
                      {filteredItems.length} {filterType !== "all" ? `de ${actionItems.length}` : "itens"}
                    </Badge>
                  </div>
                </div>

                {filteredItems.length === 0 ? (
                  <div className="rounded-xl border border-border/40 bg-card p-8 text-center">
                    <Brain className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Nenhum item encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredItems.map((item, idx) => (
                      <YouTubeActionCard
                        key={item.id}
                        item={item}
                        agents={agents}
                        onUpdate={handleItemUpdate}
                        index={idx}
                      />
                    ))}
                  </div>
                )}

                {/* Bottom action bar */}
                <div className="flex items-center justify-between pt-4 border-t border-border/40">
                  <Button variant="outline" size="sm" onClick={onBack}>
                    Cancelar
                  </Button>
                  <div className="flex items-center gap-2">
                    <OrganizeWithAIButton
                      content={editContent}
                      transcript={transcript}
                      onOrganized={handleContentOrganized}
                    />
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
