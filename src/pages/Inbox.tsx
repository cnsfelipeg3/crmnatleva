import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Inbox as InboxIcon,
  Send,
  Star,
  Trash2,
  RefreshCw,
  Search,
  Reply,
  PenSquare,
  Loader2,
  Mail,
  MailOpen,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  labelIds: string[];
}

const FOLDERS = [
  { key: "inbox", label: "Caixa de entrada", q: "in:inbox -in:trash", icon: InboxIcon },
  { key: "unread", label: "Não lidas", q: "is:unread in:inbox", icon: Mail },
  { key: "starred", label: "Com estrela", q: "is:starred", icon: Star },
  { key: "sent", label: "Enviadas", q: "in:sent", icon: Send },
  { key: "trash", label: "Lixeira", q: "in:trash", icon: Trash2 },
];

function parseFromName(raw: string): { name: string; email: string } {
  if (!raw) return { name: "", email: "" };
  const m = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim() || m[2], email: m[2] };
  return { name: raw.trim(), email: raw.trim() };
}

function initials(name: string): string {
  const parts = name.replace(/[<>"]/g, "").trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
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
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
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

export default function Inbox() {
  const [folder, setFolder] = useState<string>("inbox");
  const [search, setSearch] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<{ id: string; messages: ThreadMessage[] } | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [profileEmail, setProfileEmail] = useState<string>("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const currentQuery = useMemo(() => {
    const base = FOLDERS.find((f) => f.key === folder)?.q || "in:inbox";
    return searchQ ? `${searchQ} ${base}` : base;
  }, [folder, searchQ]);

  const loadProfile = useCallback(async () => {
    try {
      const p = await callGmail("profile");
      setProfileEmail(p.emailAddress || "");
    } catch (e: any) {
      toast.error("Não foi possível conectar ao Gmail", { description: e.message });
    }
  }, []);

  const loadThreads = useCallback(
    async (silent = false) => {
      if (!silent) setLoadingThreads(true);
      try {
        const r = await callGmail("list_threads", { q: currentQuery, maxResults: 30 });
        setThreads(r.threads || []);
      } catch (e: any) {
        if (!silent) toast.error("Erro ao carregar emails", { description: e.message });
      } finally {
        if (!silent) setLoadingThreads(false);
      }
    },
    [currentQuery]
  );

  const loadThread = useCallback(async (id: string) => {
    setLoadingThread(true);
    try {
      const r = await callGmail("get_thread", { threadId: id });
      setThread(r);
      // Mark as read if unread
      const anyUnread = (r.messages || []).some((m: ThreadMessage) =>
        (m.labelIds || []).includes("UNREAD")
      );
      if (anyUnread) {
        callGmail("mark_read", { threadId: id }).then(() => {
          setThreads((prev) =>
            prev.map((t) =>
              t.id === id
                ? { ...t, unread: false, labels: t.labels.filter((l) => l !== "UNREAD") }
                : t
            )
          );
        });
      }
    } catch (e: any) {
      toast.error("Erro ao abrir conversa", { description: e.message });
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads, refreshTick]);

  // Auto-refresh a cada 30s
  useEffect(() => {
    const id = setInterval(() => loadThreads(true), 30000);
    return () => clearInterval(id);
  }, [loadThreads]);

  useEffect(() => {
    if (selectedId) loadThread(selectedId);
    else setThread(null);
  }, [selectedId, loadThread]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQ(search.trim());
    setSelectedId(null);
  };

  const handleStar = async (t: ThreadItem) => {
    const next = !t.starred;
    setThreads((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, starred: next } : x))
    );
    try {
      await callGmail("star", { threadId: t.id, starred: next });
    } catch (e: any) {
      toast.error("Não foi possível atualizar", { description: e.message });
      setThreads((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, starred: !next } : x))
      );
    }
  };

  const handleTrash = async (id: string) => {
    try {
      await callGmail("trash", { threadId: id });
      setThreads((prev) => prev.filter((t) => t.id !== id));
      if (selectedId === id) setSelectedId(null);
      toast.success("Conversa movida pra lixeira");
    } catch (e: any) {
      toast.error("Erro ao excluir", { description: e.message });
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-background">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <InboxIcon className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Caixa de entrada</h1>
          {profileEmail && (
            <Badge variant="secondary" className="ml-2 hidden sm:inline-flex">
              {profileEmail}
            </Badge>
          )}
        </div>
        <form onSubmit={handleSearch} className="ml-auto flex flex-1 min-w-[200px] max-w-md items-center gap-2">
          <div className="relative w-full">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar nos emails..."
              className="pl-8"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Buscar
          </Button>
        </form>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRefreshTick((t) => t + 1)}
          disabled={loadingThreads}
        >
          <RefreshCw className={cn("h-4 w-4", loadingThreads && "animate-spin")} />
        </Button>
        <Button size="sm" onClick={() => setComposeOpen(true)}>
          <PenSquare className="mr-2 h-4 w-4" />
          Novo email
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Folders */}
        <aside className="hidden w-48 shrink-0 border-r bg-muted/30 p-2 md:block">
          <nav className="space-y-1">
            {FOLDERS.map((f) => {
              const Icon = f.icon;
              return (
                <button
                  key={f.key}
                  onClick={() => {
                    setFolder(f.key);
                    setSelectedId(null);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    folder === f.key
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {f.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile folder tabs */}
        <div className="border-b p-2 md:hidden w-full absolute" style={{ display: "none" }} />

        {/* Threads list */}
        <div
          className={cn(
            "flex w-full flex-col border-r md:w-96",
            selectedId && "hidden md:flex"
          )}
        >
          <div className="md:hidden border-b p-2">
            <Tabs value={folder} onValueChange={(v) => { setFolder(v); setSelectedId(null); }}>
              <TabsList className="w-full overflow-x-auto">
                {FOLDERS.map((f) => (
                  <TabsTrigger key={f.key} value={f.key} className="text-xs">
                    {f.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <ScrollArea className="flex-1">
            {loadingThreads && threads.length === 0 ? (
              <div className="flex items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : threads.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Nenhum email encontrado.
              </div>
            ) : (
              <ul className="divide-y">
                {threads.map((t) => {
                  const { name } = parseFromName(t.from);
                  return (
                    <li key={t.id}>
                      <button
                        onClick={() => setSelectedId(t.id)}
                        className={cn(
                          "flex w-full gap-3 px-3 py-3 text-left transition-colors hover:bg-accent",
                          selectedId === t.id && "bg-accent",
                          t.unread && "bg-primary/5"
                        )}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {initials(name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "truncate text-sm",
                                t.unread ? "font-semibold" : "font-medium"
                              )}
                            >
                              {name}
                            </span>
                            {t.messageCount > 1 && (
                              <span className="text-xs text-muted-foreground">
                                ({t.messageCount})
                              </span>
                            )}
                            <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                              {fmtDate(t.date, t.internalDate)}
                            </span>
                          </div>
                          <div
                            className={cn(
                              "truncate text-sm",
                              t.unread ? "font-medium text-foreground" : "text-muted-foreground"
                            )}
                          >
                            {t.subject || "(sem assunto)"}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            {t.snippet}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </div>

        {/* Reading pane */}
        <div className={cn("flex-1 flex flex-col", !selectedId && "hidden md:flex")}>
          {!selectedId ? (
            <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
              <MailOpen className="mb-3 h-12 w-12 opacity-40" />
              <p>Selecione um email pra visualizar</p>
            </div>
          ) : loadingThread || !thread ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ThreadView
              thread={thread}
              onBack={() => setSelectedId(null)}
              onReply={() => setReplyOpen(true)}
              onTrash={() => handleTrash(thread.id)}
              onStar={() => {
                const t = threads.find((x) => x.id === thread.id);
                if (t) handleStar(t);
              }}
              starred={threads.find((x) => x.id === thread.id)?.starred || false}
            />
          )}
        </div>
      </div>

      <ComposeDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        onSent={() => {
          setComposeOpen(false);
          setRefreshTick((t) => t + 1);
        }}
      />

      {thread && (
        <ReplyDialog
          open={replyOpen}
          onOpenChange={setReplyOpen}
          thread={thread}
          onSent={() => {
            setReplyOpen(false);
            loadThread(thread.id);
            setRefreshTick((t) => t + 1);
          }}
        />
      )}
    </div>
  );
}

function ThreadView({
  thread,
  onBack,
  onReply,
  onTrash,
  onStar,
  starred,
}: {
  thread: { id: string; messages: ThreadMessage[] };
  onBack: () => void;
  onReply: () => void;
  onTrash: () => void;
  onStar: () => void;
  starred: boolean;
}) {
  const subject = thread.messages[0]?.subject || "(sem assunto)";
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="flex-1 truncate text-base font-semibold">{subject}</h2>
        <Button variant="ghost" size="icon" onClick={onStar} title="Estrela">
          <Star className={cn("h-4 w-4", starred && "fill-yellow-400 text-yellow-400")} />
        </Button>
        <Button variant="ghost" size="icon" onClick={onTrash} title="Mover pra lixeira">
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={onReply}>
          <Reply className="mr-2 h-4 w-4" /> Responder
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {thread.messages.map((m) => {
            const { name, email } = parseFromName(m.from);
            return (
              <Card key={m.id} className="p-4">
                <div className="mb-3 flex flex-wrap items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {initials(name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{name}</div>
                    <div className="truncate text-xs text-muted-foreground">{email}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      Para: {m.to}
                      {m.cc && ` · Cc: ${m.cc}`}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{fmtDate(m.date)}</div>
                </div>
                {m.html ? (
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert [&_a]:text-primary"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(m.html) }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap break-words font-sans text-sm text-foreground">
                    {m.text || m.snippet || ""}
                  </pre>
                )}
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

function sanitizeHtml(html: string): string {
  // Strip script/style tags and inline event handlers
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/ on\w+="[^"]*"/gi, "")
    .replace(/ on\w+='[^']*'/gi, "");
}

function ComposeDialog({
  open,
  onOpenChange,
  onSent,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSent: () => void;
}) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const reset = () => {
    setTo("");
    setCc("");
    setSubject("");
    setBody("");
  };

  useEffect(() => {
    if (!open) reset();
  }, [open]);

  const send = async () => {
    if (!to.trim()) return toast.error("Informe o destinatário");
    setSending(true);
    try {
      await callGmail("send", { to, cc: cc || undefined, subject, body });
      toast.success("Email enviado");
      onSent();
    } catch (e: any) {
      toast.error("Erro ao enviar", { description: e.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo email</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Para" value={to} onChange={(e) => setTo(e.target.value)} />
          <Input placeholder="Cc (opcional)" value={cc} onChange={(e) => setCc(e.target.value)} />
          <Input placeholder="Assunto" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea
            placeholder="Escreva sua mensagem..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={send} disabled={sending}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReplyDialog({
  open,
  onOpenChange,
  thread,
  onSent,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  thread: { id: string; messages: ThreadMessage[] };
  onSent: () => void;
}) {
  const lastMsg = thread.messages[thread.messages.length - 1];
  const { email: replyTo } = parseFromName(lastMsg?.from || "");
  const [to, setTo] = useState(replyTo);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) {
      setTo(replyTo);
      setBody("");
    }
  }, [open, replyTo]);

  const send = async () => {
    if (!to.trim()) return toast.error("Informe o destinatário");
    setSending(true);
    try {
      await callGmail("reply", { threadId: thread.id, to, body });
      toast.success("Resposta enviada");
      onSent();
    } catch (e: any) {
      toast.error("Erro ao enviar", { description: e.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Responder</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Para" value={to} onChange={(e) => setTo(e.target.value)} />
          <div className="text-xs text-muted-foreground">
            Assunto: Re: {lastMsg?.subject || ""}
          </div>
          <Textarea
            placeholder="Escreva sua resposta..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={send} disabled={sending}>
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
