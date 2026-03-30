import { BookOpen, Search, Upload, FileText, Image, Video, Link, Music, Eye, Trash2, Download, Loader2, Plus, Youtube, Sparkles, CheckCircle, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { logAITeamAudit, AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/aiTeamAudit";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import YouTubeReviewPanel from "@/components/knowledge/YouTubeReviewPanel";
import TaxonomyPreview from "@/components/knowledge/TaxonomyPreview";
import YouTubeKnowledgeDetail from "@/components/knowledge/YouTubeKnowledgeDetail";
import SmartUploadModal from "@/components/knowledge/SmartUploadModal";

const KB_TIPOS = [
  { id: "all", label: "Todos" },
  { id: "pdf", label: "PDF" },
  { id: "texto", label: "Texto" },
  { id: "imagem", label: "Imagem" },
  { id: "video", label: "Vídeo" },
  { id: "link", label: "Link" },
  { id: "audio", label: "Áudio" },
];

const CATEGORIES = [
  "geral", "destinos", "scripts", "preços", "fornecedores", "processos", "treinamento", "compliance",
];

const TIPO_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  texto: FileText,
  imagem: Image,
  video: Video,
  link: Link,
  audio: Music,
};

interface KBDoc {
  id: string;
  title: string;
  category: string;
  description: string | null;
  content_text: string | null;
  file_name: string | null;
  file_type: string | null;
  file_url: string | null;
  is_active: boolean | null;
  uploaded_by: string | null;
  created_at: string;
  tags: string[] | null;
  confidence: number | null;
  taxonomy: any | null;
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

// ─── Knowledge Cards: parse markdown sections into blocks ───
function parseKnowledgeSections(content: string): { title: string; body: string }[] {
  const lines = content.split("\n");
  const sections: { title: string; body: string }[] = [];
  let currentTitle = "";
  let currentBody: string[] = [];

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)/);
    if (h2Match) {
      if (currentTitle || currentBody.length > 0) {
        sections.push({ title: currentTitle, body: currentBody.join("\n").trim() });
      }
      currentTitle = h2Match[1].trim();
      currentBody = [];
    } else if (line.match(/^#\s+/)) {
      // Skip h1 (main title)
      continue;
    } else {
      currentBody.push(line);
    }
  }
  if (currentTitle || currentBody.length > 0) {
    sections.push({ title: currentTitle, body: currentBody.join("\n").trim() });
  }
  return sections.filter(s => s.body.length > 0);
}

function KnowledgeCards({ content, onChange }: { content: string; onChange: (v: string) => void }) {
  const sections = parseKnowledgeSections(content);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  const handleEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditText(sections[idx].body);
  };

  const handleSave = (idx: number) => {
    const updated = sections.map((s, i) => i === idx ? { ...s, body: editText } : s);
    const newContent = updated.map(s => `## ${s.title}\n${s.body}`).join("\n\n");
    onChange(newContent);
    setEditingIdx(null);
  };

  if (sections.length === 0) {
    return (
      <Textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        className="text-xs font-mono"
      />
    );
  }

  const sectionIcons: Record<string, string> = {
    "resumo": "📋",
    "conhecimento extraído": "🧠",
    "dados práticos": "📊",
    "categoria sugerida": "🏷️",
    "dicas": "💡",
    "informações": "ℹ️",
  };

  const getIcon = (title: string) => {
    const lower = title.toLowerCase();
    for (const [key, icon] of Object.entries(sectionIcons)) {
      if (lower.includes(key)) return icon;
    }
    return "📄";
  };

  return (
    <div className="space-y-3">
      {sections.map((section, idx) => (
        <div key={idx} className="rounded-xl border border-border/40 bg-card overflow-hidden hover:border-primary/20 transition-colors">
          <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border/30">
            <span className="text-xs font-bold flex items-center gap-2">
              <span>{getIcon(section.title)}</span>
              {section.title}
            </span>
            <button
              onClick={() => editingIdx === idx ? handleSave(idx) : handleEdit(idx)}
              className="text-[10px] text-primary hover:underline font-medium"
            >
              {editingIdx === idx ? "Salvar" : "Editar"}
            </button>
          </div>
          <div className="p-4">
            {editingIdx === idx ? (
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={6}
                className="text-xs"
              />
            ) : (
              <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed">
                {section.body}
              </pre>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Organize with AI Button ───
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
        toast.success("Conhecimento reorganizado para os agentes NatLeva!");
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
      className="gap-1.5 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
    >
      {organizing ? (
        <><Loader2 className="w-3 h-3 animate-spin" /> Organizando...</>
      ) : (
        <><Sparkles className="w-3 h-3" /> Organizar com IA</>
      )}
    </Button>
  );
}

// ─── YouTube Upload Sub-component ───
function YouTubeUploadFlow({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const [ytUrl, setYtUrl] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [result, setResult] = useState<{
    title: string;
    transcript: string;
    raw_transcript?: string;
    structured_knowledge: string;
    videoId: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("destinos");
  const [editContent, setEditContent] = useState("");

  // Auto-detect video ID
  useEffect(() => {
    const id = extractYouTubeId(ytUrl);
    setVideoId(id);
  }, [ytUrl]);

  const handleTranscribe = async () => {
    if (!videoId) return;
    setTranscribing(true);
    setResult(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 180_000);
      let data: any, error: any;
      try {
        const res = await supabase.functions.invoke("youtube-transcribe", {
          body: { url: ytUrl },
          signal: controller.signal as any,
        });
        data = res.data;
        error = res.error;
      } catch (abortErr: any) {
        clearTimeout(timeout);
        if (abortErr.name === "AbortError") {
          toast.error("A extração demorou demais. Tente o painel completo com transcrição manual.", { duration: 8000 });
          return;
        }
        throw abortErr;
      }
      clearTimeout(timeout);
      // Parse error body from FunctionsHttpError
      let errorBody: any = null;
      if (error) {
        try {
          const ctx = (error as any).context;
          if (ctx instanceof Response) {
            errorBody = await ctx.json().catch(() => null);
          }
        } catch {}
        if (!errorBody) errorBody = data;
        if (!errorBody) {
          try { errorBody = JSON.parse(String(error.message)); } catch {}
        }
      }
      const body422 = errorBody || data;
      if (body422?.error === "TRANSCRIPT_UNAVAILABLE") {
        toast.error("Extração automática bloqueada pelo YouTube. Use o painel completo com transcrição manual.", { duration: 6000 });
        return;
      }
      // Handle CLIENT_DOWNLOAD_NEEDED: download captions from user's browser and retry
      if (data?.error === "CLIENT_DOWNLOAD_NEEDED" && data?.captionTracks?.length) {
        console.log("Server returned CLIENT_DOWNLOAD_NEEDED, downloading captions from browser...");
        toast.info("Baixando legendas pelo navegador...", { duration: 4000 });
        let clientTranscript = "";
        for (const track of data.captionTracks) {
          if (clientTranscript) break;
          try {
            const trackUrl = (track.baseUrl || "").replace(/&fmt=[^&]*/g, "") + "&fmt=json3";
            const captionRes = await fetch(trackUrl);
            if (!captionRes.ok) continue;
            const captionText = await captionRes.text();
            if (!captionText || captionText.length < 50) continue;
            try {
              const json = JSON.parse(captionText);
              const segments: string[] = [];
              for (const event of (json.events || [])) {
                if (event.segs) {
                  let line = "";
                  for (const seg of event.segs) {
                    if (seg.utf8 && seg.utf8.trim() !== "\n" && seg.utf8.trim() !== "") line += seg.utf8;
                  }
                  if (line.trim()) segments.push(line.trim());
                }
              }
              clientTranscript = segments.join(" ").replace(/\s+/g, " ").trim();
            } catch {}
            if (!clientTranscript || clientTranscript.length < 100) {
              const xmlSegments: string[] = [];
              for (const match of captionText.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)) {
                const t = match[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/\n/g, " ").trim();
                if (t) xmlSegments.push(t);
              }
              const xmlT = xmlSegments.join(" ").replace(/\s+/g, " ").trim();
              if (xmlT.length > (clientTranscript?.length || 0)) clientTranscript = xmlT;
            }
          } catch (e) { console.warn("Client caption download failed:", e); }
        }
        if (clientTranscript && clientTranscript.split(/\s+/).length >= 50) {
          toast.success(`Legendas baixadas: ${clientTranscript.split(/\s+/).length} palavras. Processando...`);
          const retryRes = await supabase.functions.invoke("youtube-transcribe", {
            body: { url: ytUrl, manual_transcript: clientTranscript },
          });
          data = retryRes.data;
          error = retryRes.error;
        } else {
          toast.error("Não foi possível baixar legendas. Use o painel completo com transcrição manual.", { duration: 6000 });
          return;
        }
      }
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setResult(data);
      setEditTitle(data.title || "");
      setEditContent(data.structured_knowledge || "");
      // Try to detect category from AI output
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
    if (!editTitle.trim() || !editContent.trim()) {
      toast.error("Título e conteúdo são obrigatórios");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("ai_knowledge_base").insert({
        title: editTitle.trim(),
        category: editCategory,
        description: `Transcrito do YouTube: ${ytUrl}`,
        content_text: editContent.trim(),
        file_url: ytUrl,
        file_type: "video/youtube",
        file_name: `youtube-${videoId}.txt`,
        raw_transcript: result?.raw_transcript || null,
      } as any);
      if (error) throw error;
      toast.success("Conhecimento do vídeo adicionado à base!");
      onSave();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Step 1: URL Input */}
      <div className="space-y-1.5">
        <Label className="text-xs font-bold flex items-center gap-1.5">
          <Youtube className="w-4 h-4 text-red-500" /> URL do YouTube
        </Label>
        <Input
          value={ytUrl}
          onChange={(e) => setYtUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="font-mono text-xs"
        />
      </div>

      {/* Step 2: Video Preview */}
      {videoId && (
        <div className="rounded-xl overflow-hidden border border-border/40 bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            className="w-full aspect-video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="YouTube Preview"
          />
        </div>
      )}

      {/* Step 3: Transcribe Button */}
      {videoId && !result && (
        <Button
          onClick={handleTranscribe}
          disabled={transcribing}
          className="w-full gap-2"
          size="sm"
        >
          {transcribing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Transcrevendo e extraindo conhecimento...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Transcrever e Extrair Conhecimento
            </>
          )}
        </Button>
      )}

      {/* Step 4: Review Extracted Knowledge */}
      {result && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-500">
            <CheckCircle className="w-4 h-4" />
            Conhecimento extraído! Revise e aprove:
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Título</Label>
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Categoria</Label>
            <Select value={editCategory} onValueChange={setEditCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Transcrição completa do vídeo */}
          {(() => {
            const raw = result.transcript || "";
            if (!raw || raw.length < 30) return (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  ⚠️ Não foi possível extrair a transcrição deste vídeo. O vídeo pode não ter legendas/closed captions habilitadas.
                </p>
              </div>
            );
            return (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  📝 Transcrição Completa do Vídeo
                  <span className="font-normal text-muted-foreground">({raw.length.toLocaleString()} caracteres)</span>
                </Label>
                <Textarea
                  value={raw}
                  readOnly
                  rows={10}
                  className="text-xs font-mono bg-muted/30 text-muted-foreground max-h-[300px] overflow-y-auto"
                />
              </div>
            );
          })()}

          {/* Conhecimentos extraídos em cards */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Conhecimentos Extraídos
              </Label>
              <OrganizeWithAIButton
                content={editContent}
                transcript={result.transcript}
                onOrganized={setEditContent}
              />
            </div>
            <KnowledgeCards content={editContent} onChange={setEditContent} />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleApprove} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
              Aprovar e Adicionar à Base
            </Button>
          </div>
        </div>
      )}

      {/* Cancel if no result yet */}
      {!result && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───
export default function AITeamConhecimento() {
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [docs, setDocs] = useState<KBDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<KBDoc | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showSmartUpload, setShowSmartUpload] = useState(false);
  const [showYouTube, setShowYouTube] = useState(false);
  const [ytDetailDoc, setYtDetailDoc] = useState<KBDoc | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("geral");
  const [newDescription, setNewDescription] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);

  const loadDocs = async () => {
    const { data, error } = await supabase
      .from("ai_knowledge_base")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setDocs(data);
    setLoading(false);
  };

  useEffect(() => { loadDocs(); }, []);

  const getDocType = (doc: KBDoc): string => {
    if (doc.file_type?.includes("youtube")) return "video";
    if (doc.file_type?.includes("pdf")) return "pdf";
    if (doc.file_type?.includes("image")) return "imagem";
    if (doc.file_type?.includes("video")) return "video";
    if (doc.file_type?.includes("audio")) return "audio";
    if (doc.file_url && !doc.file_type) return "link";
    if (doc.content_text) return "texto";
    return "texto";
  };

  const filtered = docs.filter(doc => {
    const matchSearch = !search || doc.title.toLowerCase().includes(search.toLowerCase()) || doc.category?.toLowerCase().includes(search.toLowerCase());
    const docType = getDocType(doc);
    const matchTipo = tipoFilter === "all" || docType === tipoFilter;
    return matchSearch && matchTipo;
  });

  const handleUpload = async () => {
    if (!newTitle.trim()) { toast.error("Título é obrigatório"); return; }
    if (!newContent.trim() && !newFile) { toast.error("Forneça conteúdo de texto ou um arquivo"); return; }

    setUploading(true);
    try {
      let fileUrl: string | null = null;
      let fileName: string | null = null;
      let fileType: string | null = null;

      if (newFile) {
        fileName = newFile.name;
        fileType = newFile.type;
        const path = `knowledge/${Date.now()}_${newFile.name}`;
        const { error: uploadErr } = await supabase.storage.from("ai-knowledge-base").upload(path, newFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("ai-knowledge-base").getPublicUrl(path);
        fileUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("ai_knowledge_base").insert({
        title: newTitle.trim(),
        category: newCategory,
        description: newDescription.trim() || null,
        content_text: newContent.trim() || null,
        file_name: fileName,
        file_type: fileType,
        file_url: fileUrl,
      });

      if (error) throw error;
      toast.success("Documento adicionado à base!");
      logAITeamAudit({
        action_type: AUDIT_ACTIONS.CREATE,
        entity_type: AUDIT_ENTITIES.KNOWLEDGE,
        entity_name: newTitle.trim(),
        description: `Documento adicionado à KB: ${newTitle.trim()} (${newCategory})`,
        performed_by: "gestor",
        details: { category: newCategory, has_file: !!fileName },
      });
      setShowUpload(false);
      setNewTitle(""); setNewDescription(""); setNewContent(""); setNewFile(null);
      loadDocs();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("ai_knowledge_base").delete().eq("id", id);
    if (error) { toast.error("Erro ao remover"); return; }
    toast.success("Documento removido");
    setSelectedDoc(null);
    loadDocs();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-[3px] border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Full-page YouTube knowledge detail
  if (ytDetailDoc) {
    return (
      <YouTubeKnowledgeDetail
        doc={ytDetailDoc}
        onBack={() => setYtDetailDoc(null)}
        onDelete={(id) => { handleDelete(id); setYtDetailDoc(null); }}
      />
    );
  }

  // Full-page YouTube review panel
  if (showYouTube) {
    return (
      <YouTubeReviewPanel
        onBack={() => setShowYouTube(false)}
        onSaved={() => { setShowYouTube(false); loadDocs(); }}
      />
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><BookOpen className="w-6 h-6 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold">Base de Conhecimento</h1>
            <p className="text-sm text-muted-foreground">{docs.length} documentos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowYouTube(true)}>
            <Youtube className="w-4 h-4 text-red-500" /> YouTube
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setShowUpload(true)}>
            <Upload className="w-4 h-4" /> Upload Documento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Documentos", value: docs.length, color: "text-blue-500", filter: "all" },
          { label: "Com Arquivo", value: docs.filter(d => d.file_url).length, color: "text-purple-500", filter: "_arquivo" },
          { label: "Com Texto", value: docs.filter(d => d.content_text).length, color: "text-emerald-500", filter: "_texto" },
          { label: "Categorias", value: [...new Set(docs.map(d => d.category))].length, color: "text-amber-500", filter: "_cat" },
        ].map(stat => (
          <div key={stat.label}
            onClick={() => {
              if (stat.filter === "all") { setTipoFilter("all"); setSearch(""); }
              else if (stat.filter === "_arquivo") { setTipoFilter("all"); setSearch(""); }
              else if (stat.filter === "_texto") { setTipoFilter("texto"); setSearch(""); }
              else if (stat.filter === "_cat") { setTipoFilter("all"); setSearch(""); }
            }}
            className="rounded-xl border border-border/40 bg-card p-3 text-center cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all">
            <p className={cn("text-xl font-bold", stat.color)}>{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por título ou categoria..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {KB_TIPOS.map(t => (
            <button key={t.id} onClick={() => setTipoFilter(t.id)}
              className={cn("text-xs px-3 py-1.5 rounded-lg font-medium transition-colors",
                tipoFilter === t.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}>{t.label}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum documento encontrado</p>
          <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => setShowUpload(true)}>
            <Plus className="w-3 h-3" /> Adicionar primeiro documento
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(doc => {
            const docType = getDocType(doc);
            const TipoIcon = docType === "video" && doc.file_type?.includes("youtube") ? Youtube : (TIPO_ICONS[docType] || FileText);
            const isYT = doc.file_type?.includes("youtube");
            return (
              <div key={doc.id} className="rounded-xl border border-border/40 bg-card p-4 hover:border-primary/30 transition-all cursor-pointer"
                onClick={() => isYT ? setYtDetailDoc(doc) : setSelectedDoc(doc)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <TipoIcon className={cn("w-3.5 h-3.5", isYT ? "text-red-500" : "text-muted-foreground")} />
                    <Badge variant="outline" className="text-[10px]">{isYT ? "YOUTUBE" : docType.toUpperCase()}</Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Confidence badge for YouTube items */}
                    {isYT && doc.confidence != null && doc.confidence > 0 && (
                      <Badge className={cn("text-[10px] font-bold", 
                        doc.confidence >= 0.8 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" :
                        doc.confidence >= 0.5 ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" :
                        "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30"
                      )}>
                        {Math.round(doc.confidence * 100)}%
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground">{new Date(doc.created_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>
                {/* YouTube thumbnail */}
                {isYT && doc.file_url && (() => {
                  const vid = extractYouTubeId(doc.file_url!);
                  return vid ? (
                    <div className="rounded-lg overflow-hidden mb-2 border border-border/20">
                      <img
                        src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`}
                        alt={doc.title}
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  ) : null;
                })()}
                <h3 className="text-sm font-bold mb-1">{doc.title}</h3>
                {/* YouTube enriched info line */}
                {isYT && doc.taxonomy?.taxonomia && (() => {
                  const tax = doc.taxonomy.taxonomia;
                  const parts: string[] = [];
                  if (tax.geo?.pais) parts.push(tax.geo.pais.charAt(0).toUpperCase() + tax.geo.pais.slice(1));
                  if (tax.financeiro?.faixa_preco_label) parts.push(tax.financeiro.faixa_preco_label.charAt(0).toUpperCase() + tax.financeiro.faixa_preco_label.slice(1));
                  if (tax.perfil_viajante?.ideal?.length > 0) parts.push(tax.perfil_viajante.ideal.slice(0, 3).join(", "));
                  return parts.length > 0 ? (
                    <p className="text-[11px] text-muted-foreground mb-2 font-medium">
                      {parts.join(" | ")}
                    </p>
                  ) : null;
                })()}
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {doc.description || doc.content_text?.slice(0, 120) || "Sem descrição"}
                </p>
                {/* Tags for YouTube items */}
                {isYT && doc.tags && doc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {doc.tags.slice(0, 8).map((tag, i) => (
                      <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-primary/10 text-primary">
                        {tag}
                      </span>
                    ))}
                    {doc.tags.length > 8 && (
                      <span className="text-[9px] text-muted-foreground">+{doc.tags.length - 8}</span>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <Badge variant="secondary" className="text-[10px]">{doc.category}</Badge>
                  {doc.file_name && !isYT && <span className="truncate max-w-[120px]">{doc.file_name}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Doc Detail Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className={cn("max-h-[85vh] overflow-y-auto", selectedDoc?.file_type?.includes("youtube") && selectedDoc?.taxonomy ? "max-w-2xl" : "max-w-lg")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {selectedDoc?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedDoc && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{selectedDoc.category}</Badge>
                <Badge variant="outline">{getDocType(selectedDoc).toUpperCase()}</Badge>
                <span className="text-xs text-muted-foreground">{new Date(selectedDoc.created_at).toLocaleDateString("pt-BR")}</span>
              </div>

              {/* YouTube embed in detail */}
              {selectedDoc.file_type?.includes("youtube") && selectedDoc.file_url && (() => {
                const vid = extractYouTubeId(selectedDoc.file_url!);
                return vid ? (
                  <div className="rounded-xl overflow-hidden border border-border/40 bg-black">
                    <iframe
                      src={`https://www.youtube.com/embed/${vid}`}
                      className="w-full aspect-video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={selectedDoc.title}
                    />
                  </div>
                ) : null;
              })()}

              {selectedDoc.description && (
                <p className="text-sm text-muted-foreground">{selectedDoc.description}</p>
              )}

              {/* Tags */}
              {selectedDoc.file_type?.includes("youtube") && selectedDoc.tags && selectedDoc.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedDoc.tags.map((tag: string, i: number) => (
                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Taxonomy sections for YouTube items */}
              {selectedDoc.file_type?.includes("youtube") && selectedDoc.taxonomy?.taxonomia && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-bold">Taxonomia ÓRION</span>
                  </div>
                  <TaxonomyPreview 
                    taxonomy={selectedDoc.taxonomy.taxonomia} 
                    onChange={() => {}} 
                    readOnly 
                  />
                </div>
              )}

              {/* Chunks for YouTube items */}
              {selectedDoc.file_type?.includes("youtube") && selectedDoc.taxonomy?.chunks && selectedDoc.taxonomy.chunks.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-bold">Chunks de Conhecimento ({selectedDoc.taxonomy.chunks.length})</span>
                  </div>
                  <div className="space-y-2">
                    {selectedDoc.taxonomy.chunks.map((chunk: any, i: number) => (
                      <div key={i} className="rounded-xl border border-border/40 bg-muted/20 p-3 space-y-1.5">
                        <h4 className="text-xs font-bold">{chunk.titulo}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">{chunk.conteudo}</p>
                        {chunk.tags_chunk && chunk.tags_chunk.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {chunk.tags_chunk.map((t: string, j: number) => (
                              <span key={j} className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-muted text-muted-foreground">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Content text for non-YouTube or as fallback */}
              {selectedDoc.content_text && !selectedDoc.file_type?.includes("youtube") && (
                <div className="max-h-[300px] overflow-y-auto">
                  <p className="text-xs font-bold mb-1">Conteúdo</p>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-lg font-sans">
                    {selectedDoc.content_text}
                  </pre>
                </div>
              )}

              {selectedDoc.file_url && !selectedDoc.file_type?.includes("youtube") && (
                <div>
                  <p className="text-xs font-bold mb-1">Arquivo</p>
                  <p className="text-xs text-muted-foreground">{selectedDoc.file_name}</p>
                </div>
              )}

              <div className="flex gap-2">
                {selectedDoc.file_url && !selectedDoc.file_type?.includes("youtube") && (
                  <Button size="sm" variant="outline" className="gap-1 flex-1" asChild>
                    <a href={selectedDoc.file_url} target="_blank" rel="noopener noreferrer">
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  </Button>
                )}
                {selectedDoc.file_url && selectedDoc.file_type?.includes("youtube") && (
                  <Button size="sm" variant="outline" className="gap-1 flex-1" asChild>
                    <a href={selectedDoc.file_url} target="_blank" rel="noopener noreferrer">
                      <Youtube className="w-3.5 h-3.5 text-red-500" /> Abrir no YouTube
                    </a>
                  </Button>
                )}
                <Button size="sm" variant="outline" className="gap-1 text-red-500 hover:text-red-600"
                  onClick={() => handleDelete(selectedDoc.id)}>
                  <Trash2 className="w-3.5 h-3.5" /> Remover
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>




      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" /> Adicionar Documento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Título *</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: Guia de Destinos Europa" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Categoria</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Descrição</Label>
              <Input value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Breve resumo do conteúdo" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Conteúdo (texto)</Label>
              <Textarea value={newContent} onChange={e => setNewContent(e.target.value)}
                placeholder="Cole aqui o conteúdo de texto, scripts, guias..." rows={4} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Arquivo (opcional)</Label>
              <div className="border border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileRef.current?.click()}>
                {newFile ? (
                  <p className="text-xs text-foreground">{newFile.name} ({(newFile.size / 1024).toFixed(0)} KB)</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Clique para selecionar PDF, imagem, vídeo, áudio...</p>
                )}
                <input ref={fileRef} type="file" className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.png,.jpg,.jpeg,.mp4,.mp3,.wav"
                  onChange={e => setNewFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowUpload(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleUpload} disabled={uploading} className="gap-1.5">
                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
