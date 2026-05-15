import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Megaphone, Plus, Pencil, Trash2, Calendar, Eye, X, Info, CheckCircle2,
  AlertTriangle, Sparkles, ExternalLink, Power, PowerOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type Banner = {
  id: string;
  title: string;
  message: string;
  variant: "info" | "sucesso" | "alerta" | "promo";
  link_url: string | null;
  link_label: string | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  dismissible: boolean;
  position: "top" | "bottom";
  created_at: string;
};

const VARIANTS = [
  { value: "info", label: "Informação", icon: Info },
  { value: "sucesso", label: "Sucesso", icon: CheckCircle2 },
  { value: "alerta", label: "Alerta", icon: AlertTriangle },
  { value: "promo", label: "Promoção", icon: Sparkles },
] as const;

const VARIANT_STYLES: Record<string, string> = {
  info: "bg-sky-500/10 border-sky-500/40 text-sky-700 dark:text-sky-300",
  sucesso: "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
  alerta: "bg-amber-500/15 border-amber-500/50 text-amber-800 dark:text-amber-200",
  promo: "bg-fuchsia-500/10 border-fuchsia-500/40 text-fuchsia-700 dark:text-fuchsia-300",
};

function toLocalInput(v?: string | null) {
  if (!v) return "";
  const d = new Date(v);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(v: string) {
  if (!v) return null;
  return new Date(v).toISOString();
}
function fmt(d?: string | null) {
  if (!d) return "-";
  try { return format(parseISO(d), "dd/MM/yy HH:mm", { locale: ptBR }); } catch { return d; }
}

const empty: Partial<Banner> = {
  title: "",
  message: "",
  variant: "info",
  link_url: "",
  link_label: "",
  is_active: true,
  dismissible: true,
  position: "top",
};

export default function Megafone() {
  const [items, setItems] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Banner> | null>(null);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("megafone_banners")
      .select("*")
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing({ ...empty });
    setStartsAt(toLocalInput(new Date().toISOString()));
    setEndsAt("");
  }
  function openEdit(b: Banner) {
    setEditing(b);
    setStartsAt(toLocalInput(b.starts_at));
    setEndsAt(toLocalInput(b.ends_at));
  }
  function close() { setEditing(null); }

  async function save() {
    if (!editing) return;
    if (!editing.title?.trim() || !editing.message?.trim()) {
      toast({ title: "Preencha título e mensagem", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: any = {
      title: editing.title.trim(),
      message: editing.message.trim(),
      variant: editing.variant || "info",
      link_url: editing.link_url?.trim() || null,
      link_label: editing.link_label?.trim() || null,
      starts_at: fromLocalInput(startsAt) || new Date().toISOString(),
      ends_at: fromLocalInput(endsAt),
      is_active: editing.is_active ?? true,
      dismissible: editing.dismissible ?? true,
      position: editing.position || "top",
    };
    let error;
    if ((editing as Banner).id) {
      ({ error } = await (supabase as any)
        .from("megafone_banners").update(payload).eq("id", (editing as Banner).id));
    } else {
      ({ error } = await (supabase as any).from("megafone_banners").insert(payload));
    }
    setSaving(false);
    if (error) {
      toast({ title: "Não rolou salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Banner salvo", description: "Já tá valendo conforme o agendamento." });
    close();
    load();
  }

  async function toggleActive(b: Banner, next: boolean) {
    const { error } = await (supabase as any)
      .from("megafone_banners").update({ is_active: next }).eq("id", b.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setItems((prev) => prev.map((i) => (i.id === b.id ? { ...i, is_active: next } : i)));
  }
  async function remove(b: Banner) {
    if (!window.confirm(`Excluir banner "${b.title}"?`)) return;
    const { error } = await (supabase as any).from("megafone_banners").delete().eq("id", b.id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setItems((prev) => prev.filter((i) => i.id !== b.id));
    toast({ title: "Banner excluído" });
  }

  const previewBanner: Banner | null = useMemo(() => {
    if (!editing) return null;
    return {
      id: "preview",
      title: editing.title || "Título do banner",
      message: editing.message || "Mensagem que vai aparecer pra todo mundo.",
      variant: (editing.variant as any) || "info",
      link_url: editing.link_url || null,
      link_label: editing.link_label || null,
      starts_at: new Date().toISOString(),
      ends_at: null,
      is_active: true,
      dismissible: editing.dismissible ?? true,
      position: (editing.position as any) || "top",
      created_at: new Date().toISOString(),
    };
  }, [editing]);

  const now = Date.now();
  function statusOf(b: Banner): { label: string; tone: string } {
    if (!b.is_active) return { label: "Pausado", tone: "bg-muted text-muted-foreground" };
    const start = new Date(b.starts_at).getTime();
    const end = b.ends_at ? new Date(b.ends_at).getTime() : null;
    if (start > now) return { label: "Agendado", tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300" };
    if (end && end < now) return { label: "Expirado", tone: "bg-muted text-muted-foreground" };
    return { label: "No ar", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" };
  }

  return (
    <div className="min-h-screen">
      <div className="border-b border-border bg-gradient-to-br from-fuchsia-900/40 via-background to-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-2 text-fuchsia-300 text-xs font-medium tracking-widest uppercase mb-2">
            <Megaphone className="w-3.5 h-3.5" /> MegaFone
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl text-foreground leading-tight">Banners pro time todo</h1>
              <p className="text-muted-foreground text-sm mt-2">
                Configure avisos que aparecem na tela de todos os usuários, com agendamento e preview.
              </p>
            </div>
            <Button onClick={openNew} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white">
              <Plus className="w-4 h-4 mr-1.5" /> Novo banner
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {loading ? (
          <div className="text-muted-foreground text-sm">Carregando...</div>
        ) : items.length === 0 ? (
          <Card className="p-12 text-center">
            <Megaphone className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm mb-4">Nenhum banner configurado ainda.</p>
            <Button onClick={openNew}><Plus className="w-4 h-4 mr-1.5" /> Criar primeiro banner</Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((b) => {
              const st = statusOf(b);
              return (
                <Card key={b.id} className="p-4">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className={cn("flex-1 min-w-[260px] rounded-md border px-3 py-2.5", VARIANT_STYLES[b.variant])}>
                      <div className="flex items-center gap-2">
                        <Megaphone className="w-4 h-4 shrink-0" />
                        <div className="font-semibold text-sm text-foreground">{b.title}</div>
                      </div>
                      <div className="text-[13px] text-foreground/85 mt-1 whitespace-pre-wrap">{b.message}</div>
                    </div>
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <Badge className={cn("w-fit", st.tone)}>{st.label}</Badge>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" /> {fmt(b.starts_at)}
                        {b.ends_at && <> · até {fmt(b.ends_at)}</>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(b)}>
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => toggleActive(b, !b.is_active)}>
                          {b.is_active ? <><PowerOff className="w-3.5 h-3.5 mr-1" /> Pausar</> : <><Power className="w-3.5 h-3.5 mr-1" /> Ativar</>}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(b)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Editor modal */}
      {editing && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-background w-full sm:max-w-3xl sm:rounded-xl border border-border max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b border-border px-5 py-3 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-fuchsia-500" />
                <h2 className="font-semibold text-lg">{(editing as Banner).id ? "Editar banner" : "Novo banner"}</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={close}><X className="w-4 h-4" /></Button>
            </div>

            <div className="p-5 space-y-5">
              {/* Preview */}
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 flex items-center gap-1.5">
                  <Eye className="w-3 h-3" /> Preview
                </div>
                {previewBanner && <MegaFoneBannerPreview banner={previewBanner} />}
              </div>

              {/* Variant */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
                  {VARIANTS.map((v) => {
                    const Icon = v.icon;
                    const active = editing.variant === v.value;
                    return (
                      <button
                        key={v.value}
                        onClick={() => setEditing({ ...editing, variant: v.value })}
                        className={cn(
                          "px-3 py-2 rounded-md border text-sm flex items-center gap-1.5 transition-colors",
                          active ? VARIANT_STYLES[v.value] + " border-2" : "border-border bg-background hover:bg-muted"
                        )}
                      >
                        <Icon className="w-4 h-4" /> {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Título</label>
                <Input value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="Ex: Manutenção programada hoje à noite" maxLength={120} className="mt-1.5" />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mensagem</label>
                <Textarea value={editing.message || ""} onChange={(e) => setEditing({ ...editing, message: e.target.value })}
                  placeholder="Detalhe o aviso pro time..." rows={3} maxLength={500} className="mt-1.5" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Link (opcional)</label>
                  <Input value={editing.link_url || ""} onChange={(e) => setEditing({ ...editing, link_url: e.target.value })}
                    placeholder="https://... ou /pagina-interna" className="mt-1.5" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Texto do botão</label>
                  <Input value={editing.link_label || ""} onChange={(e) => setEditing({ ...editing, link_label: e.target.value })}
                    placeholder="Ex: Ver detalhes" className="mt-1.5" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Início</label>
                  <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fim (opcional)</label>
                  <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="mt-1.5" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center justify-between p-3 rounded-md border border-border">
                  <div>
                    <div className="text-sm font-medium">Ativo</div>
                    <div className="text-[11px] text-muted-foreground">Mostrar no app</div>
                  </div>
                  <Switch checked={editing.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-md border border-border">
                  <div>
                    <div className="text-sm font-medium">Dispensável</div>
                    <div className="text-[11px] text-muted-foreground">Usuário pode fechar</div>
                  </div>
                  <Switch checked={editing.dismissible ?? true} onCheckedChange={(v) => setEditing({ ...editing, dismissible: v })} />
                </div>
                <div className="p-3 rounded-md border border-border">
                  <div className="text-sm font-medium mb-1.5">Posição</div>
                  <div className="flex gap-1.5">
                    {(["top", "bottom"] as const).map((p) => (
                      <button key={p} onClick={() => setEditing({ ...editing, position: p })}
                        className={cn("flex-1 px-2 py-1 rounded text-xs border",
                          editing.position === p ? "bg-fuchsia-500 text-white border-fuchsia-500" : "border-border bg-background")}>
                        {p === "top" ? "Topo" : "Rodapé"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-background border-t border-border px-5 py-3 flex justify-end gap-2">
              <Button variant="outline" onClick={close} disabled={saving}>Cancelar</Button>
              <Button onClick={save} disabled={saving} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white">
                {saving ? "Salvando..." : "Salvar banner"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MegaFoneBannerPreview({ banner }: { banner: Banner }) {
  const styles = VARIANT_STYLES[banner.variant] || VARIANT_STYLES.info;
  return (
    <div className={cn("rounded-lg border-2 px-4 py-3 flex items-start gap-3", styles)}>
      <Megaphone className="w-5 h-5 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-foreground">{banner.title}</div>
        <div className="text-[13px] text-foreground/85 mt-0.5 whitespace-pre-wrap">{banner.message}</div>
        {banner.link_url && (
          <a href={banner.link_url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold mt-1.5 underline">
            {banner.link_label || "Saiba mais"} <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      {banner.dismissible && <X className="w-4 h-4 opacity-50 shrink-0" />}
    </div>
  );
}
