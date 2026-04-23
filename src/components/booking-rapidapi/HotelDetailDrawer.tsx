import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, MapPin, Calendar, Users, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useHotelDetails } from "@/hooks/useBookingRapidApi";
import { HotelGallery } from "./HotelGallery";
import { HotelReviews } from "./HotelReviews";
import { RoomAvailability } from "./RoomAvailability";
import type { BookingHotel } from "./types";

interface Props {
  hotel: BookingHotel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  arrival: string | null;
  departure: string | null;
  adults: number;
  childrenAges: number[];
  rooms: number;
}

export function HotelDetailDrawer({
  hotel,
  open,
  onOpenChange,
  arrival,
  departure,
  adults,
  childrenAges,
  rooms,
}: Props) {
  const { data: details, isLoading } = useHotelDetails(
    hotel?.hotel_id ?? null,
    arrival,
    departure,
    {
      adults,
      children_age: childrenAges.join(","),
      room_qty: rooms,
    },
  );

  if (!hotel) return null;

  const hotelId = hotel.hotel_id;
  const hotelName = hotel.name || "Hotel";

  const copyInfo = async () => {
    const lines = [
      `📍 ${hotelName}`,
      hotel.wishlistName ? `   ${hotel.wishlistName}` : null,
      typeof hotel.reviewScore === "number"
        ? `⭐ Nota: ${hotel.reviewScore.toFixed(1)} ${hotel.reviewScoreWord || ""} (${hotel.reviewCount ?? 0} avaliações)`
        : null,
      arrival && departure ? `📅 ${arrival} → ${departure}` : null,
      `👥 ${adults} adulto(s)${childrenAges.length ? ` + ${childrenAges.length} criança(s)` : ""}, ${rooms} quarto(s)`,
      hotel.priceBreakdown?.grossPrice?.value
        ? `💰 Total: ${hotel.priceBreakdown.grossPrice.currency || ""} ${hotel.priceBreakdown.grossPrice.value.toLocaleString("pt-BR")}`
        : null,
      `🔗 https://www.booking.com/hotel.html?hotel_id=${hotelId}`,
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Informações copiadas!");
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const openOnBooking = () => {
    window.open(
      `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(hotelName)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-4xl overflow-y-auto p-0">
        <div className="p-6 space-y-4">
          <SheetHeader className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 flex-1">
                <SheetTitle className="text-xl">{hotelName}</SheetTitle>
                {hotel.wishlistName && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {hotel.wishlistName}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {typeof hotel.reviewScore === "number" && (
                    <Badge variant="secondary" className="gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {hotel.reviewScore.toFixed(1)} {hotel.reviewScoreWord}
                    </Badge>
                  )}
                  {arrival && departure && (
                    <Badge variant="outline" className="gap-1">
                      <Calendar className="h-3 w-3" />
                      {arrival} → {departure}
                    </Badge>
                  )}
                  <Badge variant="outline" className="gap-1">
                    <Users className="h-3 w-3" />
                    {adults + childrenAges.length} hósp. · {rooms} quarto(s)
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={copyInfo}>
                <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar info
              </Button>
              <Button variant="outline" size="sm" onClick={openOnBooking}>
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Abrir no Booking
              </Button>
            </div>
          </SheetHeader>

          <Tabs defaultValue="photos" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="photos">Fotos</TabsTrigger>
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="rooms">Quartos</TabsTrigger>
              <TabsTrigger value="reviews">Avaliações</TabsTrigger>
            </TabsList>

            <TabsContent value="photos" className="mt-4">
              <HotelGallery hotelId={hotelId} hotelName={hotelName} />
            </TabsContent>

            <TabsContent value="details" className="mt-4">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : details ? (
                <div className="space-y-4">
                  {(details as any).description && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Descrição</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {(details as any).description}
                      </p>
                    </div>
                  )}

                  {Array.isArray((details as any).facilities_block?.facilities) && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Comodidades</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {(details as any).facilities_block.facilities
                          .slice(0, 24)
                          .map((f: any, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-[11px]">
                              {typeof f === "string" ? f : f.name}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}

                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      Ver JSON completo (debug)
                    </summary>
                    <pre className="mt-2 max-h-60 overflow-auto rounded bg-muted p-2 text-[10px]">
                      {JSON.stringify(details, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8">
                  Sem detalhes disponíveis.
                </div>
              )}
            </TabsContent>

            <TabsContent value="rooms" className="mt-4">
              <RoomAvailability hotelId={hotelId} minDate={arrival} maxDate={departure} />
            </TabsContent>

            <TabsContent value="reviews" className="mt-4">
              <HotelReviews hotelId={hotelId} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
