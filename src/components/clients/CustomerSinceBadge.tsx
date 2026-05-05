import { Calendar, Sparkles, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { formatCustomerSince, customerTier } from "@/lib/customerSince";
import { cn } from "@/lib/utils";

interface Props {
  customerSince: string | Date | null | undefined;
  source?: string | null;
  className?: string;
}

const tierConfig = {
  novo:     { icon: Sparkles, color: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",       label: "Cliente novo" },
  recente:  { icon: Calendar, color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", label: "Cliente recente" },
  fiel:     { icon: Calendar, color: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",     label: "Cliente fiel" },
  veterano: { icon: Crown,    color: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",  label: "Cliente veterano" },
} as const;

const sourceLabels: Record<string, string> = {
  monday_phone: "via telefone",
  monday_email: "via email",
  monday_name: "via nome",
  manual: "manual",
};

export function CustomerSinceBadge({ customerSince, source, className }: Props) {
  if (!customerSince) return null;
  const text = formatCustomerSince(customerSince);
  const tier = customerTier(customerSince);
  if (!text || !tier) return null;
  const cfg = tierConfig[tier];
  const Icon = cfg.icon;
  const sourceLabel = sourceLabels[source || ""] || "";
  const date = new Date(customerSince).toLocaleDateString("pt-BR");

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn("gap-1.5 cursor-help", cfg.color, className)}>
            <Icon className="w-3 h-3" />
            <span className="text-xs font-medium">{text}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold text-xs">{cfg.label}</p>
          <p className="text-[11px] text-muted-foreground">
            Desde {date}{sourceLabel ? ` · ${sourceLabel}` : ""}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
