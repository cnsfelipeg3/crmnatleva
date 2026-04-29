import { motion, AnimatePresence } from "framer-motion";
import { X, Phone, MessageSquare, Star, User, Mail, MapPin } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProfilePictureViewerProps {
  open: boolean;
  onClose: () => void;
  /** Display name for the contact. */
  name: string;
  /** E.164-ish phone number; will be formatted by the caller before passing in. */
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  /** Pre-formatted phone string for display. If absent we fall back to `phone`. */
  phoneDisplay?: string;
  pictureUrl?: string;
  /** Initials shown on the fallback avatar. */
  initials?: string;
  isVip?: boolean;
  source?: string;
  tags?: string[];
}

/**
 * WhatsApp-style profile picture viewer.
 * Click the avatar anywhere → see the photo full-size with contact info underneath.
 */
export function ProfilePictureViewer({
  open,
  onClose,
  name,
  phone,
  email,
  city,
  state,
  phoneDisplay,
  pictureUrl,
  initials,
  isVip,
  source,
  tags,
}: ProfilePictureViewerProps) {
  // Close on ESC, lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const cleanPhone = (phone || "").replace(/\D/g, "");
  const phoneText = phoneDisplay || phone || "";
  const location = [city, state].filter(Boolean).join(", ");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Close (top-right) */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white z-10"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </Button>

          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-md flex flex-col items-center gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Big circular photo · WhatsApp style */}
            <div className="relative">
              {pictureUrl ? (
                <img
                  src={pictureUrl}
                  alt={name}
                  className="h-64 w-64 sm:h-72 sm:w-72 rounded-full object-cover ring-4 ring-white/10 shadow-2xl"
                />
              ) : (
                <div className="h-64 w-64 sm:h-72 sm:w-72 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-6xl font-bold text-white ring-4 ring-white/10 shadow-2xl">
                  {initials || name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
              {isVip && (
                <div className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-amber-500 flex items-center justify-center ring-4 ring-black/40">
                  <Star className="h-4 w-4 text-white fill-white" />
                </div>
              )}
            </div>

            {/* Info card */}
            <div
              className="w-full bg-card text-card-foreground rounded-2xl p-5 shadow-2xl space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <h2 className="text-xl font-bold truncate">{name}</h2>
                {(source || isVip) && (
                  <div className="flex items-center justify-center gap-1.5 mt-1.5 flex-wrap">
                    {isVip && (
                      <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] gap-0.5 px-2 py-0.5">
                        <Star className="h-2.5 w-2.5 fill-current" /> VIP
                      </Badge>
                    )}
                    {source && (
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5 capitalize">
                        {source.replace(/_/g, " ")}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="h-px bg-border" />

              <div className="space-y-2.5">
                {phoneText && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">{phoneText}</span>
                  </div>
                )}
                {email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{email}</span>
                  </div>
                )}
                {location && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{location}</span>
                  </div>
                )}
              </div>

              {tags && tags.length > 0 && (
                <>
                  <div className="h-px bg-border" />
                  <div className="flex flex-wrap gap-1.5">
                    {tags.slice(0, 6).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0.5">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </>
              )}

              {/* Quick actions */}
              {cleanPhone && (
                <>
                  <div className="h-px bg-border" />
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <a
                      href={`https://wa.me/${cleanPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 h-10 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
                    >
                      <MessageSquare className="h-4 w-4" />
                      WhatsApp
                    </a>
                    <a
                      href={`tel:+${cleanPhone}`}
                      className="flex items-center justify-center gap-2 h-10 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium transition-colors"
                    >
                      <Phone className="h-4 w-4" />
                      Ligar
                    </a>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
