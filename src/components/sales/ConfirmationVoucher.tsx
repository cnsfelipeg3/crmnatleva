/**
 * Confirmation Vouchers (Hotel & Aéreo) — visual replica of the Gamma PDF template.
 * Uses inline styles so html2canvas/html2pdf render an identical, isolated layout
 * regardless of the host app's Tailwind theme.
 *
 * Two flavours:
 *  - <HotelVoucher />   — one per hotel/lodging entry
 *  - <AereoVoucher />   — one consolidated air voucher with all flight segments
 */
import { forwardRef, type CSSProperties, type ReactNode } from "react";
import { Backpack, Briefcase, Luggage, Clock, MessageCircle, AlertCircle, ShieldCheck } from "lucide-react";
import logoNatleva from "@/assets/logo-natleva.png";

// Brand palette extracted from the original PDF
const GREEN = "#1f5f3a";
const GREEN_DARK = "#0f3d24";
const TEXT = "#1f5f3a";
const ROW_ALT = "#f3f5f1";
const BORDER = "#e2e6df";
const SOFT_BG = "#ffffff";

const baseFont = {
  fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
  color: TEXT,
  WebkitFontSmoothing: "antialiased" as const,
};

const page: CSSProperties = {
  ...baseFont,
  width: 794, // ~ A4 @ 96dpi
  minHeight: 1123,
  padding: "56px 64px 72px",
  background: SOFT_BG,
  boxSizing: "border-box",
};

const h1: CSSProperties = {
  fontSize: 38,
  fontWeight: 800,
  margin: 0,
  color: GREEN_DARK,
  letterSpacing: 0,
};
const sub: CSSProperties = { fontSize: 14, fontWeight: 700, color: GREEN, marginTop: 4 };
const h2: CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: GREEN_DARK,
  marginTop: 28,
  marginBottom: 10,
};
const card: CSSProperties = {
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  overflow: "hidden",
};
const oneLine: CSSProperties = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const cellHead: CSSProperties = {
  padding: "12px 16px",
  fontSize: 13,
  fontWeight: 700,
  color: GREEN_DARK,
  background: ROW_ALT,
  textAlign: "left",
  borderBottom: `1px solid ${BORDER}`,
  boxSizing: "border-box",
};
const cell: CSSProperties = {
  padding: "12px 16px",
  fontSize: 13,
  color: "#1f2937",
  borderBottom: `1px solid ${BORDER}`,
  boxSizing: "border-box",
};
const labelCell: CSSProperties = { ...cell, ...oneLine, fontWeight: 700, color: GREEN_DARK, width: "38%" };

const logoBlock = (
  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 28 }}>
    <img src={logoNatleva} alt="NatLeva" style={{ height: 38, objectFit: "contain" }} crossOrigin="anonymous" />
  </div>
);

const fmtDateBR = (s?: string | null) => {
  if (!s) return "—";
  const [y, m, d] = s.split("T")[0].split("-");
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y.slice(2)}`;
};

const fmtTime = (s?: string | null) => (s ? s.slice(0, 5) : "—");

// ────────────────────────────────────────────────────────────────────────────
// HOTEL VOUCHER
// ────────────────────────────────────────────────────────────────────────────
export interface HotelVoucherData {
  hotel_name?: string | null;
  meal_plan?: string | null;
  room_type?: string | null;
  reservation_code?: string | null;
  pin_code?: string | null;
  address?: string | null;
  checkin_date?: string | null;
  checkout_date?: string | null;
  guests: Array<{ name: string; doc?: string | null }>;
  checkin_time?: string;
  checkout_time?: string;
  doc_note?: string;
}

export const HotelVoucher = forwardRef<HTMLDivElement, { data: HotelVoucherData }>(
  ({ data }, ref) => {
    const rows: Array<[string, string]> = [
      ["Hotel:", data.hotel_name || "—"],
      ["Alimentação:", data.meal_plan || "—"],
      ["Tipo de quarto:", data.room_type || "—"],
      ["Número de reserva:", data.reservation_code || "—"],
      ["Código pin:", data.pin_code || "—"],
    ];
    return (
      <div ref={ref} data-voucher-page="true" style={page}>
        {logoBlock}
        <h1 style={h1}>Confirmação de Reserva</h1>
        <div style={sub}>Voucher de Hospedagem</div>

        <h2 style={h2}>Informações Básicas</h2>
        <div style={card}>
          {rows.map(([k, v], i) => (
            <div
              key={k}
              style={{
                display: "flex",
                background: i % 2 === 0 ? "transparent" : ROW_ALT,
                borderBottom: i === rows.length - 1 ? "none" : `1px solid ${BORDER}`,
              }}
            >
              <div style={{ ...labelCell, borderBottom: "none" }} title={k}>{k}</div>
              <div style={{ ...cell, ...oneLine, borderBottom: "none", fontWeight: 600 }} title={v}>{v}</div>
            </div>
          ))}
        </div>

        <h2 style={h2}>Informações do Hóspede</h2>
        <div style={card}>
          <div style={{ display: "flex" }}>
            <div style={{ ...cellHead, flex: 1 }}>Nome completo:</div>
            <div style={{ ...cellHead, flex: 1 }}>Documento:</div>
          </div>
          {data.guests.length === 0 ? (
            <div style={{ ...cell, borderBottom: "none", color: "#6b7280" }}>
              Nenhum hóspede cadastrado.
            </div>
          ) : (
            data.guests.map((g, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  background: i % 2 === 0 ? "transparent" : ROW_ALT,
                  borderBottom: i === data.guests.length - 1 ? "none" : `1px solid ${BORDER}`,
                }}
              >
                <div style={{ ...cell, ...oneLine, flex: 1, borderBottom: "none" }} title={g.name}>{g.name}</div>
                <div style={{ ...cell, ...oneLine, flex: 1, borderBottom: "none" }} title={g.doc || "—"}>{g.doc || "—"}</div>
              </div>
            ))
          )}
        </div>

        <h2 style={h2}>Detalhes da Hospedagem</h2>
        <div style={card}>
          <div style={{ display: "flex" }}>
            <div style={{ ...cellHead, ...oneLine, flex: 2.4 }}>Endereço:</div>
            <div style={{ ...cellHead, ...oneLine, flex: 1 }}>Data de Chegada:</div>
            <div style={{ ...cellHead, ...oneLine, flex: 1 }}>Data de Saída:</div>
          </div>
          <div style={{ display: "flex" }}>
            <div style={{ ...cell, ...oneLine, flex: 2.4, borderBottom: "none" }} title={data.address || "—"}>{data.address || "—"}</div>
            <div style={{ ...cell, ...oneLine, flex: 1, borderBottom: "none" }}>{fmtDateBR(data.checkin_date)}</div>
            <div style={{ ...cell, ...oneLine, flex: 1, borderBottom: "none" }}>{fmtDateBR(data.checkout_date)}</div>
          </div>
        </div>

        <h2 style={h2}>Informações importantes</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 8 }}>
          <InfoLine
            icon={<Clock size={18} color={GREEN} strokeWidth={1.8} />}
            title="Horários"
            lines={[
              `Check-in: a partir das ${data.checkin_time || "15:00"}`,
              `Check-out: até às ${data.checkout_time || "12:00"}`,
            ]}
          />
          <InfoLine
            icon={<ShieldCheck size={18} color={GREEN} strokeWidth={1.8} />}
            title="Documentação"
            lines={[data.doc_note || "Apresente seu passaporte no momento do check-in."]}
          />
        </div>
      </div>
    );
  },
);
HotelVoucher.displayName = "HotelVoucher";

// ────────────────────────────────────────────────────────────────────────────
// AÉREO VOUCHER
// ────────────────────────────────────────────────────────────────────────────
export interface AereoVoucherData {
  flight_class?: string | null;
  emission_date?: string | null;
  reservation_code?: string | null;
  passengers: Array<{ name: string; type?: string | null; doc?: string | null }>;
  segments: Array<{
    flight_number?: string | null;
    origin_label?: string;
    origin_iata?: string | null;
    destination_label?: string;
    destination_iata?: string | null;
    airline?: string | null;
    date?: string | null;
    departure_time?: string | null;
    arrival_time?: string | null;
  }>;
}

export const AereoVoucher = forwardRef<HTMLDivElement, { data: AereoVoucherData }>(
  ({ data }, ref) => {
    const basics: Array<[string, string]> = [
      ["Classe:", data.flight_class || "Econômica"],
      ["Data da emissão:", fmtDateBR(data.emission_date)],
      ["Código Reserva :", data.reservation_code || "—"],
    ];
    return (
      <div ref={ref} style={page}>
        {logoBlock}
        <h1 style={h1}>Confirmação de Reserva</h1>
        <div style={sub}>Voucher de viagem</div>

        <h2 style={h2}>Informações Básicas</h2>
        <div style={card}>
          {basics.map(([k, v], i) => (
            <div
              key={k}
              style={{
                display: "flex",
                background: i % 2 === 0 ? "transparent" : ROW_ALT,
                borderBottom: i === basics.length - 1 ? "none" : `1px solid ${BORDER}`,
              }}
            >
              <div style={{ ...labelCell, borderBottom: "none" }}>{k}</div>
              <div style={{ ...cell, borderBottom: "none", fontWeight: 600 }}>{v}</div>
            </div>
          ))}
        </div>

        <h2 style={h2}>Informações dos Passageiros</h2>
        <div style={card}>
          <div style={{ display: "flex" }}>
            <div style={{ ...cellHead, flex: 2 }}>Nome completo:</div>
            <div style={{ ...cellHead, flex: 1 }}>Tipo de passageiro:</div>
            <div style={{ ...cellHead, flex: 1 }}>Documento:</div>
          </div>
          {data.passengers.length === 0 ? (
            <div style={{ ...cell, borderBottom: "none", color: "#6b7280" }}>
              Nenhum passageiro cadastrado.
            </div>
          ) : (
            data.passengers.map((p, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  background: i % 2 === 0 ? "transparent" : ROW_ALT,
                  borderBottom: i === data.passengers.length - 1 ? "none" : `1px solid ${BORDER}`,
                }}
              >
                <div style={{ ...cell, flex: 2, borderBottom: "none" }}>{p.name}</div>
                <div style={{ ...cell, flex: 1, borderBottom: "none" }}>{p.type || "Adulto"}</div>
                <div style={{ ...cell, flex: 1, borderBottom: "none" }}>{p.doc || "—"}</div>
              </div>
            ))
          )}
        </div>

        <h2 style={h2}>Detalhes da Viagem</h2>
        <div style={card}>
          <div style={{ display: "flex" }}>
            {["Voo:", "De:", "Para:", "Cia:", "Data:", "Partida:", "Chegada:"].map((t, i) => (
              <div
                key={t}
                style={{
                  ...cellHead,
                  flex: i === 1 || i === 2 ? 2 : 1,
                  textAlign: i === 0 ? "left" : "center",
                  whiteSpace: "nowrap",
                  fontSize: 12,
                }}
              >
                {t}
              </div>
            ))}
          </div>
          {data.segments.length === 0 ? (
            <div style={{ ...cell, borderBottom: "none", color: "#6b7280" }}>
              Nenhum trecho cadastrado.
            </div>
          ) : (
            data.segments.map((s, i) => {
              const cells = [
                s.flight_number || "—",
                s.origin_label || s.origin_iata || "—",
                s.destination_label || s.destination_iata || "—",
                s.airline || "—",
                fmtDateBR(s.date),
                fmtTime(s.departure_time),
                fmtTime(s.arrival_time),
              ];
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    background: i % 2 === 0 ? "transparent" : ROW_ALT,
                    borderBottom: i === data.segments.length - 1 ? "none" : `1px solid ${BORDER}`,
                  }}
                >
                  {cells.map((c, j) => (
                    <div
                      key={j}
                      style={{
                        ...cell,
                        flex: j === 1 || j === 2 ? 2 : 1,
                        borderBottom: "none",
                        textAlign: j === 0 ? "left" : "center",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        fontSize: 11.5,
                        padding: "12px 8px",
                      }}
                      title={String(c)}
                    >
                      {c}
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>

        <h2 style={h2}>Bagagens Incluídas (por passageiro)</h2>
        <div style={{ display: "flex", gap: 24, marginTop: 4 }}>
          <Bag
            icon={<Backpack size={28} color={GREEN} strokeWidth={1.6} />}
            title="1 item pessoal (10kg)"
            desc="Deve ser acomodado sob o assento"
          />
          <Bag
            icon={<Briefcase size={28} color={GREEN} strokeWidth={1.6} />}
            title="1 bagagem de mão (12kg)"
            desc="Levado na cabine do avião"
          />
          <Bag
            icon={<Luggage size={28} color={GREEN} strokeWidth={1.6} />}
            title="1 bagagem despachada (23kg)"
            desc="Entregue no check-in"
          />
        </div>

        <div style={{ marginTop: 18, fontSize: 14, fontWeight: 800, color: GREEN_DARK }}>Medidas:</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: GREEN_DARK }}>Item pessoal:</div>
            <div style={{ fontSize: 12, color: "#1f2937", marginTop: 4, lineHeight: 1.6 }}>
              Altura: 45 cm x Comprimento: 35 cm x Largura: 20 cm, incluindo os bolsos, as rodas, a alça, etc. (17,8 x 13,8 x 7,9 in).
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: GREEN_DARK }}>Bagagem de mão:</div>
            <div style={{ fontSize: 12, color: "#1f2937", marginTop: 4, lineHeight: 1.6 }}>
              Altura: 55 cm x Comprimento: 35 cm x Largura: 25 cm, incluindo os bolsos, as rodas, a alça, etc. (21,6 x 13,8 x 9,8 in).
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: GREEN_DARK }}>Bagagem despachada:</div>
            <div style={{ fontSize: 12, color: "#1f2937", marginTop: 4, lineHeight: 1.6 }}>
              Soma das três dimensões (altura + largura + comprimento) até 158 cm lineares e peso máximo de 23 kg por volume.
            </div>
          </div>
        </div>

        <h2 style={h2}>Check-in Automático</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
          <InfoLine
            icon={<Clock size={18} color={GREEN} strokeWidth={1.8} />}
            title="24 Horas Antes"
            lines={["Realizamos o check-in automaticamente um dia antes da sua partida."]}
          />
          <InfoLine
            icon={<MessageCircle size={18} color={GREEN} strokeWidth={1.8} />}
            title="Cartão de Embarque"
            lines={["Enviamos seus cartões de embarque diretamente pelo WhatsApp."]}
          />
          <InfoLine
            icon={<AlertCircle size={18} color={GREEN} strokeWidth={1.8} />}
            title="Exceções"
            lines={[
              "Eventualmente a companhia aérea pode exigir check-in presencial para verificação de documentos.",
            ]}
          />
        </div>

        <h2 style={h2}>Alterações</h2>
        <p style={paragraph}>
          O Cliente pode solicitar alterações no itinerário sujeitas à disponibilidade e às políticas
          de cancelamento dos prestadores de serviços. O cliente é responsável por quaisquer custos
          adicionais associados a tais alterações.
        </p>

        <h2 style={h2}>Cancelamento</h2>
        <p style={paragraph}>
          Em caso de cancelamento por parte do Cliente, a Agência não efetuará reembolsos, exceto
          quando permitido pelas políticas dos prestadores de serviços envolvidos. O cliente será
          responsável por todas as despesas de cancelamento, taxas ou penalidades aplicáveis.
        </p>

        <div
          style={{
            marginTop: 16,
            background: "#eaf3ec",
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            padding: "18px 22px",
          }}
        >
          <div style={{ ...h2, marginTop: 0 }}>Política de No-Show</div>
          <p style={{ ...paragraph, marginTop: 6 }}>
            Em caso de não comparecimento (no-show), a Agência não efetuará reembolsos e não será
            responsável por quaisquer custos ou despesas adicionais incorridas pelo cliente devido a
            esse não comparecimento. Em caso de não comparecimento, as incidências são:
          </p>
          <ul style={{ margin: "8px 0 0 20px", padding: 0, color: "#1f2937", fontSize: 13, lineHeight: 1.7 }}>
            <li>Perda total do valor pago</li>
            <li>Cancelamento automático da reserva</li>
            <li>Impossibilidade de remarcação</li>
          </ul>
        </div>
      </div>
    );
  },
);
AereoVoucher.displayName = "AereoVoucher";

// ────────────────────────────────────────────────────────────────────────────
// Shared bits
// ────────────────────────────────────────────────────────────────────────────
const paragraph: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.6,
  color: "#1f2937",
  margin: "4px 0 0",
};

function InfoLine({ icon, title, lines }: { icon: React.ReactNode; title: string; lines: string[] }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          border: `1.5px solid ${GREEN}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: GREEN,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: GREEN_DARK }}>{title}</div>
        {lines.map((l, i) => (
          <div key={i} style={{ fontSize: 13, color: "#1f2937", marginTop: 2 }}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

function Bag({ icon, title, desc, dims }: { icon: React.ReactNode; title: string; desc: string; dims?: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ color: GREEN, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: GREEN_DARK, marginTop: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: "#1f2937", marginTop: 2 }}>{desc}</div>
      {dims && <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2, fontStyle: "italic" }}>{dims}</div>}
    </div>
  );
}
