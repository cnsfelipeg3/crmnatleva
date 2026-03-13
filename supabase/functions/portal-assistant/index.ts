import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CITY_TO_IATA: Record<string, string[]> = {
  orlando: ["MCO"],
  roma: ["FCO"],
  rome: ["FCO"],
  paris: ["CDG", "ORY"],
  miami: ["MIA"],
  lisboa: ["LIS"],
  madrid: ["MAD"],
  barcelona: ["BCN"],
  londres: ["LHR", "LGW"],
  london: ["LHR", "LGW"],
  santiago: ["SCL"],
  milao: ["MXP"],
  milão: ["MXP"],
  nova_york: ["JFK", "EWR", "LGA"],
  "nova york": ["JFK", "EWR", "LGA"],
  "new york": ["JFK", "EWR", "LGA"],
  dubai: ["DXB"],
};

const PAID_STATUSES = new Set(["pago", "recebido", "paid"]);

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isUuid = (value?: string | null) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const normalizeDigits = (value?: string | null) => (value || "").replace(/\D/g, "");

const formatDateBR = (value?: string | null) => {
  if (!value) return "N/A";
  const normalized = value.includes("T") ? value : `${value}T00:00:00`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
};

const formatDateTimeBR = (value?: string | null) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

function extractHintedIatas(question: string) {
  const q = question.toLowerCase();
  const hinted = new Set<string>();

  for (const [city, iatas] of Object.entries(CITY_TO_IATA)) {
    if (q.includes(city)) iatas.forEach((iata) => hinted.add(iata));
  }

  return [...hinted];
}

function hasQuestionMatch(question: string, sale: any) {
  const q = question.toLowerCase();
  if (sale?.destination_iata && q.includes(String(sale.destination_iata).toLowerCase())) return true;
  if (sale?.origin_iata && q.includes(String(sale.origin_iata).toLowerCase())) return true;

  const saleNameWords = String(sale?.name || "")
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4);

  return saleNameWords.some((w) => q.includes(w));
}

function saleTemporalRank(sale: any) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const dep = sale?.departure_date ? new Date(`${sale.departure_date}T00:00:00`) : null;
  const ret = sale?.return_date ? new Date(`${sale.return_date}T00:00:00`) : null;

  if (dep && dep > now) return { rank: 0, ts: dep.getTime() };
  if (dep && ret && dep <= now && ret >= now) return { rank: 1, ts: dep.getTime() };
  return { rank: 2, ts: -(ret?.getTime() || dep?.getTime() || 0) };
}

function scoreSaleForSelection(sale: any, options: { question: string; focusedSaleId?: string | null; hintedIatas: string[] }) {
  let score = 100;

  if (options.focusedSaleId && sale.id === options.focusedSaleId) score -= 1000;
  if (options.hintedIatas.includes(sale.destination_iata)) score -= 120;
  if (hasQuestionMatch(options.question, sale)) score -= 60;

  const temporal = saleTemporalRank(sale);
  score += temporal.rank * 20;
  score += temporal.rank === 0 ? temporal.ts / 1e12 : 0;

  return score;
}

async function resolveScope(admin: any, userId: string, isAdmin: boolean) {
  if (isAdmin) {
    const { data: access } = await admin
      .from("portal_access")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    return {
      access,
      clientId: access?.client_id ?? null,
    };
  }

  const { data: access } = await admin
    .from("portal_access")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (!access) return null;

  return {
    access,
    clientId: access.client_id,
  };
}

async function collectAccessibleSaleIds({
  admin,
  isAdmin,
  clientId,
  client,
  question,
  requestedSaleId,
}: {
  admin: any;
  isAdmin: boolean;
  clientId: string | null;
  client: any;
  question: string;
  requestedSaleId?: string | null;
}) {
  const ids = new Set<string>();
  const hintedIatas = extractHintedIatas(question);

  const runQuery = async (promise: Promise<any>) => {
    const { data } = await promise;
    return (data || []) as any[];
  };

  if (clientId) {
    const [publishedRows, directRows] = await Promise.all([
      runQuery(
        admin
          .from("portal_published_sales")
          .select("sale_id")
          .eq("client_id", clientId)
          .eq("is_active", true)
          .limit(200),
      ),
      runQuery(admin.from("sales").select("id").eq("client_id", clientId).limit(300)),
    ]);

    publishedRows.forEach((row) => row.sale_id && ids.add(row.sale_id));
    directRows.forEach((row) => row.id && ids.add(row.id));
  }

  if (client?.display_name && String(client.display_name).trim().length >= 3) {
    const name = String(client.display_name).trim();
    const nameRows = await runQuery(admin.from("sales").select("id").ilike("name", `%${name}%`).limit(60));
    nameRows.forEach((row) => row.id && ids.add(row.id));
  }

  if (client?.phone) {
    const phoneDigits = normalizeDigits(client.phone);
    if (phoneDigits.length >= 8) {
      const phoneTail = phoneDigits.slice(-8);
      const passengerRows = await runQuery(
        admin.from("passengers").select("id").ilike("phone", `%${phoneTail}%`).limit(200),
      );

      const passengerIds = passengerRows.map((p) => p.id).filter(Boolean);
      if (passengerIds.length) {
        const links = await runQuery(
          admin.from("sale_passengers").select("sale_id").in("passenger_id", passengerIds).limit(400),
        );
        links.forEach((row) => row.sale_id && ids.add(row.sale_id));
      }
    }
  }

  if (requestedSaleId && isUuid(requestedSaleId)) {
    if (isAdmin) {
      ids.add(requestedSaleId);
    } else if (clientId) {
      const [{ data: pubCheck }, { data: saleCheck }] = await Promise.all([
        admin
          .from("portal_published_sales")
          .select("sale_id")
          .eq("sale_id", requestedSaleId)
          .eq("client_id", clientId)
          .eq("is_active", true)
          .maybeSingle(),
        admin.from("sales").select("id, client_id").eq("id", requestedSaleId).maybeSingle(),
      ]);

      if (pubCheck?.sale_id || saleCheck?.client_id === clientId) ids.add(requestedSaleId);
    }
  }

  if (isAdmin) {
    if (hintedIatas.length) {
      const hintedRows = await runQuery(
        admin
          .from("sales")
          .select("id")
          .in("destination_iata", hintedIatas)
          .order("departure_date", { ascending: false })
          .limit(50),
      );
      hintedRows.forEach((row) => row.id && ids.add(row.id));
    }

    if (ids.size < 8) {
      const fallbackRows = await runQuery(
        admin
          .from("sales")
          .select("id")
          .order("created_at", { ascending: false })
          .limit(50),
      );
      fallbackRows.forEach((row) => row.id && ids.add(row.id));
    }
  }

  return [...ids];
}

function buildNextCommitment({
  sale,
  segments,
  services,
  lodging,
}: {
  sale: any;
  segments: any[];
  services: any[];
  lodging: any[];
}) {
  const now = new Date();

  const events: { date: Date; label: string }[] = [];

  for (const seg of segments) {
    if (!seg.departure_date) continue;
    const date = new Date(`${seg.departure_date}T${seg.departure_time || "00:00"}:00`);
    if (!Number.isNaN(date.getTime())) {
      events.push({
        date,
        label: `Voo ${seg.airline || ""} ${seg.flight_number || "s/n"} (${seg.origin_iata || "?"} → ${seg.destination_iata || "?"})`,
      });
    }
  }

  for (const svc of services) {
    const dateField = svc.date || svc.service_date || svc.start_date;
    if (!dateField) continue;
    const date = new Date(`${dateField}T${svc.time || "00:00"}:00`);
    if (!Number.isNaN(date.getTime())) {
      events.push({
        date,
        label: svc.description || svc.title || "Atividade",
      });
    }
  }

  for (const hotel of lodging) {
    const ci = hotel.checkin_date || hotel.hotel_checkin_datetime_utc;
    if (!ci) continue;
    const date = new Date(ci.includes("T") ? ci : `${ci}T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      events.push({
        date,
        label: `Check-in ${hotel.hotel_name || hotel.description || "Hotel"}`,
      });
    }
  }

  if (!events.length) {
    if (sale?.departure_date) {
      return `Embarque previsto em ${formatDateBR(sale.departure_date)}.`;
    }
    return "Sem compromisso futuro identificado.";
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  const upcoming = events.find((e) => e.date.getTime() >= now.getTime()) || events[events.length - 1];
  return `${upcoming.label} em ${upcoming.date.toLocaleDateString("pt-BR")} ${upcoming.date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function appendMockTripContext(tripContext: string, mockTrip: any, focused: boolean) {
  const sale = mockTrip?.sale || {};
  const segments = mockTrip?.segments || [];
  const hotels = [...(mockTrip?.hotels || []), ...(mockTrip?.lodging || [])];
  const services = mockTrip?.services || [];
  const receivables = mockTrip?.financial?.receivables || [];

  const totalDue = receivables.reduce((acc: number, row: any) => acc + Number(row.gross_value || 0), 0);
  const totalPaid = receivables
    .filter((row: any) => PAID_STATUSES.has(String(row.status || "").toLowerCase()))
    .reduce((acc: number, row: any) => acc + Number(row.gross_value || 0), 0);

  let block = "";
  block += `\n\n${"=".repeat(60)}\n`;
  block += `VIAGEM: ${mockTrip?.custom_title || sale.name || "Viagem"}${focused ? " ★ (VIAGEM EM FOCO)" : ""}\n`;
  block += `${"=".repeat(60)}\n`;
  block += `ID: ${mockTrip?.sale_id || sale.id || "N/A"}\n`;
  block += `Status da venda: ${sale.status || "N/A"}\n`;
  block += `Destino: ${sale.destination_iata || "N/A"} | Origem: ${sale.origin_iata || "N/A"}\n`;
  block += `Data de embarque: ${formatDateBR(sale.departure_date)}\n`;
  block += `Data de retorno: ${formatDateBR(sale.return_date)}\n`;
  block += `Consultor responsável: ${mockTrip?.sellerName || "Equipe NatLeva"}\n`;

  if (segments.length) {
    block += `\n── VOOS (${segments.length} segmentos) ──\n`;
    for (const seg of segments) {
      block += `  ✈ ${seg.airline || ""} ${seg.flight_number || "s/n"}\n`;
      block += `    Trecho: ${seg.origin_iata || "?"} → ${seg.destination_iata || "?"}\n`;
      block += `    Data: ${formatDateBR(seg.departure_date)}\n`;
      block += `    Horário: ${seg.departure_time || "N/A"} → ${seg.arrival_time || "N/A"}\n`;
      if (seg.terminal) block += `    Terminal: ${seg.terminal}\n`;
      if (seg.baggage_allowance) block += `    Bagagem: ${seg.baggage_allowance}\n`;
    }
  }

  if (hotels.length) {
    block += `\n── HOSPEDAGEM (${hotels.length} reservas) ──\n`;
    for (const hotel of hotels) {
      block += `  🏨 ${hotel.hotel_name || hotel.description || "Hotel"}\n`;
      if (hotel.city) block += `    Cidade: ${hotel.city}\n`;
      if (hotel.address) block += `    Endereço: ${hotel.address}\n`;
      if (hotel.meal_plan) block += `    Regime: ${hotel.meal_plan}\n`;
      if (hotel.checkin_time) block += `    Check-in: ${hotel.checkin_time}\n`;
      if (hotel.checkout_time) block += `    Check-out: ${hotel.checkout_time}\n`;
      if (hotel.room_type) block += `    Quarto: ${hotel.room_type}\n`;
    }
  }

  if (services.length) {
    block += `\n── SERVIÇOS E EXPERIÊNCIAS (${services.length}) ──\n`;
    for (const service of services) {
      block += `  • ${service.description || service.title || "Serviço"}\n`;
      if (service.date) block += `    Data: ${formatDateBR(service.date)}\n`;
      if (service.time) block += `    Horário: ${service.time}\n`;
      if (service.location) block += `    Local: ${service.location}\n`;
      if (service.meeting_point) block += `    Ponto de encontro: ${service.meeting_point}\n`;
    }
  }

  if ((mockTrip?.passengers || []).length) {
    block += `\n── PASSAGEIROS (${mockTrip.passengers.length}) ──\n`;
    for (const pax of mockTrip.passengers) {
      block += `  👤 ${pax.full_name || "Passageiro"}\n`;
      if (pax.document_number) block += `    Documento: ${pax.document_number}\n`;
      if (pax.birth_date) block += `    Nascimento: ${formatDateBR(pax.birth_date)}\n`;
      if (pax.role) block += `    Papel: ${pax.role}\n`;
    }
  }

  block += `\n── FINANCEIRO ──\n`;
  block += `  Valor total: ${formatMoney(totalDue)}\n`;
  block += `  Já pago: ${formatMoney(totalPaid)}\n`;
  block += `  Pendente: ${formatMoney(totalDue - totalPaid)}\n`;

  if (receivables.length) {
    block += `  Parcelas:\n`;
    for (const row of receivables) {
      const status = String(row.status || "").toLowerCase();
      const emoji = PAID_STATUSES.has(status) ? "✅" : status === "vencido" ? "🔴" : "⏳";
      block += `    ${emoji} ${row.installment_number || "?"}/${row.installment_total || "?"} | ${formatMoney(Number(row.gross_value || 0))} | Vencimento: ${formatDateBR(row.due_date)} | ${row.status || "N/A"} | Método: ${row.payment_method || "N/A"}\n`;
    }
  }

  return tripContext + block;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return json({ error: "AI not configured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await anonClient.auth.getUser();

    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: adminRole } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const isAdmin = !!adminRole;
    const scope = await resolveScope(admin, user.id, isAdmin);

    if (!scope && !isAdmin) {
      return json({ error: "No portal access" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const question = String(body?.question || "").trim();
    const requestedSaleId = typeof body?.sale_id === "string" ? body.sale_id : null;
    const conversationHistory = Array.isArray(body?.conversation_history) ? body.conversation_history : [];
    const mockTrip = body?.mock_trip && typeof body.mock_trip === "object" ? body.mock_trip : null;

    if (!question) {
      return json({ error: "question required" }, 400);
    }

    let client: any = null;
    if (scope?.clientId) {
      const { data } = await admin.from("clients").select("*").eq("id", scope.clientId).maybeSingle();
      client = data;
    }

    const accessibleSaleIds = await collectAccessibleSaleIds({
      admin,
      isAdmin,
      clientId: scope?.clientId || null,
      client,
      question,
      requestedSaleId,
    });

    const dbSaleIds = accessibleSaleIds.filter((id) => isUuid(id));
    const hintedIatas = extractHintedIatas(question);

    const { data: allSales } = dbSaleIds.length
      ? await admin
          .from("sales")
          .select("*")
          .in("id", dbSaleIds)
      : { data: [] as any[] };

    const saleRows = allSales || [];

    const scoredSales = [...saleRows].sort((a, b) => {
      const sa = scoreSaleForSelection(a, {
        question,
        focusedSaleId: requestedSaleId,
        hintedIatas,
      });
      const sb = scoreSaleForSelection(b, {
        question,
        focusedSaleId: requestedSaleId,
        hintedIatas,
      });
      return sa - sb;
    });

    const maxDetailedTrips = requestedSaleId ? 5 : 4;
    const targetSales = scoredSales.slice(0, maxDetailedTrips);
    const targetIds = targetSales.map((s) => s.id);

    const [segRes, costRes, recvRes, paxRes, attRes, lodgRes, checkinRes] = targetIds.length
      ? await Promise.all([
          admin.from("flight_segments").select("*").in("sale_id", targetIds).order("departure_date").order("segment_order"),
          admin.from("cost_items").select("*").in("sale_id", targetIds),
          admin.from("accounts_receivable").select("*").in("sale_id", targetIds).order("due_date"),
          admin.from("sale_passengers").select("*, passengers(*)").in("sale_id", targetIds),
          admin.from("attachments").select("id, file_name, category, file_type").in("sale_id", targetIds),
          admin.from("lodging_confirmation_tasks").select("*").in("sale_id", targetIds),
          admin.from("checkin_tasks").select("*").in("sale_id", targetIds),
        ])
      : [
          { data: [] as any[] },
          { data: [] as any[] },
          { data: [] as any[] },
          { data: [] as any[] },
          { data: [] as any[] },
          { data: [] as any[] },
          { data: [] as any[] },
        ];

    const sellerIds = [...new Set(targetSales.map((s) => s.seller_id).filter(Boolean))];
    let sellerMap: Record<string, string> = {};

    if (sellerIds.length) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", sellerIds);

      for (const p of profiles || []) {
        sellerMap[p.id] = p.full_name || p.email || "Consultor NatLeva";
      }
    }

    const summarizedTrips = scoredSales.slice(0, 10).map((sale) => {
      const dep = formatDateBR(sale.departure_date);
      const ret = formatDateBR(sale.return_date);
      return `- ${sale.id} | ${sale.name || "Viagem"} | ${sale.origin_iata || "N/A"} → ${sale.destination_iata || "N/A"} | ${dep} até ${ret}`;
    });

    let tripContext = "";

    for (const sale of targetSales) {
      const segs = (segRes.data || []).filter((s: any) => s.sale_id === sale.id);
      const costs = (costRes.data || []).filter((c: any) => c.sale_id === sale.id);
      const recvs = (recvRes.data || []).filter((r: any) => r.sale_id === sale.id);
      const paxs = (paxRes.data || []).filter((p: any) => p.sale_id === sale.id);
      const atts = (attRes.data || []).filter((a: any) => a.sale_id === sale.id);
      const lodg = (lodgRes.data || []).filter((l: any) => l.sale_id === sale.id);
      const checkins = (checkinRes.data || []).filter((c: any) => c.sale_id === sale.id);

      const hotels = costs.filter((c: any) => c.category === "hotel" || c.product_type === "hotel");
      const services = costs.filter((c: any) => c.category !== "aereo" && c.category !== "hotel" && c.product_type !== "hotel" && c.product_type !== "aereo");

      const sellerName = sale.seller_id ? sellerMap[sale.seller_id] || "Equipe NatLeva" : "Equipe NatLeva";

      const totalPaid = recvs
        .filter((r: any) => PAID_STATUSES.has(String(r.status || "").toLowerCase()))
        .reduce((sum: number, r: any) => sum + Number(r.gross_value || 0), 0);
      const totalDue = recvs.reduce((sum: number, r: any) => sum + Number(r.gross_value || 0), 0);
      const pending = totalDue - totalPaid;
      const nextDue = recvs.find((r: any) => !PAID_STATUSES.has(String(r.status || "").toLowerCase()));

      const isFocused = requestedSaleId === sale.id;

      tripContext += `\n\n${"=".repeat(60)}\n`;
      tripContext += `VIAGEM: ${sale.name || "Viagem"}${isFocused ? " ★ (VIAGEM EM FOCO)" : ""}\n`;
      tripContext += `${"=".repeat(60)}\n`;
      tripContext += `ID: ${sale.id}\n`;
      tripContext += `Status da venda: ${sale.status || "N/A"}\n`;
      tripContext += `Destino: ${sale.destination_iata || "N/A"} | Origem: ${sale.origin_iata || "N/A"}\n`;
      tripContext += `Data de embarque: ${formatDateBR(sale.departure_date)}\n`;
      tripContext += `Data de retorno: ${formatDateBR(sale.return_date)}\n`;
      tripContext += `Consultor responsável: ${sellerName}\n`;
      tripContext += `Localizador geral: ${sale.locator || "N/A"}\n`;
      tripContext += `Companhia aérea principal: ${sale.airline || "N/A"}\n`;
      if (sale.observations) tripContext += `Observações: ${sale.observations}\n`;

      if (segs.length) {
        tripContext += `\n── VOOS (${segs.length} segmentos) ──\n`;
        for (const seg of segs) {
          const direction = String(seg.direction || "").toLowerCase();
          const directionLabel = direction === "outbound" || direction === "ida"
            ? "IDA"
            : direction === "return" || direction === "volta"
              ? "VOLTA"
              : seg.direction || "N/A";

          tripContext += `  ✈ ${seg.airline || ""} ${seg.flight_number || "s/n"}\n`;
          tripContext += `    Trecho: ${seg.origin_iata || "?"} → ${seg.destination_iata || "?"}\n`;
          tripContext += `    Data: ${formatDateBR(seg.departure_date)}\n`;
          tripContext += `    Horário: ${seg.departure_time || "N/A"} → ${seg.arrival_time || "N/A"}\n`;
          tripContext += `    Classe: ${seg.flight_class || seg.cabin_type || "N/A"}\n`;
          tripContext += `    Direção: ${directionLabel}\n`;
          if (seg.terminal) tripContext += `    Terminal: ${seg.terminal}\n`;
          if (seg.operated_by) tripContext += `    Operado por: ${seg.operated_by}\n`;
          if (seg.duration_minutes) tripContext += `    Duração: ${Math.floor(seg.duration_minutes / 60)}h${seg.duration_minutes % 60}min\n`;
          if (seg.connection_time_minutes) tripContext += `    Conexão após este voo: ${seg.connection_time_minutes}min\n`;
          if (seg.baggage_info) tripContext += `    Bagagem: ${seg.baggage_info}\n`;
          if (seg.baggage_allowance) tripContext += `    Bagagem: ${seg.baggage_allowance}\n`;
        }
      } else {
        tripContext += "\n── VOOS ──\nNenhum segmento de voo cadastrado.\n";
      }

      if (lodg.length) {
        tripContext += `\n── HOSPEDAGEM (${lodg.length} reservas) ──\n`;
        for (const l of lodg) {
          tripContext += `  🏨 ${l.hotel_name || "Hotel"}\n`;
          tripContext += `    Cidade: ${l.city || "N/A"}\n`;
          if (l.address) tripContext += `    Endereço: ${l.address}\n`;
          tripContext += `    Check-in: ${formatDateBR(l.checkin_date || l.hotel_checkin_datetime_utc)}\n`;
          tripContext += `    Check-out: ${formatDateBR(l.checkout_date || l.hotel_checkout_datetime_utc)}\n`;
          tripContext += `    Tipo de quarto: ${l.room_type || "N/A"}\n`;
          if (l.meal_plan) tripContext += `    Regime: ${l.meal_plan}\n`;
          tripContext += `    Confirmação: ${l.confirmation_number || "N/A"}\n`;
          tripContext += `    Status: ${l.status || "N/A"}\n`;
          if (l.notes) tripContext += `    Observações: ${l.notes}\n`;
        }
      } else if (hotels.length) {
        tripContext += "\n── HOSPEDAGEM ──\n";
        for (const h of hotels) {
          tripContext += `  🏨 ${h.description || "Hotel"}\n`;
          if (h.address) tripContext += `    Endereço: ${h.address}\n`;
          if (h.meal_plan) tripContext += `    Regime: ${h.meal_plan}\n`;
          tripContext += `    Reserva: ${h.reservation_code || "N/A"}\n`;
        }
      }

      if (services.length) {
        tripContext += `\n── SERVIÇOS E EXPERIÊNCIAS (${services.length}) ──\n`;
        for (const s of services) {
          tripContext += `  • ${s.description || s.category || "Serviço"}\n`;
          tripContext += `    Tipo: ${s.product_type || s.category || "N/A"}\n`;
          if (s.service_date) tripContext += `    Data: ${formatDateBR(s.service_date)}\n`;
          if (s.reservation_code) tripContext += `    Reserva: ${s.reservation_code}\n`;
        }
      }

      if (paxs.length) {
        tripContext += `\n── PASSAGEIROS (${paxs.length}) ──\n`;
        for (const p of paxs) {
          const pax = p.passengers;
          if (!pax) continue;
          tripContext += `  👤 ${pax.full_name || `${pax.first_name || ""} ${pax.last_name || ""}`.trim()}\n`;
          if (pax.birth_date) tripContext += `    Nascimento: ${formatDateBR(pax.birth_date)}\n`;
          if (pax.passport_number) tripContext += `    Passaporte: ${pax.passport_number}\n`;
          if (pax.passport_expiry) tripContext += `    Validade passaporte: ${formatDateBR(pax.passport_expiry)}\n`;
        }
      }

      if (checkins.length) {
        tripContext += "\n── CHECK-IN ──\n";
        for (const ci of checkins) {
          const direction = String(ci.direction || "").toLowerCase();
          const directionLabel = direction === "outbound" || direction === "ida" ? "IDA" : direction === "return" || direction === "volta" ? "VOLTA" : "N/A";
          tripContext += `  • Direção: ${directionLabel} | Status: ${ci.status || "N/A"}\n`;
          if (ci.checkin_open_datetime_utc) tripContext += `    Abertura: ${formatDateTimeBR(ci.checkin_open_datetime_utc)}\n`;
          if (ci.seat_info) tripContext += `    Assento: ${ci.seat_info}\n`;
        }
      }

      tripContext += "\n── FINANCEIRO ──\n";
      tripContext += `  Valor total: ${formatMoney(totalDue)}\n`;
      tripContext += `  Já pago: ${formatMoney(totalPaid)}\n`;
      tripContext += `  Pendente: ${formatMoney(pending)}\n`;

      if (recvs.length) {
        tripContext += "  Parcelas:\n";
        for (const r of recvs) {
          const status = String(r.status || "").toLowerCase();
          const statusEmoji = PAID_STATUSES.has(status) ? "✅" : status === "vencido" ? "🔴" : "⏳";
          tripContext += `    ${statusEmoji} ${r.installment_number || "?"}/${r.installment_total || "?"} | ${formatMoney(Number(r.gross_value || 0))} | Vencimento: ${formatDateBR(r.due_date)} | ${r.status || "N/A"} | Método: ${r.payment_method || "N/A"}\n`;
        }
      }

      if (nextDue) {
        tripContext += `  ⚡ Próximo vencimento: ${formatDateBR(nextDue.due_date)} - ${formatMoney(Number(nextDue.gross_value || 0))}\n`;
      }

      tripContext += `  ⚡ Próximo compromisso: ${buildNextCommitment({ sale, segments: segs, services, lodging: lodg })}\n`;

      if (atts.length) {
        tripContext += `\n── DOCUMENTOS DISPONÍVEIS (${atts.length}) ──\n`;
        for (const a of atts) {
          tripContext += `  📄 ${a.file_name} (${a.category || "documento"})\n`;
        }
      }
    }

    if (mockTrip) {
      const focused = requestedSaleId ? requestedSaleId === mockTrip.sale_id : !targetSales.length;
      tripContext = appendMockTripContext(tripContext, mockTrip, focused);
    }

    const today = new Date().toISOString().split("T")[0];
    const clientName = client?.display_name?.split(" ")[0] || user?.email?.split("@")[0] || "Cliente";

    const hasAnyTrips = targetSales.length > 0 || !!mockTrip;

    const systemPrompt = `Você é o **Concierge NatLeva**, assistente premium de viagens do portal NatLeva.

IDENTIDADE:
- Tom acolhedor, preciso e elegante.
- Trate o cliente pelo primeiro nome: "${clientName}".
- No máximo 1 emoji por resposta (nunca no final de todas as frases).
- Respostas concisas (4-6 linhas), completas e objetivas.
- Use **negrito** para destacar informações críticas (nomes de cidades, horários, valores).
- Use sempre pontuação correta, vírgulas e acentuação impecável.

FORMATAÇÃO OBRIGATÓRIA:
- NUNCA use tabelas Markdown (elas quebram no chat). Em vez disso, liste as informações em blocos estruturados com texto corrido.
- Para voos, use o formato:
  **GRU → MIA** · LATAM LA8070
  07/04/2026 · 23:15 → 06:30
- Para hotéis:
  **Hotel Nome** · Cidade
  Check-in: DD/MM · Check-out: DD/MM
- Para parcelas:
  ✅ 1/3 · R$ 2.000,00 · Vencimento: 01/03/2026 · Pago
  ⏳ 2/3 · R$ 2.000,00 · Vencimento: 01/04/2026 · Pendente
- Separe seções com uma linha em branco. Use listas com "·" (ponto médio) como separador, nunca pipes (|).

REGRAS ABSOLUTAS:
- Responda SEMPRE em português brasileiro, com ortografia e pontuação impecáveis.
- Use EXCLUSIVAMENTE os dados de contexto abaixo.
- Datas no formato DD/MM/AAAA.
- Valores monetários com R$ e duas casas decimais.
- Se não houver dado disponível, responda exatamente:
  "Não encontrei essa informação no seu itinerário. Posso te ajudar a entrar em contato com seu consultor NatLeva para esclarecer!"
- Se houver múltiplas viagens e a pergunta estiver ambígua, liste brevemente as opções e peça confirmação de qual viagem usar.
- Se existir viagem em foco (marcada com ★), priorize ela em perguntas genéricas.

CAPACIDADES:
- Voos: horários, trechos, terminais, duração, bagagem.
- Hotéis: nome, endereço, check-in/out, quarto, regime.
- Roteiro: próxima atividade/compromisso.
- Financeiro: parcelas, pagos, pendências, próximo vencimento.
- Passageiros e documentos disponíveis.
- Consultor responsável da viagem.

DATA DE HOJE: ${today}

DADOS DO CLIENTE:
Nome: ${client?.display_name || clientName}
Email: ${client?.email || user?.email || "N/A"}
Telefone: ${client?.phone || "N/A"}
Cidade: ${client?.city || "N/A"}, ${client?.state || "N/A"}
Perfil admin: ${isAdmin ? "sim" : "não"}

ÍNDICE DE VIAGENS DISPONÍVEIS (resumo):
${summarizedTrips.length ? summarizedTrips.join("\n") : "Nenhuma viagem encontrada no banco para este perfil."}

${hasAnyTrips ? `CONTEXTO DETALHADO DE VIAGENS:${tripContext}` : "NENHUM CONTEXTO DE VIAGEM DISPONÍVEL."}`;

    const aiMessages: any[] = [{ role: "system", content: systemPrompt }];

    if (conversationHistory.length) {
      for (const msg of conversationHistory.slice(-12)) {
        if (!msg?.role || !msg?.content) continue;
        aiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    aiMessages.push({ role: "user", content: question });

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        max_tokens: 2048,
        stream: true,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);

      if (aiResp.status === 429) {
        return json({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }, 429);
      }
      if (aiResp.status === 402) {
        return json({ error: "Serviço de IA temporariamente indisponível." }, 402);
      }

      return json({ error: "AI unavailable" }, 502);
    }

    const responseHeaders = {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    };

    let fullAnswer = "";
    const reader = aiResp.body!.getReader();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(encoder.encode(chunk));

            const lines = chunk.split("\n");
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const jsonLine = line.slice(6).trim();
              if (jsonLine === "[DONE]") continue;
              try {
                const parsed = JSON.parse(jsonLine);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) fullAnswer += content;
              } catch {
                // noop
              }
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();

          if (fullAnswer) {
            try {
              await admin.from("portal_assistant_logs").insert({
                client_id: scope?.clientId || null,
                sale_id: requestedSaleId && isUuid(requestedSaleId) ? requestedSaleId : null,
                question,
                answer: fullAnswer,
              });
            } catch (logErr) {
              console.error("Log insert error (non-critical):", logErr);
            }
          }
        } catch (err) {
          console.error("Stream error:", err);
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: responseHeaders });
  } catch (err) {
    console.error("Portal assistant error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
