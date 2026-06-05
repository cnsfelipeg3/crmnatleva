import { getPublicProposalUrl } from "@/lib/publicUrl";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

function safePdfFileName(title: string) {
  return `${(title || "proposta")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "proposta"}.pdf`;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForProposalReady(iframe: HTMLIFrameElement) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30000) {
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow as any;
    if (doc?.documentElement?.getAttribute("data-proposal-ready") === "1" || win?.__PROPOSAL_READY__) return;
    await wait(150);
  }
  throw new Error("A proposta demorou demais para ficar pronta para PDF");
}

function collectSafeBreaks(root: HTMLElement, canvasScale: number) {
  const rootRect = root.getBoundingClientRect();
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(
    "[data-track-section], section, article, .rounded-xl, .rounded-2xl, .rounded-3xl"
  ));
  return nodes
    .map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        start: Math.max(0, (rect.top - rootRect.top) * canvasScale),
        end: Math.max(0, (rect.bottom - rootRect.top) * canvasScale),
      };
    })
    .filter((range) => range.end > range.start + 12);
}

function chooseSliceEnd(startY: number, idealEnd: number, canvasHeight: number, safeRanges: Array<{ start: number; end: number }>) {
  const maxEnd = Math.min(idealEnd, canvasHeight);
  const pageHeight = idealEnd - startY;
  const minEnd = startY + pageHeight * 0.58;
  const cutRange = safeRanges.find((range) => range.start < maxEnd && range.end > maxEnd && range.end - range.start < pageHeight * 0.92);
  if (cutRange?.start && cutRange.start > minEnd) return Math.max(startY + 1, Math.floor(cutRange.start - 10));

  const nearbyStarts = safeRanges
    .map((range) => range.start)
    .filter((y) => y > minEnd && y < maxEnd)
    .sort((a, b) => b - a);
  if (nearbyStarts[0]) return Math.floor(nearbyStarts[0] - 10);

  return Math.floor(maxEnd);
}

/** Gera e baixa o PDF diretamente, sem abrir diálogo de impressão. */
export async function exportProposalPdf(slug: string, title: string) {
  const iframe = document.createElement("iframe");
  iframe.src = `${window.location.origin}/proposta/${slug}?print=1&pdf=1`;
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "1200px";
  iframe.style.height = "1600px";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error("Não foi possível abrir a proposta para gerar o PDF"));
    });
    await waitForProposalReady(iframe);

    const doc = iframe.contentDocument;
    if (!doc) throw new Error("Não foi possível acessar a proposta para gerar o PDF");
    const root = doc.querySelector<HTMLElement>("[data-proposal-export-root]") || doc.body;
    root.scrollIntoView({ block: "start" });

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    const canvas = await html2canvas(root, {
      backgroundColor: "#f1ece2",
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      imageTimeout: 20000,
      windowWidth: 1200,
      windowHeight: Math.max(1600, root.scrollHeight),
      scrollX: 0,
      scrollY: 0,
      onclone: (clonedDoc) => {
        clonedDoc.documentElement.setAttribute("data-pdf-export", "1");
        clonedDoc.querySelectorAll("img").forEach((img) => {
          img.setAttribute("loading", "eager");
          img.setAttribute("decoding", "sync");
        });
      },
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    const pageHeightPx = Math.floor(canvas.width * (A4_HEIGHT_MM / A4_WIDTH_MM));
    const scale = canvas.width / Math.max(1, root.getBoundingClientRect().width);
    const safeBreaks = collectSafeBreaks(root, scale);
    let y = 0;
    let page = 0;

    while (y < canvas.height - 1) {
      const idealEnd = y + pageHeightPx;
      const sliceEnd = chooseSliceEnd(y, idealEnd, canvas.height, safeBreaks);
      const sliceHeight = Math.max(1, Math.min(sliceEnd - y, canvas.height - y));
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;
      const ctx = pageCanvas.getContext("2d");
      if (!ctx) throw new Error("Não foi possível montar a página do PDF");
      ctx.drawImage(canvas, 0, y, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

      if (page > 0) pdf.addPage();
      const imgHeightMm = (sliceHeight * A4_WIDTH_MM) / canvas.width;
      pdf.addImage(pageCanvas.toDataURL("image/jpeg", 0.94), "JPEG", 0, 0, A4_WIDTH_MM, imgHeightMm, undefined, "FAST");
      y += sliceHeight;
      page += 1;
    }

    pdf.save(safePdfFileName(title));
  } finally {
    iframe.remove();
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
