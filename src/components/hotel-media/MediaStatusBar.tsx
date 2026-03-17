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

export default function MediaStatusBar({
  hotelName, sourceUrl, totalPhotos, roomCount, coverage,
  fromCache, cacheAgeHours, loading, classifying, onRefresh,
}: Props) {
  let domain = "";
  try { if (sourceUrl) domain = new URL(sourceUrl).hostname.replace("www.", ""); } catch { /* malformed URL */ }

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg border border-border/60 bg-card text-xs">
      {/* Status icon */}
      {coverage.level === "full" && <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0" />}
      {coverage.level === "partial" && <AlertTriangle className="w-3.5 h-3.5 text-warning flex-shrink-0" />}
      {coverage.level === "low" && <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />}
      {coverage.level === "error" && <Info className="w-3.5 h-3.5 text-destructive flex-shrink-0" />}

      {/* Domain */}
      {domain && (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Globe className="w-3 h-3" />
          {domain}
        </span>
      )}

      {/* Stats */}
      <span className="text-muted-foreground">{totalPhotos} fotos</span>
      <span className="text-muted-foreground">·</span>
      <span className="text-muted-foreground">{roomCount} quartos</span>

      {/* Source badge */}
      {coverage.officialPercent >= 50 ? (
        <Badge variant="outline" className="text-[9px] gap-1 border-success/30 text-success">
          <Globe className="w-2.5 h-2.5" /> Oficial
        </Badge>
      ) : coverage.officialPercent > 0 ? (
        <Badge variant="outline" className="text-[9px] gap-1 border-warning/30 text-warning">
          Fonte mista
        </Badge>
      ) : null}

      {/* Cache info */}
      {fromCache && cacheAgeHours !== null && (
        <span className="text-muted-foreground/60">
          Cache {Math.round(cacheAgeHours)}h
        </span>
      )}

      {/* Coverage warning */}
      {coverage.message && (
        <span className="text-warning text-[10px] font-medium">
          ⚠️ {coverage.message}
        </span>
      )}

      {/* Classifying indicator */}
      {classifying && (
        <Badge variant="outline" className="text-[9px] gap-1 animate-pulse">
          <Loader2 className="w-2.5 h-2.5 animate-spin" /> Classificando...
        </Badge>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* External link */}
      {sourceUrl && (
        <a href={sourceUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary flex items-center gap-1">
          <ExternalLink className="w-3 h-3" />
        </a>
      )}

      {/* Refresh */}
      <Button type="button" variant="ghost" size="sm" onClick={onRefresh} disabled={loading} className="h-6 w-6 p-0">
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
      </Button>
    </div>
  );
}
