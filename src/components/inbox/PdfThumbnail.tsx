import { memo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { FileText, Loader2 } from "lucide-react";

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

  if (error) {
    return (
      <div
        className="flex items-center justify-center rounded-md bg-foreground/5 border border-border/40"
        style={{ width, height: width * 1.25 }}
      >
        <FileText className="h-10 w-10 opacity-50" />
      </div>
    );
  }

  return (
    <div
      className="relative rounded-md overflow-hidden bg-white border border-border/40 cursor-pointer hover:opacity-95 transition-opacity"
      style={{ width }}
      onClick={onClick}
      title={filename || "Abrir PDF"}
    >
      {!loaded && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-foreground/5 z-10"
          style={{ height: width * 1.3 }}
        >
          <Loader2 className="h-5 w-5 animate-spin opacity-60" />
        </div>
      )}
      <Document
        file={url}
        onLoadError={() => setError(true)}
        onSourceError={() => setError(true)}
        loading={null}
        error={null}
      >
        <Page
          pageNumber={1}
          width={width}
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
