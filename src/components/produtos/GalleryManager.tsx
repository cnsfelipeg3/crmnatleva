import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Star, ArrowUp, ArrowDown, Plus, Code2, ImageOff } from "lucide-react";

type Props = {
  /** Gallery armazenada como string com 1 URL por linha (formato existente do form). */
  gallery: string;
  coverUrl?: string;
  onChange: (gallery: string) => void;
  onSetCover: (url: string) => void;
};

export default function GalleryManager({ gallery, coverUrl, onChange, onSetCover }: Props) {
  const urls = gallery.split("\n").map((s) => s.trim()).filter(Boolean);
  const [newUrl, setNewUrl] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [broken, setBroken] = useState<Set<string>>(new Set());

  const update = (next: string[]) => onChange(next.join("\n"));

  const remove = (i: number) => update(urls.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= urls.length) return;
    const next = [...urls];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  };
  const add = () => {
    const v = newUrl.trim();
    if (!v) return;
    if (urls.includes(v) || coverUrl === v) {
      setNewUrl("");
      return;
    }
    update([...urls, v]);
    setNewUrl("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="m-0">Galeria de fotos · {urls.length} {urls.length === 1 ? "imagem" : "imagens"}</Label>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAdvanced((v) => !v)}>
          <Code2 className="w-3.5 h-3.5 mr-1.5" />
          {advanced ? "Visual" : "Editar URLs"}
        </Button>
      </div>

      {advanced ? (
        <textarea
          rows={8}
          value={gallery}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://... (uma URL por linha)"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
        />
      ) : (
        <>
          {urls.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
              <ImageOff className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma foto na galeria · adicione URLs abaixo ou use "Buscar hotel real" no topo</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {urls.map((url, i) => {
                const isBroken = broken.has(url);
                return (
                  <div
                    key={url + i}
                    className="group relative aspect-square rounded-lg overflow-hidden border border-border bg-muted/40"
                  >
                    {isBroken ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-2 text-center">
                        <ImageOff className="w-5 h-5 mb-1" />
                        <span className="text-[10px] leading-tight">Imagem indisponível</span>
                      </div>
                    ) : (
                      <img
                        src={url}
                        alt={`Foto ${i + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        onError={() => setBroken((s) => new Set(s).add(url))}
                      />
                    )}

                    {/* Numeração / posição */}
                    <span className="absolute top-1.5 left-1.5 text-[10px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded backdrop-blur-sm">
                      {i + 1}
                    </span>

                    {/* Overlay de ações */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/55 transition-colors flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-8 text-xs"
                        onClick={() => onSetCover(url)}
                        title="Definir como capa"
                      >
                        <Star className="w-3.5 h-3.5 mr-1" />
                        Definir capa
                      </Button>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          className="h-7 w-7"
                          onClick={() => move(i, -1)}
                          disabled={i === 0}
                          title="Mover pra esquerda"
                        >
                          <ArrowUp className="w-3.5 h-3.5 -rotate-90" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          className="h-7 w-7"
                          onClick={() => move(i, 1)}
                          disabled={i === urls.length - 1}
                          title="Mover pra direita"
                        >
                          <ArrowDown className="w-3.5 h-3.5 -rotate-90" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          className="h-7 w-7"
                          onClick={() => remove(i)}
                          title="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Adicionar URL manual */}
          <div className="flex items-center gap-2 pt-1">
            <Input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="Cole uma URL de imagem e adicione..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              className="flex-1"
            />
            <Button type="button" onClick={add} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
