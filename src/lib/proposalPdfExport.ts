// `html2pdf.js` (~500KB with html2canvas + jsPDF) is loaded on-demand inside
// `exportProposalPdf` to keep the initial bundle lean. The function is async
// already, so the dynamic import is transparent to callers.

/**
 * Exports the public proposal page as a single, continuous PDF
 * (no awkward page breaks; the entire proposal becomes one tall page).
 */
export async function exportProposalPdf(slug: string, title: string) {
  const url = `${window.location.origin}/proposta/${slug}?print=1`;

  // Open the public proposal in a hidden iframe to render the real layout
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "1200px";
  iframe.style.height = "800px";
  iframe.style.border = "0";
  iframe.src = url;
  document.body.appendChild(iframe);

  await new Promise<void>((resolve, reject) => {
    iframe.onload = () => resolve();
    iframe.onerror = () => reject(new Error("Falha ao carregar proposta"));
    setTimeout(() => resolve(), 15000); // safety
  });

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow as any;
  if (!doc || !doc.body || !win) {
    document.body.removeChild(iframe);
    throw new Error("Não foi possível acessar o conteúdo da proposta");
  }

  // Wait for the proposal to signal it's ready (data fetched + rendered)
  await new Promise<void>((resolve) => {
    const start = Date.now();
    const check = () => {
      if (win.__PROPOSAL_READY__ || doc.documentElement.getAttribute("data-proposal-ready") === "1") {
        return resolve();
      }
      if (Date.now() - start > 20000) return resolve(); // safety
      setTimeout(check, 200);
    };
    check();
  });

  // Wait for fonts
  try { await (doc as any).fonts?.ready; } catch {}

  // Wait for all images inside the iframe to finish loading
  const imgs = Array.from(doc.images);
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalHeight > 0
        ? Promise.resolve()
        : new Promise<void>((res) => {
            img.addEventListener("load", () => res(), { once: true });
            img.addEventListener("error", () => res(), { once: true });
            setTimeout(() => res(), 5000);
          })
    )
  );

  // Settle layout
  await new Promise((r) => setTimeout(r, 600));

  const fullWidth = 1200;
  const fullHeight = Math.max(
    doc.body.scrollHeight,
    doc.documentElement.scrollHeight,
  );

  try {
    const html2canvasMod: any = await import("html2canvas");
    const html2canvas = html2canvasMod.default || html2canvasMod;
    const { default: jsPDF } = await import("jspdf");

    // Render the whole iframe body into one tall canvas
    const canvas: HTMLCanvasElement = await html2canvas(doc.body, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      windowWidth: fullWidth,
      windowHeight: fullHeight,
      width: fullWidth,
      height: fullHeight,
      logging: false,
    });

    // A4 portrait in mm
    const pdfWidthMm = 210;
    const pdfHeightMm = 297;
    const pxPerMm = canvas.width / pdfWidthMm;
    const pageHeightPx = Math.floor(pdfHeightMm * pxPerMm);

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });

    let renderedHeight = 0;
    const totalHeight = canvas.height;

    // Slice the tall canvas into A4 pages
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    const ctx = pageCanvas.getContext("2d")!;

    while (renderedHeight < totalHeight) {
      const sliceHeight = Math.min(pageHeightPx, totalHeight - renderedHeight);
      pageCanvas.height = sliceHeight;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pageCanvas.width, sliceHeight);
      ctx.drawImage(
        canvas,
        0, renderedHeight, canvas.width, sliceHeight,
        0, 0, canvas.width, sliceHeight,
      );
      const imgData = pageCanvas.toDataURL("image/jpeg", 0.92);
      const sliceHeightMm = sliceHeight / pxPerMm;
      if (renderedHeight > 0) pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidthMm, sliceHeightMm);
      renderedHeight += sliceHeight;
    }

    const safeName = (title || "proposta").replace(/[^\w\-]+/g, "_");
    pdf.save(`${safeName}.pdf`);
  } finally {
    document.body.removeChild(iframe);
  }
}


import { getPublicProposalUrl } from "@/lib/publicUrl";

export async function shareProposalLink(slug: string, title: string) {
  const url = getPublicProposalUrl(slug);
  const shareData = {
    title: `Proposta — ${title}`,
    text: `Confira sua proposta exclusiva da NatLeva: ${title}`,
    url,
  };
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return "shared" as const;
    } catch {
      // user cancelled — fall through to copy
    }
  }
  await navigator.clipboard.writeText(url);
  return "copied" as const;
}
