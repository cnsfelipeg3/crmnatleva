// Utilitário central para copiar dados de passageiro(s) em formato pronto
// para emissão de passagem. Mantém SOMENTE os campos pertinentes: Nome,
// Data de Nascimento, CPF, RG, Passaporte e Validade (quando houver).

import { formatDateBR } from "@/lib/dateFormat";

export interface PassengerCopyData {
  full_name?: string | null;
  birth_date?: string | null;
  cpf?: string | null;
  rg?: string | null;
  passport_number?: string | null;
  passport_expiry?: string | null;
}

function buildBlock(p: PassengerCopyData): string {
  const lines: string[] = [];
  const push = (label: string, value: string | null | undefined) => {
    const v = (value ?? "").toString().trim();
    if (v) lines.push(`${label}: ${v}`);
  };

  push("Nome", p.full_name);
  push("Data de Nascimento", p.birth_date ? formatDateBR(p.birth_date) : null);
  push("CPF", p.cpf);
  push("RG", p.rg);
  if (p.passport_number) push("Passaporte", p.passport_number);
  if (p.passport_expiry) push("Validade do Passaporte", formatDateBR(p.passport_expiry));

  return lines.join("\n");
}

export function buildPassengersCopyText(passengers: PassengerCopyData[]): string {
  if (!passengers.length) return "";
  if (passengers.length === 1) {
    return ["DADOS DO PASSAGEIRO", "", buildBlock(passengers[0])].join("\n");
  }
  const blocks = passengers.map((p, i) => {
    const header = `PASSAGEIRO ${String(i + 1).padStart(2, "0")}`;
    return [header, "", buildBlock(p)].join("\n");
  });
  return blocks.join("\n\n────────────────────\n\n");
}

export async function copyPassengersToClipboard(
  passengers: PassengerCopyData[]
): Promise<boolean> {
  const text = buildPassengersCopyText(passengers);
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }
}
