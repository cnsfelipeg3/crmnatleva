import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Plus, Pencil, Trash2, Star, Palette, Type, LayoutTemplate, Eye,
  GripVertical, Check, Copy,
} from "lucide-react";
import { toast } from "sonner";

const FONT_OPTIONS = [
  "Playfair Display", "Montserrat", "DM Sans", "Cormorant Garamond",
  "Inter", "Open Sans", "Lato", "Poppins", "Raleway", "Merriweather",
  "Libre Baskerville", "Source Serif Pro",
];

const SECTION_TYPES = [
  { type: "hero", label: "Capa / Hero" },
  { type: "destinations", label: "Destinos" },
  { type: "flights", label: "Voos" },
  { type: "hotels", label: "Hotéis" },
  { type: "experiences", label: "Experiências" },
  { type: "pricing", label: "Valores" },
];

interface Template {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  theme_config: any;
  sections: any[];
  font_heading: string;
  font_body: string;
  primary_color: string;
  accent_color: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

const defaultForm = {
  name: "",
  description: "",
  font_heading: "Playfair Display",
  font_body: "Inter",
  primary_color: "#1a2332",
  accent_color: "#c9a84c",
  theme_config: { style: "classic", backgroundPattern: "none" },
  sections: SECTION_TYPES.map((s) => ({ type: s.type, enabled: true })),
  is_default: false,
  is_active: true,
};

export default function ProposalTemplates() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["proposal_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposal_templates")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Template[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingId) {
        const { error } = await supabase.from("proposal_templates").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("proposal_templates").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal_templates"] });
      toast.success(editingId ? "Modelo atualizado!" : "Modelo criado!");
      closeDialog();
    },
    onError: () => toast.error("Erro ao salvar modelo"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("proposal_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal_templates"] });
      toast.success("Modelo removido!");
      setDeleteConfirm(null);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (template: Template) => {
      const { id, created_at, ...rest } = template;
      const { error } = await supabase.from("proposal_templates").insert({
        ...rest,
        name: `${rest.name} (Cópia)`,
        is_default: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal_templates"] });
      toast.success("Modelo duplicado!");
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("proposal_templates").update({ is_default: false }).neq("id", id);
      const { error } = await supabase.from("proposal_templates").update({ is_default: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal_templates"] });
      toast.success("Modelo padrão atualizado!");
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      description: t.description || "",
      font_heading: t.font_heading || "Playfair Display",
      font_body: t.font_body || "Inter",
      primary_color: t.primary_color || "#1a2332",
      accent_color: t.accent_color || "#c9a84c",
      theme_config: t.theme_config || {},
      sections: t.sections?.length ? t.sections : defaultForm.sections,
      is_default: t.is_default,
      is_active: t.is_active,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  const handleSave = () => {
    if (!form.name.trim()) return toast.error("Nome é obrigatório");
    saveMutation.mutate(form);
  };

  const toggleSection = (type: string) => {
    setForm((f) => ({
      ...f,
      sections: f.sections.map((s) =>
        s.type === type ? { ...s, enabled: !s.enabled } : s
      ),
    }));
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/propostas")} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif text-foreground flex items-center gap-2">
              <LayoutTemplate className="w-6 h-6 text-primary" />
              Gerenciar Modelos
            </h1>
            <p className="text-sm text-muted-foreground">Configure os templates padrão para suas propostas</p>
          </div>
        </div>
        <Button onClick={() => navigate("/propostas/modelos/novo")} className="gap-2">
          <Plus className="w-4 h-4" /> Novo Modelo
        </Button>
      </div>

      {/* Templates grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 space-y-3">
                <div className="h-24 bg-muted rounded-lg" />
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !templates?.length ? (
        <Card className="p-12 text-center">
          <LayoutTemplate className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nenhum modelo configurado</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Crie seu primeiro template para padronizar suas propostas</p>
          <Button onClick={openCreate} className="mt-4 gap-2">
            <Plus className="w-4 h-4" /> Criar modelo
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <Card
              key={t.id}
              className={`group hover:shadow-md transition-all overflow-hidden ${
                !t.is_active ? "opacity-60" : ""
              } ${t.is_default ? "ring-2 ring-primary/40" : ""}`}
            >
              {/* Color preview bar */}
              <div className="h-28 relative overflow-hidden" style={{
                background: `linear-gradient(135deg, ${t.primary_color} 0%, ${t.primary_color}dd 60%, ${t.accent_color} 100%)`,
              }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white/90">
                    <p className="text-lg font-bold tracking-wide" style={{ fontFamily: t.font_heading }}>
                      Aa Bb Cc
                    </p>
                    <p className="text-xs mt-1 opacity-70" style={{ fontFamily: t.font_body }}>
                      {t.font_heading} + {t.font_body}
                    </p>
                  </div>
                </div>
                {t.is_default && (
                  <Badge className="absolute top-2 right-2 text-[10px] gap-1 bg-primary">
                    <Star className="w-3 h-3" /> Padrão
                  </Badge>
                )}
                {!t.is_active && (
                  <Badge variant="secondary" className="absolute top-2 left-2 text-[10px]">Inativo</Badge>
                )}
              </div>

              <CardContent className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-foreground">{t.name}</h3>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                  )}
                </div>

                {/* Color chips */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: t.primary_color }} />
                    <span>Principal</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: t.accent_color }} />
                    <span>Destaque</span>
                  </div>
                </div>

                {/* Sections count */}
                <div className="text-xs text-muted-foreground">
                  {(t.sections as any[])?.filter((s: any) => s.enabled).length || 0} seções ativas
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-border/50">
                  <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs flex-1" onClick={() => navigate(`/propostas/modelos/${t.id}`)}>
                    <Eye className="w-3.5 h-3.5" /> Preview & Editar
                  </Button>
                  <Button
                    variant="ghost" size="sm" className="h-8 gap-1 text-xs"
                    onClick={() => duplicateMutation.mutate(t)}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  {!t.is_default && (
                    <Button
                      variant="ghost" size="sm" className="h-8 gap-1 text-xs"
                      onClick={() => setDefaultMutation.mutate(t.id)}
                    >
                      <Star className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirm(t.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5 text-primary" />
              {editingId ? "Editar Modelo" : "Novo Modelo"}
            </DialogTitle>
            <DialogDescription>Configure o visual padrão para suas propostas</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Basic info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nome do modelo *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Elegância Clássica" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descreva o estilo deste modelo..." rows={2} />
              </div>
            </div>

            {/* Colors */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2"><Palette className="w-4 h-4 text-primary" /> Cores</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Cor principal</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color" value={form.primary_color}
                      onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                    />
                    <Input value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="font-mono text-xs" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Cor de destaque</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color" value={form.accent_color}
                      onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                      className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                    />
                    <Input value={form.accent_color} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} className="font-mono text-xs" />
                  </div>
                </div>
              </div>

              {/* Preview bar */}
              <div className="h-16 rounded-lg overflow-hidden" style={{
                background: `linear-gradient(135deg, ${form.primary_color} 0%, ${form.primary_color}dd 60%, ${form.accent_color} 100%)`,
              }}>
                <div className="h-full flex items-center justify-center text-white/90">
                  <span className="text-sm font-semibold" style={{ fontFamily: form.font_heading }}>
                    Preview do modelo
                  </span>
                </div>
              </div>
            </div>

            {/* Fonts */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2"><Type className="w-4 h-4 text-primary" /> Tipografia</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Fonte de títulos</Label>
                  <Select value={form.font_heading} onValueChange={(v) => setForm({ ...form, font_heading: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Fonte do corpo</Label>
                  <Select value={form.font_body} onValueChange={(v) => setForm({ ...form, font_body: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2"><Eye className="w-4 h-4 text-primary" /> Seções da proposta</Label>
              <div className="space-y-2">
                {SECTION_TYPES.map((sec) => {
                  const formSec = form.sections.find((s) => s.type === sec.type);
                  return (
                    <div key={sec.type} className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <GripVertical className="w-4 h-4 text-muted-foreground/40" />
                        <span className="text-sm font-medium">{sec.label}</span>
                      </div>
                      <Switch
                        checked={formSec?.enabled ?? true}
                        onCheckedChange={() => toggleSection(sec.type)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Settings */}
            <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/50">
              <div>
                <p className="text-sm font-medium">Modelo padrão</p>
                <p className="text-xs text-muted-foreground">Usar automaticamente em novas propostas</p>
              </div>
              <Switch checked={form.is_default} onCheckedChange={(v) => setForm({ ...form, is_default: v })} />
            </div>

            <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/50">
              <div>
                <p className="text-sm font-medium">Ativo</p>
                <p className="text-xs text-muted-foreground">Disponível para seleção ao criar propostas</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
              <Check className="w-4 h-4" />
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir modelo?</DialogTitle>
            <DialogDescription>Essa ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
