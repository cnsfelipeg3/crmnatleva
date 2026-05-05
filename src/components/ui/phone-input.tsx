import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type Country = {
  code: string; // ISO2
  name: string;
  dial: string; // e.g. "+55"
  flag: string; // emoji
};

export const COUNTRIES: Country[] = [
  { code: "BR", name: "Brasil", dial: "+55", flag: "🇧🇷" },
  { code: "US", name: "Estados Unidos", dial: "+1", flag: "🇺🇸" },
  { code: "PT", name: "Portugal", dial: "+351", flag: "🇵🇹" },
  { code: "AR", name: "Argentina", dial: "+54", flag: "🇦🇷" },
  { code: "CL", name: "Chile", dial: "+56", flag: "🇨🇱" },
  { code: "UY", name: "Uruguai", dial: "+598", flag: "🇺🇾" },
  { code: "PY", name: "Paraguai", dial: "+595", flag: "🇵🇾" },
  { code: "BO", name: "Bolívia", dial: "+591", flag: "🇧🇴" },
  { code: "PE", name: "Peru", dial: "+51", flag: "🇵🇪" },
  { code: "CO", name: "Colômbia", dial: "+57", flag: "🇨🇴" },
  { code: "MX", name: "México", dial: "+52", flag: "🇲🇽" },
  { code: "CA", name: "Canadá", dial: "+1", flag: "🇨🇦" },
  { code: "ES", name: "Espanha", dial: "+34", flag: "🇪🇸" },
  { code: "FR", name: "França", dial: "+33", flag: "🇫🇷" },
  { code: "IT", name: "Itália", dial: "+39", flag: "🇮🇹" },
  { code: "DE", name: "Alemanha", dial: "+49", flag: "🇩🇪" },
  { code: "GB", name: "Reino Unido", dial: "+44", flag: "🇬🇧" },
  { code: "NL", name: "Holanda", dial: "+31", flag: "🇳🇱" },
  { code: "CH", name: "Suíça", dial: "+41", flag: "🇨🇭" },
  { code: "JP", name: "Japão", dial: "+81", flag: "🇯🇵" },
  { code: "CN", name: "China", dial: "+86", flag: "🇨🇳" },
  { code: "AU", name: "Austrália", dial: "+61", flag: "🇦🇺" },
  { code: "AE", name: "Emirados Árabes", dial: "+971", flag: "🇦🇪" },
  { code: "ZA", name: "África do Sul", dial: "+27", flag: "🇿🇦" },
];

function formatBR(d: string) {
  d = d.slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function formatGeneric(d: string) {
  d = d.slice(0, 15);
  if (d.length <= 4) return d;
  if (d.length <= 8) return `${d.slice(0, 4)} ${d.slice(4)}`;
  return `${d.slice(0, 4)} ${d.slice(4, 8)} ${d.slice(8)}`;
}

interface PhoneInputProps {
  value: string;
  countryCode?: string;
  onChange: (full: string, parts: { country: Country; national: string }) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
}

export function PhoneInput({ value, countryCode = "BR", onChange, placeholder, required, id }: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const country = useMemo(
    () => COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0],
    [countryCode]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [search]);

  const handleNational = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    const formatted = country.code === "BR" ? formatBR(digits) : formatGeneric(digits);
    onChange(`${country.dial} ${formatted}`.trim(), { country, national: formatted });
  };

  const selectCountry = (c: Country) => {
    setOpen(false);
    setSearch("");
    // mantém só os dígitos atuais ao trocar país
    const digits = (value || "").replace(/^\+\d+\s?/, "").replace(/\D/g, "");
    const formatted = c.code === "BR" ? formatBR(digits) : formatGeneric(digits);
    onChange(`${c.dial} ${formatted}`.trim(), { country: c, national: formatted });
  };

  // extrai parte nacional para exibir
  const national = (value || "").replace(country.dial, "").trim();

  return (
    <div className="flex items-stretch gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-11 px-3 gap-2 shrink-0 font-normal"
          >
            <span className="text-lg leading-none">{country.flag}</span>
            <span className="text-sm tabular-nums">{country.dial}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] p-0" align="start">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="w-4 h-4 opacity-60" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar país ou +código"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => selectCountry(c)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left",
                    c.code === country.code && "bg-accent/60"
                  )}
                >
                  <span className="text-base leading-none">{c.flag}</span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{c.dial}</span>
                  {c.code === country.code && <Check className="w-4 h-4 text-primary" />}
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                Nenhum país encontrado
              </li>
            )}
          </ul>
        </PopoverContent>
      </Popover>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        className="flex-1 h-11"
        value={national}
        onChange={(e) => handleNational(e.target.value)}
        placeholder={placeholder || (country.code === "BR" ? "(11) 99999-9999" : "Número")}
        required={required}
      />
    </div>
  );
}
