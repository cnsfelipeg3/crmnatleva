import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen, Upload, Plus, Trash2, Edit2, Save, X,
  FileText, Link2, Youtube, Image, Mic, FileSpreadsheet,
  Presentation, MessageSquare, Search, Brain,
  CheckCircle2, AlertCircle, Loader2, Globe2, Sparkles,
  ChevronLeft, ListPlus, Map, DollarSign, User, Compass,
  ChevronDown, ChevronUp, RefreshCw, Zap, Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import YouTubeReviewPanel from "@/components/knowledge/YouTubeReviewPanel";
import YouTubeBatchImport from "@/components/knowledge/YouTubeBatchImport";
import { TaxonomySummary, Taxonomy } from "@/components/knowledge/TaxonomyPreview";
import TaxonomyPreview from "@/components/knowledge/TaxonomyPreview";
import SmartUploadModal from "@/components/knowledge/SmartUploadModal";

const CATEGORIES = [
  { value: "atendimento", label: "Atendimento & Scripts", icon: MessageSquare },
  { value: "destinos", label: "Destinos & Roteiros", icon: Globe2 },
  { value: "cultura", label: "Cultura & Tom de Voz", icon: Brain },
  { value: "comercial", label: "Comercial & Vendas", icon: Sparkles },
  { value: "operacional", label: "Operacional & Processos", icon: FileText },
  { value: "treinamento", label: "Treinamento", icon: BookOpen },
  { value: "regras", label: "Regras & Políticas", icon: AlertCircle },
  { value: "geral", label: "Geral", icon: FileText },
];

const FILE_TYPE_ICONS: Record<string, any> = {
  pdf: FileText, link: Link2, youtube: Youtube, image: Image,
  audio: Mic, spreadsheet: FileSpreadsheet, presentation: Presentation, text: MessageSquare,
};

const PRICE_LABELS = ["economico", "moderado", "premium", "luxo"];
const PROFILE_OPTIONS = ["casal", "familia", "aventureiro", "lua-de-mel", "vip", "primeira-viagem", "solo", "grupo"];

interface KBEntry {
  id: string;
  title: string;
  description: string | null;
  category: string;
  content_text: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  is_active: boolean;
  created_at: string;
  taxonomy?: any;
  tags?: string[] | null;
  confidence?: number | null;
}

// ─── Helper: Determine ÓRION processing status ───
function getOrionStatus(entry: KBEntry): "processado" | "pendente" | "sem" {
  if (!entry.taxonomy || typeof entry.taxonomy !== "object" || Object.keys(entry.taxonomy).length === 0) {
    return "sem";
  }
  if (entry.taxonomy.status === "pendente_reprocessamento") {
    return "pendente";
  }
  return "processado";
}

export default function AIKnowledgeBase() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterPrice, setFilterPrice] = useState("all");
  const [filterProfile, setFilterProfile] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editEntry, setEditEntry] = useState<KBEntry | null>(null);
  const [activeTab, setActiveTab] = useState("items");
  const [showYouTube, setShowYouTube] = useState(false);
  const [showBatchYouTube, setShowBatchYouTube] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showSmartUpload, setShowSmartUpload] = useState(false);

  // Reprocess state
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, successes: 0, failures: 0 });

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("geral");
  const [formContent, setFormContent] = useState("");
  const [formType, setFormType] = useState("text");
  const [formUrl, setFormUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Rules state
  const [rules, setRules] = useState({ tone: "premium", formality: "formal", guidelines: "", forbidden: "", greeting_template: "", closing_template: "" });
  const [savingRules, setSavingRules] = useState(false);

  useEffect(() => { loadEntries(); loadRules(); }, []);

  const loadEntries = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ai_knowledge_base")
      .select("*")
      .order("created_at", { ascending: false });
    setEntries((data as KBEntry[]) || []);
    setLoading(false);
  };

  const loadRules = async () => {
    const { data } = await supabase.from("ai_config").select("*");
    if (data) {
      const configMap: Record<string, string> = {};
      data.forEach((c: any) => { configMap[c.config_key] = c.config_value; });
      setRules({
        tone: configMap["ai_tone"] || "premium",
        formality: configMap["ai_formality"] || "formal",
        guidelines: configMap["ai_guidelines"] || "",
        forbidden: configMap["ai_forbidden"] || "",
        greeting_template: configMap["ai_greeting_template"] || "",
        closing_template: configMap["ai_closing_template"] || "",
      });
    }
  };

  const saveRules = async () => {
    setSavingRules(true);
    try {
      const pairs = [
        { key: "ai_tone", value: rules.tone }, { key: "ai_formality", value: rules.formality },
        { key: "ai_guidelines", value: rules.guidelines }, { key: "ai_forbidden", value: rules.forbidden },
        { key: "ai_greeting_template", value: rules.greeting_template }, { key: "ai_closing_template", value: rules.closing_template },
      ];
      for (const { key, value } of pairs) {
        const { data: existing } = await supabase.from("ai_config").select("id").eq("config_key", key).maybeSingle();
        if (existing) {
          await supabase.from("ai_config").update({ config_value: value, updated_at: new Date().toISOString() }).eq("id", existing.id);
        } else {
          await supabase.from("ai_config").insert({ config_key: key, config_value: value });
        }
      }
      toast.success("Regras salvas!");
    } catch (err: any) { toast.error("Erro: " + err.message); }
    finally { setSavingRules(false); }
  };

  const resetForm = () => {
    setFormTitle(""); setFormDesc(""); setFormCategory("geral");
    setFormContent(""); setFormType("text"); setFormUrl("");
    setUploadFile(null); setEditEntry(null);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) { toast.error("Título obrigatório"); return; }
    setUploading(true);
    try {
      let fileUrl = editEntry?.file_url || null;
      let fileName = editEntry?.file_name || null;
      if (uploadFile) {
        const path = `kb/${Date.now()}-${uploadFile.name}`;
        const { error: upErr } = await supabase.storage.from("ai-knowledge-base").upload(path, uploadFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("ai-knowledge-base").getPublicUrl(path);
        fileUrl = urlData.publicUrl; fileName = uploadFile.name;
      }
      if (formUrl && !uploadFile) { fileUrl = formUrl; fileName = formUrl; }

      const payload = {
        title: formTitle, description: formDesc || null, category: formCategory,
        content_text: formContent || null, file_url: fileUrl, file_name: fileName,
        file_type: formType, is_active: true,
      };
      if (editEntry) {
        await supabase.from("ai_knowledge_base").update(payload).eq("id", editEntry.id);
        toast.success("Atualizado!");
      } else {
        await supabase.from("ai_knowledge_base").insert(payload);
        toast.success("Adicionado à base de conhecimento!");
      }
      resetForm(); setShowAdd(false); loadEntries();
    } catch (err: any) { toast.error("Erro: " + err.message); }
    finally { setUploading(false); }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("ai_knowledge_base").update({ is_active: !active }).eq("id", id);
    loadEntries();
  };

  const deleteEntry = async (id: string) => {
    await supabase.from("ai_knowledge_base").delete().eq("id", id);
    toast.success("Removido"); loadEntries();
  };

  const startEdit = (entry: KBEntry) => {
    setEditEntry(entry); setFormTitle(entry.title); setFormDesc(entry.description || "");
    setFormCategory(entry.category); setFormContent(entry.content_text || "");
    setFormType(entry.file_type || "text"); setFormUrl(entry.file_url || ""); setShowAdd(true);
  };

  // ─── Reprocess single item with ÓRION ───
  const reprocessItem = useCallback(async (entry: KBEntry) => {
    if (!entry.content_text && !entry.description) {
      toast.error("Item sem conteúdo para processar");
      return;
    }
    setReprocessingId(entry.id);
    const startTime = Date.now();
    try {
      const { data: orgData, error: orgErr } = await supabase.functions.invoke("organize-knowledge", {
        body: {
          content: entry.content_text || entry.description || "",
          title: entry.title,
          tipo: entry.file_type || "texto",
        },
      });
      if (orgErr) throw orgErr;

      const taxonomy = orgData?.taxonomy;
      if (!taxonomy) throw new Error("ÓRION não retornou taxonomia");

      const updatePayload: any = {
        taxonomy: taxonomy.taxonomia || taxonomy,
        tags: taxonomy.tags || [],
        confidence: taxonomy.taxonomia?.confianca ?? taxonomy.confianca ?? null,
        updated_at: new Date().toISOString(),
      };

      // Update resumo if better than current
      if (taxonomy.resumo && taxonomy.resumo !== "Erro no processamento. Reprocesse manualmente.") {
        updatePayload.content_text = entry.content_text; // Keep original content
      }

      await supabase.from("ai_knowledge_base").update(updatePayload).eq("id", entry.id);

      const elapsed = Date.now() - startTime;
      const tagCount = (taxonomy.tags || []).length;
      const chunkCount = (taxonomy.chunks || []).length;
      const conf = Math.round((taxonomy.taxonomia?.confianca ?? taxonomy.confianca ?? 0) * 100);
      toast.success(`ÓRION reprocessou! ${tagCount} tags, ${chunkCount} chunks, confiança ${conf}% (${(elapsed / 1000).toFixed(1)}s)`);
      loadEntries();
    } catch (err: any) {
      toast.error("Erro ao reprocessar: " + err.message);
    } finally {
      setReprocessingId(null);
    }
  }, []);

  // ─── Batch process all pending/unprocessed items ───
  const processAllPending = useCallback(async () => {
    const pending = entries.filter(e => {
      const status = getOrionStatus(e);
      return (status === "sem" || status === "pendente") && (e.content_text || e.description);
    });
    if (pending.length === 0) {
      toast.info("Nenhum item pendente para processar");
      return;
    }

    setBatchProcessing(true);
    setBatchProgress({ current: 0, total: pending.length, successes: 0, failures: 0 });

    let successes = 0;
    let failures = 0;

    for (let i = 0; i < pending.length; i++) {
      setBatchProgress(prev => ({ ...prev, current: i + 1 }));

      try {
        const entry = pending[i];
        const { data: orgData, error: orgErr } = await supabase.functions.invoke("organize-knowledge", {
          body: {
            content: entry.content_text || entry.description || "",
            title: entry.title,
            tipo: entry.file_type || "texto",
          },
        });
        if (orgErr) throw orgErr;

        const taxonomy = orgData?.taxonomy;
        if (!taxonomy) throw new Error("Sem taxonomia");

        await supabase.from("ai_knowledge_base").update({
          taxonomy: taxonomy.taxonomia || taxonomy,
          tags: taxonomy.tags || [],
          confidence: taxonomy.taxonomia?.confianca ?? taxonomy.confianca ?? null,
          updated_at: new Date().toISOString(),
        }).eq("id", entry.id);

        successes++;
      } catch {
        failures++;
      }

      setBatchProgress(prev => ({ ...prev, successes, failures }));

      // Rate limiting delay
      if (i < pending.length - 1) await new Promise(r => setTimeout(r, 2000));
    }

    setBatchProcessing(false);
    toast.success(`${successes} processado(s) com sucesso${failures > 0 ? `, ${failures} falhou(aram)` : ""}`);
    loadEntries();
  }, [entries]);

  // ─── Derived filter data ───
  const countriesAvailable = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => {
      const pais = e.taxonomy?.geo?.pais;
      if (pais) set.add(pais);
    });
    return Array.from(set).sort();
  }, [entries]);

  // ─── Stats ───
  const pendingCount = useMemo(() => entries.filter(e => {
    const s = getOrionStatus(e);
    return (s === "sem" || s === "pendente") && (e.content_text || e.description);
  }).length, [entries]);

  // ─── Filtering ───
  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const tax = e.taxonomy as Taxonomy | undefined;
      if (search) {
        const s = search.toLowerCase();
        const inTitle = e.title.toLowerCase().includes(s);
        const inContent = (e.content_text || "").toLowerCase().includes(s);
        const inTags = (e.tags || []).some(t => t.toLowerCase().includes(s));
        const inGeo = [
          tax?.geo?.pais, tax?.geo?.continente, ...(tax?.geo?.cidades || []),
        ].filter(Boolean).some(v => v!.toLowerCase().includes(s));
        const inPasseios = (tax?.experiencias?.passeios || []).some(p => p.nome.toLowerCase().includes(s));
        const inHoteis = (tax?.hospedagem?.hoteis || []).some(h => h.nome.toLowerCase().includes(s));
        const inVendas = (tax?.vendas?.argumentos_chave || []).some(a => a.toLowerCase().includes(s));
        if (!inTitle && !inContent && !inTags && !inGeo && !inPasseios && !inHoteis && !inVendas) return false;
      }
      if (filterCategory !== "all" && e.category !== filterCategory) return false;
      if (filterCountry !== "all") {
        if (!tax?.geo?.pais || tax.geo.pais.toLowerCase() !== filterCountry.toLowerCase()) return false;
      }
      if (filterPrice !== "all") {
        if (!tax?.financeiro?.faixa_preco_label || tax.financeiro.faixa_preco_label !== filterPrice) return false;
      }
      if (filterProfile !== "all") {
        const ideals = [...(tax?.destino?.ideal_para || []), ...(tax?.perfil_viajante?.ideal || [])];
        if (!ideals.some(p => p.toLowerCase().includes(filterProfile))) return false;
      }
      return true;
    });
  }, [entries, search, filterCategory, filterCountry, filterPrice, filterProfile]);

  const hasActiveFilters = filterCountry !== "all" || filterPrice !== "all" || filterProfile !== "all";

  // YouTube full-screen panels
  if (showYouTube) {
    return <YouTubeReviewPanel onBack={() => setShowYouTube(false)} onSaved={() => { setShowYouTube(false); loadEntries(); }} />;
  }
  if (showBatchYouTube) {
    return <YouTubeBatchImport onBack={() => setShowBatchYouTube(false)} onSaved={() => { setShowBatchYouTube(false); loadEntries(); }} />;
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/livechat/flows")}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Base de Conhecimento & Regras da IA
          </h1>
          <p className="text-xs text-muted-foreground">Treine a IA com documentos, regras e instruções para atendimento</p>
        </div>
        <Badge variant="outline" className="text-xs">
          {entries.filter((e) => e.is_active).length} itens ativos
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="items" className="text-xs">📚 Base de Conhecimento</TabsTrigger>
          <TabsTrigger value="rules" className="text-xs">⚙️ Regras & Comportamento</TabsTrigger>
        </TabsList>

        {/* ─── TAB: KNOWLEDGE BASE ITEMS ─── */}
        <TabsContent value="items" className="space-y-4">
          {/* Search + Actions */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Buscar na base (destino, passeio, hotel...)" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-xs" />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant={showFilters ? "default" : "outline"} className="h-9 text-xs gap-1" onClick={() => setShowFilters(!showFilters)}>
              <Compass className="w-3 h-3" /> Filtros {hasActiveFilters && <Badge className="text-[8px] px-1 py-0 ml-1 bg-primary text-primary-foreground">!</Badge>}
            </Button>
            <Button size="sm" variant="outline" className="h-9 text-xs gap-1 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30" onClick={() => setShowYouTube(true)}>
              <Youtube className="w-3 h-3" /> YouTube
            </Button>
            <Button size="sm" variant="outline" className="h-9 text-xs gap-1 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30" onClick={() => setShowBatchYouTube(true)}>
              <ListPlus className="w-3 h-3" /> Lote YT
            </Button>
            <Dialog open={showAdd} onOpenChange={(o) => { if (!o) resetForm(); setShowAdd(o); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-9 text-xs"><Plus className="w-3 h-3 mr-1" /> Adicionar</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-sm">{editEntry ? "Editar Item" : "Adicionar à Base de Conhecimento"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { t: "text", l: "Texto", i: MessageSquare }, { t: "pdf", l: "PDF", i: FileText },
                      { t: "link", l: "Link", i: Link2 }, { t: "youtube", l: "YouTube", i: Youtube },
                      { t: "image", l: "Imagem", i: Image }, { t: "audio", l: "Áudio", i: Mic },
                      { t: "spreadsheet", l: "Planilha", i: FileSpreadsheet }, { t: "presentation", l: "PPT", i: Presentation },
                    ].map(({ t, l, i: Icon }) => (
                      <button key={t} onClick={() => setFormType(t)} className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-[10px] transition-colors ${formType === t ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"}`}>
                        <Icon className="w-4 h-4" />{l}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Título *</Label><Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Ex: Script de recepção VIP" className="text-xs h-8" /></div>
                  <div className="space-y-1"><Label className="text-xs">Categoria</Label>
                    <Select value={formCategory} onValueChange={setFormCategory}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Descrição</Label><Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Breve descrição" className="text-xs h-8" /></div>
                  {(formType === "link" || formType === "youtube") && (
                    <div className="space-y-1"><Label className="text-xs">{formType === "youtube" ? "URL do YouTube" : "URL"}</Label><Input value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder={formType === "youtube" ? "https://youtube.com/watch?v=..." : "https://..."} className="text-xs h-8" /></div>
                  )}
                  {["pdf", "image", "audio", "spreadsheet", "presentation"].includes(formType) && (
                    <div className="space-y-1"><Label className="text-xs">Arquivo</Label>
                      <div className="border border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 transition-colors" onClick={() => document.getElementById("kb-file-upload")?.click()}>
                        <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1" /><p className="text-[10px] text-muted-foreground">{uploadFile ? uploadFile.name : "Clique ou arraste"}</p>
                        <input type="file" id="kb-file-upload" className="hidden" accept={formType === "pdf" ? ".pdf" : formType === "image" ? "image/*" : formType === "audio" ? "audio/*,.mp3,.wav,.m4a,.ogg" : formType === "spreadsheet" ? ".csv,.xlsx,.xls" : formType === "presentation" ? ".ppt,.pptx" : "*"} onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                      </div>
                    </div>
                  )}
                  <div className="space-y-1"><Label className="text-xs">{formType === "text" ? "Conteúdo *" : "Texto complementar (opcional)"}</Label><Textarea value={formContent} onChange={(e) => setFormContent(e.target.value)} placeholder="Cole o conteúdo..." rows={6} className="text-xs" /></div>
                  <Button onClick={handleSave} disabled={uploading} className="w-full text-xs" size="sm">
                    {uploading ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Salvando...</> : <><Save className="w-3 h-3 mr-1" /> {editEntry ? "Atualizar" : "Salvar na Base"}</>}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* ─── TAXONOMY FILTERS BAR ─── */}
          {showFilters && (
            <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-border/40 bg-muted/20 animate-in slide-in-from-top-2 duration-200">
              <Select value={filterCountry} onValueChange={setFilterCountry}>
                <SelectTrigger className="w-[150px] h-8 text-xs"><Map className="w-3 h-3 mr-1 text-blue-500" /><SelectValue placeholder="País" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos países</SelectItem>
                  {countriesAvailable.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterPrice} onValueChange={setFilterPrice}>
                <SelectTrigger className="w-[140px] h-8 text-xs"><DollarSign className="w-3 h-3 mr-1 text-emerald-500" /><SelectValue placeholder="Preço" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas faixas</SelectItem>
                  {PRICE_LABELS.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterProfile} onValueChange={setFilterProfile}>
                <SelectTrigger className="w-[150px] h-8 text-xs"><User className="w-3 h-3 mr-1 text-pink-500" /><SelectValue placeholder="Perfil" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos perfis</SelectItem>
                  {PROFILE_OPTIONS.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setFilterCountry("all"); setFilterPrice("all"); setFilterProfile("all"); }}>
                  <X className="w-3 h-3 mr-1" /> Limpar filtros
                </Button>
              )}
            </div>
          )}

          {/* ─── BATCH PROCESSING BAR ─── */}
          {pendingCount > 0 && !batchProcessing && (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-400/30 bg-amber-500/5">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-amber-700 dark:text-amber-400 flex-1">
                {pendingCount} item(ns) sem processamento do ÓRION
              </span>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400" onClick={processAllPending}>
                <Zap className="w-3 h-3" /> Processar todos pendentes
              </Button>
            </div>
          )}
          {batchProcessing && (
            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-primary font-medium flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Processando {batchProgress.current} de {batchProgress.total}...
                </span>
                <span className="text-muted-foreground">
                  {batchProgress.successes} ✓ {batchProgress.failures > 0 && `· ${batchProgress.failures} ✗`}
                </span>
              </div>
              <Progress value={(batchProgress.current / batchProgress.total) * 100} className="h-2" />
            </div>
          )}

          {/* Entries list */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Carregando base...
            </div>
          ) : filtered.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum item encontrado</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2">
              {filtered.map((entry) => {
                const isYouTube = entry.file_type === "youtube" || entry.file_type === "video/youtube";
                const TypeIcon = isYouTube ? Youtube : (FILE_TYPE_ICONS[entry.file_type || "text"] || FileText);
                const cat = CATEGORIES.find((c) => c.value === entry.category);
                const ytVideoId = isYouTube && entry.file_url ? entry.file_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] : null;
                const thumbnailUrl = ytVideoId ? `https://img.youtube.com/vi/${ytVideoId}/mqdefault.jpg` : null;
                const orionStatus = getOrionStatus(entry);
                const hasTaxonomy = orionStatus === "processado";
                const isExpanded = expandedId === entry.id;
                const isReprocessing = reprocessingId === entry.id;

                return (
                  <Card key={entry.id} className={cn(
                    "transition-all overflow-hidden relative",
                    !entry.is_active && "opacity-50",
                    orionStatus === "pendente" && "ring-1 ring-amber-400/50",
                  )}>
                    {isYouTube && thumbnailUrl && (
                      <div className="absolute inset-0 bg-cover bg-center opacity-[0.06] dark:opacity-[0.08]" style={{ backgroundImage: `url(${thumbnailUrl})` }} />
                    )}
                    <CardContent className="p-3 relative z-10">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isYouTube ? "bg-red-500/15" : "bg-primary/10"}`}>
                          <TypeIcon className={`w-4 h-4 ${isYouTube ? "text-red-500" : "text-primary"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-medium truncate">{entry.title}</h3>
                            {isYouTube && (
                              <Badge className="text-[9px] flex-shrink-0 bg-red-500 text-white border-0 hover:bg-red-600">
                                <Youtube className="w-2.5 h-2.5 mr-0.5" /> YouTube
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[9px] flex-shrink-0">{cat?.label || entry.category}</Badge>

                            {/* ÓRION Status Badge */}
                            {orionStatus === "processado" && (
                              <Badge className="text-[9px] flex-shrink-0 bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20">
                                <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> ÓRION
                              </Badge>
                            )}
                            {orionStatus === "pendente" && (
                              <Badge className="text-[9px] flex-shrink-0 bg-amber-500/15 text-amber-600 border-amber-500/30 hover:bg-amber-500/20 animate-pulse">
                                <AlertCircle className="w-2.5 h-2.5 mr-0.5" /> Pendente
                              </Badge>
                            )}
                            {orionStatus === "sem" && (
                              <Badge variant="outline" className="text-[9px] flex-shrink-0 text-muted-foreground border-muted-foreground/30">
                                <Clock className="w-2.5 h-2.5 mr-0.5" /> Sem ÓRION
                              </Badge>
                            )}

                            {entry.confidence != null && entry.confidence > 0 && (
                              <Badge variant="outline" className="text-[9px] flex-shrink-0 font-mono">
                                {Math.round(entry.confidence * 100)}%
                              </Badge>
                            )}
                          </div>
                          {entry.description && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{entry.description}</p>}

                          {/* Taxonomy summary */}
                          {hasTaxonomy && !isExpanded && (
                            <TaxonomySummary taxonomy={entry.taxonomy as Taxonomy} />
                          )}

                          {!hasTaxonomy && entry.content_text && (
                            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{entry.content_text.substring(0, 150)}...</p>
                          )}

                          <p className="text-[9px] text-muted-foreground mt-1">
                            {new Date(entry.created_at).toLocaleDateString("pt-BR")}
                            {entry.tags && entry.tags.length > 0 && ` · ${entry.tags.length} tags`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Reprocess / Process button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-7 w-7",
                              orionStatus === "sem" && "text-primary",
                              orionStatus === "pendente" && "text-amber-500",
                            )}
                            onClick={() => reprocessItem(entry)}
                            disabled={isReprocessing || batchProcessing}
                            title={orionStatus === "sem" ? "Processar com ÓRION" : "Reprocessar com ÓRION"}
                          >
                            {isReprocessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          </Button>
                          {hasTaxonomy && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpandedId(isExpanded ? null : entry.id)}>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </Button>
                          )}
                          <Switch checked={entry.is_active ?? true} onCheckedChange={() => toggleActive(entry.id, entry.is_active ?? true)} />
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(entry)}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteEntry(entry.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Expanded taxonomy view */}
                      {isExpanded && hasTaxonomy && (
                        <div className="mt-4 pt-4 border-t border-border/40">
                          <TaxonomyPreview taxonomy={entry.taxonomy as Taxonomy} onChange={() => {}} readOnly />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── TAB: RULES & BEHAVIOR ─── */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Tom e Personalidade da IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Tom de Voz</Label>
                  <Select value={rules.tone} onValueChange={(v) => setRules({ ...rules, tone: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="premium">Premium / Concierge</SelectItem>
                      <SelectItem value="amigavel">Amigável / Casual</SelectItem>
                      <SelectItem value="corporativo">Corporativo / Formal</SelectItem>
                      <SelectItem value="energetico">Energético / Entusiasmado</SelectItem>
                      <SelectItem value="minimalista">Minimalista / Direto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-xs">Nível de Formalidade</Label>
                  <Select value={rules.formality} onValueChange={(v) => setRules({ ...rules, formality: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="muito_formal">Muito Formal (Sr./Sra.)</SelectItem>
                      <SelectItem value="formal">Formal (Você)</SelectItem>
                      <SelectItem value="informal">Informal (Tu/Vc)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1"><Label className="text-xs">Diretrizes Gerais</Label><Textarea value={rules.guidelines} onChange={(e) => setRules({ ...rules, guidelines: e.target.value })} placeholder="Ex: Sempre pergunte o destino antes do período..." rows={4} className="text-xs" /></div>
              <div className="space-y-1"><Label className="text-xs">Proibições / O que NUNCA fazer</Label><Textarea value={rules.forbidden} onChange={(e) => setRules({ ...rules, forbidden: e.target.value })} placeholder="Ex: Nunca prometer preço sem orçamento..." rows={3} className="text-xs" /></div>
              <Separator />
              <div className="space-y-1"><Label className="text-xs">Template de Saudação</Label><Textarea value={rules.greeting_template} onChange={(e) => setRules({ ...rules, greeting_template: e.target.value })} placeholder="Ex: Olá {nome}! ✨..." rows={2} className="text-xs" /></div>
              <div className="space-y-1"><Label className="text-xs">Template de Encerramento</Label><Textarea value={rules.closing_template} onChange={(e) => setRules({ ...rules, closing_template: e.target.value })} placeholder="Ex: Muito obrigado, {nome}!..." rows={2} className="text-xs" /></div>
              <Button onClick={saveRules} disabled={savingRules} className="w-full text-xs" size="sm">
                {savingRules ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Salvando...</> : <><Save className="w-3 h-3 mr-1" /> Salvar Regras</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
