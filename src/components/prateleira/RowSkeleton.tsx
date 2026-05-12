import { cn } from "@/lib/utils";

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "shrink-0 w-[68vw] sm:w-[300px] lg:w-[340px] aspect-[16/10] rounded-xl overflow-hidden relative bg-neutral-900 ring-1 ring-white/5",
        className
      )}
      aria-hidden
    >
      {/* Shimmer layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-white/[0.08] to-white/[0.03]" />
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      {/* Top ribbons placeholders */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-2">
        <div className="h-5 w-24 rounded-full bg-white/10" />
        <div className="h-5 w-14 rounded-full bg-white/10" />
      </div>
      {/* Bottom title placeholders */}
      <div className="absolute bottom-0 left-0 right-0 p-3.5 space-y-2">
        <div className="h-2.5 w-16 rounded-full bg-white/10" />
        <div className="h-3.5 w-[85%] rounded bg-white/15" />
        <div className="h-3.5 w-[55%] rounded bg-white/10" />
        <div className="flex items-center justify-between pt-1">
          <div className="h-4 w-20 rounded bg-white/15" />
          <div className="h-3 w-16 rounded bg-white/10" />
        </div>
      </div>
    </div>
  );
}

export function RowSkeleton() {
  return (
    <section className="py-6 sm:py-8" aria-busy="true" aria-label="Carregando viagens">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="space-y-2 mb-3">
          <div className="h-5 w-48 rounded bg-white/10 animate-pulse" />
          <div className="h-3 w-72 rounded bg-white/5 animate-pulse" />
        </div>
      </div>
      <div className="flex gap-4 px-4 sm:px-6 lg:px-10 py-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}
