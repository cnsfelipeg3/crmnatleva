import { useEffect, useState, type ReactNode } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

const SPLIT_BREAKPOINT = 1280;
const SIZE_KEY = "proposal-editor-split-size";
const VISIBLE_KEY = "proposal-editor-preview-visible";

interface SplitLayoutProps {
  left: ReactNode;
  preview: ReactNode;
  /** Called with `false` when the user collapses the preview, so the parent can fall back to a tab UI on small screens. */
  forceSingleColumn?: boolean;
}

/**
 * Two-column editor layout: forms on the left, live preview on the right.
 * - On screens ≥1280px: resizable split with localStorage-persisted width and toggle.
 * - On screens <1280px: returns the `left` content only; the parent should provide a tabbed fallback.
 */
export default function SplitLayout({ left, preview, forceSingleColumn }: SplitLayoutProps) {
  const [isWide, setIsWide] = useState<boolean>(() =>
    typeof window === "undefined" ? true : window.innerWidth >= SPLIT_BREAKPOINT,
  );
  const [previewVisible, setPreviewVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = localStorage.getItem(VISIBLE_KEY);
    return v === null ? true : v === "1";
  });
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [defaultSize, setDefaultSize] = useState<number>(() => {
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
    <ResizablePanelGroup
      direction="horizontal"
      className="min-h-[calc(100vh-220px)] rounded-xl border border-border/40 bg-background"
      onLayout={(sizes) => {
        const [leftSize] = sizes;
        if (Number.isFinite(leftSize)) {
          setDefaultSize(leftSize);
          localStorage.setItem(SIZE_KEY, String(Math.round(leftSize)));
        }
      }}
    >
      <ResizablePanel defaultSize={defaultSize} minSize={28} maxSize={70} className="overflow-y-auto">
        <div className="p-4">{left}</div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={100 - defaultSize} minSize={30} className="overflow-y-auto bg-muted/30">
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
              previewMode === "mobile" ? "max-w-[420px] rounded-2xl border border-border/40 bg-background shadow-md overflow-hidden" : "max-w-none",
            )}
          >
            {preview}
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
