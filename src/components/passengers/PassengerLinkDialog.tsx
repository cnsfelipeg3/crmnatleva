import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getPublicHost } from "@/lib/publicUrl";
import { Copy, ExternalLink, Loader2, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const FIXED_SLUG = "cadastro";

export default function PassengerLinkDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const url = `${getPublicHost()}/cadastro-passageiro/${FIXED_SLUG}`;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("passenger_signup_links")
          .select("id, active")
          .eq("slug", FIXED_SLUG)
          .maybeSingle();

        if (!data) {
          await supabase.from("passenger_signup_links").insert({
            slug: FIXED_SLUG,
            label: "Link público de cadastro",
            expires_at: null,
            max_uses: null,
            active: true,
            created_by: user?.id || null,
          });
        } else if (!data.active) {
          await supabase.from("passenger_signup_links").update({ active: true }).eq("id", data.id);
        }
      } catch (e: any) {
        toast({ title: "Erro ao preparar link", description: e.message, variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, user?.id, toast]);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!", description: "Cole no WhatsApp do cliente." });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Sparkles className="w-4 h-4 text-primary" />
            Link de auto-cadastro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Esse é o seu link fixo de cadastro. Pode enviar pra qualquer cliente · cada preenchimento cria um novo passageiro automaticamente aqui no sistema.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="p-4 rounded-lg border border-border/60 bg-card/50 space-y-2 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-200 via-amber-400 to-amber-200" />
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Link fixo</p>
                <p className="text-sm font-mono break-all">{url}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={copy} className="flex-1"><Copy className="w-4 h-4 mr-2" /> Copiar link</Button>
                <Button variant="outline" onClick={() => window.open(url, "_blank")}>
                  <ExternalLink className="w-4 h-4 mr-2" /> Abrir
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
