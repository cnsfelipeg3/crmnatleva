import { Star, ThumbsUp, ThumbsDown, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { useHotelReviews } from "@/hooks/useBookingRapidApi";

interface Props {
  hotelId: string | number | null;
}

export function HotelReviews({ hotelId }: Props) {
  const { data: reviews, isLoading, isError } = useHotelReviews(hotelId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </Card>
        ))}
      </div>
    );
  }

  if (isError || !reviews?.length) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        Nenhuma avaliação disponível.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.slice(0, 10).map((r, idx) => {
        const score = typeof r.score === "number" ? r.score : null;
        const authorName =
          typeof (r as any).author === "object"
            ? (r as any).author?.name
            : (r as any).author_name || "Hóspede";

        return (
          <Card key={idx} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                  {String(authorName).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium">{authorName}</div>
                  {r.date && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {String(r.date)}
                    </div>
                  )}
                </div>
              </div>
              {score !== null && (
                <div className="inline-flex items-center gap-1 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-1 text-xs font-semibold">
                  <Star className="h-3 w-3 fill-current" />
                  {score.toFixed(1)}
                </div>
              )}
            </div>

            {r.title && (
              <div className="text-sm font-medium italic text-foreground">
                "{String(r.title)}"
              </div>
            )}

            {r.pros && (
              <div className="flex items-start gap-2 text-sm">
                <ThumbsUp className="h-3.5 w-3.5 mt-0.5 text-emerald-500 shrink-0" />
                <p className="text-muted-foreground">{String(r.pros)}</p>
              </div>
            )}

            {r.cons && (
              <div className="flex items-start gap-2 text-sm">
                <ThumbsDown className="h-3.5 w-3.5 mt-0.5 text-rose-500 shrink-0" />
                <p className="text-muted-foreground">{String(r.cons)}</p>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
