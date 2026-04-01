import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface BriefingSectionProps {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function BriefingSection({ icon: Icon, title, children, defaultOpen = true }: BriefingSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-1.5 group">
        <Icon className="w-4 h-4 text-accent shrink-0" />
        <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">{title}</span>
        <div className="flex-1 h-px bg-border/50" />
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 pt-2 pl-6">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
