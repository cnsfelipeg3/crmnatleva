import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bed, Users, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRoomAvailability } from "@/hooks/useBookingRapidApi";

interface Props {
  hotelId: string | number | null;
  minDate: string | null;
  maxDate: string | null;
}

export function RoomAvailability({ hotelId, minDate, maxDate }: Props) {
  const { data, isLoading, isError } = useRoomAvailability(hotelId, minDate, maxDate);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        Dados de disponibilidade indisponíveis para essas datas.
      </div>
    );
  }

  const rooms: any[] =
    (data as any)?.rooms ||
    (data as any)?.data?.rooms ||
    (Array.isArray(data) ? (data as any[]) : []);

  if (!rooms.length) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        Nenhum quarto disponível para as datas informadas.
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[60vh]">
      <div className="space-y-3 pr-2">
        {rooms.map((room: any, idx: number) => (
          <Card key={idx} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Bed className="h-4 w-4 text-primary" />
                  <div className="text-sm font-semibold">
                    {room.name || room.room_name || `Quarto ${idx + 1}`}
                  </div>
                </div>
                {(room.nb_max_children !== undefined || room.max_occupancy !== undefined) && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    Até {room.max_occupancy ?? room.nb_max_children ?? "?"} pessoas
                  </div>
                )}
                {Array.isArray(room.facilities) && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {room.facilities.slice(0, 6).map((f: any, i: number) => (
                      <Badge key={i} variant="secondary" className="text-[10px] gap-1">
                        <Check className="h-2.5 w-2.5" />
                        {typeof f === "string" ? f : f.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                {room.price && (
                  <div className="text-base font-bold">
                    {room.price.currency || ""}{" "}
                    {typeof room.price.value === "number"
                      ? room.price.value.toLocaleString("pt-BR", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })
                      : "—"}
                  </div>
                )}
                {room.refundable !== undefined && (
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {room.refundable ? "Reembolsável" : "Não reembolsável"}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
