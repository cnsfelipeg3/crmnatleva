// ─── Dialog: escolher destinatários e (opcional) caption ao encaminhar ───
import { useEffect, useMemo, useState } from "react";
import { Search, X, Forward, Loader2, Check, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";
import type { Message } from "../types";
import { forwardMessages, summarizeMessageForPreview, type ForwardTarget, type JobState } from "./forwardLogic";

export interface ForwardCandidate extends ForwardTarget {
  avatarUrl?: string;
  lastPreview?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  messages: Message[];
  candidates: ForwardCandidate[];
  /** Telefone(s) já presentes na conversa atual · escondidos da lista. */
  excludePhones?: string[];
  /** Telefone da conversa de origem · usado para o forward nativo da Z-API (preserva selo "Encaminhada"). */
  sourcePhone?: string;
  onSent?: () => void;
}

export function ForwardDialog({ open, onOpenChange, messages, candidates, excludePhones, sourcePhone, onSent }: Props) {
  const [query, setQuery] = useState("");
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());
  const [caption, setCaption] = useState("");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [jobs, setJobs] = useState<JobState[]>([]);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery(""); setSelectedPhones(new Set()); setCaption("");
      setSending(false); setProgress({ done: 0, total: 0 });
      setJobs([]); setFinished(false);
    }
  }, [open]);

  const excludeSet = useMemo(() => new Set((excludePhones || []).map(p => p.replace(/\D/g, ""))), [excludePhones]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates
      .filter(c => !excludeSet.has((c.phone || "").replace(/\D/g, "")))
      .filter(c => !q || c.name?.toLowerCase().includes(q) || c.phone.includes(q))
      .slice(0, 200);
  }, [candidates, query, excludeSet]);

  // Status agregado por destinatário
  const statusByPhone = useMemo(() => {
    const map = new Map<string, { sending: number; sent: number; failed: number; pending: number; total: number }>();
    for (const j of jobs) {
      const cur = map.get(j.phone) || { sending: 0, sent: 0, failed: 0, pending: 0, total: 0 };
      cur.total++;
      cur[j.status]++;
      map.set(j.phone, cur);
    }
    return map;
  }, [jobs]);

  const togglePhone = (phone: string) => {
    setSelectedPhones(prev => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone); else next.add(phone);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (selectedPhones.size === 0 || messages.length === 0) return;
    const targets = candidates.filter(c => selectedPhones.has(c.phone));
    setSending(true);
    setFinished(false);
    setProgress({ done: 0, total: targets.length * messages.length });
    setJobs(targets.flatMap(t => messages.map(m => ({ msgId: m.id, phone: t.phone, status: "pending" as const }))));

    const results = await forwardMessages(messages, targets, caption, (done, total, snapshot) => {
      setProgress({ done, total });
      if (snapshot) setJobs(snapshot);
    }, sourcePhone);

    const failures = results.filter(r => !r.ok);
    if (failures.length === 0) {
      toast({
        title: "✅ Encaminhado",
        description: `${messages.length} mensagem(ns) enviada(s) para ${targets.length} contato(s).`,
      });
    } else if (failures.length === results.length) {
      toast({
        title: "Falha ao encaminhar",
        description: failures[0]?.error || "Nenhum envio foi concluído.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Parcialmente enviado",
        description: `${results.length - failures.length} ok · ${failures.length} falharam.`,
        variant: "destructive",
      });
    }

    setSending(false);
    setFinished(true);
    onSent?.();
    // Auto-fecha apenas se 100% sucesso · senão deixa o usuário inspecionar
    if (failures.length === 0) {
      setTimeout(() => onOpenChange(false), 800);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !sending && onOpenChange(v)}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="p-4 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Forward className="h-4 w-4" /> Encaminhar
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {messages.length} mensagem{messages.length > 1 ? "s" : ""} · selecione os destinatários
          </p>
        </DialogHeader>

        {/* Preview das mensagens selecionadas */}
        <div className="px-4 py-2 bg-muted/30 border-b max-h-[80px] overflow-y-auto">
          {messages.slice(0, 3).map((m, i) => (
            <div key={m.id + i} className="text-xs text-muted-foreground truncate">
              · {summarizeMessageForPreview(m)}
            </div>
          ))}
          {messages.length > 3 && (
            <div className="text-xs text-muted-foreground">+ {messages.length - 3} mais</div>
          )}
        </div>

        {/* Caption opcional */}
        <div className="px-4 py-2 border-b">
          <Textarea
            placeholder="Adicionar comentário (opcional)…"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="text-sm min-h-[40px] max-h-[80px] resize-none"
            disabled={sending}
          />
        </div>

        {/* Search */}
        <div className="px-4 py-2 border-b relative">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar contato ou telefone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
            autoFocus
            disabled={sending}
          />
        </div>

        {/* Selected chips */}
        {selectedPhones.size > 0 && (
          <div className="px-4 py-2 border-b flex flex-wrap gap-1 max-h-[80px] overflow-y-auto">
            {Array.from(selectedPhones).map(p => {
              const c = candidates.find(x => x.phone === p);
              return (
                <Badge key={p} variant="secondary" className="gap-1 pr-1">
                  {c?.name || p}
                  <button onClick={() => togglePhone(p)} disabled={sending}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}

        {/* List */}
        <ScrollArea className="h-[260px]">
          <div className="px-2 py-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-center text-muted-foreground py-8">Nenhum contato encontrado</p>
            ) : filtered.map(c => {
              const sel = selectedPhones.has(c.phone);
              const initials = (c.name || c.phone || "?").substring(0, 2).toUpperCase();
              const st = statusByPhone.get(c.phone);
              const showStatus = sending || finished;
              return (
                <button
                  key={c.phone}
                  onClick={() => !sending && togglePhone(c.phone)}
                  disabled={sending}
                  className={`w-full flex items-center gap-3 px-2 py-2 rounded-md text-left hover:bg-muted/60 transition ${sel ? "bg-primary/5" : ""}`}
                >
                  <div className="relative shrink-0">
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                        {initials}
                      </div>
                    )}
                    {sel && !showStatus && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="h-2.5 w-2.5" />
                      </div>
                    )}
                    {showStatus && st && st.failed > 0 && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                        <AlertCircle className="h-2.5 w-2.5" />
                      </div>
                    )}
                    {showStatus && st && st.failed === 0 && st.sent === st.total && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <Check className="h-2.5 w-2.5" />
                      </div>
                    )}
                    {showStatus && st && st.sending > 0 && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{c.name || c.phone}</div>
                    {showStatus && st ? (
                      <div className="text-[11px] truncate flex items-center gap-1.5">
                        {st.sending > 0 && <span className="text-primary">enviando {st.sent + st.sending}/{st.total}…</span>}
                        {st.sending === 0 && st.failed === 0 && st.sent === st.total && <span className="text-emerald-600 dark:text-emerald-400">concluído</span>}
                        {st.failed > 0 && <span className="text-destructive">{st.failed} falha{st.failed > 1 ? "s" : ""} · {st.sent}/{st.total}</span>}
                        {st.sending === 0 && st.sent === 0 && st.failed === 0 && <span className="text-muted-foreground">aguardando…</span>}
                      </div>
                    ) : c.lastPreview ? (
                      <div className="text-[11px] text-muted-foreground truncate">{c.lastPreview}</div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="p-3 border-t flex-col gap-2 items-stretch">
          {(sending || finished) && progress.total > 0 && (
            <div className="flex flex-col gap-1">
              <Progress value={(progress.done / Math.max(progress.total, 1)) * 100} className="h-1.5" />
              <span className="text-[10px] text-muted-foreground">
                {sending ? `Enviando ${progress.done}/${progress.total}…` : `Concluído ${progress.done}/${progress.total}`}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {sending || finished ? "" : `${selectedPhones.size} selecionado${selectedPhones.size === 1 ? "" : "s"}`}
            </span>
            <div className="flex gap-2">
              {finished ? (
                <Button size="sm" onClick={() => onOpenChange(false)}>Fechar</Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={sending}>Cancelar</Button>
                  <Button size="sm" onClick={handleConfirm} disabled={sending || selectedPhones.size === 0} className="gap-1.5">
                    {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Forward className="h-3.5 w-3.5" />}
                    Encaminhar
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
