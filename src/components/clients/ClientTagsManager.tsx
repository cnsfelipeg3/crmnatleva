import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, X, Tag } from "lucide-react";
import { getTagCategory, getTagLabel, TAG_CATEGORY_COLORS } from "@/utils/autoTagExtractor";
import { cn } from "@/lib/utils";

interface Props {
  tags: string[];
  onUpdate: (tags: string[]) => void;
  readOnly?: boolean;
}

export default function ClientTagsManager({ tags, onUpdate, readOnly = false }: Props) {
  const [newTag, setNewTag] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    const trimmed = newTag.trim().toLowerCase();
    if (!trimmed || tags.includes(trimmed)) return;
    onUpdate([...tags, trimmed]);
    setNewTag("");
    setIsAdding(false);
  };

  const handleRemove = (tag: string) => {
    onUpdate(tags.filter(t => t !== tag));
  };

  // Group tags by category
  const grouped = tags.reduce<Record<string, string[]>>((acc, tag) => {
    const cat = getTagCategory(tag);
    (acc[cat] ??= []).push(tag);
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    destino: "🌍 Destinos",
    budget: "💰 Orçamento",
    travelers: "👥 Viajantes",
    interest: "✨ Interesses",
    urgency: "⏰ Urgência",
    outro: "🏷️ Outras",
  };

  return (
    <Card className="p-4 glass-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Tag className="w-4 h-4 text-champagne" /> Tags do Cliente
        </h3>
        {!readOnly && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setIsAdding(!isAdding)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="flex gap-2 mb-3">
          <Input
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            placeholder="ex: destino:japao ou vip"
            className="h-8 text-xs"
            onKeyDown={e => e.key === "Enter" && handleAdd()}
          />
          <Button size="sm" className="h-8 text-xs" onClick={handleAdd}>OK</Button>
        </div>
      )}

      {tags.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Nenhuma tag registrada</p>
      ) : (
        <div className="space-y-2.5">
          {Object.entries(grouped).map(([cat, catTags]) => (
            <div key={cat}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                {categoryLabels[cat] || cat}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {catTags.map(tag => {
                  const colorClass = TAG_CATEGORY_COLORS[cat] || TAG_CATEGORY_COLORS.outro;
                  return (
                    <Badge
                      key={tag}
                      variant="outline"
                      className={cn("text-[11px] py-0.5 px-2 border", colorClass)}
                    >
                      {getTagLabel(tag)}
                      {!readOnly && (
                        <button
                          onClick={() => handleRemove(tag)}
                          className="ml-1.5 hover:text-destructive transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </Badge>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
