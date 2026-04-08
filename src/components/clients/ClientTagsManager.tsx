import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Sparkles, Tag, X } from "lucide-react";
import { getTagCategory, getTagLabel } from "@/utils/autoTagExtractor";
import { cn } from "@/lib/utils";

interface Props {
  clientId?: string | null;
  readOnly?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  destino: "🌍 Destinos",
  budget: "💰 Orçamento",
  travelers: "👥 Viajantes",
  interest: "✨ Interesses",
  urgency: "⏰ Urgência",
  outro: "🏷️ Outras",
};

const MANUAL_TAG_STYLES: Record<string, string> = {
  destino: "border-primary/50 bg-primary text-primary-foreground",
  budget: "border-info/50 bg-info text-foreground",
  travelers: "border-accent/50 bg-accent text-accent-foreground",
  interest: "border-champagne/50 bg-champagne text-foreground",
  urgency: "border-destructive/50 bg-destructive text-destructive-foreground",
  outro: "border-muted bg-muted text-foreground",
};

const AUTO_TAG_STYLES: Record<string, string> = {
  destino: "border-primary/40 bg-primary/10 text-primary",
  budget: "border-info/40 bg-info/10 text-info",
  travelers: "border-accent/40 bg-accent/10 text-accent-foreground",
  interest: "border-champagne/40 bg-champagne/10 text-champagne",
  urgency: "border-destructive/40 bg-destructive/10 text-destructive",
  outro: "border-muted-foreground/30 bg-muted/20 text-muted-foreground",
};

const normalizeTags = (tags: string[] | null | undefined) =>
  Array.from(new Set((tags ?? []).map(tag => tag.trim().toLowerCase()).filter(Boolean)));

const groupTags = (tags: string[]) =>
  tags.reduce<Record<string, string[]>>((acc, tag) => {
    const category = getTagCategory(tag);
    (acc[category] ??= []).push(tag);
    return acc;
  }, {});

export default function ClientTagsManager({ clientId, readOnly = false }: Props) {
  const [manualTags, setManualTags] = useState<string[]>([]);
  const [autoTags, setAutoTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!clientId) {
      setManualTags([]);
      setAutoTags([]);
      return;
    }

    let cancelled = false;

    const loadTags = async () => {
      setIsLoading(true);
      try {
        const [clientResult, conversationsResult] = await Promise.all([
          supabase.from("clients").select("tags").eq("id", clientId).maybeSingle(),
          supabase.from("conversations").select("auto_tags").eq("client_id", clientId),
        ]);

        if (cancelled) return;

        if (clientResult.error) {
          console.error("Erro ao carregar tags do cliente:", clientResult.error);
        }

        if (conversationsResult.error) {
          console.error("Erro ao carregar auto_tags das conversas:", conversationsResult.error);
        }

        setManualTags(normalizeTags((clientResult.data?.tags as string[] | null | undefined) ?? []));
        setAutoTags(
          normalizeTags((conversationsResult.data ?? []).flatMap(conversation => conversation.auto_tags ?? [])),
        );
      } catch (error) {
        if (!cancelled) {
          console.error("Erro ao carregar tags do cliente:", error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadTags();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const persistManualTags = async (nextTags: string[]) => {
    setManualTags(nextTags);

    if (!clientId) return;

    const { error } = await supabase.from("clients").update({ tags: nextTags } as any).eq("id", clientId);

    if (error) {
      console.error("Erro ao salvar tags do cliente:", error);
    }
  };

  const handleAdd = async () => {
    const trimmed = newTag.trim().toLowerCase();
    if (!trimmed || manualTags.includes(trimmed)) return;

    await persistManualTags([...manualTags, trimmed]);
    setNewTag("");
    setIsAdding(false);
  };

  const handleRemove = async (tag: string) => {
    await persistManualTags(manualTags.filter(item => item !== tag));
  };

  const groupedManualTags = useMemo(() => groupTags(manualTags), [manualTags]);
  const groupedAutoTags = useMemo(() => groupTags(autoTags), [autoTags]);
  const hasAnyTags = manualTags.length > 0 || autoTags.length > 0;

  return (
    <Card className="glass-card border-border/40 bg-card/80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Tag className="h-4 w-4 text-primary" /> Tags do Cliente
        </h3>
        {!readOnly && clientId && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-primary hover:text-primary"
            onClick={() => setIsAdding(current => !current)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="mb-3 flex gap-2">
          <Input
            value={newTag}
            onChange={event => setNewTag(event.target.value)}
            placeholder="ex: destino:japao ou vip"
            className="h-8 border-border/40 bg-background/40 text-xs"
            onKeyDown={event => event.key === "Enter" && void handleAdd()}
          />
          <Button size="sm" className="h-8 text-xs" onClick={() => void handleAdd()}>
            OK
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Carregando tags...
        </div>
      ) : !hasAnyTags ? (
        <p className="py-4 text-center text-xs text-muted-foreground">Nenhuma tag registrada</p>
      ) : (
        <div className="space-y-3">
          {manualTags.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tags Manuais</p>
              {Object.entries(groupedManualTags).map(([category, tags]) => (
                <div key={`manual-${category}`}>
                  <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/80">
                    {CATEGORY_LABELS[category] || category}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map(tag => (
                      <Badge
                        key={`manual-${tag}`}
                        variant="outline"
                        className={cn(
                          "border text-[11px] px-2 py-0.5 shadow-sm",
                          MANUAL_TAG_STYLES[category] || MANUAL_TAG_STYLES.outro,
                        )}
                      >
                        {getTagLabel(tag)}
                        {!readOnly && clientId && (
                          <button
                            onClick={() => void handleRemove(tag)}
                            className="ml-1.5 transition-colors hover:text-destructive-foreground/80"
                            aria-label={`Remover tag ${getTagLabel(tag)}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {autoTags.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary" /> Tags Automáticas (Conversas)
              </p>
              {Object.entries(groupedAutoTags).map(([category, tags]) => (
                <div key={`auto-${category}`}>
                  <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/80">
                    {CATEGORY_LABELS[category] || category}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map(tag => (
                      <Badge
                        key={`auto-${tag}`}
                        variant="outline"
                        className={cn(
                          "border border-dashed text-[11px] px-2 py-0.5",
                          AUTO_TAG_STYLES[category] || AUTO_TAG_STYLES.outro,
                        )}
                      >
                        {getTagLabel(tag)}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
