import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  /** Altura máxima como % da viewport (default 88) */
  maxHeight?: number;
  className?: string;
  hideClose?: boolean;
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  maxHeight = 88,
  className,
  hideClose,
}: BottomSheetProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild>
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 32, stiffness: 320 }}
                className={cn(
                  "fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-card border-t border-border shadow-2xl",
                  className,
                )}
                style={{
                  maxHeight: `${maxHeight}dvh`,
                  paddingBottom: "env(safe-area-inset-bottom)",
                }}
              >
                <div className="flex justify-center pt-2 pb-1 shrink-0">
                  <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
                </div>

                {(title || description) && (
                  <div className="flex items-start justify-between gap-3 px-5 pt-2 pb-3 border-b border-border/50 shrink-0">
                    <div className="min-w-0 flex-1">
                      {title && (
                        <DialogPrimitive.Title className="text-base font-semibold text-foreground">
                          {title}
                        </DialogPrimitive.Title>
                      )}
                      {description && (
                        <DialogPrimitive.Description className="text-sm text-muted-foreground mt-0.5">
                          {description}
                        </DialogPrimitive.Description>
                      )}
                    </div>
                    {!hideClose && (
                      <DialogPrimitive.Close
                        className="p-2 -m-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-95 transition-transform"
                        aria-label="Fechar"
                      >
                        <X className="w-5 h-5" />
                      </DialogPrimitive.Close>
                    )}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto scroll-momentum px-5 py-4">
                  {children}
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
