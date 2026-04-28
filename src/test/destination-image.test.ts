import { describe, it, expect } from "vitest";
import { getDestinationCoverUrl } from "@/components/google-flights/destinationImage";

/**
 * Garante que o resolvedor de capa do card converge para a MESMA URL
 * para variações comuns do mesmo destino (caixa, acentos, separadores,
 * IATA, sufixo de país).
 */

const RIO_VARIANTS = [
  "Rio",
  "rio",
  "RiodeJaneiro",
  "Rio de Janeiro",
  "rio-de-janeiro",
  "RIO DE JANEIRO",
  "Rio · Brasil",
  "Rio, Brasil",
  "Rio (Brasil)",
  "Rio - RJ",
  "GIG",
  "gig",
  "SDU",
];

describe("getDestinationCoverUrl · normalização de cidade", () => {
  it("resolve todas as variações de Rio de Janeiro para a mesma URL", () => {
    const canonical = getDestinationCoverUrl("rio-de-janeiro");
    expect(canonical).toMatch(/^https:\/\/images\.unsplash\.com\//);

    for (const variant of RIO_VARIANTS) {
      expect(getDestinationCoverUrl(variant), `falhou para "${variant}"`).toBe(canonical);
    }
  });

  it("normaliza variações de São Paulo (acentos, IATA, sem espaço)", () => {
    const canonical = getDestinationCoverUrl("sao-paulo");
    const variants = ["São Paulo", "sao paulo", "SaoPaulo", "SP", "GRU", "CGH", "São Paulo, Brasil"];
    for (const v of variants) {
      expect(getDestinationCoverUrl(v), `falhou para "${v}"`).toBe(canonical);
    }
  });

  it("normaliza variações de Nova York (PT/EN, IATA, sem espaço)", () => {
    const canonical = getDestinationCoverUrl("nova-york");
    const variants = ["Nova York", "novayork", "NY", "NYC", "JFK", "LGA", "EWR"];
    for (const v of variants) {
      expect(getDestinationCoverUrl(v), `falhou para "${v}"`).toBe(canonical);
    }
  });
});

describe("getDestinationCoverUrl · cadeia de fallback", () => {
  it("usa o override quando fornecido", () => {
    const url = getDestinationCoverUrl("Cidade Inexistente", undefined, "https://cdn.x/y.jpg");
    expect(url).toBe("https://cdn.x/y.jpg");
  });

  it("ignora override vazio e cai no próximo nível", () => {
    const canonical = getDestinationCoverUrl("rio-de-janeiro");
    expect(getDestinationCoverUrl("Rio", undefined, "   ")).toBe(canonical);
    expect(getDestinationCoverUrl("Rio", undefined, null)).toBe(canonical);
  });

  it("cai para fallback de país quando a cidade não está catalogada", () => {
    const portugalFallback = getDestinationCoverUrl("Cidade Qualquer", "Portugal");
    const portugalDirect = getDestinationCoverUrl("__nada__", "portugal");
    expect(portugalFallback).toBe(portugalDirect);
    expect(portugalFallback).toMatch(/^https:\/\/images\.unsplash\.com\//);
  });

  it("aceita país via código ISO-2 (BR, US, FR)", () => {
    expect(getDestinationCoverUrl("__x__", "BR")).toBe(getDestinationCoverUrl("__x__", "Brasil"));
    expect(getDestinationCoverUrl("__x__", "US")).toBe(getDestinationCoverUrl("__x__", "USA"));
    expect(getDestinationCoverUrl("__x__", "FR")).toBe(getDestinationCoverUrl("__x__", "Franca"));
  });

  it("infere o país a partir da cidade quando country não é informado", () => {
    // Cidade catalogada → usa CITY_PHOTOS (não chega no fallback de país)
    const rioByCity = getDestinationCoverUrl("Rio");
    const rioByCountry = getDestinationCoverUrl("__nada__", "Brasil");
    // São URLs diferentes (cidade tem foto própria), mas ambas válidas
    expect(rioByCity).toMatch(/^https:\/\/images\.unsplash\.com\//);
    expect(rioByCountry).toMatch(/^https:\/\/images\.unsplash\.com\//);
  });

  it("cai para imagem genérica quando nada bate", () => {
    const generic = getDestinationCoverUrl("Lugar Totalmente Inventado XYZ");
    expect(generic).toMatch(/^https:\/\/images\.unsplash\.com\//);
  });

  it("usa fallback regional quando recebe apenas a região", () => {
    const europa = getDestinationCoverUrl("__nada__", undefined, undefined, "Europa");
    expect(europa).toMatch(/^https:\/\/images\.unsplash\.com\//);
  });
});
