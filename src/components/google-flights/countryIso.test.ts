import { describe, it, expect } from "vitest";
import { __testing, getDestinationCoverUrl } from "./destinationImage";

const { resolveCountryKey, COUNTRY_FALLBACK, COUNTRY_ALIASES } = __testing;

/**
 * Garante que códigos de país (ISO-2 e ISO-3) e variações textuais resolvem
 * para a mesma chave canônica usada por COUNTRY_FALLBACK.
 */
describe("resolveCountryKey · ISO-2, ISO-3 e variações", () => {
  // --- ISO-3 (alpha-3) --------------------------------------------------
  describe("ISO-3 alpha", () => {
    const cases: Array<[string, string]> = [
      ["BRA", "brasil"],
      ["USA", "usa"],
      ["FRA", "franca"],
      ["ITA", "italia"],
      ["ESP", "espanha"],
      ["PRT", "portugal"],
      ["DEU", "alemanha"],
      ["GBR", "reino-unido"],
      ["JPN", "japao"],
      ["ARG", "argentina"],
      ["CHL", "chile"],
      ["MEX", "mexico"],
      ["AUS", "australia"],
      ["NZL", "nova-zelandia"],
      ["ZAF", "africa-do-sul"],
      ["ARE", "emirados-arabes-unidos"],
      ["DOM", "republica-dominicana"],
    ];
    for (const [input, expected] of cases) {
      it(`"${input}" -> "${expected}"`, () => {
        expect(resolveCountryKey(input)).toBe(expected);
      });
    }

    it("é case-insensitive (bra, Bra, BRA)", () => {
      expect(resolveCountryKey("bra")).toBe("brasil");
      expect(resolveCountryKey("Bra")).toBe("brasil");
      expect(resolveCountryKey("BRA")).toBe("brasil");
    });
  });

  // --- ISO-2 (alpha-2) --------------------------------------------------
  describe("ISO-2 alpha", () => {
    const cases: Array<[string, string]> = [
      ["BR", "brasil"],
      ["US", "usa"],
      ["FR", "franca"],
      ["IT", "italia"],
      ["JP", "japao"],
      ["GB", "reino-unido"],
      ["UK", "reino-unido"],
    ];
    for (const [input, expected] of cases) {
      it(`"${input}" -> "${expected}"`, () => {
        expect(resolveCountryKey(input)).toBe(expected);
      });
    }
  });

  // --- Aliases textuais -------------------------------------------------
  describe("variações textuais", () => {
    it("EUA / Estados Unidos / EE.UU. -> usa", () => {
      expect(resolveCountryKey("EUA")).toBe("usa");
      expect(resolveCountryKey("Estados Unidos")).toBe("usa");
      expect(resolveCountryKey("estados-unidos")).toBe("usa");
    });

    it("Reino Unido (com e sem espaço) -> reino-unido", () => {
      expect(resolveCountryKey("Reino Unido")).toBe("reino-unido");
      expect(resolveCountryKey("reinounido")).toBe("reino-unido");
    });

    it("nome canônico direto também resolve", () => {
      expect(resolveCountryKey("brasil")).toBe("brasil");
      expect(resolveCountryKey("Brasil")).toBe("brasil");
      expect(resolveCountryKey("FRANCA")).toBe("franca");
    });
  });

  // --- Edge cases -------------------------------------------------------
  describe("edge cases", () => {
    it("string vazia ou desconhecida retorna null", () => {
      expect(resolveCountryKey("")).toBeNull();
      expect(resolveCountryKey(undefined)).toBeNull();
      expect(resolveCountryKey("XYZ")).toBeNull();
      expect(resolveCountryKey("PaisInexistente")).toBeNull();
    });

    it("toda chave de COUNTRY_ALIASES aponta para uma chave válida em COUNTRY_FALLBACK", () => {
      // Garante consistência interna · evita aliases órfãos
      const orphans: string[] = [];
      for (const [alias, target] of Object.entries(COUNTRY_ALIASES)) {
        if (!COUNTRY_FALLBACK[target]) orphans.push(`${alias} -> ${target}`);
      }
      expect(orphans, `Aliases órfãos encontrados:\n${orphans.join("\n")}`).toEqual([]);
    });
  });

  // --- Integração com getDestinationCoverUrl ----------------------------
  describe("integração · ISO-3 resolve a mesma capa que o nome canônico", () => {
    const pairs: Array<[string, string]> = [
      ["BRA", "Brasil"],
      ["USA", "Estados Unidos"],
      ["FRA", "Franca"],
      ["JPN", "Japao"],
      ["ARG", "Argentina"],
    ];
    for (const [iso3, canonical] of pairs) {
      it(`"${iso3}" e "${canonical}" produzem a mesma URL`, () => {
        const fromIso = getDestinationCoverUrl("CidadeInexistente", iso3);
        const fromName = getDestinationCoverUrl("CidadeInexistente", canonical);
        expect(fromIso).toBe(fromName);
      });
    }
  });
});
