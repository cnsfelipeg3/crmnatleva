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
  if (rows.length === 0) return <p className="text-xs text-muted-foreground italic py-4 text-center">Sem dados extraídos</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-border/40">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/50">
            {headers.map((h, i) => (
              <th key={i} className="text-left px-3 py-2.5 font-bold text-muted-foreground uppercase tracking-wider text-[10px] whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={cn("border-t border-border/30", i % 2 === 0 ? "bg-card" : "bg-muted/20")}>
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2.5 text-foreground">
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

// ─── Tab: Evento / Programação ───
function EventoTab({ evento, fatos }: { evento: any; fatos: string[] }) {
  const prog = evento?.programacao || [];
  const arenas = evento?.locais_arenas || [];

  return (
    <div className="space-y-5">
      {/* Info geral */}
      {(evento?.nome || evento?.periodo) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {evento.nome && (
            <div className="rounded-lg border border-border/40 bg-card p-3">
              <p className="text-[10px] text-muted-foreground font-bold uppercase">Evento</p>
              <p className="text-sm font-bold mt-0.5">{evento.nome}</p>
            </div>
          )}
          {evento.edicao_ano && (
            <div className="rounded-lg border border-border/40 bg-card p-3">
              <p className="text-[10px] text-muted-foreground font-bold uppercase">Edição</p>
              <p className="text-sm font-bold mt-0.5">{evento.edicao_ano}</p>
            </div>
          )}
          {evento.periodo && (
            <div className="rounded-lg border border-border/40 bg-card p-3">
              <p className="text-[10px] text-muted-foreground font-bold uppercase">Período</p>
              <p className="text-sm font-bold mt-0.5">{evento.periodo}</p>
            </div>
          )}
          {evento.formato_regras && (
            <div className="rounded-lg border border-border/40 bg-card p-3">
              <p className="text-[10px] text-muted-foreground font-bold uppercase">Formato</p>
              <p className="text-sm font-bold mt-0.5">{evento.formato_regras}</p>
            </div>
          )}
        </div>
      )}

      {/* Sedes */}
      {evento?.cidades_sede?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">🏙️ Cidades-Sede</p>
          <div className="flex flex-wrap gap-1.5">
            {evento.cidades_sede.map((c: string, i: number) => (
              <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-600 border border-blue-500/20">
                <MapPin className="w-3 h-3" /> {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Arenas/Estádios */}
      {arenas.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">🏟️ Estádios / Arenas</p>
          <DataTable
            headers={["Estádio", "Cidade"]}
            rows={arenas.map((a: any) => [
              <span className="font-semibold">{a.nome}</span>,
              a.cidade,
            ])}
          />
        </div>
      )}

      {/* Programação de jogos */}
      {prog.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">📅 Programação Completa ({prog.length} jogos/sessões)</p>
          <DataTable
            headers={["Data", "Dia", "Horário", "Jogo / Sessão", "Local", "Cidade"]}
            rows={prog.map((p: any) => [
              <span className="font-semibold whitespace-nowrap">{p.data}</span>,
              p.dia_semana,
              p.horario,
              <span className="font-semibold">
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

      {/* Ingressos, hospedagem, logística do evento */}
      {(evento?.ingressos_info || evento?.hospedagem_evento || evento?.logistica_evento || evento?.pacotes_natleva) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {evento.ingressos_info && (
            <div className="rounded-lg border border-border/40 bg-card p-3">
              <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">🎫 Ingressos</p>
              <p className="text-xs">{evento.ingressos_info}</p>
            </div>
          )}
          {evento.hospedagem_evento && (
            <div className="rounded-lg border border-border/40 bg-card p-3">
              <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">🏨 Hospedagem</p>
              <p className="text-xs">{evento.hospedagem_evento}</p>
            </div>
          )}
          {evento.logistica_evento && (
            <div className="rounded-lg border border-border/40 bg-card p-3">
              <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">✈️ Logística</p>
              <p className="text-xs">{evento.logistica_evento}</p>
            </div>
          )}
          {evento.pacotes_natleva && (
            <div className="rounded-lg border border-border/40 bg-card p-3">
              <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">📦 Pacotes NatLeva</p>
              <p className="text-xs">{evento.pacotes_natleva}</p>
            </div>
          )}
        </div>
      )}

      {/* Curiosidades */}
      {evento?.curiosidades?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">💡 Curiosidades</p>
          <ul className="space-y-1">
            {evento.curiosidades.map((c: string, i: number) => (
              <li key={i} className="flex gap-2 text-xs">
                <span className="text-amber-500 shrink-0">•</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fatos-chave */}
      {fatos?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">📋 Fatos-Chave ({fatos.length})</p>
          <div className="rounded-lg border border-border/40 bg-card p-3 space-y-1">
            {fatos.map((f: string, i: number) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                <span>{f}</span>
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
    <div className="space-y-4">
      {hoteis.length > 0 && (
        <DataTable
          headers={["Hotel", "Categoria", "Faixa de Preço", "Destaque"]}
          rows={hoteis.map((h: any) => [
            <span className="font-semibold">{h.nome}</span>,
            h.categoria ? <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] bg-purple-500/10 text-purple-600 font-medium">{h.categoria}</span> : null,
            h.faixa_preco,
            h.destaque,
          ])}
        />
      )}
      {hospedagem?.regioes_recomendadas?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">📍 Regiões Recomendadas</p>
          <div className="flex flex-wrap gap-1.5">
            {hospedagem.regioes_recomendadas.map((r: string, i: number) => (
              <span key={i} className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-600 border border-purple-500/20">{r}</span>
            ))}
          </div>
        </div>
      )}
      {hospedagem?.tipo_hospedagem?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">🏠 Tipos</p>
          <div className="flex flex-wrap gap-1.5">
            {hospedagem.tipo_hospedagem.map((t: string, i: number) => (
              <span key={i} className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-muted text-muted-foreground">{t}</span>
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
    <div className="space-y-5">
      {passeios.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">🎯 Passeios ({passeios.length})</p>
          <DataTable
            headers={["Passeio", "Tipo", "Duração", "Preço Aprox."]}
            rows={passeios.map((p: any) => [
              <span className="font-semibold">{p.nome}</span>,
              p.tipo ? <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] bg-orange-500/10 text-orange-600 font-medium">{p.tipo}</span> : null,
              p.duracao,
              p.preco_aprox,
            ])}
          />
        </div>
      )}
      {restaurantes.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">🍽️ Restaurantes ({restaurantes.length})</p>
          <DataTable
            headers={["Restaurante", "Tipo", "Faixa de Preço"]}
            rows={restaurantes.map((r: any) => [
              <span className="font-semibold">{r.nome}</span>,
              r.tipo,
              r.faixa_preco,
            ])}
          />
        </div>
      )}
      {unicas.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">✨ Experiências Únicas</p>
          <ul className="space-y-1">
            {unicas.map((u: string, i: number) => (
              <li key={i} className="flex gap-2 text-xs">
                <span className="text-orange-500 shrink-0">★</span>
                <span>{u}</span>
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
    <div className="space-y-5">
      {/* Grid de info rápida */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {logistica?.tempo_voo_brasil && (
          <div className="rounded-lg border border-border/40 bg-card p-3">
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Tempo de Voo</p>
            <p className="text-sm font-bold mt-0.5">{logistica.tempo_voo_brasil}</p>
          </div>
        )}
        {logistica?.melhor_conexao && (
          <div className="rounded-lg border border-border/40 bg-card p-3">
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Melhor Conexão</p>
            <p className="text-sm font-bold mt-0.5">{logistica.melhor_conexao}</p>
          </div>
        )}
        {financeiro?.moeda_dica && (
          <div className="rounded-lg border border-border/40 bg-card p-3">
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Moeda</p>
            <p className="text-sm font-bold mt-0.5">{financeiro.moeda_dica}</p>
          </div>
        )}
        {financeiro?.faixa_preco_total && (
          <div className="rounded-lg border border-border/40 bg-card p-3">
            <p className="text-[10px] text-muted-foreground font-bold uppercase">Faixa Total</p>
            <p className="text-sm font-bold mt-0.5">{financeiro.faixa_preco_total}</p>
          </div>
        )}
      </div>

      {/* Cias aéreas */}
      {logistica?.companhias_aereas?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">✈️ Companhias Aéreas</p>
          <div className="flex flex-wrap gap-1.5">
            {logistica.companhias_aereas.map((c: string, i: number) => (
              <span key={i} className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-cyan-500/10 text-cyan-600 border border-cyan-500/20">{c}</span>
            ))}
          </div>
        </div>
      )}

      {/* Aeroportos */}
      {logistica?.aeroportos?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">🛬 Aeroportos</p>
          <div className="flex flex-wrap gap-1.5">
            {logistica.aeroportos.map((a: string, i: number) => (
              <span key={i} className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-600 border border-blue-500/20">{a}</span>
            ))}
          </div>
        </div>
      )}

      {/* Transfer */}
      {logistica?.transfer_interno?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">🚗 Transporte Interno</p>
          <ul className="space-y-1">
            {logistica.transfer_interno.map((t: string, i: number) => (
              <li key={i} className="flex gap-2 text-xs">
                <span className="text-cyan-500 shrink-0">→</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Destino info */}
      {(destino?.clima || destino?.visto_necessario != null || destino?.vacinas?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {destino.clima && (
            <div className="rounded-lg border border-border/40 bg-card p-3">
              <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">🌡️ Clima</p>
              <p className="text-xs">{destino.clima}</p>
            </div>
          )}
          {destino.visto_necessario != null && (
            <div className="rounded-lg border border-border/40 bg-card p-3">
              <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">📋 Visto</p>
              <p className="text-xs font-semibold">{destino.visto_necessario ? "Necessário" : "Dispensado"}</p>
            </div>
          )}
          {destino.vacinas?.length > 0 && (
            <div className="rounded-lg border border-border/40 bg-card p-3">
              <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">💉 Vacinas</p>
              <p className="text-xs">{destino.vacinas.join(", ")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Operacional ───
function OperacionalTab({ operacional }: { operacional: any }) {
  if (!operacional?.tema && !operacional?.passo_a_passo?.length) return <p className="text-xs text-muted-foreground italic py-4 text-center">Sem dados operacionais</p>;

  return (
    <div className="space-y-4">
      {operacional.tema && (
        <div className="rounded-lg border border-border/40 bg-card p-3">
          <p className="text-[10px] text-muted-foreground font-bold uppercase">Tema</p>
          <p className="text-sm font-bold mt-0.5">{operacional.tema}</p>
        </div>
      )}
      {operacional.passo_a_passo?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">📝 Passo a Passo</p>
          <div className="space-y-1.5">
            {operacional.passo_a_passo.map((p: string, i: number) => (
              <div key={i} className="flex gap-2 text-xs items-start">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0">{i + 1}</span>
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {operacional.pontos_atencao?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">⚠️ Pontos de Atenção</p>
          <ul className="space-y-1">
            {operacional.pontos_atencao.map((p: string, i: number) => (
              <li key={i} className="flex gap-2 text-xs"><span className="text-amber-500 shrink-0">!</span><span>{p}</span></li>
            ))}
          </ul>
        </div>
      )}
      {operacional.erros_comuns?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">❌ Erros Comuns</p>
          <ul className="space-y-1">
            {operacional.erros_comuns.map((e: string, i: number) => (
              <li key={i} className="flex gap-2 text-xs"><span className="text-red-500 shrink-0">✗</span><span>{e}</span></li>
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

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold flex items-center gap-2">
        <Table2 className="w-4 h-4 text-primary" /> Dados Estruturados
      </h2>

      <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
        {/* Tab headers */}
        <div className="flex border-b border-border/40 bg-muted/30 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-3 text-xs font-semibold transition-all whitespace-nowrap border-b-2",
                activeTab === tab.id
                  ? "border-primary text-primary bg-background/50"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-background/30"
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5">
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
