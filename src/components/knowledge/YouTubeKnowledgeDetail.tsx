import { useState } from "react";
import {
  ArrowLeft, Youtube, BookOpen, Sparkles, Trash2, ExternalLink,
  MapPin, Clock, DollarSign, Users, Plane, Star, BedDouble, Rocket,
  ChevronDown, ChevronUp, Globe, Thermometer, Syringe, AlertTriangle,
  Utensils, Camera, Shield, TrendingUp, Heart, MessageSquare,
  Hash, Calendar, FileText, Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import TaxonomyPreview, { type Taxonomy } from "@/components/knowledge/TaxonomyPreview";
import OrionDataTables from "@/components/knowledge/OrionDataTables";

interface KBDoc {
  id: string;
  title: string;
  category: string;
  description: string | null;
  content_text: string | null;
  file_name: string | null;
  file_type: string | null;
  file_url: string | null;
  is_active: boolean | null;
  uploaded_by: string | null;
  created_at: string;
  tags: string[] | null;
  confidence: number | null;
  taxonomy: any | null;
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

// ─── Quick stat card ───
function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 shadow-sm hover:shadow-md transition-shadow">
      <div className={cn("p-2.5 rounded-xl", color.replace("text-", "bg-").replace("500", "500/10").replace("400", "400/10"))}>
        <Icon className={cn("w-5 h-5", color)} />
      </div>
      <div>
        <p className="text-xl font-black leading-tight text-foreground">{value}</p>
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
      </div>
    </div>
  );
}

// ─── Confidence ring ───
function ConfidenceRing({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "text-emerald-600 dark:text-emerald-400" : pct >= 50 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
  const stroke = pct >= 80 ? "hsl(var(--primary))" : pct >= 50 ? "#f59e0b" : "#ef4444";
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="110" height="110" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="7" />
        <circle
          cx="50" cy="50" r="40" fill="none" stroke={stroke} strokeWidth="7"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 50 50)"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn("text-3xl font-black", color)}>{pct}</span>
        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">ÓRION</span>
      </div>
    </div>
  );
}

// ─── Highlight chips extracted from taxonomy ───
function QuickHighlights({ taxonomy }: { taxonomy: any }) {
  const tax = taxonomy?.taxonomia || taxonomy;
  if (!tax) return null;

  const highlights: { icon: React.ElementType; text: string; color: string }[] = [];

  if (tax.geo?.pais) highlights.push({ icon: Globe, text: tax.geo.pais, color: "text-blue-600 dark:text-blue-400" });
  if (tax.geo?.cidades?.length > 0) highlights.push({ icon: MapPin, text: `${tax.geo.cidades.length} cidades`, color: "text-blue-500" });
  if (tax.destino?.melhor_epoca?.length > 0) highlights.push({ icon: Calendar, text: tax.destino.melhor_epoca[0], color: "text-amber-600 dark:text-amber-400" });
  if (tax.destino?.clima) highlights.push({ icon: Thermometer, text: tax.destino.clima.slice(0, 40), color: "text-cyan-600 dark:text-cyan-400" });
  if (tax.destino?.visto_necessario === true) highlights.push({ icon: Shield, text: "Visto necessário", color: "text-red-600 dark:text-red-400" });
  if (tax.destino?.visto_necessario === false) highlights.push({ icon: Shield, text: "Visto dispensado", color: "text-emerald-600 dark:text-emerald-400" });
  if (tax.financeiro?.faixa_preco_label) highlights.push({ icon: DollarSign, text: tax.financeiro.faixa_preco_label, color: "text-emerald-600 dark:text-emerald-400" });
  if (tax.financeiro?.faixa_preco_total) highlights.push({ icon: TrendingUp, text: tax.financeiro.faixa_preco_total, color: "text-emerald-500" });
  if (tax.logistica?.tempo_voo_brasil) highlights.push({ icon: Plane, text: tax.logistica.tempo_voo_brasil, color: "text-cyan-600 dark:text-cyan-400" });
  if (tax.perfil_viajante?.ideal?.length > 0) highlights.push({ icon: Users, text: tax.perfil_viajante.ideal.slice(0, 2).join(", "), color: "text-pink-600 dark:text-pink-400" });
  if (tax.experiencias?.passeios?.length > 0) highlights.push({ icon: Camera, text: `${tax.experiencias.passeios.length} passeios`, color: "text-orange-600 dark:text-orange-400" });
  if (tax.experiencias?.restaurantes?.length > 0) highlights.push({ icon: Utensils, text: `${tax.experiencias.restaurantes.length} restaurantes`, color: "text-orange-500" });
  if (tax.hospedagem?.hoteis?.length > 0) highlights.push({ icon: BedDouble, text: `${tax.hospedagem.hoteis.length} hotéis`, color: "text-purple-600 dark:text-purple-400" });
  if (tax.vendas?.gatilho_emocional) highlights.push({ icon: Heart, text: tax.vendas.gatilho_emocional.slice(0, 40), color: "text-red-500" });

  if (highlights.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--champagne) / 0.3), hsl(var(--primary) / 0.2), transparent)" }} />
      <div className="flex flex-wrap gap-2.5">
        {highlights.map((h, i) => (
          <div key={i} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-card text-sm font-medium shadow-sm hover:shadow-md transition-shadow">
            <h.icon className={cn("w-4 h-4", h.color)} />
            <span className="text-foreground">{h.text}</span>
          </div>
        ))}
      </div>
      <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.2), hsl(var(--champagne) / 0.3), transparent)" }} />
    </div>
  );
}

// ─── Sales insights card ───
function SalesInsightsCard({ vendas }: { vendas: any }) {
  if (!vendas) return null;
  const has = vendas.argumentos_chave?.length > 0 || vendas.objecoes_comuns?.length > 0 || vendas.como_contornar?.length > 0;
  if (!has) return null;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Gold-line top stripe */}
      <div className="h-1" style={{ background: "linear-gradient(90deg, hsl(var(--champagne)), hsl(var(--primary)), hsl(var(--champagne)))" }} />
      
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Rocket className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Insights de Vendas</h3>
            <p className="text-xs text-muted-foreground">Estratégia comercial extraída pelo ÓRION</p>
          </div>
        </div>

        {vendas.argumentos_chave?.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-xs uppercase tracking-wider text-primary font-bold flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" /> Argumentos-chave
            </p>
            <div className="space-y-2">
              {vendas.argumentos_chave.map((a: string, i: number) => (
                <div key={i} className="flex gap-3 text-sm items-start">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold shrink-0 mt-0.5">✓</span>
                  <span className="text-foreground">{a}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {vendas.objecoes_comuns?.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" /> Objeções comuns
            </p>
            <div className="space-y-2">
              {vendas.objecoes_comuns.map((o: string, i: number) => (
                <div key={i} className="flex gap-3 text-sm items-start">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-foreground">{o}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {vendas.como_contornar?.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400 font-bold flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" /> Como contornar
            </p>
            <div className="space-y-2">
              {vendas.como_contornar.map((c: string, i: number) => (
                <div key={i} className="flex gap-3 text-sm items-start">
                  <MessageSquare className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <span className="text-foreground">{c}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {vendas.gatilho_emocional && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/40 border border-border">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Heart className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-red-600 dark:text-red-400 font-bold mb-1">Gatilho emocional</p>
              <p className="text-sm text-foreground">{vendas.gatilho_emocional}</p>
            </div>
          </div>
        )}

        {vendas.urgencia && (
          <p className="text-sm text-muted-foreground"><span className="font-bold text-foreground">Urgência:</span> {vendas.urgencia}</p>
        )}
      </div>
    </div>
  );
}

// ─── Content/Transcript collapsible ───
function ContentSection({ content, label }: { content: string; label: string }) {
  const [expanded, setExpanded] = useState(false);
  const preview = content.slice(0, 600);
  const isLong = content.length > 600;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 bg-muted/30 text-left hover:bg-muted/40 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <span className="text-sm font-bold text-foreground">{label}</span>
            <span className="text-xs text-muted-foreground ml-2">({content.length.toLocaleString()} chars)</span>
          </div>
        </div>
        {isLong && (expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />)}
      </button>
      <div className="p-6">
        <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
          {expanded || !isLong ? content : preview + "..."}
        </pre>
        {isLong && !expanded && (
          <button onClick={() => setExpanded(true)} className="text-sm text-primary font-semibold mt-3 hover:underline">
            Ver conteúdo completo →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Section header helper ───
function SectionHeader({ icon: Icon, title, subtitle, color = "text-primary" }: {
  icon: React.ElementType; title: string; subtitle?: string; color?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("p-2 rounded-xl", color.replace("text-", "bg-").replace("500", "500/10").replace("600", "600/10"))}>
        <Icon className={cn("w-5 h-5", color)} />
      </div>
      <div>
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Main Component ───
interface Props {
  doc: KBDoc;
  onBack: () => void;
  onDelete: (id: string) => void;
}

export default function YouTubeKnowledgeDetail({ doc, onBack, onDelete }: Props) {
  const videoId = doc.file_url ? extractYouTubeId(doc.file_url) : null;
  const tax = doc.taxonomy?.taxonomia || doc.taxonomy;
  const chunks = doc.taxonomy?.chunks || [];
  const hasTaxonomy = !!tax && typeof tax === "object";

  const cityCount = tax?.geo?.cidades?.length || 0;
  const passeioCount = tax?.experiencias?.passeios?.length || 0;
  const hotelCount = tax?.hospedagem?.hoteis?.length || 0;
  const restauranteCount = tax?.experiencias?.restaurantes?.length || 0;
  const tagCount = doc.tags?.length || 0;
  const chunkCount = chunks.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="h-0.5" style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--champagne)), hsl(var(--primary)))" }} />
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-1.5 font-semibold" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <div className="flex items-center gap-2">
            {doc.file_url && (
              <Button size="sm" variant="outline" className="gap-1.5" asChild>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                  <Youtube className="w-3.5 h-3.5 text-red-500" /> Abrir no YouTube
                </a>
              </Button>
            )}
            <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive"
              onClick={() => onDelete(doc.id)}>
              <Trash2 className="w-3.5 h-3.5" /> Remover
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* ═══ HERO ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Video */}
          <div className="lg:col-span-3">
            {videoId ? (
              <div className="rounded-2xl overflow-hidden border border-border bg-black shadow-xl">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}`}
                  className="w-full aspect-video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={doc.title}
                />
              </div>
            ) : (
              <div className="rounded-2xl bg-muted/30 aspect-video flex items-center justify-center border border-border">
                <Youtube className="w-16 h-16 text-muted-foreground/20" />
              </div>
            )}
          </div>

          {/* Meta sidebar */}
          <div className="lg:col-span-2 space-y-4">
            {/* Title card */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, hsl(var(--champagne)), hsl(var(--primary)))" }} />
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="text-[10px] font-semibold">{doc.category}</Badge>
                <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 text-[10px] font-semibold">
                  <Youtube className="w-3 h-3 mr-1" /> YOUTUBE
                </Badge>
              </div>
              <h1 className="text-xl font-black leading-tight text-foreground">{doc.title}</h1>
              {doc.description && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{doc.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Adicionado em {new Date(doc.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>

            {/* Confidence ring */}
            {doc.confidence != null && doc.confidence > 0 && (
              <div className="flex items-center gap-4 p-5 rounded-2xl border border-border bg-card shadow-sm">
                <ConfidenceRing value={doc.confidence} />
                <div>
                  <p className="text-sm font-bold text-foreground">Score de Confiança</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Processado pelo motor ÓRION com {doc.confidence >= 0.8 ? "alta" : doc.confidence >= 0.5 ? "média" : "baixa"} confiança
                  </p>
                </div>
              </div>
            )}

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-2.5">
              {cityCount > 0 && <StatCard icon={MapPin} label="Cidades" value={cityCount} color="text-blue-500" />}
              {passeioCount > 0 && <StatCard icon={Camera} label="Passeios" value={passeioCount} color="text-orange-500" />}
              {hotelCount > 0 && <StatCard icon={BedDouble} label="Hotéis" value={hotelCount} color="text-purple-500" />}
              {restauranteCount > 0 && <StatCard icon={Utensils} label="Restaurantes" value={restauranteCount} color="text-orange-400" />}
              {chunkCount > 0 && <StatCard icon={BookOpen} label="Chunks" value={chunkCount} color="text-blue-400" />}
              {tagCount > 0 && <StatCard icon={Hash} label="Tags" value={tagCount} color="text-primary" />}
            </div>
          </div>
        </div>

        {/* ═══ QUICK HIGHLIGHTS ═══ */}
        {hasTaxonomy && <QuickHighlights taxonomy={doc.taxonomy} />}

        {/* ═══ TAGS CLOUD ═══ */}
        {doc.tags && doc.tags.length > 0 && (
          <div className="space-y-3">
            <SectionHeader icon={Hash} title="Tags Extraídas" subtitle={`${doc.tags.length} tags identificadas`} />
            <div className="flex flex-wrap gap-2">
              {doc.tags.map((tag, i) => (
                <span key={i} className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary/15 text-primary border border-primary/20">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ═══ SALES INSIGHTS (top priority) ═══ */}
        {hasTaxonomy && <SalesInsightsCard vendas={tax.vendas} />}

        {/* ═══ DATA TABLES (tabbed professional view) ═══ */}
        {hasTaxonomy && <OrionDataTables taxonomy={doc.taxonomy} />}
        {hasTaxonomy && (
          <div className="space-y-3">
            <SectionHeader icon={Sparkles} title="Taxonomia ÓRION Completa" subtitle="Visualização bruta dos dados extraídos" color="text-amber-500" />
            <TaxonomyPreview taxonomy={tax} onChange={() => {}} readOnly />
          </div>
        )}

        {/* ═══ CHUNKS ═══ */}
        {chunks.length > 0 && (
          <div className="space-y-4">
            <SectionHeader icon={BookOpen} title={`Blocos de Conhecimento (${chunks.length})`} subtitle="Conteúdo segmentado para os agentes IA" color="text-blue-500" />
            <div className="grid gap-3 md:grid-cols-2">
              {chunks.map((chunk: any, i: number) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3 hover:shadow-md transition-shadow relative overflow-hidden">
                  {/* Left stripe */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: "linear-gradient(180deg, hsl(var(--primary)), hsl(var(--champagne)))" }} />
                  <div className="flex items-start gap-3 pl-2">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <h4 className="text-sm font-bold leading-tight text-foreground">{chunk.titulo}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed pl-2">{chunk.conteudo}</p>
                  {chunk.tags_chunk && chunk.tags_chunk.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-2">
                      {chunk.tags_chunk.map((t: string, j: number) => (
                        <span key={j} className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-muted text-muted-foreground border border-border/60">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ CONTENT / TRANSCRIPT ═══ */}
        {doc.content_text && (
          <ContentSection content={doc.content_text} label="Conteúdo Extraído" />
        )}
      </div>
    </div>
  );
}
