import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Image as ImageIcon, FileText, Film, Paperclip, Tag, MessageSquare } from "lucide-react";

export interface MessageShortcut {
  id: string;
  trigger: string;
  title: string;
  description: string | null;
  category: string;
  content: string | null;
  media_type: string | null;
  media_url: string | null;
  media_filename: string | null;
  media_mimetype: string | null;
  media_size_bytes: number | null;
  caption: string | null;
}

interface Props {
  query: string; // texto após "/"
  open: boolean;
  onSelect: (shortcut: MessageShortcut) => void;
  onClose: () => void;
}

const categoryColor: Record<string, string> = {
  pagamento: "bg-emerald-500/10 text-emerald-600",
  saudacao: "bg-blue-500/10 text-blue-600",
  viagem: "bg-purple-500/10 text-purple-600",
  info: "bg-amber-500/10 text-amber-600",
  "pos-venda": "bg-pink-500/10 text-pink-600",
  geral: "bg-muted text-muted-foreground",
};

function MediaIcon({ type }: { type: string | null }) {
  if (!type) return null;
  if (type === "image") return <ImageIcon className="h-3 w-3" />;
  if (type === "video") return <Film className="h-3 w-3" />;
  if (type === "document") return <FileText className="h-3 w-3" />;
  return <Paperclip className="h-3 w-3" />;
}

export function SlashCommandDropdown({ query, open, onSelect, onClose }: Props) {
  const [items, setItems] = useState<MessageShortcut[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch on query change
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const q = query.trim().toLowerCase();
    (async () => {
      let req = supabase
        .from("message_shortcuts")
        .select("id,trigger,title,description,category,content,media_type,media_url,media_filename,media_mimetype,media_size_bytes,caption")
        .eq("is_active", true)
        .order("usage_count", { ascending: false })
        .order("trigger", { ascending: true })
        .limit(8);
      if (q) req = req.ilike("trigger", `${q}%`);
      const { data } = await req;
      if (!cancelled) {
        setItems((data as MessageShortcut[]) || []);
        setHighlighted(0);
      }
    })();
    return () => { cancelled = true; };
  }, [query, open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlighted(h => Math.min(items.length - 1, h + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlighted(h => Math.max(0, h - 1));
      } else if (e.key === "Enter") {
        if (items[highlighted]) {
          e.preventDefault();
          e.stopPropagation();
          onSelect(items[highlighted]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Tab") {
        if (items[highlighted]) {
          e.preventDefault();
          onSelect(items[highlighted]);
        }
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [open, items, highlighted, onSelect, onClose]);

  if (!open) return null;

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 right-0 mb-2 z-50 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      <div className="px-3 py-2 border-b border-border bg-muted/40 flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
        <MessageSquare className="h-3 w-3" />
        Atalhos de mensagem
        <span className="ml-auto text-[10px]">↑↓ navegar · Enter selecionar · Esc fechar</span>
      </div>
      {items.length === 0 ? (
        <div className="p-4 text-center text-xs text-muted-foreground">
          Nenhum atalho encontrado.
          <div className="mt-1 text-[11px]">Crie em <span className="font-mono text-foreground">/operacao/atalhos</span></div>
        </div>
      ) : (
        <ul className="max-h-72 overflow-y-auto py-1">
          {items.map((s, idx) => {
            const preview = (s.content || s.caption || (s.media_type ? `[${s.media_type}] ${s.media_filename || ""}` : "")).replace(/\n/g, " ").slice(0, 80);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlighted(idx)}
                  onMouseDown={(e) => { e.preventDefault(); onSelect(s); }}
                  className={cn(
                    "w-full text-left px-3 py-2 flex items-start gap-3 transition-colors",
                    idx === highlighted ? "bg-accent" : "hover:bg-accent/40",
                  )}
                >
                  <span className={cn("shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1", categoryColor[s.category] || categoryColor.geral)}>
                    <Tag className="h-2.5 w-2.5" />
                    {s.category}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-primary font-semibold">/{s.trigger}</span>
                      <span className="text-sm font-medium truncate">{s.title}</span>
                      {s.media_type && (
                        <span className="ml-auto text-muted-foreground"><MediaIcon type={s.media_type} /></span>
                      )}
                    </div>
                    {preview && (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{preview}</p>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
