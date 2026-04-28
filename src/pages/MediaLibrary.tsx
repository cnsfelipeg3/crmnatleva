/**
 * Mídias — NatLeva Media Library
 * Premium DAM (Digital Asset Management) for curated hotel/place photos.
 */
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search, Image as ImageIcon, Hotel, MapPin, Star, Globe, Plane,
  FolderOpen, ChevronRight, Plus, Upload, Filter, Grid3X3,
  LayoutList, Crown, CheckSquare, Square, X, Maximize2, Eye,
  Camera, Sparkles, Building2, Ticket, Car, RotateCcw, Trash2,
  ChevronLeft, GripVertical, Tag, Clock, User, Info,
} from "lucide-react";
import { SmartImg } from "@/components/ui/SmartImg";

/* ═══ Types ═══ */
interface MediaPlace {
  id: string;
  name: string;
  place_id: string | null;
  place_type: string;
  city: string | null;
  country: string | null;
  address: string | null;
  rating: number | null;
  user_ratings_total: number;
  website: string | null;
  cover_image_url: string | null;
  editorial_summary: string | null;
  created_at: string;
  media_items?: MediaItem[];
}

interface MediaItem {
  id: string;
  place_id: string;
  image_url: string;
  label: string | null;
  image_type: string;
  room_name: string | null;
  is_cover: boolean;
  sort_order: number;
  source: string;
  status: string;
  created_at: string;
}

const PLACE_TYPE_CONFIG: Record<string, { label: string; icon: typeof Hotel; color: string }> = {
  hotel: { label: "Hotéis", icon: Hotel, color: "text-amber-500" },
  attraction: { label: "Atrações", icon: Ticket, color: "text-pink-500" },
  restaurant: { label: "Restaurantes", icon: Building2, color: "text-orange-500" },
  destination: { label: "Destinos", icon: Globe, color: "text-blue-500" },
  airline: { label: "Companhias", icon: Plane, color: "text-primary" },
  transfer: { label: "Transfers", icon: Car, color: "text-green-500" },
  institutional: { label: "NatLeva", icon: Sparkles, color: "text-primary" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  aprovada: { label: "Aprovada", color: "bg-green-500/15 text-green-600 border-green-500/30" },
  capa: { label: "Capa", color: "bg-primary/15 text-primary border-primary/30" },
  quarto: { label: "Quarto", color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  revisao: { label: "Em revisão", color: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  descartada: { label: "Descartada", color: "bg-muted text-muted-foreground border-border" },
  baixa_qualidade: { label: "Baixa qualidade", color: "bg-red-500/15 text-red-600 border-red-500/30" },
  duplicada: { label: "Duplicada", color: "bg-muted text-muted-foreground border-border" },
};

const IMAGE_TYPE_OPTIONS = [
  "fachada", "lobby", "quarto", "suite", "piscina", "restaurante",
  "vista", "exterior", "spa", "bar", "jardim", "geral",
];

/* ═══ Component ═══ */
export default function MediaLibrary() {
  const { user } = useAuth();
  const [places, setPlaces] = useState<MediaPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedPlace, setSelectedPlace] = useState<MediaPlace | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Load places ── */
  const loadPlaces = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("media_places")
      .select("*")
      .order("name");
    if (!error && data) setPlaces(data as unknown as MediaPlace[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadPlaces(); }, [loadPlaces]);

  /* ── Load items for selected place ── */
  const loadItems = useCallback(async (placeId: string) => {
    setLoadingItems(true);
    const { data, error } = await supabase
      .from("media_items")
      .select("*")
      .eq("place_id", placeId)
      .order("sort_order");
    if (!error && data) setItems(data as unknown as MediaItem[]);
    setLoadingItems(false);
  }, []);

  useEffect(() => {
    if (selectedPlace) loadItems(selectedPlace.id);
    else setItems([]);
  }, [selectedPlace, loadItems]);

  /* ── Filtered places ── */
  const filtered = useMemo(() => {
    let list = places;
    if (typeFilter !== "all") list = list.filter(p => p.place_type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.city || "").toLowerCase().includes(q) ||
        (p.country || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [places, typeFilter, search]);

  /* ── Grouped by type → country → city ── */
  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, MediaPlace[]>>();
    filtered.forEach(p => {
      const country = p.country || "Outros";
      const city = p.city || "Sem cidade";
      if (!map.has(country)) map.set(country, new Map());
      const cityMap = map.get(country)!;
      if (!cityMap.has(city)) cityMap.set(city, []);
      cityMap.get(city)!.push(p);
    });
    return map;
  }, [filtered]);

  /* ── Item actions ── */
  const updateItem = async (id: string, updates: Partial<MediaItem>) => {
    const { error } = await supabase
      .from("media_items")
      .update(updates as any)
      .eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const setCover = async (id: string) => {
    if (!selectedPlace) return;
    // Unset all covers
    await supabase.from("media_items").update({ is_cover: false } as any).eq("place_id", selectedPlace.id);
    await supabase.from("media_items").update({ is_cover: true, status: "capa" } as any).eq("id", id);
    setItems(prev => prev.map(i => ({ ...i, is_cover: i.id === id, status: i.id === id ? "capa" : (i.status === "capa" ? "aprovada" : i.status) })));
    // Update place cover
    const item = items.find(i => i.id === id);
    if (item) {
      await supabase.from("media_places").update({ cover_image_url: item.image_url } as any).eq("id", selectedPlace.id);
      setSelectedPlace(prev => prev ? { ...prev, cover_image_url: item.image_url } : null);
    }
    toast.success("Capa definida");
  };

  const deleteItem = async (id: string) => {
    await supabase.from("media_items").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success("Mídia removida");
  };

  const deletePlace = async (placeId: string) => {
    await supabase.from("media_places").delete().eq("id", placeId);
    setPlaces(prev => prev.filter(p => p.id !== placeId));
    setSelectedPlace(null);
    toast.success("Local removido da biblioteca");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedPlace || !e.target.files?.length || !user) return;
    const files = Array.from(e.target.files);
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `media/${selectedPlace.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("media").upload(path, file);
      if (upErr) { toast.error(`Erro ao subir ${file.name}`); continue; }
      const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
      const { error: insErr } = await supabase.from("media_items").insert({
        place_id: selectedPlace.id,
        image_url: urlData.publicUrl,
        storage_path: path,
        label: file.name.replace(/\.[^.]+$/, ""),
        source: "manual",
        status: "revisao",
        sort_order: items.length,
        created_by: user.id,
      } as any);
      if (!insErr) {
        setItems(prev => [...prev, {
          id: crypto.randomUUID(),
          place_id: selectedPlace.id,
          image_url: urlData.publicUrl,
          label: file.name.replace(/\.[^.]+$/, ""),
          image_type: "geral",
          room_name: null,
          is_cover: false,
          sort_order: items.length,
          source: "manual",
          status: "revisao",
          created_at: new Date().toISOString(),
        }]);
      }
    }
    e.target.value = "";
    loadItems(selectedPlace.id);
    toast.success(`${files.length} arquivo(s) enviado(s)`);
  };

  /* ═══════════════════════════════════════════════════════ */
  /* ═══ Place Detail View ═══ */
  /* ═══════════════════════════════════════════════════════ */
  if (selectedPlace) {
    const coverItem = items.find(i => i.is_cover);
    const approvedItems = items.filter(i => !["descartada", "baixa_qualidade", "duplicada"].includes(i.status));
    const roomItems = items.filter(i => i.image_type === "quarto" || i.image_type === "suite");
    const otherItems = items.filter(i => i.image_type !== "quarto" && i.image_type !== "suite");

    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Back + Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedPlace(null)} className="gap-1.5">
            <ChevronLeft className="h-4 w-4" /> Biblioteca
          </Button>
        </div>

        {/* Place Hero */}
        <div className="relative rounded-2xl overflow-hidden border border-border bg-card shadow-lg">
          {coverItem ? (
            <div className="h-48 sm:h-64 relative">
              <SmartImg src={coverItem.image_url} alt="" displayWidth={1200} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h1 className="text-2xl font-bold text-white">{selectedPlace.name}</h1>
                <p className="text-white/70 text-sm flex items-center gap-1.5 mt-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {[selectedPlace.city, selectedPlace.country].filter(Boolean).join(", ") || selectedPlace.address}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  {selectedPlace.rating && (
                    <Badge className="bg-white/20 text-white border-white/20 backdrop-blur-sm gap-1">
                      <Star className="h-3 w-3 fill-warning text-warning" /> {Number(selectedPlace.rating).toFixed(1)}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-white/80 border-white/20 backdrop-blur-sm text-[10px]">
                    {PLACE_TYPE_CONFIG[selectedPlace.place_type]?.label || selectedPlace.place_type}
                  </Badge>
                  <Badge variant="outline" className="text-white/80 border-white/20 backdrop-blur-sm text-[10px]">
                    {approvedItems.length} fotos aprovadas
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <h1 className="text-2xl font-bold text-foreground">{selectedPlace.name}</h1>
              <p className="text-muted-foreground text-sm mt-1">
                {[selectedPlace.city, selectedPlace.country].filter(Boolean).join(", ")}
              </p>
            </div>
          )}
        </div>

        {/* Actions bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <ImageIcon className="h-3 w-3" /> {items.length} mídias
            </Badge>
            {coverItem && (
              <Badge className="bg-primary/15 text-primary border-primary/30 gap-1">
                <Crown className="h-3 w-3" /> Capa definida
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Upload
            </Button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
            <Button variant="destructive" size="sm" onClick={() => deletePlace(selectedPlace.id)} className="gap-1.5">
              <Trash2 className="h-3.5 w-3.5" /> Excluir local
            </Button>
          </div>
        </div>

        {/* Photo Gallery */}
        {loadingItems ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-[4/3] rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-6">
            {/* All photos */}
            <div>
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <Camera className="h-4 w-4 text-primary" /> Todas as Fotos
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {items.map((item, idx) => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    onSetCover={() => setCover(item.id)}
                    onDelete={() => deleteItem(item.id)}
                    onExpand={() => setLightboxIdx(idx)}
                    onUpdateLabel={(label) => updateItem(item.id, { label } as any)}
                    onUpdateStatus={(status) => updateItem(item.id, { status } as any)}
                    onUpdateType={(image_type) => updateItem(item.id, { image_type } as any)}
                  />
                ))}
              </div>
            </div>

            {/* Room photos section */}
            {roomItems.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <Hotel className="h-4 w-4 text-amber-500" /> Quartos & Suítes
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {roomItems.map((item, idx) => (
                    <MediaCard
                      key={item.id}
                      item={item}
                      onSetCover={() => setCover(item.id)}
                      onDelete={() => deleteItem(item.id)}
                      onExpand={() => setLightboxIdx(items.indexOf(item))}
                      onUpdateLabel={(label) => updateItem(item.id, { label } as any)}
                      onUpdateStatus={(status) => updateItem(item.id, { status } as any)}
                      onUpdateType={(image_type) => updateItem(item.id, { image_type } as any)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <ImageIcon className="h-16 w-16 text-muted-foreground/15 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Sem mídias ainda</h3>
            <p className="text-sm text-muted-foreground mb-4">Adicione fotos via upload ou importe do Google Places</p>
            <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="h-4 w-4" /> Enviar fotos
            </Button>
          </div>
        )}

        {/* Lightbox */}
        <Dialog open={lightboxIdx !== null} onOpenChange={() => setLightboxIdx(null)}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border-none">
            {lightboxIdx !== null && items[lightboxIdx] && (
              <div className="relative">
                <SmartImg src={items[lightboxIdx].image_url} alt={items[lightboxIdx].label || ""} displayWidth={1600} loading="eager" className="w-full max-h-[80vh] object-contain" />
                <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white text-sm font-semibold">{items[lightboxIdx].label || `Foto ${lightboxIdx + 1}`}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={cn("text-[9px]", STATUS_CONFIG[items[lightboxIdx].status]?.color)}>
                      {STATUS_CONFIG[items[lightboxIdx].status]?.label || items[lightboxIdx].status}
                    </Badge>
                    <span className="text-white/50 text-xs">{items[lightboxIdx].image_type} · {items[lightboxIdx].source}</span>
                  </div>
                </div>
                {lightboxIdx > 0 && (
                  <button onClick={() => setLightboxIdx(i => i !== null ? i - 1 : null)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}
                {lightboxIdx < items.length - 1 && (
                  <button onClick={() => setLightboxIdx(i => i !== null ? i + 1 : null)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════ */
  /* ═══ Library Overview ═══ */
  /* ═══════════════════════════════════════════════════════ */
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ImageIcon className="h-5 w-5 text-primary" />
            </div>
            Mídias
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Biblioteca visual da NatLeva · {places.length} locais</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por hotel, cidade, país..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-muted/50 rounded-xl p-1 border border-border/50">
          <button
            onClick={() => setTypeFilter("all")}
            className={cn(
              "h-8 px-3 rounded-lg text-xs font-medium transition-all",
              typeFilter === "all" ? "bg-background text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Todos
          </button>
          {Object.entries(PLACE_TYPE_CONFIG).slice(0, 4).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              className={cn(
                "h-8 px-3 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                typeFilter === key ? "bg-background text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <cfg.icon className="h-3 w-3" /> {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {Object.entries(PLACE_TYPE_CONFIG).map(([key, cfg]) => {
          const count = places.filter(p => p.place_type === key).length;
          return (
            <button
              key={key}
              onClick={() => setTypeFilter(key === typeFilter ? "all" : key)}
              className={cn(
                "flex items-center gap-2 p-3 rounded-xl border transition-all text-left",
                typeFilter === key ? "bg-primary/5 border-primary/30" : "bg-card border-border/50 hover:border-border"
              )}
            >
              <cfg.icon className={cn("h-4 w-4", cfg.color)} />
              <div>
                <p className="text-lg font-bold text-foreground leading-none">{count}</p>
                <p className="text-[10px] text-muted-foreground">{cfg.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Places grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-[4/3] rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div>
          {Array.from(grouped.entries()).map(([country, cityMap]) => (
            <div key={country} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">{country}</h2>
                <div className="flex-1 h-px bg-border/30" />
              </div>
              {Array.from(cityMap.entries()).map(([city, cityPlaces]) => (
                <div key={city} className="mb-4">
                  <div className="flex items-center gap-2 mb-2 pl-4">
                    <MapPin className="h-3 w-3 text-muted-foreground/60" />
                    <span className="text-xs font-semibold text-muted-foreground">{city}</span>
                    <Badge variant="secondary" className="text-[9px] h-4">{cityPlaces.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pl-4">
                    {cityPlaces.map(place => {
                      const cfg = PLACE_TYPE_CONFIG[place.place_type] || PLACE_TYPE_CONFIG.hotel;
                      return (
                        <button
                          key={place.id}
                          onClick={() => setSelectedPlace(place)}
                          className="group text-left rounded-2xl border border-border/50 bg-card overflow-hidden hover:shadow-lg hover:border-border transition-all"
                        >
                          <div className="aspect-[16/10] bg-muted/30 relative overflow-hidden">
                            {place.cover_image_url ? (
                              <SmartImg src={place.cover_image_url} alt="" displayWidth={320} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <cfg.icon className={cn("h-10 w-10", cfg.color, "opacity-20")} />
                              </div>
                            )}
                            <div className="absolute top-2 right-2">
                              <Badge variant="secondary" className="text-[9px] h-4 bg-background/80 backdrop-blur-sm">
                                {cfg.label}
                              </Badge>
                            </div>
                          </div>
                          <div className="p-3">
                            <p className="text-sm font-semibold text-foreground truncate">{place.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {[place.city, place.country].filter(Boolean).join(", ")}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              {place.rating && (
                                <span className="text-xs text-warning flex items-center gap-0.5 font-semibold">
                                  <Star className="h-3 w-3 fill-warning" /> {Number(place.rating).toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <ImageIcon className="h-20 w-20 text-muted-foreground/10 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Biblioteca vazia</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            As mídias serão adicionadas automaticamente quando você salvar fotos do Construtor de Propostas, ou faça upload manual.
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══ Media Card Sub-component ═══ */
function MediaCard({
  item, onSetCover, onDelete, onExpand, onUpdateLabel, onUpdateStatus, onUpdateType,
}: {
  item: MediaItem;
  onSetCover: () => void;
  onDelete: () => void;
  onExpand: () => void;
  onUpdateLabel: (label: string) => void;
  onUpdateStatus: (status: string) => void;
  onUpdateType: (type: string) => void;
}) {
  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.aprovada;

  return (
    <div className={cn(
      "group rounded-xl overflow-hidden border-2 transition-all",
      item.is_cover
        ? "border-primary ring-2 ring-primary/20 shadow-md"
        : "border-border/30 hover:border-border"
    )}>
      <div className="aspect-[4/3] bg-muted/20 relative">
        <SmartImg src={item.image_url} alt={item.label || ""} displayWidth={320} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Cover badge */}
        {item.is_cover && (
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-10">
            <Badge className="bg-primary text-primary-foreground text-[8px] h-4 px-1.5 gap-0.5 shadow-md">
              <Crown className="h-2.5 w-2.5" /> CAPA
            </Badge>
          </div>
        )}

        {/* Status */}
        <div className="absolute top-1.5 left-1.5">
          <Badge className={cn("text-[8px] h-4 px-1.5", statusCfg.color)}>{statusCfg.label}</Badge>
        </div>

        {/* Actions */}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onExpand} className="w-6 h-6 rounded-md bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60">
            <Maximize2 className="h-3 w-3 text-white" />
          </button>
          <button onClick={onDelete} className="w-6 h-6 rounded-md bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-destructive/80">
            <X className="h-3 w-3 text-white" />
          </button>
        </div>

        {/* Bottom: Set cover */}
        {!item.is_cover && (
          <div className="absolute bottom-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onSetCover} className="text-[9px] font-medium text-white bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-md hover:bg-primary/80 transition-colors flex items-center gap-1">
              <Crown className="h-2.5 w-2.5" /> Definir capa
            </button>
          </div>
        )}

        {/* Source badge */}
        <div className="absolute bottom-1.5 right-1.5">
          <Badge variant="secondary" className="text-[8px] h-4 px-1.5 bg-background/80 backdrop-blur-sm">
            {item.source === "google" ? "Google" : item.source === "manual" ? "Upload" : item.source}
          </Badge>
        </div>
      </div>

      {/* Label + type */}
      <div className="px-2 py-1.5 bg-card space-y-1">
        <input
          type="text"
          value={item.label || ""}
          onChange={(e) => onUpdateLabel(e.target.value)}
          className="w-full text-[10px] font-medium text-foreground bg-transparent outline-none placeholder:text-muted-foreground/40 truncate"
          placeholder="Legenda..."
        />
        <div className="flex items-center gap-1">
          <select
            value={item.image_type}
            onChange={(e) => onUpdateType(e.target.value)}
            className="text-[9px] bg-muted/50 border border-border/30 rounded px-1 py-0.5 text-muted-foreground outline-none"
          >
            {IMAGE_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={item.status}
            onChange={(e) => onUpdateStatus(e.target.value)}
            className="text-[9px] bg-muted/50 border border-border/30 rounded px-1 py-0.5 text-muted-foreground outline-none"
          >
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
