import { memo, useEffect, useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { FileText } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Configure pdf.js worker locally so previews don't depend on an external CDN.
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

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
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const documentFile = useMemo(() => (pdfData ? { data: pdfData } : null), [pdfData]);
  const documentOptions = useMemo(() => ({ disableRange: true, disableStream: true }), []);

  useEffect(() => {
    const availableWidth = Math.max(180, Math.min(width, window.innerWidth - 96));
    setRenderWidth(availableWidth);
  }, [width]);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    setLoaded(false);
    setPdfData(null);

    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error("PDF indisponível");
        return response.arrayBuffer();
      })
      .then((buffer) => {
        if (!cancelled) setPdfData(new Uint8Array(buffer));
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

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
      <iframe
        src={`${url}#page=1&toolbar=0&navpanes=0&scrollbar=0`}
        title={filename || "Prévia do PDF"}
        className="absolute inset-0 h-full w-full border-0 bg-background"
      />
      {!loaded && (
        <div
          className="absolute right-2 top-2 flex items-center justify-center rounded-full bg-background/80 px-2 py-1 z-10 shadow-sm"
        >
          <LoadingState variant="inline" size="sm" />
        </div>
      )}
      {documentFile && <Document
        className="relative z-[1]"
        file={documentFile}
        options={documentOptions}
        onLoadError={() => setError(true)}
        onSourceError={() => setError(true)}
        loading={null}
        error={null}
      >
        <Page
          pageNumber={1}
          width={renderWidth}
          height={renderWidth * 1.25}
          renderAnnotationLayer={false}
          renderTextLayer={false}
          onRenderSuccess={() => setLoaded(true)}
          onRenderError={() => setError(true)}
          loading={null}
        />
      </Document>}
    </div>
  );
}

export const PdfThumbnail = memo(PdfThumbnailInner);
