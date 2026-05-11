import { useState, useDeferredValue, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Copy, ExternalLink, MoreHorizontal, FileText, LayoutTemplate, Bot, Calendar, User, Trash2, CopyPlus } from "lucide-react";
import { countProposalCompleteness, PROPOSAL_TOTAL_FIELDS } from "@/lib/briefingProposalBridge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { getPublicProposalUrl } from "@/lib/publicUrl";
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

  const filtered = useMemo(() => {
    const q = deferredSearch.toLowerCase();
    return proposals?.filter(
      (p: any) =>
        !q ||
        p.title?.toLowerCase().includes(q) ||
        p.client_name?.toLowerCase().includes(q)
    );
  }, [proposals, deferredSearch]);

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

      toast.success("Proposta duplicada!", { id: t });
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
          <Button variant="outline" onClick={() => navigate("/propostas/modelos")} className="gap-2">
            <LayoutTemplate className="w-4 h-4" /> Gerenciar Modelos
          </Button>
          <Button onClick={() => navigate("/propostas/nova")} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Proposta
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por título ou cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

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
                        <Calendar className="w-3 h-3 shrink-0" />
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
