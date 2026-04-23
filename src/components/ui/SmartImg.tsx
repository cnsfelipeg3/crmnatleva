import { ImgHTMLAttributes, useMemo } from "react";

interface SmartImgProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  /** Largura de renderização esperada em px (o componente pede do
   * storage uma imagem ~2x pra ficar nítida em retina). */
  displayWidth?: number;
  /** Qualidade 20-100, padrão 75. */
  quality?: number;
}

const SUPABASE_STORAGE_PATTERN = /\/storage\/v1\/object\/public\//;

function addTransform(url: string, width: number, quality: number): string {
  // Só aplica transform em URLs do Supabase Storage public.
  if (!SUPABASE_STORAGE_PATTERN.test(url)) return url;
  try {
    const u = new URL(url);
    // Muda /object/public/ para /render/image/public/ (endpoint de transform)
    u.pathname = u.pathname.replace(
      "/storage/v1/object/public/",
      "/storage/v1/render/image/public/"
    );
    u.searchParams.set("width", String(Math.round(width * 2))); // 2x para retina
    u.searchParams.set("quality", String(quality));
    u.searchParams.set("resize", "contain");
    return u.toString();
  } catch {
    return url;
  }
}

export function SmartImg({
  src,
  displayWidth,
  quality = 75,
  loading = "lazy",
  decoding = "async",
  ...rest
}: SmartImgProps) {
  const finalSrc = useMemo(
    () => (displayWidth ? addTransform(src, displayWidth, quality) : src),
    [src, displayWidth, quality]
  );
  return <img src={finalSrc} loading={loading} decoding={decoding} {...rest} />;
}

export default SmartImg;
