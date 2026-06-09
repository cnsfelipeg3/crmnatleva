import { useState, useDeferredValue, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, Eye, Copy, ExternalLink, MoreHorizontal, FileText, LayoutTemplate, Bot, Calendar as CalendarIcon, User, Trash2, CopyPlus, BarChart3, Lock, Plane, MapPin, Users as UsersIcon, DollarSign, TrendingUp, X, SlidersHorizontal, Check } from "lucide-react";
import { countProposalCompleteness, PROPOSAL_TOTAL_FIELDS } from "@/lib/briefingProposalBridge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { getPublicProposalUrl } from "@/lib/publicUrl";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import orlandoFamilyCover from "@/assets/proposals/orlando-family-cover.jpg";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const BROKEN_COVER_HINTS = ["1575362018928-f5b56f627e3e"];

const defaultCovers: Record<string, string> = {
  orlando: orlandoFamilyCover,
  disney: orlandoFamilyCover,
  família: orlandoFamilyCover,
  familia: orlandoFamilyCover,
  paris: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=400&fit=crop&q=80",
  santorini: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&h=400&fit=crop&q=80",
  maldivas: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&h=400&fit=crop&q=80",
  europa: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&h=400&fit=crop&q=80",
  safari: "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&h=400&fit=crop&q=80",
  japão: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&h=400&fit=crop&q=80",
  japao: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&h=400&fit=crop&q=80",
  tóquio: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&h=400&fit=crop&q=80",
  patagônia: "https://images.unsplash.com/photo-1478827536114-da961b7f86d2?w=800&h=400&fit=crop&q=80",
  patagonia: "https://images.unsplash.com/photo-1478827536114-da961b7f86d2?w=800&h=400&fit=crop&q=80",
  default: "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&h=400&fit=crop&q=80",
};

function getFallbackCover(proposal: any): string {
  const title = (proposal.title || "").toLowerCase();
  const dests = (proposal.destinations || []).map((d: string) => d.toLowerCase()).join(" ");
  const combined = `${title} ${dests}`;

  if (proposal.slug === "familia-orlando-2026") {
    return orlandoFamilyCover;
  }

  for (const [key, url] of Object.entries(defaultCovers)) {
    if (key !== "default" && combined.includes(key)) return url;
  }

  return defaultCovers.default;
}

function isBrokenCoverUrl(url?: string | null): boolean {
  if (!url || !url.startsWith("http")) return true;
  return BROKEN_COVER_HINTS.some((hint) => url.includes(hint));
}

function getCoverImage(proposal: any): string {
  if (proposal.slug === "familia-orlando-2026") {
    return orlandoFamilyCover;
  }

  if (!isBrokenCoverUrl(proposal.cover_image_url)) {
    return proposal.cover_image_url;
  }

  return getFallbackCover(proposal);
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  rascunho_ia: { label: "🤖 Rascunho IA", variant: "outline" },
  draft: { label: "Em elaboração", variant: "secondary" },
  sent: { label: "Enviada", variant: "default" },
  negotiation: { label: "Em negociação", variant: "outline" },
  approved: { label: "Aprovada", variant: "default" },
  lost: { label: "Perdida", variant: "destructive" },
};

export default function Proposals() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data: proposals, isLoading } = useQuery({
    queryKey: ["proposals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const creatorIds = useMemo(() => {
    const ids = new Set<string>();
    (proposals || []).forEach((p: any) => { if (p.created_by) ids.add(p.created_by); });
    return Array.from(ids);
  }, [proposals]);

  const { data: creatorsMap } = useQuery({
    queryKey: ["proposals-creators", creatorIds],
    enabled: creatorIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", creatorIds);
      if (error) throw error;
      const map: Record<string, { name: string }> = {};
      (data || []).forEach((u: any) => {
        map[u.id] = { name: u.full_name || u.email || "Usuário" };
      });
      return map;
    },
  });

  // ────────────────────────────────────────────────────────────────
  // Filtros estéticos · alinhados com o padrão Smart Filters
  // ────────────────────────────────────────────────────────────────
  const [travelRange, setTravelRange] = useState<DateRange | undefined>();
  const [sentRange, setSentRange] = useState<DateRange | undefined>();
  const [originSel, setOriginSel] = useState<Set<string>>(new Set());
  const [destSel, setDestSel] = useState<Set<string>>(new Set());
  const [creatorSel, setCreatorSel] = useState<Set<string>>(new Set());
  const [saleMin, setSaleMin] = useState<string>("");
  const [saleMax, setSaleMax] = useState<string>("");
  const [profitMin, setProfitMin] = useState<string>("");
  const [profitMax, setProfitMax] = useState<string>("");

  const originOptions = useMemo(() => {
    const s = new Set<string>();
    (proposals || []).forEach((p: any) => { if (p.origin) s.add(String(p.origin).trim()); });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [proposals]);

  const destinationOptions = useMemo(() => {
    const s = new Set<string>();
    (proposals || []).forEach((p: any) => {
      (p.destinations || []).forEach((d: string) => { if (d) s.add(String(d).trim()); });
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [proposals]);

  const creatorOptions = useMemo(() => {
    const arr = Object.entries(creatorsMap || {}).map(([id, v]: any) => ({ id, name: v.name }));
    arr.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    return arr;
  }, [creatorsMap]);

  const parseMoney = (v: string): number | null => {
    if (!v) return null;
    const n = Number(v.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  const filtered = useMemo(() => {
    const q = deferredSearch.toLowerCase();
    const smin = parseMoney(saleMin);
    const smax = parseMoney(saleMax);
    const pmin = parseMoney(profitMin);
    const pmax = parseMoney(profitMax);

    return proposals?.filter((p: any) => {
      if (q && !(p.title?.toLowerCase().includes(q) || p.client_name?.toLowerCase().includes(q))) return false;

      if (travelRange?.from && p.travel_start_date) {
        const start = new Date(p.travel_start_date + "T00:00:00");
        if (travelRange.from && start < travelRange.from) return false;
        if (travelRange.to) {
          const end = new Date(travelRange.to);
          end.setHours(23, 59, 59, 999);
          if (start > end) return false;
        }
      } else if (travelRange?.from && !p.travel_start_date) {
        return false;
      }

      if (sentRange?.from && p.created_at) {
        const c = new Date(p.created_at);
        if (c < sentRange.from) return false;
        if (sentRange.to) {
          const end = new Date(sentRange.to);
          end.setHours(23, 59, 59, 999);
          if (c > end) return false;
        }
      }

      if (originSel.size > 0 && !originSel.has(String(p.origin || "").trim())) return false;

      if (destSel.size > 0) {
        const dests = (p.destinations || []).map((d: string) => String(d).trim());
        if (!dests.some((d: string) => destSel.has(d))) return false;
      }

      if (creatorSel.size > 0 && !creatorSel.has(p.created_by)) return false;

      const sale = Number(p.total_value);
      if (smin != null && !(Number.isFinite(sale) && sale >= smin)) return false;
      if (smax != null && !(Number.isFinite(sale) && sale <= smax)) return false;

      const profN = Number(p.internal_profit);
      const costN = Number(p.internal_cost);
      const profit = Number.isFinite(profN) ? profN : (Number.isFinite(sale) && Number.isFinite(costN) ? sale - costN : NaN);
      if (pmin != null && !(Number.isFinite(profit) && profit >= pmin)) return false;
      if (pmax != null && !(Number.isFinite(profit) && profit <= pmax)) return false;

      return true;
    });
  }, [proposals, deferredSearch, travelRange, sentRange, originSel, destSel, creatorSel, saleMin, saleMax, profitMin, profitMax]);

  const activeFilterCount =
    (travelRange?.from ? 1 : 0) +
    (sentRange?.from ? 1 : 0) +
    (originSel.size > 0 ? 1 : 0) +
    (destSel.size > 0 ? 1 : 0) +
    (creatorSel.size > 0 ? 1 : 0) +
    (saleMin || saleMax ? 1 : 0) +
    (profitMin || profitMax ? 1 : 0);

  const clearAllFilters = () => {
    setTravelRange(undefined);
    setSentRange(undefined);
    setOriginSel(new Set());
    setDestSel(new Set());
    setCreatorSel(new Set());
    setSaleMin(""); setSaleMax("");
    setProfitMin(""); setProfitMax("");
  };

  const fmtRange = (r?: DateRange) => {
    if (!r?.from) return null;
    const f = format(r.from, "dd MMM", { locale: ptBR });
    if (!r.to) return f;
    return `${f} · ${format(r.to, "dd MMM", { locale: ptBR })}`;
  };

  const copyLink = (slug: string) => {
    const url = getPublicProposalUrl(slug);
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const duplicateProposal = async (id: string) => {
    const t = toast.loading("Duplicando proposta...");
    try {
      const { data: original, error: fetchErr } = await supabase
        .from("proposals")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!original) throw new Error("Proposta não encontrada");

      const { data: { user } } = await supabase.auth.getUser();

      const {
        id: _id,
        created_at: _ca,
        updated_at: _ua,
        views_count: _vc,
        last_viewed_at: _lva,
        slug: _slug,
        public_token: _pt,
        display_id: _did,
        ...rest
      } = original as any;

      const baseSlug = (original.slug || "proposta").replace(/-copia(-\d+)?$/, "");
      const newSlug = `${baseSlug}-copia-${Date.now().toString(36)}`;

      const payload: any = {
        ...rest,
        title: `${original.title || "Proposta"} (Cópia)`,
        slug: newSlug,
        status: "draft",
        created_by: user?.id || original.created_by,
      };

      const { data: inserted, error: insErr } = await supabase
        .from("proposals")
        .insert(payload)
        .select("id")
        .single();
      if (insErr) throw insErr;

      // Duplicar todos os itens da viagem (aéreo, hospedagem, cruzeiro, seguro, anexos, etc.)
      const { data: items, error: itemsErr } = await supabase
        .from("proposal_items")
        .select("item_type, position, title, description, image_url, data")
        .eq("proposal_id", id);
      if (itemsErr) throw itemsErr;

      if (items && items.length > 0) {
        const newItems = items.map((it: any) => ({
          ...it,
          proposal_id: inserted.id,
        }));
        const { error: insItemsErr } = await supabase
          .from("proposal_items")
          .insert(newItems);
        if (insItemsErr) throw insItemsErr;
      }

      toast.success(`Proposta duplicada! ${items?.length || 0} itens copiados`, { id: t });
      await queryClient.invalidateQueries({ queryKey: ["proposals"] });
      navigate(`/propostas/${inserted.id}`);
    } catch (err: any) {
      toast.error("Erro ao duplicar", { id: t, description: err.message });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("proposals").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success("Proposta excluída");
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["proposals"] });
    } catch (err: any) {
      toast.error("Erro ao excluir", { description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif text-foreground">Gerador de Propostas</h1>
          <p className="text-sm text-muted-foreground">Crie propostas visuais premium para seus clientes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate("/propostas/dashboard")} className="gap-2">
            <BarChart3 className="w-4 h-4" /> Dashboard
          </Button>
          <Button variant="outline" onClick={() => navigate("/propostas/modelos")} className="gap-2">
            <LayoutTemplate className="w-4 h-4" /> Gerenciar Modelos
          </Button>
          <Button onClick={() => navigate("/propostas/nova")} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Proposta
          </Button>
        </div>
      </div>

      {/* ─── Toolbar de filtros ─────────────────────────────── */}
      <Card className="p-3 sm:p-4 border-border/70 bg-card/60 backdrop-blur-sm">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 min-w-0 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título ou cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 bg-background"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Data da viagem */}
              <FilterPill
                icon={Plane}
                label="Viagem"
                value={fmtRange(travelRange)}
                active={!!travelRange?.from}
                onClear={() => setTravelRange(undefined)}
              >
                <div className="p-2">
                  <p className="px-2 pt-1 pb-2 text-xs text-muted-foreground">Período da viagem</p>
                  <Calendar
                    mode="range"
                    selected={travelRange}
                    onSelect={setTravelRange}
                    numberOfMonths={2}
                    locale={ptBR}
                  />
                </div>
              </FilterPill>

              {/* Data de envio (created_at) */}
              <FilterPill
                icon={CalendarIcon}
                label="Envio"
                value={fmtRange(sentRange)}
                active={!!sentRange?.from}
                onClear={() => setSentRange(undefined)}
              >
                <div className="p-2">
                  <p className="px-2 pt-1 pb-2 text-xs text-muted-foreground">Quando a proposta foi gerada</p>
                  <Calendar
                    mode="range"
                    selected={sentRange}
                    onSelect={setSentRange}
                    numberOfMonths={2}
                    locale={ptBR}
                  />
                </div>
              </FilterPill>

              {/* Origem */}
              <FilterPill
                icon={MapPin}
                label="Origem"
                value={originSel.size > 0 ? `${originSel.size} selecionada${originSel.size > 1 ? "s" : ""}` : null}
                active={originSel.size > 0}
                onClear={() => setOriginSel(new Set())}
              >
                <MultiCheckList
                  options={originOptions.map(o => ({ id: o, label: o }))}
                  selected={originSel}
                  setSelected={setOriginSel}
                  emptyText="Nenhuma origem cadastrada"
                />
              </FilterPill>

              {/* Destino */}
              <FilterPill
                icon={MapPin}
                label="Destino"
                value={destSel.size > 0 ? `${destSel.size} selecionado${destSel.size > 1 ? "s" : ""}` : null}
                active={destSel.size > 0}
                onClear={() => setDestSel(new Set())}
              >
                <MultiCheckList
                  options={destinationOptions.map(o => ({ id: o, label: o }))}
                  selected={destSel}
                  setSelected={setDestSel}
                  emptyText="Nenhum destino cadastrado"
                />
              </FilterPill>

              {/* Usuário */}
              <FilterPill
                icon={UsersIcon}
                label="Usuário"
                value={creatorSel.size > 0 ? `${creatorSel.size} selecionado${creatorSel.size > 1 ? "s" : ""}` : null}
                active={creatorSel.size > 0}
                onClear={() => setCreatorSel(new Set())}
              >
                <MultiCheckList
                  options={creatorOptions.map(o => ({ id: o.id, label: o.name }))}
                  selected={creatorSel}
                  setSelected={setCreatorSel}
                  emptyText="Sem usuários"
                />
              </FilterPill>

              {/* Valor de venda */}
              <FilterPill
                icon={DollarSign}
                label="Venda"
                value={saleMin || saleMax ? `${saleMin || "0"} · ${saleMax || "∞"}` : null}
                active={!!(saleMin || saleMax)}
                onClear={() => { setSaleMin(""); setSaleMax(""); }}
              >
                <RangeInputs
                  hint="Faixa de valor de venda (R$)"
                  min={saleMin} setMin={setSaleMin}
                  max={saleMax} setMax={setSaleMax}
                />
              </FilterPill>

              {/* Lucro */}
              <FilterPill
                icon={TrendingUp}
                label="Lucro"
                value={profitMin || profitMax ? `${profitMin || "0"} · ${profitMax || "∞"}` : null}
                active={!!(profitMin || profitMax)}
                onClear={() => { setProfitMin(""); setProfitMax(""); }}
              >
                <RangeInputs
                  hint="Faixa de lucro real (R$) · uso interno"
                  min={profitMin} setMin={setProfitMin}
                  max={profitMax} setMax={setProfitMax}
                />
              </FilterPill>

              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-9 px-2.5 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" /> Limpar
                </Button>
              )}
            </div>
          </div>

          {activeFilterCount > 0 && (
            <>
              <Separator />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  {activeFilterCount} filtro{activeFilterCount > 1 ? "s" : ""} ativo{activeFilterCount > 1 ? "s" : ""}
                </span>
                <span className="tabular-nums">
                  {filtered?.length || 0} de {proposals?.length || 0} propostas
                </span>
              </div>
            </>
          )}
        </div>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-5 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-3" />
              <div className="h-3 bg-muted rounded w-1/2 mb-2" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </Card>
          ))}
        </div>
      ) : !filtered?.length ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Nenhuma proposta encontrada</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Crie sua primeira proposta para impressionar seus clientes</p>
          <Button onClick={() => navigate("/propostas/nova")} className="mt-4 gap-2">
            <Plus className="w-4 h-4" /> Criar proposta
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p: any) => {
            const st = statusMap[p.status] || statusMap.draft;
            return (
              <Card
                key={p.id}
                className="group hover:shadow-md transition-all cursor-pointer hover:border-primary/30 overflow-hidden"
                onClick={() => navigate(`/propostas/${p.id}`)}
              >
                <div className="h-36 overflow-hidden relative bg-muted">
                  <img
                    src={getCoverImage(p)}
                    alt={`Capa da proposta ${p.title || "sem título"}`}
                    loading="lazy"
                    width={1600}
                    height={900}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      const target = e.currentTarget;
                      const fallback = getFallbackCover(p);
                      if (target.src !== fallback) {
                        target.src = fallback;
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
                <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{p.title}</p>
                      {p.client_name && <p className="text-sm text-muted-foreground truncate">{p.client_name}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1">
                        {(p as any).quote_request_id && (
                          <Badge variant="info" className="text-[10px]">Portal</Badge>
                        )}
                        <Badge variant={st.variant} className="text-[10px]">{st.label}</Badge>
                      </div>
                      {p.status === "rascunho_ia" && (
                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                          <Bot className="w-2.5 h-2.5" />
                          {countProposalCompleteness(p)}/{PROPOSAL_TOTAL_FIELDS} campos
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {p.destinations?.length > 0 && (
                      <span>{p.destinations.slice(0, 2).join(", ")}{p.destinations.length > 2 ? ` +${p.destinations.length - 2}` : ""}</span>
                    )}
                    {p.travel_start_date && (
                      <span>
                        {format(new Date(p.travel_start_date + "T00:00:00"), "dd MMM yyyy", { locale: ptBR })}
                        {p.travel_end_date && ` — ${format(new Date(p.travel_end_date + "T00:00:00"), "dd MMM yyyy", { locale: ptBR })}`}
                      </span>
                    )}
                  </div>

                  {p.created_at && (
                    <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground/80 pt-1">
                      <span className="flex items-center gap-1 min-w-0">
                        <CalendarIcon className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          Gerada em {format(new Date(p.created_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </span>
                      {p.created_by && (
                        <span className="flex items-center gap-1 shrink-0">
                          <User className="w-3 h-3" />
                          <span className="truncate max-w-[120px]">
                            {creatorsMap?.[p.created_by]?.name || "Usuário"}
                          </span>
                        </span>
                      )}
                    </div>
                  )}

                  {(() => {
                    const sale = Number((p as any).total_value);
                    const costN = Number((p as any).internal_cost);
                    const profN = Number((p as any).internal_profit);
                    const profit = Number.isFinite(profN)
                      ? profN
                      : (Number.isFinite(sale) && Number.isFinite(costN) ? sale - costN : NaN);
                    const hasSale = Number.isFinite(sale) && sale > 0;
                    const hasProfit = Number.isFinite(profit);
                    const margin = hasSale && hasProfit ? (profit / sale) * 100 : null;
                    const profitTone = margin == null
                      ? "text-muted-foreground bg-muted/40 border-border"
                      : margin >= 25 ? "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-800/50"
                      : margin >= 10 ? "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-900/20 dark:border-amber-800/50"
                      : "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-900/20 dark:border-rose-800/50";
                    const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
                    // Custo/Lucro foi introduzido em 09/06/2026. Propostas anteriores
                    // não possuem custo cadastrado, então o lucro seria irreal. Ocultar.
                    const createdAt = (p as any).created_at ? new Date((p as any).created_at) : null;
                    const FEATURE_CUTOFF = new Date("2026-06-09T00:00:00-03:00");
                    const isPreFeature = !createdAt || createdAt < FEATURE_CUTOFF;
                    if (isPreFeature) return null;
                    if (!hasSale && !hasProfit) return null;
                    return (
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground/80">Venda</p>
                          <p className="text-sm font-semibold text-foreground tabular-nums truncate">{hasSale ? fmt(sale) : "—"}</p>
                        </div>
                        <div className="text-right shrink-0" title="Lucro · uso interno">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground/80 flex items-center justify-end gap-1">
                            <Lock className="w-2.5 h-2.5" /> Lucro
                          </p>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-semibold tabular-nums ${profitTone}`}>
                            {hasProfit ? fmt(profit) : "—"}
                            {margin != null && <span className="opacity-70 font-normal">· {margin.toFixed(0)}%</span>}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{p.views_count || 0} visualizações</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); copyLink(p.slug); }}>
                          <Copy className="w-4 h-4 mr-2" /> Copiar link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(`/proposta/${p.slug}`, "_blank"); }}>
                          <ExternalLink className="w-4 h-4 mr-2" /> Ver proposta
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); duplicateProposal(p.id); }}>
                          <CopyPlus className="w-4 h-4 mr-2" /> Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: p.id, title: p.title || "Proposta sem título" }); }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir proposta?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.title}</strong>? Esta ação não pode ser desfeita e o link público deixará de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
