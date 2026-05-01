import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

/**
 * Avatar resiliente para fotos de perfil do WhatsApp (Z-API).
 *
 * URLs vindas do CDN do WhatsApp (pps.whatsapp.net) são assinadas e expiram
 * (parâmetros `oh=` e `oe=`). Quando expiram, o <img> nativo mostra o ícone
 * de imagem quebrada.
 *
 * Estratégia em 2 níveis:
 *  1) onError → tenta refetch via Z-API (`get-profile-picture`) pra trazer
 *     uma URL nova e fresca. Cache em memória pra não martelar a API.
 *  2) Se o refetch falhar (sem foto / sem telefone), cai pras iniciais.
 */
interface WhatsAppAvatarProps {
  src?: string | null;
  name: string;
  /** Telefone real do contato (apenas dígitos, ex: 5511988932837). Habilita refetch. */
  phone?: string | null;
  size?: number; // px (square)
  className?: string;
  textClassName?: string;
  alt?: string;
}

function getInitials(name: string): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Cache global em memória (vive enquanto a aba estiver aberta).
// Evita refetch em massa quando o usuário rola a lista de conversas.
const refetchCache = new Map<string, { url: string | null; at: number }>();
const REFETCH_TTL_MS = 1000 * 60 * 30; // 30 min
const inFlight = new Map<string, Promise<string | null>>();

async function refetchProfilePicture(phone: string): Promise<string | null> {
  const key = phone.replace(/\D/g, "");
  if (!key) return null;

  const cached = refetchCache.get(key);
  if (cached && Date.now() - cached.at < REFETCH_TTL_MS) {
    return cached.url;
  }

  if (inFlight.has(key)) return inFlight.get(key)!;

  const promise = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("zapi-proxy", {
        body: { action: "get-profile-picture", phone: key },
      });
      if (error) throw error;
      // Z-API responde com { link } ou { profilePicture } dependendo da versão
      const url: string | null =
        data?.link || data?.profilePicture || data?.profilePictureUrl || data?.imageUrl || null;
      refetchCache.set(key, { url, at: Date.now() });
      return url;
    } catch {
      refetchCache.set(key, { url: null, at: Date.now() });
      return null;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}

export function WhatsAppAvatar({
  src,
  name,
  phone,
  size,
  className,
  textClassName,
  alt = "",
}: WhatsAppAvatarProps) {
  const [currentSrc, setCurrentSrc] = useState<string | null>(src ?? null);
  const [failed, setFailed] = useState(false);
  const triedRefetch = useRef(false);

  // Reset quando a URL externa mudar
  useEffect(() => {
    setCurrentSrc(src ?? null);
    setFailed(false);
    triedRefetch.current = false;
  }, [src, phone]);

  const handleError = async () => {
    // Já tentamos refetch uma vez nessa montagem · cai pras iniciais
    if (triedRefetch.current || !phone) {
      setFailed(true);
      return;
    }
    triedRefetch.current = true;
    const fresh = await refetchProfilePicture(phone);
    if (fresh && fresh !== currentSrc) {
      setCurrentSrc(fresh);
      setFailed(false);
    } else {
      setFailed(true);
    }
  };

  const showImage = !!currentSrc && !failed;
  const initials = getInitials(name);
  const sizeStyle = size ? { width: size, height: size } : undefined;

  if (showImage) {
    return (
      <img
        src={currentSrc!}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={handleError}
        style={sizeStyle}
        className={cn("rounded-full object-cover bg-secondary", className)}
      />
    );
  }

  return (
    <div
      style={sizeStyle}
      className={cn(
        "rounded-full bg-secondary flex items-center justify-center font-bold text-foreground select-none",
        textClassName,
        className,
      )}
    >
      {initials}
    </div>
  );
}
