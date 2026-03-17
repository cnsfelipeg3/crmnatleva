import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, ExternalLink, RefreshCw, Loader2, AlertTriangle, CheckCircle, Info } from "lucide-react";
import type { CoverageState } from "./types";

interface Props {
  hotelName: string;
  sourceUrl: string;
  totalPhotos: number;
  roomCount: number;
  coverage: CoverageState;
  fromCache: boolean;
  cacheAgeHours: number | null;
  loading: boolean;
  classifying: boolean;
  onRefresh: () => void;
}

const STATUS_ICON = {
  full: <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />,
  partial: <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />,
  low: <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />,
  error: <Info className="w-4 h-4 text-destructive flex-shrink-0" />,
} as const;

export default function MediaStatusBar({
  hotelName, sourceUrl, totalPhotos, roomCount, coverage,
  fromCache, cacheAgeHours, loading, classifying, onRefresh,
}: Props) {
  let domain = "";
  try { if (sourceUrl) domain = new URL(sourceUrl).hostname.replace("www.", ""); } catch { /* malformed URL */ }

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/40 bg-gradient-to-r from-card via-card to-accent/[0.04] transition-colors duration-150">
      {/* Status icon */}
      {STATUS_ICON[coverage.level]}

      {/* Hotel name + meta */}
      <div className="flex flex-col min-w-0">
        <span className="text-base font-bold text-foreground truncate leading-tight">{hotelName}</span>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {domain && (
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {domain}
            </span>
          )}
          <span>{totalPhotos} fotos</span>
          <span>·</span>
          <span>{roomCount} quartos</span>
          {coverage.officialPercent >= 50 && (
            <Badge variant="outline" className="text-[9px] h-4 gap-0.5 rounded-full border-success/30 text-success">
              <Globe className="w-2.5 h-2.5" /> Oficial
            </Badge>
          )}
          {coverage.officialPercent > 0 && coverage.officialPercent < 50 && (
            <Badge variant="outline" className="text-[9px] h-4 rounded-full border-warning/30 text-warning">
              Fonte mista
            </Badge>
          )}
          {fromCache && cacheAgeHours !== null && (
            <span className="text-muted-foreground/50">Cache {Math.round(cacheAgeHours)}h</span>
          )}
        </div>
      </div>

      {/* Coverage warning */}
      {coverage.message && (
        <span className="text-warning text-[10px] font-medium hidden sm:inline">⚠️ {coverage.message}</span>
      )}

      {/* Classifying */}
      {classifying && (
        <Badge variant="outline" className="text-[9px] gap-1 rounded-full animate-pulse">
          <Loader2 className="w-2.5 h-2.5 animate-spin" /> Classificando…
        </Badge>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        {sourceUrl && (
          <a href={sourceUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-accent transition-colors duration-150 p-1">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={onRefresh} disabled={loading} className="h-7 w-7 p-0 hover:bg-accent/10 transition-colors duration-150">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );
}
