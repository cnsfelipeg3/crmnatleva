import { describe, it, expect } from "vitest";
import { __testing, getDestinationCoverUrl } from "./destinationImage";

const { normalize, CITY_PHOTOS } = __testing;

/**
 * Garante que o normalizador transforma entradas "sujas" do mundo real
 * (separadores variados, prefixos UF, múltiplos espaços, abreviações) em
 * uma chave canônica estável usada pela cadeia de fallback.
 */
describe("normalize · separadores inesperados e variações", () => {
  // --- Separadores incomuns ---------------------------------------------
  describe("separadores", () => {
    it("trata mid-dot · como separador de segmento (corta sufixo)", () => {
      // pelo padrão atual · qualquer coisa após '·' é descartada
      expect(normalize("Rio·Brasil")).toBe("rio");
      expect(normalize("Paris · França")).toBe("paris");
    });

    it("trata barra / como separador de segmento", () => {
      expect(normalize("Rio/BR")).toBe("rio");
      expect(normalize("New York/USA")).toBe("new-york");
    });

    it("trata pipe | como separador de segmento", () => {
      expect(normalize("Rio|RJ")).toBe("rio");
    });

    it("trata vírgula como separador de segmento", () => {
      expect(normalize("Rio, Brasil")).toBe("rio");
      expect(normalize("São Paulo, SP")).toBe("sao-paulo");
    });

    it("trata ' - ' (com espaços) como separador de UF/país", () => {
      expect(normalize("Rio - RJ")).toBe("rio");
      expect(normalize("Rio — RJ")).toBe("rio"); // em-dash · não é tratado, fica junto
    });

    it("converte underscore, ponto e backslash em hífen", () => {
      expect(normalize("rio_de_janeiro")).toBe("rio-de-janeiro");
      expect(normalize("rio.de.janeiro")).toBe("rio-de-janeiro");
      expect(normalize("rio\\de\\janeiro")).toBe("rio-de-janeiro");
    });
  });

  // --- Múltiplos espaços e whitespace -----------------------------------
  describe("espaços e whitespace", () => {
    it("colapsa múltiplos espaços em um único hífen", () => {
      expect(normalize("Rio   de   Janeiro")).toBe("rio-de-janeiro");
      expect(normalize("São    Paulo")).toBe("sao-paulo");
    });

    it("remove tabs, newlines e espaços nas pontas", () => {
      expect(normalize("\t  Rio de Janeiro  \n")).toBe("rio-de-janeiro");
      expect(normalize("\n\tParis\t\n")).toBe("paris");
    });

    it("colapsa hífens múltiplos e tira das pontas", () => {
      expect(normalize("--Rio--de--Janeiro--")).toBe("rio-de-janeiro");
      expect(normalize("-paris-")).toBe("paris");
    });
  });

  // --- Sufixos parentéticos ---------------------------------------------
  describe("sufixos parentéticos", () => {
    it("remove conteúdo entre parênteses", () => {
      expect(normalize("Rio de Janeiro (Brasil)")).toBe("rio-de-janeiro");
      expect(normalize("Paris (FR)")).toBe("paris");
      expect(normalize("São Paulo (SP) (BR)")).toBe("sao-paulo");
    });
  });

  // --- Caixa e acentos --------------------------------------------------
  describe("caixa e acentos", () => {
    it("remove acentos e converte para lowercase", () => {
      expect(normalize("SÃO PAULO")).toBe("sao-paulo");
      expect(normalize("Foz do Iguaçu")).toBe("foz-do-iguacu");
      expect(normalize("Brasília")).toBe("brasilia");
    });
  });

  // --- Abreviações tratadas ---------------------------------------------
  describe("abreviações", () => {
    it("expande St. / Saint para 'sao'", () => {
      expect(normalize("St. Paul")).toBe("sao-paul");
      expect(normalize("Saint Lucia")).toBe("sao-lucia");
      expect(normalize("S. Petersburg")).toBe("sao-petersburg");
    });

    it("expande Ft. para 'fort' e Mt. para 'monte'", () => {
      expect(normalize("Ft. Lauderdale")).toBe("fort-lauderdale");
      expect(normalize("Mt. Fuji")).toBe("monte-fuji");
    });

    it("colapsa N.Y. em 'ny'", () => {
      expect(normalize("N.Y.")).toBe("ny");
    });
  });

  // --- Edge cases -------------------------------------------------------
  describe("edge cases", () => {
    it("string vazia ou undefined retorna string vazia", () => {
      expect(normalize("")).toBe("");
      expect(normalize(undefined)).toBe("");
      expect(normalize("   ")).toBe("");
    });

    it("remove caracteres especiais sem quebrar (emoji, pontuação solta)", () => {
      expect(normalize("Rio 🌴 de Janeiro")).toBe("rio-de-janeiro");
      expect(normalize("Paris!?")).toBe("paris");
    });

    it("preserva números (úteis para destinos com numeração)", () => {
      expect(normalize("Highway 101")).toBe("highway-101");
    });
  });

  // --- Integração: chave normalizada deve resolver via cadeia -----------
  describe("integração · entradas sujas devem resolver via getDestinationCoverUrl", () => {
    const cases: Array<[string, string]> = [
      ["Rio·Brasil", "rio-de-janeiro"], // mid-dot · sufixo cortado
      ["Rio/BR", "rio-de-janeiro"],
      ["Rio, RJ", "rio-de-janeiro"],
      ["Rio - RJ", "rio-de-janeiro"],
      ["Rio   de   Janeiro", "rio-de-janeiro"], // espaços múltiplos
      ["Rio de Janeiro (Brasil)", "rio-de-janeiro"],
      ["  rio_de_janeiro  ", "rio-de-janeiro"],
      ["São    Paulo", "sao-paulo"],
    ];
    for (const [input, expectedKey] of cases) {
      it(`"${input}" -> capa de ${expectedKey}`, () => {
        const url = getDestinationCoverUrl(input);
        expect(url).toBe(CITY_PHOTOS[expectedKey]);
      });
    }
  });
});
