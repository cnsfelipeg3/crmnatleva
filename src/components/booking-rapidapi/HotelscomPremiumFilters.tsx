import { useMemo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, X } from "lucide-react";

export interface HotelscomPremiumFiltersState {
  amenities: Set<string>;
  meal_plan: Set<string>;
  payment_type: Set<string>;
  accessibility: Set<string>;
  sort_order:
    | "RECOMMENDED"
    | "PRICE_LOW_TO_HIGH"
    | "REVIEW"
    | "DISTANCE"
    | "PROPERTY_CLASS"
    | "PRICE_RELEVANT";
}

export const emptyHotelscomPremiumFilters = (): HotelscomPremiumFiltersState => ({
  amenities: new Set(),
  meal_plan: new Set(),
  payment_type: new Set(),
  accessibility: new Set(),
  sort_order: "RECOMMENDED",
});

interface OptionDef {
  id: string;
  label: string;
}

const AMENITIES: OptionDef[] = [
  { id: "POOL", label: "Piscina" },
  { id: "FREE_WIFI", label: "Wi-Fi grátis" },
  { id: "PARKING", label: "Estacionamento" },
  { id: "FREE_PARKING", label: "Estacionamento grátis" },
  { id: "AIR_CONDITIONING", label: "Ar-condicionado" },
  { id: "GYM", label: "Academia" },
  { id: "SPA_SERVICES", label: "Spa" },
  { id: "RESTAURANT_IN_HOTEL", label: "Restaurante" },
  { id: "PETS_ALLOWED", label: "Aceita pets" },
  { id: "WASHER_DRYER", label: "Lavanderia" },
  { id: "KITCHEN_KITCHENETTE", label: "Cozinha" },
  { id: "HOT_TUB", label: "Banheira de hidromassagem" },
];

const MEAL_PLAN: OptionDef[] = [
  { id: "FREE_BREAKFAST", label: "Café da manhã grátis" },
  { id: "ALL_INCLUSIVE", label: "All inclusive" },
  { id: "HALF_BOARD", label: "Meia pensão" },
  { id: "FULL_BOARD", label: "Pensão completa" },
];

const PAYMENT_TYPE: OptionDef[] = [
  { id: "FREE_CANCELLATION", label: "Cancelamento grátis" },
  { id: "PAY_LATER", label: "Pague depois" },
  { id: "RESERVE_NOW_PAY_LATER", label: "Reserve agora · pague depois" },
];

const ACCESSIBILITY: OptionDef[] = [
  { id: "ROLL_IN_SHOWER", label: "Box adaptado" },
  { id: "ELEVATOR", label: "Elevador" },
  { id: "ACCESSIBLE_BATHROOM", label: "Banheiro acessível" },
  { id: "IN_ROOM_ACCESSIBILITY", label: "Quarto acessível" },
  { id: "SERVICE_ANIMALS_ALLOWED", label: "Cães-guia permitidos" },
];

const SORT_OPTIONS: { id: HotelscomPremiumFiltersState["sort_order"]; label: string }[] = [
  { id: "RECOMMENDED", label: "Recomendados" },
  { id: "PRICE_LOW_TO_HIGH", label: "Menor preço" },
  { id: "REVIEW", label: "Mais bem avaliados" },
  { id: "DISTANCE", label: "Distância do centro" },
  { id: "PROPERTY_CLASS", label: "Mais estrelas" },
  { id: "PRICE_RELEVANT", label: "Preço · relevância" },
];

interface Props {
  state: HotelscomPremiumFiltersState;
  onStateChange: (next: HotelscomPremiumFiltersState) => void;
}

function CheckboxList({
  options,
  selected,
  onToggle,
}: {
  options: OptionDef[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      {options.map((opt) => (
        <label
          key={opt.id}
          className="flex items-center gap-2 cursor-pointer text-sm hover:bg-muted/50 rounded px-1 py-0.5"
        >
          <Checkbox
            checked={selected.has(opt.id)}
            onCheckedChange={() => onToggle(opt.id)}
          />
          <span className="flex-1 leading-tight">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

export function HotelscomPremiumFilters({ state, onStateChange }: Props) {
  const totalActive = useMemo(
    () =>
      state.amenities.size +
      state.meal_plan.size +
      state.payment_type.size +
      state.accessibility.size +
      (state.sort_order !== "RECOMMENDED" ? 1 : 0),
    [state],
  );

  const toggle = (
    key: "amenities" | "meal_plan" | "payment_type" | "accessibility",
    id: string,
  ) => {
    const next = new Set(state[key]);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onStateChange({ ...state, [key]: next });
  };

  const clear = () => onStateChange(emptyHotelscomPremiumFilters());

  const renderActiveCount = (count: number) =>
    count > 0 ? (
      <span className="bg-rose-500 text-white text-[10px] rounded-full px-1.5 py-0.5 min-w-[1.1rem] text-center">
        {count}
      </span>
    ) : null;

  return (
    <div className="rounded-lg border border-rose-200/70 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/10">
      <div className="flex items-center justify-between px-3 py-2 border-b border-rose-200/70 dark:border-rose-900/40">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
          <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">
            Filtros Premium · Hotels.com
          </span>
          {totalActive > 0 && (
            <Badge className="bg-rose-600 text-white text-[10px] px-1.5 py-0 h-4">
              {totalActive}
            </Badge>
          )}
        </div>
        {totalActive > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clear}
            className="h-6 text-[11px] gap-1 px-2 text-rose-700 dark:text-rose-300"
          >
            <X className="h-3 w-3" />
            Limpar
          </Button>
        )}
      </div>

      <div className="px-3 py-2">
        <label className="text-[11px] font-medium text-muted-foreground block mb-1">
          Ordenar por
        </label>
        <div className="flex flex-wrap gap-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onStateChange({ ...state, sort_order: opt.id })}
              className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                state.sort_order === opt.id
                  ? "border-rose-500 bg-rose-500 text-white"
                  : "border-border hover:bg-muted/60"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Accordion type="multiple" className="px-3 pb-2">
        <AccordionItem value="amenities" className="border-b border-rose-200/40 dark:border-rose-900/30">
          <AccordionTrigger className="text-xs hover:no-underline py-2">
            <span className="flex items-center gap-2">
              Comodidades {renderActiveCount(state.amenities.size)}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <CheckboxList
              options={AMENITIES}
              selected={state.amenities}
              onToggle={(id) => toggle("amenities", id)}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="meal" className="border-b border-rose-200/40 dark:border-rose-900/30">
          <AccordionTrigger className="text-xs hover:no-underline py-2">
            <span className="flex items-center gap-2">
              Refeições {renderActiveCount(state.meal_plan.size)}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <CheckboxList
              options={MEAL_PLAN}
              selected={state.meal_plan}
              onToggle={(id) => toggle("meal_plan", id)}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="payment" className="border-b border-rose-200/40 dark:border-rose-900/30">
          <AccordionTrigger className="text-xs hover:no-underline py-2">
            <span className="flex items-center gap-2">
              Pagamento e cancelamento {renderActiveCount(state.payment_type.size)}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <CheckboxList
              options={PAYMENT_TYPE}
              selected={state.payment_type}
              onToggle={(id) => toggle("payment_type", id)}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="accessibility" className="border-b-0">
          <AccordionTrigger className="text-xs hover:no-underline py-2">
            <span className="flex items-center gap-2">
              Acessibilidade {renderActiveCount(state.accessibility.size)}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <CheckboxList
              options={ACCESSIBILITY}
              selected={state.accessibility}
              onToggle={(id) => toggle("accessibility", id)}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

export function premiumFiltersToParams(state: HotelscomPremiumFiltersState) {
  const join = (s: Set<string>) => (s.size > 0 ? Array.from(s).join(",") : undefined);
  return {
    amenities: join(state.amenities),
    meal_plan: join(state.meal_plan),
    payment_type: join(state.payment_type),
    accessibility: join(state.accessibility),
    sort_order: state.sort_order,
  };
}
