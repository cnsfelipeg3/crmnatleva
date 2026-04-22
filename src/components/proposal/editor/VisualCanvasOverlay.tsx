import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
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
  Copy as CopyIcon,
  EyeOff,
  Link2,
  Unlink,
  ArrowUpToLine,
  ArrowDownToLine,
  Square,
  BoxSelect,
  Move,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

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

const SHADOW_PRESETS = [
  { label: "Nenhuma", value: "none" },
  { label: "Sutil", value: "0 1px 2px hsl(0 0% 0% / 0.1)" },
  { label: "Pequena", value: "0 2px 6px hsl(0 0% 0% / 0.12)" },
  { label: "Média", value: "0 6px 16px hsl(0 0% 0% / 0.18)" },
  { label: "Grande", value: "0 12px 28px hsl(0 0% 0% / 0.22)" },
  { label: "Dramática", value: "0 24px 48px hsl(0 0% 0% / 0.32)" },
];

export interface OverrideStyle {
  fontFamily?: string;
  fontSize?: string;
  color?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  textAlign?: string;
  text?: string;
  // Layout
  width?: string;
  height?: string;
  position?: { x: number; y: number };
  padding?: string;
  margin?: string;
  background?: string;
  borderColor?: string;
  borderWidth?: string;
  borderRadius?: string;
  boxShadow?: string;
  zIndex?: number;
  hidden?: boolean;
}

export interface VisualOverridesGroup {
  id: string;
  members: string[];
  label?: string;
}

export interface VisualOverrides {
  styles: Record<string, OverrideStyle>;
  groups: VisualOverridesGroup[];
}

const EMPTY_OVERRIDES: VisualOverrides = { styles: {}, groups: [] };

interface VisualCanvasOverlayProps {
  /** Controlled value of visual overrides. */
  value?: VisualOverrides;
  /** Called whenever the user changes anything in the canvas. */
  onChange?: (next: VisualOverrides) => void;
  /** Whether edit mode is on. */
  enabled: boolean;
  children: ReactNode;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function normalize(value?: VisualOverrides): VisualOverrides {
  if (!value) return EMPTY_OVERRIDES;
  return {
    styles: value.styles ?? {},
    groups: value.groups ?? [],
  };
}

function applyStyle(el: HTMLElement, s: OverrideStyle | undefined) {
  if (!s) return;
  if (s.fontFamily !== undefined) el.style.fontFamily = s.fontFamily;
  if (s.fontSize) el.style.fontSize = `${s.fontSize}px`;
  if (s.color) el.style.color = s.color;
  if (s.fontWeight) el.style.fontWeight = s.fontWeight;
  if (s.fontStyle) el.style.fontStyle = s.fontStyle;
  if (s.textDecoration) el.style.textDecoration = s.textDecoration;
  if (s.textAlign) el.style.textAlign = s.textAlign;
  if (s.text !== undefined) el.textContent = s.text;
  if (s.width) el.style.width = s.width;
  if (s.height) el.style.height = s.height;
  if (s.padding) el.style.padding = s.padding;
  if (s.margin) el.style.margin = s.margin;
  if (s.background) el.style.background = s.background;
  if (s.borderColor) el.style.borderColor = s.borderColor;
  if (s.borderWidth) {
    el.style.borderWidth = s.borderWidth;
    el.style.borderStyle = "solid";
  }
  if (s.borderRadius) el.style.borderRadius = s.borderRadius;
  if (s.boxShadow) el.style.boxShadow = s.boxShadow;
  if (typeof s.zIndex === "number") {
    el.style.zIndex = String(s.zIndex);
    if (!el.style.position || el.style.position === "static") {
      el.style.position = "relative";
    }
  }
  if (s.position) {
    el.style.transform = `translate(${s.position.x}px, ${s.position.y}px)`;
    el.style.willChange = "transform";
  }
  if (s.hidden) el.style.display = "none";
}

function findBySignature(root: HTMLElement, sig: string): HTMLElement | null {
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
}

function buildSignature(el: HTMLElement, root: HTMLElement): string | null {
  if (!root.contains(el) || el === root) return null;
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
}

function pickEditable(target: HTMLElement, root: HTMLElement): HTMLElement | null {
  let el: HTMLElement | null = target;
  while (el && el !== root) {
    const tag = el.tagName.toLowerCase();
    if (
      [
        "h1", "h2", "h3", "h4", "h5", "h6",
        "p", "span", "a", "li", "strong", "em",
        "label", "small", "button", "img",
        "section", "article", "header", "footer",
        "div",
      ].includes(tag)
    ) {
      // For divs/sections, only return if they have meaningful content
      if (["div", "section", "article", "header", "footer"].includes(tag)) {
        const text = (el.textContent ?? "").trim();
        if (text.length === 0 && !el.querySelector("img")) {
          el = el.parentElement;
          continue;
        }
      }
      return el;
    }
    el = el.parentElement;
  }
  return target;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

const HANDLES = [
  ["nw", "nwse-resize", { top: -5, left: -5 }],
  ["n",  "ns-resize",   { top: -5, left: "calc(50% - 5px)" }],
  ["ne", "nesw-resize", { top: -5, right: -5 }],
  ["e",  "ew-resize",   { top: "calc(50% - 5px)", right: -5 }],
  ["se", "nwse-resize", { bottom: -5, right: -5 }],
  ["s",  "ns-resize",   { bottom: -5, left: "calc(50% - 5px)" }],
  ["sw", "nesw-resize", { bottom: -5, left: -5 }],
  ["w",  "ew-resize",   { top: "calc(50% - 5px)", left: -5 }],
] as const;

export default function VisualCanvasOverlay({
  value,
  onChange,
  enabled,
  children,
}: VisualCanvasOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const data = normalize(value);
  const styles = data.styles;
  const groups = data.groups;

  const [selection, setSelection] = useState<string[]>([]);
  const [frameRect, setFrameRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [toolbarPos, setToolbarPos] = useState<{ top: number; left: number } | null>(null);
  const [textEditingSig, setTextEditingSig] = useState<string | null>(null);
  const activeRef = useRef<HTMLElement | null>(null);

  const update = useCallback(
    (updater: (prev: VisualOverrides) => VisualOverrides) => {
      const next = updater(data);
      onChange?.(next);
    },
    [data, onChange],
  );

  const patchStyles = useCallback(
    (sigs: string[], patch: OverrideStyle | ((prev: OverrideStyle) => OverrideStyle)) => {
      update((prev) => {
        const nextStyles = { ...prev.styles };
        for (const sig of sigs) {
          const before = nextStyles[sig] ?? {};
          const after = typeof patch === "function" ? patch(before) : { ...before, ...patch };
          nextStyles[sig] = after;
        }
        return { ...prev, styles: nextStyles };
      });
    },
    [update],
  );

  const expandSelection = useCallback(
    (sigs: string[]): string[] => {
      const out = new Set<string>(sigs);
      for (const g of groups) {
        if (g.members.some((m) => out.has(m))) {
          g.members.forEach((m) => out.add(m));
        }
      }
      return Array.from(out);
    },
    [groups],
  );

  // Re-apply overrides on every render of children.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const raf = requestAnimationFrame(() => {
      Object.entries(styles).forEach(([sig, style]) => {
        const el = findBySignature(root, sig);
        if (el) applyStyle(el, style);
      });
    });
    return () => cancelAnimationFrame(raf);
  });

  // Update frame position whenever the active element/selection changes.
  const recomputeFrame = useCallback(() => {
    const root = containerRef.current;
    const sig = selection[0];
    if (!root || !sig) {
      setFrameRect(null);
      setToolbarPos(null);
      activeRef.current = null;
      return;
    }
    const el = findBySignature(root, sig);
    if (!el) {
      setFrameRect(null);
      setToolbarPos(null);
      activeRef.current = null;
      return;
    }
    activeRef.current = el;
    const rect = el.getBoundingClientRect();
    const containerRect = root.getBoundingClientRect();
    setFrameRect({
      top: rect.top - containerRect.top,
      left: rect.left - containerRect.left,
      width: rect.width,
      height: rect.height,
    });
    setToolbarPos({
      top: rect.top - containerRect.top - 88,
      left: Math.max(0, rect.left - containerRect.left),
    });
  }, [selection]);

  useEffect(() => {
    recomputeFrame();
    if (selection.length === 0) return;
    const onScroll = () => recomputeFrame();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [recomputeFrame, selection.length, styles]);

  // Click → select / multi-select
  useEffect(() => {
    const root = containerRef.current;
    if (!root || !enabled) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (!target || !root.contains(target)) return;
      // ignore clicks on toolbar/handles
      if (target.closest("[data-canvas-ui]")) return;

      const editable = pickEditable(target, root);
      if (!editable) return;
      const sig = buildSignature(editable, root);
      if (!sig) return;

      e.preventDefault();
      e.stopPropagation();

      if (e.shiftKey) {
        setSelection((prev) =>
          prev.includes(sig) ? prev.filter((s) => s !== sig) : [sig, ...prev],
        );
      } else {
        setSelection([sig]);
        setTextEditingSig(null);
      }
    };

    const onDblClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target || !root.contains(target)) return;
      if (target.closest("[data-canvas-ui]")) return;
      const editable = pickEditable(target, root);
      if (!editable) return;
      const sig = buildSignature(editable, root);
      if (!sig) return;
      e.preventDefault();
      e.stopPropagation();
      setSelection([sig]);
      setTextEditingSig(sig);
      editable.setAttribute("contenteditable", "true");
      editable.focus();
      const range = document.createRange();
      range.selectNodeContents(editable);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelection([]);
        setTextEditingSig(null);
        const el = activeRef.current;
        if (el) el.removeAttribute("contenteditable");
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g") {
        e.preventDefault();
        if (e.shiftKey) {
          // ungroup
          update((prev) => ({
            ...prev,
            groups: prev.groups.filter((g) => !g.members.some((m) => selection.includes(m))),
          }));
        } else if (selection.length > 1) {
          update((prev) => ({
            ...prev,
            groups: [
              ...prev.groups,
              { id: crypto.randomUUID(), members: [...selection] },
            ],
          }));
        }
      }
    };

    root.addEventListener("pointerdown", onPointerDown, true);
    root.addEventListener("dblclick", onDblClick, true);
    window.addEventListener("keydown", onKey);
    return () => {
      root.removeEventListener("pointerdown", onPointerDown, true);
      root.removeEventListener("dblclick", onDblClick, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [enabled, selection, update]);

  // Capture text edits
  useEffect(() => {
    if (!textEditingSig) return;
    const el = activeRef.current;
    if (!el) return;
    const onInput = () => {
      patchStyles([textEditingSig], { text: el.textContent ?? "" });
    };
    el.addEventListener("input", onInput);
    return () => el.removeEventListener("input", onInput);
  }, [textEditingSig, patchStyles]);

  // Cleanup on disable
  useEffect(() => {
    if (enabled) return;
    setSelection([]);
    setTextEditingSig(null);
    const el = activeRef.current;
    if (el) el.removeAttribute("contenteditable");
    activeRef.current = null;
  }, [enabled]);

  // ───── Drag (move) ─────
  const startDrag = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (textEditingSig) return;
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startY = e.clientY;
      const sigs = expandSelection(selection);
      const initials = new Map<string, { x: number; y: number }>();
      for (const sig of sigs) {
        const cur = styles[sig]?.position ?? { x: 0, y: 0 };
        initials.set(sig, cur);
      }

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        update((prev) => {
          const next = { ...prev.styles };
          for (const sig of sigs) {
            const init = initials.get(sig)!;
            next[sig] = { ...next[sig], position: { x: init.x + dx, y: init.y + dy } };
          }
          return { ...prev, styles: next };
        });
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [expandSelection, selection, styles, textEditingSig, update],
  );

  // ───── Resize ─────
  const startResize = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, dir: string) => {
      e.preventDefault();
      e.stopPropagation();
      const el = activeRef.current;
      if (!el) return;
      const startX = e.clientX;
      const startY = e.clientY;
      const rect = el.getBoundingClientRect();
      const startW = rect.width;
      const startH = rect.height;
      const sig = selection[0];

      const onMove = (ev: PointerEvent) => {
        let newW = startW;
        let newH = startH;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (dir.includes("e")) newW = startW + dx;
        if (dir.includes("w")) newW = startW - dx;
        if (dir.includes("s")) newH = startH + dy;
        if (dir.includes("n")) newH = startH - dy;
        if (ev.shiftKey) {
          // keep proportion based on the larger delta
          const ratio = startW / startH;
          if (Math.abs(newW - startW) > Math.abs(newH - startH)) newH = newW / ratio;
          else newW = newH * ratio;
        }
        newW = Math.max(24, newW);
        newH = Math.max(24, newH);
        patchStyles([sig], {
          width: `${Math.round(newW)}px`,
          height: `${Math.round(newH)}px`,
        });
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [patchStyles, selection],
  );

  // ───── Toolbar actions ─────
  const activeSig = selection[0];
  const current: OverrideStyle = activeSig ? styles[activeSig] ?? {} : {};
  const inGroupWith = useMemo(() => {
    if (!activeSig) return null;
    return groups.find((g) => g.members.includes(activeSig)) ?? null;
  }, [activeSig, groups]);

  const updateActive = useCallback(
    (patch: OverrideStyle) => {
      if (!activeSig) return;
      const sigs = expandSelection([activeSig]);
      patchStyles(sigs, patch);
    },
    [activeSig, expandSelection, patchStyles],
  );

  const resetActive = useCallback(() => {
    if (!activeSig) return;
    const sigs = expandSelection([activeSig]);
    update((prev) => {
      const next = { ...prev.styles };
      for (const sig of sigs) {
        const root = containerRef.current;
        if (root) {
          const el = findBySignature(root, sig);
          if (el) el.removeAttribute("style");
        }
        delete next[sig];
      }
      return { ...prev, styles: next };
    });
    setSelection([]);
  }, [activeSig, expandSelection, update]);

  const closeToolbar = useCallback(() => {
    setSelection([]);
    setTextEditingSig(null);
    const el = activeRef.current;
    if (el) el.removeAttribute("contenteditable");
  }, []);

  const duplicateActive = useCallback(() => {
    if (!activeSig) return;
    const root = containerRef.current;
    if (!root) return;
    const el = findBySignature(root, activeSig);
    if (!el) return;
    const clone = el.cloneNode(true) as HTMLElement;
    clone.style.transform = `translate(20px, 20px)`;
    clone.style.position = "relative";
    el.parentElement?.insertBefore(clone, el.nextSibling);
  }, [activeSig]);

  const hideActive = useCallback(() => {
    updateActive({ hidden: true });
    setSelection([]);
  }, [updateActive]);

  const bringForward = useCallback(() => {
    const z = (current.zIndex ?? 0) + 1;
    updateActive({ zIndex: z });
  }, [current.zIndex, updateActive]);

  const sendBackward = useCallback(() => {
    const z = (current.zIndex ?? 0) - 1;
    updateActive({ zIndex: z });
  }, [current.zIndex, updateActive]);

  const toggleGroup = useCallback(() => {
    if (!activeSig) return;
    if (inGroupWith) {
      update((prev) => ({
        ...prev,
        groups: prev.groups.filter((g) => g.id !== inGroupWith.id),
      }));
    } else if (selection.length > 1) {
      update((prev) => ({
        ...prev,
        groups: [...prev.groups, { id: crypto.randomUUID(), members: [...selection] }],
      }));
    }
  }, [activeSig, inGroupWith, selection, update]);

  // ───── Secondary frames for multi-selection ─────
  const extraRects = useMemo(() => {
    const root = containerRef.current;
    if (!root) return [];
    const sigs = expandSelection(selection).slice(1);
    return sigs
      .map((sig) => {
        const el = findBySignature(root, sig);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        const containerRect = root.getBoundingClientRect();
        return {
          sig,
          top: rect.top - containerRect.top,
          left: rect.left - containerRect.left,
          width: rect.width,
          height: rect.height,
        };
      })
      .filter(Boolean) as Array<{ sig: string; top: number; left: number; width: number; height: number }>;
  }, [expandSelection, selection, frameRect]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={cn(
          "relative",
          enabled &&
            "[&_*:hover]:outline [&_*:hover]:outline-1 [&_*:hover]:outline-primary/40 [&_*:hover]:outline-offset-2 [&_*:hover]:rounded-sm",
        )}
        data-canvas-root
      >
        {children}
      </div>

      {/* Selection frame for primary element */}
      {enabled && frameRect && (
        <div
          data-canvas-ui
          className="pointer-events-none absolute z-40"
          style={{
            top: frameRect.top,
            left: frameRect.left,
            width: frameRect.width,
            height: frameRect.height,
          }}
        >
          <div className="absolute inset-0 ring-2 ring-primary rounded-sm" />
          {/* Drag area (covers center, leaves handles clickable) */}
          {!textEditingSig && (
            <div
              data-canvas-ui
              onPointerDown={startDrag}
              className="pointer-events-auto absolute inset-2 cursor-grab active:cursor-grabbing"
              title="Arrastar"
            />
          )}
          {/* Resize handles */}
          {!textEditingSig &&
            HANDLES.map(([dir, cursor, pos]) => (
              <div
                key={dir}
                data-canvas-ui
                onPointerDown={(e) => startResize(e, dir)}
                className="pointer-events-auto absolute h-2.5 w-2.5 rounded-[2px] border border-background bg-primary shadow"
                style={{ ...(pos as CSSProperties), cursor }}
              />
            ))}
        </div>
      )}

      {/* Multi-selection frames */}
      {enabled &&
        extraRects.map((r) => (
          <div
            key={r.sig}
            data-canvas-ui
            className="pointer-events-none absolute z-30 ring-2 ring-primary/60 rounded-sm"
            style={{ top: r.top, left: r.left, width: r.width, height: r.height }}
          />
        ))}

      {/* Toolbar */}
      {enabled && activeSig && toolbarPos && (
        <div
          data-canvas-ui
          style={{ top: Math.max(4, toolbarPos.top), left: toolbarPos.left }}
          className="absolute z-50 flex max-w-[640px] flex-wrap items-center gap-1 rounded-lg border border-border bg-popover p-1.5 shadow-xl"
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

          {/* Size */}
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

          {/* B / I / U */}
          <Button
            type="button"
            size="icon"
            variant={current.fontWeight === "bold" ? "default" : "ghost"}
            className="h-8 w-8"
            onClick={() =>
              updateActive({ fontWeight: current.fontWeight === "bold" ? "normal" : "bold" })
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
              updateActive({ fontStyle: current.fontStyle === "italic" ? "normal" : "italic" })
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
                textDecoration: current.textDecoration === "underline" ? "none" : "underline",
              })
            }
            title="Sublinhado"
          >
            <Underline className="h-3.5 w-3.5" />
          </Button>

          <div className="mx-0.5 h-6 w-px bg-border" />

          {/* Align */}
          <Button
            type="button" size="icon"
            variant={current.textAlign === "left" ? "default" : "ghost"}
            className="h-8 w-8"
            onClick={() => updateActive({ textAlign: "left" })}
            title="Esquerda"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button" size="icon"
            variant={current.textAlign === "center" ? "default" : "ghost"}
            className="h-8 w-8"
            onClick={() => updateActive({ textAlign: "center" })}
            title="Centro"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button" size="icon"
            variant={current.textAlign === "right" ? "default" : "ghost"}
            className="h-8 w-8"
            onClick={() => updateActive({ textAlign: "right" })}
            title="Direita"
          >
            <AlignRight className="h-3.5 w-3.5" />
          </Button>

          <div className="mx-0.5 h-6 w-px bg-border" />

          {/* Colors */}
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" title="Cor do texto">
                <Palette className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="start">
              <Label className="text-xs">Cor do texto</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {COLOR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => updateActive({ color: c })}
                    className={cn(
                      "h-6 w-6 rounded-full border border-border",
                      current.color === c && "ring-2 ring-primary ring-offset-1",
                    )}
                    style={{ background: c }}
                    title={c}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  type="color"
                  value={current.color && current.color.startsWith("#") ? current.color : "#000000"}
                  onChange={(e) => updateActive({ color: e.target.value })}
                  className="h-8 w-12 cursor-pointer p-0.5"
                />
                <span className="text-xs text-muted-foreground">Custom</span>
              </div>
            </PopoverContent>
          </Popover>

          {/* Background */}
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" title="Fundo">
                <Square className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60" align="start">
              <Label className="text-xs">Cor de fundo</Label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {COLOR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => updateActive({ background: c })}
                    className={cn(
                      "h-6 w-6 rounded-full border border-border",
                      current.background === c && "ring-2 ring-primary ring-offset-1",
                    )}
                    style={{ background: c }}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => updateActive({ background: "transparent" })}
                  className="h-6 px-2 text-[10px] rounded-md border border-border"
                >
                  Nenhum
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  type="color"
                  onChange={(e) => updateActive({ background: e.target.value })}
                  className="h-8 w-12 cursor-pointer p-0.5"
                />
                <span className="text-xs text-muted-foreground">Custom</span>
              </div>
            </PopoverContent>
          </Popover>

          {/* Padding/Margin */}
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" title="Espaçamento">
                <BoxSelect className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="start">
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Padding (T R B L)</Label>
                  <Input
                    placeholder="ex: 8px 16px 8px 16px"
                    value={current.padding ?? ""}
                    onChange={(e) => updateActive({ padding: e.target.value })}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Margin</Label>
                  <Input
                    placeholder="ex: 16px"
                    value={current.margin ?? ""}
                    onChange={(e) => updateActive({ margin: e.target.value })}
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Border + radius */}
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" title="Borda & Raio">
                <Sparkles className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="start">
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Espessura</Label>
                    <Input
                      placeholder="1px"
                      value={current.borderWidth ?? ""}
                      onChange={(e) => updateActive({ borderWidth: e.target.value })}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Cor</Label>
                    <Input
                      type="color"
                      value={current.borderColor && current.borderColor.startsWith("#") ? current.borderColor : "#000000"}
                      onChange={(e) => updateActive({ borderColor: e.target.value })}
                      className="h-8 mt-1 p-0.5"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Raio</Label>
                  <Input
                    placeholder="ex: 12px"
                    value={current.borderRadius ?? ""}
                    onChange={(e) => updateActive({ borderRadius: e.target.value })}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Sombra</Label>
                  <select
                    value={current.boxShadow ?? ""}
                    onChange={(e) => updateActive({ boxShadow: e.target.value })}
                    className="mt-1 h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                  >
                    <option value="">— manter —</option>
                    {SHADOW_PRESETS.map((s) => (
                      <option key={s.label} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <div className="mx-0.5 h-6 w-px bg-border" />

          {/* Z-index */}
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8"
            onClick={bringForward} title="Trazer pra frente">
            <ArrowUpToLine className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8"
            onClick={sendBackward} title="Enviar pra trás">
            <ArrowDownToLine className="h-3.5 w-3.5" />
          </Button>

          <div className="mx-0.5 h-6 w-px bg-border" />

          {/* Group */}
          <Button
            type="button" size="icon"
            variant={inGroupWith ? "default" : "ghost"}
            className="h-8 w-8"
            onClick={toggleGroup}
            title={inGroupWith ? "Desagrupar" : "Agrupar (Ctrl+G)"}
            disabled={!inGroupWith && selection.length < 2}
          >
            {inGroupWith ? <Unlink className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
          </Button>

          {/* Duplicate */}
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8"
            onClick={duplicateActive} title="Duplicar">
            <CopyIcon className="h-3.5 w-3.5" />
          </Button>

          {/* Hide */}
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8"
            onClick={hideActive} title="Ocultar">
            <EyeOff className="h-3.5 w-3.5" />
          </Button>

          <div className="mx-0.5 h-6 w-px bg-border" />

          {/* Reset */}
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground"
            onClick={resetActive} title="Resetar este elemento">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          {/* Close */}
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8"
            onClick={closeToolbar} title="Fechar">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Backwards compat alias
export { VisualCanvasOverlay };
