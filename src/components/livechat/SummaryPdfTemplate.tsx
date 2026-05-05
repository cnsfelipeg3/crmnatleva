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

// A4 width @ 96dpi ≈ 794px. We render at 800px and let html2canvas scale.
export function SummaryPdfTemplate({ data, innerRef }: { data: SummaryPdfData; innerRef: React.RefObject<HTMLDivElement> }) {
  const dateStr = data.generatedAt.toLocaleString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div
      ref={innerRef}
      style={{
        width: "800px",
        minHeight: "1131px", // ~A4 ratio
        background: "#FFFFFF",
        color: "#111827",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        position: "relative",
        padding: "0",
        boxSizing: "border-box",
      }}
    >
      {/* Faixa superior verde Natleva */}
      <div
        style={{
          height: "8px",
          background: "linear-gradient(90deg, #1F6B4A 0%, #2A8C5F 50%, #1F6B4A 100%)",
        }}
      />

      {/* Header */}
      <div style={{ padding: "32px 48px 20px 48px", borderBottom: "1px solid #E5E7EB" }}>
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

        {/* Linha dourada */}
        <div style={{ height: "2px", marginTop: "20px", background: "linear-gradient(90deg, transparent, #C9A65C 30%, #C9A65C 70%, transparent)" }} />

        {/* Identificação */}
        <div style={{ marginTop: "18px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
          <Field label="Cliente" value={data.contactName || "·"} />
          <Field label="Atendente responsável" value={data.attendantName || "Sem dono"} />
          <Field label="Etapa atual" value={(data.stage || "·").replace(/_/g, " ")} capitalize />
        </div>
        <div style={{ marginTop: "10px", fontSize: "10px", color: "#6B7280" }}>
          <span style={{ color: "#1F6B4A", fontWeight: 600 }}>Período analisado · </span>
          {data.rangeLabel}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ padding: "20px 48px 0 48px" }}>
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
        <div style={{ padding: "18px 48px 0 48px" }}>
          <SectionTitle>Balanço da conversa</SectionTitle>
          <div style={{ marginTop: "10px", border: "1px solid #E5E7EB", borderRadius: "10px", padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#374151", marginBottom: "8px" }}>
              <span style={{ fontWeight: 600 }}>Total · {data.balance.total} mensagens</span>
              <span style={{ color: "#6B7280" }}>Atendente {data.balance.agentPct}% · Cliente {data.balance.clientPct}%</span>
            </div>
            <div style={{ display: "flex", height: "10px", borderRadius: "999px", overflow: "hidden", background: "#F3F4F6" }}>
              <div style={{ width: `${data.balance.agentPct}%`, background: "#1F6B4A" }} />
              <div style={{ width: `${data.balance.clientPct}%`, background: "#C9A65C" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "10px", color: "#6B7280" }}>
              <span><span style={{ display: "inline-block", width: "8px", height: "8px", background: "#1F6B4A", borderRadius: "2px", marginRight: "6px" }} />Atendente · {data.balance.agentMsgs} msgs</span>
              <span><span style={{ display: "inline-block", width: "8px", height: "8px", background: "#C9A65C", borderRadius: "2px", marginRight: "6px" }} />Cliente · {data.balance.clientMsgs} msgs</span>
            </div>
          </div>
        </div>
      )}

      {/* Mídias */}
      <div style={{ padding: "18px 48px 0 48px" }}>
        <SectionTitle>Conteúdos analisados</SectionTitle>
        <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
          <MediaChip label={`${data.media.texts} textos`} />
          {data.media.audios > 0 && <MediaChip label={`${data.media.audios} áudios${data.media.cached ? ` · ${data.media.cached} em cache` : ""}`} tone="sky" />}
          {data.media.images > 0 && <MediaChip label={`${data.media.images} imagens`} tone="emerald" />}
          {data.media.documents > 0 && <MediaChip label={`${data.media.documents} documentos`} tone="amber" />}
          {(data.media.failed + data.media.skipped) > 0 && (
            <MediaChip label={`${data.media.failed + data.media.skipped} mídia(s) não processada(s)`} tone="rose" />
          )}
        </div>
      </div>

      {/* Resumo */}
      <div style={{ padding: "22px 48px 48px 48px" }}>
        <SectionTitle>Análise da conversa</SectionTitle>
        <div
          style={{
            marginTop: "12px",
            border: "1px solid #E5E7EB",
            borderLeft: "4px solid #C9A65C",
            borderRadius: "10px",
            padding: "20px 22px",
            background: "#FAFAF7",
            fontSize: "12.5px",
            lineHeight: 1.65,
            color: "#1F2937",
          }}
          className="natleva-pdf-prose"
        >
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1F6B4A", margin: "14px 0 6px" }}>{children}</h2>,
              h2: ({ children }) => <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#1F6B4A", margin: "14px 0 6px" }}>{children}</h2>,
              h3: ({ children }) => <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#111827", margin: "12px 0 4px" }}>{children}</h3>,
              p: ({ children }) => <p style={{ margin: "6px 0" }}>{children}</p>,
              ul: ({ children }) => <ul style={{ margin: "6px 0 6px 18px", padding: 0 }}>{children}</ul>,
              ol: ({ children }) => <ol style={{ margin: "6px 0 6px 18px", padding: 0 }}>{children}</ol>,
              li: ({ children }) => <li style={{ margin: "3px 0" }}>{children}</li>,
              strong: ({ children }) => <strong style={{ color: "#111827", fontWeight: 700 }}>{children}</strong>,
              em: ({ children }) => <em style={{ color: "#1F6B4A" }}>{children}</em>,
              code: ({ children }) => <code style={{ background: "#F3F4F6", padding: "1px 5px", borderRadius: "4px", fontSize: "11px" }}>{children}</code>,
            }}
          >
            {data.summary || "Sem conteúdo."}
          </ReactMarkdown>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "14px 48px",
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
          <span style={{ color: "#1F6B4A", fontWeight: 700 }}>NATLEVA</span> · Inteligência aplicada ao atendimento
        </span>
        <span>Documento confidencial · Uso interno</span>
      </div>
    </div>
  );
}

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

function MediaChip({ label, tone = "muted" }: { label: string; tone?: "muted" | "sky" | "emerald" | "amber" | "rose" }) {
  const tones: Record<string, { bg: string; bd: string; fg: string }> = {
    muted: { bg: "#F3F4F6", bd: "#E5E7EB", fg: "#374151" },
    sky: { bg: "#EFF6FF", bd: "#BFDBFE", fg: "#1E40AF" },
    emerald: { bg: "#ECFDF5", bd: "#A7F3D0", fg: "#065F46" },
    amber: { bg: "#FFFBEB", bd: "#FDE68A", fg: "#92400E" },
    rose: { bg: "#FFF1F2", bd: "#FECDD3", fg: "#9F1239" },
  };
  const t = tones[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 11px",
        borderRadius: "999px",
        border: `1px solid ${t.bd}`,
        background: t.bg,
        color: t.fg,
        fontSize: "10.5px",
        fontWeight: 500,
      }}
    >
      {label}
    </span>
  );
}
