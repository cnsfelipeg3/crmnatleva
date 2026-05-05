import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * DatePartsInput · campo de data DD / MM / AAAA com auto-tab,
 * back-tab no apagar, paste inteligente e validação básica.
 * Mesmo padrão usado no cadastro de passageiro (data de nascimento).
 *
 * value/onChange usam ISO `YYYY-MM-DD` (string vazia se incompleto).
 */
export type DatePartsInputProps = {
  value: string;
  onChange: (iso: string) => void;
  /** Se a data não pode ser futura (ex.: nascimento) */
  disableFuture?: boolean;
  /** Se a data não pode ser passada (ex.: validade de documento) */
  disablePast?: boolean;
  minYear?: number;
  maxYear?: number;
  className?: string;
  inputClassName?: string;
  ariaLabel?: string;
  required?: boolean;
  helperText?: string;
};

function isLeapYear(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}
function daysInMonth(m: number, y: number) {
  return [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

export function validateDateParts(
  iso: string,
  opts: { disableFuture?: boolean; disablePast?: boolean; minYear?: number; maxYear?: number } = {}
): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "Use o formato DD/MM/AAAA";
  const y = +m[1], mo = +m[2], d = +m[3];
  const minY = opts.minYear ?? 1900;
  const maxY = opts.maxYear ?? new Date().getFullYear() + 50;
  if (y < minY || y > maxY) return `Ano deve estar entre ${minY} e ${maxY}`;
  if (mo < 1 || mo > 12) return "Mês inválido (01 a 12)";
  const max = daysInMonth(mo, y);
  if (d < 1 || d > max) return `Dia inválido para ${String(mo).padStart(2, "0")}/${y} (máx ${max})`;
  const date = new Date(y, mo - 1, d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (opts.disableFuture && date > new Date()) return "Data não pode ser no futuro";
  if (opts.disablePast && date < today) return "Data não pode ser no passado";
  return "";
}

export function DatePartsInput({
  value,
  onChange,
  disableFuture,
  disablePast,
  minYear,
  maxYear,
  className,
  inputClassName,
  ariaLabel,
  required,
  helperText,
}: DatePartsInputProps) {
  const dRef = useRef<HTMLInputElement>(null);
  const mRef = useRef<HTMLInputElement>(null);
  const yRef = useRef<HTMLInputElement>(null);

  const [parts, setParts] = useState(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    return m ? { d: m[3], m: m[2], y: m[1] } : { d: "", m: "", y: "" };
  });
  const [error, setError] = useState("");

  // Sync external value -> parts when it changes (controlled reset etc.)
  useEffect(() => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    if (m) {
      if (m[3] !== parts.d || m[2] !== parts.m || m[1] !== parts.y) {
        setParts({ d: m[3], m: m[2], y: m[1] });
      }
    } else if (!value && (parts.d || parts.m || parts.y)) {
      setParts({ d: "", m: "", y: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const focusEl = (ref: React.RefObject<HTMLInputElement>) => {
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      try { const len = el.value.length; el.setSelectionRange(len, len); } catch {}
    });
  };

  const commit = (next: { d: string; m: string; y: string }) => {
    const d = next.d.replace(/\D/g, "").slice(0, 2);
    const m = next.m.replace(/\D/g, "").slice(0, 2);
    const y = next.y.replace(/\D/g, "").slice(0, 4);
    setParts({ d, m, y });
    const iso = y.length === 4 && m.length >= 1 && d.length >= 1
      ? `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
      : "";
    onChange(iso);
    if (iso) setError(validateDateParts(iso, { disableFuture, disablePast, minYear, maxYear }));
    else setError("");
  };

  const splitDigits = (raw: string) => {
    const text = raw.replace(/\D/g, "").slice(0, 8);
    if (text.length === 8 && +text.slice(0, 4) >= 1900) {
      return { d: text.slice(6, 8), m: text.slice(4, 6), y: text.slice(0, 4) };
    }
    return { d: text.slice(0, 2), m: text.slice(2, 4), y: text.slice(4, 8) };
  };

  const handleChange = (field: "d" | "m" | "y", v: string) => {
    const clean = v.replace(/\D/g, "");
    const max = field === "y" ? 4 : 2;
    if (clean.length === 0 && parts[field].length === 0) {
      if (field === "m") focusEl(dRef);
      if (field === "y") focusEl(mRef);
      return;
    }
    if (clean.length > max) {
      const current = clean.slice(0, max);
      const overflow = clean.slice(max);
      const next = { ...parts, [field]: current };
      if (field === "d") {
        next.m = (overflow + parts.m).replace(/\D/g, "").slice(0, 2);
        if (overflow.length >= 2) next.y = (overflow.slice(2) + parts.y).replace(/\D/g, "").slice(0, 4);
        commit(next);
        focusEl(next.m.length >= 2 ? yRef : mRef);
      } else if (field === "m") {
        next.y = (overflow + parts.y).replace(/\D/g, "").slice(0, 4);
        commit(next);
        focusEl(yRef);
      } else {
        commit(next);
      }
      return;
    }
    const next = { ...parts, [field]: clean };
    commit(next);
    if (field === "d" && clean.length === 2) focusEl(mRef);
    if (field === "m" && clean.length === 2) focusEl(yRef);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (text.replace(/\D/g, "").length >= 6) {
      e.preventDefault();
      const next = splitDigits(text);
      commit(next);
      focusEl(next.y.length === 4 ? yRef : mRef);
    }
  };

  const handleKeyDown = (field: "d" | "m" | "y", e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !parts[field]) {
      e.preventDefault();
      if (field === "m") focusEl(dRef);
      if (field === "y") focusEl(mRef);
    }
  };

  const errCls = error ? "border-destructive" : "";

  return (
    <div className={cn("space-y-1", className)} aria-label={ariaLabel}>
      <div className="flex w-full items-center gap-1.5">
        <Input
          ref={dRef} inputMode="numeric" pattern="[0-9]*" placeholder="DD" aria-label="Dia"
          autoComplete="off" maxLength={2} required={required}
          className={cn("h-11 flex-1 min-w-0 text-center tabular-nums px-2", errCls, inputClassName)}
          value={parts.d}
          onPaste={handlePaste}
          onChange={(e) => handleChange("d", e.target.value)}
          onKeyDown={(e) => handleKeyDown("d", e)}
        />
        <span className="text-muted-foreground select-none shrink-0">/</span>
        <Input
          ref={mRef} inputMode="numeric" pattern="[0-9]*" placeholder="MM" aria-label="Mês"
          autoComplete="off" maxLength={2} required={required}
          className={cn("h-11 flex-1 min-w-0 text-center tabular-nums px-2", errCls, inputClassName)}
          value={parts.m}
          onPaste={handlePaste}
          onChange={(e) => handleChange("m", e.target.value)}
          onKeyDown={(e) => handleKeyDown("m", e)}
        />
        <span className="text-muted-foreground select-none shrink-0">/</span>
        <Input
          ref={yRef} inputMode="numeric" pattern="[0-9]*" placeholder="AAAA" aria-label="Ano"
          autoComplete="off" maxLength={4} required={required}
          className={cn("h-11 flex-[1.4] min-w-0 text-center tabular-nums px-2", errCls, inputClassName)}
          value={parts.y}
          onPaste={handlePaste}
          onChange={(e) => handleChange("y", e.target.value)}
          onKeyDown={(e) => handleKeyDown("y", e)}
        />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export default DatePartsInput;
