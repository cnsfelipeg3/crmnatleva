import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Globe, Loader2, CheckCircle2, ExternalLink } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  clientId?: string | null;
  clientEmail?: string | null;
  saleName?: string;
}

export default function PublishToPortalDialog({ open, onOpenChange, saleId, clientId, clientEmail: initialEmail, saleName }: Props) {
  const [email, setEmail] = useState(initialEmail || "");
  const [customTitle, setCustomTitle] = useState(saleName || "");
  const [coverUrl, setCoverUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [published, setPublished] = useState(false);
  const [alreadyPublished, setAlreadyPublished] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail(initialEmail || "");
      setCustomTitle(saleName || "");
      setPublished(false);

      (supabase as any)
        .from("portal_published_sales")
        .select("id")
        .eq("sale_id", saleId)
        .single()
        .then(({ data }: any) => {
          setAlreadyPublished(!!data);
        });
    }
  }, [open, saleId, initialEmail, saleName]);

  const handlePublish = async () => {
    if (!email) { toast.error("Informe o e-mail do cliente."); return; }
    if (!clientId) { toast.error("Venda sem cliente vinculado."); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal-access", {
        body: {
          client_id: clientId,
          sale_id: saleId,
          client_email: email,
          cover_image_url: coverUrl || null,
          custom_title: customTitle || null,
          notes_for_client: notes || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setPublished(true);
      toast.success(
        data?.is_new_user
          ? "Viagem publicada! Acesso criado para o cliente."
          : "Viagem publicada no portal do cliente!"
      );
    } catch (err: any) {
      toast.error("Erro: " + (err.message || "Tente novamente"));
    } finally {
      setLoading(false);
    }
  };

  const portalUrl = getPublicPortalLoginUrl();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-accent" />
            {alreadyPublished ? "Atualizar no Portal" : "Publicar no Portal do Cliente"}
          </DialogTitle>
        </DialogHeader>

        {published ? (
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
            <div>
              <p className="font-semibold text-foreground">Publicado com sucesso!</p>
              <p className="text-sm text-muted-foreground mt-1">O cliente pode acessar em:</p>
              <div className="flex items-center justify-center gap-2 mt-2 p-2 bg-muted rounded-lg">
                <code className="text-xs text-foreground">{portalUrl}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(portalUrl); toast.success("Link copiado!"); }}
                  className="text-accent hover:text-accent/80"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>E-mail do cliente *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.com" required />
              <p className="text-xs text-muted-foreground">Será usado para criar o acesso do cliente ao portal.</p>
            </div>
            <div className="space-y-2">
              <Label>Título da viagem</Label>
              <Input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="Ex: Viagem Paris 2025" />
            </div>
            <div className="space-y-2">
              <Label>URL da imagem de capa</Label>
              <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Notas para o cliente</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Mensagem visível para o cliente no portal..." rows={3} />
            </div>
            <Button onClick={handlePublish} disabled={loading} className="w-full">
              {loading ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Publicando...</span>
              ) : (
                <span className="flex items-center gap-2"><Globe className="h-4 w-4" /> {alreadyPublished ? "Atualizar" : "Publicar no Portal"}</span>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
