import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Plus, Trash2, ChevronDown, Hotel, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import HotelAutocomplete from "@/components/HotelAutocomplete";
import HotelPhotosScraper from "@/components/HotelPhotosScraper";

/* ─── Types ─────────────────────────────────── */

export interface HotelEntry {
  id: string;
  hotel_name: string;
  hotel_city: string;
  hotel_country: string;
  hotel_address: string;
  hotel_lat: number;
  hotel_lng: number;
  hotel_place_id: string;
  hotel_room: string;
  hotel_meal_plan: string;
  hotel_reservation_code: string;
  hotel_checkin_date: string;
  hotel_checkout_date: string;
  hotel_qty_rooms: string;
  // Cost
  emission_type: "milhas" | "pagante";
  supplier_id: string;
  miles_program: string;
  miles_qty: string;
  miles_price: string;
  taxes: string;
  emission_source: string;
  cash_value: string;
}

export function createEmptyHotelEntry(): HotelEntry {
  return {
    id: crypto.randomUUID(),
    hotel_name: "", hotel_city: "", hotel_country: "", hotel_address: "",
    hotel_lat: 0, hotel_lng: 0, hotel_place_id: "",
    hotel_room: "", hotel_meal_plan: "", hotel_reservation_code: "",
    hotel_checkin_date: "", hotel_checkout_date: "", hotel_qty_rooms: "1",
    emission_type: "milhas", supplier_id: "", miles_program: "",
    miles_qty: "", miles_price: "", taxes: "", emission_source: "", cash_value: "",
  };
}

export function calcHotelCost(h: HotelEntry): number {
  if (h.emission_type === "pagante") return parseFloat(h.cash_value) || 0;
  const qty = parseFloat(h.miles_qty) || 0;
  const price = parseFloat(h.miles_price) || 0;
  const taxes = parseFloat(h.taxes) || 0;
  return (qty / 1000) * price + taxes;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* ─── Props ─────────────────────────────────── */

interface Props {
  hotels: HotelEntry[];
  onChange: (hotels: HotelEntry[]) => void;
  suppliers: any[];
  getSupplierPrograms: (supplierId: string) => string[];
  autoFillMilesPrice: (supplierId: string, programName: string, milesQty: string, callback: (price: string) => void) => void;
}

/* ─── Component ─────────────────────────────── */

export default function HotelEntriesEditor({
  hotels, onChange, suppliers, getSupplierPrograms, autoFillMilesPrice,
}: Props) {
  const [expandedHotels, setExpandedHotels] = useState<Set<string>>(new Set(hotels.map(h => h.id)));

  const addHotel = () => {
    const entry = createEmptyHotelEntry();
    onChange([...hotels, entry]);
    setExpandedHotels(prev => new Set([...prev, entry.id]));
  };

  const removeHotel = (id: string) => {
    onChange(hotels.filter(h => h.id !== id));
  };

  const updateHotel = (id: string, field: string, value: any) => {
    onChange(hotels.map(h => {
      if (h.id !== id) return h;
      const updated = { ...h, [field]: value };
      if (field === "emission_type" && value === "pagante") {
        updated.miles_qty = "";
        updated.miles_price = "";
        updated.miles_program = "";
      }
      if (field === "supplier_id") {
        updated.miles_program = "";
        updated.miles_price = "";
      }
      return updated;
    }));
  };

  const toggleExpand = (id: string) => {
    setExpandedHotels(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalCost = hotels.reduce((sum, h) => sum + calcHotelCost(h), 0);

  return (
    <div className="space-y-4">
      {/* Empty state */}
      {hotels.length === 0 && (
        <Card className="p-6">
          <div className="text-center py-8 bg-muted/30 rounded-xl">
            <Hotel className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground mb-2">Nenhuma hospedagem cadastrada</p>
            <p className="text-xs text-muted-foreground mb-4">Adicione uma ou mais hospedagens com seus custos individuais</p>
            <Button onClick={addHotel} size="sm">
              <Plus className="w-4 h-4 mr-2" /> Adicionar Hospedagem
            </Button>
          </div>
        </Card>
      )}

      {/* Hotels */}
      {hotels.map((hotel, hi) => {
        const hotelCost = calcHotelCost(hotel);
        const isExpanded = expandedHotels.has(hotel.id);

        return (
          <Collapsible key={hotel.id} open={isExpanded} onOpenChange={() => toggleExpand(hotel.id)}>
            <Card className="border-border/60 overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Hotel className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {hotel.hotel_name || `Hospedagem ${hi + 1}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {hotel.hotel_city && <><MapPin className="w-3 h-3 inline mr-0.5" />{hotel.hotel_city} • </>}
                        {hotel.hotel_checkin_date && `${hotel.hotel_checkin_date} → ${hotel.hotel_checkout_date || "?"}`}
                        {hotelCost > 0 && ` • ${fmt(hotelCost)}`}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
                </button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="p-4 pt-0 space-y-4 border-t border-border/40">
                  {/* Hotel details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label className="text-xs">Hotel</Label>
                      <HotelAutocomplete
                        value={hotel.hotel_name}
                        onChange={name => updateHotel(hotel.id, "hotel_name", name)}
                        onSelect={h => {
                          updateHotel(hotel.id, "hotel_name", h.name);
                          updateHotel(hotel.id, "hotel_city", h.city);
                          updateHotel(hotel.id, "hotel_country", h.country);
                          updateHotel(hotel.id, "hotel_address", h.address);
                          updateHotel(hotel.id, "hotel_lat", h.lat);
                          updateHotel(hotel.id, "hotel_lng", h.lng);
                          updateHotel(hotel.id, "hotel_place_id", h.place_id);
                        }}
                      />
                      {hotel.hotel_city && (
                        <p className="text-xs text-muted-foreground">📍 {[hotel.hotel_city, hotel.hotel_country].filter(Boolean).join(", ")}</p>
                      )}
                    </div>
                    <div className="space-y-1.5"><Label className="text-xs">Destino</Label><Input className="h-9 text-sm" value={hotel.hotel_city} onChange={e => updateHotel(hotel.id, "hotel_city", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Check-in</Label><Input type="date" className="h-9 text-sm" value={hotel.hotel_checkin_date} onChange={e => updateHotel(hotel.id, "hotel_checkin_date", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Check-out</Label><Input type="date" className="h-9 text-sm" value={hotel.hotel_checkout_date} onChange={e => updateHotel(hotel.id, "hotel_checkout_date", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Qtd Quartos</Label><Input type="number" min={1} className="h-9 text-sm" value={hotel.hotel_qty_rooms} onChange={e => updateHotel(hotel.id, "hotel_qty_rooms", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Tipo de Quarto</Label><Input className="h-9 text-sm" value={hotel.hotel_room} onChange={e => updateHotel(hotel.id, "hotel_room", e.target.value)} placeholder="Duplo, Suite..." /></div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Alimentação</Label>
                      <Select value={hotel.hotel_meal_plan} onValueChange={v => updateHotel(hotel.id, "hotel_meal_plan", v)}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sem alimentação">Sem alimentação</SelectItem>
                          <SelectItem value="Café da manhã">Café da manhã</SelectItem>
                          <SelectItem value="Meia pensão">Meia pensão</SelectItem>
                          <SelectItem value="Pensão completa">Pensão completa</SelectItem>
                          <SelectItem value="All inclusive">All inclusive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5"><Label className="text-xs">Código Reserva</Label><Input className="h-9 text-sm font-mono" value={hotel.hotel_reservation_code} onChange={e => updateHotel(hotel.id, "hotel_reservation_code", e.target.value)} /></div>
                  </div>

                  {/* Cost section */}
                  <div className="border-t border-border/40 pt-4">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">💰 Custo desta hospedagem</h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Fornecedor</Label>
                        <div className="flex gap-2">
                          <Select value={hotel.supplier_id} onValueChange={v => updateHotel(hotel.id, "supplier_id", v)}>
                            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              {suppliers.map((s: any) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button type="button" variant="outline" size="icon" className="shrink-0 h-9 w-9" title="Cadastrar novo fornecedor" onClick={() => window.open("/financeiro/fornecedores", "_blank")}>
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Tipo de Pagamento</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button" size="sm" className="flex-1 h-9 text-xs"
                            variant={hotel.emission_type === "milhas" ? "default" : "outline"}
                            onClick={() => updateHotel(hotel.id, "emission_type", "milhas")}
                          >🎯 Milhas</Button>
                          <Button
                            type="button" size="sm" className="flex-1 h-9 text-xs"
                            variant={hotel.emission_type === "pagante" ? "default" : "outline"}
                            onClick={() => updateHotel(hotel.id, "emission_type", "pagante")}
                          >💰 Pagante</Button>
                        </div>
                      </div>
                    </div>

                    {hotel.emission_type === "milhas" ? (
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Programa de Pontos</Label>
                          <Select
                            value={hotel.miles_program}
                            onValueChange={v => {
                              updateHotel(hotel.id, "miles_program", v);
                              if (hotel.supplier_id && hotel.miles_qty) {
                                autoFillMilesPrice(hotel.supplier_id, v, hotel.miles_qty, (price) => {
                                  updateHotel(hotel.id, "miles_price", price);
                                });
                              }
                            }}
                            disabled={!hotel.supplier_id}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder={hotel.supplier_id ? "Selecione" : "Selecione fornecedor"} />
                            </SelectTrigger>
                            <SelectContent>
                              {hotel.supplier_id && getSupplierPrograms(hotel.supplier_id).map(name => (
                                <SelectItem key={name} value={name}>{name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Qtd Pontos</Label>
                          <Input
                            type="number" className="h-9 text-sm"
                            value={hotel.miles_qty}
                            onChange={e => {
                              updateHotel(hotel.id, "miles_qty", e.target.value);
                              if (hotel.supplier_id && hotel.miles_program) {
                                autoFillMilesPrice(hotel.supplier_id, hotel.miles_program, e.target.value, (price) => {
                                  updateHotel(hotel.id, "miles_price", price);
                                });
                              }
                            }}
                          />
                        </div>
                        <div className="space-y-1.5"><Label className="text-xs">Preço Milheiro R$</Label><Input type="number" step="0.01" className="h-9 text-sm" value={hotel.miles_price} onChange={e => updateHotel(hotel.id, "miles_price", e.target.value)} /></div>
                        <div className="space-y-1.5"><Label className="text-xs">Taxas R$</Label><Input type="number" step="0.01" className="h-9 text-sm" value={hotel.taxes} onChange={e => updateHotel(hotel.id, "taxes", e.target.value)} /></div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="space-y-1.5"><Label className="text-xs">Valor em Dinheiro R$</Label><Input type="number" step="0.01" className="h-9 text-sm" value={hotel.cash_value} onChange={e => updateHotel(hotel.id, "cash_value", e.target.value)} /></div>
                        <div className="space-y-1.5"><Label className="text-xs">Emissão por</Label><Input className="h-9 text-sm" value={hotel.emission_source} onChange={e => updateHotel(hotel.id, "emission_source", e.target.value)} /></div>
                      </div>
                    )}

                    {hotelCost > 0 && (
                      <div className="bg-muted/50 rounded-lg p-3 mt-3 flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Custo desta hospedagem</span>
                        <span className="text-sm font-bold text-primary">{fmt(hotelCost)}</span>
                      </div>
                    )}
                  </div>

                  {/* Remove */}
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" className="text-destructive text-xs" onClick={() => removeHotel(hotel.id)}>
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Remover hospedagem
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        );
      })}

      {/* Add hotel */}
      {hotels.length > 0 && (
        <Button variant="outline" onClick={addHotel} className="w-full">
          <Plus className="w-4 h-4 mr-2" /> Adicionar Hospedagem
        </Button>
      )}

      {/* Total */}
      {totalCost > 0 && (
        <Card className="p-4 bg-primary/5 border-primary/20 flex justify-between items-center">
          <span className="text-sm font-semibold text-muted-foreground">Total Custo Hospedagem</span>
          <span className="text-lg font-bold text-primary">{fmt(totalCost)}</span>
        </Card>
      )}
    </div>
  );
}
