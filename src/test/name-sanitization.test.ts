import { describe, it, expect } from "vitest";
import {
  extractClientNames,
  sanitizeClientNameUsage,
  stripRepeatedLeadingName,
} from "@/components/ai-team/agentFormatting";

describe("extractClientNames", () => {
  it("extracts name from 'sou a Fernanda'", () => {
    const info = extractClientNames("Lead: Oi! Sou a Fernanda");
    expect(info).not.toBeNull();
    expect(info!.fullName).toBe("Fernanda");
  });

  it("extracts name + alias from 'pode me chamar de Fê'", () => {
    const info = extractClientNames(
      "Lead: Sou a Fernanda, pode me chamar de Fê"
    );
    expect(info).not.toBeNull();
    expect(info!.aliases).toContain("Fernanda");
    expect(info!.aliases).toContain("Fê");
  });

  it("extracts alias from parentheses: Fernanda (ou Fê)", () => {
    const info = extractClientNames("Lead: Me chamo Fernanda (ou Fê)");
    expect(info).not.toBeNull();
    expect(info!.aliases).toContain("Fê");
  });

  it("handles short nicknames like Lu, Ju", () => {
    const info = extractClientNames("Lead: Sou a Lu");
    expect(info).not.toBeNull();
    expect(info!.fullName).toBe("Lu");
  });

  it("uses knownName when provided", () => {
    const info = extractClientNames("", "Fernanda Santos");
    expect(info).not.toBeNull();
    expect(info!.fullName).toBe("Fernanda");
  });

  it("returns null when no name found", () => {
    const info = extractClientNames("Lead: oi boa tarde");
    expect(info).toBeNull();
  });
});

describe("sanitizeClientNameUsage", () => {
  const ferInfo = extractClientNames("", "Fernanda")!;

  it("strips name when previous message used it", () => {
    const result = sanitizeClientNameUsage(
      "Fernanda, adorei a escolha!",
      ferInfo,
      ["Fernanda, que legal!"]
    );
    expect(result).not.toContain("Fernanda");
    expect(result.length).toBeGreaterThan(5);
  });

  it("strips name when used in 2+ of last 3 messages", () => {
    const result = sanitizeClientNameUsage(
      "Fernanda, vou montar!",
      ferInfo,
      ["Fernanda, oi!", "Fernanda, anotei!", "Show!"]
    );
    expect(result).not.toContain("Fernanda");
  });

  it("allows name when used in only 1 of last 3 messages", () => {
    const result = sanitizeClientNameUsage(
      "Fernanda, vou montar!",
      ferInfo,
      ["Oi!", "Fernanda, anotei!", "Show!"]
    );
    expect(result).toContain("Fernanda");
  });

  it("allows name when no recent usage", () => {
    const result = sanitizeClientNameUsage(
      "Fernanda, adorei!",
      ferInfo,
      ["Show!", "Entendi!", "Perfeito!"]
    );
    expect(result).toContain("Fernanda");
  });

  it("keeps only first occurrence when used 2+ times", () => {
    const result = sanitizeClientNameUsage(
      "Fernanda, vou montar. Fernanda, te mando logo!",
      ferInfo,
      ["Show!", "Entendi!", "Perfeito!"]
    );
    const count = (result.match(/Fernanda/gi) || []).length;
    expect(count).toBeLessThanOrEqual(1);
  });

  it("handles accented short aliases like Fê", () => {
    const info = extractClientNames("Lead: pode me chamar de Fê")!;
    const result = sanitizeClientNameUsage(
      "Fê, adorei!",
      info,
      ["Fê, que demais!"]
    );
    expect(result).not.toContain("Fê");
  });

  it("returns unchanged text when no nameInfo", () => {
    const result = sanitizeClientNameUsage("Oi, tudo bem?", null, []);
    expect(result).toBe("Oi, tudo bem?");
  });
});

describe("stripRepeatedLeadingName (backward compat)", () => {
  it("strips name when prev agent started with same name", () => {
    const result = stripRepeatedLeadingName(
      "Fernanda, vou montar!",
      "Fernanda, que legal!"
    );
    expect(result).not.toMatch(/^Fernanda/);
  });

  it("returns unchanged when no previous message", () => {
    const result = stripRepeatedLeadingName("Fernanda, oi!");
    expect(result).toBe("Fernanda, oi!");
  });
});
