/**
 * Resolve uma URL de imagem temática para o destino do card.
 *
 * Estratégia:
 *   1. Se o backend já mandou hero_image_url, usa.
 *   2. Caso contrário, monta uma URL determinística do Unsplash
 *      via `source.unsplash.com/featured` usando o nome da cidade
 *      + país como keyword. É gratuito, sem chave, e o resultado
 *      muda automaticamente conforme o destino.
 *
 * Determinístico: a mesma cidade sempre retorna a mesma foto
 * (cache do Unsplash), evitando "piscar" entre re-renders.
 */
export function getDestinationCoverUrl(
  city: string,
  country?: string,
  override?: string | null,
): string {
  if (override && override.trim().length > 0) return override;

  const slug = [city, country, "travel"]
    .filter(Boolean)
    .map((s) => s!.trim().toLowerCase().replace(/\s+/g, "-"))
    .join(",");

  // 1600x900 cinematográfico, redirect HTTP → CDN do Unsplash.
  return `https://source.unsplash.com/1600x900/?${encodeURIComponent(slug)}`;
}
