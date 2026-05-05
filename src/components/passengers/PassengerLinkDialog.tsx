import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getPublicHost } from "@/lib/publicUrl";
import { Copy, ExternalLink, Loader2, Link2, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function genSlug() {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6);
}

export default function PassengerLinkDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [label, setLabel] = useState("");
  const [validity, setValidity] = useState("30");
  const [generating, setGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  const generate = async () => {
    setGenerating(true);
    try {
      const slug = genSlug();
      const expires_at = validity === "never"
        ? null
        : new Date(Date.now() + parseInt(validity) * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase.from("passenger_signup_links").insert({
        slug,
        label: label.trim() || null,
        expires_at,
        created_by: user?.id || null,
      });
      if (error) throw error;

      const url = `${getPublicHost()}/cadastro-passageiro/${slug}`;
      setGeneratedUrl(url);
    } catch (e: any) {
      toast({ title: "Erro ao gerar link", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const copy = async () => {
    if (!generatedUrl) return;
    await navigator.clipboard.writeText(generatedUrl);
    toast({ title: "Link copiado!", description: "Cole no WhatsApp do cliente." });
  };

  const reset = () => {
    setLabel("");
    setValidity("30");
    setGeneratedUrl(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Sparkles className="w-4 h-4 text-primary" />
            Link de auto-cadastro
          </DialogTitle>
        </DialogHeader>

        {!generatedUrl ? (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Gere um link único para enviar ao cliente. Ele preenche os próprios dados em uma página com a identidade NatLeva.
            </p>
            <div className="space-y-2">
              <Label>Identificação (opcional)</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: Família Silva · Dubai" />
            </div>
            <div className="space-y-2">
              <Label>Validade do link</Label>
              <Select value={validity} onValueChange={setValidity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                  <SelectItem value="never">Sem validade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generate} disabled={generating} className="w-full">
              {generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Link2 className="w-4 h-4 mr-2" /> Gerar link
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-lg border border-border/60 bg-card/50 space-y-2 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-200 via-amber-400 to-amber-200" />
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Seu link</p>
              <p className="text-sm font-mono break-all">{generatedUrl}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={copy} className="flex-1"><Copy className="w-4 h-4 mr-2" /> Copiar</Button>
              <Button variant="outline" onClick={() => window.open(generatedUrl, "_blank")}>
                <ExternalLink className="w-4 h-4 mr-2" /> Abrir
              </Button>
            </div>
            <Button variant="ghost" className="w-full" onClick={reset}>Gerar outro link</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
