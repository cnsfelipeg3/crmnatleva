import jsPDF from "jspdf";
import * as XLSX from "xlsx";

type Msg = { role: "user" | "assistant"; content: string };

/**
 * Export chat messages as a styled PDF
 */
export function exportChatAsPDF(messages: Msg[], title?: string) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title || "NatLeva Intelligence - Conversa", margin, y);
  y += 8;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(128);
  doc.text(`Exportado em ${new Date().toLocaleString("pt-BR")}`, margin, y);
  y += 10;

  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Messages
  for (const msg of messages) {
    const isUser = msg.role === "user";
    const label = isUser ? "👤 Você" : "🧠 NatLeva Intelligence";

    // Check page break
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    // Role label
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(isUser ? 59 : 16, isUser ? 130 : 185, isUser ? 246 : 129);
    doc.text(label, margin, y);
    y += 5;

    // Content - strip markdown for cleaner PDF
    const cleanContent = msg.content
      .replace(/#{1,6}\s/g, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/`{1,3}[^`]*`{1,3}/g, (m) => m.replace(/`/g, ""))
      .replace(/^\s*[-*]\s/gm, "• ");

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);

    const lines = doc.splitTextToSize(cleanContent, maxWidth);
    for (const line of lines) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += 4.5;
    }

    y += 6;
  }

  doc.save(`natleva-conversa-${Date.now()}.pdf`);
}

/**
 * Export chat messages as XLSX spreadsheet
 */
export function exportChatAsXLSX(messages: Msg[], title?: string) {
  const data = messages.map((msg, i) => ({
    "#": i + 1,
    "Remetente": msg.role === "user" ? "Você" : "NatLeva Intelligence",
    "Mensagem": msg.content,
    "Data": new Date().toLocaleDateString("pt-BR"),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Auto-width columns
  ws["!cols"] = [
    { wch: 4 },
    { wch: 22 },
    { wch: 100 },
    { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, title?.slice(0, 31) || "Conversa");
  XLSX.writeFile(wb, `natleva-conversa-${Date.now()}.xlsx`);
}

/**
 * Try to extract table data from AI response and export as spreadsheet
 */
export function exportTableFromContent(content: string) {
  // Try to find markdown tables
  const tableRegex = /\|(.+)\|\n\|[-|\s:]+\|\n((?:\|.+\|\n?)+)/g;
  const match = tableRegex.exec(content);

  if (!match) {
    // Fallback: export the content as a single-column spreadsheet
    const lines = content.split("\n").filter(l => l.trim());
    const data = lines.map((line, i) => ({ "#": i + 1, "Conteúdo": line }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Dados");
    XLSX.writeFile(wb, `natleva-dados-${Date.now()}.xlsx`);
    return;
  }

  // Parse markdown table
  const headers = match[1].split("|").map(h => h.trim()).filter(Boolean);
  const rows = match[2].trim().split("\n").map(row =>
    row.split("|").map(c => c.trim()).filter(Boolean)
  );

  const data = rows.map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = row[i] || ""; });
    return obj;
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Tabela");
  XLSX.writeFile(wb, `natleva-tabela-${Date.now()}.xlsx`);
}
