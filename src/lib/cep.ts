// ViaCEP lookup helper. Returns null if not found / invalid.
export interface ViaCepResult {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
}

export function formatCep(v: string) {
  const d = (v || "").replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export async function lookupCep(cep: string): Promise<ViaCepResult | null> {
  const d = (cep || "").replace(/\D/g, "");
  if (d.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${d}/json/`, { cache: "no-store" });
    if (!r.ok) return null;
    const j = await r.json();
    if (!j || j.erro) return null;
    return {
      cep: j.cep || "",
      street: j.logradouro || "",
      neighborhood: j.bairro || "",
      city: j.localidade || "",
      state: j.uf || "",
    };
  } catch {
    return null;
  }
}
