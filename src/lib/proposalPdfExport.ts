import html2pdf from "html2pdf.js";

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

  // Clone the body so we don't mutate the iframe
  const clone = doc.body.cloneNode(true) as HTMLElement;

  // Force everything onto a single continuous page (no page-breaks)
  const style = doc.createElement("style");
  style.textContent = `
    * { animation: none !important; transition: none !important; }
    [data-track-section], section, div, article {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
  `;
  clone.prepend(style);

  // Compute total height of the rendered content
  const fullHeight = Math.max(
    doc.body.scrollHeight,
    doc.documentElement.scrollHeight,
  );
  const fullWidth = 1200;

  const opt = {
    margin: 0,
    filename: `${(title || "proposta").replace(/[^\w\-]+/g, "_")}.pdf`,
    image: { type: "jpeg" as const, quality: 0.95 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      windowWidth: fullWidth,
      windowHeight: fullHeight,
      width: fullWidth,
      height: fullHeight,
      backgroundColor: "#ffffff",
    },
    jsPDF: {
      unit: "px" as const,
      format: [fullWidth, fullHeight] as [number, number],
      orientation: (fullHeight > fullWidth ? "portrait" : "landscape") as "portrait" | "landscape",
      hotfixes: ["px_scaling"],
      compress: true,
    },
    pagebreak: { mode: ["avoid-all"] as ("avoid-all" | "css" | "legacy")[] },
  };

  try {
    await html2pdf().set(opt).from(clone).save();
  } finally {
    document.body.removeChild(iframe);
  }
}

export async function shareProposalLink(slug: string, title: string) {
  const url = `${window.location.origin}/proposta/${slug}`;
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
