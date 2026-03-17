import { describe, it, expect } from "vitest";
import {
  getConfidenceLevel,
  buildCommercialSummary,
  getHighlightAmenity,
  getPhotoTag,
  isPhotoFaithfulToRoom,
} from "@/components/hotel-media/types";
import type { SectionDetail } from "@/components/hotel-media/types";

// Mock photo factory
const makePhoto = (overrides: Record<string, any> = {}) => ({
  url: "https://example.com/photo.jpg",
  category: "quarto",
  source: "official" as const,
  confidence: 0.85,
  environment_name: "",
  room_name: "",
  html_context: "",
  description: "",
  room_type: "",
  bed_type: "",
  ...overrides,
});

// ─── getConfidenceLevel ───
describe("getConfidenceLevel", () => {
  it("returns alta for >=0.8", () => expect(getConfidenceLevel(0.8)).toBe("alta"));
  it("returns media for 0.5-0.79", () => expect(getConfidenceLevel(0.65)).toBe("media"));
  it("returns revisar for <0.5", () => expect(getConfidenceLevel(0.3)).toBe("revisar"));
  it("edge: exactly 0.5", () => expect(getConfidenceLevel(0.5)).toBe("media"));
});

// ─── buildCommercialSummary ───
describe("buildCommercialSummary", () => {
  it("returns empty for undefined detail", () => {
    const result = buildCommercialSummary(undefined);
    expect(result.line1).toBe("");
    expect(result.line2).toBe("");
  });

  it("builds line1 from Tamanho + Cama + Capacidade", () => {
    const detail: SectionDetail = {
      description: "",
      details: { Tamanho: "45m²", Cama: "King", Capacidade: "2 hóspedes" },
      amenities: [],
    };
    const result = buildCommercialSummary(detail);
    expect(result.line1).toBe("45m² · King · 2 hóspedes");
  });

  it("truncates line1 at 60 chars", () => {
    const detail: SectionDetail = {
      description: "",
      details: { Tamanho: "A".repeat(30), Cama: "B".repeat(30), Capacidade: "C".repeat(10) },
      amenities: [],
    };
    const result = buildCommercialSummary(detail);
    expect(result.line1.length).toBeLessThanOrEqual(60);
  });

  it("builds line2 from highlight amenity + vista", () => {
    const detail: SectionDetail = {
      description: "",
      details: { Vista: "Vista mar" },
      amenities: ["Terraço privativo", "Wi-Fi"],
    };
    const result = buildCommercialSummary(detail);
    expect(result.line2).toContain("Terraço privativo");
    expect(result.line2).toContain("Vista mar");
  });

  it("avoids duplicate vista in line2", () => {
    const detail: SectionDetail = {
      description: "",
      details: { Vista: "Vista mar" },
      amenities: ["Vista mar panorâmica"],
    };
    const result = buildCommercialSummary(detail);
    // Should not have both "Vista mar panorâmica" and "Vista mar"
    const count = (result.line2.match(/vista/gi) || []).length;
    expect(count).toBeLessThanOrEqual(1);
  });

  it("returns empty line2 when no highlight and no vista", () => {
    const detail: SectionDetail = {
      description: "",
      details: { Tamanho: "30m²" },
      amenities: ["Wi-Fi", "TV"],
    };
    const result = buildCommercialSummary(detail);
    expect(result.line2).toBe("");
  });
});

// ─── getHighlightAmenity ───
describe("getHighlightAmenity", () => {
  it("finds terraço", () => {
    expect(getHighlightAmenity(["Wi-Fi", "Terraço privativo"])).toBe("Terraço privativo");
  });

  it("returns null when no highlight keyword", () => {
    expect(getHighlightAmenity(["Wi-Fi", "TV", "Ar-condicionado"])).toBeNull();
  });

  it("is case insensitive", () => {
    expect(getHighlightAmenity(["BANHEIRA DE HIDROMASSAGEM"])).toBe("BANHEIRA DE HIDROMASSAGEM");
  });
});

// ─── isPhotoFaithfulToRoom ───
describe("isPhotoFaithfulToRoom", () => {
  it("matches by environment_name inclusion", () => {
    const photo = makePhoto({ environment_name: "Ocean View Suite" });
    expect(isPhotoFaithfulToRoom(photo, "Ocean View Suite")).toBe(true);
  });

  it("handles accent normalization", () => {
    const photo = makePhoto({ environment_name: "Suíte Oceânica" });
    expect(isPhotoFaithfulToRoom(photo, "Suite Oceanica")).toBe(true);
  });

  it("matches partial room name inclusion", () => {
    const photo = makePhoto({ environment_name: "Deluxe Room" });
    expect(isPhotoFaithfulToRoom(photo, "Deluxe Room with Balcony")).toBe(true);
  });

  it("matches by html_context", () => {
    const photo = makePhoto({ html_context: '<div class="ocean-view-suite">Photo</div>' });
    expect(isPhotoFaithfulToRoom(photo, "Ocean View Suite")).toBe(true);
  });

  it("rejects short room names (<3 chars normalized)", () => {
    const photo = makePhoto({ environment_name: "AB" });
    expect(isPhotoFaithfulToRoom(photo, "AB")).toBe(false);
  });

  it("rejects completely unrelated", () => {
    const photo = makePhoto({ environment_name: "Piscina" });
    expect(isPhotoFaithfulToRoom(photo, "Ocean View Suite")).toBe(false);
  });
});

// ─── getPhotoTag ───
describe("getPhotoTag", () => {
  it("returns capa_recomendada for official fachada with high confidence", () => {
    const photo = makePhoto({ category: "fachada", source: "official", confidence: 0.9 });
    expect(getPhotoTag(photo, [photo])).toBe("capa_recomendada");
  });

  it("returns destaque for high confidence official", () => {
    const photo = makePhoto({ category: "quarto", source: "official", confidence: 0.95 });
    expect(getPhotoTag(photo, [photo])).toBe("destaque");
  });

  it("returns null for complementar photos even with high confidence", () => {
    const photo = makePhoto({ category: "quarto", source: "booking", confidence: 0.95 });
    expect(getPhotoTag(photo, [photo])).toBeNull();
  });

  it("returns fiel_ao_quarto only when html_context matches and source is official", () => {
    const photo = makePhoto({
      category: "quarto", source: "official", confidence: 0.75,
      html_context: '<section class="deluxe-room">Photo gallery</section>',
    });
    expect(getPhotoTag(photo, [photo], "Deluxe Room")).toBe("fiel_ao_quarto");
  });

  it("does NOT tag fiel_ao_quarto when source is complementar", () => {
    const photo = makePhoto({
      category: "quarto", source: "booking", confidence: 0.75,
      html_context: '<section class="deluxe-room">Photo gallery</section>',
    });
    expect(getPhotoTag(photo, [photo], "Deluxe Room")).toBeNull();
  });

  it("returns null for low confidence photos", () => {
    const photo = makePhoto({ category: "fachada", source: "official", confidence: 0.5 });
    expect(getPhotoTag(photo, [photo])).toBeNull();
  });

  it("priority: capa_recomendada > destaque", () => {
    const photo = makePhoto({ category: "fachada", source: "official", confidence: 0.95 });
    expect(getPhotoTag(photo, [photo])).toBe("capa_recomendada");
  });
});
