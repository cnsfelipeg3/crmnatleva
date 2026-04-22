import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plane, Check, Sparkles, Upload, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CoverImage {
  url: string;
  source: "wikimedia" | "ai" | "upload";
  title?: string;
}

interface FlightCoverPickerProps {
  value: string;
  onChange: (url: string) => void;
  airlineIata?: string;
  airlineName?: string;
}

export default function FlightCoverPicker({
  value,
  onChange,
  airlineIata,
  airlineName,
}: FlightCoverPickerProps) {
  const [results, setResults] = useState<CoverImage[]>([]);
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const buildSearchTerm = () => {
    const parts: string[] = [];
    if (airlineName) parts.push(airlineName);
    else if (airlineIata) parts.push(airlineIata);
    parts.push("aircraft airplane");
    return parts.join(" ");
  };

  const handleSearch = async () => {
    setSearching(true);
    try {
      const term = buildSearchTerm();
      const { data, error } = await supabase.functions.invoke("cover-image-search", {
        body: { destination: term },
      });
      if (error) throw error;
      const imgs = (data?.images || []) as CoverImage[];
      if (imgs.length === 0) {
        toast.warning("Nenhuma imagem encontrada. Tente fazer upload.");
      }
      setResults(imgs);
    } catch (e: any) {
      toast.error("Erro ao buscar imagens", { description: e?.message });
    } finally {
      setSearching(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem (JPG, PNG, WEBP)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 10MB)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `flight-covers/${Date.now()}-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("media").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Imagem enviada!");
    } catch (e: any) {
      toast.error("Erro ao enviar imagem", { description: e?.message });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="md:col-span-2 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Label className="text-xs flex items-center gap-1.5">
          <Plane className="w-3.5 h-3.5 text-primary" />
          Imagem de capa do aéreo
          {airlineName && (
            <span className="text-[10px] text-muted-foreground font-normal">
              · {airlineName}
            </span>
          )}
        </Label>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleSearch}
          disabled={searching}
          className="gap-1.5 h-8 text-xs"
        >
          {searching ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          )}
          {searching ? "Buscando..." : "Buscar com IA"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="gap-1.5 h-8 text-xs"
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5 text-primary" />
          )}
          {uploading ? "Enviando..." : "Fazer upload"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
          }}
        />
        {!airlineIata && !airlineName && (
          <span className="text-[10px] text-muted-foreground">
            Defina a companhia aérea para melhores resultados
          </span>
        )}
      </div>

      {/* Currently selected preview */}
      {value && (
        <div className="flex items-start gap-2 p-2 bg-muted/30 rounded-lg border border-border/40">
          <div className="w-24 h-16 rounded overflow-hidden shrink-0 bg-muted">
            <img
              src={value}
              alt="Capa selecionada"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-foreground">Capa atual</p>
            <p className="text-[10px] text-muted-foreground truncate">
              Esta imagem aparecerá no topo do card de aéreo na proposta
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            title="Remover capa"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Search results grid */}
      {results.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Resultados ({results.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {results.map((c, i) => {
              const selected = value === c.url;
              return (
                <button
                  key={`${c.url}-${i}`}
                  type="button"
                  onClick={() => onChange(c.url)}
                  className={cn(
                    "relative aspect-[4/3] rounded-lg overflow-hidden border bg-muted group transition-all",
                    selected
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border/40 hover:border-border"
                  )}
                >
                  <img
                    src={c.url}
                    alt={c.title || "Sugestão"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                    }}
                  />
                  {selected && (
                    <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                  {c.source === "ai" && (
                    <div className="absolute top-1 left-1 bg-primary/90 text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Sparkles className="w-2 h-2" /> IA
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
