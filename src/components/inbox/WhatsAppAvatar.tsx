import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Avatar resiliente para fotos de perfil do WhatsApp (Z-API).
 *
 * URLs vindas do CDN do WhatsApp (pps.whatsapp.net) são assinadas e expiram.
 * Quando expiram, o <img> nativo mostra o ícone de imagem quebrada.
 * Este componente detecta a falha (onError) e cai automaticamente para as
 * iniciais do contato — mesmo comportamento de quem não tem foto.
 */
interface WhatsAppAvatarProps {
  src?: string | null;
  name: string;
  size?: number; // px (square)
  className?: string; // wrapper (controla tamanho/ring/etc se preferir Tailwind)
  textClassName?: string; // controla tamanho do texto das iniciais
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

export function WhatsAppAvatar({
  src,
  name,
  size,
  className,
  textClassName,
  alt = "",
}: WhatsAppAvatarProps) {
  const [failed, setFailed] = useState(false);

  // Reset estado de falha quando a URL mudar (refetch pode trazer URL nova válida)
  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showImage = !!src && !failed;
  const initials = getInitials(name);

  const sizeStyle = size ? { width: size, height: size } : undefined;

  if (showImage) {
    return (
      <img
        src={src!}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
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
