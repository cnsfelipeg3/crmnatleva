import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Eye, Loader2, Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

const PortalTripDetail = lazy(() => import("@/pages/portal/PortalTripDetail"));

type PreviewMode = "pre-trip" | "in-trip" | "post-trip";

function shiftDatesForMode(mode: PreviewMode) {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (mode === "pre-trip") {
    const dep = new Date(today); dep.setDate(today.getDate() + 30);
    const ret = new Date(today); ret.setDate(today.getDate() + 40);
    return { departure_date: fmt(dep), return_date: fmt(ret) };
  }
  if (mode === "in-trip") {
    const dep = new Date(today); dep.setDate(today.getDate() - 2);
    const ret = new Date(today); ret.setDate(today.getDate() + 5);
    return { departure_date: fmt(dep), return_date: fmt(ret) };
  }
  const dep = new Date(today); dep.setDate(today.getDate() - 30);
  const ret = new Date(today); ret.setDate(today.getDate() - 20);
  return { departure_date: fmt(dep), return_date: fmt(ret) };
}

export default function PortalAdminPreview() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [mode, setMode] = useState<PreviewMode>((params.get("mode") as PreviewMode) || "pre-trip");
  const [ready, setReady] = useState(false);
  const [renderKey, setRenderKey] = useState(0);

  // Load composer overrides written by the admin
  const overrides = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("portal-preview-composer:" + id);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, [id]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!id) return;
      setLoading(true);

      // Pull real trip data from the same source the client uses, then override.
      let base: any = null;
      try {
        const { data } = await supabase.functions.invoke("portal-api", {
          body: { action: "trip-detail", sale_id: id },
        });
        if (data && !data.error) base = data;
      } catch (e) {
        console.error("preview fetch failed:", e);
      }

      // Fallback: build a minimal shell from sales table so preview still renders
      if (!base) {
        const { data: sale } = await supabase
          .from("sales")
          .select("id,name,status,origin_iata,destination_iata,departure_date,return_date,seller_id")
          .eq("id", id)
          .maybeSingle();
        base = {
          subtitle: (sale as any)?.name || "",
          published: {},
          sale: (sale as any) || { id, name: "Viagem", status: "active" },
          segments: [], hotels: [], services: [], lodging: [],
          attachments: [], financial: { receivables: [] }, passengers: [],
          sellerName: "",
        };
      }

      const shifted = shiftDatesForMode(mode);
      const synthesized = {
        ...base,
        published: {
          ...(base.published || {}),
          custom_title: overrides.custom_title ?? base.published?.custom_title,
          cover_image_url: overrides.cover_image_url ?? base.published?.cover_image_url,
          welcome_message: overrides.welcome_message ?? base.published?.welcome_message,
          notes_for_client: overrides.notes_for_client ?? base.published?.notes_for_client,
          show_financial: overrides.show_financial ?? base.published?.show_financial,
          show_documents: overrides.show_documents ?? base.published?.show_documents,
          is_active: overrides.visible ?? true,
        },
        sale: { ...base.sale, ...shifted },
      };

      sessionStorage.setItem("portal-preview:" + id, JSON.stringify(synthesized));

      if (!cancel) {
        setReady(true);
        setLoading(false);
        setRenderKey(k => k + 1);
      }
    })();

    return () => { cancel = true; };
  }, [id, mode, overrides]);

  // Cleanup on unmount so the real client view isn't poisoned
  useEffect(() => {
    return () => {
      if (id) sessionStorage.removeItem("portal-preview:" + id);
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sticky preview toolbar */}
      <div className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/portal-admin/viagens/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>

          <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md font-medium">
            <Eye className="h-3.5 w-3.5" />
            Pré-visualização · não é a versão do cliente
          </div>

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {/* Mode selector */}
            <div className="inline-flex rounded-md border border-border bg-background p-0.5 text-xs">
              {(["pre-trip", "in-trip", "post-trip"] as PreviewMode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "px-2.5 py-1 rounded-sm transition-colors",
                    mode === m ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {m === "pre-trip" ? "Pré-viagem" : m === "in-trip" ? "Em viagem" : "Pós-viagem"}
                </button>
              ))}
            </div>

            {/* Viewport toggle */}
            <div className="inline-flex rounded-md border border-border bg-background p-0.5">
              <button
                onClick={() => setDevice("desktop")}
                className={cn("px-2 py-1 rounded-sm", device === "desktop" ? "bg-accent text-accent-foreground" : "text-muted-foreground")}
                aria-label="Desktop"
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setDevice("mobile")}
                className={cn("px-2 py-1 rounded-sm", device === "mobile" ? "bg-accent text-accent-foreground" : "text-muted-foreground")}
                aria-label="Mobile"
              >
                <Smartphone className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview canvas */}
      <div className="py-4 px-2 sm:px-4 flex justify-center">
        <Card
          className={cn(
            "overflow-hidden shadow-xl transition-all duration-300 bg-background",
            device === "desktop" ? "w-full max-w-7xl" : "w-[390px] max-w-full"
          )}
          style={{ minHeight: "80vh" }}
        >
          {loading || !ready ? (
            <div className="flex items-center justify-center py-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Suspense fallback={
              <div className="flex items-center justify-center py-32">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            }>
              {/* key forces remount when mode/overrides change so PortalTripDetail re-reads sessionStorage */}
              <div key={renderKey}>
                <PortalTripDetail />
              </div>
            </Suspense>
          )}
        </Card>
      </div>
    </div>
  );
}
