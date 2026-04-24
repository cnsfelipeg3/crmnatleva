import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { HotelDetailDrawer } from "./HotelDetailDrawer";
import { HotelscomDetailDrawer } from "./HotelscomDetailDrawer";
import {
  SOURCE_LABELS,
  type HotelSource,
  type UnifiedHotelGroup,
  type UnifiedHotelOffer,
} from "./unifiedHotelTypes";
import type { BookingHotel } from "./types";
import type { HotelscomLodgingCard } from "./unifiedHotelTypes";

interface Props {
  group: UnifiedHotelGroup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  arrival: string | null;
  departure: string | null;
  adults: number;
  childrenAges: number[];
  rooms: number;
  /** Aba inicial ("booking" | "hotelscom") */
  initialTab?: HotelSource;
}

const TAB_DOT_CLASS: Record<HotelSource, string> = {
  booking: "bg-blue-500",
  hotelscom: "bg-rose-500",
};

function fmtBRL(value?: number, currency?: string): string {
  if (value === undefined) return "—";
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency || ""} ${value.toFixed(0)}`;
  }
}

export function UnifiedHotelDetailDrawer({
  group,
  open,
  onOpenChange,
  arrival,
  departure,
  adults,
  childrenAges,
  rooms,
  initialTab,
}: Props) {
  // Identificar ofertas por fonte
  const offersBySource = useMemo(() => {
    const map: Partial<Record<HotelSource, UnifiedHotelOffer>> = {};
    if (!group) return map;
    for (const o of group.offers) {
      if (!map[o.source]) map[o.source] = o;
    }
    return map;
  }, [group]);

  const availableSources: HotelSource[] = useMemo(() => {
    const out: HotelSource[] = [];
    if (offersBySource.booking) out.push("booking");
    if (offersBySource.hotelscom) out.push("hotelscom");
    return out;
  }, [offersBySource]);

  const defaultTab: HotelSource =
    initialTab && availableSources.includes(initialTab)
      ? initialTab
      : (availableSources[0] ?? "booking");

  const [tab, setTab] = useState<HotelSource>(defaultTab);

  // Reset da aba quando troca o grupo / abre
  useEffect(() => {
    if (open) setTab(defaultTab);
  }, [open, defaultTab, group?.groupKey]);

  if (!group) return null;

  const bookingOffer = offersBySource.booking;
  const hotelscomOffer = offersBySource.hotelscom;

  // Reconstruir os "raw" pra alimentar os drawers internos
  const bookingHotel = (bookingOffer?.raw ?? null) as BookingHotel | null;
  const hotelscomCard = (hotelscomOffer?.raw ?? null) as HotelscomLodgingCard | null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-hidden p-0 sm:max-w-3xl flex flex-col"
      >
        {/* HEADER UNIFICADO */}
        <SheetHeader className="shrink-0 border-b bg-background p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-base">{group.name}</SheetTitle>
              {group.location && (
                <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{group.location}</span>
                </div>
              )}
            </div>
            {typeof group.reviewScore === "number" && (
              <Badge variant="secondary" className="shrink-0">
                <Star className="mr-1 h-3 w-3 fill-amber-500 text-amber-500" />
                {group.reviewScore.toFixed(1)}
              </Badge>
            )}
          </div>

          {/* Comparativo rápido de preços por fonte */}
          {availableSources.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Comparativo:
              </span>
              {availableSources.map((src) => {
                const offer = offersBySource[src]!;
                const isBest = offer === group.bestOffer;
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setTab(src)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
                      tab === src
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/60",
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full", TAB_DOT_CLASS[src])} />
                    <span className="font-medium">{SOURCE_LABELS[src]}</span>
                    <span
                      className={cn(
                        "font-bold",
                        isBest && "text-emerald-700 dark:text-emerald-400",
                      )}
                    >
                      {fmtBRL(offer.priceTotal, offer.priceCurrency)}
                    </span>
                    {isBest && availableSources.length > 1 && (
                      <Badge className="bg-emerald-600 text-white text-[9px] px-1 py-0 h-4">
                        MELHOR
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </SheetHeader>

        {/* TABS POR FONTE */}
        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as HotelSource)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {availableSources.length > 1 && (
            <TabsList className="mx-4 mt-3 shrink-0 grid grid-cols-2">
              {availableSources.map((src) => (
                <TabsTrigger key={src} value={src} className="gap-2">
                  <span className={cn("h-2 w-2 rounded-full", TAB_DOT_CLASS[src])} />
                  {SOURCE_LABELS[src]}
                </TabsTrigger>
              ))}
            </TabsList>
          )}

          {/* CONTEÚDO BOOKING */}
          {bookingHotel && (
            <TabsContent
              value="booking"
              className="flex-1 overflow-hidden mt-2 data-[state=inactive]:hidden"
              forceMount
            >
              <div className="h-full overflow-hidden">
                <HotelDetailDrawer
                  hotel={bookingHotel}
                  open={true}
                  onOpenChange={() => {}}
                  arrival={arrival}
                  departure={departure}
                  adults={adults}
                  childrenAges={childrenAges}
                  rooms={rooms}
                  embedded
                />
              </div>
            </TabsContent>
          )}

          {/* CONTEÚDO HOTELS.COM */}
          {hotelscomCard && (
            <TabsContent
              value="hotelscom"
              className="flex-1 overflow-hidden mt-2 data-[state=inactive]:hidden"
              forceMount
            >
              <div className="h-full overflow-hidden">
                <HotelscomDetailDrawer
                  card={hotelscomCard}
                  open={true}
                  onOpenChange={() => {}}
                  arrival={arrival}
                  departure={departure}
                  adults={adults}
                  propertyIdComposite={hotelscomOffer?.propertyIdComposite}
                  converted={{
                    priceTotal: hotelscomOffer?.priceTotal,
                    priceStriked: hotelscomOffer?.priceStriked,
                    priceTaxes: hotelscomOffer?.priceTaxes,
                    pricePerNight: hotelscomOffer?.pricePerNight,
                    currency: hotelscomOffer?.priceCurrency,
                  }}
                  embedded
                />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
