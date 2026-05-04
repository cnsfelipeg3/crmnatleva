// ─── Top bar exibida quando modo seleção múltipla está ativo ───
import { X, Forward } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  count: number;
  onCancel: () => void;
  onForward: () => void;
}

export function SelectionToolbar({ count, onCancel, onForward }: Props) {
  return (
    <div className="absolute top-0 left-0 right-0 z-30 bg-primary text-primary-foreground px-3 py-2 flex items-center gap-2 shadow-md animate-in slide-in-from-top-2 duration-150">
      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/15" onClick={onCancel}>
        <X className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium flex-1">
        {count} mensage{count === 1 ? "m" : "ns"} selecionada{count === 1 ? "" : "s"}
      </span>
      <Button
        variant="secondary"
        size="sm"
        className="h-8 gap-1.5"
        onClick={onForward}
        disabled={count === 0}
      >
        <Forward className="h-3.5 w-3.5" />
        Encaminhar
      </Button>
    </div>
  );
}
