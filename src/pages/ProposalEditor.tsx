import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Save, ExternalLink, Copy, ArrowLeft, Plus, Trash2, GripVertical, Plane, Hotel, Sparkles, MapPin, Search, Eye, ChevronDown, ChevronRight, Check } from "lucide-react";
import { emitLearningEvent, emitProposalOutcome } from "@/lib/learningEvents";
import ProposalPreviewRenderer from "@/components/proposal/ProposalPreviewRenderer";
import PlacesSearchCard, { type PlacesEnrichmentData } from "@/components/proposal/PlacesSearchCard";
import HotelPhotosScraper from "@/components/HotelPhotosScraper";
import ProposalFlightSearch, { type FlightSegmentData } from "@/components/proposal/ProposalFlightSearch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const itemTypeIcons: Record<string, any> = {
  destination: MapPin,
  flight: Plane,
  hotel: Hotel,
  experience: Sparkles,
};

const itemTypeLabels: Record<string, string> = {
  destination: "Destino",
  flight: "Voo",
  hotel: "Hotel",
  experience: "Experiência",
};

function generateSlug() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

export default function ProposalEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const isNew = !id || id === "nova";
  const [searchParams] = useSearchParams();

  // Pre-fill from AI briefing URL params
  const prefillTitle = searchParams.get("title") || "";
  const prefillClientName = searchParams.get("client_name") || "";
  const prefillOrigin = searchParams.get("origin") || "";
  const prefillDests = searchParams.get("destinations")?.split(",").filter(Boolean) || [];
  const prefillStartDate = searchParams.get("start_date") || "";
  const prefillEndDate = searchParams.get("end_date") || "";
  const prefillPax = parseInt(searchParams.get("pax") || "0") || 1;
  const prefillIntro = searchParams.get("intro") || "";
  const prefillNotes = searchParams.get("notes") || "";
  const prefillItinerary = searchParams.get("itinerary") || "";
  const hasAiStructure = searchParams.get("has_structure") === "1";
  const prefillStrategy = searchParams.get("proposal_strategy") || "";

  const defaultIntro = "Preparamos uma experiência exclusiva para sua viagem, combinando destinos icônicos, hospedagens selecionadas e uma logística cuidadosamente planejada.";

  const [form, setForm] = useState({
    title: prefillTitle,
    client_name: prefillClientName,
    origin: prefillOrigin,
    destinations: prefillDests,
    travel_start_date: prefillStartDate,
    travel_end_date: prefillEndDate,
    passenger_count: prefillPax,
    consultant_name: profile?.full_name || "",
    status: "draft",
    intro_text: prefillIntro || defaultIntro,
    cover_image_url: "",
    total_value: "",
    value_per_person: "",
    payment_conditions: [] as { method: string; details: string }[],
    proposal_strategy: prefillStrategy,
    proposal_outcome: "pending",
  });

  const [items, setItems] = useState<any[]>([]);
  const [destInput, setDestInput] = useState("");
  const [placesSearchIdx, setPlacesSearchIdx] = useState<number | null>(null);
  const [collapsedItems, setCollapsedItems] = useState<Set<number>>(new Set());
  const [savingItemIdx, setSavingItemIdx] = useState<number | null>(null);

  const { data: existing } = useQuery({
    queryKey: ["proposal", id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  const { data: existingItems } = useQuery({
    queryKey: ["proposal-items", id],
    queryFn: async () => {
      if (isNew) return [];
      const { data, error } = await supabase
        .from("proposal_items")
        .select("*")
        .eq("proposal_id", id)
        .order("position");
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title || "",
        client_name: existing.client_name || "",
        origin: existing.origin || "",
        destinations: existing.destinations || [],
        travel_start_date: existing.travel_start_date || "",
        travel_end_date: existing.travel_end_date || "",
        passenger_count: existing.passenger_count || 1,
        consultant_name: existing.consultant_name || "",
        status: existing.status || "draft",
        intro_text: existing.intro_text || "",
        cover_image_url: existing.cover_image_url || "",
        total_value: existing.total_value?.toString() || "",
        value_per_person: existing.value_per_person?.toString() || "",
        payment_conditions: (existing.payment_conditions as any[]) || [],
        proposal_strategy: (existing as any).proposal_strategy || "",
        proposal_outcome: (existing as any).proposal_outcome || "pending",
      });
    }
  }, [existing]);

  useEffect(() => {
    if (existingItems) setItems(existingItems);
  }, [existingItems]);

  // Auto-populate items from AI proposal_structure
  useEffect(() => {
    if (!isNew || !hasAiStructure) return;
    try {
      const raw = sessionStorage.getItem("ai_proposal_structure");
      if (!raw) return;
      sessionStorage.removeItem("ai_proposal_structure");
      const structure = JSON.parse(raw);
      const newItems: any[] = [];

      // Destinations
      if (structure.destinations?.length) {
        for (const d of structure.destinations) {
          newItems.push({
            item_type: "destination",
            title: d.name + (d.country ? `, ${d.country}` : ""),
            description: [
              d.nights ? `${d.nights} noites` : null,
              d.highlights,
            ].filter(Boolean).join(" — "),
            image_url: "",
            data: { nights: d.nights, country: d.country },
          });
        }
      }

      // Flights
      if (structure.flights?.length) {
        for (const f of structure.flights) {
          newItems.push({
            item_type: "flight",
            title: `${f.origin} → ${f.destination}`,
            description: [
              f.cabin,
              f.airline,
              f.flight_number,
              f.departure_date ? `Ida: ${f.departure_date}` : null,
              f.return_date ? `Volta: ${f.return_date}` : null,
              f.passengers ? `${f.passengers} pax` : null,
              f.notes,
            ].filter(Boolean).join(" · "),
            image_url: "",
            data: {
              origin: f.origin,
              destination: f.destination,
              departure_date: f.departure_date,
              return_date: f.return_date,
              cabin: f.cabin,
              airline: f.airline,
              flight_number: f.flight_number,
              passengers: f.passengers,
            },
          });
        }
      }

      // Hotels
      if (structure.hotels?.length) {
        for (const h of structure.hotels) {
          newItems.push({
            item_type: "hotel",
            title: h.hotel_name || `Hotel em ${h.city}`,
            description: [
              h.city,
              h.rooms ? `${h.rooms} quarto(s)` : null,
              h.room_type,
              h.board,
              h.checkin ? `Check-in: ${h.checkin}` : null,
              h.checkout ? `Check-out: ${h.checkout}` : null,
              h.notes,
            ].filter(Boolean).join(" · "),
            image_url: "",
            data: {
              city: h.city,
              hotel_name: h.hotel_name,
              rooms: h.rooms,
              checkin: h.checkin,
              checkout: h.checkout,
              room_type: h.room_type,
              board: h.board,
            },
          });
        }
      }

      // Experiences
      if (structure.experiences?.length) {
        for (const e of structure.experiences) {
          newItems.push({
            item_type: "experience",
            title: e.name,
            description: [
              e.city,
              e.description,
              e.duration,
            ].filter(Boolean).join(" — "),
            image_url: "",
            data: { city: e.city, duration: e.duration },
          });
        }
      }

      if (newItems.length > 0) {
        setItems(newItems);
        toast.success(`IA adicionou ${newItems.length} item(ns) à proposta automaticamente`);
      }
    } catch (e) {
      console.error("Error loading AI proposal structure:", e);
    }
  }, [isNew, hasAiStructure]);

  const toggleCollapse = (idx: number) => {
    setCollapsedItems(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const saveItemBlock = async (idx: number) => {
    setSavingItemIdx(idx);
    try {
      await saveMutation.mutateAsync();
      toast.success(`Bloco "${items[idx]?.title || itemTypeLabels[items[idx]?.item_type]}" salvo!`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar bloco");
    } finally {
      setSavingItemIdx(null);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const slug = existing?.slug || generateSlug();
      const payload: Record<string, any> = {
        title: form.title,
        client_name: form.client_name,
        origin: form.origin,
        destinations: form.destinations,
        travel_start_date: form.travel_start_date || null,
        travel_end_date: form.travel_end_date || null,
        passenger_count: form.passenger_count,
        consultant_name: form.consultant_name,
        status: form.status,
        intro_text: form.intro_text,
        cover_image_url: form.cover_image_url,
        total_value: form.total_value ? parseFloat(form.total_value) : null,
        value_per_person: form.value_per_person ? parseFloat(form.value_per_person) : null,
        payment_conditions: form.payment_conditions,
        proposal_strategy: form.proposal_strategy || null,
        proposal_outcome: form.proposal_outcome || "pending",
        slug,
        created_by: user?.id,
        updated_at: new Date().toISOString(),
      };

      let proposalId = id;
      if (isNew) {
        const { data, error } = await supabase.from("proposals").insert(payload as any).select("id").single();
        if (error) throw error;
        proposalId = data.id;
      } else {
        const { error } = await supabase.from("proposals").update(payload as any).eq("id", id);
        if (error) throw error;
      }

      // Save items
      if (!isNew) {
        await supabase.from("proposal_items").delete().eq("proposal_id", proposalId!);
      }
      if (items.length > 0) {
        const itemsPayload = items.map((item, idx) => ({
          proposal_id: proposalId,
          item_type: item.item_type,
          position: idx,
          title: item.title,
          description: item.description,
          image_url: item.image_url,
          data: item.data || {},
        }));
        const { error } = await supabase.from("proposal_items").insert(itemsPayload);
        if (error) throw error;
      }

      return proposalId;
    },
    onSuccess: (proposalId) => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      toast.success("Proposta salva com sucesso!");
      if (isNew) navigate(`/propostas/${proposalId}`, { replace: true });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addDest = () => {
    if (destInput.trim()) {
      setForm((f) => ({ ...f, destinations: [...f.destinations, destInput.trim()] }));
      setDestInput("");
    }
  };

  const removeDest = (idx: number) => {
    setForm((f) => ({ ...f, destinations: f.destinations.filter((_, i) => i !== idx) }));
  };

  const addItem = (type: string) => {
    setItems((prev) => [...prev, { item_type: type, title: "", description: "", image_url: "", data: {} }]);
  };

  const updateItem = (idx: number, field: string, value: any) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const updateItemData = (idx: number, key: string, value: any) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, data: { ...item.data, [key]: value } } : item))
    );
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const addPayment = () => {
    setForm((f) => ({ ...f, payment_conditions: [...f.payment_conditions, { method: "", details: "" }] }));
  };

  const updatePayment = (idx: number, field: string, value: string) => {
    setForm((f) => ({
      ...f,
      payment_conditions: f.payment_conditions.map((p, i) => (i === idx ? { ...p, [field]: value } : p)),
    }));
  };

  const removePayment = (idx: number) => {
    setForm((f) => ({ ...f, payment_conditions: f.payment_conditions.filter((_, i) => i !== idx) }));
  };

  const handlePlacesEnrich = (idx: number, data: PlacesEnrichmentData) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const coverUrl = data.selectedPhotos[data.mainPhotoIndex] || data.selectedPhotos[0] || item.image_url || "";
        return {
          ...item,
          title: data.name,
          description: data.editorial_summary || item.description || "",
          image_url: coverUrl,
          data: {
            ...item.data,
            place_id: data.place_id,
            location: data.address,
            rating: data.rating,
            user_ratings_total: data.user_ratings_total,
            website: data.website,
            phone: data.phone,
            coords: data.location,
            types: data.types,
            photos: data.selectedPhotos,
            allPhotos: data.photos,
            mainPhotoIndex: data.mainPhotoIndex,
            photoLabels: data.photoLabels,
          },
        };
      })
    );
    setPlacesSearchIdx(null);
    toast.success(`"${data.name}" importado com ${data.selectedPhotos.length} foto${data.selectedPhotos.length !== 1 ? "s" : ""}!`);
  };

  const copyLink = () => {
    const slug = existing?.slug;
    if (slug) {
      navigator.clipboard.writeText(`${window.location.origin}/proposta/${slug}`);
      toast.success("Link copiado!");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/propostas")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-serif text-foreground">{isNew ? "Nova Proposta" : "Editar Proposta"}</h1>
            <p className="text-sm text-muted-foreground">Monte uma proposta visual premium</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && existing?.slug && (
            <>
              <Button variant="outline" size="sm" onClick={copyLink} className="gap-1.5">
                <Copy className="w-3.5 h-3.5" /> Link
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.open(`/proposta/${existing.slug}`, "_blank")} className="gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" /> Visualizar
              </Button>
            </>
          )}
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.title} className="gap-1.5">
            <Save className="w-4 h-4" /> Salvar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="items">Itens da Viagem</TabsTrigger>
          <TabsTrigger value="finance">Valores & Pagamento</TabsTrigger>
          <TabsTrigger value="preview" className="gap-1.5">
            <Eye className="w-3.5 h-3.5" /> Preview da Apresentação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Dados da Proposta</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome da viagem *</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Itália Romântica" />
              </div>
              <div className="space-y-1.5">
                <Label>Nome do cliente</Label>
                <Input value={form.client_name} onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))} placeholder="Maria Silva" />
              </div>
              <div className="space-y-1.5">
                <Label>Origem</Label>
                <Input value={form.origin} onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value }))} placeholder="São Paulo" />
              </div>
              <div className="space-y-1.5">
                <Label>Passageiros</Label>
                <Input type="number" min={1} value={form.passenger_count} onChange={(e) => setForm((f) => ({ ...f, passenger_count: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Data início</Label>
                <Input type="date" value={form.travel_start_date} onChange={(e) => setForm((f) => ({ ...f, travel_start_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Data fim</Label>
                <Input type="date" value={form.travel_end_date} onChange={(e) => setForm((f) => ({ ...f, travel_end_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Consultor responsável</Label>
                <Input value={form.consultant_name} onChange={(e) => setForm((f) => ({ ...f, consultant_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Em elaboração</SelectItem>
                    <SelectItem value="sent">Enviada</SelectItem>
                    <SelectItem value="negotiation">Em negociação</SelectItem>
                    <SelectItem value="approved">Aprovada</SelectItem>
                    <SelectItem value="lost">Perdida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Resultado</Label>
                <Select value={form.proposal_outcome} onValueChange={(v) => setForm((f) => ({ ...f, proposal_outcome: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Em aberto</SelectItem>
                    <SelectItem value="won">✅ Ganha</SelectItem>
                    <SelectItem value="lost">❌ Perdida</SelectItem>
                    <SelectItem value="expired">⏰ Expirada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label>URL da imagem de capa</Label>
                <Input value={form.cover_image_url} onChange={(e) => setForm((f) => ({ ...f, cover_image_url: e.target.value }))} placeholder="https://images.unsplash.com/..." />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label>Destinos</Label>
                <div className="flex gap-2">
                  <Input value={destInput} onChange={(e) => setDestInput(e.target.value)} placeholder="Roma" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDest())} />
                  <Button type="button" variant="outline" onClick={addDest}>Adicionar</Button>
                </div>
                {form.destinations.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.destinations.map((d, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 bg-muted px-3 py-1 rounded-full text-sm">
                        {d}
                        <button onClick={() => removeDest(i)} className="text-muted-foreground hover:text-destructive">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label>Texto de introdução</Label>
                <Textarea rows={3} value={form.intro_text} onChange={(e) => setForm((f) => ({ ...f, intro_text: e.target.value }))} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Adicionar:</span>
            {(["destination", "flight", "hotel", "experience"] as const).map((type) => {
              const Icon = itemTypeIcons[type];
              return (
                <Button key={type} variant="outline" size="sm" onClick={() => addItem(type)} className="gap-1.5">
                  <Icon className="w-4 h-4" /> {itemTypeLabels[type]}
                </Button>
              );
            })}
          </div>

          {items.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Adicione destinos, voos, hotéis e experiências à proposta</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {items.map((item, idx) => {
                const Icon = itemTypeIcons[item.item_type] || MapPin;
                const supportsPlaces = ["hotel", "destination", "experience"].includes(item.item_type);
                const hasPlaceData = !!item.data?.place_id;
                const isSearchOpen = placesSearchIdx === idx;
                const isCollapsed = collapsedItems.has(idx);
                const isSaving = savingItemIdx === idx;

                // Summary line for collapsed state
                const summaryParts: string[] = [];
                if (item.title) summaryParts.push(item.title);
                if (item.data?.location) summaryParts.push(item.data.location);
                if (item.data?.stars) summaryParts.push(`${item.data.stars}★`);
                if (item.data?.flight_segments?.length) summaryParts.push(`${item.data.flight_segments.length} trecho(s)`);
                const summaryText = summaryParts.length > 0 ? summaryParts.join(" · ") : `${itemTypeLabels[item.item_type]} sem título`;

                return (
                  <Card key={idx} className="overflow-hidden">
                    {/* Header - always visible */}
                    <div
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => toggleCollapse(idx)}
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground/30 shrink-0" onClick={(e) => e.stopPropagation()} />
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{summaryText}</p>
                        {isCollapsed && item.image_url && (
                          <p className="text-[10px] text-muted-foreground truncate">📷 Imagem definida</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs h-7"
                          disabled={isSaving}
                          onClick={() => saveItemBlock(idx)}
                        >
                          {isSaving ? (
                            <span className="animate-spin w-3 h-3 border-2 border-primary border-t-transparent rounded-full" />
                          ) : (
                            <Save className="w-3 h-3" />
                          )}
                          Salvar
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeItem(idx)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Collapsible content */}
                    {!isCollapsed && (
                      <div className="px-4 pb-4 pt-1 border-t border-border/50 space-y-3">
                        {/* Google Places search button */}
                        {supportsPlaces && !isSearchOpen && (
                          <Button
                            variant={hasPlaceData ? "outline" : "default"}
                            size="sm"
                            onClick={() => setPlacesSearchIdx(idx)}
                            className="gap-1.5 text-xs w-full sm:w-auto"
                          >
                            <Search className="w-3.5 h-3.5" />
                            {hasPlaceData ? "Buscar outro no Google" : "Buscar no Google Places"}
                          </Button>
                        )}

                        {/* Places Search Card */}
                        {isSearchOpen && (
                          <PlacesSearchCard
                            initialQuery={item.title || ""}
                            destinationContext={form.destinations.length > 0 ? form.destinations.join(", ") : undefined}
                            entityType={item.item_type === "hotel" ? "hotel" : item.item_type === "experience" ? "experience" : "destination"}
                            onEnrich={(data) => handlePlacesEnrich(idx, data)}
                            onCancel={() => setPlacesSearchIdx(null)}
                          />
                        )}

                        {/* Enrichment preview */}
                        {hasPlaceData && item.image_url && !isSearchOpen && (
                          <div className="flex items-start gap-3 p-2.5 bg-muted/30 rounded-xl border border-border/50">
                            <div className="w-20 h-14 rounded-lg overflow-hidden shrink-0 bg-muted">
                              <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                              {item.data?.location && (
                                <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                                  <MapPin className="h-2.5 w-2.5 shrink-0" /> {item.data.location}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-0.5">
                                {item.data?.rating && (
                                  <span className="text-[10px] font-medium text-warning flex items-center gap-0.5">
                                    ⭐ {item.data.rating} ({item.data.user_ratings_total})
                                  </span>
                                )}
                                {item.data?.photos?.length > 0 && (
                                  <span className="text-[10px] text-muted-foreground">{item.data.photos.length} fotos</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Standard form fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">{itemTypeLabels[item.item_type]} — Título</Label>
                            <Input value={item.title || ""} onChange={(e) => updateItem(idx, "title", e.target.value)} placeholder={`Nome do ${itemTypeLabels[item.item_type].toLowerCase()}`} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">URL da imagem</Label>
                            <Input value={item.image_url || ""} onChange={(e) => updateItem(idx, "image_url", e.target.value)} placeholder="https://..." />
                          </div>
                          <div className="md:col-span-2 space-y-1">
                            <Label className="text-xs">Descrição</Label>
                            <Textarea rows={2} value={item.description || ""} onChange={(e) => updateItem(idx, "description", e.target.value)} />
                          </div>

                          {/* Type-specific fields */}
                          {item.item_type === "flight" && (
                            <div className="md:col-span-2">
                              <ProposalFlightSearch
                                segments={item.data?.flight_segments || []}
                                onSegmentsChange={(segs) => updateItemData(idx, "flight_segments", segs)}
                              />
                            </div>
                          )}

                          {item.item_type === "hotel" && (
                            <>
                              <div className="space-y-1">
                                <Label className="text-xs">Categoria (estrelas)</Label>
                                <Input value={item.data?.stars || ""} onChange={(e) => updateItemData(idx, "stars", e.target.value)} placeholder="5" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Localização</Label>
                                <Input value={item.data?.location || ""} onChange={(e) => updateItemData(idx, "location", e.target.value)} placeholder="Centro de Roma" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Tipo de quarto</Label>
                                <Input value={item.data?.room_type || ""} onChange={(e) => updateItemData(idx, "room_type", e.target.value)} placeholder="Deluxe Double" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Regime</Label>
                                <Input value={item.data?.meal_plan || ""} onChange={(e) => updateItemData(idx, "meal_plan", e.target.value)} placeholder="Café da manhã incluso" />
                              </div>
                            </>
                          )}

                          {/* Hotel Photos Scraper */}
                          {item.item_type === "hotel" && item.title && (
                            <div className="md:col-span-2">
                              <HotelPhotosScraper
                                hotelName={item.title}
                                hotelCity={item.data?.location || ""}
                                hotelCountry=""
                                onSelectPhotos={(photos) => {
                                  if (photos.length > 0 && !item.image_url) {
                                    updateItem(idx, "image_url", photos[0].url);
                                  }
                                  const existingPhotos = item.data?.official_photos || [];
                                  updateItemData(idx, "official_photos", [...existingPhotos, ...photos]);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="finance" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Resumo Financeiro</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Valor total da viagem (R$)</Label>
                <Input type="number" value={form.total_value} onChange={(e) => setForm((f) => ({ ...f, total_value: e.target.value }))} placeholder="15000.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Valor por pessoa (R$)</Label>
                <Input type="number" value={form.value_per_person} onChange={(e) => setForm((f) => ({ ...f, value_per_person: e.target.value }))} placeholder="7500.00" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Condições de Pagamento</CardTitle>
                <Button variant="outline" size="sm" onClick={addPayment} className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.payment_conditions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma condição de pagamento adicionada</p>
              )}
              {form.payment_conditions.map((p, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <Input value={p.method} onChange={(e) => updatePayment(idx, "method", e.target.value)} placeholder="Pix à vista" className="flex-1" />
                  <Input value={p.details} onChange={(e) => updatePayment(idx, "details", e.target.value)} placeholder="10% de desconto" className="flex-1" />
                  <Button variant="ghost" size="icon" onClick={() => removePayment(idx)} className="shrink-0 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <ProposalPreviewRenderer
            proposal={{
              ...form,
              total_value: form.total_value ? parseFloat(form.total_value) : null,
              value_per_person: form.value_per_person ? parseFloat(form.value_per_person) : null,
            }}
            items={items}
            embedded
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
