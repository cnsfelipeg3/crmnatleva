import { memo, useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { FileText } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";

// Configure pdf.js worker (use CDN matching installed version)
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface PdfThumbnailProps {
  url: string;
  filename?: string;
  onClick?: () => void;
  width?: number;
}

function PdfThumbnailInner({ url, filename, onClick, width = 240 }: PdfThumbnailProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [renderWidth, setRenderWidth] = useState(width);

  useEffect(() => {
    const availableWidth = Math.max(180, Math.min(width, window.innerWidth - 96));
    setRenderWidth(availableWidth);
  }, [width]);

  if (error) {
    return (
      <div
        className="flex items-center justify-center rounded-md bg-foreground/5 border border-border/40"
        style={{ width: renderWidth, height: renderWidth * 1.25 }}
      >
        <FileText className="h-10 w-10 opacity-50" />
      </div>
    );
  }

  return (
    <div
      className="relative rounded-md overflow-hidden bg-background border border-border/40 cursor-pointer hover:opacity-95 transition-opacity"
      style={{ width: renderWidth, minHeight: renderWidth * 1.25 }}
      onClick={onClick}
      title={filename || "Abrir PDF"}
    >
      {!loaded && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-muted/60 z-10"
          style={{ height: renderWidth * 1.25 }}
        >
          <LoadingState variant="inline" size="sm" />
        </div>
      )}
      <Document
        file={{ url, withCredentials: false }}
        options={{ disableRange: true, disableStream: true }}
        onLoadError={() => setError(true)}
        onSourceError={() => setError(true)}
        loading={null}
        error={null}
      >
        <Page
          pageNumber={1}
          width={renderWidth}
          renderAnnotationLayer={false}
          renderTextLayer={false}
          onRenderSuccess={() => setLoaded(true)}
          onRenderError={() => setError(true)}
          loading={null}
        />
      </Document>
    </div>
  );
}

export const PdfThumbnail = memo(PdfThumbnailInner);
