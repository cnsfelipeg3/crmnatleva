export type PixKeyType = "cpf" | "cnpj" | "email" | "phone" | "random";

const onlyDigits = (s: string) => s.replace(/\D/g, "");

function isValidCPF(raw: string): boolean {
  const cpf = onlyDigits(raw);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;
  const calc = (factor: number) => {
    let sum = 0;
    for (let i = 0; i < factor - 1; i++) sum += Number(cpf[i]) * (factor - i);
    const d = (sum * 10) % 11;
    return d === 10 ? 0 : d;
  };
  return calc(10) === Number(cpf[9]) && calc(11) === Number(cpf[10]);
}

function isValidCNPJ(raw: string): boolean {
  const cnpj = onlyDigits(raw);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;
  const calc = (len: number) => {
    const weights = len === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(cnpj[i]) * weights[i];
    const d = sum % 11;
    return d < 2 ? 0 : 11 - d;
  };
  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isValidPhone(raw: string): boolean {
  // BR mobile: 10 ou 11 dígitos (com ou sem 9). Aceita +55 prefixo.
  const d = onlyDigits(raw);
  const noCountry = d.startsWith("55") && d.length > 11 ? d.slice(2) : d;
  return noCountry.length === 10 || noCountry.length === 11;
}

function isValidRandom(raw: string): boolean {
  // Chave aleatória do BACEN = UUID v4
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw.trim());
}

export function validatePixKey(type: PixKeyType, value: string): { ok: boolean; error?: string; normalized: string } {
  const v = (value || "").trim();
  if (!v) return { ok: false, error: "Informe a chave PIX.", normalized: "" };
  switch (type) {
    case "cpf":
      if (!isValidCPF(v)) return { ok: false, error: "CPF inválido.", normalized: onlyDigits(v) };
      return { ok: true, normalized: onlyDigits(v) };
    case "cnpj":
      if (!isValidCNPJ(v)) return { ok: false, error: "CNPJ inválido.", normalized: onlyDigits(v) };
      return { ok: true, normalized: onlyDigits(v) };
    case "email":
      if (!EMAIL_RE.test(v)) return { ok: false, error: "E-mail inválido.", normalized: v.toLowerCase() };
      return { ok: true, normalized: v.toLowerCase() };
    case "phone":
      if (!isValidPhone(v)) return { ok: false, error: "Telefone inválido. Use DDD + número.", normalized: "+55" + onlyDigits(v).replace(/^55/, "") };
      return { ok: true, normalized: "+55" + onlyDigits(v).replace(/^55/, "") };
    case "random":
      if (!isValidRandom(v)) return { ok: false, error: "Chave aleatória inválida. Cole o UUID gerado pelo seu banco.", normalized: v };
      return { ok: true, normalized: v.toLowerCase() };
  }
}

export function formatPixKeyMasked(type: PixKeyType, value: string): string {
  const v = (value || "").trim();
  if (!v) return "";
  if (type === "cpf") {
    const d = onlyDigits(v).slice(0, 11);
    return d.replace(/(\d{3})(\d{3})?(\d{3})?(\d{2})?/, (_, a, b, c, e) =>
      [a, b, c].filter(Boolean).join(".") + (e ? "-" + e : "")
    );
  }
  if (type === "cnpj") {
    const d = onlyDigits(v).slice(0, 14);
    return d.replace(/(\d{2})(\d{3})?(\d{3})?(\d{4})?(\d{2})?/, (_, a, b, c, e, f) =>
      [a, b, c].filter(Boolean).join(".") + (e ? "/" + e : "") + (f ? "-" + f : "")
    );
  }
  if (type === "phone") {
    const d = onlyDigits(v).replace(/^55/, "").slice(0, 11);
    if (d.length <= 10) return d.replace(/(\d{2})(\d{4})?(\d{0,4})/, (_, a, b, c) => `(${a})${b ? " " + b : ""}${c ? "-" + c : ""}`);
    return d.replace(/(\d{2})(\d{5})(\d{0,4})/, (_, a, b, c) => `(${a}) ${b}${c ? "-" + c : ""}`);
  }
  return v;
}
