import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { BookOpen, Plus, Pencil, Trash2, Search, ShieldAlert, Paperclip, Loader2 } from "lucide-react";

const CATEGORIES = ["geral", "pagamento", "saudacao", "viagem", "info", "pos-venda"];
const PLACEHOLDERS = ["primeiro_nome", "nome_cliente", "nome_consultor", "data_hoje"];
const TRIGGER_REGEX = /^[a-z0-9_-]+$/;

interface Shortcut {
  id: string;
  trigger: string;
  title: string;
  description: string | null;
  category: string;
  content: string | null;
  media_type: string | null;
  media_url: string | null;
  media_filename: string | null;
  media_mimetype: string | null;
  media_size_bytes: number | null;
  caption: string | null;
  is_active: boolean;
  usage_count: number;
}

const empty: Partial<Shortcut> = {
  trigger: "", title: "", description: "", category: "geral",
  content: "", caption: "", is_active: true,
};

export default function OperacaoAtalhos() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [items, setItems] = useState<Shortcut[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Partial<Shortcut> | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"text" | "media">("text");
  const [mediaFile, setMediaFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("message_shortcuts").select("*").order("category").order("trigger");
    setItems((data as Shortcut[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
        <ShieldAlert className="w-12 h-12 text-muted-foreground mb-3" />
        <h1 className="text-xl font-bold mb-2">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground">Apenas administradores podem gerenciar atalhos de mensagem.</p>
      </div>
    );
  }

  const filtered = items.filter(s => {
    if (catFilter !== "all" && s.category !== catFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return s.trigger.toLowerCase().includes(q) || s.title.toLowerCase().includes(q);
    }
    return true;
  });

  const openNew = () => { setEditing({ ...empty }); setMediaFile(null); setTab("text"); };
  const openEdit = (s: Shortcut) => { setEditing({ ...s }); setMediaFile(null); setTab(s.media_type ? "media" : "text"); };

  const insertPlaceholder = (ph: string) => {
    setEditing(e => e ? { ...e, content: (e.content || "") + `{${ph}}` } : e);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este atalho?")) return;
    const { error } = await supabase.from("message_shortcuts").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Atalho excluído" });
    load();
  };

  const toggleActive = async (s: Shortcut) => {
    const { error } = await supabase.from("message_shortcuts").update({ is_active: !s.is_active }).eq("id", s.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    load();
  };

  const handleSave = async () => {
    if (!editing) return;
    const trigger = (editing.trigger || "").trim().toLowerCase();
    if (!trigger || !TRIGGER_REGEX.test(trigger)) {
      toast({ title: "Trigger inválido", description: "Use apenas a-z, 0-9, _ ou -", variant: "destructive" });
      return;
    }
    if (!(editing.title || "").trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    const hasContent = (editing.content || "").trim().length > 0;
    const hasMedia = !!editing.media_url || !!mediaFile;
    if (!hasContent && !hasMedia) {
      toast({ title: "Preencha conteúdo ou mídia", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      let mediaUrl = editing.media_url || null;
      let mediaType = editing.media_type || null;
      let mediaFilename = editing.media_filename || null;
      let mediaMimetype = editing.media_mimetype || null;
      let mediaSize = editing.media_size_bytes || null;

      if (mediaFile) {
        const ext = mediaFile.name.split(".").pop() || "bin";
        const path = `${trigger}-${Date.now()}.${ext}`;
        const up = await supabase.storage.from("message-shortcuts").upload(path, mediaFile, {
          contentType: mediaFile.type || "application/octet-stream", upsert: true,
        });
        if (up.error) throw new Error(up.error.message);
        mediaUrl = supabase.storage.from("message-shortcuts").getPublicUrl(path).data.publicUrl;
        mediaFilename = mediaFile.name;
        mediaMimetype = mediaFile.type || "application/octet-stream";
        mediaSize = mediaFile.size;
        mediaType = mediaFile.type.startsWith("image/") ? "image"
          : mediaFile.type.startsWith("video/") ? "video"
          : "document";
      }

      const payload: any = {
        trigger,
        title: (editing.title || "").trim(),
        description: editing.description || null,
        category: editing.category || "geral",
        content: editing.content || null,
        caption: editing.caption || null,
        media_type: tab === "media" ? mediaType : null,
        media_url: tab === "media" ? mediaUrl : null,
        media_filename: tab === "media" ? mediaFilename : null,
        media_mimetype: tab === "media" ? mediaMimetype : null,
        media_size_bytes: tab === "media" ? mediaSize : null,
        is_active: editing.is_active ?? true,
      };

      if (editing.id) {
        const { error } = await supabase.from("message_shortcuts").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("message_shortcuts").insert(payload);
        if (error) throw error;
      }
      toast({ title: editing.id ? "Atalho atualizado" : "Atalho criado" });
      setEditing(null);
      setMediaFile(null);
      load();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="w-6 h-6 text-primary" />Atalhos de Mensagem</h1>
          <p className="text-sm text-muted-foreground mt-1">Slash commands compartilhados entre todos os consultores no chat.</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" />Novo Atalho</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar trigger ou título..." className="pl-9" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Trigger</th>
                <th className="text-left px-3 py-2">Título</th>
                <th className="text-left px-3 py-2">Categoria</th>
                <th className="text-left px-3 py-2">Mídia</th>
                <th className="text-left px-3 py-2">Uso</th>
                <th className="text-left px-3 py-2">Ativo</th>
                <th className="text-right px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-t border-border hover:bg-accent/30">
                  <td className="px-3 py-2 font-mono text-primary">/{s.trigger}</td>
                  <td className="px-3 py-2">{s.title}</td>
                  <td className="px-3 py-2"><Badge variant="secondary">{s.category}</Badge></td>
                  <td className="px-3 py-2">{s.media_type ? <Paperclip className="w-4 h-4 text-muted-foreground" /> : null}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{s.usage_count}x</td>
                  <td className="px-3 py-2"><Switch checked={s.is_active} onCheckedChange={() => toggleActive(s)} /></td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground text-sm">Nenhum atalho encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar Atalho" : "Novo Atalho"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Trigger</label>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="font-mono text-primary">/</span>
                    <Input
                      value={editing.trigger || ""}
                      onChange={e => setEditing({ ...editing, trigger: e.target.value.toLowerCase().replace(/\s/g, "") })}
                      placeholder="pix"
                      className="font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                  <Select value={editing.category} onValueChange={v => setEditing({ ...editing, category: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Título</label>
                <Input value={editing.title || ""} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="Ex: Dados PIX da agência" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Descrição (opcional)</label>
                <Input value={editing.description || ""} onChange={e => setEditing({ ...editing, description: e.target.value })} className="mt-1" />
              </div>

              <Tabs value={tab} onValueChange={v => setTab(v as any)}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="text">Texto</TabsTrigger>
                  <TabsTrigger value="media">Mídia</TabsTrigger>
                </TabsList>
                <TabsContent value="text" className="space-y-2">
                  <Textarea
                    value={editing.content || ""}
                    onChange={e => setEditing({ ...editing, content: e.target.value })}
                    rows={6}
                    placeholder="Digite a mensagem... use {primeiro_nome}, {nome_consultor} etc."
                  />
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs text-muted-foreground mr-1">Inserir:</span>
                    {PLACEHOLDERS.map(ph => (
                      <Button key={ph} type="button" variant="outline" size="sm" className="h-6 text-[11px] font-mono" onClick={() => insertPlaceholder(ph)}>
                        {`{${ph}}`}
                      </Button>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="media" className="space-y-2">
                  <Input type="file" onChange={e => setMediaFile(e.target.files?.[0] || null)} accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx" />
                  {(mediaFile || editing.media_url) && (
                    <p className="text-xs text-muted-foreground">
                      {mediaFile ? `Novo: ${mediaFile.name}` : `Atual: ${editing.media_filename}`}
                    </p>
                  )}
                  <Textarea
                    value={editing.caption || ""}
                    onChange={e => setEditing({ ...editing, caption: e.target.value })}
                    rows={3}
                    placeholder="Caption (opcional)"
                  />
                </TabsContent>
              </Tabs>

              <div className="flex items-center gap-2">
                <Switch checked={editing.is_active ?? true} onCheckedChange={v => setEditing({ ...editing, is_active: v })} />
                <span className="text-sm">Ativo</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
