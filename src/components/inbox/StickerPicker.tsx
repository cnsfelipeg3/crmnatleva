import { useEffect, useState } from "react";
import { Loader2, Trash2, Sticker as StickerIcon } from "lucide-react";
import { listSavedStickers, deleteSavedSticker, type SavedSticker } from "@/lib/savedStickers";
import { toast } from "@/hooks/use-toast";

interface StickerPickerProps {
  onSelect: (sticker: SavedSticker) => void;
}

export function StickerPicker({ onSelect }: StickerPickerProps) {
  const [items, setItems] = useState<SavedSticker[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      setItems(await listSavedStickers());
    } catch (e: any) {
      toast({ title: "Erro ao carregar figurinhas", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleDelete = async (s: SavedSticker, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Remover esta figurinha da galeria?")) return;
    try {
      await deleteSavedSticker(s);
      setItems(prev => prev.filter(i => i.id !== s.id));
    } catch (err: any) {
      toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="w-[320px] max-h-[360px] flex flex-col bg-popover">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <StickerIcon className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold">Minhas figurinhas</span>
        <span className="text-[10px] text-muted-foreground ml-auto">{items.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center gap-2">
            <StickerIcon className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">
              Nenhuma figurinha salva ainda. Toque em uma figurinha recebida no chat para salvá-la aqui.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {items.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(s)}
                className="group relative aspect-square rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors flex items-center justify-center p-1"
                title="Enviar figurinha"
              >
                <img
                  src={s.file_url}
                  alt="Figurinha"
                  loading="lazy"
                  className="max-w-full max-h-full object-contain"
                />
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleDelete(s, e)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleDelete(s, e as any); }}
                  className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground"
                  title="Remover"
                >
                  <Trash2 className="h-3 w-3" />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
