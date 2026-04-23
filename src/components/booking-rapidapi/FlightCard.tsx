import {
  Plane,
  Clock,
  Luggage,
  Briefcase,
  Tag,
  ArrowRight,
  Award,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  formatMoney,
  formatDuration,
  formatTime,
  formatDateShort,
  dayDiff,
  cabinClassLabel,
  type FlightOffer,
  type FlightSegment,
  type MoneyAmount,
} from "./flightTypes";

interface Props {
  offer: FlightOffer;
  isBest?: boolean;
  isCheapest?: boolean;
  isFastest?: boolean;
  adults?: number;
  onClick?: (offer: FlightOffer) => void;
}

function SegmentRow({
  segment,
  label,
}: {
  segment: FlightSegment;
  label: string;
}) {
  const totalTime = segment.totalTime;
  const legs = segment.legs || [];
  const stops = Math.max(0, legs.length - 1);

  const primaryCarrier = legs[0]?.carriersData?.[0];
  const allCarriers = Array.from(
    new Set(
      legs
        .flatMap((l) => l.carriersData || [])
        .map((c) => c.name)
        .filter(Boolean),
    ),
  );

  const arrivalDayOffset = dayDiff(segment.departureTime, segment.arrivalTime);

  return (
    <div className="flex items-center gap-4 py-3">
      {/* Logo da companhia */}
      <div className="flex w-16 shrink-0 flex-col items-center gap-1">
        {primaryCarrier?.logo ? (
          <img
            src={primaryCarrier.logo}
            alt={primaryCarrier.name}
            className="h-8 w-8 rounded object-contain"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
            <Plane className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>

      {/* Timeline */}
      <div className="flex flex-1 items-center gap-3">
        {/* Origem */}
        <div className="text-center">
          <div className="text-lg font-semibold leading-none text-foreground">
            {formatTime(segment.departureTime)}
          </div>
          <div className="mt-1 font-mono text-xs text-muted-foreground">
            {segment.departureAirport.code}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {formatDateShort(segment.departureTime)}
          </div>
        </div>

        {/* Linha do meio */}
        <div className="flex flex-1 flex-col items-center gap-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDuration(totalTime)}
          </div>
          <div className="relative h-px w-full bg-border">
            <Plane className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-90 text-muted-foreground" />
          </div>
          <div className="text-[11px] font-medium text-muted-foreground">
            {stops === 0 ? "Direto" : `${stops} escala${stops > 1 ? "s" : ""}`}
          </div>
          {stops > 0 && (
            <div className="text-[10px] text-muted-foreground">
              {legs
                .slice(0, -1)
                .map((l) => l.arrivalAirport.code)
                .join(" · ")}
            </div>
          )}
        </div>

        {/* Destino */}
        <div className="text-center">
          <div className="flex items-baseline justify-center gap-0.5 text-lg font-semibold leading-none text-foreground">
            {formatTime(segment.arrivalTime)}
            {arrivalDayOffset > 0 && (
              <span className="text-xs font-medium text-amber-500">
                +{arrivalDayOffset}
              </span>
            )}
          </div>
          <div className="mt-1 font-mono text-xs text-muted-foreground">
            {segment.arrivalAirport.code}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {formatDateShort(segment.arrivalTime)}
          </div>
        </div>
      </div>

      {/* Companhia */}
      {allCarriers[0] && (
        <div className="hidden w-28 shrink-0 text-right md:block">
          <div className="truncate text-xs font-medium text-foreground">
            {allCarriers[0]}
          </div>
          {allCarriers.length > 1 && (
            <div className="text-[10px] text-muted-foreground">
              +{allCarriers.length - 1} parc.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function FlightCard({
  offer,
  isBest,
  isCheapest,
  isFastest,
  adults = 1,
  onClick,
}: Props) {
  const total = offer.priceBreakdown?.total;
  const totalNum = total ? total.units + total.nanos / 1e9 : 0;
  const perAdultNum = adults > 1 && totalNum > 0 ? totalNum / adults : 0;
  const perAdult: MoneyAmount | null =
    perAdultNum > 0 && total
      ? {
          currencyCode: total.currencyCode,
          units: Math.floor(perAdultNum),
          nanos: Math.round((perAdultNum - Math.floor(perAdultNum)) * 1e9),
        }
      : null;

  const fareName = offer.brandedFareInfo?.fareName;
  const cabin = offer.brandedFareInfo?.cabinClass ?? "ECONOMY";

  const baggage = offer.includedProducts?.segments?.[0] || [];
  const hasCabinBag = baggage.some((b) => b.luggageType === "HAND");
  const hasPersonalItem = baggage.some((b) => b.luggageType === "PERSONAL_ITEM");
  const hasCheckedBag = baggage.some((b) => b.luggageType === "CHECKED_IN");

  return (
    <Card
      className="cursor-pointer overflow-hidden transition-all hover:border-primary hover:shadow-md"
      onClick={() => onClick?.(offer)}
    >
      {/* Badges destaque */}
      {(isBest || isCheapest || isFastest) && (
        <div className="flex flex-wrap gap-1.5 border-b border-border bg-muted/40 px-4 py-2">
          {isBest && (
            <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400">
              <Award className="h-3 w-3" /> Melhor escolha
            </Badge>
          )}
          {isCheapest && (
            <Badge className="gap-1 bg-blue-500/15 text-blue-700 hover:bg-blue-500/15 dark:text-blue-400">
              <Tag className="h-3 w-3" /> Mais barato
            </Badge>
          )}
          {isFastest && (
            <Badge className="gap-1 bg-purple-500/15 text-purple-700 hover:bg-purple-500/15 dark:text-purple-400">
              <Clock className="h-3 w-3" /> Mais rápido
            </Badge>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[1fr_auto] md:gap-6">
        {/* Segmentos */}
        <div className="min-w-0 divide-y divide-border">
          {offer.segments.map((seg, idx) => (
            <SegmentRow
              key={idx}
              segment={seg}
              label={
                offer.segments.length > 1
                  ? idx === 0
                    ? "Ida"
                    : "Volta"
                  : "Voo"
              }
            />
          ))}

          {/* Bagagem + classe */}
          <div className="flex flex-wrap items-center gap-1.5 pt-3">
            <Badge variant="outline" className="text-xs">
              {cabinClassLabel(cabin)}
            </Badge>
            {fareName && (
              <Badge variant="outline" className="text-xs">
                Tarifa {fareName}
              </Badge>
            )}
            {hasPersonalItem && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Briefcase className="h-3 w-3" /> Item pessoal
              </Badge>
            )}
            {hasCabinBag && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Briefcase className="h-3 w-3" /> Bagagem de mão
              </Badge>
            )}
            {hasCheckedBag && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Luggage className="h-3 w-3" /> Bagagem despachada
              </Badge>
            )}
          </div>
        </div>

        {/* Preço */}
        <div className="flex flex-col items-end justify-center gap-1 border-t border-border pt-4 md:min-w-[180px] md:border-l md:border-t-0 md:pl-6 md:pt-0">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {adults > 1 ? `Total (${adults} adultos)` : "Preço total"}
          </div>
          <div className="text-2xl font-bold text-primary">
            {formatMoney(total)}
          </div>
          {perAdult && (
            <div className="text-xs text-muted-foreground">
              {formatMoney(perAdult)}/adulto
            </div>
          )}
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
            Ver detalhes <ArrowRight className="h-3 w-3" />
          </div>
        </div>
      </div>
    </Card>
  );
}
