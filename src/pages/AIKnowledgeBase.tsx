import { useState, useEffect } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen, Upload, Plus, Trash2, Edit2, Save, X,
  FileText, Link2, Youtube, Image, Mic, FileSpreadsheet,
  Presentation, MessageSquare, Search, Filter, Brain,
  CheckCircle2, AlertCircle, Loader2, Globe2, Sparkles,
  ChevronLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  pdf: FileText,
  link: Link2,
  youtube: Youtube,
  image: Image,
  audio: Mic,
  spreadsheet: FileSpreadsheet,
  presentation: Presentation,
  text: MessageSquare,
};

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
}

export default function AIKnowledgeBase() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editEntry, setEditEntry] = useState<KBEntry | null>(null);
  const [activeTab, setActiveTab] = useState("items");

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
  const [rules, setRules] = useState({
    tone: "premium",
    formality: "formal",
    guidelines: "",
    forbidden: "",
    greeting_template: "",
    closing_template: "",
  });
  const [savingRules, setSavingRules] = useState(false);

  useEffect(() => {
    loadEntries();
    loadRules();
  }, []);

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
        { key: "ai_tone", value: rules.tone },
        { key: "ai_formality", value: rules.formality },
        { key: "ai_guidelines", value: rules.guidelines },
        { key: "ai_forbidden", value: rules.forbidden },
        { key: "ai_greeting_template", value: rules.greeting_template },
        { key: "ai_closing_template", value: rules.closing_template },
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
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setSavingRules(false);
    }
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

      // Upload file if provided
      if (uploadFile) {
        const ext = uploadFile.name.split(".").pop();
        const path = `kb/${Date.now()}-${uploadFile.name}`;
        const { error: upErr } = await supabase.storage.from("ai-knowledge-base").upload(path, uploadFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("ai-knowledge-base").getPublicUrl(path);
        fileUrl = urlData.publicUrl;
        fileName = uploadFile.name;
      }

      // If URL provided (link/youtube)
      if (formUrl && !uploadFile) {
        fileUrl = formUrl;
        fileName = formUrl;
      }

      const payload = {
        title: formTitle,
        description: formDesc || null,
        category: formCategory,
        content_text: formContent || null,
        file_url: fileUrl,
        file_name: fileName,
        file_type: formType,
        is_active: true,
      };

      if (editEntry) {
        await supabase.from("ai_knowledge_base").update(payload).eq("id", editEntry.id);
        toast.success("Atualizado!");
      } else {
        await supabase.from("ai_knowledge_base").insert(payload);
        toast.success("Adicionado à base de conhecimento!");
      }
      resetForm();
      setShowAdd(false);
      loadEntries();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("ai_knowledge_base").update({ is_active: !active }).eq("id", id);
    loadEntries();
  };

  const deleteEntry = async (id: string) => {
    await supabase.from("ai_knowledge_base").delete().eq("id", id);
    toast.success("Removido");
    loadEntries();
  };

  const startEdit = (entry: KBEntry) => {
    setEditEntry(entry);
    setFormTitle(entry.title);
    setFormDesc(entry.description || "");
    setFormCategory(entry.category);
    setFormContent(entry.content_text || "");
    setFormType(entry.file_type || "text");
    setFormUrl(entry.file_url || "");
    setShowAdd(true);
  };

  const filtered = entries.filter((e) => {
    const matchSearch = !search || e.title.toLowerCase().includes(search.toLowerCase()) || (e.content_text || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "all" || e.category === filterCategory;
    return matchSearch && matchCat;
  });

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
              <Input placeholder="Buscar na base..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-xs" />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Dialog open={showAdd} onOpenChange={(o) => { if (!o) resetForm(); setShowAdd(o); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-9 text-xs"><Plus className="w-3 h-3 mr-1" /> Adicionar</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-sm">{editEntry ? "Editar Item" : "Adicionar à Base de Conhecimento"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  {/* Type selector */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { t: "text", l: "Texto", i: MessageSquare },
                      { t: "pdf", l: "PDF", i: FileText },
                      { t: "link", l: "Link", i: Link2 },
                      { t: "youtube", l: "YouTube", i: Youtube },
                      { t: "image", l: "Imagem", i: Image },
                      { t: "audio", l: "Áudio", i: Mic },
                      { t: "spreadsheet", l: "Planilha", i: FileSpreadsheet },
                      { t: "presentation", l: "PPT", i: Presentation },
                    ].map(({ t, l, i: Icon }) => (
                      <button
                        key={t}
                        onClick={() => setFormType(t)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-[10px] transition-colors ${
                          formType === t ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {l}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Título *</Label>
                    <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Ex: Script de recepção VIP" className="text-xs h-8" />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Categoria</Label>
                    <Select value={formCategory} onValueChange={setFormCategory}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Descrição</Label>
                    <Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Breve descrição do conteúdo" className="text-xs h-8" />
                  </div>

                  {/* Conditional: URL input for links/youtube */}
                  {(formType === "link" || formType === "youtube") && (
                    <div className="space-y-1">
                      <Label className="text-xs">{formType === "youtube" ? "URL do YouTube" : "URL"}</Label>
                      <Input value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder={formType === "youtube" ? "https://youtube.com/watch?v=..." : "https://..."} className="text-xs h-8" />
                    </div>
                  )}

                  {/* Conditional: File upload for pdf/image/audio/spreadsheet/presentation */}
                  {["pdf", "image", "audio", "spreadsheet", "presentation"].includes(formType) && (
                    <div className="space-y-1">
                      <Label className="text-xs">Arquivo</Label>
                      <div className="border border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => document.getElementById("kb-file-upload")?.click()}>
                        <Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                        <p className="text-[10px] text-muted-foreground">
                          {uploadFile ? uploadFile.name : "Clique ou arraste o arquivo"}
                        </p>
                        <input type="file" id="kb-file-upload" className="hidden"
                          accept={
                            formType === "pdf" ? ".pdf" :
                            formType === "image" ? "image/*" :
                            formType === "audio" ? "audio/*,.mp3,.wav,.m4a,.ogg" :
                            formType === "spreadsheet" ? ".csv,.xlsx,.xls" :
                            formType === "presentation" ? ".ppt,.pptx" : "*"
                          }
                          onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        />
                      </div>
                    </div>
                  )}

                  {/* Text content - always available */}
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {formType === "text" ? "Conteúdo *" : "Texto complementar (opcional)"}
                    </Label>
                    <Textarea
                      value={formContent}
                      onChange={(e) => setFormContent(e.target.value)}
                      placeholder="Cole aqui o conteúdo: scripts de venda, regras, mensagens padrão, instruções..."
                      rows={6}
                      className="text-xs"
                    />
                  </div>

                  <Button onClick={handleSave} disabled={uploading} className="w-full text-xs" size="sm">
                    {uploading ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Salvando...</> : <><Save className="w-3 h-3 mr-1" /> {editEntry ? "Atualizar" : "Salvar na Base"}</>}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Entries list */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Carregando base...
            </div>
          ) : filtered.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum item na base de conhecimento</p>
                <p className="text-xs text-muted-foreground mt-1">Adicione PDFs, links, vídeos, áudios e textos para treinar a IA</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-2">
              {filtered.map((entry) => {
                const TypeIcon = FILE_TYPE_ICONS[entry.file_type || "text"] || FileText;
                const cat = CATEGORIES.find((c) => c.value === entry.category);
                return (
                  <Card key={entry.id} className={`transition-opacity ${!entry.is_active ? "opacity-50" : ""}`}>
                    <CardContent className="p-3 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <TypeIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium truncate">{entry.title}</h3>
                          <Badge variant="outline" className="text-[9px] flex-shrink-0">{cat?.label || entry.category}</Badge>
                          {entry.is_active ? (
                            <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                        {entry.description && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{entry.description}</p>}
                        {entry.content_text && (
                          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{entry.content_text.substring(0, 150)}...</p>
                        )}
                        <p className="text-[9px] text-muted-foreground mt-1">
                          {new Date(entry.created_at).toLocaleDateString("pt-BR")}
                          {entry.file_name && ` • ${entry.file_name}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Switch checked={entry.is_active ?? true} onCheckedChange={() => toggleActive(entry.id, entry.is_active ?? true)} />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(entry)}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteEntry(entry.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
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
                <div className="space-y-1">
                  <Label className="text-xs">Tom de Voz</Label>
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
                <div className="space-y-1">
                  <Label className="text-xs">Nível de Formalidade</Label>
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

              <div className="space-y-1">
                <Label className="text-xs">Diretrizes Gerais</Label>
                <Textarea
                  value={rules.guidelines}
                  onChange={(e) => setRules({ ...rules, guidelines: e.target.value })}
                  placeholder="Ex: Sempre pergunte o destino antes do período. Priorize margem sobre volume. Sugira sempre seguro viagem..."
                  rows={4}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Proibições / O que NUNCA fazer</Label>
                <Textarea
                  value={rules.forbidden}
                  onChange={(e) => setRules({ ...rules, forbidden: e.target.value })}
                  placeholder="Ex: Nunca prometer preço sem orçamento. Nunca falar mal de concorrente. Nunca dar informação de visto sem confirmar..."
                  rows={3}
                  className="text-xs"
                />
              </div>

              <Separator />

              <div className="space-y-1">
                <Label className="text-xs">Template de Saudação (primeira mensagem)</Label>
                <Textarea
                  value={rules.greeting_template}
                  onChange={(e) => setRules({ ...rules, greeting_template: e.target.value })}
                  placeholder="Ex: Olá {nome}! ✨ Que bom ter você aqui na NatLeva! Sou {vendedor} e vou cuidar da sua viagem..."
                  rows={2}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Template de Encerramento</Label>
                <Textarea
                  value={rules.closing_template}
                  onChange={(e) => setRules({ ...rules, closing_template: e.target.value })}
                  placeholder="Ex: Muito obrigado pela confiança, {nome}! A NatLeva está aqui para tornar sua viagem inesquecível! 🌍✨"
                  rows={2}
                  className="text-xs"
                />
              </div>

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
