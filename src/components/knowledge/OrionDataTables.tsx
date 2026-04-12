import { useState } from "react";
import {
  Calendar, MapPin, BedDouble, Camera, Plane, Utensils,
  Trophy, Wrench, Table2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  icon: React.ElementType;
  show: boolean;
}

// ─── Generic Table ───
function DataTable({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground italic py-6 text-center">Sem dados extraídos</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/60">
            {headers.map((h, i) => (
              <th key={i} className="text-left px-4 py-3 font-bold text-foreground uppercase tracking-wider text-[11px] whitespace-nowrap border-b border-border">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={cn(
              "border-t border-border/50 transition-colors hover:bg-muted/30",
              i % 2 === 0 ? "bg-card" : "bg-muted/10"
            )}>
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-foreground">
                  {cell || <span className="text-muted-foreground/50">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Info card helper ───
function InfoCard({ label, value, emoji }: { label: string; value: string; emoji?: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4 shadow-sm">
      <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">{emoji ? `${emoji} ` : ""}{label}</p>
      <p className="text-sm font-bold mt-1 text-foreground">{value}</p>
    </div>
  );
}

// ─── Tab: Evento / Programação ───
function EventoTab({ evento, fatos }: { evento: any; fatos: string[] }) {
  const prog = evento?.programacao || [];
  const arenas = evento?.locais_arenas || [];

  return (
    <div className="space-y-6">
      {(evento?.nome || evento?.periodo) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {evento.nome && <InfoCard label="Evento" value={evento.nome} emoji="🏆" />}
          {evento.edicao_ano && <InfoCard label="Edição" value={evento.edicao_ano} emoji="📅" />}
          {evento.periodo && <InfoCard label="Período" value={evento.periodo} emoji="⏰" />}
          {evento.formato_regras && <InfoCard label="Formato" value={evento.formato_regras} emoji="📋" />}
        </div>
      )}

      {evento?.cidades_sede?.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-foreground font-bold mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-500" /> Cidades-Sede
          </p>
          <div className="flex flex-wrap gap-2">
            {evento.cidades_sede.map((c: string, i: number) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                <MapPin className="w-3 h-3" /> {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {arenas.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-foreground font-bold mb-3">🏟️ Estádios / Arenas</p>
          <DataTable
            headers={["Estádio", "Cidade"]}
            rows={arenas.map((a: any) => [
              <span className="font-bold">{a.nome}</span>,
              a.cidade,
            ])}
          />
        </div>
      )}

      {prog.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-foreground font-bold mb-3">📅 Programação Completa ({prog.length} jogos/sessões)</p>
          <DataTable
            headers={["Data", "Dia", "Horário", "Jogo / Sessão", "Local", "Cidade"]}
            rows={prog.map((p: any) => [
              <span className="font-bold whitespace-nowrap">{p.data}</span>,
              p.dia_semana,
              p.horario,
              <span className="font-bold">
                {p.participante_a && p.participante_b
                  ? `${p.participante_a} × ${p.participante_b}`
                  : p.participante_a || "—"}
              </span>,
              p.local,
              p.cidade,
            ])}
          />
        </div>
      )}

      {(evento?.ingressos_info || evento?.hospedagem_evento || evento?.logistica_evento || evento?.pacotes_natleva) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {evento.ingressos_info && <InfoCard label="Ingressos" value={evento.ingressos_info} emoji="🎫" />}
          {evento.hospedagem_evento && <InfoCard label="Hospedagem" value={evento.hospedagem_evento} emoji="🏨" />}
          {evento.logistica_evento && <InfoCard label="Logística" value={evento.logistica_evento} emoji="✈️" />}
          {evento.pacotes_natleva && <InfoCard label="Pacotes NatLeva" value={evento.pacotes_natleva} emoji="📦" />}
        </div>
      )}

      {evento?.curiosidades?.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-foreground font-bold mb-3">💡 Curiosidades</p>
          <ul className="space-y-2">
            {evento.curiosidades.map((c: string, i: number) => (
              <li key={i} className="flex gap-3 text-sm items-start">
                <span className="text-amber-500 shrink-0 mt-0.5">•</span>
                <span className="text-foreground">{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {fatos?.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-foreground font-bold mb-3">📋 Fatos-Chave ({fatos.length})</p>
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
            {fatos.map((f: string, i: number) => (
              <div key={i} className="flex gap-3 text-sm items-start">
                <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                <span className="text-foreground">{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Hotéis ───
function HoteisTab({ hospedagem }: { hospedagem: any }) {
  const hoteis = hospedagem?.hoteis || [];
  return (
    <div className="space-y-5">
      {hoteis.length > 0 && (
        <DataTable
          headers={["Hotel", "Categoria", "Faixa de Preço", "Destaque"]}
          rows={hoteis.map((h: any) => [
            <span className="font-bold">{h.nome}</span>,
            h.categoria ? <span className="inline-flex px-2.5 py-1 rounded-lg text-[11px] bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold border border-purple-500/20">{h.categoria}</span> : null,
            h.faixa_preco,
            h.destaque,
          ])}
        />
      )}
      {hospedagem?.regioes_recomendadas?.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-foreground font-bold mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-purple-500" /> Regiões Recomendadas
          </p>
          <div className="flex flex-wrap gap-2">
            {hospedagem.regioes_recomendadas.map((r: string, i: number) => (
              <span key={i} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20">{r}</span>
            ))}
          </div>
        </div>
      )}
      {hospedagem?.tipo_hospedagem?.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-foreground font-bold mb-3">🏠 Tipos</p>
          <div className="flex flex-wrap gap-2">
            {hospedagem.tipo_hospedagem.map((t: string, i: number) => (
              <span key={i} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted text-foreground border border-border">{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Passeios & Experiências ───
function PasseiosTab({ experiencias }: { experiencias: any }) {
  const passeios = experiencias?.passeios || [];
  const restaurantes = experiencias?.restaurantes || [];
  const unicas = experiencias?.experiencias_unicas || [];

  return (
    <div className="space-y-6">
      {passeios.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-foreground font-bold mb-3">🎯 Passeios ({passeios.length})</p>
          <DataTable
            headers={["Passeio", "Tipo", "Duração", "Preço Aprox."]}
            rows={passeios.map((p: any) => [
              <span className="font-bold">{p.nome}</span>,
              p.tipo ? <span className="inline-flex px-2.5 py-1 rounded-lg text-[11px] bg-orange-500/10 text-orange-700 dark:text-orange-300 font-semibold border border-orange-500/20">{p.tipo}</span> : null,
              p.duracao,
              p.preco_aprox,
            ])}
          />
        </div>
      )}
      {restaurantes.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-foreground font-bold mb-3">🍽️ Restaurantes ({restaurantes.length})</p>
          <DataTable
            headers={["Restaurante", "Tipo", "Faixa de Preço"]}
            rows={restaurantes.map((r: any) => [
              <span className="font-bold">{r.nome}</span>,
              r.tipo,
              r.faixa_preco,
            ])}
          />
        </div>
      )}
      {unicas.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-foreground font-bold mb-3">✨ Experiências Únicas</p>
          <ul className="space-y-2">
            {unicas.map((u: string, i: number) => (
              <li key={i} className="flex gap-3 text-sm items-start">
                <span className="text-orange-500 shrink-0">★</span>
                <span className="text-foreground">{u}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Logística ───
function LogisticaTab({ logistica, financeiro, destino }: { logistica: any; financeiro: any; destino: any }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {logistica?.tempo_voo_brasil && <InfoCard label="Tempo de Voo" value={logistica.tempo_voo_brasil} emoji="✈️" />}
        {logistica?.melhor_conexao && <InfoCard label="Melhor Conexão" value={logistica.melhor_conexao} emoji="🔄" />}
        {financeiro?.moeda_dica && <InfoCard label="Moeda" value={financeiro.moeda_dica} emoji="💰" />}
        {financeiro?.faixa_preco_total && <InfoCard label="Faixa Total" value={financeiro.faixa_preco_total} emoji="💵" />}
      </div>

      {logistica?.companhias_aereas?.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-foreground font-bold mb-3 flex items-center gap-2">
            <Plane className="w-4 h-4 text-cyan-500" /> Companhias Aéreas
          </p>
          <div className="flex flex-wrap gap-2">
            {logistica.companhias_aereas.map((c: string, i: number) => (
              <span key={i} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">{c}</span>
            ))}
          </div>
        </div>
      )}

      {logistica?.aeroportos?.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-foreground font-bold mb-3">🛬 Aeroportos</p>
          <div className="flex flex-wrap gap-2">
            {logistica.aeroportos.map((a: string, i: number) => (
              <span key={i} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">{a}</span>
            ))}
          </div>
        </div>
      )}

      {logistica?.transfer_interno?.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-foreground font-bold mb-3">🚗 Transporte Interno</p>
          <ul className="space-y-2">
            {logistica.transfer_interno.map((t: string, i: number) => (
              <li key={i} className="flex gap-3 text-sm items-start">
                <span className="text-cyan-500 shrink-0">→</span>
                <span className="text-foreground">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(destino?.clima || destino?.visto_necessario != null || destino?.vacinas?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {destino.clima && <InfoCard label="Clima" value={destino.clima} emoji="🌡️" />}
          {destino.visto_necessario != null && (
            <InfoCard label="Visto" value={destino.visto_necessario ? "Necessário" : "Dispensado"} emoji="📋" />
          )}
          {destino.vacinas?.length > 0 && (
            <InfoCard label="Vacinas" value={destino.vacinas.join(", ")} emoji="💉" />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Operacional ───
function OperacionalTab({ operacional }: { operacional: any }) {
  if (!operacional?.tema && !operacional?.passo_a_passo?.length) return <p className="text-sm text-muted-foreground italic py-6 text-center">Sem dados operacionais</p>;

  return (
    <div className="space-y-5">
      {operacional.tema && <InfoCard label="Tema" value={operacional.tema} emoji="📌" />}
      {operacional.passo_a_passo?.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-foreground font-bold mb-3">📝 Passo a Passo</p>
          <div className="space-y-2">
            {operacional.passo_a_passo.map((p: string, i: number) => (
              <div key={i} className="flex gap-3 text-sm items-start">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold shrink-0">{i + 1}</span>
                <span className="text-foreground">{p}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {operacional.pontos_atencao?.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-foreground font-bold mb-3">⚠️ Pontos de Atenção</p>
          <ul className="space-y-2">
            {operacional.pontos_atencao.map((p: string, i: number) => (
              <li key={i} className="flex gap-3 text-sm items-start"><span className="text-amber-500 shrink-0">!</span><span className="text-foreground">{p}</span></li>
            ))}
          </ul>
        </div>
      )}
      {operacional.erros_comuns?.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-foreground font-bold mb-3">❌ Erros Comuns</p>
          <ul className="space-y-2">
            {operacional.erros_comuns.map((e: string, i: number) => (
              <li key={i} className="flex gap-3 text-sm items-start"><span className="text-red-500 shrink-0">✗</span><span className="text-foreground">{e}</span></li>
            ))}
          </ul>
        </div>
      )}
      {operacional.dicas_avancadas?.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider text-foreground font-bold mb-3">💡 Dicas Avançadas</p>
          <ul className="space-y-2">
            {operacional.dicas_avancadas.map((d: string, i: number) => (
              <li key={i} className="flex gap-3 text-sm items-start"><span className="text-primary shrink-0">→</span><span className="text-foreground">{d}</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════
// ─── MAIN EXPORT ───
// ═══════════════════════════════════════════
export default function OrionDataTables({ taxonomy }: { taxonomy: any }) {
  const tax = taxonomy?.taxonomia || taxonomy;
  if (!tax || typeof tax !== "object") return null;

  const evento = tax.evento;
  const fatos = tax.fatos_chave || [];
  const hospedagem = tax.hospedagem;
  const experiencias = tax.experiencias;
  const logistica = tax.logistica;
  const financeiro = tax.financeiro;
  const destino = tax.destino;
  const operacional = tax.conhecimento_operacional;

  const hasEvento = evento?.nome || evento?.programacao?.length > 0 || evento?.locais_arenas?.length > 0 || fatos.length > 0;
  const hasHoteis = hospedagem?.hoteis?.length > 0 || hospedagem?.regioes_recomendadas?.length > 0;
  const hasPasseios = experiencias?.passeios?.length > 0 || experiencias?.restaurantes?.length > 0 || experiencias?.experiencias_unicas?.length > 0;
  const hasLogistica = logistica?.companhias_aereas?.length > 0 || logistica?.aeroportos?.length > 0 || logistica?.tempo_voo_brasil || financeiro?.faixa_preco_total;
  const hasOperacional = operacional?.tema || operacional?.passo_a_passo?.length > 0;

  const tabs: Tab[] = [
    { id: "evento", label: "Evento", icon: Trophy, show: !!hasEvento },
    { id: "hoteis", label: "Hotéis", icon: BedDouble, show: !!hasHoteis },
    { id: "passeios", label: "Passeios", icon: Camera, show: !!hasPasseios },
    { id: "logistica", label: "Logística", icon: Plane, show: !!hasLogistica },
    { id: "operacional", label: "Operacional", icon: Wrench, show: !!hasOperacional },
  ].filter(t => t.show);

  const [activeTab, setActiveTab] = useState(tabs[0]?.id || "evento");

  if (tabs.length === 0) return null;

  const tabColors: Record<string, string> = {
    evento: "text-amber-600 dark:text-amber-400",
    hoteis: "text-purple-600 dark:text-purple-400",
    passeios: "text-orange-600 dark:text-orange-400",
    logistica: "text-cyan-600 dark:text-cyan-400",
    operacional: "text-primary",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10">
          <Table2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground">Dados Estruturados</h2>
          <p className="text-xs text-muted-foreground">Informações extraídas e organizadas pelo ÓRION</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        {/* Gold-line top */}
        <div className="h-0.5" style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--champagne)), hsl(var(--primary)))" }} />

        {/* Tab headers */}
        <div className="flex border-b border-border bg-muted/30 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const color = tabColors[tab.id] || "text-primary";
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-4 text-sm font-semibold transition-all whitespace-nowrap border-b-[3px]",
                  isActive
                    ? cn("border-primary bg-background/60", color)
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-background/30"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  isActive ? "bg-primary/10" : "bg-transparent"
                )}>
                  <tab.icon className="w-4 h-4" />
                </div>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === "evento" && <EventoTab evento={evento} fatos={fatos} />}
          {activeTab === "hoteis" && <HoteisTab hospedagem={hospedagem} />}
          {activeTab === "passeios" && <PasseiosTab experiencias={experiencias} />}
          {activeTab === "logistica" && <LogisticaTab logistica={logistica} financeiro={financeiro} destino={destino} />}
          {activeTab === "operacional" && <OperacionalTab operacional={operacional} />}
        </div>
      </div>
    </div>
  );
}
