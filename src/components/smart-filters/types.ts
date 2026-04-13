export interface SortOption {
  key: string;
  label: string;
  type: "date" | "number" | "string";
}

export type DatePreset =
  | "today"
  | "tomorrow"
  | "this_week"
  | "next_7_days"
  | "next_30_days"
  | "this_month"
  | "next_month"
  | "last_30_days"
  | "this_year"
  | "custom"
  | "specific"
  | "all";

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  today: "Hoje",
  tomorrow: "Amanhã",
  this_week: "Esta semana",
  next_7_days: "7 dias",
  next_30_days: "30 dias",
  this_month: "Este mês",
  next_month: "Próximo mês",
  last_30_days: "Últimos 30d",
  this_year: "Este ano",
  custom: "Intervalo",
  specific: "Data específica",
  all: "Todos",
};

export interface DateFilter {
  field: string;
  preset: DatePreset;
  from?: Date;
  to?: Date;
  specificDate?: Date;
}

export interface SelectFilterConfig {
  key: string;
  label: string;
  options: string[];
  value: string;
}

export interface SmartFilterConfig<T = any> {
  sortOptions: SortOption[];
  defaultSortKey?: string;
  defaultSortDirection?: "asc" | "desc";
  dateField?: string;
  dateFilterLabel?: string;
  /** Multiple date field options for the user to choose which date to filter on */
  dateFieldOptions?: { key: string; label: string }[];
  selectFilters: Omit<SelectFilterConfig, "value">[];
  searchPlaceholder?: string;
  searchFields: string[];
  /** Pill presets to show (default: common set) */
  pillPresets?: DatePreset[];
}

export interface SmartFilterState {
  search: string;
  sortKey: string;
  sortDirection: "asc" | "desc";
  dateFilter: DateFilter;
  selectFilters: Record<string, string>;
}
