import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Inbox as InboxIcon,
  Send,
  Star,
  Trash2,
  RefreshCw,
  Search,
  Reply,
  ReplyAll,
  Forward,
  PenSquare,
  Loader2,
  Mail,
  MailOpen,
  ArrowLeft,
  Archive,
  ShieldAlert,
  MoreVertical,
  Settings,
  Menu,
  AlertOctagon,
  Paperclip,
  X,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/use-mobile";
import DOMPurify from "dompurify";

// ---------- Types ----------
interface ThreadItem {
  id: string;
  snippet: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  internalDate: string;
  messageCount: number;
  labels: string[];
  unread: boolean;
  starred: boolean;
  participants: string[];
}

interface ThreadMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  cc: string;
  subject: string;
  date: string;
  text: string;
  html: string;
  snippet?: string;
  labelIds: string[];
}

interface FolderDef {
  key: string;
  label: string;
  q: string;
  icon: typeof InboxIcon;
  labelId?: string;
}

const FOLDERS: FolderDef[] = [
  { key: "inbox", label: "Caixa de entrada", q: "in:inbox -in:trash -in:spam", icon: InboxIcon, labelId: "INBOX" },
  { key: "unread", label: "Não lidas", q: "is:unread in:inbox", icon: Mail, labelId: "UNREAD" },
  { key: "starred", label: "Com estrela", q: "is:starred", icon: Star, labelId: "STARRED" },
  { key: "sent", label: "Enviadas", q: "in:sent", icon: Send, labelId: "SENT" },
  { key: "spam", label: "Spam", q: "in:spam", icon: AlertOctagon, labelId: "SPAM" },
  { key: "trash", label: "Lixeira", q: "in:trash", icon: Trash2, labelId: "TRASH" },
];

const SIGNATURE_KEY = "natleva.inbox.signature";
const SIGNATURE_V2_KEY = "natleva.inbox.signature.v2";

export interface SignatureData {
  name: string;
  role: string;
  phone: string;
  email: string;
  website: string;
  instagram: string;
  logoUrl: string;
  brandColor: string;
  tagline: string;
}

const DEFAULT_SIGNATURE: SignatureData = {
  name: "",
  role: "",
  phone: "",
  email: "",
  website: "natleva.com",
  instagram: "natleva",
  logoUrl: "https://adm.natleva.com/logo-natleva.png",
  brandColor: "#1f5132",
  tagline: "Experiências de viagem sob medida",
};

function escHtml(v: string): string {
  return (v || "").replace(/[<>"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function buildSignatureHtml(s: SignatureData): string {
  if (!s.name && !s.email && !s.phone && !s.instagram) return "";
  const color = s.brandColor || "#1f5132";
  const igHandle = (s.instagram || "").replace(/^@/, "").trim();
  const igUrl = igHandle ? `https://instagram.com/${encodeURIComponent(igHandle)}` : "";
  const siteUrl = s.website ? (s.website.startsWith("http") ? s.website : `https://${s.website}`) : "";
  const telHref = s.phone ? `tel:${s.phone.replace(/[^\d+]/g, "")}` : "";
  const waHref = s.phone ? `https://wa.me/${s.phone.replace(/[^\d]/g, "")}` : "";
  const linkStyle = `color:${color};text-decoration:none;font-weight:500`;
  const iconStyle = `display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;border-radius:50%;background:${color};color:#fff;font-size:11px;margin-right:6px;text-decoration:none;font-family:Arial,sans-serif;font-weight:700`;

  const rows: string[] = [];
  if (s.role) rows.push(`<div style="font-size:12px;color:#6b7280;margin-top:2px">${escHtml(s.role)}</div>`);
  const contactBits: string[] = [];
  if (s.phone) contactBits.push(`<a href="${telHref}" style="${linkStyle}">${escHtml(s.phone)}</a>`);
  if (s.email) contactBits.push(`<a href="mailto:${escHtml(s.email)}" style="${linkStyle}">${escHtml(s.email)}</a>`);
  if (siteUrl) contactBits.push(`<a href="${siteUrl}" style="${linkStyle}" target="_blank" rel="noopener">${escHtml(s.website)}</a>`);
  if (contactBits.length) rows.push(`<div style="font-size:13px;color:#374151;margin-top:6px;line-height:1.6">${contactBits.join(' &nbsp;·&nbsp; ')}</div>`);

  const socials: string[] = [];
  if (igUrl) socials.push(`<a href="${igUrl}" target="_blank" rel="noopener" style="${iconStyle}" title="Instagram">IG</a>`);
  if (waHref) socials.push(`<a href="${waHref}" target="_blank" rel="noopener" style="${iconStyle};background:#25D366" title="WhatsApp">WA</a>`);
  if (siteUrl) socials.push(`<a href="${siteUrl}" target="_blank" rel="noopener" style="${iconStyle}" title="Site">W</a>`);
  if (socials.length) rows.push(`<div style="margin-top:10px">${socials.join("")}</div>`);

  const logoCell = s.logoUrl
    ? `<td valign="top" style="padding-right:14px;border-right:3px solid ${color}"><img src="${escHtml(s.logoUrl)}" alt="${escHtml(s.name || 'Logo')}" width="64" height="64" style="display:block;width:64px;height:64px;object-fit:contain"/></td>`
    : "";

  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#111827;margin-top:18px;padding-top:14px;border-top:1px solid #e5e7eb"><table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse"><tr>${logoCell}<td valign="top" style="padding-left:${s.logoUrl ? '14px' : '0'}"><div style="font-size:15px;font-weight:700;color:${color};letter-spacing:.2px">${escHtml(s.name)}</div>${rows.join("")}${s.tagline ? `<div style="font-size:11px;color:#9ca3af;margin-top:8px;font-style:italic">${escHtml(s.tagline)}</div>` : ""}</td></tr></table></div>`;
}

function getSignatureData(): SignatureData {
  try {
    const v2 = localStorage.getItem(SIGNATURE_V2_KEY);
    if (v2) return { ...DEFAULT_SIGNATURE, ...JSON.parse(v2) };
    const legacy = localStorage.getItem(SIGNATURE_KEY) || "";
    if (legacy) {
      const lines = legacy.split("\n").map((l) => l.trim()).filter(Boolean);
      return { ...DEFAULT_SIGNATURE, name: lines[0] || "", role: lines[1] || "", email: lines.find((l) => /@/.test(l)) || "" };
    }
  } catch {}
  return { ...DEFAULT_SIGNATURE };
}

// ---------- Helpers ----------
function parseFromName(raw: string): { name: string; email: string } {
  if (!raw) return { name: "", email: "" };
  const m = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim() || m[2], email: m[2] };
  return { name: raw.trim(), email: raw.trim() };
}

function initials(name: string): string {
  const clean = name.replace(/[<>"]/g, "").trim();
  if (!clean) return "?";
  const parts = clean.split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || clean[0].toUpperCase();
}

// Stable hashed pastel for avatars (works in both themes via tokens for ring; background uses HSL)
function avatarHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 360;
}

function fmtDate(iso: string, internal?: string): string {
  let d: Date;
  if (internal && /^\d+$/.test(internal)) d = new Date(Number(internal));
  else if (iso) d = new Date(iso);
  else return "";
  if (isNaN(d.getTime())) return iso || "";
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const diffDays = (now.getTime() - d.getTime()) / 86400000;
  if (diffDays < 7) return d.toLocaleDateString("pt-BR", { weekday: "short" });
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

function fmtDateFull(iso: string, internal?: string): string {
  let d: Date;
  if (internal && /^\d+$/.test(internal)) d = new Date(Number(internal));
  else if (iso) d = new Date(iso);
  else return iso || "";
  if (isNaN(d.getTime())) return iso || "";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function callGmail(action: string, params: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke("gmail-api", {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message || "Erro ao chamar Gmail");
  if (!data?.ok) throw new Error(data?.error || "Falha na operação");
  return data.data;
}

function sanitizeEmailHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "button", "meta", "link"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "srcdoc"],
    ADD_ATTR: ["target", "rel"],
  });
}

function htmlToQuoted(html: string, text: string, from: string, date: string): string {
  const header = `Em ${fmtDateFull(date)}, ${from} escreveu:`;
  if (html) {
    return `<br/><br/><blockquote style="margin:0 0 0 .8ex;border-left:2px solid #ccc;padding-left:1ex;color:#555">
      <div style="font-size:12px;color:#777;margin-bottom:8px">${header}</div>
      ${html}
    </blockquote>`;
  }
  const quoted = (text || "")
    .split("\n")
    .map((l) => `> ${l}`)
    .join("\n");
  return `\n\n${header}\n${quoted}`;
}

// ---------- Avatar ----------
function Avatar({ name, email, size = 36 }: { name: string; email: string; size?: number }) {
  const seed = email || name || "?";
  const hue = avatarHue(seed);
  return (
    <div
      className="shrink-0 rounded-full flex items-center justify-center font-semibold text-white select-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 70% 45%))`,
      }}
      aria-hidden
    >
      {initials(name || email)}
    </div>
  );
}

// ---------- Main ----------
export default function Inbox() {
  const isMobile = useIsMobile();
  const [folder, setFolder] = useState<string>("inbox");
  const [search, setSearch] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [thread, setThread] = useState<{ id: string; messages: ThreadMessage[] } | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [profileEmail, setProfileEmail] = useState<string>("");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [composeState, setComposeState] = useState<ComposeState | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [foldersOpen, setFoldersOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const currentFolder = FOLDERS.find((f) => f.key === folder)!;
  const currentQuery = useMemo(() => {
    const base = currentFolder.q;
    return searchQ ? `${searchQ} ${base}` : base;
  }, [currentFolder, searchQ]);

  // ---- API loaders ----
  const loadProfile = useCallback(async () => {
    try {
      const p = await callGmail("profile");
      setProfileEmail(p.emailAddress || "");
    } catch (e: any) {
      toast.error("Não foi possível conectar ao Gmail", { description: e.message });
    }
  }, []);

  const loadCounts = useCallback(async () => {
    try {
      const r = await callGmail("counts");
      const map: Record<string, number> = {};
      (r.labels || []).forEach((l: any) => (map[l.id] = l.unread || 0));
      setCounts(map);
    } catch {
      // silent
    }
  }, []);

  const loadThreads = useCallback(
    async (silent = false) => {
      if (!silent) setLoadingThreads(true);
      try {
        const r = await callGmail("list_threads", { q: currentQuery, maxResults: 30 });
        setThreads(r.threads || []);
        setNextPageToken(r.nextPageToken || null);
      } catch (e: any) {
        if (!silent) toast.error("Erro ao carregar emails", { description: e.message });
      } finally {
        if (!silent) setLoadingThreads(false);
      }
    },
    [currentQuery]
  );

  const loadMore = useCallback(async () => {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await callGmail("list_threads", {
        q: currentQuery,
        maxResults: 30,
        pageToken: nextPageToken,
      });
      setThreads((prev) => [...prev, ...(r.threads || [])]);
      setNextPageToken(r.nextPageToken || null);
    } catch (e: any) {
      toast.error("Erro ao carregar mais", { description: e.message });
    } finally {
      setLoadingMore(false);
    }
  }, [nextPageToken, loadingMore, currentQuery]);

  const loadThread = useCallback(
    async (id: string) => {
      setLoadingThread(true);
      try {
        const r = await callGmail("get_thread", { threadId: id });
        setThread(r);
        const anyUnread = (r.messages || []).some((m: ThreadMessage) =>
          (m.labelIds || []).includes("UNREAD")
        );
        if (anyUnread) {
          callGmail("mark_read", { threadId: id })
            .then(() => {
              setThreads((prev) =>
                prev.map((t) =>
                  t.id === id ? { ...t, unread: false, labels: t.labels.filter((l) => l !== "UNREAD") } : t
                )
              );
              loadCounts();
            })
            .catch(() => {});
        }
      } catch (e: any) {
        toast.error("Erro ao abrir conversa", { description: e.message });
      } finally {
        setLoadingThread(false);
      }
    },
    [loadCounts]
  );

  useEffect(() => {
    loadProfile();
    loadCounts();
  }, [loadProfile, loadCounts]);

  useEffect(() => {
    loadThreads();
    setSelectedIds(new Set());
  }, [loadThreads, refreshTick]);

  useEffect(() => {
    const id = setInterval(() => {
      loadThreads(true);
      loadCounts();
    }, 30000);
    return () => clearInterval(id);
  }, [loadThreads, loadCounts]);

  useEffect(() => {
    if (selectedId) loadThread(selectedId);
    else setThread(null);
  }, [selectedId, loadThread]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === "c") {
        e.preventDefault();
        setComposeState({ mode: "new" });
      } else if (e.key === "/") {
        e.preventDefault();
        document.getElementById("inbox-search")?.focus();
      } else if (e.key === "Escape" && selectedId) {
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  // ---- Actions ----
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQ(search.trim());
    setSelectedId(null);
  };

  const updateThreadLocal = (id: string, patch: Partial<ThreadItem>) => {
    setThreads((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const removeThreadLocal = (id: string) => {
    setThreads((prev) => prev.filter((x) => x.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleStar = async (t: ThreadItem) => {
    const next = !t.starred;
    updateThreadLocal(t.id, { starred: next });
    try {
      await callGmail("star", { threadId: t.id, starred: next });
    } catch (e: any) {
      toast.error("Não foi possível atualizar", { description: e.message });
      updateThreadLocal(t.id, { starred: !next });
    }
  };

  const handleTrash = async (id: string) => {
    removeThreadLocal(id);
    try {
      await callGmail("trash", { threadId: id });
      toast.success("Movido pra lixeira");
      loadCounts();
    } catch (e: any) {
      toast.error("Erro ao excluir", { description: e.message });
      loadThreads();
    }
  };

  const handleArchive = async (id: string) => {
    removeThreadLocal(id);
    try {
      await callGmail("archive", { threadId: id });
      toast.success("Arquivado");
      loadCounts();
    } catch (e: any) {
      toast.error("Erro ao arquivar", { description: e.message });
      loadThreads();
    }
  };

  const handleSpam = async (id: string) => {
    removeThreadLocal(id);
    try {
      await callGmail("mark_spam", { threadId: id });
      toast.success("Marcado como spam");
      loadCounts();
    } catch (e: any) {
      toast.error("Erro ao marcar spam", { description: e.message });
      loadThreads();
    }
  };

  const handleUnspam = async (id: string) => {
    removeThreadLocal(id);
    try {
      await callGmail("unmark_spam", { threadId: id });
      toast.success("Não é spam");
      loadCounts();
    } catch (e: any) {
      toast.error("Erro", { description: e.message });
      loadThreads();
    }
  };

  const handleMarkUnread = async (id: string) => {
    updateThreadLocal(id, { unread: true });
    try {
      await callGmail("mark_unread", { threadId: id });
      setSelectedId(null);
      loadCounts();
    } catch (e: any) {
      toast.error("Erro", { description: e.message });
    }
  };

  // Quick reply/forward from list row — fetches the thread then opens compose
  const quickReplyFromList = async (threadId: string, mode: "reply" | "forward") => {
    try {
      const r = await callGmail("get_thread", { threadId });
      const messages: ThreadMessage[] = r?.messages || [];
      const last = messages[messages.length - 1];
      if (!last) return;
      const { email: fromEmail, name: fromName } = parseFromName(last.from);
      if (mode === "reply") {
        setComposeState({
          mode: "reply",
          threadId,
          to: fromEmail,
          subject: last.subject?.toLowerCase().startsWith("re:") ? last.subject : `Re: ${last.subject || ""}`,
          quoted: htmlToQuoted(last.html, last.text, fromName || fromEmail, last.date),
        });
      } else {
        setComposeState({
          mode: "new",
          subject: last.subject?.toLowerCase().startsWith("fwd:") ? last.subject : `Fwd: ${last.subject || ""}`,
          quoted: htmlToQuoted(last.html, last.text, fromName || fromEmail, last.date),
        });
      }
    } catch (e: any) {
      toast.error("Não foi possível abrir", { description: e.message });
    }
  };

  // Bulk ops
  const bulkApply = async (
    op: "archive" | "trash" | "spam" | "read" | "unread"
  ) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const optimisticRemove = op === "archive" || op === "trash" || op === "spam";
    if (optimisticRemove) setThreads((prev) => prev.filter((t) => !selectedIds.has(t.id)));
    setSelectedIds(new Set());
    try {
      if (op === "trash") await callGmail("bulk_trash", { threadIds: ids });
      else if (op === "archive")
        await callGmail("bulk_modify", { threadIds: ids, removeLabelIds: ["INBOX"] });
      else if (op === "spam")
        await callGmail("bulk_modify", { threadIds: ids, addLabelIds: ["SPAM"], removeLabelIds: ["INBOX"] });
      else if (op === "read") {
        await callGmail("bulk_modify", { threadIds: ids, removeLabelIds: ["UNREAD"] });
        setThreads((prev) => prev.map((t) => (ids.includes(t.id) ? { ...t, unread: false } : t)));
      } else if (op === "unread") {
        await callGmail("bulk_modify", { threadIds: ids, addLabelIds: ["UNREAD"] });
        setThreads((prev) => prev.map((t) => (ids.includes(t.id) ? { ...t, unread: true } : t)));
      }
      loadCounts();
      toast.success(`${ids.length} conversa(s) atualizada(s)`);
    } catch (e: any) {
      toast.error("Falha na operação em lote", { description: e.message });
      loadThreads();
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === threads.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(threads.map((t) => t.id)));
  };

  // ---------- Render ----------
  const FoldersNav = (
    <nav className="space-y-1 p-2">
      <Button
        className="mb-2 w-full justify-start gap-2"
        onClick={() => {
          setComposeState({ mode: "new" });
          setFoldersOpen(false);
        }}
      >
        <PenSquare className="h-4 w-4" />
        Novo email
      </Button>
      {FOLDERS.map((f) => {
        const Icon = f.icon;
        const unread = f.labelId ? counts[f.labelId] || 0 : 0;
        const active = folder === f.key;
        return (
          <button
            key={f.key}
            onClick={() => {
              setFolder(f.key);
              setSelectedId(null);
              setSelectedIds(new Set());
              setFoldersOpen(false);
            }}
            className={cn(
              "flex w-full items-center gap-3 rounded-full px-4 py-2 text-sm transition-colors",
              active ? "bg-primary/15 text-primary font-medium" : "hover:bg-accent text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left truncate">{f.label}</span>
            {unread > 0 && f.key !== "sent" && f.key !== "trash" && (
              <span className={cn("text-xs font-semibold", active ? "text-primary" : "text-muted-foreground")}>
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>
        );
      })}
      <DropdownMenuSeparator className="my-2" />
      <button
        onClick={() => {
          setSettingsOpen(true);
          setFoldersOpen(false);
        }}
        className="flex w-full items-center gap-3 rounded-full px-4 py-2 text-sm hover:bg-accent"
      >
        <Settings className="h-4 w-4" />
        Configurações
      </button>
    </nav>
  );

  return (
    <TooltipProvider delayDuration={400}>
      <div className="flex h-[calc(100dvh-4rem)] flex-col bg-background overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-2 border-b px-3 py-2 sm:px-4 sm:py-3 shrink-0">
          <Sheet open={foldersOpen} onOpenChange={setFoldersOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="px-4 py-3 border-b flex items-center gap-2">
                <InboxIcon className="h-5 w-5 text-primary" />
                <span className="font-semibold">Caixa de entrada</span>
              </div>
              {FoldersNav}
            </SheetContent>
          </Sheet>

          <div className="hidden sm:flex items-center gap-2">
            <InboxIcon className="h-5 w-5 text-primary" />
            <h1 className="text-base sm:text-lg font-semibold">Caixa de entrada</h1>
          </div>

          <form onSubmit={handleSearch} className="ml-auto flex flex-1 min-w-0 max-w-2xl items-center gap-2">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="inbox-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar emails"
                className="pl-9 rounded-full bg-muted/40 border-transparent focus-visible:bg-background"
              />
              {searchQ && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSearchQ("");
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Limpar busca"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setRefreshTick((t) => t + 1);
                  loadCounts();
                }}
                disabled={loadingThreads}
              >
                <RefreshCw className={cn("h-4 w-4", loadingThreads && "animate-spin")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Atualizar</TooltipContent>
          </Tooltip>

          {profileEmail && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-semibold cursor-default">
                  {initials(profileEmail)}
                </div>
              </TooltipTrigger>
              <TooltipContent>{profileEmail}</TooltipContent>
            </Tooltip>
          )}
        </header>

        {(() => {
          const foldersNode = (
            <aside className="flex h-full w-full border-r flex-col overflow-y-auto bg-background">
              {FoldersNav}
            </aside>
          );

          const threadsListNode = (
            <section className="flex h-full w-full flex-col border-r min-w-0 bg-background">
              {/* List toolbar */}
              <div className="flex items-center gap-1 border-b px-2 py-2 sm:px-3 shrink-0">
                <Checkbox
                  checked={threads.length > 0 && selectedIds.size === threads.length}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Selecionar todas"
                  className="mx-2"
                />
                {selectedIds.size > 0 ? (
                  <>
                    <span className="text-xs text-muted-foreground mr-2">{selectedIds.size} selecionado(s)</span>
                    {folder !== "trash" && folder !== "sent" && folder !== "spam" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => bulkApply("archive")}>
                            <Archive className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Arquivar</TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => bulkApply("trash")}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Lixeira</TooltipContent>
                    </Tooltip>
                    {folder !== "spam" && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => bulkApply("spam")}>
                            <ShieldAlert className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Marcar como spam</TooltipContent>
                      </Tooltip>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => bulkApply("read")}>
                          <MailOpen className="mr-2 h-4 w-4" /> Marcar como lida
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => bulkApply("unread")}>
                          <Mail className="mr-2 h-4 w-4" /> Marcar como não lida
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground ml-1 truncate">
                    {currentFolder.label}
                    {searchQ && ` · "${searchQ}"`}
                  </span>
                )}
              </div>

              {/* List body */}
              <div className="flex-1 overflow-y-auto">
                {loadingThreads && threads.length === 0 ? (
                  <div className="flex items-center justify-center p-8 text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
                  </div>
                ) : threads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center text-sm text-muted-foreground">
                    <InboxIcon className="mb-3 h-10 w-10 opacity-30" />
                    <p>Nenhum email por aqui</p>
                  </div>
                ) : (
                  <ul className="divide-y">
                    {threads.map((t) => {
                      const { name, email } = parseFromName(t.from);
                      const isSelected = selectedIds.has(t.id);
                      const isOpen = selectedId === t.id;
                      return (
                        <li key={t.id} className="group relative">
                          <div
                            className={cn(
                              "flex gap-2 px-2 py-2 sm:px-3 transition-colors cursor-pointer",
                              "hover:bg-accent/60 md:group-hover:pr-[120px]",
                              isOpen && "bg-accent",
                              t.unread && !isOpen && "bg-primary/[0.04]"
                            )}
                            onClick={() => setSelectedId(t.id)}
                          >
                            <div className="flex flex-col items-center gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(v) => {
                                  setSelectedIds((prev) => {
                                    const next = new Set(prev);
                                    if (v) next.add(t.id);
                                    else next.delete(t.id);
                                    return next;
                                  });
                                }}
                                aria-label="Selecionar"
                              />
                              <button
                                onClick={() => handleStar(t)}
                                className="text-muted-foreground hover:text-yellow-500 transition-colors"
                                aria-label={t.starred ? "Remover estrela" : "Adicionar estrela"}
                              >
                                <Star className={cn("h-4 w-4", t.starred && "fill-yellow-400 text-yellow-400")} />
                              </button>
                            </div>

                            <Avatar name={name} email={email} size={36} />

                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline gap-2">
                                <span
                                  className={cn(
                                    "truncate text-sm flex-1 min-w-0",
                                    t.unread ? "font-semibold text-foreground" : "text-foreground/90"
                                  )}
                                >
                                  {name || email}
                                  {t.messageCount > 1 && (
                                    <span className="ml-1 text-xs text-muted-foreground">({t.messageCount})</span>
                                  )}
                                </span>
                                <span
                                  className={cn(
                                    "shrink-0 text-xs",
                                    t.unread ? "text-foreground font-medium" : "text-muted-foreground"
                                  )}
                                >
                                  {fmtDate(t.date, t.internalDate)}
                                </span>
                              </div>
                              <div
                                className={cn(
                                  "truncate text-sm mt-0.5",
                                  t.unread ? "text-foreground font-medium" : "text-muted-foreground"
                                )}
                              >
                                {t.subject || "(sem assunto)"}
                              </div>
                              <div className="truncate text-xs text-muted-foreground/80 mt-0.5">{t.snippet}</div>
                            </div>
                          </div>

                          {/* Hover actions (desktop) */}
                          <div
                            className={cn(
                              "hidden md:flex absolute right-2 top-1 bottom-1 items-center gap-0.5 px-1.5 rounded-md border shadow-sm",
                              "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto",
                              isOpen ? "bg-accent" : "bg-background"
                            )}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {folder !== "trash" && folder !== "spam" && (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => quickReplyFromList(t.id, "reply")}>
                                      <Reply className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Responder</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => quickReplyFromList(t.id, "forward")}>
                                      <Forward className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Encaminhar</TooltipContent>
                                </Tooltip>
                              </>
                            )}
                            {folder !== "trash" && folder !== "sent" && folder !== "spam" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleArchive(t.id)}>
                                    <Archive className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Arquivar</TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleTrash(t.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Lixeira</TooltipContent>
                            </Tooltip>
                            {folder !== "spam" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSpam(t.id)}>
                                    <ShieldAlert className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Spam</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </li>
                      );
                    })}
                    {nextPageToken && (
                      <li className="p-3 text-center">
                        <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
                          {loadingMore && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                          Carregar mais
                        </Button>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            </section>
          );

          const readingPaneNode = (
            <section className="flex h-full w-full flex-col min-w-0 bg-background">
              {!selectedId ? (
                <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground p-8 text-center">
                  <MailOpen className="mb-3 h-14 w-14 opacity-30" />
                  <p className="text-sm">Selecione um email pra visualizar</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Atalhos: c novo · / buscar · Esc voltar</p>
                </div>
              ) : loadingThread || !thread ? (
                <div className="flex flex-1 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ThreadView
                  thread={thread}
                  folder={folder}
                  profileEmail={profileEmail}
                  starred={threads.find((x) => x.id === thread.id)?.starred || false}
                  onBack={() => setSelectedId(null)}
                  onReply={(mode) => {
                    const last = thread.messages[thread.messages.length - 1];
                    const { email: fromEmail, name: fromName } = parseFromName(last.from);
                    if (mode === "reply") {
                      setComposeState({
                        mode: "reply",
                        threadId: thread.id,
                        to: fromEmail,
                        subject: last.subject.toLowerCase().startsWith("re:") ? last.subject : `Re: ${last.subject}`,
                        quoted: htmlToQuoted(last.html, last.text, fromName || fromEmail, last.date),
                      });
                    } else if (mode === "replyAll") {
                      const toList = [fromEmail, ...(last.to ? last.to.split(",") : [])]
                        .map((s) => s.trim())
                        .filter((s) => s && !s.includes(profileEmail));
                      setComposeState({
                        mode: "reply",
                        threadId: thread.id,
                        to: Array.from(new Set(toList)).join(", "),
                        cc: last.cc || "",
                        subject: last.subject.toLowerCase().startsWith("re:") ? last.subject : `Re: ${last.subject}`,
                        quoted: htmlToQuoted(last.html, last.text, fromName || fromEmail, last.date),
                      });
                    } else {
                      setComposeState({
                        mode: "new",
                        subject: last.subject.toLowerCase().startsWith("fwd:") ? last.subject : `Fwd: ${last.subject}`,
                        quoted: htmlToQuoted(last.html, last.text, fromName || fromEmail, last.date),
                      });
                    }
                  }}
                  onTrash={() => handleTrash(thread.id)}
                  onArchive={() => handleArchive(thread.id)}
                  onSpam={() => handleSpam(thread.id)}
                  onUnspam={() => handleUnspam(thread.id)}
                  onMarkUnread={() => handleMarkUnread(thread.id)}
                  onStar={() => {
                    const t = threads.find((x) => x.id === thread.id);
                    if (t) handleStar(t);
                  }}
                />
              )}
            </section>
          );

          if (isMobile) {
            return (
              <div className="flex flex-1 min-h-0 overflow-hidden">
                <div className={cn("flex w-full min-w-0", selectedId ? "hidden" : "flex")}>
                  {threadsListNode}
                </div>
                <div className={cn("flex w-full min-w-0", selectedId ? "flex" : "hidden")}>
                  {readingPaneNode}
                </div>
              </div>
            );
          }

          return (
            <ResizablePanelGroup
              direction="horizontal"
              autoSaveId="inbox-layout-v1"
              className="flex flex-1 min-h-0 overflow-hidden"
            >
              <ResizablePanel defaultSize={16} minSize={11} maxSize={28} collapsible collapsedSize={4}>
                {foldersNode}
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={28} minSize={18} maxSize={50}>
                {threadsListNode}
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={56} minSize={30}>
                {readingPaneNode}
              </ResizablePanel>
            </ResizablePanelGroup>
          );
        })()}

        {composeState && (
          <ComposeDialog
            state={composeState}
            profileEmail={profileEmail}
            onOpenChange={(open) => !open && setComposeState(null)}
            onSent={() => {
              setComposeState(null);
              if (selectedId) loadThread(selectedId);
              setRefreshTick((t) => t + 1);
              loadCounts();
            }}
          />
        )}

        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} profileEmail={profileEmail} />
      </div>
    </TooltipProvider>
  );
}

// ---------- Thread view ----------
function ThreadView({
  thread,
  folder,
  profileEmail,
  starred,
  onBack,
  onReply,
  onTrash,
  onArchive,
  onSpam,
  onUnspam,
  onMarkUnread,
  onStar,
}: {
  thread: { id: string; messages: ThreadMessage[] };
  folder: string;
  profileEmail: string;
  starred: boolean;
  onBack: () => void;
  onReply: (mode: "reply" | "replyAll" | "forward") => void;
  onTrash: () => void;
  onArchive: () => void;
  onSpam: () => void;
  onUnspam: () => void;
  onMarkUnread: () => void;
  onStar: () => void;
}) {
  const subject = thread.messages[0]?.subject || "(sem assunto)";
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set([thread.messages[thread.messages.length - 1]?.id].filter(Boolean))
  );

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col min-h-0">
      {/* Reader toolbar */}
      <div className="flex items-center gap-1 border-b px-2 py-2 sm:px-3 shrink-0">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack} aria-label="Voltar">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {folder !== "trash" && folder !== "sent" && folder !== "spam" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onArchive}>
                <Archive className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Arquivar</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onTrash}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Lixeira</TooltipContent>
        </Tooltip>
        {folder === "spam" ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onUnspam}>
                <ShieldAlert className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Não é spam</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onSpam}>
                <ShieldAlert className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Spam</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onMarkUnread}>
              <Mail className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Marcar não lida</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onStar}>
              <Star className={cn("h-4 w-4", starred && "fill-yellow-400 text-yellow-400")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Estrela</TooltipContent>
        </Tooltip>
        <div className="ml-auto" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onReply("forward")}>
              <Forward className="mr-2 h-4 w-4" /> Encaminhar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onReply("replyAll")}>
              <ReplyAll className="mr-2 h-4 w-4" /> Responder a todos
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Subject header */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <h2 className="text-lg sm:text-xl font-semibold break-words">{subject}</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-4 pb-32">
        <div className="space-y-3 max-w-4xl mx-auto">
          {thread.messages.map((m, idx) => {
            const { name, email } = parseFromName(m.from);
            const isLast = idx === thread.messages.length - 1;
            const isExpanded = expanded.has(m.id) || isLast;
            return (
              <article
                key={m.id}
                className="rounded-xl border bg-card shadow-sm overflow-hidden"
              >
                <header
                  className="flex items-start gap-3 p-3 sm:p-4 cursor-pointer"
                  onClick={() => !isLast && toggleExpand(m.id)}
                >
                  <Avatar name={name} email={email} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-semibold text-foreground">{name || email}</span>
                      <span className="text-xs text-muted-foreground truncate">&lt;{email}&gt;</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      Para: {m.to}
                      {m.cc && ` · Cc: ${m.cc}`}
                    </div>
                    {!isExpanded && (
                      <div className="text-xs text-muted-foreground truncate mt-1 italic">{m.snippet}</div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                    {fmtDateFull(m.date)}
                  </div>
                </header>
                {isExpanded && (
                  <div className="px-3 sm:px-4 pb-4 border-t pt-3">
                    {m.html ? (
                      <EmailHtmlFrame html={m.html} />
                    ) : (
                      <pre className="whitespace-pre-wrap break-words font-sans text-sm text-foreground leading-relaxed">
                        {m.text || m.snippet || ""}
                      </pre>
                    )}
                  </div>
                )}
              </article>
            );
          })}

          {/* Reply quick actions */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" onClick={() => onReply("reply")} className="rounded-full">
              <Reply className="mr-2 h-4 w-4" /> Responder
            </Button>
            <Button variant="outline" onClick={() => onReply("replyAll")} className="rounded-full">
              <ReplyAll className="mr-2 h-4 w-4" /> Responder a todos
            </Button>
            <Button variant="outline" onClick={() => onReply("forward")} className="rounded-full">
              <Forward className="mr-2 h-4 w-4" /> Encaminhar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Sandbox iframe for HTML emails ----------
function EmailHtmlFrame({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(200);

  useEffect(() => {
    const clean = sanitizeEmailHtml(html);
    const doc = `<!doctype html><html><head><meta charset="utf-8"><base target="_blank">
      <style>
        html,body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;line-height:1.6;color:#111;word-wrap:break-word;overflow-wrap:break-word}
        a{color:#2563eb;text-decoration:underline}
        img{max-width:100%;height:auto;border-radius:6px}
        blockquote{border-left:3px solid #e5e7eb;margin:8px 0;padding:4px 12px;color:#555}
        table{max-width:100%}
        pre{white-space:pre-wrap;word-wrap:break-word}
        @media (prefers-color-scheme: dark){
          html,body{color:#e5e7eb;background:transparent}
          a{color:#60a5fa}
          blockquote{border-color:#374151;color:#9ca3af}
        }
      </style>
    </head><body>${clean}</body></html>`;
    const frame = ref.current;
    if (!frame) return;
    frame.srcdoc = doc;
    const onLoad = () => {
      try {
        const body = frame.contentDocument?.body;
        if (body) {
          body.querySelectorAll("a").forEach((a) => {
            a.setAttribute("target", "_blank");
            a.setAttribute("rel", "noopener noreferrer");
          });
          body.querySelectorAll("img").forEach((img) => {
            img.setAttribute("referrerpolicy", "no-referrer");
            img.setAttribute("loading", "lazy");
            // Hide broken images on error
            img.addEventListener("error", () => {
              (img as HTMLImageElement).style.display = "none";
            });
          });
          // Recompute height after images load
          const resize = () => {
            const h = Math.min(body.scrollHeight + 16, 6000);
            setHeight(h);
          };
          resize();
          frame.contentWindow?.addEventListener("load", resize);
          body.querySelectorAll("img").forEach((img) => img.addEventListener("load", resize));
        }
      } catch {}
    };
    frame.addEventListener("load", onLoad);
    return () => frame.removeEventListener("load", onLoad);
  }, [html]);

  return (
    <iframe
      ref={ref}
      sandbox="allow-popups allow-popups-to-escape-sandbox"
      className="w-full bg-transparent"
      style={{ height, border: 0 }}
      title="Email content"
    />
  );
}

// ---------- Compose dialog ----------
interface ComposeState {
  mode: "new" | "reply";
  threadId?: string;
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  quoted?: string;
}

function getSignature(): string {
  // Legacy helper kept for backward compat; returns rich HTML built from structured data.
  return buildSignatureHtml(getSignatureData());
}

function ComposeDialog({
  state,
  profileEmail,
  onOpenChange,
  onSent,
}: {
  state: ComposeState;
  profileEmail: string;
  onOpenChange: (v: boolean) => void;
  onSent: () => void;
}) {
  const READ_RECEIPT_PREF_KEY = "natleva.mail.readReceiptDefault";
  const [to, setTo] = useState(state.to || "");
  const [cc, setCc] = useState(state.cc || "");
  const [bcc, setBcc] = useState(state.bcc || "");
  const [showCc, setShowCc] = useState(!!state.cc);
  const [showBcc, setShowBcc] = useState(!!state.bcc);
  const [subject, setSubject] = useState(state.subject || "");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [readReceipt, setReadReceipt] = useState<boolean>(() => {
    try { return localStorage.getItem(READ_RECEIPT_PREF_KEY) === "1"; } catch { return false; }
  });
  const signatureData = getSignatureData();
  const signatureHtml = buildSignatureHtml(signatureData);

  useEffect(() => {
    try { localStorage.setItem(READ_RECEIPT_PREF_KEY, readReceipt ? "1" : "0"); } catch {}
  }, [readReceipt]);

  const send = async () => {
    if (!to.trim()) return toast.error("Informe o destinatário");
    setSending(true);
    try {
      const htmlBody = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111827;line-height:1.6">${body.replace(/\n/g, "<br/>")}</div>${signatureHtml}${state.quoted || ""}`;
      const receiptPayload = readReceipt && profileEmail
        ? { readReceipt: true, readReceiptTo: profileEmail }
        : {};
      if (state.mode === "reply" && state.threadId) {
        await callGmail("reply", {
          threadId: state.threadId,
          to,
          cc: cc || undefined,
          bcc: bcc || undefined,
          body: htmlBody,
          html: true,
          ...receiptPayload,
        });
      } else {
        await callGmail("send", {
          to,
          cc: cc || undefined,
          bcc: bcc || undefined,
          subject,
          body: htmlBody,
          html: true,
          ...receiptPayload,
        });
      }
      toast.success("Email enviado", {
        description: readReceipt ? "Confirmação de leitura solicitada" : undefined,
      });
      onSent();
    } catch (e: any) {
      toast.error("Erro ao enviar", { description: e.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 h-[90dvh] sm:h-auto sm:max-h-[85dvh] flex flex-col">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="text-base">
            {state.mode === "reply" ? "Responder" : "Nova mensagem"}
          </DialogTitle>
          <DialogDescription className="sr-only">Compositor de email</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
          <div className="flex items-center gap-2 border-b pb-2">
            <label className="text-xs text-muted-foreground w-12 shrink-0">Para</label>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="email@destinatario.com"
              className="border-0 shadow-none focus-visible:ring-0 px-0 h-8"
              autoFocus={state.mode !== "reply"}
            />
            <div className="flex gap-1">
              {!showCc && (
                <button type="button" onClick={() => setShowCc(true)} className="text-xs text-muted-foreground hover:text-foreground">
                  Cc
                </button>
              )}
              {!showBcc && (
                <button type="button" onClick={() => setShowBcc(true)} className="text-xs text-muted-foreground hover:text-foreground">
                  Cco
                </button>
              )}
            </div>
          </div>

          {showCc && (
            <div className="flex items-center gap-2 border-b pb-2">
              <label className="text-xs text-muted-foreground w-12 shrink-0">Cc</label>
              <Input
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                className="border-0 shadow-none focus-visible:ring-0 px-0 h-8"
              />
            </div>
          )}

          {showBcc && (
            <div className="flex items-center gap-2 border-b pb-2">
              <label className="text-xs text-muted-foreground w-12 shrink-0">Cco</label>
              <Input
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                className="border-0 shadow-none focus-visible:ring-0 px-0 h-8"
              />
            </div>
          )}

          {state.mode !== "reply" && (
            <div className="flex items-center gap-2 border-b pb-2">
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Assunto"
                className="border-0 shadow-none focus-visible:ring-0 px-0 h-8 font-medium"
              />
            </div>
          )}

          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Escreva sua mensagem..."
            className="min-h-[280px] border-0 shadow-none focus-visible:ring-0 px-0 resize-none text-sm leading-relaxed"
            autoFocus={state.mode === "reply"}
          />

          {signatureHtml && (
            <div
              className="border-t pt-3 mt-2"
              dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(signatureHtml) }}
            />
          )}

          {state.quoted && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer flex items-center gap-1 hover:text-foreground">
                <ChevronDown className="h-3 w-3" /> Mostrar conversa anterior
              </summary>
              <div
                className="mt-2 pl-3 border-l-2 border-border text-xs"
                dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(state.quoted) }}
              />
            </details>
          )}
        </div>

        <DialogFooter className="px-4 py-3 border-t shrink-0 sm:justify-start gap-2">
          <Button onClick={send} disabled={sending} className="rounded-full px-6">
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Enviar
          </Button>
          <Button variant="ghost" size="icon" disabled title="Anexos em breve">
            <Paperclip className="h-4 w-4" />
          </Button>
          <div className="ml-auto" />
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Settings dialog (structured signature builder) ----------
function SettingsDialog({
  open,
  onOpenChange,
  profileEmail,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profileEmail: string;
}) {
  const [data, setData] = useState<SignatureData>(DEFAULT_SIGNATURE);

  useEffect(() => {
    if (open) {
      const d = getSignatureData();
      if (!d.email && profileEmail) d.email = profileEmail;
      setData(d);
    }
  }, [open, profileEmail]);

  const update = (k: keyof SignatureData, v: string) => setData((p) => ({ ...p, [k]: v }));

  const save = () => {
    try {
      localStorage.setItem(SIGNATURE_V2_KEY, JSON.stringify(data));
      toast.success("Assinatura salva");
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro ao salvar", { description: e.message });
    }
  };

  const previewHtml = buildSignatureHtml(data);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
          <DialogDescription>
            Conta conectada: <strong>{profileEmail || "—"}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">Assinatura</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Nome</label>
                <Input value={data.name} onChange={(e) => update("name", e.target.value)} placeholder="Nathalia Raslosnek" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Cargo</label>
                <Input value={data.role} onChange={(e) => update("role", e.target.value)} placeholder="CEO · NatLeva Wings" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Telefone / WhatsApp</label>
                <Input value={data.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+55 41 99999-9999" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">E-mail</label>
                <Input value={data.email} onChange={(e) => update("email", e.target.value)} placeholder="contato@natleva.com" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Site</label>
                <Input value={data.website} onChange={(e) => update("website", e.target.value)} placeholder="natleva.com" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Instagram (@)</label>
                <Input value={data.instagram} onChange={(e) => update("instagram", e.target.value)} placeholder="natleva" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground">URL do logotipo</label>
                <Input value={data.logoUrl} onChange={(e) => update("logoUrl", e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Cor de destaque</label>
                <div className="flex items-center gap-2">
                  <Input type="color" value={data.brandColor} onChange={(e) => update("brandColor", e.target.value)} className="w-14 p-1 h-9" />
                  <Input value={data.brandColor} onChange={(e) => update("brandColor", e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tagline</label>
                <Input value={data.tagline} onChange={(e) => update("tagline", e.target.value)} placeholder="Experiências de viagem sob medida" />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Pré-visualização</h3>
            <div className="rounded-md border bg-white p-4 overflow-x-auto">
              {previewHtml ? (
                <div dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(previewHtml) }} />
              ) : (
                <p className="text-xs text-muted-foreground">Preencha os campos para visualizar.</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Anexada automaticamente em todas as mensagens enviadas daqui · links de e-mail, telefone, WhatsApp, site e Instagram são clicáveis.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
