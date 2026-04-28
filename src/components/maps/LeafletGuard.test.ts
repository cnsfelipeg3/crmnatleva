import { describe, it, expect } from "vitest";
import { isLeafletAvailable } from "./LeafletGuard";

describe("isLeafletAvailable", () => {
  it("retorna true em ambiente de teste · leaflet importado normalmente", () => {
    // jsdom carrega leaflet sem problemas · valida o caminho feliz.
    expect(isLeafletAvailable()).toBe(true);
  });
});
