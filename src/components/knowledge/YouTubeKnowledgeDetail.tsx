import { useState } from "react";
import {
  ArrowLeft, Youtube, BookOpen, Sparkles, Trash2, ExternalLink,
  MapPin, Clock, DollarSign, Users, Plane, Star, BedDouble, Rocket,
  ChevronDown, ChevronUp, Globe, Thermometer, Syringe, AlertTriangle,
  Utensils, Camera, Shield, TrendingUp, Heart, MessageSquare,
  Hash, Calendar, FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-card p-3">
      <div className={cn("p-2 rounded-lg", color.replace("text-", "bg-").replace("500", "500/10"))}>
        <Icon className={cn("w-4 h-4", color)} />
      </div>
      <div>
        <p className="text-lg font-bold leading-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

// ─── Confidence ring ───
function ConfidenceRing({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "text-emerald-500" : pct >= 50 ? "text-amber-500" : "text-red-500";
  const stroke = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" className="text-muted/20" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="40" fill="none" stroke={stroke} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 50 50)"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn("text-2xl font-black", color)}>{pct}</span>
        <span className="text-[9px] text-muted-foreground font-bold uppercase">ÓRION</span>
      </div>
    </div>
  );
}

// ─── Highlight chips extracted from taxonomy ───
function QuickHighlights({ taxonomy }: { taxonomy: any }) {
  const tax = taxonomy?.taxonomia || taxonomy;
  if (!tax) return null;

  const highlights: { icon: React.ElementType; text: string; color: string }[] = [];

  if (tax.geo?.pais) highlights.push({ icon: Globe, text: tax.geo.pais, color: "text-blue-500" });
  if (tax.geo?.cidades?.length > 0) highlights.push({ icon: MapPin, text: `${tax.geo.cidades.length} cidades`, color: "text-blue-400" });
  if (tax.destino?.melhor_epoca?.length > 0) highlights.push({ icon: Calendar, text: tax.destino.melhor_epoca[0], color: "text-amber-500" });
  if (tax.destino?.clima) highlights.push({ icon: Thermometer, text: tax.destino.clima.slice(0, 40), color: "text-cyan-500" });
  if (tax.destino?.visto_necessario === true) highlights.push({ icon: Shield, text: "Visto necessário", color: "text-red-500" });
  if (tax.destino?.visto_necessario === false) highlights.push({ icon: Shield, text: "Visto dispensado", color: "text-emerald-500" });
  if (tax.financeiro?.faixa_preco_label) highlights.push({ icon: DollarSign, text: tax.financeiro.faixa_preco_label, color: "text-emerald-500" });
  if (tax.financeiro?.faixa_preco_total) highlights.push({ icon: TrendingUp, text: tax.financeiro.faixa_preco_total, color: "text-emerald-400" });
  if (tax.logistica?.tempo_voo_brasil) highlights.push({ icon: Plane, text: tax.logistica.tempo_voo_brasil, color: "text-cyan-500" });
  if (tax.perfil_viajante?.ideal?.length > 0) highlights.push({ icon: Users, text: tax.perfil_viajante.ideal.slice(0, 2).join(", "), color: "text-pink-500" });
  if (tax.experiencias?.passeios?.length > 0) highlights.push({ icon: Camera, text: `${tax.experiencias.passeios.length} passeios`, color: "text-orange-500" });
  if (tax.experiencias?.restaurantes?.length > 0) highlights.push({ icon: Utensils, text: `${tax.experiencias.restaurantes.length} restaurantes`, color: "text-orange-400" });
  if (tax.hospedagem?.hoteis?.length > 0) highlights.push({ icon: BedDouble, text: `${tax.hospedagem.hoteis.length} hotéis`, color: "text-purple-500" });
  if (tax.vendas?.gatilho_emocional) highlights.push({ icon: Heart, text: tax.vendas.gatilho_emocional.slice(0, 40), color: "text-red-400" });

  if (highlights.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {highlights.map((h, i) => (
        <div key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/40 bg-card text-xs font-medium">
          <h.icon className={cn("w-3.5 h-3.5", h.color)} />
          <span>{h.text}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Sales insights card ───
function SalesInsightsCard({ vendas }: { vendas: any }) {
  if (!vendas) return null;
  const has = vendas.argumentos_chave?.length > 0 || vendas.objecoes_comuns?.length > 0 || vendas.como_contornar?.length > 0;
  if (!has) return null;

  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Rocket className="w-5 h-5 text-red-500" />
        <h3 className="text-sm font-bold">Insights de Vendas</h3>
      </div>

      {vendas.argumentos_chave?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">🎯 Argumentos-chave</p>
          <div className="space-y-1.5">
            {vendas.argumentos_chave.map((a: string, i: number) => (
              <div key={i} className="flex gap-2 text-xs">
                <span className="text-emerald-500 mt-0.5 shrink-0">✓</span>
                <span>{a}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {vendas.objecoes_comuns?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">⚡ Objeções comuns</p>
          <div className="space-y-1.5">
            {vendas.objecoes_comuns.map((o: string, i: number) => (
              <div key={i} className="flex gap-2 text-xs">
                <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                <span>{o}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {vendas.como_contornar?.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">💡 Como contornar</p>
          <div className="space-y-1.5">
            {vendas.como_contornar.map((c: string, i: number) => (
              <div key={i} className="flex gap-2 text-xs">
                <MessageSquare className="w-3 h-3 text-blue-500 mt-0.5 shrink-0" />
                <span>{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {vendas.gatilho_emocional && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <Heart className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-red-500 font-bold mb-0.5">Gatilho emocional</p>
            <p className="text-xs">{vendas.gatilho_emocional}</p>
          </div>
        </div>
      )}

      {vendas.urgencia && (
        <p className="text-xs text-muted-foreground"><span className="font-bold">Urgência:</span> {vendas.urgencia}</p>
      )}
    </div>
  );
}

// ─── Content/Transcript collapsible ───
function ContentSection({ content, label }: { content: string; label: string }) {
  const [expanded, setExpanded] = useState(false);
  const preview = content.slice(0, 600);
  const isLong = content.length > 600;

  return (
    <div className="rounded-xl border border-border/40 bg-card overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 bg-muted/30 text-left">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-bold">{label}</span>
          <span className="text-[10px] text-muted-foreground">({content.length.toLocaleString()} chars)</span>
        </div>
        {isLong && (expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
      </button>
      <div className="p-5">
        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
          {expanded || !isLong ? content : preview + "..."}
        </pre>
        {isLong && !expanded && (
          <button onClick={() => setExpanded(true)} className="text-xs text-primary font-medium mt-2 hover:underline">
            Ver tudo →
          </button>
        )}
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

  // Count stats
  const cityCount = tax?.geo?.cidades?.length || 0;
  const passeioCount = tax?.experiencias?.passeios?.length || 0;
  const hotelCount = tax?.hospedagem?.hoteis?.length || 0;
  const restauranteCount = tax?.experiencias?.restaurantes?.length || 0;
  const tagCount = doc.tags?.length || 0;
  const chunkCount = chunks.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={onBack}>
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
            <Button size="sm" variant="outline" className="gap-1.5 text-red-500 hover:text-red-600"
              onClick={() => onDelete(doc.id)}>
              <Trash2 className="w-3.5 h-3.5" /> Remover
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-8">
        {/* ═══ HERO ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Video */}
          <div className="lg:col-span-3">
            {videoId ? (
              <div className="rounded-2xl overflow-hidden border border-border/40 bg-black shadow-2xl">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}`}
                  className="w-full aspect-video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={doc.title}
                />
              </div>
            ) : (
              <div className="rounded-2xl bg-muted/30 aspect-video flex items-center justify-center">
                <Youtube className="w-16 h-16 text-muted-foreground/20" />
              </div>
            )}
          </div>

          {/* Meta sidebar */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-[10px]">{doc.category}</Badge>
                <Badge className="bg-red-500/15 text-red-500 border-red-500/30 text-[10px]">
                  <Youtube className="w-3 h-3 mr-1" /> YOUTUBE
                </Badge>
              </div>
              <h1 className="text-xl font-black leading-tight">{doc.title}</h1>
              {doc.description && (
                <p className="text-sm text-muted-foreground mt-2">{doc.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                <Clock className="w-3 h-3 inline mr-1" />
                Adicionado em {new Date(doc.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>

            {/* Confidence ring */}
            {doc.confidence != null && doc.confidence > 0 && (
              <div className="flex items-center gap-4 p-4 rounded-xl border border-border/40 bg-card">
                <ConfidenceRing value={doc.confidence} />
                <div>
                  <p className="text-xs font-bold">Score de Confiança</p>
                  <p className="text-[10px] text-muted-foreground">
                    Processado pelo motor ÓRION com {doc.confidence >= 0.8 ? "alta" : doc.confidence >= 0.5 ? "média" : "baixa"} confiança
                  </p>
                </div>
              </div>
            )}

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-2">
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
          <div className="space-y-2">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Hash className="w-4 h-4 text-primary" /> Tags Extraídas
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {doc.tags.map((tag, i) => (
                <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
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
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" /> Taxonomia ÓRION Completa
            </h2>
            <TaxonomyPreview taxonomy={tax} onChange={() => {}} readOnly />
          </div>
        )}

        {/* ═══ CHUNKS ═══ */}
        {chunks.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-500" /> Blocos de Conhecimento ({chunks.length})
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {chunks.map((chunk: any, i: number) => (
                <div key={i} className="rounded-xl border border-border/40 bg-card p-4 space-y-2 hover:border-primary/20 transition-colors">
                  <div className="flex items-start gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <h4 className="text-sm font-bold leading-tight">{chunk.titulo}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed pl-8">{chunk.conteudo}</p>
                  {chunk.tags_chunk && chunk.tags_chunk.length > 0 && (
                    <div className="flex flex-wrap gap-1 pl-8">
                      {chunk.tags_chunk.map((t: string, j: number) => (
                        <span key={j} className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-muted text-muted-foreground">
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
