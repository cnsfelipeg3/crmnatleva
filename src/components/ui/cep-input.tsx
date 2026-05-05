import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { formatCep, lookupCep, type ViaCepResult } from "@/lib/cep";

interface Props {
  value: string;
  onChange: (formatted: string) => void;
  onResolved?: (r: ViaCepResult) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CepInput({ value, onChange, onResolved, placeholder = "00000-000", className, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");

  const handle = async (raw: string) => {
    const v = formatCep(raw);
    onChange(v);
    setStatus("idle");
    const d = v.replace(/\D/g, "");
    if (d.length === 8) {
      setLoading(true);
      const r = await lookupCep(d);
      setLoading(false);
      if (r) { setStatus("ok"); onResolved?.(r); }
      else setStatus("err");
    }
  };

  return (
    <div className="relative">
      <Input
        value={value || ""}
        onChange={(e) => handle(e.target.value)}
        placeholder={placeholder}
        inputMode="numeric"
        maxLength={9}
        disabled={disabled}
        className={`pr-9 ${className || ""}`}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        {!loading && status === "ok" && <Check className="w-4 h-4 text-primary" />}
        {!loading && status === "err" && <AlertCircle className="w-4 h-4 text-destructive" />}
      </div>
    </div>
  );
}
