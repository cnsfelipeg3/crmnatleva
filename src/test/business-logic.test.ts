import { describe, it, expect } from "vitest";

/**
 * Business Logic Tests for NatLeva
 * Tests cost calculations, margin, and status flows
 */

// ─── Cost Calculation Logic ───

function calculateAirMilesCost(qty: number, pricePerThousand: number, taxes: number, taxesIncluded: boolean): number {
  return (qty / 1000) * pricePerThousand + (taxesIncluded ? 0 : taxes);
}

function calculateMargin(received: number, cost: number): number {
  if (received <= 0) return 0;
  const profit = received - cost;
  return (profit / received) * 100;
}

describe("Cost Calculations", () => {
  it("calculates miles cost correctly with external taxes", () => {
    const result = calculateAirMilesCost(50000, 20, 500, false);
    // 50000/1000 * 20 = 1000 + 500 taxes = 1500
    expect(result).toBe(1500);
  });

  it("calculates miles cost correctly with included taxes", () => {
    const result = calculateAirMilesCost(50000, 20, 500, true);
    // 50000/1000 * 20 = 1000 (taxes included, so no addition)
    expect(result).toBe(1000);
  });

  it("calculates zero cost for zero miles", () => {
    expect(calculateAirMilesCost(0, 20, 500, false)).toBe(500); // only taxes
    expect(calculateAirMilesCost(0, 0, 0, false)).toBe(0);
  });

  it("calculates margin correctly", () => {
    expect(calculateMargin(10000, 7000)).toBeCloseTo(30, 1);
    expect(calculateMargin(10000, 10000)).toBe(0);
    expect(calculateMargin(10000, 12000)).toBeCloseTo(-20, 1);
  });

  it("returns 0 margin for zero received value", () => {
    expect(calculateMargin(0, 5000)).toBe(0);
  });

  it("handles high margin sales", () => {
    expect(calculateMargin(10000, 2000)).toBeCloseTo(80, 1);
  });
});

// ─── Status Flow Tests ───

const VALID_STATUSES = ["Rascunho", "Pendente", "Em andamento", "Emitido", "Fechado", "Cancelado"];

describe("Sale Status Flows", () => {
  it("all expected statuses exist", () => {
    expect(VALID_STATUSES).toHaveLength(6);
    expect(VALID_STATUSES).toContain("Cancelado");
    expect(VALID_STATUSES).toContain("Fechado");
  });

  it("default status is Rascunho", () => {
    expect(VALID_STATUSES[0]).toBe("Rascunho");
  });
});

// ─── Flight Duration Format ───

function formatDuration(mins: number): string {
  if (!mins) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m > 0 ? `${m}min` : ""}`;
}

describe("Flight Duration Formatting", () => {
  it("formats hours only", () => {
    expect(formatDuration(120)).toBe("2h");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(150)).toBe("2h30min");
  });

  it("formats minutes only", () => {
    expect(formatDuration(45)).toBe("0h45min");
  });

  it("returns empty for zero", () => {
    expect(formatDuration(0)).toBe("");
  });
});

// ─── Connection Time Classification ───

function classifyConnection(minutes: number, isInternational: boolean): "critical" | "warning" | "ok" {
  if (isInternational && minutes < 90) return "critical";
  if (!isInternational && minutes < 50) return "critical";
  if (minutes > 480) return "warning";
  return "ok";
}

describe("Connection Time Classification", () => {
  it("classifies critical international connections (<90min)", () => {
    expect(classifyConnection(60, true)).toBe("critical");
    expect(classifyConnection(89, true)).toBe("critical");
  });

  it("classifies critical domestic connections (<50min)", () => {
    expect(classifyConnection(30, false)).toBe("critical");
    expect(classifyConnection(49, false)).toBe("critical");
  });

  it("classifies long connections (>8h)", () => {
    expect(classifyConnection(500, false)).toBe("warning");
    expect(classifyConnection(500, true)).toBe("warning");
  });

  it("classifies ok connections", () => {
    expect(classifyConnection(120, true)).toBe("ok");
    expect(classifyConnection(90, true)).toBe("ok");
    expect(classifyConnection(60, false)).toBe("ok");
  });
});

// ─── Checkin Status Computation ───

function computeCheckinStatus(departureUtc: string | null): string {
  if (!departureUtc) return "BLOQUEADO";
  const diff = new Date(departureUtc).getTime() - Date.now();
  if (diff <= 0) return "CRITICO";
  const hours = diff / (1000 * 60 * 60);
  if (hours <= 6) return "CRITICO";
  if (hours <= 24) return "URGENTE";
  return "PENDENTE";
}

describe("Checkin Status Computation", () => {
  it("returns BLOQUEADO for null departure", () => {
    expect(computeCheckinStatus(null)).toBe("BLOQUEADO");
  });

  it("returns CRITICO for past departures", () => {
    const past = new Date(Date.now() - 3600000).toISOString();
    expect(computeCheckinStatus(past)).toBe("CRITICO");
  });

  it("returns CRITICO for <6h", () => {
    const soon = new Date(Date.now() + 3 * 3600000).toISOString();
    expect(computeCheckinStatus(soon)).toBe("CRITICO");
  });

  it("returns URGENTE for 6-24h", () => {
    const tomorrow = new Date(Date.now() + 12 * 3600000).toISOString();
    expect(computeCheckinStatus(tomorrow)).toBe("URGENTE");
  });

  it("returns PENDENTE for >24h", () => {
    const future = new Date(Date.now() + 48 * 3600000).toISOString();
    expect(computeCheckinStatus(future)).toBe("PENDENTE");
  });
});

// ─── Airline Logo URL Generation ───

function getLogoUrl(iata: string): string {
  if (!iata) return "";
  return `https://pics.avs.io/60/60/${iata.toUpperCase().trim()}.png`;
}

describe("Airline Logo URL Generation", () => {
  it("generates correct URL for valid IATA", () => {
    expect(getLogoUrl("TP")).toBe("https://pics.avs.io/60/60/TP.png");
    expect(getLogoUrl("la")).toBe("https://pics.avs.io/60/60/LA.png");
  });

  it("returns empty for empty IATA", () => {
    expect(getLogoUrl("")).toBe("");
  });

  it("trims whitespace", () => {
    expect(getLogoUrl("  G3  ")).toBe("https://pics.avs.io/60/60/G3.png");
  });
});

// ─── Date Formatting ───

function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const [year, month, day] = dateStr.split("T")[0].split("-");
    return `${day}/${month}/${year}`;
  } catch {
    return "—";
  }
}

describe("Date Formatting (BR)", () => {
  it("formats ISO date to dd/mm/yyyy", () => {
    expect(formatDateBR("2026-03-15")).toBe("15/03/2026");
  });

  it("handles datetime strings", () => {
    expect(formatDateBR("2026-03-15T10:30:00")).toBe("15/03/2026");
  });

  it("returns dash for null", () => {
    expect(formatDateBR(null)).toBe("—");
  });

  it("returns dash for undefined", () => {
    expect(formatDateBR(undefined)).toBe("—");
  });
});

// ─── Client KPI Aggregation ───

interface MockSale {
  received_value: number;
  total_cost: number;
  profit: number;
  margin: number;
  destination_iata: string | null;
}

function computeClientKPIs(sales: MockSale[]) {
  const totalReceived = sales.reduce((s, v) => s + (v.received_value || 0), 0);
  const totalCost = sales.reduce((s, v) => s + (v.total_cost || 0), 0);
  const totalProfit = totalReceived - totalCost;
  const avgMargin = sales.length > 0 ? sales.reduce((s, v) => s + (v.margin || 0), 0) / sales.length : 0;
  const avgTicket = sales.length > 0 ? totalReceived / sales.length : 0;

  const destCount: Record<string, number> = {};
  sales.forEach(s => { if (s.destination_iata) destCount[s.destination_iata] = (destCount[s.destination_iata] || 0) + 1; });
  const topDests = Object.entries(destCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d]) => d);

  return { totalReceived, totalCost, totalProfit, avgMargin, avgTicket, totalSales: sales.length, topDests };
}

describe("Client KPI Aggregation", () => {
  const mockSales: MockSale[] = [
    { received_value: 10000, total_cost: 7000, profit: 3000, margin: 30, destination_iata: "FCO" },
    { received_value: 8000, total_cost: 5000, profit: 3000, margin: 37.5, destination_iata: "FCO" },
    { received_value: 15000, total_cost: 10000, profit: 5000, margin: 33.3, destination_iata: "CDG" },
  ];

  it("calculates total received", () => {
    const kpis = computeClientKPIs(mockSales);
    expect(kpis.totalReceived).toBe(33000);
  });

  it("calculates total profit", () => {
    const kpis = computeClientKPIs(mockSales);
    expect(kpis.totalProfit).toBe(11000);
  });

  it("calculates average ticket", () => {
    const kpis = computeClientKPIs(mockSales);
    expect(kpis.avgTicket).toBe(11000);
  });

  it("finds top destinations", () => {
    const kpis = computeClientKPIs(mockSales);
    expect(kpis.topDests[0]).toBe("FCO"); // 2 sales
    expect(kpis.topDests[1]).toBe("CDG"); // 1 sale
  });

  it("handles empty sales", () => {
    const kpis = computeClientKPIs([]);
    expect(kpis.totalReceived).toBe(0);
    expect(kpis.avgMargin).toBe(0);
    expect(kpis.topDests).toHaveLength(0);
  });
});
