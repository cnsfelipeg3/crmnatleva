import { LucideIcon } from "lucide-react";
import React from "react";

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * EmptyState padronizado · usar quando uma lista/grid está vazia.
 * Centralizado verticalmente, ícone opcional, ação opcional (ex: botão CTA).
 */
export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      {Icon && <Icon className="h-10 w-10 text-muted-foreground mb-3" aria-hidden="true" />}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-md">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default EmptyState;
