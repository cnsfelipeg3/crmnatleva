import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface MobilePageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onBack?: () => void;
  className?: string;
}

/** Header sticky com back button · só renderiza no mobile. */
export function MobilePageHeader({
  title,
  subtitle,
  actions,
  onBack,
  className,
}: MobilePageHeaderProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  if (!isMobile) return null;

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex items-center gap-2 px-2 h-14 bg-card/95 backdrop-blur-md border-b border-border/30",
        className,
      )}
    >
      <button
        onClick={() => (onBack ? onBack() : navigate(-1))}
        className="p-2 rounded-lg hover:bg-muted active:scale-95 transition-transform shrink-0"
        aria-label="Voltar"
      >
        <ArrowLeft className="w-5 h-5 text-foreground" />
      </button>
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-foreground truncate leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate leading-tight">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
    </header>
  );
}
