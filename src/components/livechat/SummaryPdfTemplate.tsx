import ReactMarkdown from "react-markdown";
import logoNatleva from "@/assets/logo-natleva.png";

export interface SummaryPdfData {
  contactName: string;
  stage: string;
  summary: string;
  attendantName?: string | null;
  generatedAt: Date;
  rangeLabel: string;
  kpis: {
    firstResponse: string;
    avgResponse: string;
    maxWait: string;
    lastActivity: string;
    firstResponseHint?: string;
    avgResponseHint?: string;
    maxWaitHint?: string;
    lastActivityHint?: string;
  };
  balance: {
    agentPct: number;
    clientPct: number;
    agentMsgs: number;
    clientMsgs: number;
    total: number;
  } | null;
  media: {
    texts: number;
    audios: number;
    images: number;
    documents: number;
    cached: number;
    failed: number;
    skipped: number;
  };
}

// A4 @ 96dpi ≈ 794 × 1123. Render @ 800 × 1131 with safe internal padding.
const PAGE_W = 800;
const PAGE_H = 1131;
const HEADER_H = 220;       // first page hero header
const HEADER_H_NEXT = 92;   // condensed header on continuation pages
const FOOTER_H = 56;
const KPIS_H = 130;
const BALANCE_H = 130;
const MEDIA_H = 110;
const SECTION_TITLE_H = 36;
const CONTENT_PADDING_X = 56;
const CONTENT_PADDING_TOP = 18;

// ──────────────────────────────────────────────────────────────────────────────
// Pagination helpers
// ──────────────────────────────────────────────────────────────────────────────

type Block = { type: "h2" | "h3" | "p" | "ul"; raw: string; estH: number };

function parseSummaryToBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  const lines = (md || "").replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    if (/^##\s+/.test(line)) {
      blocks.push({ type: "h2", raw: line, estH: 38 });
      i++;
      continue;
    }
    if (/^###\s+/.test(line)) {
      blocks.push({ type: "h3", raw: line, estH: 30 });
      i++;
      continue;
    }
    // List block: consecutive lines starting with - or *
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i]);
        i++;
      }
      const text = items.join("\n");
      const lineCount = items.reduce((acc, it) => acc + Math.max(1, Math.ceil(it.length / 95)), 0);
      blocks.push({ type: "ul", raw: text, estH: 12 + lineCount * 22 });
      continue;
    }
    // Paragraph: consecutive non-empty, non-heading, non-list lines
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^##\s+/.test(lines[i]) && !/^###\s+/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    const text = para.join(" ");
    const wraps = Math.max(1, Math.ceil(text.length / 95));
    blocks.push({ type: "p", raw: text, estH: 14 + wraps * 22 });
  }
  return blocks;
}

function paginateBlocks(blocks: Block[], firstPageBudget: number, nextPageBudget: number): Block[][] {
  const pages: Block[][] = [];
  let current: Block[] = [];
  let used = 0;
  let budget = firstPageBudget;

  const flush = () => {
    if (current.length) pages.push(current);
    current = [];
    used = 0;
    budget = nextPageBudget;
  };

  for (const b of blocks) {
    // Keep heading with following content: if heading and remaining budget < heading + 80, flush
    if ((b.type === "h2" || b.type === "h3") && used > 0 && (budget - used) < b.estH + 80) {
      flush();
    }
    if (used + b.estH > budget && current.length > 0) {
      flush();
    }
    current.push(b);
    used += b.estH;
  }
  flush();
  return pages.length ? pages : [[]];
}

// ──────────────────────────────────────────────────────────────────────────────
// Public component: renders multiple A4 page divs (each with data-pdf-page)
// ──────────────────────────────────────────────────────────────────────────────

export function SummaryPdfTemplate({
  data,
  pagesContainerRef,
}: {
  data: SummaryPdfData;
  pagesContainerRef: React.RefObject<HTMLDivElement>;
}) {
  const dateStr = data.generatedAt.toLocaleString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  // Compute available height for summary content per page
  const stackedTopHeight =
    HEADER_H + KPIS_H + (data.balance ? BALANCE_H : 0) + MEDIA_H + SECTION_TITLE_H + CONTENT_PADDING_TOP * 4;
  const firstPageSummaryBudget = PAGE_H - stackedTopHeight - FOOTER_H - 60; // 60 = card padding
  const nextPageSummaryBudget = PAGE_H - HEADER_H_NEXT - FOOTER_H - 80;

  const blocks = parseSummaryToBlocks(data.summary || "");
  const pagedBlocks = paginateBlocks(blocks, firstPageSummaryBudget, nextPageSummaryBudget);
  const totalPages = pagedBlocks.length;

  return (
    <div ref={pagesContainerRef}>
      {pagedBlocks.map((pageBlocks, idx) => (
        <PageShell
          key={idx}
          pageIndex={idx}
          totalPages={totalPages}
          isFirst={idx === 0}
          dateStr={dateStr}
          data={data}
        >
          {idx === 0 && <FirstPageTop data={data} />}
          {idx > 0 && <ContinuationLabel index={idx + 1} total={totalPages} />}
          <SummaryCard blocks={pageBlocks} continued={idx > 0} more={idx < totalPages - 1} />
        </PageShell>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Page shell (A4 fixed size, header bar, footer)
// ──────────────────────────────────────────────────────────────────────────────

function PageShell({
  children, pageIndex, totalPages, isFirst, dateStr, data,
}: {
  children: React.ReactNode;
  pageIndex: number;
  totalPages: number;
  isFirst: boolean;
  dateStr: string;
  data: SummaryPdfData;
}) {
  return (
    <div
      data-pdf-page={pageIndex}
      style={{
        width: `${PAGE_W}px`,
        height: `${PAGE_H}px`,
        background: "#FFFFFF",
        color: "#111827",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        marginBottom: "40px", // visual gap (irrelevant in PDF)
      }}
    >
      {/* Faixa superior */}
      <div
        style={{
          height: "8px",
          background: "linear-gradient(90deg, #1F6B4A 0%, #2A8C5F 50%, #1F6B4A 100%)",
        }}
      />

      {/* Hero header (full) only on first page */}
      {isFirst ? (
        <FullHeader data={data} dateStr={dateStr} />
      ) : (
        <CompactHeader data={data} pageIndex={pageIndex} totalPages={totalPages} />
      )}

      {/* Conteúdo */}
      <div style={{ padding: `${CONTENT_PADDING_TOP}px ${CONTENT_PADDING_X}px 0 ${CONTENT_PADDING_X}px` }}>
        {children}
      </div>

      {/* Footer fixo */}
      <Footer pageIndex={pageIndex} totalPages={totalPages} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Headers
// ──────────────────────────────────────────────────────────────────────────────

function FullHeader({ data, dateStr }: { data: SummaryPdfData; dateStr: string }) {
  return (
    <div style={{ padding: "28px 56px 18px 56px", borderBottom: "1px solid #E5E7EB" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <img src={logoNatleva} alt="Natleva" style={{ height: "44px", width: "auto", objectFit: "contain" }} crossOrigin="anonymous" />
          <div style={{ borderLeft: "2px solid #C9A65C", paddingLeft: "14px" }}>
            <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#1F6B4A", fontWeight: 600, textTransform: "uppercase" }}>
              Inteligência de Atendimento
            </div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#111827", marginTop: "2px", lineHeight: 1.1 }}>
              Resumo da Conversa
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: "10px", color: "#6B7280" }}>
          <div>Gerado em</div>
          <div style={{ color: "#111827", fontWeight: 600, marginTop: "2px" }}>{dateStr}</div>
        </div>
      </div>

      <div style={{ height: "2px", marginTop: "18px", background: "linear-gradient(90deg, transparent, #C9A65C 30%, #C9A65C 70%, transparent)" }} />

      <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
        <Field label="Cliente" value={data.contactName || "·"} />
        <Field label="Atendente responsável" value={data.attendantName || "Sem dono"} />
        <Field label="Etapa atual" value={(data.stage || "·").replace(/_/g, " ")} capitalize />
      </div>
      <div style={{ marginTop: "10px", fontSize: "10px", color: "#6B7280" }}>
        <span style={{ color: "#1F6B4A", fontWeight: 600 }}>Período analisado · </span>
        {data.rangeLabel}
      </div>
    </div>
  );
}

function CompactHeader({ data, pageIndex, totalPages }: { data: SummaryPdfData; pageIndex: number; totalPages: number }) {
  return (
    <div style={{ padding: "18px 56px 14px 56px", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <img src={logoNatleva} alt="Natleva" style={{ height: "28px", width: "auto", objectFit: "contain" }} crossOrigin="anonymous" />
        <div style={{ borderLeft: "2px solid #C9A65C", paddingLeft: "10px" }}>
          <div style={{ fontSize: "9px", letterSpacing: "1.5px", color: "#1F6B4A", fontWeight: 600, textTransform: "uppercase" }}>
            Resumo da Conversa
          </div>
          <div style={{ fontSize: "12px", color: "#111827", fontWeight: 600, marginTop: "1px" }}>
            {data.contactName || "Cliente"}
          </div>
        </div>
      </div>
      <div style={{ fontSize: "10px", color: "#6B7280" }}>
        Página <span style={{ color: "#1F6B4A", fontWeight: 700 }}>{pageIndex + 1}</span> de {totalPages}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// First page top section: KPIs + balance + media
// ──────────────────────────────────────────────────────────────────────────────

function FirstPageTop({ data }: { data: SummaryPdfData }) {
  return (
    <>
      {/* KPIs */}
      <div>
        <SectionTitle>Indicadores de performance</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginTop: "10px" }}>
          <Kpi label="1ª resposta" value={data.kpis.firstResponse} hint={data.kpis.firstResponseHint} accent />
          <Kpi label="Tempo médio" value={data.kpis.avgResponse} hint={data.kpis.avgResponseHint} accent />
          <Kpi label="Maior espera" value={data.kpis.maxWait} hint={data.kpis.maxWaitHint} />
          <Kpi label="Última atividade" value={data.kpis.lastActivity} hint={data.kpis.lastActivityHint} />
        </div>
      </div>

      {/* Balanço */}
      {data.balance && (
        <div style={{ marginTop: "18px" }}>
          <SectionTitle>Balanço da conversa</SectionTitle>
          <div style={{ marginTop: "10px", border: "1px solid #E5E7EB", borderRadius: "10px", padding: "14px 16px", background: "#FFFFFF" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#374151", marginBottom: "8px" }}>
              <span style={{ fontWeight: 600 }}>Total · {data.balance.total} mensagens</span>
              <span style={{ color: "#6B7280" }}>Atendente {data.balance.agentPct}% · Cliente {data.balance.clientPct}%</span>
            </div>
            <div style={{ display: "flex", height: "10px", borderRadius: "999px", overflow: "hidden", background: "#F3F4F6" }}>
              <div style={{ width: `${data.balance.agentPct}%`, background: "#1F6B4A" }} />
              <div style={{ width: `${data.balance.clientPct}%`, background: "#C9A65C" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "10px", color: "#6B7280" }}>
              <span><span style={{ display: "inline-block", width: "8px", height: "8px", background: "#1F6B4A", borderRadius: "2px", marginRight: "6px", verticalAlign: "middle" }} />Atendente · {data.balance.agentMsgs} msgs</span>
              <span><span style={{ display: "inline-block", width: "8px", height: "8px", background: "#C9A65C", borderRadius: "2px", marginRight: "6px", verticalAlign: "middle" }} />Cliente · {data.balance.clientMsgs} msgs</span>
            </div>
          </div>
        </div>
      )}

      {/* Mídias */}
      <div style={{ marginTop: "18px" }}>
        <SectionTitle>Conteúdos analisados</SectionTitle>
        <div
          style={{
            marginTop: "10px",
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            justifyContent: "center",
            border: "1px solid #E5E7EB",
            borderRadius: "10px",
            padding: "14px 16px",
            background: "#FAFAF7",
          }}
        >
          <MediaChip label={`${data.media.texts} textos`} kind="text" />
          {data.media.audios > 0 && (
            <MediaChip
              label={`${data.media.audios} áudios${data.media.cached ? ` · ${data.media.cached} em cache` : ""}`}
              kind="audio"
            />
          )}
          {data.media.images > 0 && <MediaChip label={`${data.media.images} imagens`} kind="image" />}
          {data.media.documents > 0 && <MediaChip label={`${data.media.documents} documentos`} kind="doc" />}
          {(data.media.failed + data.media.skipped) > 0 && (
            <MediaChip label={`${data.media.failed + data.media.skipped} não processada(s)`} kind="alert" />
          )}
        </div>
      </div>

      {/* Section title for analysis (always on first page) */}
      <div style={{ marginTop: "18px" }}>
        <SectionTitle>Análise da conversa</SectionTitle>
      </div>
    </>
  );
}

function ContinuationLabel({ index, total }: { index: number; total: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
      <SectionTitle>Análise da conversa <span style={{ color: "#6B7280", fontWeight: 500, fontSize: "10px", marginLeft: "6px" }}>· continuação</span></SectionTitle>
      <span style={{ fontSize: "10px", color: "#6B7280" }}>Parte {index} de {total}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Summary card (per-page subset of blocks)
// ──────────────────────────────────────────────────────────────────────────────

function SummaryCard({ blocks, continued, more }: { blocks: Block[]; continued: boolean; more: boolean }) {
  const md = blocks.map((b) => b.raw).join("\n\n");
  return (
    <div
      style={{
        marginTop: "10px",
        border: "1px solid #E5E7EB",
        borderLeft: "4px solid #C9A65C",
        borderRadius: "10px",
        padding: "20px 22px",
        background: "#FAFAF7",
        fontSize: "12.5px",
        lineHeight: 1.65,
        color: "#1F2937",
        position: "relative",
      }}
    >
      {continued && (
        <div style={{ fontSize: "10px", color: "#1F6B4A", fontWeight: 600, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "1px" }}>
          ↳ continuação
        </div>
      )}
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#1F6B4A", margin: "10px 0 6px" }}>{children}</h2>,
          h2: ({ children }) => <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#1F6B4A", margin: "10px 0 6px" }}>{children}</h2>,
          h3: ({ children }) => <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#111827", margin: "10px 0 4px" }}>{children}</h3>,
          p: ({ children }) => <p style={{ margin: "6px 0" }}>{children}</p>,
          ul: ({ children }) => <ul style={{ margin: "6px 0 6px 18px", padding: 0 }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ margin: "6px 0 6px 18px", padding: 0 }}>{children}</ol>,
          li: ({ children }) => <li style={{ margin: "3px 0" }}>{children}</li>,
          strong: ({ children }) => <strong style={{ color: "#111827", fontWeight: 700 }}>{children}</strong>,
          em: ({ children }) => <em style={{ color: "#1F6B4A" }}>{children}</em>,
          code: ({ children }) => <code style={{ background: "#F3F4F6", padding: "1px 5px", borderRadius: "4px", fontSize: "11px" }}>{children}</code>,
        }}
      >
        {md || "Sem conteúdo."}
      </ReactMarkdown>
      {more && (
        <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed #C9A65C", fontSize: "10px", color: "#6B7280", textAlign: "right" }}>
          continua na próxima página →
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Footer
// ──────────────────────────────────────────────────────────────────────────────

function Footer({ pageIndex, totalPages }: { pageIndex: number; totalPages: number }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: `${FOOTER_H}px`,
        padding: "0 56px",
        borderTop: "1px solid #E5E7EB",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "9.5px",
        color: "#6B7280",
        background: "#FFFFFF",
      }}
    >
      <span>
        <span style={{ color: "#1F6B4A", fontWeight: 700, letterSpacing: "1px" }}>NATLEVA</span>
        <span style={{ marginLeft: "8px" }}>· Inteligência aplicada ao atendimento</span>
      </span>
      <span style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "1px" }}>
        Documento confidencial · Uso interno · Pág. {pageIndex + 1}/{totalPages}
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Atoms
// ──────────────────────────────────────────────────────────────────────────────

function Field({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "1px", color: "#6B7280", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: "13px", color: "#111827", fontWeight: 600, marginTop: "3px", textTransform: capitalize ? "capitalize" : "none" }}>{value}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{ width: "4px", height: "14px", background: "#C9A65C", borderRadius: "2px" }} />
      <div style={{ fontSize: "11px", letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 700, color: "#1F6B4A" }}>
        {children}
      </div>
    </div>
  );
}

function Kpi({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div
      style={{
        border: "1px solid #E5E7EB",
        borderRadius: "10px",
        padding: "12px 14px",
        background: accent ? "linear-gradient(180deg, #F4F9F6 0%, #FFFFFF 100%)" : "#FFFFFF",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {accent && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "#1F6B4A" }} />}
      <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "1px", color: "#6B7280", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: "20px", fontWeight: 700, color: "#111827", marginTop: "4px", lineHeight: 1.1 }}>{value}</div>
      {hint && <div style={{ fontSize: "9.5px", color: "#1F6B4A", marginTop: "3px", fontWeight: 500 }}>{hint}</div>}
    </div>
  );
}

function MediaChip({ label, kind }: { label: string; kind: "text" | "audio" | "image" | "doc" | "alert" }) {
  const map = {
    text:  { bg: "#F4F9F6", bd: "#CFE6DA", fg: "#1F6B4A", icon: "✎" },
    audio: { bg: "#EFF6FF", bd: "#BFDBFE", fg: "#1E40AF", icon: "♪" },
    image: { bg: "#ECFDF5", bd: "#A7F3D0", fg: "#065F46", icon: "▣" },
    doc:   { bg: "#FFFBEB", bd: "#FDE68A", fg: "#92400E", icon: "▤" },
    alert: { bg: "#FFF1F2", bd: "#FECDD3", fg: "#9F1239", icon: "!" },
  } as const;
  const t = map[kind];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding: "8px 16px",
        borderRadius: "999px",
        border: `1px solid ${t.bd}`,
        background: t.bg,
        color: t.fg,
        fontSize: "11px",
        fontWeight: 600,
        lineHeight: 1,
        textAlign: "center",
        minWidth: "100px",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "18px",
          height: "18px",
          borderRadius: "999px",
          background: "#FFFFFF",
          border: `1px solid ${t.bd}`,
          fontSize: "10px",
          color: t.fg,
          fontWeight: 700,
        }}
      >
        {t.icon}
      </span>
      {label}
    </span>
  );
}
