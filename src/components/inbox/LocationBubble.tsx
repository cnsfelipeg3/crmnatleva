import { MapPin, ExternalLink } from "lucide-react";

interface Props {
  latitude: number;
  longitude: number;
  title?: string | null;
  address?: string | null;
}

export function LocationBubble({ latitude, longitude, title, address }: Props) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  const staticMapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=15&size=300x150&markers=${latitude},${longitude},red-pushpin`;

  return (
    <a
      href={googleMapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg overflow-hidden border border-border hover:border-primary transition-colors max-w-xs bg-background/30"
    >
      <img
        src={staticMapUrl}
        alt="Localização"
        className="w-full h-32 object-cover bg-muted"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      <div className="p-3 flex items-start gap-2">
        <MapPin className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {title && <div className="font-semibold text-sm break-words">{title}</div>}
          {address && <div className="text-xs text-muted-foreground line-clamp-2 break-words">{address}</div>}
          <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            Abrir no Google Maps
          </div>
        </div>
      </div>
    </a>
  );
}
