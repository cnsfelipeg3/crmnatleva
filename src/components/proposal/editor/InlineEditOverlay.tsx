import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Palette,
  RotateCcw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const FONT_FAMILIES = [
  { label: "Padrão", value: "" },
  { label: "Sans (Inter)", value: "Inter, system-ui, sans-serif" },
  { label: "Serif (Playfair)", value: "'Playfair Display', Georgia, serif" },
  { label: "Mono", value: "'JetBrains Mono', ui-monospace, monospace" },
];

const FONT_SIZES = ["12", "14", "16", "18", "20", "24", "28", "32", "40", "48", "56", "64"];

const COLOR_SWATCHES = [
  "hsl(var(--foreground))",
  "hsl(var(--muted-foreground))",
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(var(--destructive))",
  "#ffffff",
  "#0f172a",
  "#b45309",
  "#15803d",
  "#1d4ed8",
];

interface OverrideStyle {
  fontFamily?: string;
  fontSize?: string;
  color?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  textAlign?: string;
  text?: string;
}

interface InlineEditOverlayProps {
  /** Stable identifier (e.g. proposal id) used to scope persistence. */
  storageKey: string;
  /** Whether edit mode is on. */
  enabled: boolean;
  children: ReactNode;
}

/**
 * Wraps any subtree so that — while `enabled` — clicking on a text element
 * opens a floating toolbar that lets the user change font, size, weight,
 * style, color, alignment and text content. Overrides are persisted in
 * localStorage (`proposal-inline-edits-<storageKey>`) and re-applied on mount.
 *
 * Targets are matched by a deterministic CSS-path signature so the same
 * element survives re-renders of the preview.
 */
export default function InlineEditOverlay({
  storageKey,
  enabled,
  children,
}: InlineEditOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [overrides, setOverrides] = useState<Record<string, OverrideStyle>>({});
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null);
  const activeElRef = useRef<HTMLElement | null>(null);

  const storeKey = `proposal-inline-edits-${storageKey}`;

  // Load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) setOverrides(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [storeKey]);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(storeKey, JSON.stringify(overrides));
    } catch {
      /* ignore */
    }
  }, [overrides, storeKey]);

  /** Build a stable signature for a node within the container. */
  const signatureOf = useCallback((el: HTMLElement): string | null => {
    const root = containerRef.current;
    if (!root || !root.contains(el)) return null;
    const parts: string[] = [];
    let node: HTMLElement | null = el;
    while (node && node !== root) {
      const parent: HTMLElement | null = node.parentElement;
      if (!parent) break;
      const siblings = Array.from(parent.children) as HTMLElement[];
      const idx = siblings.indexOf(node);
      parts.unshift(`${node.tagName.toLowerCase()}:${idx}`);
      node = parent;
    }
    return parts.join(">");
  }, []);

  const applyStyle = useCallback((el: HTMLElement, s: OverrideStyle) => {
    if (s.fontFamily !== undefined) el.style.fontFamily = s.fontFamily;
    if (s.fontSize) el.style.fontSize = `${s.fontSize}px`;
    if (s.color) el.style.color = s.color;
    if (s.fontWeight) el.style.fontWeight = s.fontWeight;
    if (s.fontStyle) el.style.fontStyle = s.fontStyle;
    if (s.textDecoration) el.style.textDecoration = s.textDecoration;
    if (s.textAlign) el.style.textAlign = s.textAlign;
    if (s.text !== undefined) el.textContent = s.text;
  }, []);

  /** Re-apply overrides to matching elements after each render. */
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const raf = requestAnimationFrame(() => {
      Object.entries(overrides).forEach(([sig, style]) => {
        const el = findBySignature(root, sig);
        if (el) applyStyle(el, style);
      });
    });
    return () => cancelAnimationFrame(raf);
  });

  /** Find element by stored signature. */
  const findBySignature = (root: HTMLElement, sig: string): HTMLElement | null => {
    if (!sig) return null;
    const parts = sig.split(">");
    let node: HTMLElement | null = root;
    for (const part of parts) {
      const [tag, idxStr] = part.split(":");
      const idx = Number(idxStr);
      if (!node) return null;
      const children = Array.from(node.children) as HTMLElement[];
      const candidate = children[idx];
      if (!candidate || candidate.tagName.toLowerCase() !== tag) return null;
      node = candidate;
    }
    return node;
  };

  /** Click handler in capture phase to intercept everything when editing. */
  useEffect(() => {
    const root = containerRef.current;
    if (!root || !enabled) return;

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target || !root.contains(target)) return;

      // Ignore clicks inside the toolbar.
      if (target.closest("[data-inline-toolbar]")) return;

      e.preventDefault();
      e.stopPropagation();

      // Find the closest "leaf-ish" text element.
      const editable = pickEditable(target, root);
      if (!editable) return;

      const sig = signatureOf(editable);
      if (!sig) return;

      activeElRef.current = editable;
      setActiveKey(sig);

      const rect = editable.getBoundingClientRect();
      const containerRect = root.getBoundingClientRect();
      setToolbarPos({
        top: rect.top - containerRect.top - 52,
        left: Math.max(0, rect.left - containerRect.left),
      });

      editable.setAttribute("contenteditable", "true");
      editable.focus();

      // Select content for easy replacement.
      const range = document.createRange();
      range.selectNodeContents(editable);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    };

    root.addEventListener("click", onClick, true);
    return () => root.removeEventListener("click", onClick, true);
  }, [enabled, signatureOf]);

  /** When edit mode is turned off, clean up. */
  useEffect(() => {
    if (enabled) return;
    const el = activeElRef.current;
    if (el) el.removeAttribute("contenteditable");
    activeElRef.current = null;
    setActiveKey(null);
    setToolbarPos(null);
  }, [enabled]);

  /** Capture text edits via input event on the active element. */
  useEffect(() => {
    const el = activeElRef.current;
    if (!el || !activeKey) return;
    const onInput = () => {
      setOverrides((prev) => ({
        ...prev,
        [activeKey]: { ...prev[activeKey], text: el.textContent ?? "" },
      }));
    };
    el.addEventListener("input", onInput);
    return () => el.removeEventListener("input", onInput);
  }, [activeKey]);

  const updateActive = useCallback(
    (patch: OverrideStyle) => {
      const el = activeElRef.current;
      if (!el || !activeKey) return;
      setOverrides((prev) => {
        const next = { ...prev, [activeKey]: { ...prev[activeKey], ...patch } };
        applyStyle(el, next[activeKey]);
        return next;
      });
    },
    [activeKey, applyStyle],
  );

  const resetActive = useCallback(() => {
    const el = activeElRef.current;
    if (!el || !activeKey) return;
    el.removeAttribute("style");
    el.removeAttribute("contenteditable");
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[activeKey];
      return next;
    });
    setActiveKey(null);
    setToolbarPos(null);
    activeElRef.current = null;
  }, [activeKey]);

  const closeToolbar = useCallback(() => {
    const el = activeElRef.current;
    if (el) el.removeAttribute("contenteditable");
    setActiveKey(null);
    setToolbarPos(null);
    activeElRef.current = null;
  }, []);

  const current = activeKey ? overrides[activeKey] || {} : {};

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={cn(
          "relative",
          enabled && "[&_*:hover]:outline [&_*:hover]:outline-1 [&_*:hover]:outline-primary/40 [&_*:hover]:outline-offset-2 [&_*:hover]:rounded-sm",
          enabled && activeKey && `[data-inline-active='true']:outline [data-inline-active='true']:outline-2 [data-inline-active='true']:outline-primary`,
        )}
        data-inline-edit-root
      >
        {children}
      </div>

      {enabled && activeKey && toolbarPos && (
        <div
          data-inline-toolbar
          style={{ top: toolbarPos.top, left: toolbarPos.left }}
          className="absolute z-50 flex flex-wrap items-center gap-1 rounded-lg border border-border bg-popover p-1.5 shadow-lg"
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Font family */}
          <select
            value={current.fontFamily ?? ""}
            onChange={(e) => updateActive({ fontFamily: e.target.value })}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs"
            title="Fonte"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f.label} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          {/* Font size */}
          <div className="flex items-center gap-1">
            <Type className="h-3 w-3 text-muted-foreground" />
            <select
              value={current.fontSize ?? ""}
              onChange={(e) => updateActive({ fontSize: e.target.value })}
              className="h-8 w-16 rounded-md border border-border bg-background px-1 text-xs"
              title="Tamanho"
            >
              <option value="">auto</option>
              {FONT_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}px
                </option>
              ))}
            </select>
          </div>

          <div className="mx-0.5 h-6 w-px bg-border" />

          {/* Bold / Italic / Underline */}
          <Button
            type="button"
            size="icon"
            variant={current.fontWeight === "bold" ? "default" : "ghost"}
            className="h-8 w-8"
            onClick={() =>
              updateActive({
                fontWeight: current.fontWeight === "bold" ? "normal" : "bold",
              })
            }
            title="Negrito"
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={current.fontStyle === "italic" ? "default" : "ghost"}
            className="h-8 w-8"
            onClick={() =>
              updateActive({
                fontStyle: current.fontStyle === "italic" ? "normal" : "italic",
              })
            }
            title="Itálico"
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={current.textDecoration === "underline" ? "default" : "ghost"}
            className="h-8 w-8"
            onClick={() =>
              updateActive({
                textDecoration:
                  current.textDecoration === "underline" ? "none" : "underline",
              })
            }
            title="Sublinhado"
          >
            <Underline className="h-3.5 w-3.5" />
          </Button>

          <div className="mx-0.5 h-6 w-px bg-border" />

          {/* Alignment */}
          <Button
            type="button"
            size="icon"
            variant={current.textAlign === "left" ? "default" : "ghost"}
            className="h-8 w-8"
            onClick={() => updateActive({ textAlign: "left" })}
            title="Alinhar à esquerda"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={current.textAlign === "center" ? "default" : "ghost"}
            className="h-8 w-8"
            onClick={() => updateActive({ textAlign: "center" })}
            title="Centralizar"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={current.textAlign === "right" ? "default" : "ghost"}
            className="h-8 w-8"
            onClick={() => updateActive({ textAlign: "right" })}
            title="Alinhar à direita"
          >
            <AlignRight className="h-3.5 w-3.5" />
          </Button>

          <div className="mx-0.5 h-6 w-px bg-border" />

          {/* Color */}
          <div className="flex items-center gap-1">
            <Palette className="h-3 w-3 text-muted-foreground" />
            {COLOR_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => updateActive({ color: c })}
                className={cn(
                  "h-5 w-5 rounded-full border border-border",
                  current.color === c && "ring-2 ring-primary ring-offset-1",
                )}
                style={{ background: c }}
                title={c}
              />
            ))}
            <Input
              type="color"
              value={
                current.color && current.color.startsWith("#")
                  ? current.color
                  : "#000000"
              }
              onChange={(e) => updateActive({ color: e.target.value })}
              className="h-7 w-8 cursor-pointer p-0.5"
              title="Cor personalizada"
            />
          </div>

          <div className="mx-0.5 h-6 w-px bg-border" />

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground"
            onClick={resetActive}
            title="Resetar este elemento"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={closeToolbar}
            title="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Walk up from the clicked node until we hit a "leaf-ish" element that
 * mostly contains text (no big block children). Falls back to the click
 * target itself.
 */
function pickEditable(target: HTMLElement, root: HTMLElement): HTMLElement | null {
  let el: HTMLElement | null = target;
  while (el && el !== root) {
    const tag = el.tagName.toLowerCase();
    if (
      ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "a", "li", "strong", "em", "label", "small", "button"].includes(
        tag,
      )
    ) {
      return el;
    }
    const text = (el.textContent ?? "").trim();
    const childBlocks = Array.from(el.children).filter((c) => {
      const t = (c as HTMLElement).tagName.toLowerCase();
      return ["div", "section", "article", "ul", "ol", "table"].includes(t);
    });
    if (text.length > 0 && childBlocks.length === 0) return el;
    el = el.parentElement;
  }
  return target;
}
