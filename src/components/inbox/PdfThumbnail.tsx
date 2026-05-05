import { memo, type KeyboardEvent } from "react";
import { Download, ExternalLink, FileText } from "lucide-react";

interface PdfThumbnailProps {
  url: string;
  filename?: string;
  onClick?: () => void;
  width?: number;
  compact?: boolean;
}

function clampPreviewWidth(width: number) {
  if (typeof window === "undefined") return width;
  return Math.max(40, Math.min(width, window.innerWidth - 96));
}

function PdfThumbnailInner({ url, filename, onClick, width = 240, compact = false }: PdfThumbnailProps) {
  const renderWidth = clampPreviewWidth(width);
  const aspectHeight = compact ? Math.round(renderWidth * 1.2) : Math.round(renderWidth * 1.25);
  const label = filename || "PDF";

  const openPdf = () => {
    if (onClick) onClick();
    else window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPdf();
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-md border border-border/60 bg-card cursor-pointer hover:bg-muted/50 transition-colors group"
      style={{ width: renderWidth, height: aspectHeight }}
      onClick={openPdf}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      title={`Abrir ${label}`}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center">
        <div className="h-12 w-12 rounded-md bg-destructive/10 text-destructive flex items-center justify-center">
          <FileText className="h-7 w-7" />
        </div>
        {!compact && (
          <span className="max-w-full truncate text-xs font-medium text-card-foreground">
            {label}
          </span>
        )}
      </div>
      {!compact && (
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-2 bg-background/95 px-2 py-1.5 text-[10px] text-muted-foreground">
          <span>PDF</span>
          <div className="flex items-center gap-2">
            <ExternalLink className="h-3.5 w-3.5" />
            <a
              href={url}
              download={filename || true}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full p-1 hover:bg-muted"
              title="Baixar PDF"
              onClick={(event) => event.stopPropagation()}
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export const PdfThumbnail = memo(PdfThumbnailInner);