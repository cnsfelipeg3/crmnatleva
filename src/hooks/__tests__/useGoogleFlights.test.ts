import { describe, it, expect, vi, beforeEach } from "vitest";
import { invokeGFlights } from "../useGoogleFlights";
import { supabase } from "@/integrations/supabase/client";

describe("invokeGFlights", () => {
  beforeEach(() => vi.clearAllMocks());

  it("propaga erro se supabase.functions.invoke retornar error", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: { message: "boom", name: "FunctionsHttpError" } as any,
    } as any);
    await expect(
      invokeGFlights("searchAirport", { query: "GRU" })
    ).rejects.toThrow("boom");
  });

  it("retorna data quando supabase responde ok", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { data: [{ id: "GRU" }] },
      error: null,
    } as any);
    const r = await invokeGFlights<any>("searchAirport", { query: "GRU" });
    expect(r.data[0].id).toBe("GRU");
  });

  it("rejeita se response tem error inline", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { error: "rate_limit", message: "too fast" },
      error: null,
    } as any);
    await expect(
      invokeGFlights("searchFlights", {})
    ).rejects.toThrow(/rate_limit/);
  });

  it("passa params corretamente ao invoke", async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: {}, error: null } as any);
    await invokeGFlights("searchFlights", { departure_id: "GRU", arrival_id: "FCO" });
    expect(supabase.functions.invoke).toHaveBeenCalledWith(
      "google-flights-rapidapi",
      expect.objectContaining({
        body: expect.objectContaining({
          action: "searchFlights",
          departure_id: "GRU",
          arrival_id: "FCO",
        }),
      }),
    );
  });
});
