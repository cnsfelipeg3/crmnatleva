import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-lg border px-3 py-1 text-[10px] font-semibold tracking-wide transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-primary/20 bg-primary/12 text-primary",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "bg-red-600 text-white border-red-600",
        outline: "text-foreground border-border/40",
        premium: "border-champagne/20 bg-champagne/8 text-champagne",
        info: "bg-blue-500 text-white border-blue-500",
        warning: "bg-amber-400 text-gray-900 border-amber-400 font-bold",
        success: "bg-emerald-600 text-white border-emerald-600",
        neutral: "bg-gray-600 text-white border-gray-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
