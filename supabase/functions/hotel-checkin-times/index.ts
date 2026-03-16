const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { hotel_name, hotel_city, hotel_country } = await req.json();

    if (!hotel_name) {
      return new Response(
        JSON.stringify({ success: false, error: "hotel_name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const location = [hotel_city, hotel_country].filter(Boolean).join(" ");
    const searchQuery = `${hotel_name} ${location} check-in check-out time horário`;

    console.log("Searching for hotel times:", searchQuery);

    // Search multiple sources via Firecrawl
    const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 5,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    if (!searchResponse.ok) {
      const errText = await searchResponse.text();
      console.error("Firecrawl search error:", searchResponse.status, errText);
      return new Response(
        JSON.stringify({ success: false, error: "Search failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchData = await searchResponse.json();
    const results = searchData.data || searchData.results || [];

    // Collect all markdown content from results
    const allContent = results
      .map((r: any) => {
        const source = r.url || r.sourceURL || "";
        const md = r.markdown || r.content || "";
        return `--- SOURCE: ${source} ---\n${md.slice(0, 3000)}`;
      })
      .join("\n\n")
      .slice(0, 12000);

    if (!allContent || allContent.length < 50) {
      return new Response(
        JSON.stringify({
          success: true,
          checkin_time: "14:00",
          checkout_time: "12:00",
          source: "default",
          note: "Horários padrão (não foi possível encontrar informações específicas)",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use AI to extract check-in/check-out times from the scraped content
    if (!LOVABLE_API_KEY) {
      // Fallback: try regex extraction
      const times = extractTimesFromText(allContent);
      return new Response(
        JSON.stringify({
          success: true,
          ...times,
          source: "regex",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You extract hotel check-in and check-out times from web content. 
Return ONLY a JSON object with these fields:
- checkin_time: string (format "HH:MM", 24h)
- checkout_time: string (format "HH:MM", 24h)
- early_checkin: string | null (earliest possible check-in if mentioned)
- late_checkout: string | null (latest possible checkout if mentioned)
- source_url: string (the URL where you found the info)
- confidence: "high" | "medium" | "low"
- notes: string (any relevant policies like early check-in fees, late checkout fees)

If you cannot find specific times, use hotel industry defaults:
- Check-in: 14:00 or 15:00
- Check-out: 11:00 or 12:00
And set confidence to "low".`,
          },
          {
            role: "user",
            content: `Extract check-in and check-out times for "${hotel_name}" in ${location} from this content:\n\n${allContent}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_hotel_times",
              description: "Extract check-in and check-out times from hotel information",
              parameters: {
                type: "object",
                properties: {
                  checkin_time: { type: "string", description: "Check-in time in HH:MM format (24h)" },
                  checkout_time: { type: "string", description: "Check-out time in HH:MM format (24h)" },
                  early_checkin: { type: ["string", "null"], description: "Earliest possible check-in" },
                  late_checkout: { type: ["string", "null"], description: "Latest possible check-out" },
                  source_url: { type: "string", description: "URL where the info was found" },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  notes: { type: "string", description: "Additional policies or notes" },
                },
                required: ["checkin_time", "checkout_time", "confidence"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_hotel_times" } },
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI error:", aiResponse.status);
      const times = extractTimesFromText(allContent);
      return new Response(
        JSON.stringify({ success: true, ...times, source: "regex_fallback" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      console.log("AI extracted times:", parsed);
      return new Response(
        JSON.stringify({ success: true, ...parsed, source: "ai" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback
    const times = extractTimesFromText(allContent);
    return new Response(
      JSON.stringify({ success: true, ...times, source: "fallback" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function extractTimesFromText(text: string): {
  checkin_time: string;
  checkout_time: string;
  confidence: string;
  note: string;
} {
  const checkinPatterns = [
    /check[- ]?in[:\s]*(?:a partir d[aeo]s?\s*)?(\d{1,2})[h:](\d{2})?/gi,
    /check[- ]?in[:\s]*(\d{1,2}):(\d{2})/gi,
    /entrada[:\s]*(?:a partir d[aeo]s?\s*)?(\d{1,2})[h:](\d{2})?/gi,
  ];
  const checkoutPatterns = [
    /check[- ]?out[:\s]*(?:até\s*)?(\d{1,2})[h:](\d{2})?/gi,
    /check[- ]?out[:\s]*(\d{1,2}):(\d{2})/gi,
    /saída[:\s]*(?:até\s*)?(\d{1,2})[h:](\d{2})?/gi,
  ];

  let checkin_time = "14:00";
  let checkout_time = "12:00";
  let found = false;

  for (const pattern of checkinPatterns) {
    const match = pattern.exec(text);
    if (match) {
      const h = match[1].padStart(2, "0");
      const m = (match[2] || "00").padStart(2, "0");
      checkin_time = `${h}:${m}`;
      found = true;
      break;
    }
  }

  for (const pattern of checkoutPatterns) {
    const match = pattern.exec(text);
    if (match) {
      const h = match[1].padStart(2, "0");
      const m = (match[2] || "00").padStart(2, "0");
      checkout_time = `${h}:${m}`;
      found = true;
      break;
    }
  }

  return {
    checkin_time,
    checkout_time,
    confidence: found ? "medium" : "low",
    note: found
      ? "Horários extraídos via regex do conteúdo encontrado"
      : "Horários padrão do setor hoteleiro (informação específica não encontrada)",
  };
}
