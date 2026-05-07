import { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Mail, Copy, Check, Cake, PartyPopper } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  passenger: {
    full_name: string;
    phone?: string | null;
    email?: string | null;
    birth_date?: string | null;
  } | null;
  age?: number;
}

const DEFAULT_WHATSAPP = (firstName: string) =>
  `🎂 Feliz Aniversário, ${firstName}! 🎉

A equipe NatLeva deseja a você um dia muito especial, cheio de alegria, saúde e novas conquistas. ✈️🌍

Que esse novo ciclo venha repleto de viagens incríveis e momentos inesquecíveis. A gente já está torcendo por isso! 💚

Um grande abraço,
Equipe NatLeva`;

const DEFAULT_EMAIL_SUBJECT = (firstName: string) => `Feliz aniversário, ${firstName}! 🎂`;
const DEFAULT_EMAIL_BODY = (firstName: string) =>
  `Olá, ${firstName}!

Hoje é um dia muito especial e a equipe NatLeva não poderia deixar passar em branco. Desejamos a você um aniversário cheio de alegria, saúde e momentos inesquecíveis ao lado de quem você ama.

Que o novo ciclo venha leve, com novos destinos, boas histórias e muitas viagens pela frente. Conte com a gente para tornar cada uma delas ainda mais especial. ✈️

Um abraço afetuoso,
Equipe NatLeva`;

function buildWhatsAppUrl(phone: string, message: string): string {
  const clean = phone.replace(/\D/g, "");
  const number = clean.startsWith("55") ? clean : `55${clean}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function buildMailto(email: string, subject: string, body: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function BirthdayMessageDialog({ open, onOpenChange, passenger, age }: Props) {
  const firstName = useMemo(() => (passenger?.full_name || "").split(" ")[0] || "amigo(a)", [passenger]);

  const [waMsg, setWaMsg] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [copied, setCopied] = useState<"wa" | "email" | null>(null);

  useEffect(() => {
    if (open && passenger) {
      setWaMsg(DEFAULT_WHATSAPP(firstName));
      setEmailSubject(DEFAULT_EMAIL_SUBJECT(firstName));
      setEmailBody(DEFAULT_EMAIL_BODY(firstName));
    }
  }, [open, passenger, firstName]);

  if (!passenger) return null;

  const copy = async (kind: "wa" | "email") => {
    const text = kind === "wa" ? waMsg : `${emailSubject}\n\n${emailBody}`;
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    toast({ title: "Copiado!", description: "Mensagem na área de transferência." });
    setTimeout(() => setCopied(null), 1800);
  };

  const sendWA = () => {
    if (!passenger.phone) {
      toast({ title: "Sem telefone", description: "Esse passageiro não tem telefone cadastrado.", variant: "destructive" });
      return;
    }
    window.open(buildWhatsAppUrl(passenger.phone, waMsg), "_blank");
  };

  const sendEmail = () => {
    if (!passenger.email) {
      toast({ title: "Sem e-mail", description: "Esse passageiro não tem e-mail cadastrado.", variant: "destructive" });
      return;
    }
    window.location.href = buildMailto(passenger.email, emailSubject, emailBody);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <PartyPopper className="w-5 h-5 text-primary" />
            Mensagem de Aniversário
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground">{passenger.full_name}</span>
            {typeof age === "number" && (
              <Badge variant="secondary" className="text-[10px]">
                <Cake className="w-3 h-3 mr-1" /> {age} anos
              </Badge>
            )}
            {passenger.phone && <span className="text-xs text-muted-foreground">· {passenger.phone}</span>}
            {passenger.email && <span className="text-xs text-muted-foreground">· {passenger.email}</span>}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={passenger.phone ? "whatsapp" : "email"} className="mt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="whatsapp" className="gap-1.5">
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-1.5">
              <Mail className="w-4 h-4" /> E-mail
            </TabsTrigger>
          </TabsList>

          {/* WhatsApp */}
          <TabsContent value="whatsapp" className="space-y-3 mt-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Mensagem</Label>
              <Textarea
                value={waMsg}
                onChange={(e) => setWaMsg(e.target.value)}
                rows={10}
                className="text-sm leading-relaxed font-sans resize-none"
              />
              <p className="text-[10px] text-muted-foreground">
                {waMsg.length} caracteres · você pode editar antes de enviar.
              </p>
            </div>
            {/* Preview estilo WhatsApp */}
            <div className="rounded-xl bg-[#e5ddd5] dark:bg-muted p-4">
              <div className="bg-[#dcf8c6] dark:bg-primary/20 text-foreground rounded-lg p-3 max-w-[85%] ml-auto shadow-sm whitespace-pre-wrap text-sm leading-relaxed">
                {waMsg}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => copy("wa")} className="gap-1.5">
                {copied === "wa" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                Copiar
              </Button>
              <Button size="sm" onClick={sendWA} disabled={!passenger.phone} className="gap-1.5">
                <MessageCircle className="w-4 h-4" />
                Abrir no WhatsApp
              </Button>
            </div>
          </TabsContent>

          {/* Email */}
          <TabsContent value="email" className="space-y-3 mt-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Assunto</Label>
              <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Mensagem</Label>
              <Textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={10}
                className="text-sm leading-relaxed resize-none"
              />
            </div>
            {/* Preview estilo email */}
            <div className="rounded-xl border bg-card p-4 space-y-2">
              <div className="text-xs text-muted-foreground">Para: {passenger.email || "(sem e-mail cadastrado)"}</div>
              <div className="text-sm font-semibold">{emailSubject}</div>
              <div className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">{emailBody}</div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => copy("email")} className="gap-1.5">
                {copied === "email" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                Copiar
              </Button>
              <Button size="sm" onClick={sendEmail} disabled={!passenger.email} className="gap-1.5">
                <Mail className="w-4 h-4" />
                Abrir no e-mail
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
