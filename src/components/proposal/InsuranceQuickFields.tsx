import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ShieldCheck, Gift, BadgeDollarSign } from "lucide-react";

interface Coverage {
  name?: string;
  value?: string;
  category?: string;
}

interface Props {
  data: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

const REGIONS = [
  "Brasil",
  "América do Sul",
  "Mercosul",
  "Europa",
  "América do Norte",
  "Mundo todo",
  "Mundo todo exceto EUA/Canadá",
  "Outra",
];

const CATEGORIES = ["Médico", "Bagagem", "Cancelamento", "Assistência", "Acidentes", "Esportes", "Outras"];

const SUGGESTED_COVERAGES = [
  { name: "Despesas Médicas e Hospitalares (DMH)", category: "Médico" },
  { name: "Despesas Médicas Hospitalares Odontológicas", category: "Médico" },
  { name: "Traslado Médico", category: "Médico" },
  { name: "Traslado de Corpo", category: "Médico" },
  { name: "Regresso Sanitário", category: "Médico" },
  { name: "Bagagem Extraviada", category: "Bagagem" },
  { name: "Atraso de Bagagem", category: "Bagagem" },
  { name: "Cancelamento de Viagem", category: "Cancelamento" },
  { name: "Interrupção de Viagem", category: "Cancelamento" },
  { name: "Invalidez por Acidente", category: "Acidentes" },
  { name: "Morte Acidental", category: "Acidentes" },
  { name: "Cobertura COVID-19", category: "Médico" },
  { name: "Telemedicina 24h", category: "Assistência" },
];

export default function InsuranceQuickFields({ data, onChange }: Props) {
  const coverages: Coverage[] = Array.isArray(data.coverages) ? data.coverages : [];
  const isCourtesy = !!data.is_courtesy;

  const updateCoverage = (i: number, key: keyof Coverage, value: any) => {
    onChange("coverages", coverages.map((c, idx) => (idx === i ? { ...c, [key]: value } : c)));
  };
  const removeCoverage = (i: number) => {
    onChange("coverages", coverages.filter((_, idx) => idx !== i));
  };
  const addCoverage = (preset?: { name: string; category: string }) => {
    onChange("coverages", [...coverages, preset ? { ...preset, value: "" } : { name: "", value: "", category: "Médico" }]);
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/50 bg-muted/10 p-3.5">
      {/* Identidade */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Operadora</Label>
          <Input value={data.provider || ""} onChange={(e) => onChange("provider", e.target.value)} placeholder="Assist Card, Coris, Allianz..." />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Plano</Label>
          <Input value={data.plan_name || ""} onChange={(e) => onChange("plan_name", e.target.value)} placeholder="AC 250 Mundo Inclusive" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Região coberta</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={data.coverage_region || ""}
            onChange={(e) => onChange("coverage_region", e.target.value)}
          >
            <option value="">Selecione...</option>
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Vigência */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Início</Label>
          <Input type="date" value={data.start_date || ""} onChange={(e) => onChange("start_date", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Fim</Label>
          <Input type="date" value={data.end_date || ""} onChange={(e) => onChange("end_date", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Dias</Label>
          <Input type="number" min={1} value={data.days || ""} onChange={(e) => onChange("days", Number(e.target.value) || undefined)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Viajantes</Label>
          <Input type="number" min={1} value={data.travelers || ""} onChange={(e) => onChange("travelers", Number(e.target.value) || undefined)} />
        </div>
      </div>

      {/* Preço · Cortesia */}
      <div className="rounded-lg border border-accent/25 bg-accent/[0.04] p-3">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Gift className="w-4 h-4 text-accent shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">Cortesia NatLeva</p>
              <p className="text-[10.5px] text-muted-foreground leading-tight">
                Quando ativo, o seguro aparece como cortesia da agência (sem valor) na proposta.
              </p>
            </div>
          </div>
          <Switch checked={isCourtesy} onCheckedChange={(v) => onChange("is_courtesy", v)} />
        </div>

        {!isCourtesy && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs flex items-center gap-1"><BadgeDollarSign className="w-3 h-3" /> Preço total</Label>
              <Input type="number" step="0.01" value={data.price_total || ""} onChange={(e) => onChange("price_total", Number(e.target.value) || undefined)} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Por pessoa</Label>
              <Input type="number" step="0.01" value={data.price_per_person || ""} onChange={(e) => onChange("price_per_person", Number(e.target.value) || undefined)} placeholder="0.00" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Moeda</Label>
              <Input value={data.currency || "BRL"} onChange={(e) => onChange("currency", e.target.value.toUpperCase())} placeholder="BRL" />
            </div>
          </div>
        )}
      </div>

      {/* Coberturas */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3" /> Coberturas ({coverages.length})
          </Label>
          <div className="flex items-center gap-1.5">
            <select
              className="h-7 rounded-md border border-input bg-background px-2 text-[11px]"
              defaultValue=""
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                const preset = SUGGESTED_COVERAGES.find((c) => c.name === v);
                if (preset) addCoverage(preset);
                e.currentTarget.value = "";
              }}
            >
              <option value="">+ Sugestão</option>
              {SUGGESTED_COVERAGES.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
            <Button size="sm" variant="outline" onClick={() => addCoverage()} className="h-7 gap-1 text-xs">
              <Plus className="w-3 h-3" /> Cobertura
            </Button>
          </div>
        </div>

        {coverages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3 bg-background rounded-lg border border-dashed border-border/50">
            Nenhuma cobertura cadastrada · use o extrator de IA acima ou adicione manualmente
          </p>
        ) : (
          <div className="space-y-2">
            {coverages.map((cov, i) => (
              <div key={i} className="rounded-lg border border-border/50 bg-background p-2.5 grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 sm:col-span-5 space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Cobertura</Label>
                  <Input value={cov.name || ""} onChange={(e) => updateCoverage(i, "name", e.target.value)} placeholder="Despesas Médicas e Hospitalares" className="h-8 text-sm" />
                </div>
                <div className="col-span-7 sm:col-span-3 space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor</Label>
                  <Input value={cov.value || ""} onChange={(e) => updateCoverage(i, "value", e.target.value)} placeholder="USD 250.000" className="h-8 text-sm" />
                </div>
                <div className="col-span-4 sm:col-span-3 space-y-1">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Categoria</Label>
                  <select
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                    value={cov.category || "Outras"}
                    onChange={(e) => updateCoverage(i, "category", e.target.value)}
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeCoverage(i)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Observações */}
      <div className="space-y-1">
        <Label className="text-xs">Observações / Carências</Label>
        <Textarea
          rows={2}
          value={data.notes || ""}
          onChange={(e) => onChange("notes", e.target.value)}
          placeholder="Carências, franquias, exclusões importantes..."
          className="text-xs"
        />
      </div>
    </div>
  );
}
