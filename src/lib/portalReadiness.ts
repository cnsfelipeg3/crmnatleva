// ============================================================
// portalReadiness — Score determinístico de prontidão da viagem
// Usado em /portal-admin/config (lista) e /portal-admin/viagens/:id (gate)
// ============================================================

export interface ReadinessInput {
  sale: any;
  segments?: any[];
  hotels?: any[];          // dedicated hotels table OR lodging items
  passengers?: any[];
  attachments?: any[];
  // Counters opcionais (quando não dá pra passar arrays inteiros)
  segCount?: number;
  hotelCount?: number;
  paxCount?: number;
  attCount?: number;
}

export interface ReadinessCheck {
  key: string;
  label: string;
  weight: number;
  ok: boolean;
  /** Ancora dentro do detail para o link "Corrigir" — ex. tab=voos */
  fixTab?: string;
}

export interface ReadinessResult {
  score: number;              // 0–100
  checks: ReadinessCheck[];
  missing: ReadinessCheck[];
  canPublish: boolean;        // >= threshold
  threshold: number;
}

export const PUBLISH_THRESHOLD = 70;

export function computeReadiness(input: ReadinessInput, threshold = PUBLISH_THRESHOLD): ReadinessResult {
  const s = input.sale || {};
  const segCount = input.segCount ?? (input.segments?.length || 0);
  const hotelCount = input.hotelCount ?? (input.hotels?.length || 0);
  const paxCount = input.paxCount ?? (input.passengers?.length || 0);
  const attCount = input.attCount ?? (input.attachments?.length || 0);

  const checks: ReadinessCheck[] = [
    { key: "dates",     label: "Datas (ida + volta)",      weight: 15, fixTab: "resumo",     ok: !!s.departure_date && !!s.return_date },
    { key: "iata",      label: "Origem e destino (IATA)",  weight: 15, fixTab: "resumo",     ok: !!s.origin_iata && !!s.destination_iata },
    { key: "segments",  label: "≥ 1 segmento de voo",      weight: 15, fixTab: "voos",       ok: segCount > 0 },
    { key: "hotel",     label: "≥ 1 hospedagem",           weight: 10, fixTab: "hoteis",     ok: hotelCount > 0 || !!s.hotel_name },
    { key: "pax",       label: "≥ 1 passageiro",           weight: 15, fixTab: "passageiros", ok: paxCount > 0 },
    { key: "documents", label: "≥ 1 documento",            weight: 10, fixTab: "documentos", ok: attCount > 0 },
    { key: "payment",   label: "Pagamento recebido",       weight: 10, fixTab: "financeiro", ok: (s.received_value || 0) > 0 },
    { key: "emission",  label: "Emissão realizada",        weight: 10, fixTab: "voos",       ok: s.emission_status === "Emitido" },
  ];

  const totalWeight = checks.reduce((acc, c) => acc + c.weight, 0);
  const got = checks.filter(c => c.ok).reduce((acc, c) => acc + c.weight, 0);
  const score = Math.round((got / totalWeight) * 100);

  return {
    score,
    checks,
    missing: checks.filter(c => !c.ok),
    canPublish: score >= threshold,
    threshold,
  };
}
