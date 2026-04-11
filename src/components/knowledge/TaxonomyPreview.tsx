import { useState } from "react";
import {
  Map, Compass, Star, BedDouble, Plane, DollarSign, User, Rocket,
  ChevronDown, ChevronUp, Edit2, Plus, X, Sparkles, Lock, BookOpen,
  Trophy, Lightbulb, ListChecks, Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Internal-only price badge ───
function InternalBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded text-[8px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
      <Lock className="w-2.5 h-2.5" />
      Uso Interno
    </span>
  );
}

// ─── Types ───
export interface Taxonomy {
  geo?: {
    continente?: string;
    pais?: string;
    regiao?: string;
    cidades?: string[];
    bairros?: string[];
  };
  destino?: {
    tipo?: string;
    popularidade?: string;
    ideal_para?: string[];
    melhor_epoca?: string[];
    evitar_epoca?: string[];
    clima?: string;
    visto_necessario?: boolean | null;
    vacinas?: string[];
  };
  experiencias?: {
    passeios?: { nome: string; tipo?: string; duracao?: string; preco_aprox?: string }[];
    restaurantes?: { nome: string; tipo?: string; faixa_preco?: string }[];
    experiencias_unicas?: string[];
  };
  hospedagem?: {
    hoteis?: { nome: string; categoria?: string; faixa_preco?: string; destaque?: string }[];
    regioes_recomendadas?: string[];
    tipo_hospedagem?: string[];
  };
  logistica?: {
    companhias_aereas?: string[];
    aeroportos?: string[];
    tempo_voo_brasil?: string;
    melhor_conexao?: string;
    transfer_interno?: string[];
  };
  financeiro?: {
    faixa_preco_total?: string;
    faixa_preco_label?: string;
    dica_moeda?: string;
    moeda_dica?: string;
  };
  perfil_viajante?: {
    ideal?: string[];
    nao_recomendado?: string[];
    nivel_conforto?: string;
    nivel_aventura?: string;
  };
  vendas?: {
    argumentos_chave?: string[];
    objecoes_comuns?: string[];
    como_contornar?: string[];
    gatilho_emocional?: string;
    urgencia?: string;
  };
  evento?: {
    nome?: string;
    edicao_ano?: string;
    periodo?: string;
    sedes_paises?: string[];
    cidades_sede?: string[];
    locais_arenas?: { nome: string; cidade?: string }[];
    participantes?: string[];
    formato_regras?: string;
    programacao?: { data?: string; dia_semana?: string; horario?: string; participante_a?: string; participante_b?: string; local?: string; cidade?: string }[];
    ingressos_info?: string;
    hospedagem_evento?: string;
    logistica_evento?: string;
    pacotes_natleva?: string;
    curiosidades?: string[];
  };
  conhecimento_operacional?: {
    tema?: string;
    passo_a_passo?: string[];
    ferramentas?: string[];
    pontos_atencao?: string[];
    erros_comuns?: string[];
  };
  fatos_chave?: string[];
  tipo_conteudo?: string;
  entendimento_completo?: string;
  dominio?: string;
  confianca?: number;
}

// ─── Section config ───
const SECTIONS: {
  key: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  { key: "geo", label: "Localização", icon: Map, color: "text-blue-500", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/20" },
  { key: "fatos_chave", label: "Fatos-Chave", icon: ListChecks, color: "text-indigo-500", bgColor: "bg-indigo-500/10", borderColor: "border-indigo-500/20" },
  { key: "evento", label: "Evento", icon: Trophy, color: "text-yellow-600", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/20" },
  { key: "destino", label: "Destino", icon: Compass, color: "text-amber-500", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/20" },
  { key: "experiencias", label: "Experiências", icon: Star, color: "text-orange-500", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/20" },
  { key: "hospedagem", label: "Hospedagem", icon: BedDouble, color: "text-purple-500", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/20" },
  { key: "logistica", label: "Logística", icon: Plane, color: "text-cyan-500", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/20" },
  { key: "financeiro", label: "Financeiro", icon: DollarSign, color: "text-emerald-500", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20" },
  { key: "perfil_viajante", label: "Perfil do Viajante", icon: User, color: "text-pink-500", bgColor: "bg-pink-500/10", borderColor: "border-pink-500/20" },
  { key: "vendas", label: "Vendas", icon: Rocket, color: "text-red-500", bgColor: "bg-red-500/10", borderColor: "border-red-500/20" },
  { key: "conhecimento_operacional", label: "Conhecimento Operacional", icon: Lightbulb, color: "text-teal-500", bgColor: "bg-teal-500/10", borderColor: "border-teal-500/20" },
];

// ─── Pill component ───
function Pill({ children, color = "default", onRemove }: { children: React.ReactNode; color?: string; onRemove?: () => void }) {
  const colors: Record<string, string> = {
    default: "bg-muted text-muted-foreground",
    green: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    red: "bg-red-500/15 text-red-700 dark:text-red-300",
    blue: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    purple: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
    cyan: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
    pink: "bg-pink-500/15 text-pink-700 dark:text-pink-300",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium", colors[color] || colors.default)}>
      {children}
      {onRemove && (
        <button onClick={onRemove} className="hover:text-foreground ml-0.5"><X className="w-2.5 h-2.5" /></button>
      )}
    </span>
  );
}

// ─── Confidence meter ───
function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "text-emerald-500" : pct >= 50 ? "text-amber-500" : "text-red-500";
  const bg = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", bg)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("text-sm font-bold", color)}>{pct}%</span>
    </div>
  );
}

// ─── Collapsible Section ───
function TaxSection({ section, children, defaultOpen = true }: {
  section: typeof SECTIONS[0];
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = section.icon;
  return (
    <div className={cn("rounded-xl border overflow-hidden", section.borderColor)}>
      <button
        onClick={() => setOpen(!open)}
        className={cn("w-full flex items-center gap-3 px-4 py-3 text-left", section.bgColor)}
      >
        <div className={cn("p-1.5 rounded-lg", section.bgColor, "border", section.borderColor)}>
          <Icon className={cn("w-4 h-4", section.color)} />
        </div>
        <span className="text-sm font-bold flex-1">{section.label}</span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-4 space-y-3 bg-card">{children}</div>}
    </div>
  );
}

// ─── Main Component ───
interface TaxonomyPreviewProps {
  taxonomy: Taxonomy;
  onChange: (updated: Taxonomy) => void;
  readOnly?: boolean;
}

export default function TaxonomyPreview({ taxonomy, onChange, readOnly = false }: TaxonomyPreviewProps) {
  const geo = taxonomy.geo;
  const destino = taxonomy.destino;
  const exp = taxonomy.experiencias;
  const hosp = taxonomy.hospedagem;
  const log = taxonomy.logistica;
  const fin = taxonomy.financeiro;
  const perfil = taxonomy.perfil_viajante;
  const vendas = taxonomy.vendas;

  const hasContent = (key: string) => {
    const val = (taxonomy as any)[key];
    if (!val) return false;
    if (typeof val === "object") {
      return Object.values(val).some((v: any) => {
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === "string") return v.length > 0;
        return v !== null && v !== undefined;
      });
    }
    return true;
  };

  return (
    <div className="space-y-3">
      {/* Confidence bar */}
      {taxonomy.confianca !== undefined && taxonomy.confianca !== null && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-muted/40 border border-border/40">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold">Confiança do ÓRION</span>
          </div>
          <ConfidenceMeter value={taxonomy.confianca} />
        </div>
      )}

      {/* ENTENDIMENTO COMPLETO Section */}
      {taxonomy.entendimento_completo && taxonomy.entendimento_completo.length > 10 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-primary/10">
            <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-bold flex-1">O que eu entendi do vídeo</span>
          </div>
          <div className="p-4">
            <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {taxonomy.entendimento_completo}
            </div>
          </div>
        </div>
      )}

      {/* GEO Section */}
      {hasContent("geo") && (
        <TaxSection section={SECTIONS[0]}>
          {geo?.continente || geo?.pais ? (
            <div className="flex items-center gap-1.5 text-sm">
              {geo.continente && <Pill color="blue">{geo.continente}</Pill>}
              {geo.continente && geo.pais && <span className="text-muted-foreground">›</span>}
              {geo.pais && <Pill color="blue">{geo.pais}</Pill>}
              {geo.regiao && <><span className="text-muted-foreground">›</span><Pill color="blue">{geo.regiao}</Pill></>}
            </div>
          ) : null}
          {geo?.cidades && geo.cidades.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">Cidades</p>
              <div className="flex flex-wrap gap-1.5">
                {geo.cidades.map((c, i) => <Pill key={i} color="blue">{c}</Pill>)}
              </div>
            </div>
          )}
          {geo?.bairros && geo.bairros.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">Bairros</p>
              <div className="flex flex-wrap gap-1.5">
                {geo.bairros.map((b, i) => <Pill key={i}>{b}</Pill>)}
              </div>
            </div>
          )}
        </TaxSection>
      )}

      {/* FATOS-CHAVE Section */}
      {taxonomy.fatos_chave && taxonomy.fatos_chave.length > 0 && (
        <TaxSection section={SECTIONS.find(s => s.key === "fatos_chave")!}>
          <ul className="space-y-1.5">
            {taxonomy.fatos_chave.map((f, i) => (
              <li key={i} className="text-xs flex gap-2">
                <span className="text-indigo-500 font-bold shrink-0">•</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </TaxSection>
      )}

      {/* EVENTO Section */}
      {hasContent("evento") && (
        <TaxSection section={SECTIONS.find(s => s.key === "evento")!}>
          {taxonomy.evento?.nome && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold">{taxonomy.evento.nome}</span>
              {taxonomy.evento.edicao_ano && <Pill color="amber">{taxonomy.evento.edicao_ano}</Pill>}
              {taxonomy.evento.periodo && <Pill color="blue">{taxonomy.evento.periodo}</Pill>}
            </div>
          )}
          {taxonomy.evento?.cidades_sede && taxonomy.evento.cidades_sede.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">Cidades-sede</p>
              <div className="flex flex-wrap gap-1.5">
                {taxonomy.evento.cidades_sede.map((c, i) => <Pill key={i} color="blue">{c}</Pill>)}
              </div>
            </div>
          )}
          {taxonomy.evento?.locais_arenas && taxonomy.evento.locais_arenas.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">Estádios / Arenas</p>
              <div className="space-y-1">
                {taxonomy.evento.locais_arenas.map((l, i) => (
                  <div key={i} className="text-xs flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-1.5">
                    <span className="font-medium">{l.nome}</span>
                    {l.cidade && <span className="text-muted-foreground">— {l.cidade}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {taxonomy.evento?.participantes && taxonomy.evento.participantes.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">Participantes / Times</p>
              <div className="flex flex-wrap gap-1.5">
                {taxonomy.evento.participantes.map((p, i) => <Pill key={i} color="green">{p}</Pill>)}
              </div>
            </div>
          )}
          {taxonomy.evento?.formato_regras && (
            <p className="text-xs text-muted-foreground">📋 {taxonomy.evento.formato_regras}</p>
          )}
          {taxonomy.evento?.programacao && taxonomy.evento.programacao.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">
                📅 Programação ({taxonomy.evento.programacao.length} {taxonomy.evento.programacao.length === 1 ? "evento" : "eventos"})
              </p>
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {taxonomy.evento.programacao.map((p, i) => (
                  <div key={i} className="text-xs flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2">
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0 w-16">{p.data || ""}</span>
                    {p.dia_semana && <span className="text-[10px] text-muted-foreground shrink-0">({p.dia_semana})</span>}
                    {p.horario && <span className="font-bold shrink-0">{p.horario}</span>}
                    <span className="font-medium">
                      {p.participante_a}{p.participante_b ? ` × ${p.participante_b}` : ""}
                    </span>
                    {p.local && <span className="text-muted-foreground ml-auto shrink-0">📍 {p.local}{p.cidade ? `, ${p.cidade}` : ""}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {taxonomy.evento?.ingressos_info && (
            <p className="text-xs"><span className="font-bold">🎫 Ingressos:</span> {taxonomy.evento.ingressos_info}</p>
          )}
          {taxonomy.evento?.pacotes_natleva && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
              <p className="text-xs font-bold text-primary">🎯 Pacotes NatLeva: {taxonomy.evento.pacotes_natleva}</p>
            </div>
          )}
          {taxonomy.evento?.curiosidades && taxonomy.evento.curiosidades.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">Curiosidades</p>
              <ul className="space-y-1">
                {taxonomy.evento.curiosidades.map((c, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-yellow-500">✦</span> {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TaxSection>
      )}

      {/* DESTINO Section */}
      {hasContent("destino") && (
        <TaxSection section={SECTIONS.find(s => s.key === "destino")!}>
          <div className="flex flex-wrap gap-2">
            {destino?.tipo && <Pill color="amber">{destino.tipo}</Pill>}
            {destino?.popularidade && <Pill color="amber">{destino.popularidade}</Pill>}
            {destino?.visto_necessario !== null && destino?.visto_necessario !== undefined && (
              <Pill color={destino.visto_necessario ? "red" : "green"}>
                Visto: {destino.visto_necessario ? "Necessário" : "Dispensado"}
              </Pill>
            )}
          </div>
          {destino?.ideal_para && destino.ideal_para.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">Ideal para</p>
              <div className="flex flex-wrap gap-1.5">
                {destino.ideal_para.map((p, i) => <Pill key={i} color="green">{p}</Pill>)}
              </div>
            </div>
          )}
          {destino?.melhor_epoca && destino.melhor_epoca.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">Melhor época</p>
              <div className="flex flex-wrap gap-1.5">
                {destino.melhor_epoca.map((m, i) => <Pill key={i} color="amber">{m}</Pill>)}
              </div>
            </div>
          )}
          {destino?.evitar_epoca && destino.evitar_epoca.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">Evitar</p>
              <div className="flex flex-wrap gap-1.5">
                {destino.evitar_epoca.map((m, i) => <Pill key={i} color="red">{m}</Pill>)}
              </div>
            </div>
          )}
          {destino?.clima && <p className="text-xs text-muted-foreground">🌤 {destino.clima}</p>}
          {destino?.vacinas && destino.vacinas.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">Vacinas</p>
              <div className="flex flex-wrap gap-1.5">
                {destino.vacinas.map((v, i) => <Pill key={i} color="red">{v}</Pill>)}
              </div>
            </div>
          )}
        </TaxSection>
      )}

      {/* EXPERIENCIAS Section */}
      {hasContent("experiencias") && (
        <TaxSection section={SECTIONS.find(s => s.key === "experiencias")!}>
          {exp?.passeios && exp.passeios.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Passeios</p>
              <div className="space-y-1.5">
                {exp.passeios.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs rounded-lg bg-muted/30 px-3 py-2">
                    <span className="font-medium flex-1">{p.nome}</span>
                    {p.tipo && <Badge variant="outline" className="text-[9px]">{p.tipo}</Badge>}
                    {p.duracao && <span className="text-muted-foreground">{p.duracao}</span>}
                    {p.preco_aprox && <><InternalBadge /><span className="font-bold text-emerald-600 dark:text-emerald-400">{p.preco_aprox}</span></>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {exp?.restaurantes && exp.restaurantes.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Restaurantes</p>
              <div className="space-y-1.5">
                {exp.restaurantes.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs rounded-lg bg-muted/30 px-3 py-2">
                    <span className="font-medium flex-1">{r.nome}</span>
                    {r.tipo && <Badge variant="outline" className="text-[9px]">{r.tipo}</Badge>}
                    {r.faixa_preco && <><InternalBadge /><span className="font-bold">{r.faixa_preco}</span></>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {exp?.experiencias_unicas && exp.experiencias_unicas.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">Experiências únicas</p>
              <ul className="space-y-1">
                {exp.experiencias_unicas.map((e, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-orange-500">✦</span> {e}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TaxSection>
      )}

      {/* HOSPEDAGEM Section */}
      {hasContent("hospedagem") && (
        <TaxSection section={SECTIONS.find(s => s.key === "hospedagem")!}>
          {hosp?.hoteis && hosp.hoteis.length > 0 && (
            <div className="space-y-1.5">
              {hosp.hoteis.map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-xs rounded-lg bg-muted/30 px-3 py-2">
                  <span className="font-medium flex-1">{h.nome}</span>
                  {h.categoria && <Badge variant="outline" className="text-[9px]">{h.categoria}</Badge>}
                  {h.faixa_preco && <><InternalBadge /><span className="font-bold text-purple-600 dark:text-purple-400">{h.faixa_preco}</span></>}
                  {h.destaque && <span className="text-muted-foreground italic">{h.destaque}</span>}
                </div>
              ))}
            </div>
          )}
          {hosp?.regioes_recomendadas && hosp.regioes_recomendadas.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">Regiões recomendadas</p>
              <div className="flex flex-wrap gap-1.5">
                {hosp.regioes_recomendadas.map((r, i) => <Pill key={i} color="purple">{r}</Pill>)}
              </div>
            </div>
          )}
        </TaxSection>
      )}

      {/* LOGISTICA Section */}
      {hasContent("logistica") && (
        <TaxSection section={SECTIONS.find(s => s.key === "logistica")!}>
          {log?.companhias_aereas && log.companhias_aereas.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">Companhias</p>
              <div className="flex flex-wrap gap-1.5">
                {log.companhias_aereas.map((c, i) => <Pill key={i} color="cyan">{c}</Pill>)}
              </div>
            </div>
          )}
          {log?.tempo_voo_brasil && (
            <p className="text-xs"><span className="font-bold">Tempo de voo:</span> {log.tempo_voo_brasil}</p>
          )}
          {log?.melhor_conexao && (
            <p className="text-xs"><span className="font-bold">Melhor conexão:</span> {log.melhor_conexao}</p>
          )}
          {log?.transfer_interno && log.transfer_interno.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">Transporte interno</p>
              <ul className="space-y-1">
                {log.transfer_interno.map((t, i) => (
                  <li key={i} className="text-xs text-muted-foreground">• {t}</li>
                ))}
              </ul>
            </div>
          )}
        </TaxSection>
      )}

      {/* FINANCEIRO Section */}
      {hasContent("financeiro") && (
        <TaxSection section={SECTIONS.find(s => s.key === "financeiro")!}>
          <div className="flex items-center gap-2 flex-wrap">
            <InternalBadge />
            {fin?.faixa_preco_label && (
              <Badge className={cn(
                "text-sm px-3 py-1 font-bold uppercase",
                fin.faixa_preco_label === "luxo" ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30" :
                fin.faixa_preco_label === "premium" ? "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30" :
                fin.faixa_preco_label === "moderado" ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30" :
                "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
              )}>
                {fin.faixa_preco_label} {fin.faixa_preco_total && `• ${fin.faixa_preco_total}`}
              </Badge>
            )}
          </div>
          {(fin?.dica_moeda || fin?.moeda_dica) && (
            <p className="text-xs text-muted-foreground">💱 {fin.dica_moeda || fin.moeda_dica}</p>
          )}
        </TaxSection>
      )}

      {/* PERFIL Section */}
      {hasContent("perfil_viajante") && (
        <TaxSection section={SECTIONS.find(s => s.key === "perfil_viajante")!}>
          {perfil?.ideal && perfil.ideal.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">Ideal para</p>
              <div className="flex flex-wrap gap-1.5">
                {perfil.ideal.map((p, i) => <Pill key={i} color="green">{p}</Pill>)}
              </div>
            </div>
          )}
          {perfil?.nao_recomendado && perfil.nao_recomendado.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">Não recomendado</p>
              <div className="flex flex-wrap gap-1.5">
                {perfil.nao_recomendado.map((p, i) => <Pill key={i} color="red">{p}</Pill>)}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {perfil?.nivel_conforto && (
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Conforto</p>
                <div className="flex gap-1">
                  {["basico", "medio", "alto"].map(l => (
                    <div key={l} className={cn(
                      "h-2 flex-1 rounded-full",
                      ["basico", "medio", "alto"].indexOf(perfil.nivel_conforto!) >= ["basico", "medio", "alto"].indexOf(l) 
                        ? "bg-pink-500" : "bg-muted"
                    )} />
                  ))}
                </div>
              </div>
            )}
            {perfil?.nivel_aventura && (
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Aventura</p>
                <div className="flex gap-1">
                  {["baixo", "medio", "alto"].map(l => (
                    <div key={l} className={cn(
                      "h-2 flex-1 rounded-full",
                      ["baixo", "medio", "alto"].indexOf(perfil.nivel_aventura!) >= ["baixo", "medio", "alto"].indexOf(l) 
                        ? "bg-orange-500" : "bg-muted"
                    )} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </TaxSection>
      )}

      {/* VENDAS Section - highlighted */}
      {hasContent("vendas") && (
        <TaxSection section={SECTIONS.find(s => s.key === "vendas")!} defaultOpen={true}>
          {vendas?.gatilho_emocional && (
            <div className="rounded-xl bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Gatilho Emocional</p>
              <p className="text-sm italic font-medium">"{vendas.gatilho_emocional}"</p>
            </div>
          )}
          {vendas?.argumentos_chave && vendas.argumentos_chave.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Argumentos de Venda</p>
              <ol className="space-y-1.5">
                {vendas.argumentos_chave.map((a, i) => (
                  <li key={i} className="text-xs flex gap-2">
                    <span className="text-red-500 font-bold">{i + 1}.</span> {a}
                  </li>
                ))}
              </ol>
            </div>
          )}
          {vendas?.objecoes_comuns && vendas.objecoes_comuns.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Objeções → Contornos</p>
              <div className="space-y-2">
                {vendas.objecoes_comuns.map((obj, i) => (
                  <div key={i} className="text-xs rounded-lg bg-muted/30 px-3 py-2">
                    <p className="text-red-500/80">❌ {obj}</p>
                    {vendas.como_contornar?.[i] && (
                      <p className="text-emerald-600 dark:text-emerald-400 mt-1">✅ {vendas.como_contornar[i]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {vendas?.urgencia && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400">⚡ {vendas.urgencia}</p>
            </div>
          )}
        </TaxSection>
      )}

      {/* CONHECIMENTO OPERACIONAL Section */}
      {hasContent("conhecimento_operacional") && (
        <TaxSection section={SECTIONS.find(s => s.key === "conhecimento_operacional")!}>
          {taxonomy.conhecimento_operacional?.tema && (
            <p className="text-sm font-bold">{taxonomy.conhecimento_operacional.tema}</p>
          )}
          {taxonomy.conhecimento_operacional?.passo_a_passo && taxonomy.conhecimento_operacional.passo_a_passo.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Passo a passo</p>
              <ol className="space-y-1.5">
                {taxonomy.conhecimento_operacional.passo_a_passo.map((p, i) => (
                  <li key={i} className="text-xs flex gap-2">
                    <span className="text-teal-500 font-bold shrink-0">{i + 1}.</span> {p}
                  </li>
                ))}
              </ol>
            </div>
          )}
          {taxonomy.conhecimento_operacional?.ferramentas && taxonomy.conhecimento_operacional.ferramentas.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">Ferramentas</p>
              <div className="flex flex-wrap gap-1.5">
                {taxonomy.conhecimento_operacional.ferramentas.map((f, i) => <Pill key={i} color="cyan">{f}</Pill>)}
              </div>
            </div>
          )}
          {taxonomy.conhecimento_operacional?.pontos_atencao && taxonomy.conhecimento_operacional.pontos_atencao.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">Pontos de atenção</p>
              <ul className="space-y-1">
                {taxonomy.conhecimento_operacional.pontos_atencao.map((p, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-amber-500">⚠️</span> {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {taxonomy.conhecimento_operacional?.erros_comuns && taxonomy.conhecimento_operacional.erros_comuns.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">Erros comuns</p>
              <ul className="space-y-1">
                {taxonomy.conhecimento_operacional.erros_comuns.map((e, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-red-500">❌</span> {e}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </TaxSection>
      )}
    </div>
  );
}

// ─── Compact summary for KB listing cards ───
export function TaxonomySummary({ taxonomy }: { taxonomy: Taxonomy }) {
  const geo = taxonomy.geo;
  const fin = taxonomy.financeiro;
  const perfil = taxonomy.perfil_viajante;
  const exp = taxonomy.experiencias;
  const hosp = taxonomy.hospedagem;
  const tags = (taxonomy as any).tags as string[] | undefined;

  const passeioCount = exp?.passeios?.length || 0;
  const hotelCount = hosp?.hoteis?.length || 0;
  const tagCount = tags?.length || 0;

  const confianca = taxonomy.confianca;
  const confColor = confianca !== undefined && confianca !== null
    ? confianca >= 0.8 ? "bg-emerald-500" : confianca >= 0.5 ? "bg-amber-500" : "bg-red-500"
    : null;

  return (
    <div className="space-y-1.5 mt-1">
      {/* Geo breadcrumb */}
      {geo?.pais && (
        <div className="flex items-center gap-1.5 text-[10px]">
          <Map className="w-3 h-3 text-blue-500" />
          <span className="font-medium">
            {[geo.continente, geo.pais, ...(geo.cidades || [])].filter(Boolean).join(" › ")}
          </span>
        </div>
      )}

      {/* Price badge + profile pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {fin?.faixa_preco_label && (
          <Badge className={cn(
            "text-[9px] px-1.5 py-0 font-bold uppercase",
            fin.faixa_preco_label === "luxo" ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" :
            fin.faixa_preco_label === "premium" ? "bg-purple-500/20 text-purple-600 dark:text-purple-400" :
            fin.faixa_preco_label === "moderado" ? "bg-blue-500/20 text-blue-600 dark:text-blue-400" :
            "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
          )}>
            {fin.faixa_preco_label} {fin.faixa_preco_total ? `${fin.faixa_preco_total}` : ""}
          </Badge>
        )}
        {perfil?.ideal?.slice(0, 3).map((p, i) => (
          <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0">{p}</Badge>
        ))}
        {confColor && (
          <span className={cn("w-2 h-2 rounded-full ml-auto", confColor)} title={`Confiança: ${Math.round((confianca || 0) * 100)}%`} />
        )}
      </div>

      {/* Counters */}
      {(passeioCount > 0 || hotelCount > 0 || tagCount > 0) && (
        <p className="text-[9px] text-muted-foreground">
          {[
            passeioCount > 0 ? `${passeioCount} passeios` : null,
            hotelCount > 0 ? `${hotelCount} hotéis` : null,
            tagCount > 0 ? `${tagCount} tags` : null,
          ].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  );
}
