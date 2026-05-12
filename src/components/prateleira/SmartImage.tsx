import { forwardRef, type ImgHTMLAttributes } from "react";
import { buildSrcSet, DEFAULT_CARD_SIZES } from "@/lib/imageOptimizer";

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  src: string | null | undefined;
  alt: string;
  sizes?: string;
  widths?: number[];
  priority?: boolean;
  pictureClassName?: string;
};

// SmartImage · gera <picture> com AVIF + WebP + fallback responsivo
const SmartImage = forwardRef<HTMLImageElement, Props>(function SmartImage(
  { src, alt, sizes = DEFAULT_CARD_SIZES, widths, priority, pictureClassName, className, loading, decoding, fetchPriority, ...rest },
  ref
) {
  const set = buildSrcSet(src, widths);
  const finalLoading = loading ?? (priority ? "eager" : "lazy");
  const finalDecoding = decoding ?? "async";
  const finalFetchPriority = fetchPriority ?? (priority ? "high" : "low");

  if (!set) {
    return null;
  }

  if (!set.supportsTransform) {
    return (
      <img
        ref={ref}
        src={set.fallback}
        alt={alt}
        loading={finalLoading}
        decoding={finalDecoding}
        fetchPriority={finalFetchPriority as any}
        className={className}
        {...rest}
      />
    );
  }

  return (
    <picture className={pictureClassName}>
      {set.avif && <source type="image/avif" srcSet={set.avif} sizes={sizes} />}
      {set.webp && <source type="image/webp" srcSet={set.webp} sizes={sizes} />}
      <img
        ref={ref}
        src={set.fallback}
        alt={alt}
        sizes={sizes}
        loading={finalLoading}
        decoding={finalDecoding}
        fetchPriority={finalFetchPriority as any}
        className={className}
        {...rest}
      />
    </picture>
  );
});

export default SmartImage;
