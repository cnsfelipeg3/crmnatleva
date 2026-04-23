import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useHotelPhotos } from "@/hooks/useBookingRapidApi";
import { resizeBookingPhoto } from "./types";

interface Props {
  hotelId: string | number | null;
  hotelName?: string;
}

export function HotelGallery({ hotelId, hotelName }: Props) {
  const { data: photos, isLoading, isError } = useHotelPhotos(hotelId);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded" />
        ))}
      </div>
    );
  }

  if (isError || !photos?.length) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        Nenhuma foto disponível.
      </div>
    );
  }

  const open = (idx: number) => setLightboxIdx(idx);
  const close = () => setLightboxIdx(null);
  const prev = () =>
    setLightboxIdx((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
  const next = () =>
    setLightboxIdx((i) => (i === null ? i : (i + 1) % photos.length));

  const downloadCurrent = async () => {
    if (lightboxIdx === null) return;
    const hiRes = resizeBookingPhoto(photos[lightboxIdx].url, "max1440x1080");
    try {
      const res = await fetch(hiRes);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${hotelName || "hotel"}-${photos[lightboxIdx].id}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download iniciado");
    } catch {
      toast.error("Erro ao baixar foto");
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {photos.map((p, idx) => (
          <button
            key={String(p.id)}
            type="button"
            onClick={() => open(idx)}
            className="aspect-square overflow-hidden rounded bg-muted hover:opacity-90 transition"
          >
            <img
              src={resizeBookingPhoto(p.url, "max500")}
              alt={`Foto ${idx + 1}`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>

      <Dialog open={lightboxIdx !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-5xl p-0 bg-background/95">
          <DialogTitle className="sr-only">Galeria — {hotelName}</DialogTitle>
          {lightboxIdx !== null && (
            <div className="relative">
              <img
                src={resizeBookingPhoto(photos[lightboxIdx].url, "max1440x1080")}
                alt={`Foto ${lightboxIdx + 1}`}
                className="w-full max-h-[80vh] object-contain bg-black"
              />
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-2"
                onClick={close}
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute top-2 right-12"
                onClick={downloadCurrent}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2"
                onClick={prev}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={next}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-background/80 px-2 py-1 text-xs">
                {lightboxIdx + 1} / {photos.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
