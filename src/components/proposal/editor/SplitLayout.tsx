import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

const SPLIT_BREAKPOINT = 1280;
const SIZE_KEY = "proposal-editor-split-size";
const VISIBLE_KEY = "proposal-editor-preview-visible";

interface SplitLayoutProps {
  left: ReactNode;
  preview: ReactNode;
  forceSingleColumn?: boolean;
}

/**
 * Two-column editor layout (forms left, live preview right).
 * Uses a plain flex layout + manual drag handle to avoid the
 * `react-resizable-panels` `useId` runtime issue.
 */
export default function SplitLayout({ left, preview, forceSingleColumn }: SplitLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const [isWide, setIsWide] = useState<boolean>(() =>
    typeof window === "undefined" ? true : window.innerWidth >= SPLIT_BREAKPOINT,
  );
  const [previewVisible, setPreviewVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = localStorage.getItem(VISIBLE_KEY);
    return v === null ? true : v === "1";
  });
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [leftSize, setLeftSize] = useState<number>(() => {
    if (typeof window === "undefined") return 42;
    const v = Number(localStorage.getItem(SIZE_KEY));
    return Number.isFinite(v) && v >= 25 && v <= 75 ? v : 42;
  });

  useEffect(() => {
    const onResize = () => setIsWide(window.innerWidth >= SPLIT_BREAKPOINT);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    localStorage.setItem(VISIBLE_KEY, previewVisible ? "1" : "0");
  }, [previewVisible]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(70, Math.max(28, pct));
      setLeftSize(clamped);
    };
    const onUp = () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        localStorage.setItem(SIZE_KEY, String(Math.round(leftSize)));
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [leftSize]);

  if (!isWide || forceSingleColumn || !previewVisible) {
    return (
      <div className="relative">
        {!previewVisible && isWide && !forceSingleColumn && (
          <div className="mb-3 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setPreviewVisible(true)} className="gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Mostrar preview
            </Button>
          </div>
        )}
        {left}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex min-h-[calc(100vh-220px)] w-full rounded-xl border border-border/40 bg-background overflow-hidden"
    >
      <div
        className="overflow-y-auto"
        style={{ width: `${leftSize}%` }}
      >
        <div className="p-4">{left}</div>
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={() => {
          draggingRef.current = true;
          document.body.style.cursor = "col-resize";
          document.body.style.userSelect = "none";
        }}
        className="group relative w-1.5 shrink-0 cursor-col-resize bg-border/40 hover:bg-primary/40 transition-colors"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-1 rounded-full bg-border group-hover:bg-primary/60" />
      </div>

      <div
        className="overflow-y-auto bg-muted/30"
        style={{ width: `${100 - leftSize}%` }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border/40 bg-background/95 backdrop-blur px-3 py-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="w-3.5 h-3.5" />
            Pré-visualização ao vivo
          </div>
          <div className="flex items-center gap-1">
            <div className="flex items-center rounded-lg border border-border/40 p-0.5">
              <button
                type="button"
                onClick={() => setPreviewMode("desktop")}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  previewMode === "desktop"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title="Visualizar como desktop"
              >
                <Monitor className="w-3 h-3" />
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("mobile")}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  previewMode === "mobile"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title="Visualizar como mobile"
              >
                <Smartphone className="w-3 h-3" />
                Mobile
              </button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPreviewVisible(false)}
              className="gap-1.5 h-7 text-xs"
              title="Esconder preview"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <div className="p-3">
          <div
            className={cn(
              "mx-auto transition-all duration-300",
              previewMode === "mobile"
                ? "proposal-mobile-frame max-w-[390px] rounded-2xl border border-border/40 bg-background shadow-md overflow-hidden"
                : "max-w-none",
            )}
          >
            {preview}
          </div>
        </div>
      </div>
    </div>
  );
}
