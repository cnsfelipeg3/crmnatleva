import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import {
  Plane,
  Clock,
  Luggage,
  Briefcase,
  Copy,
  ExternalLink,
  CheckCircle2,
  XCircle,
  DollarSign,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  type FlightOffer,
  type FlightSegment,
  type FlightLeg,
  type LuggageAllowance,
  type BrandedFareFeature,
  type MoneyAmount,
  formatMoney,
  moneyToNumber,
  formatDuration,
  formatTime,
  formatDateShort,
  dayDiff,
  cabinClassLabel,
  FEATURE_CATEGORY_LABELS,
} from "./flightTypes";

interface Props {
  offer: FlightOffer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adults?: number;
}

function LuggageBlock({
  items,
  title,
}: {
  items: LuggageAllowance[];
  title: string;
}) {
  if (!items?.length) return null;
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="space-y-1.5">
        {items.map((l, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            {l.luggageType === "CHECKED_IN" ? (
              <Luggage className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="text-foreground">
              <span className="font-medium">
                {l.luggageType === "CHECKED_IN"
                  ? "Bagagem despachada"
                  : l.luggageType === "HAND"
                    ? "Bagagem de mão"
                    : l.luggageType === "PERSONAL_ITEM"
                      ? "Item pessoal"
                      : l.luggageType}
              </span>
              {l.maxPiece !== undefined && ` · ${l.maxPiece} peça(s)`}
              {l.maxWeightPerPiece !== undefined &&
                ` · até ${l.maxWeightPerPiece}${l.massUnit?.toLowerCase() || ""}`}
              {l.sizeRestrictions?.maxLength && (
                <>
                  {" · "}
                  {l.sizeRestrictions.maxLength}×{l.sizeRestrictions.maxWidth}×
                  {l.sizeRestrictions.maxHeight}{" "}
                  {l.sizeRestrictions.sizeUnit?.toLowerCase()}
                </>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LegDetail({ leg }: { leg: FlightLeg }) {
  const carriers = leg.carriersData || [];
  const mainCarrier = carriers[0];
  const flightNumber =
    leg.flightInfo?.carrierInfo?.marketingCarrier && leg.flightInfo.flightNumber
      ? `${leg.flightInfo.carrierInfo.marketingCarrier} ${leg.flightInfo.flightNumber}`
      : "";
  const arrivalDay = dayDiff(leg.departureTime, leg.arrivalTime);

  return (
    <Card className="p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {mainCarrier?.logo && (
            <img
              src={mainCarrier.logo}
              alt={mainCarrier.name}
              className="h-7 w-7 rounded object-contain"
            />
          )}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium">
              {mainCarrier?.name || "Companhia"}
              {flightNumber && (
                <span className="font-mono text-xs text-muted-foreground">
                  · Voo {flightNumber}
                </span>
              )}
            </div>
            {carriers.length > 1 && (
              <div className="text-[11px] text-muted-foreground">
                Operado por {carriers[1]?.name}
              </div>
            )}
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {cabinClassLabel(leg.cabinClass)}
        </Badge>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="text-left">
          <div className="text-xl font-semibold">{formatTime(leg.departureTime)}</div>
          <div className="font-mono text-xs text-muted-foreground">
            {leg.departureAirport.code}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {leg.departureAirport.cityName}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {formatDateShort(leg.departureTime)}
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="text-[11px] font-medium text-muted-foreground">
            {formatDuration(leg.totalTime)}
          </div>
          <div className="flex items-center gap-1">
            <div className="h-px w-8 bg-border" />
            <Plane className="h-3 w-3 rotate-90 text-muted-foreground" />
            <div className="h-px w-8 bg-border" />
          </div>
          {leg.flightInfo?.planeType && (
            <div className="text-[10px] text-muted-foreground">
              {leg.flightInfo.planeType}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="flex items-baseline justify-end gap-0.5 text-xl font-semibold">
            {formatTime(leg.arrivalTime)}
            {arrivalDay > 0 && (
              <span className="text-xs text-amber-500">+{arrivalDay}</span>
            )}
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            {leg.arrivalAirport.code}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {leg.arrivalAirport.cityName}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {formatDateShort(leg.arrivalTime)}
          </div>
        </div>
      </div>
    </Card>
  );
}

function SegmentDetail({
  segment,
  label,
}: {
  segment: FlightSegment;
  label: string;
}) {
  const legs = segment.legs || [];
  const stops = Math.max(0, legs.length - 1);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{label}</h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {formatDuration(segment.totalTime)}
          <span>·</span>
          {stops === 0
            ? "Voo direto"
            : `${stops} escala${stops > 1 ? "s" : ""}`}
        </div>
      </div>

      {legs.map((leg, idx) => (
        <div key={idx} className="space-y-2">
          <LegDetail leg={leg} />
          {idx < legs.length - 1 && (
            <div className="flex items-center gap-2 px-3 text-xs text-amber-700 dark:text-amber-400">
              <Clock className="h-3 w-3" />
              Escala em {leg.arrivalAirport.cityName} ({leg.arrivalAirport.code})
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function FlightDetailDrawer({
  offer,
  open,
  onOpenChange,
  adults = 1,
}: Props) {
  if (!offer) return null;

  const total = offer.priceBreakdown?.total;
  const baseFare = offer.priceBreakdown?.baseFare;
  const tax = offer.priceBreakdown?.tax;
  const fee = offer.priceBreakdown?.fee;
  const discount = offer.priceBreakdown?.discount;

  const totalN = moneyToNumber(total) ?? 0;
  const perAdultN = adults > 0 && totalN > 0 ? totalN / adults : 0;
  const perAdult: MoneyAmount | null =
    perAdultN > 0 && total
      ? {
          currencyCode: total.currencyCode,
          units: Math.floor(perAdultN),
          nanos: Math.round((perAdultN - Math.floor(perAdultN)) * 1e9),
        }
      : null;

  const firstSeg = offer.segments[0];
  const lastSeg = offer.segments[offer.segments.length - 1];

  const features = offer.brandedFareInfo?.features || [];
  const byCategory = features.reduce(
    (acc, f) => {
      const cat = f.category || "OUTROS";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(f);
      return acc;
    },
    {} as Record<string, BrandedFareFeature[]>,
  );

  const copyInfo = async () => {
    const lines: (string | null)[] = [
      `✈️ ${firstSeg.departureAirport.code} → ${firstSeg.arrivalAirport.code}${
        offer.segments.length > 1 ? ` → ${lastSeg.arrivalAirport.code}` : ""
      }`,
    ];

    offer.segments.forEach((seg, idx) => {
      const legs = seg.legs || [];
      const stops = Math.max(0, legs.length - 1);
      const carrierName = legs[0]?.carriersData?.[0]?.name ?? "";
      lines.push(
        `${idx === 0 ? "🛫 Ida" : "🛬 Volta"}: ${formatDateShort(seg.departureTime)} ${formatTime(seg.departureTime)} ${seg.departureAirport.code} → ${formatTime(seg.arrivalTime)} ${seg.arrivalAirport.code} · ${formatDuration(seg.totalTime)} · ${stops === 0 ? "direto" : stops + " escala(s)"} · ${carrierName}`,
      );
    });

    lines.push(
      `🎫 Classe: ${cabinClassLabel(offer.brandedFareInfo?.cabinClass)}${
        offer.brandedFareInfo?.fareName
          ? ` (${offer.brandedFareInfo.fareName})`
          : ""
      }`,
    );

    const baggage = offer.includedProducts?.segments?.[0] || [];
    if (baggage.length) {
      const items = baggage
        .map((l) => {
          if (l.luggageType === "PERSONAL_ITEM") return "Item pessoal";
          if (l.luggageType === "HAND") return "Bagagem de mão";
          if (l.luggageType === "CHECKED_IN") return "Bagagem despachada";
          return l.luggageType;
        })
        .filter(Boolean);
      lines.push(`🧳 Inclui: ${items.join(" + ")}`);
    }

    if (totalN > 0) {
      lines.push(
        `💰 Total${adults > 1 ? ` (${adults} adultos)` : ""}: ${formatMoney(total)}`,
      );
    }
    if (perAdult) {
      lines.push(`   ~ ${formatMoney(perAdult)}/adulto`);
    }
    lines.push(`🔗 Reserve em booking.com/flights`);

    try {
      await navigator.clipboard.writeText(
        lines.filter(Boolean).join("\n"),
      );
      toast.success("Informações copiadas!");
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const openOnBooking = () => {
    const url = `https://flights.booking.com/flights/${firstSeg.departureAirport.code}-${lastSeg.arrivalAirport.code}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-2xl overflow-hidden p-0 sm:max-w-2xl">
        <ScrollArea className="h-full">
          <div className="space-y-5 p-6">
            {/* Header */}
            <SheetHeader className="space-y-3 text-left">
              <SheetTitle className="flex items-center gap-2 text-xl">
                <Plane className="h-5 w-5 text-primary" />
                <span className="font-mono">{firstSeg.departureAirport.code}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono">{firstSeg.arrivalAirport.code}</span>
                {offer.segments.length > 1 && (
                  <>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono">{lastSeg.arrivalAirport.code}</span>
                  </>
                )}
              </SheetTitle>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDateShort(firstSeg.departureTime)}
                  {offer.segments.length > 1 &&
                    ` → ${formatDateShort(lastSeg.departureTime)}`}
                </span>
                <Badge variant="outline" className="text-xs">
                  {cabinClassLabel(offer.brandedFareInfo?.cabinClass)}
                </Badge>
                {offer.brandedFareInfo?.fareName && (
                  <Badge variant="outline" className="text-xs">
                    Tarifa {offer.brandedFareInfo.fareName}
                  </Badge>
                )}
                {adults > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {adults} {adults === 1 ? "adulto" : "adultos"}
                  </Badge>
                )}
              </div>

              {/* Breakdown */}
              {total && (
                <Card className="p-4">
                  <div className="space-y-1.5 text-sm">
                    {baseFare && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tarifa base</span>
                        <span>{formatMoney(baseFare)}</span>
                      </div>
                    )}
                    {tax && (moneyToNumber(tax) ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Impostos</span>
                        <span className="text-muted-foreground">
                          + {formatMoney(tax)}
                        </span>
                      </div>
                    )}
                    {fee && (moneyToNumber(fee) ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Taxas</span>
                        <span className="text-muted-foreground">
                          + {formatMoney(fee)}
                        </span>
                      </div>
                    )}
                    {discount && (moneyToNumber(discount) ?? 0) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Desconto</span>
                        <span className="text-emerald-600">
                          − {formatMoney(discount)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-border pt-2">
                      <span className="font-medium">Total</span>
                      <span className="text-lg font-bold text-primary">
                        {formatMoney(total)}
                      </span>
                    </div>
                    {perAdult && (
                      <div className="text-right text-[11px] text-muted-foreground">
                        ~ {formatMoney(perAdult)}/adulto
                      </div>
                    )}
                  </div>
                </Card>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={copyInfo} variant="outline" size="sm" className="gap-1.5">
                  <Copy className="h-3.5 w-3.5" /> Copiar info
                </Button>
                <Button onClick={openOnBooking} size="sm" className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" /> Abrir no Booking
                </Button>
              </div>
            </SheetHeader>

            {/* Tabs */}
            <Tabs defaultValue="flight" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="flight">Voo</TabsTrigger>
                <TabsTrigger value="baggage">Bagagem e tarifa</TabsTrigger>
                <TabsTrigger value="raw">Dados</TabsTrigger>
              </TabsList>

              <TabsContent value="flight" className="space-y-4 pt-4">
                {offer.segments.map((seg, idx) => (
                  <SegmentDetail
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
              </TabsContent>

              <TabsContent value="baggage" className="space-y-5 pt-4">
                <Card className="p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Luggage className="h-4 w-4 text-primary" />
                    Bagagem incluída
                  </div>
                  {offer.includedProducts?.areAllSegmentsIdentical ? (
                    <LuggageBlock
                      items={offer.includedProducts?.segments?.[0] || []}
                      title="Por trecho"
                    />
                  ) : (
                    <div className="space-y-4">
                      {offer.includedProducts?.segments?.map((items, idx) => (
                        <LuggageBlock
                          key={idx}
                          items={items}
                          title={`Trecho ${idx + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </Card>

                {features.length > 0 && (
                  <Card className="p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                      <DollarSign className="h-4 w-4 text-primary" />
                      Tarifa {offer.brandedFareInfo?.fareName}
                    </div>
                    <div className="space-y-4">
                      {Object.entries(byCategory).map(([cat, feats]) => (
                        <div key={cat} className="space-y-1.5">
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {FEATURE_CATEGORY_LABELS[cat] || cat}
                          </div>
                          <div className="space-y-1">
                            {feats.map((f, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm">
                                {f.availability === "INCLUDED" ? (
                                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                ) : f.availability === "PAID" ? (
                                  <DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                ) : (
                                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
                                )}
                                <span
                                  className={
                                    f.availability === "NOT_INCLUDED"
                                      ? "text-muted-foreground"
                                      : "text-foreground"
                                  }
                                >
                                  {f.label}
                                  {f.availability === "PAID" && (
                                    <span className="ml-1 text-xs text-amber-600">
                                      (pago)
                                    </span>
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="raw" className="pt-4">
                <Card className="p-3">
                  <details>
                    <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                      Ver JSON bruto da oferta (debug)
                    </summary>
                    <pre className="mt-3 max-h-96 overflow-auto rounded bg-muted p-3 text-[10px]">
                      {JSON.stringify(offer, null, 2)}
                    </pre>
                  </details>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
