// Validação de consistência entre return_date manual e trip_length derivado
// dos segmentos aéreos · evita inconsistências em gráficos/relatórios.

// Parse YYYY-MM-DD como data local · evita shift de timezone (GMT-3 → -1 dia).
function parseLocalDate(d: string): Date | null {
  if (!d) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  if (!m) {
    const fallback = new Date(d);
    return Number.isFinite(fallback.getTime()) ? fallback : null;
  }
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isFinite(dt.getTime()) ? dt : null;
}

export interface TripDateInputs {
  /** Data de partida manual (form.departure_date) — string YYYY-MM-DD. */
  formDeparture?: string | null;
  /** Data de retorno manual (form.return_date) — string YYYY-MM-DD. */
  formReturn?: string | null;
  /** Primeiro segmento de ida (departure_date). */
  segDeparture?: string | null;
  /** Último segmento de volta (departure_date). */
  segReturn?: string | null;
}

export interface TripLengthValidation {
  /** Há divergência entre as datas manuais e os segmentos? */
  hasMismatch: boolean;
  /** Trip length em dias derivado dos segmentos (volta - ida). */
  segTripLength: number | null;
  /** Trip length em dias derivado dos campos manuais (return - departure). */
  formTripLength: number | null;
  /** Diferença em dias entre os dois (form - seg). */
  diffDays: number | null;
  /** Mensagem amigável pra UI (vazia quando não há mismatch). */
  message: string;
  /** Severidade pra estilização. */
  severity: "ok" | "warn" | "error";
  /** Sugestão de return_date corrigido (YYYY-MM-DD) baseado nos segmentos. */
  suggestedReturnDate: string | null;
}

function safeDays(from?: string | null, to?: string | null): number | null {
  if (!from || !to) return null;
  try {
    const a = parseLocalDate(from);
    const b = parseLocalDate(to);
    if (!a || !b) return null;
    const ms = b.getTime() - a.getTime();
    if (!Number.isFinite(ms)) return null;
    return Math.round(ms / 86_400_000);
  } catch {
    return null;
  }
}

export function validateTripLength(input: TripDateInputs): TripLengthValidation {
  const segLen = safeDays(input.segDeparture, input.segReturn);
  const formLen = safeDays(input.formDeparture, input.formReturn);

  // Sem dados suficientes pra comparar
  if (segLen == null || formLen == null) {
    return {
      hasMismatch: false,
      segTripLength: segLen,
      formTripLength: formLen,
      diffDays: null,
      message: "",
      severity: "ok",
    };
  }

  const diff = formLen - segLen;
  if (diff === 0) {
    return {
      hasMismatch: false,
      segTripLength: segLen,
      formTripLength: formLen,
      diffDays: 0,
      message: "",
      severity: "ok",
    };
  }

  const abs = Math.abs(diff);
  const severity: "warn" | "error" = abs >= 3 ? "error" : "warn";
  const dirHint = diff > 0
    ? "datas manuais cobrem MAIS dias que os voos cadastrados"
    : "datas manuais cobrem MENOS dias que os voos cadastrados";

  return {
    hasMismatch: true,
    segTripLength: segLen,
    formTripLength: formLen,
    diffDays: diff,
    message:
      `Inconsistência de duração da viagem · ${dirHint}. ` +
      `Manual: ${formLen}d · Voos: ${segLen}d (Δ ${diff > 0 ? "+" : ""}${diff}d).`,
    severity,
  };
}

/** Versão "extrai segmentos" pra usar direto com array de segmentos. */
export function validateTripLengthFromSegments(
  formDeparture: string | null | undefined,
  formReturn: string | null | undefined,
  segments: Array<{ direction?: string | null; departure_date?: string | null }>,
): TripLengthValidation {
  const ida = segments
    .filter(s => s.direction === "ida" && s.departure_date)
    .map(s => s.departure_date!) as string[];
  const volta = segments
    .filter(s => s.direction === "volta" && s.departure_date)
    .map(s => s.departure_date!) as string[];

  const segDeparture = ida.length > 0 ? ida[0] : null;
  const segReturn = volta.length > 0 ? volta[volta.length - 1] : null;

  return validateTripLength({
    formDeparture,
    formReturn,
    segDeparture,
    segReturn,
  });
}
