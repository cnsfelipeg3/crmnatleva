import { useState } from "react";
import { X, Phone, MessageSquare, Tag, Car, CreditCard, Star, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { WhatsAppAvatar } from "@/components/inbox/WhatsAppAvatar";

interface ContactProfilePanelProps {
  contact: {
    id: string;
    phone: string;
    contact_name: string;
    stage: string;
    tags: string[];
    source: string;
    is_vip: boolean;
    vehicle_interest?: string;
    price_range?: string;
    payment_method?: string;
    score_potential: number;
    score_risk: number;
    created_at?: string;
  };
  profilePic?: string;
  onClose: () => void;
}

import { formatPhoneDisplay } from "@/lib/phone";


const STAGE_LABELS: Record<string, string> = {
  novo_lead: "Novo Lead",
  qualificacao: "Qualificação",
  proposta_preparacao: "Prep. Proposta",
  proposta_enviada: "Proposta Enviada",
  negociacao: "Negociação",
  fechado: "Fechado ✓",
  pos_venda: "Pós-venda",
  perdido: "Perdido",
};

export function ContactProfilePanel({ contact, profilePic, onClose }: ContactProfilePanelProps) {
  const [showFullPhoto, setShowFullPhoto] = useState(false);
  const initials = contact.contact_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-20"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: 320, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 320, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="absolute right-0 top-0 bottom-0 w-[320px] border-l border-border bg-card z-30 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <span className="text-sm font-bold">Perfil do Contato</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-5">
            {/* Avatar + Name */}
            <div className="flex flex-col items-center text-center space-y-3">
              <button
                onClick={() => profilePic && setShowFullPhoto(true)}
                className={`relative group ${profilePic ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <WhatsAppAvatar
                  src={profilePic}
                  name={contact.contact_name}
                  phone={contact.phone}
                  alt={contact.contact_name}
                  className="h-20 w-20 ring-2 ring-border group-hover:ring-primary/50 transition-all"
                  textClassName="text-xl"
                />
                {profilePic && (
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ExternalLink className="h-5 w-5 text-white" />
                  </div>
                )}
              </button>
              <div>
                <h3 className="text-base font-bold text-foreground">{contact.contact_name}</h3>
                <p className="text-xs text-muted-foreground">{formatPhoneDisplay(contact.phone)}</p>
              </div>
              <div className="flex items-center gap-2">
                {contact.is_vip && (
                  <Badge className="bg-amber-500/10 text-amber-500 text-[10px] gap-1">
                    <Star className="h-3 w-3 fill-current" /> VIP
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px]">
                  {STAGE_LABELS[contact.stage] || contact.stage}
                </Badge>
              </div>
            </div>

            {/* Info items */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-foreground">{formatPhoneDisplay(contact.phone)}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground capitalize">{contact.source.replace("_", " ")}</span>
              </div>
              {contact.vehicle_interest && (
                <div className="flex items-center gap-3 text-sm">
                  <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-foreground">{contact.vehicle_interest}</span>
                </div>
              )}
              {contact.price_range && (
                <div className="flex items-center gap-3 text-sm">
                  <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-foreground">{contact.price_range}</span>
                </div>
              )}
            </div>

            {/* Scores */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3 text-center">
                <p className="text-lg font-bold text-emerald-500">{contact.score_potential}</p>
                <p className="text-[10px] text-muted-foreground">Potencial</p>
              </div>
              <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 text-center">
                <p className="text-lg font-bold text-destructive">{contact.score_risk}</p>
                <p className="text-[10px] text-muted-foreground">Risco</p>
              </div>
            </div>

            {/* Tags */}
            {contact.tags.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {contact.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </motion.div>

      {/* Full-size photo dialog */}
      {showFullPhoto && profilePic && (
        <Dialog open={showFullPhoto} onOpenChange={setShowFullPhoto}>
          <DialogContent className="max-w-lg p-2">
            <DialogTitle className="sr-only">Foto de perfil de {contact.contact_name}</DialogTitle>
            <img src={profilePic} alt={contact.contact_name} className="w-full rounded-lg" />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
