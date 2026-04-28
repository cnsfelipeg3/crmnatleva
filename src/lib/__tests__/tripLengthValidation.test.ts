import { describe, it, expect } from "vitest";
import {
  validateTripLength,
  validateTripLengthFromSegments,
} from "../tripLengthValidation";

describe("validateTripLength", () => {
  it("retorna ok quando datas batem", () => {
    const r = validateTripLength({
      formDeparture: "2026-05-01",
      formReturn: "2026-05-10",
      segDeparture: "2026-05-01",
      segReturn: "2026-05-10",
    });
    expect(r.hasMismatch).toBe(false);
    expect(r.severity).toBe("ok");
    expect(r.diffDays).toBe(0);
  });

  it("detecta divergência de 1 dia como warn", () => {
    const r = validateTripLength({
      formDeparture: "2026-05-01",
      formReturn: "2026-05-11",
      segDeparture: "2026-05-01",
      segReturn: "2026-05-10",
    });
    expect(r.hasMismatch).toBe(true);
    expect(r.severity).toBe("warn");
    expect(r.diffDays).toBe(1);
  });

  it("divergência >= 3 dias é error", () => {
    const r = validateTripLength({
      formDeparture: "2026-05-01",
      formReturn: "2026-05-15",
      segDeparture: "2026-05-01",
      segReturn: "2026-05-10",
    });
    expect(r.severity).toBe("error");
    expect(r.diffDays).toBe(5);
  });

  it("retorna ok quando faltam dados", () => {
    const r = validateTripLength({
      formDeparture: null,
      formReturn: null,
      segDeparture: null,
      segReturn: null,
    });
    expect(r.hasMismatch).toBe(false);
    expect(r.severity).toBe("ok");
  });

  it("não dá shift de timezone (GMT-3)", () => {
    // 1 a 2 de Janeiro = 1 dia, mesmo perto da meia-noite UTC
    const r = validateTripLength({
      formDeparture: "2026-01-01",
      formReturn: "2026-01-02",
      segDeparture: "2026-01-01",
      segReturn: "2026-01-02",
    });
    expect(r.formTripLength).toBe(1);
    expect(r.segTripLength).toBe(1);
  });
});

describe("validateTripLengthFromSegments", () => {
  it("usa primeiro ida e último volta", () => {
    const r = validateTripLengthFromSegments(
      "2026-05-01",
      "2026-05-10",
      [
        { direction: "ida", departure_date: "2026-05-01" },
        { direction: "volta", departure_date: "2026-05-10" },
      ],
    );
    expect(r.hasMismatch).toBe(false);
  });

  it("ignora segmentos sem direction", () => {
    const r = validateTripLengthFromSegments(
      "2026-05-01",
      "2026-05-10",
      [
        { direction: null, departure_date: "2026-05-05" },
        { direction: "ida", departure_date: "2026-05-01" },
        { direction: "volta", departure_date: "2026-05-10" },
      ],
    );
    expect(r.hasMismatch).toBe(false);
  });
});
