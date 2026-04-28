import { describe, it, expect } from "vitest";
import { resolveAirlineWebsite, AIRLINE_REGISTRY } from "../airlineRegistry";

describe("airlineRegistry", () => {
  it("resolve LATAM por código IATA", () => {
    const url = resolveAirlineWebsite("LA");
    expect(url).toContain("latam.com");
    expect(url).toMatch(/^https:\/\//);
  });

  it("resolve Iberia por nome", () => {
    const url = resolveAirlineWebsite("Iberia");
    expect(url).toContain("iberia.com");
  });

  it("é case insensitive em códigos IATA", () => {
    expect(resolveAirlineWebsite("la")).toEqual(resolveAirlineWebsite("LA"));
  });

  it("retorna null pra cia desconhecida", () => {
    expect(resolveAirlineWebsite("XYZ Unknown Airlines")).toBeNull();
  });

  it("registry tem mais de 20 cias", () => {
    expect(Object.keys(AIRLINE_REGISTRY).length).toBeGreaterThan(20);
  });

  it("trata input vazio sem crashar", () => {
    expect(resolveAirlineWebsite("")).toBeNull();
    expect(resolveAirlineWebsite(null)).toBeNull();
    expect(resolveAirlineWebsite(undefined)).toBeNull();
  });

  it("inclui entradas para Brasil (LATAM + GOL + Azul)", () => {
    expect(AIRLINE_REGISTRY).toHaveProperty("LA");
    expect(AIRLINE_REGISTRY).toHaveProperty("G3");
    expect(AIRLINE_REGISTRY).toHaveProperty("AD");
  });

  it("entradas têm domínio válido", () => {
    for (const e of Object.values(AIRLINE_REGISTRY)) {
      expect(e.domain).toMatch(/\.[a-z]{2,}/);
      expect(e.code).toMatch(/^[A-Z0-9]{2}$/);
    }
  });
});
