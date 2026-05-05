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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";
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
  existingParticipantIds: string[];
  onAdd: (userIds: string[]) => Promise<boolean>;
};

export function AddParticipantsDialog({
  open,
  onOpenChange,
  currentOwnerId,
  existingParticipantIds,
  onAdd,
}: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSelected(new Set());
    setSearch("");
  }, [open]);

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

  const eligible = useMemo(() => {
    const exclude = new Set(
      [currentOwnerId, ...existingParticipantIds].filter(Boolean) as string[],
    );
    return members.filter((m) => !exclude.has(m.id));
  }, [members, currentOwnerId, existingParticipantIds]);

  const filtered = useMemo(() => {
    if (!search.trim()) return eligible;
    const q = search.toLowerCase();
    return eligible.filter(
      (m) =>
        (m.full_name || "").toLowerCase().includes(q) ||
        (m.email || "").toLowerCase().includes(q),
    );
  }, [search, eligible]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const handleSubmit = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    const ok = await onAdd(Array.from(selected));
    setSubmitting(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar participantes</DialogTitle>
          <DialogDescription>
            Eles vão acompanhar a conversa, mas não viram donos.
          </DialogDescription>
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

        <ScrollArea className="h-[300px] -mx-1 px-1">
          <div className="space-y-1">
            {filtered.map((m) => {
              const initials = (m.full_name || m.email || "?")
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase())
                .join("");
              const isSelected = selected.has(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggle(m.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted transition text-left",
                    isSelected && "bg-muted/60",
                  )}
                >
                  <Checkbox checked={isSelected} onCheckedChange={() => toggle(m.id)} />
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
                    <p className="text-sm font-medium truncate">
                      {m.full_name || m.email}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-xs text-center text-muted-foreground py-6">
                Nenhum usuário disponível.
              </p>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || selected.size === 0}>
            {submitting
              ? "Adicionando..."
              : `Adicionar${selected.size > 0 ? ` (${selected.size})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
