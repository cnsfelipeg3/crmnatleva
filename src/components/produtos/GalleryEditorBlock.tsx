import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Images, Pencil, ChevronUp, Star } from "lucide-react";
import GalleryManager from "./GalleryManager";

type Props = {
  gallery: string;
  coverUrl?: string;
  onChange: (gallery: string) => void;
  onSetCover: (url: string) => void;
};

export default function GalleryEditorBlock({ gallery, coverUrl, onChange, onSetCover }: Props) {
  const [open, setOpen] = useState(false);
  const urls = gallery.split("\n").map((s) => s.trim()).filter(Boolean);
  const count = urls.length;
  const previews = urls.slice(0, 6);

  return (
    <div className="rounded-lg border border-border bg-background/60 p-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Images className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold">Galeria do hotel</div>
            <div className="text-[11px] text-muted-foreground">
              {count > 0
                ? `${count} ${count === 1 ? "foto" : "fotos"} · clique para editar, reordenar ou definir capa`
                : "Nenhuma foto ainda · use a busca acima ou adicione URLs manualmente"}
            </div>
          </div>
        </div>
        <Button
          size="sm"
          variant={open ? "secondary" : "outline"}
          onClick={() => setOpen((v) => !v)}
          className="gap-1.5 shrink-0"
        >
          {open ? (<><ChevronUp className="w-3.5 h-3.5" /> Fechar</>) : (<><Pencil className="w-3.5 h-3.5" /> Editar galeria</>)}
        </Button>
      </div>

      {!open && previews.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {previews.map((u, i) => {
            const isCover = coverUrl && u === coverUrl;
            return (
              <div
                key={i}
                className="relative aspect-square rounded-md overflow-hidden border border-border bg-muted/30"
              >
                <img
                  src={u}
                  alt={`foto ${i + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover"
                  onError={(e) => ((e.currentTarget.style.opacity = "0.2"))}
                />
                {isCover && (
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[9px] font-semibold flex items-center gap-0.5 shadow">
                    <Star className="w-2.5 h-2.5 fill-current" /> capa
                  </div>
                )}
                {i === previews.length - 1 && count > previews.length && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold text-sm">
                    +{count - previews.length}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <div className="pt-1">
          <GalleryManager
            gallery={gallery}
            coverUrl={coverUrl}
            onChange={onChange}
            onSetCover={onSetCover}
          />
        </div>
      )}
    </div>
  );
}
