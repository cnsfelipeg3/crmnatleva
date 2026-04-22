import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plane, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ───────────────────────────────────────────────
// Curated airline aircraft cover photos (Wikimedia Commons – public domain / CC).
// Add more as needed. Keys are uppercase IATA codes.
// ───────────────────────────────────────────────
const AIRLINE_COVERS: Record<string, { url: string; label: string }[]> = {
  LA: [
    { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/LATAM_Airlines_Boeing_787-9_Dreamliner_CC-BGK.jpg/1600px-LATAM_Airlines_Boeing_787-9_Dreamliner_CC-BGK.jpg", label: "LATAM 787-9" },
    { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/LATAM_Airlines_Brasil_Airbus_A320-214_PR-MHU.jpg/1600px-LATAM_Airlines_Brasil_Airbus_A320-214_PR-MHU.jpg", label: "LATAM A320" },
  ],
  AD: [
    { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Azul_Linhas_A%C3%A9reas_Brasileiras_Airbus_A330-941_PR-ANY.jpg/1600px-Azul_Linhas_A%C3%A9reas_Brasileiras_Airbus_A330-941_PR-ANY.jpg", label: "Azul A330neo" },
  ],
  G3: [
    { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Gol_Linhas_A%C3%A9reas_Boeing_737-8EH_PR-GUK.jpg/1600px-Gol_Linhas_A%C3%A9reas_Boeing_737-8EH_PR-GUK.jpg", label: "GOL 737" },
  ],
  EK: [
    { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Emirates_Airbus_A380-861_A6-EER.jpg/1600px-Emirates_Airbus_A380-861_A6-EER.jpg", label: "Emirates A380" },
  ],
  QR: [
    { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Qatar_Airways_Boeing_777-300ER_A7-BAC.jpg/1600px-Qatar_Airways_Boeing_777-300ER_A7-BAC.jpg", label: "Qatar 777" },
  ],
  AF: [
    { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Air_France_Boeing_777-328ER_F-GZNU.jpg/1600px-Air_France_Boeing_777-328ER_F-GZNU.jpg", label: "Air France 777" },
  ],
  KL: [
    { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/KLM_Boeing_787-9_Dreamliner_PH-BHA.jpg/1600px-KLM_Boeing_787-9_Dreamliner_PH-BHA.jpg", label: "KLM 787" },
  ],
  TP: [
    { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/TAP_Air_Portugal_Airbus_A330-941_CS-TUA.jpg/1600px-TAP_Air_Portugal_Airbus_A330-941_CS-TUA.jpg", label: "TAP A330neo" },
  ],
  IB: [
    { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Iberia_Airbus_A350-941_EC-MXV.jpg/1600px-Iberia_Airbus_A350-941_EC-MXV.jpg", label: "Iberia A350" },
  ],
  AA: [
    { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/American_Airlines_Boeing_777-300ER_N729AN.jpg/1600px-American_Airlines_Boeing_777-300ER_N729AN.jpg", label: "American 777" },
  ],
  UA: [
    { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/United_Airlines_Boeing_787-9_Dreamliner_N38950.jpg/1600px-United_Airlines_Boeing_787-9_Dreamliner_N38950.jpg", label: "United 787" },
  ],
  DL: [
    { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Delta_Air_Lines_Airbus_A350-941_N502DN.jpg/1600px-Delta_Air_Lines_Airbus_A350-941_N502DN.jpg", label: "Delta A350" },
  ],
  TK: [
    { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Turkish_Airlines_Boeing_777-3F2ER_TC-JJI.jpg/1600px-Turkish_Airlines_Boeing_777-3F2ER_TC-JJI.jpg", label: "Turkish 777" },
  ],
};

// Generic fallback covers (no airline detected)
const GENERIC_COVERS: { url: string; label: string }[] = [
  { url: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1600&q=80", label: "Avião decolando" },
  { url: "https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=1600&q=80", label: "Asa em voo" },
  { url: "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=1600&q=80", label: "Cabine de comando" },
  { url: "https://images.unsplash.com/photo-1583416750470-965b2707b355?auto=format&fit=crop&w=1600&q=80", label: "Aeronave na pista" },
];

interface FlightCoverPickerProps {
  value: string;
  onChange: (url: string) => void;
  airlineIata?: string;
  airlineName?: string;
}

export default function FlightCoverPicker({ value, onChange, airlineIata, airlineName }: FlightCoverPickerProps) {
  const [showUrlInput, setShowUrlInput] = useState(false);

  const { covers, source } = useMemo(() => {
    const code = (airlineIata || "").trim().toUpperCase();
    if (code && AIRLINE_COVERS[code]) {
      return { covers: AIRLINE_COVERS[code], source: "airline" as const };
    }
    return { covers: GENERIC_COVERS, source: "generic" as const };
  }, [airlineIata]);

  return (
    <div className="md:col-span-2 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Label className="text-xs flex items-center gap-1.5">
          <Plane className="w-3.5 h-3.5 text-primary" />
          Imagem de capa do aéreo
          {source === "airline" && airlineName && (
            <span className="text-[10px] text-muted-foreground font-normal">
              · sugestões para {airlineName}
            </span>
          )}
          {source === "generic" && (
            <span className="text-[10px] text-muted-foreground font-normal">
              · sugestões genéricas (defina a companhia para fotos da frota)
            </span>
          )}
        </Label>
        <button
          type="button"
          onClick={() => setShowUrlInput((v) => !v)}
          className="text-[10px] text-primary hover:underline"
        >
          {showUrlInput ? "Ocultar URL manual" : "Colar URL manual"}
        </button>
      </div>

      {/* Thumbnail grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {covers.map((c) => {
          const selected = value === c.url;
          return (
            <button
              key={c.url}
              type="button"
              onClick={() => onChange(c.url)}
              className={cn(
                "relative aspect-[4/3] rounded-lg overflow-hidden border bg-muted group transition-all",
                selected
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border/40 hover:border-border"
              )}
            >
              <img
                src={c.url}
                alt={c.label}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {selected && (
                <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                  <Check className="w-3 h-3" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1">
                <p className="text-[9px] text-white font-medium truncate">{c.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Manual URL input (collapsible) */}
      {showUrlInput && (
        <div className="flex items-center gap-2">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://..."
            className="h-8 text-xs"
          />
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange("")}
              className="h-8 px-2"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      )}

      {/* Preview if custom URL not in grid */}
      {value && !covers.some((c) => c.url === value) && (
        <div className="flex items-start gap-2 p-2 bg-muted/30 rounded-lg border border-border/40">
          <div className="w-16 h-12 rounded overflow-hidden shrink-0 bg-muted">
            <img src={value} alt="Capa" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-muted-foreground">Capa personalizada</p>
            <p className="text-[10px] text-foreground/70 truncate">{value}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
            className="h-7 px-2 text-[10px]"
          >
            Remover
          </Button>
        </div>
      )}
    </div>
  );
}
