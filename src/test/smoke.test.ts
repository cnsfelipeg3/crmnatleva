import { describe, it, expect } from "vitest";
import { formatBRL, formatMinutes } from "@/components/google-flights/gflightsTypes";

describe("smoke · formatters", () => {
  it("formatBRL formata em pt-BR", () => {
    const f = formatBRL(1234.56);
    expect(f).toMatch(/R\$/);
    expect(f).toMatch(/1\.234/);
  });

  it("formatBRL trata 0", () => {
    expect(formatBRL(0)).toMatch(/R\$\s*0/);
  });

  it("formatBRL trata números grandes", () => {
    const f = formatBRL(999999);
    expect(f).toMatch(/999\.999/);
  });

  it("formatBRL trata null/undefined sem crashar", () => {
    expect(typeof formatBRL(null)).toBe("string");
    expect(typeof formatBRL(undefined)).toBe("string");
  });

  it("formatMinutes converte minutos em h/min", () => {
    const r = formatMinutes(125);
    expect(typeof r).toBe("string");
    expect(r.length).toBeGreaterThan(0);
  });
});

describe("smoke · environment", () => {
  it("import.meta.env existe", () => {
    expect(typeof import.meta.env).toBe("object");
  });
});
