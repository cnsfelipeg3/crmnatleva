import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface EditableFieldProps {
  label: string;
  value: string | null | undefined;
  onSave: (value: string) => void;
}

export default function EditableField({ label, value, onSave }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = () => {
    setEditing(false);
    if (draft !== (value || "")) {
      onSave(draft);
    }
  };

  const displayValue = value || "—";

  if (editing) {
    return (
      <div className="col-span-1">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") { setEditing(false); setDraft(value || ""); }
          }}
          className="block w-full text-sm font-medium text-foreground bg-transparent border-b border-accent/50 outline-none py-0.5"
        />
      </div>
    );
  }

  return (
    <div
      className="col-span-1 cursor-pointer group"
      onClick={() => { setDraft(value || ""); setEditing(true); }}
    >
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      <p className={cn(
        "text-sm font-medium text-foreground transition-colors group-hover:text-accent",
        !value && "text-muted-foreground/50 italic"
      )}>
        {displayValue}
      </p>
    </div>
  );
}
