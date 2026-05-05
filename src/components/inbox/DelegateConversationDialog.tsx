import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Member = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentOwnerId: string | null;
  conversationName: string;
  onDelegate: (toUserId: string | null, reason?: string) => Promise<boolean>;
};

export function DelegateConversationDialog({
  open,
  onOpenChange,
  currentOwnerId,
  conversationName,
  onDelegate,
}: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(currentOwnerId);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSelectedId(currentOwnerId);
    setReason("");
    setSearch("");
  }, [currentOwnerId, open]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .order("full_name");
      setMembers((data as Member[]) || []);
    })();
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        (m.full_name || "").toLowerCase().includes(q) ||
        (m.email || "").toLowerCase().includes(q),
    );
  }, [search, members]);

  const handleSubmit = async () => {
    setSubmitting(true);
    const ok = await onDelegate(selectedId, reason.trim() || undefined);
    setSubmitting(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delegar conversa</DialogTitle>
          <DialogDescription className="truncate">{conversationName}</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar usuário..."
            className="pl-8"
          />
        </div>

        <ScrollArea className="h-[280px] -mx-1 px-1">
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition text-left",
                selectedId === null && "bg-muted/60",
              )}
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm">
                —
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Sem atribuição</p>
                <p className="text-xs text-muted-foreground">Deixar conversa livre</p>
              </div>
              {selectedId === null && <Check className="h-4 w-4 text-primary" />}
            </button>

            {filtered.map((m) => {
              const initials = (m.full_name || m.email || "?")
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase())
                .join("");
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedId(m.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition text-left",
                    selectedId === m.id && "bg-muted/60",
                  )}
                >
                  {m.avatar_url ? (
                    <img
                      src={m.avatar_url}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                      {initials}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">
                        {m.full_name || m.email}
                      </p>
                      {m.id === currentOwnerId && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          atual
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                  </div>
                  {selectedId === m.id && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-xs text-center text-muted-foreground py-6">
                Nenhum usuário encontrado.
              </p>
            )}
          </div>
        </ScrollArea>

        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo (opcional)"
          rows={2}
          className="resize-none"
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || selectedId === currentOwnerId}
          >
            {selectedId === currentOwnerId
              ? "Sem mudança"
              : submitting
                ? "Delegando..."
                : "Delegar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
