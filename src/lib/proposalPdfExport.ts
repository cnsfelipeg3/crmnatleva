import { getPublicProposalUrl } from "@/lib/publicUrl";

/**
 * Abre a proposta pública numa nova aba em modo de impressão e dispara
 * o diálogo nativo do navegador (Salvar como PDF). Isso garante fidelidade
 * 100% ao layout · respeita CSS moderno (oklch, gradientes, framer-motion),
 * fontes, imagens e quebras de página · o que html2canvas não consegue.
 */
export async function exportProposalPdf(slug: string, _title: string) {
  const url = `${window.location.origin}/proposta/${slug}?print=1&autoprint=1`;
  const win = window.open(url, "_blank");
  if (!win) {
    // Pop-up bloqueado · cai pra mesma aba
    window.location.href = url;
  }
}

export async function shareProposalLink(slug: string, title: string) {
  const url = getPublicProposalUrl(slug);
  const shareData = {
    title: `Proposta · ${title}`,
    text: `Confira sua proposta exclusiva da NatLeva: ${title}`,
    url,
  };
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return "shared" as const;
    } catch {
      // user cancelled · fall through to copy
    }
  }
  await navigator.clipboard.writeText(url);
  return "copied" as const;
}
