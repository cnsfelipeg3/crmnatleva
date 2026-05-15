import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, X, ExternalLink, Info, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

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
};

const VARIANT_STYLES: Record<string, string> = {
  info: "bg-sky-500/10 border-sky-500/40 text-sky-700 dark:text-sky-300",
  sucesso: "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
  alerta: "bg-amber-500/15 border-amber-500/50 text-amber-800 dark:text-amber-200",
  promo: "bg-fuchsia-500/10 border-fuchsia-500/40 text-fuchsia-700 dark:text-fuchsia-300",
};
const VARIANT_ICONS: Record<string, any> = {
  info: Info, sucesso: CheckCircle2, alerta: AlertTriangle, promo: Sparkles,
};

const STORAGE_KEY = "megafone_dismissed_v1";

function getDismissed(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function addDismissed(id: string) {
  const set = new Set(getDismissed()); set.add(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

export default function MegaFoneBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(getDismissed());

  async function load() {
    const nowIso = new Date().toISOString();
    const { data } = await (supabase as any)
      .from("megafone_banners")
      .select("*")
      .eq("is_active", true)
      .lte("starts_at", nowIso)
      .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
      .order("created_at", { ascending: false });
    setBanners(data || []);
  }

  useEffect(() => {
    load();
    const channel = (supabase as any)
      .channel("megafone_banners_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "megafone_banners" }, () => load())
      .subscribe();
    const tick = setInterval(load, 60_000); // re-checa janela de tempo
    return () => { (supabase as any).removeChannel(channel); clearInterval(tick); };
  }, []);

  function dismiss(id: string) {
    addDismissed(id);
    setDismissed(getDismissed());
  }

  const visible = banners.filter((b) => !dismissed.includes(b.id));
  if (visible.length === 0) return null;

  const top = visible.filter((b) => (b.position || "top") === "top");
  const bottom = visible.filter((b) => b.position === "bottom");

  return (
    <>
      {top.length > 0 && (
        <div className="fixed top-0 left-0 right-0 z-[90] flex flex-col gap-1 p-2 pointer-events-none" style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top))" }}>
          {top.map((b) => <BannerItem key={b.id} banner={b} onDismiss={dismiss} />)}
        </div>
      )}
      {bottom.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-[90] flex flex-col gap-1 p-2 pointer-events-none" style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}>
          {bottom.map((b) => <BannerItem key={b.id} banner={b} onDismiss={dismiss} />)}
        </div>
      )}
    </>
  );
}

function BannerItem({ banner, onDismiss }: { banner: Banner; onDismiss: (id: string) => void }) {
  const styles = VARIANT_STYLES[banner.variant] || VARIANT_STYLES.info;
  const Icon = VARIANT_ICONS[banner.variant] || Megaphone;
  return (
    <div className={cn(
      "pointer-events-auto rounded-lg border-2 px-4 py-2.5 flex items-start gap-3 shadow-lg backdrop-blur-md max-w-5xl mx-auto w-full",
      styles
    )}>
      <Icon className="w-5 h-5 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-foreground leading-tight">{banner.title}</div>
        <div className="text-[13px] text-foreground/85 mt-0.5 whitespace-pre-wrap leading-snug">{banner.message}</div>
        {banner.link_url && (
          <a href={banner.link_url} target={banner.link_url.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold mt-1 underline">
            {banner.link_label || "Saiba mais"} <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      {banner.dismissible && (
        <button onClick={() => onDismiss(banner.id)} className="opacity-60 hover:opacity-100 shrink-0" aria-label="Fechar aviso">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
