import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Download, Loader2, ImageIcon, Copy, Check } from "lucide-react";
import { FORMATS, type FormatId, findFormat } from "@/lib/marketing/formats";
import { toast } from "@/hooks/use-toast";

interface Asset {
  id: string;
  format: string;
  url: string;
  caption?: string | null;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productId: string;
  productTitle: string;
}

const ORDER: FormatId[] = ["feed", "story", "vertical", "horizontal"];

export default function MarketingMediaDialog({ open, onOpenChange, productId, productTitle }: Props) {
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !productId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("product_marketing_assets")
        .select("id, format, url, caption, created_at")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (error) toast.error("Erro ao carregar artes", { description: error.message });
      setAssets((data || []) as Asset[]);
      setLoading(false);
    })();
  }, [open, productId]);

  const handleDownload = async (asset: Asset) => {
    setDownloading(asset.id);
    try {
      const safeTitle = productTitle
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);
      const fmt = findFormat(asset.format as FormatId);
      const ext = (asset.url.split("?")[0].split(".").pop() || "jpg").toLowerCase();
      const cleanExt = /^(jpg|jpeg|png|webp)$/i.test(ext) ? ext : "jpg";
      const filename = `natleva-${safeTitle}-${fmt?.id || "arte"}-${fmt?.width || ""}x${fmt?.height || ""}.${cleanExt}`;

      const res = await fetch(asset.url, { mode: "cors" });
      if (!res.ok) throw new Error("Falha ao baixar arte");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      toast.success("Arte baixada!");
    } catch (err: any) {
      // Fallback: abre em nova aba se CORS bloquear
      const a = document.createElement("a");
      a.href = asset.url;
      a.download = "";
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.info("Abrindo arte em nova aba para download manual");
    } finally {
      setDownloading(null);
    }
  };

  const handleCopyCaption = async (asset: Asset) => {
    if (!asset.caption) return;
    try {
      await navigator.clipboard.writeText(asset.caption);
      setCopiedId(asset.id);
      setTimeout(() => setCopiedId(null), 1800);
      toast.success("Legenda copiada");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const grouped = ORDER.map((fid) => ({
    format: findFormat(fid),
    items: assets.filter((a) => a.format === fid),
  })).filter((g) => g.items.length > 0);

  const totalCount = assets.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            Mídias para Divulgação
          </DialogTitle>
          <DialogDescription>
            Artes prontas pra postar nas redes sociais · clique em Baixar pra salvar no seu dispositivo em alta qualidade.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : totalCount === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>Ainda não há artes geradas para esse produto.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(({ format, items }) => (
              <section key={format.id}>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{format.label}</h3>
                    <p className="text-xs text-muted-foreground">{format.description}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {items.length} {items.length === 1 ? "arte" : "artes"}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((asset) => (
                    <div
                      key={asset.id}
                      className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-md transition-all"
                    >
                      <div
                        className="relative bg-muted overflow-hidden"
                        style={{ aspectRatio: `${format.width} / ${format.height}` }}
                      >
                        <img
                          src={asset.url}
                          alt={`Arte ${format.label}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-3 space-y-2">
                        {asset.caption && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
                            {asset.caption}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleDownload(asset)}
                            disabled={downloading === asset.id}
                            className="flex-1"
                          >
                            {downloading === asset.id ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            Baixar
                          </Button>
                          {asset.caption && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopyCaption(asset)}
                              title="Copiar legenda"
                            >
                              {copiedId === asset.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
