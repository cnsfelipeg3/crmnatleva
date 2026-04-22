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
import { Save, ExternalLink, Copy, ArrowLeft, Plus, Trash2, GripVertical, Plane, Hotel, Sparkles, MapPin, Search, Eye, ChevronDown, ChevronRight, Check, BarChart3, Share2, FileDown, Loader2, Image as ImageIcon, X, Star, Pencil, Upload, Train, Car, Bus, Ticket, Ship, Map as MapIcon, ShieldCheck, Package } from "lucide-react";
import { exportProposalPdf, shareProposalLink } from "@/lib/proposalPdfExport";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { emitLearningEvent, emitProposalOutcome } from "@/lib/learningEvents";
import ProposalPreviewRenderer from "@/components/proposal/ProposalPreviewRenderer";
import SplitLayout from "@/components/proposal/editor/SplitLayout";
import VisualCanvasOverlay, { type VisualOverrides } from "@/components/proposal/editor/VisualCanvasOverlay";
import PlacesSearchCard, { type PlacesEnrichmentData } from "@/components/proposal/PlacesSearchCard";
import HotelMediaBrowser from "@/components/hotel-media/HotelMediaBrowser";
import ProposalFlightSearch, { type FlightSegmentData } from "@/components/proposal/ProposalFlightSearch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ProposalAnalyticsPanel from "@/components/proposal/ProposalAnalyticsPanel";
import { AIBookingExtractor, type ExtractItemType } from "@/components/proposal/AIBookingExtractor";
import CoverImageSuggestDialog from "@/components/proposal/CoverImageSuggestDialog";
import AddFlightWizard, { type ItineraryType as WizardItineraryType } from "@/components/proposal/AddFlightWizard";
import { classifyItinerary, assignDirections, getItineraryLabel, type ItineraryType } from "@/lib/itineraryClassifier";
import { buildFlightTitle, buildHotelTitle } from "@/lib/airportCities";

const itemTypeIcons: Record<string, any> = {
  destination: MapPin,
  flight: Plane,
  hotel: Hotel,
  train: Train,
  car: Car,
  transfer: Bus,
  tour: Sparkles,
  ticket: Ticket,
  cruise: Ship,
  experience: Sparkles,
  itinerary: MapIcon,
  insurance: ShieldCheck,
  other: Package,
};

const itemTypeLabels: Record<string, string> = {
  destination: "Destino",
  flight: "Aéreo",
  hotel: "Hospedagem",
  train: "Trem",
  car: "Carro",
  transfer: "Transfer",
  tour: "Passeio",
  ticket: "Ingresso",
  cruise: "Cruzeiro",
  experience: "Experiência",
  itinerary: "Roteiro Personalizado",
  insurance: "Seguro Viagem",
  other: "Outros",
};

// Categorias exibidas como abas verticais dentro de "Itens da Viagem"
const ITEM_CATEGORIES: { value: string; label: string; icon: any }[] = [
  { value: "flight", label: "Aéreo", icon: Plane },
  { value: "hotel", label: "Hospedagens", icon: Hotel },
  { value: "train", label: "Trens", icon: Train },
  { value: "car", label: "Carro", icon: Car },
  { value: "transfer", label: "Transfer", icon: Bus },
  { value: "tour", label: "Passeios", icon: Sparkles },
  { value: "ticket", label: "Ingressos", icon: Ticket },
  { value: "cruise", label: "Cruzeiro", icon: Ship },
  { value: "experience", label: "Experiências", icon: Sparkles },
  { value: "itinerary", label: "Roteiro Personalizado", icon: MapIcon },
  { value: "insurance", label: "Seguro Viagem", icon: ShieldCheck },
  { value: "other", label: "Outros", icon: Package },
];

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
    passengers_adults: prefillPax || 1,
    passengers_children: 0,
    children_ages: [] as number[],
    consultant_name: profile?.full_name || "",
    status: "draft",
    intro_text: prefillIntro || defaultIntro,
    cover_image_url: "",
    total_value: "",
    value_per_person: "",
    payment_conditions: [] as { method: string; details: string }[],
    proposal_strategy: prefillStrategy,
    proposal_outcome: "pending",
    template_id: "" as string,
  });

  const [items, setItems] = useState<any[]>([]);
  const [destInput, setDestInput] = useState("");
  const [placesSearchIdx, setPlacesSearchIdx] = useState<number | null>(null);
  const [collapsedItems, setCollapsedItems] = useState<Set<number>>(new Set());
  const [savingItemIdx, setSavingItemIdx] = useState<number | null>(null);
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [photoEditorIdx, setPhotoEditorIdx] = useState<number | null>(null);
  const [inlineEditEnabled, setInlineEditEnabled] = useState(false);
  const [visualOverrides, setVisualOverrides] = useState<VisualOverrides>({ styles: {}, groups: [] });
  const visualDraftKey = `proposal-visual-draft-${id || "novo"}`;
  const [activeItemCategory, setActiveItemCategory] = useState<string>("flight");
  const [flightWizardOpen, setFlightWizardOpen] = useState(false);

  const { data: templates } = useQuery({
    queryKey: ["proposal_templates_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposal_templates")
        .select("id, name, description, is_default, thumbnail_url, primary_color, accent_color, font_heading, font_body, theme_config, sections")
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const selectedTemplate = (templates || []).find((t: any) => t.id === form.template_id) || null;

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
        passengers_adults: (existing as any).passengers_adults ?? existing.passenger_count ?? 1,
        passengers_children: (existing as any).passengers_children ?? 0,
        children_ages: ((existing as any).children_ages as number[]) || [],
        consultant_name: existing.consultant_name || "",
        status: existing.status || "draft",
        intro_text: existing.intro_text || "",
        cover_image_url: existing.cover_image_url || "",
        total_value: existing.total_value?.toString() || "",
        value_per_person: existing.value_per_person?.toString() || "",
        payment_conditions: (existing.payment_conditions as any[]) || [],
        proposal_strategy: (existing as any).proposal_strategy || "",
        proposal_outcome: (existing as any).proposal_outcome || "pending",
        template_id: (existing as any).template_id || "",
      });
      // Hydrate visual overrides: prefer local draft if present, else DB value.
      try {
        const draft = localStorage.getItem(visualDraftKey);
        if (draft) {
          setVisualOverrides(JSON.parse(draft));
        } else {
          const ov = (existing as any).visual_overrides as VisualOverrides | null;
          if (ov && typeof ov === "object") {
            setVisualOverrides({ styles: ov.styles ?? {}, groups: ov.groups ?? [] });
          }
        }
      } catch { /* ignore */ }
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
        passenger_count: (form.passengers_adults || 0) + (form.passengers_children || 0) || form.passenger_count,
        passengers_adults: form.passengers_adults ?? null,
        passengers_children: form.passengers_children ?? null,
        children_ages: form.children_ages && form.children_ages.length > 0 ? form.children_ages : null,
        consultant_name: form.consultant_name,
        status: form.status,
        intro_text: form.intro_text,
        cover_image_url: form.cover_image_url,
        total_value: form.total_value ? parseFloat(form.total_value) : null,
        value_per_person: form.value_per_person ? parseFloat(form.value_per_person) : null,
        payment_conditions: form.payment_conditions,
        proposal_strategy: form.proposal_strategy || null,
        proposal_outcome: form.proposal_outcome || "pending",
        template_id: form.template_id || null,
        slug,
        created_by: user?.id,
        updated_at: new Date().toISOString(),
        visual_overrides: visualOverrides as any,
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
      try { localStorage.removeItem(visualDraftKey); } catch { /* ignore */ }
      toast.success("Proposta salva com sucesso!");

      // Emit learning events
      if (isNew) {
        emitLearningEvent({
          event_type: "proposal_created",
          proposal_id: proposalId as string,
          strategy_chosen: form.proposal_strategy || undefined,
          destination: form.destinations?.[0] || undefined,
          passenger_count: form.passenger_count,
          created_by: user?.id,
        });
      }

      // If outcome changed from pending to won/lost/expired
      if (form.proposal_outcome !== "pending" && existing?.proposal_outcome !== form.proposal_outcome) {
        emitProposalOutcome({
          proposalId: proposalId as string,
          outcome: form.proposal_outcome as "won" | "lost" | "expired",
          strategy: form.proposal_strategy,
          destination: form.destinations?.[0],
          createdAt: existing?.created_at,
          userId: user?.id,
        });
      }

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

  const applyExtractedItem = (idx: number, extracted: { title?: string; description?: string; data?: Record<string, any> }) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;

        const rawData = extracted.data ?? {};
        const cleanData: Record<string, any> = Object.fromEntries(
          Object.entries(rawData).filter(([, v]) => v !== null && v !== undefined && v !== ""),
        );

        // Normaliza flight_segments para o shape exato do FlightSegmentData
        if (item.item_type === "flight" && Array.isArray(rawData.flight_segments)) {
          const normalized: FlightSegmentData[] = rawData.flight_segments
            .filter((s: any) => s && (s.origin_iata || s.destination_iata))
            .map((s: any, segIdx: number) => {
              const airline = String(s.airline || "").toUpperCase().slice(0, 3);
              const flightNumberRaw = String(s.flight_number || "");
              // Remove prefixo IATA se vier embutido (ex.: "LA8084" -> "8084")
              const flightNumber = flightNumberRaw.replace(/^[A-Z]{2,3}\s*/i, "").trim();
              const dep = String(s.departure_time || "").slice(0, 5);
              const arr = String(s.arrival_time || "").slice(0, 5);
              const date = String(s.departure_date || "").slice(0, 10);
              return {
                airline,
                airline_name: s.airline_name || "",
                flight_number: flightNumber,
                origin_iata: String(s.origin_iata || "").toUpperCase().slice(0, 3),
                destination_iata: String(s.destination_iata || "").toUpperCase().slice(0, 3),
                departure_date: date,
                departure_time: dep,
                arrival_time: arr,
                duration_minutes: Number.isFinite(s.duration_minutes) ? Number(s.duration_minutes) : 0,
                terminal: s.terminal || "",
                arrival_terminal: s.arrival_terminal || "",
                aircraft_type: s.aircraft_type || "",
                notes: s.notes || "",
                direction: s.direction || "ida",
                is_connection: segIdx === 0 ? false : Boolean(s.is_connection ?? true),
                personal_item_included: s.personal_item_included !== false,
                personal_item_weight_kg: Number.isFinite(s.personal_item_weight_kg) ? Number(s.personal_item_weight_kg) : 10,
                carry_on_included: s.carry_on_included !== false,
                carry_on_weight_kg: Number.isFinite(s.carry_on_weight_kg) ? Number(s.carry_on_weight_kg) : 10,
                checked_bags_included: Number.isFinite(s.checked_bags_included) ? Number(s.checked_bags_included) : 0,
                checked_bag_weight_kg: Number.isFinite(s.checked_bag_weight_kg) ? Number(s.checked_bag_weight_kg) : 23,
                baggage_notes: s.baggage_notes || "",
              };
            });

          // Camada determinística: classifica o itinerário via lógica local
          // (evita confiar 100% no que a IA disse e corrige is_connection/direction)
          const classification = classifyItinerary(normalized as any);
          const withDirections = assignDirections(normalized as any, classification) as FlightSegmentData[];

          // Re-marca is_connection com base nas legs (primeiro de cada perna = false)
          const segsByLeg = classification.legs.map((leg) => leg.segments);
          const fixedSegments = withDirections.map((seg) => {
            const legIdx = segsByLeg.findIndex((segs) =>
              segs.some(
                (s: any) =>
                  s.origin_iata === seg.origin_iata &&
                  s.destination_iata === seg.destination_iata &&
                  s.departure_date === seg.departure_date,
              ),
            );
            const leg = legIdx >= 0 ? segsByLeg[legIdx] : null;
            const isFirstOfLeg =
              leg && leg[0]?.origin_iata === seg.origin_iata && leg[0]?.departure_date === seg.departure_date;
            return { ...seg, is_connection: !isFirstOfLeg };
          });

          cleanData.flight_segments = fixedSegments;
          cleanData.itinerary_type = classification.type;
          cleanData.itinerary_open_jaw_type = classification.openJawType;
        }

        // Título descritivo para voo (padrão NatLeva)
        let nextTitle = extracted.title || item.title;
        if (item.item_type === "flight" && Array.isArray(cleanData.flight_segments) && cleanData.flight_segments.length > 0) {
          const segs: FlightSegmentData[] = cleanData.flight_segments;
          const itineraryType: ItineraryType = (cleanData.itinerary_type as ItineraryType) || "ONE_WAY";

          // Para round-trip / open-jaw, usa apenas a perna de ida como referência
          const idaSegs = segs.filter((s: any) => s.direction === "ida");
          const refSegs = idaSegs.length > 0 ? idaSegs : segs;
          const origin = refSegs[0].origin_iata;
          const finalDest = refSegs[refSegs.length - 1].destination_iata;
          if (origin && finalDest) {
            nextTitle = buildFlightTitle(origin, finalDest, itineraryType);
          }
        }

        // Título inteligente para hotel (padrão NatLeva)
        if (item.item_type === "hotel" && cleanData) {
          const hotelName = (extracted.title || cleanData.name || item.title || "").trim();
          const stars = cleanData.stars ? String(cleanData.stars) : "";
          const meal = cleanData.meal_plan || "";
          let city = cleanData.city || "";
          let country = cleanData.country || "";
          if (!city && cleanData.location) {
            const locParts = String(cleanData.location).split(",").map((p) => p.trim());
            city = locParts[0] || "";
            if (locParts.length > 1) country = locParts[locParts.length - 1];
          }
          nextTitle = buildHotelTitle({
            hotelName: hotelName && !hotelName.toLowerCase().startsWith("hospedagem") ? hotelName : undefined,
            city,
            country,
            stars,
            mealPlan: meal,
          });
        }

        return {
          ...item,
          title: nextTitle,
          description: extracted.description || item.description,
          data: { ...(item.data || {}), ...cleanData },
        };
      }),
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

  const [exportingPdf, setExportingPdf] = useState(false);

  const handleShare = async () => {
    const slug = existing?.slug;
    if (!slug) return;
    try {
      const result = await shareProposalLink(slug, form.title || "Proposta");
      toast.success(result === "shared" ? "Proposta compartilhada!" : "Link copiado para a área de transferência!");
    } catch (err: any) {
      toast.error(err.message || "Falha ao compartilhar");
    }
  };

  const handleExportPdf = async () => {
    const slug = existing?.slug;
    if (!slug) {
      toast.error("Salve a proposta antes de exportar");
      return;
    }
    setExportingPdf(true);
    toast.info("Gerando PDF... isso pode levar alguns segundos");
    try {
      await exportProposalPdf(slug, form.title || "proposta");
      toast.success("PDF gerado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Falha ao gerar PDF");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in max-w-[1800px] mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/propostas")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-serif text-foreground">{isNew ? "Nova Proposta" : "Editar Proposta"}</h1>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">Monte uma proposta visual premium</p>
              {!isNew && (existing as any)?.quote_request_id && (
                <Button variant="link" size="sm" className="h-auto p-0 text-xs text-accent" onClick={() => navigate("/cotacoes?tab=portal")}>
                  📬 Ver cotação original
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && existing?.slug && (
            <>
              <Button variant="outline" size="sm" onClick={() => window.open(`/proposta/${existing.slug}`, "_blank")} className="gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" /> Visualizar
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5" disabled={exportingPdf}>
                    {exportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                    Compartilhar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={handleShare} className="gap-2">
                    <Copy className="w-4 h-4" /> Copiar link da proposta
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPdf} className="gap-2" disabled={exportingPdf}>
                    {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                    Exportar em PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.title} className="gap-1.5">
            <Save className="w-4 h-4" /> Salvar
          </Button>
        </div>
      </div>

      <SplitLayout
        left={
          <Tabs defaultValue="info" className="space-y-4">
            <TabsList>
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="items">Itens da Viagem</TabsTrigger>
              <TabsTrigger value="finance">Valores & Pagamento</TabsTrigger>
              <TabsTrigger value="preview" className="gap-1.5 xl:hidden">
                <Eye className="w-3.5 h-3.5" /> Preview
              </TabsTrigger>
              {!isNew && (
                <TabsTrigger value="analytics" className="gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5" /> Analytics
                </TabsTrigger>
              )}
            </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Dados da Proposta</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 1. Nome do cliente */}
              <div className="space-y-1.5">
                <Label>Nome do cliente</Label>
                <Input value={form.client_name} onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))} placeholder="Maria Silva" />
              </div>

              {/* 2. Nome da viagem */}
              <div className="space-y-1.5">
                <Label>Nome da viagem *</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Itália Romântica" />
              </div>

              {/* 3. Imagem de capa */}
              <div className="md:col-span-2 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label>Imagem de capa</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCoverDialogOpen(true)}
                    className="h-7 text-xs text-accent hover:text-accent hover:bg-accent/10"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1" /> Sugerir capa
                  </Button>
                </div>
                <Input value={form.cover_image_url} onChange={(e) => setForm((f) => ({ ...f, cover_image_url: e.target.value }))} placeholder="https://images.unsplash.com/..." />
                {form.cover_image_url && (
                  <div className="mt-2 rounded-lg overflow-hidden border border-border/30 aspect-[16/6]">
                    <img src={form.cover_image_url} alt="Pré-visualização da capa" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* 4. Data início */}
              <div className="space-y-1.5">
                <Label>Data início</Label>
                <Input type="date" value={form.travel_start_date} onChange={(e) => setForm((f) => ({ ...f, travel_start_date: e.target.value }))} />
              </div>

              {/* 5. Data fim */}
              <div className="space-y-1.5">
                <Label>Data fim</Label>
                <Input type="date" value={form.travel_end_date} onChange={(e) => setForm((f) => ({ ...f, travel_end_date: e.target.value }))} />
              </div>

              {/* 6. Passageiros (adultos / crianças / idades) */}
              <div className="md:col-span-2 space-y-3 rounded-lg border border-border/30 bg-muted/20 p-3">
                <Label className="text-sm">Passageiros</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Adultos</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.passengers_adults}
                      onChange={(e) => {
                        const adults = Math.max(0, parseInt(e.target.value) || 0);
                        setForm((f) => ({
                          ...f,
                          passengers_adults: adults,
                          passenger_count: adults + (f.passengers_children || 0),
                        }));
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Crianças</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.passengers_children}
                      onChange={(e) => {
                        const children = Math.max(0, parseInt(e.target.value) || 0);
                        setForm((f) => {
                          const ages = [...(f.children_ages || [])];
                          if (children > ages.length) {
                            while (ages.length < children) ages.push(0);
                          } else {
                            ages.length = children;
                          }
                          return {
                            ...f,
                            passengers_children: children,
                            children_ages: ages,
                            passenger_count: (f.passengers_adults || 0) + children,
                          };
                        });
                      }}
                    />
                  </div>
                </div>
                {form.passengers_children > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Idades das crianças</Label>
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: form.passengers_children }).map((_, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">#{i + 1}</span>
                          <Input
                            type="number"
                            min={0}
                            max={17}
                            className="h-9 w-20"
                            value={form.children_ages?.[i] ?? 0}
                            onChange={(e) => {
                              const v = Math.max(0, Math.min(17, parseInt(e.target.value) || 0));
                              setForm((f) => {
                                const ages = [...(f.children_ages || [])];
                                ages[i] = v;
                                return { ...f, children_ages: ages };
                              });
                            }}
                          />
                          <span className="text-[10px] text-muted-foreground">anos</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Total: {(form.passengers_adults || 0) + (form.passengers_children || 0)} passageiro(s)
                </p>
              </div>

              {/* 7. Texto de introdução */}
              <div className="md:col-span-2 space-y-1.5">
                <Label>Texto de introdução</Label>
                <Textarea rows={3} value={form.intro_text} onChange={(e) => setForm((f) => ({ ...f, intro_text: e.target.value }))} />
              </div>

              {/* 8. Modelo de proposta */}
              <div className="md:col-span-2 space-y-1.5">
                <Label className="flex items-center gap-2">
                  Modelo de proposta
                  <span className="text-xs text-muted-foreground font-normal">(define o tema visual e seções)</span>
                </Label>
                <Select
                  value={form.template_id || "none"}
                  onValueChange={(v) => setForm((f) => ({ ...f, template_id: v === "none" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sem modelo (padrão NatLeva)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem modelo (padrão NatLeva)</SelectItem>
                    {(templates || []).map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}{t.is_default ? " · padrão" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(templates || []).length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhum modelo cadastrado.{" "}
                    <button
                      type="button"
                      onClick={() => navigate("/propostas/modelos")}
                      className="text-accent underline"
                    >
                      Criar modelo
                    </button>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-3">
          <Card className="p-0 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] min-h-[480px]">
              {/* Sidebar de categorias */}
              <div className="border-b md:border-b-0 md:border-r border-border/50 bg-muted/20 p-2 md:p-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
                  Categorias
                </p>
                <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible">
                  {ITEM_CATEGORIES.map((cat) => {
                    const CatIcon = cat.icon;
                    const count = items.filter((it) => it.item_type === cat.value).length;
                    const isActive = activeItemCategory === cat.value;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setActiveItemCategory(cat.value)}
                        className={`shrink-0 md:w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-foreground/80 hover:bg-muted/60"
                        }`}
                      >
                        <CatIcon className="w-3.5 h-3.5 shrink-0" />
                        <span className="flex-1 text-left whitespace-nowrap md:whitespace-normal">{cat.label}</span>
                        {count > 0 && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                              isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/15 text-primary"
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Conteúdo da categoria ativa */}
              <div className="p-3 md:p-4 space-y-3 min-w-0">
                {(() => {
                  const activeCat = ITEM_CATEGORIES.find((c) => c.value === activeItemCategory)!;
                  const ActiveIcon = activeCat.icon;
                  const filteredEntries = items
                    .map((item, idx) => ({ item, idx }))
                    .filter(({ item }) => item.item_type === activeItemCategory);

                  return (
                    <>
                      <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-border/40">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <ActiveIcon className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-foreground">{activeCat.label}</h3>
                            <p className="text-[11px] text-muted-foreground">
                              {filteredEntries.length} item(ns) nesta categoria
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="default"
                          size="sm"
                          className="gap-1.5 h-8"
                          onClick={() => {
                            // Aéreo abre wizard guiado; demais categorias criam item direto
                            if (activeItemCategory === "flight") {
                              setFlightWizardOpen(true);
                              return;
                            }
                            addItem(activeItemCategory);
                            // garante que o novo item fique aberto
                            setCollapsedItems((prev) => {
                              const next = new Set(prev);
                              next.delete(items.length);
                              return next;
                            });
                          }}
                        >
                          <Plus className="w-3.5 h-3.5" /> Adicionar {activeCat.label.toLowerCase()}
                        </Button>
                      </div>

                      {filteredEntries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center py-12 px-4 bg-muted/20 rounded-xl border border-dashed border-border/50">
                          <ActiveIcon className="w-10 h-10 text-muted-foreground/40 mb-2" />
                          <p className="text-sm font-medium text-foreground">Nenhum item de {activeCat.label.toLowerCase()}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Clique em "Adicionar {activeCat.label.toLowerCase()}" para começar
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {filteredEntries.map(({ item, idx }) => {
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

                        {/* AI extractor — voo, hotel e experiência */}
                        {(item.item_type === "flight" || item.item_type === "hotel" || item.item_type === "experience") && (
                          <AIBookingExtractor
                            itemType={item.item_type as ExtractItemType}
                            onExtracted={(data) => applyExtractedItem(idx, data)}
                          />
                        )}

                        {/* Standard form fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">{itemTypeLabels[item.item_type]} — Título</Label>
                            <Input value={item.title || ""} onChange={(e) => updateItem(idx, "title", e.target.value)} placeholder={`Nome do ${(itemTypeLabels[item.item_type] || "item").toLowerCase()}`} />
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
                              {/* ── Photo Gallery Manager ── */}
                              <div className="md:col-span-2 space-y-2 p-3 rounded-xl border border-border/60 bg-muted/20">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4 text-primary" />
                                    <span className="text-xs font-semibold">
                                      Galeria de fotos
                                      {(item.data?.official_photos?.length || 0) > 0 && (
                                        <span className="ml-1.5 text-muted-foreground font-normal">
                                          ({item.data.official_photos.length})
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </div>

                                {/* Thumbnails */}
                                {(item.data?.official_photos?.length || 0) > 0 ? (
                                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
                                    {(item.data.official_photos as any[]).map((photo: any, pIdx: number) => {
                                      const isCover = item.image_url === photo.url;
                                      return (
                                        <div
                                          key={`${photo.url}-${pIdx}`}
                                          className={`relative group aspect-square rounded-md overflow-hidden border ${isCover ? "border-primary ring-2 ring-primary/30" : "border-border/40"} bg-muted`}
                                        >
                                          <img src={photo.url} alt={photo.label || `Foto ${pIdx + 1}`} className="w-full h-full object-cover" loading="lazy" />
                                          {isCover && (
                                            <div className="absolute top-0.5 left-0.5 bg-primary text-primary-foreground text-[8px] font-bold px-1 rounded">
                                              CAPA
                                            </div>
                                          )}
                                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                            {!isCover && (
                                              <button
                                                type="button"
                                                title="Definir como capa"
                                                onClick={() => updateItem(idx, "image_url", photo.url)}
                                                className="p-1 rounded bg-white/20 hover:bg-white/40 text-white"
                                              >
                                                <Star className="w-3 h-3" />
                                              </button>
                                            )}
                                            <button
                                              type="button"
                                              title="Remover foto"
                                              onClick={() => {
                                                const next = (item.data.official_photos as any[]).filter((_, i) => i !== pIdx);
                                                updateItemData(idx, "official_photos", next);
                                                if (isCover) updateItem(idx, "image_url", next[0]?.url || "");
                                              }}
                                              className="p-1 rounded bg-white/20 hover:bg-destructive/80 text-white"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-muted-foreground italic">
                                    Nenhuma foto adicionada. Clique em <strong>Editar fotos</strong> para buscar do site oficial ou adicionar manualmente.
                                  </p>
                                )}

                                {/* Manual photo URL input */}
                                <div className="flex gap-1.5 items-center">
                                  <Input
                                    placeholder="Cole uma URL de imagem e pressione Enter..."
                                    className="h-7 text-xs"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        const url = (e.target as HTMLInputElement).value.trim();
                                        if (!url) return;
                                        const existing = item.data?.official_photos || [];
                                        updateItemData(idx, "official_photos", [...existing, { url, label: "Manual", category: "outros" }]);
                                        if (!item.image_url) updateItem(idx, "image_url", url);
                                        (e.target as HTMLInputElement).value = "";
                                        toast.success("Foto adicionada");
                                      }
                                    }}
                                  />
                                </div>
                              </div>

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
                              <div className="space-y-1">
                                <Label className="text-xs">Check-in</Label>
                                <Input type="date" value={item.data?.checkin_date || ""} onChange={(e) => updateItemData(idx, "checkin_date", e.target.value)} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Check-out</Label>
                                <Input type="date" value={item.data?.checkout_date || ""} onChange={(e) => updateItemData(idx, "checkout_date", e.target.value)} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Horário check-in</Label>
                                <Input type="time" value={item.data?.checkin_time || ""} onChange={(e) => updateItemData(idx, "checkin_time", e.target.value)} placeholder="15:00" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Horário check-out</Label>
                                <Input type="time" value={item.data?.checkout_time || ""} onChange={(e) => updateItemData(idx, "checkout_time", e.target.value)} placeholder="11:00" />
                              </div>
                              <div className="space-y-1 md:col-span-2">
                                <Label className="text-xs">Noites <span className="text-muted-foreground/60">(calculadas automaticamente)</span></Label>
                                <Input
                                  type="number"
                                  value={
                                    item.data?.nights ||
                                    (item.data?.checkin_date && item.data?.checkout_date
                                      ? Math.max(0, Math.round((new Date(item.data.checkout_date).getTime() - new Date(item.data.checkin_date).getTime()) / 86400000))
                                      : "")
                                  }
                                  onChange={(e) => updateItemData(idx, "nights", e.target.value)}
                                  placeholder="0"
                                />
                              </div>
                            </>
                          )}

                          {/* Hotel Media Browser — sempre visível para troca rápida de fotos */}
                          {item.item_type === "hotel" && item.title && (
                            <div className="md:col-span-2 p-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5">
                              <HotelMediaBrowser
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
                                onSelectRoomBlock={(block) => {
                                  updateItemData(idx, "room_block", block);
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
                    </>
                  );
                })()}
              </div>
            </div>
          </Card>
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
            template={selectedTemplate}
            embedded
          />
        </TabsContent>

            {!isNew && id && (
              <TabsContent value="analytics">
                <ProposalAnalyticsPanel proposalId={id} />
              </TabsContent>
            )}
          </Tabs>
        }
        preview={
          <div className="space-y-2">
            <div className="flex items-center justify-end">
              <Button
                type="button"
                size="sm"
                variant={inlineEditEnabled ? "default" : "outline"}
                onClick={() => setInlineEditEnabled((v) => !v)}
                className="gap-1.5 h-7 text-xs"
                title="Editar visualmente clicando nos elementos"
              >
                <Pencil className="w-3.5 h-3.5" />
                {inlineEditEnabled ? "Editando visual" : "Editar visual"}
              </Button>
            </div>
            <VisualCanvasOverlay
              enabled={inlineEditEnabled}
              value={visualOverrides}
              onChange={(next) => {
                setVisualOverrides(next);
                try { localStorage.setItem(visualDraftKey, JSON.stringify(next)); } catch { /* ignore */ }
              }}
            >
              <ProposalPreviewRenderer
                proposal={{
                  ...form,
                  total_value: form.total_value ? parseFloat(form.total_value) : null,
                  value_per_person: form.value_per_person ? parseFloat(form.value_per_person) : null,
                }}
                items={items}
                template={selectedTemplate}
                visualOverrides={visualOverrides}
                embedded
              />
            </VisualCanvasOverlay>
          </div>
        }
      />
      <CoverImageSuggestDialog
        open={coverDialogOpen}
        onOpenChange={setCoverDialogOpen}
        initialDestination={form.title || ""}
        onSelect={(url) => setForm((f) => ({ ...f, cover_image_url: url }))}
      />
    </div>
  );
}
