import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Link2, MessageCircle, Images, Download, Video, FileText } from "lucide-react";
import { useAffiliateProfile } from "@/components/vitrine/useAffiliateProfile";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function VitrineMateriais() {
  const { data: affiliate } = useAffiliateProfile();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const ref = affiliate?.ref_code || "seu-codigo";
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://adm.natleva.com";
  const meuLink = `${baseUrl}/loja?ref=${ref}`;

  const { data: materials } = useQuery({
    queryKey: ["affiliate-materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("affiliate_materials")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
  });

  const textosProntos = [
    {
      titulo: "Convite leve · WhatsApp",
      texto: `Oi! Tô indicando a NatLeva pra quem quer viajar bem sem se preocupar com nada. Eles montam tudo: aéreo, hotel, passeio. Dá uma olhada nos pacotes: ${meuLink}`,
    },
    {
      titulo: "Stories · Instagram",
      texto: `Viagem sem dor de cabeça existe ✈️ A galera da NatLeva organiza tudo · pacote completo, parcelado e ainda dá pra escolher hospedagem TOP. Link aqui ó 👇 ${meuLink}`,
    },
    {
      titulo: "Indicação direta",
      texto: `Lembrei de você quando vi esse pacote! Achei que ia gostar. A NatLeva é a agência que eu confio · clica aqui: ${meuLink}`,
    },
  ];

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copiado!");
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="font-serif text-2xl sm:text-3xl">Materiais de divulgação</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tudo pronto pra você compartilhar nas suas redes em 1 clique.
        </p>
      </header>

      <Card className="border-emerald-900/15">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4 text-emerald-700" /> Seu link pessoal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Input value={meuLink} readOnly className="font-mono text-xs" />
            <Button onClick={() => copy(meuLink, "link")} className="shrink-0">
              {copiedKey === "link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Qualquer compra feita por esse link é registrada como sua indicação.
          </p>
        </CardContent>
      </Card>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="h-4 w-4 text-emerald-700" />
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground/70">
            Textos prontos
          </h2>
        </div>
        <div className="grid lg:grid-cols-3 gap-3">
          {textosProntos.map((t, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Badge variant="outline" className="text-[10px]">
                  {t.titulo}
                </Badge>
                <Textarea value={t.texto} readOnly rows={5} className="text-xs resize-none" />
                <Button
                  onClick={() => copy(t.texto, `txt-${i}`)}
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5"
                >
                  {copiedKey === `txt-${i}` ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copiar texto
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Images className="h-4 w-4" /> Banco de imagens
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-sm text-muted-foreground border border-dashed rounded-lg">
            <Images className="h-10 w-10 mx-auto mb-2 opacity-40" />
            Em breve · biblioteca de criativos prontos pra Stories, Reels e feed.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
