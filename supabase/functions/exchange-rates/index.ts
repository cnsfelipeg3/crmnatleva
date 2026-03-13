const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// In-memory cache (persisted across warm invocations)
let cachedData: { rates: Record<string, number>; timestamp: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const CURRENCIES = ["USD", "EUR", "CHF", "AED", "CLP", "ARS", "BRL"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const now = Date.now();

    // Return cached data if fresh
    if (cachedData && now - cachedData.timestamp < CACHE_TTL_MS) {
      return new Response(
        JSON.stringify({
          rates: cachedData.rates,
          timestamp: cachedData.timestamp,
          cached: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appId = Deno.env.get("OPEN_EXCHANGE_RATES_APP_ID");
    if (!appId) {
      return new Response(
        JSON.stringify({ error: "OPEN_EXCHANGE_RATES_APP_ID not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch from Open Exchange Rates (base is always USD on free plan)
    const symbols = CURRENCIES.join(",");
    const response = await fetch(
      `https://openexchangerates.org/api/latest.json?app_id=${appId}&symbols=${symbols}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Open Exchange Rates API error [${response.status}]: ${errorText}`);
    }

    const data = await response.json();
    const usdRates = data.rates; // rates relative to USD

    // Convert all currencies to BRL
    // If 1 USD = X BRL, then 1 EUR = (BRL_rate / EUR_rate) BRL
    const brlPerUsd = usdRates.BRL;
    if (!brlPerUsd) {
      throw new Error("BRL rate not found in API response");
    }

    const brlRates: Record<string, number> = {};
    for (const currency of CURRENCIES) {
      if (currency === "BRL") continue;
      const usdPerCurrency = usdRates[currency];
      if (usdPerCurrency) {
        // 1 unit of currency = brlPerUsd / usdPerCurrency BRL
        brlRates[currency] = brlPerUsd / usdPerCurrency;
      }
    }

    // Cache it
    cachedData = { rates: brlRates, timestamp: now };

    return new Response(
      JSON.stringify({
        rates: brlRates,
        timestamp: now,
        cached: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Exchange rates error:", err);

    // Return stale cache if available
    if (cachedData) {
      return new Response(
        JSON.stringify({
          rates: cachedData.rates,
          timestamp: cachedData.timestamp,
          cached: true,
          stale: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
