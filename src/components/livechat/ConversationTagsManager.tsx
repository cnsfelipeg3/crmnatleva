import { useEffect, useState, useCallback } from "react";
import { Plus, Check, X, Tag as TagIcon, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface CatalogTag {
  id: string;
  name: string;
  color: string;
}

interface ConversationTagsManagerProps {
  conversationDbId?: string;
  tags: string[];
  onChange?: (tags: string[]) => void;
}

const PRESET_COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#6b7280",
];

export function ConversationTagsManager({
  conversationDbId, tags, onChange,
}: ConversationTagsManagerProps) {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [catalog, setCatalog] = useState<CatalogTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("conversation_tag_catalog" as any)
      .select("id, name, color")
      .order("name");
    setCatalog((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const colorFor = (name: string) =>
    catalog.find(c => c.name.toLowerCase() === name.toLowerCase())?.color || "#6b7280";

  const persist = useCallback(async (next: string[]) => {
    onChange?.(next);
    if (!conversationDbId) return;
    setSaving(true);
    const { error } = await supabase
      .from("conversations")
      .update({ tags: next })
      .eq("id", conversationDbId);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar tags", description: error.message, variant: "destructive" });
    }
  }, [conversationDbId, onChange]);

  const toggleTag = (name: string) => {
    const has = tags.includes(name);
    persist(has ? tags.filter(t => t !== name) : [...tags, name]);
  };

  const createTag = async () => {
    const name = search.trim();
    if (!name) return;
    if (catalog.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: "Essa tag já existe" });
      return;
    }
    setCreating(true);
    const { data, error } = await supabase
      .from("conversation_tag_catalog" as any)
      .insert({ name, color: newColor })
      .select("id, name, color")
      .single();
    setCreating(false);
    if (error) {
      toast({ title: "Erro ao criar tag", description: error.message, variant: "destructive" });
      return;
    }
    setCatalog(prev => [...prev, data as any].sort((a, b) => a.name.localeCompare(b.name)));
    setSearch("");
    persist([...tags, (data as any).name]);
    toast({ title: "Tag criada" });
  };

  const deleteTag = async (t: CatalogTag) => {
    if (!confirm(`Apagar a tag "${t.name}" do catálogo?`)) return;
    const { error } = await supabase
      .from("conversation_tag_catalog" as any)
      .delete()
      .eq("id", t.id);
    if (error) {
      toast({ title: "Erro ao apagar", description: error.message, variant: "destructive" });
      return;
    }
    setCatalog(prev => prev.filter(c => c.id !== t.id));
    toast({ title: "Tag removida do catálogo" });
  };

  const filtered = catalog.filter(c =>
    c.name.toLowerCase().includes(search.trim().toLowerCase())
  );
  const exactMatch = catalog.some(c =>
    c.name.toLowerCase() === search.trim().toLowerCase()
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.length === 0 && (
          <span className="text-[11px] text-muted-foreground italic">Nenhuma tag</span>
        )}
        {tags.map(t => (
          <Badge
            key={t}
            className="text-[10px] px-1.5 py-0 gap-1 border-transparent"
            style={{ backgroundColor: `${colorFor(t)}20`, color: colorFor(t) }}
          >
            {t}
            <button
              type="button"
              onClick={() => toggleTag(t)}
              className="hover:opacity-70"
              aria-label={`Remover ${t}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </Badge>
        ))}

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-5 px-1.5 text-[10px] gap-0.5"
              disabled={saving}
            >
              {saving ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Plus className="h-2.5 w-2.5" />}
              Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="end">
            <div className="p-2 border-b border-border">
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar ou criar tag..."
                className="h-7 text-xs"
              />
            </div>

            <ScrollArea className="max-h-56">
              {loading ? (
                <div className="p-4 flex justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="p-1">
                  {filtered.length === 0 && !isAdmin && (
                    <p className="px-2 py-3 text-[11px] text-muted-foreground text-center">
                      Nenhuma tag encontrada
                    </p>
                  )}
                  {filtered.map(t => {
                    const active = tags.includes(t.name);
                    return (
                      <div
                        key={t.id}
                        className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary/60 cursor-pointer"
                        onClick={() => toggleTag(t.name)}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: t.color }}
                        />
                        <span className="text-xs flex-1 truncate">{t.name}</span>
                        {active && <Check className="h-3.5 w-3.5 text-primary" />}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); deleteTag(t); }}
                            className="opacity-0 group-hover:opacity-100 transition"
                            aria-label="Apagar tag"
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {isAdmin && search.trim() && !exactMatch && (
              <div className="p-2 border-t border-border space-y-2">
                <div className="flex items-center gap-1">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={`h-4 w-4 rounded-full transition ${newColor === c ? "ring-2 ring-offset-1 ring-foreground" : ""}`}
                      style={{ backgroundColor: c }}
                      aria-label={`Cor ${c}`}
                    />
                  ))}
                </div>
                <Button
                  size="sm"
                  className="w-full h-7 text-xs gap-1"
                  onClick={createTag}
                  disabled={creating}
                >
                  {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  Criar "{search.trim()}"
                </Button>
              </div>
            )}
            {!isAdmin && (
              <div className="p-2 border-t border-border">
                <p className="text-[10px] text-muted-foreground text-center">
                  <TagIcon className="h-2.5 w-2.5 inline mr-1" />
                  Apenas administradores podem criar novas tags
                </p>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
