import { BookOpen, Search, Upload, FileText, Image, Video, Link, Music, Eye, Trash2, Download, Loader2, Plus } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
}

export default function AITeamConhecimento() {
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [docs, setDocs] = useState<KBDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<KBDoc | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Upload form
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
        <Button size="sm" className="gap-1.5" onClick={() => setShowUpload(true)}>
          <Upload className="w-4 h-4" /> Upload Documento
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Documentos", value: docs.length, color: "text-blue-500" },
          { label: "Com Arquivo", value: docs.filter(d => d.file_url).length, color: "text-purple-500" },
          { label: "Com Texto", value: docs.filter(d => d.content_text).length, color: "text-emerald-500" },
          { label: "Categorias", value: [...new Set(docs.map(d => d.category))].length, color: "text-amber-500" },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl border border-border/40 bg-card p-3 text-center">
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
            const TipoIcon = TIPO_ICONS[docType] || FileText;
            return (
              <div key={doc.id} className="rounded-xl border border-border/40 bg-card p-4 hover:border-primary/30 transition-all cursor-pointer"
                onClick={() => setSelectedDoc(doc)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <TipoIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    <Badge variant="outline" className="text-[10px]">{docType.toUpperCase()}</Badge>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{new Date(doc.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
                <h3 className="text-sm font-bold mb-1">{doc.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {doc.description || doc.content_text?.slice(0, 120) || "Sem descrição"}
                </p>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <Badge variant="secondary" className="text-[10px]">{doc.category}</Badge>
                  {doc.file_name && <span className="truncate max-w-[120px]">{doc.file_name}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Doc Detail Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
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

              {selectedDoc.description && (
                <p className="text-sm text-muted-foreground">{selectedDoc.description}</p>
              )}

              {selectedDoc.content_text && (
                <div className="max-h-[300px] overflow-y-auto">
                  <p className="text-xs font-bold mb-1">Conteúdo</p>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-lg font-sans">
                    {selectedDoc.content_text}
                  </pre>
                </div>
              )}

              {selectedDoc.file_url && (
                <div>
                  <p className="text-xs font-bold mb-1">Arquivo</p>
                  <p className="text-xs text-muted-foreground">{selectedDoc.file_name}</p>
                </div>
              )}

              <div className="flex gap-2">
                {selectedDoc.file_url && (
                  <Button size="sm" variant="outline" className="gap-1 flex-1" asChild>
                    <a href={selectedDoc.file_url} target="_blank" rel="noopener noreferrer">
                      <Download className="w-3.5 h-3.5" /> Download
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
