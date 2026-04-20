import { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutDashboard, Plane, Users, Brain, Sparkles, DollarSign, MessageSquare,
  Users2, ClipboardCheck, Hotel, Shield, Target, BarChart3, Zap, GitBranch,
  BookOpen, Star, ArrowRight, CheckCircle2, TrendingUp, Clock, Rocket,
  ChevronDown, Play, Award, Globe, Lock, Cpu, PieChart, FileText, Eye,
  MousePointer, Mic, Search, Image as ImageIcon, Layers, Database,
  RefreshCw, LineChart, Workflow, BotMessageSquare, CalendarCheck,
  ArrowUpRight, CircleDot, Gauge, HeartPulse, ShieldCheck, Activity,
  Bot, Compass, Briefcase, Cake, AlertTriangle, Map, FileSignature,
  Headphones, Smartphone, Layers3, Network, Wand2, BookMarked
} from "lucide-react";
import { cn } from "@/lib/utils";
import logoNatleva from "@/assets/logo-natleva.png";
import printDashboard from "@/assets/print-dashboard.jpg";
import printIntelligence from "@/assets/print-intelligence.jpg";
import printFinanceiro from "@/assets/print-financeiro.jpg";
import printClientes from "@/assets/print-clientes.jpg";

/* ── Intersection Observer hook ── */
const useInView = (threshold = 0.12) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
};

function FadeIn({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useInView();
  return (
    <div ref={ref} className={cn("transition-all duration-700", visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8", className)} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function SlideIn({ children, className, delay = 0, direction = "left" }: { children: React.ReactNode; className?: string; delay?: number; direction?: "left" | "right" }) {
  const { ref, visible } = useInView();
  const from = direction === "left" ? "-translate-x-12" : "translate-x-12";
  return (
    <div ref={ref} className={cn("transition-all duration-800", visible ? "opacity-100 translate-x-0" : `opacity-0 ${from}`, className)} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ── Counter animation ── */
function AnimatedCounter({ target, suffix = "" }: { target: string; suffix?: string }) {
  const { ref, visible } = useInView();
  const [display, setDisplay] = useState("0");
  useEffect(() => {
    if (!visible) return;
    const num = parseInt(target.replace(/\D/g, ""));
    if (isNaN(num)) { setDisplay(target); return; }
    let current = 0;
    const step = Math.max(1, Math.floor(num / 40));
    const interval = setInterval(() => {
      current = Math.min(current + step, num);
      setDisplay(current.toString());
      if (current >= num) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [visible, target]);
  const prefix = target.match(/^[^\d]*/)?.[0] || "";
  const originalSuffix = target.match(/[^\d]*$/)?.[0] || "";
  return <span ref={ref}>{prefix}{display}{suffix || originalSuffix}</span>;
}

/* ── Screenshot showcase component ── */
function ScreenshotShowcase({ image, title, description, features, reverse = false, badge }: {
  image: string; title: string; description: string; features: string[]; reverse?: boolean; badge?: string;
}) {
  return (
    <FadeIn>
      <div className={cn("flex flex-col gap-10 items-center py-12", reverse ? "lg:flex-row-reverse" : "lg:flex-row")}>
        <div className="flex-1 w-full lg:w-1/2">
          <div className="relative group">
            <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-accent/20 via-primary/15 to-accent/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative rounded-2xl overflow-hidden border border-border/40 shadow-2xl shadow-black/20">
              <img src={image} alt={title} className="w-full h-auto object-cover group-hover:scale-[1.03] transition-transform duration-1000 ease-out" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent opacity-60" />
              <div className="absolute bottom-4 left-4 right-4 flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                <div className="w-3 h-3 rounded-full bg-green-400/60" />
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 w-full lg:w-1/2 space-y-5">
          {badge && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-accent bg-accent/10 border border-accent/20 px-3 py-1.5 rounded-full">
              <CircleDot className="w-3 h-3" /> {badge}
            </span>
          )}
          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight">{title}</h3>
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">{description}</p>
          <ul className="space-y-3 pt-2">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-3 text-base sm:text-lg text-foreground/80">
                <CheckCircle2 className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </FadeIn>
  );
}

/* ── Data ── */
const stats = [
  { value: "60+", label: "Módulos integrados", icon: Layers3 },
  { value: "21", label: "Agentes de IA (Nath)", icon: Bot },
  { value: "360°", label: "Visão do cliente", icon: Eye },
  { value: "24/7", label: "Operação inteligente", icon: BotMessageSquare },
];

const modules = [
  {
    icon: LayoutDashboard, title: "Dashboard Master & Torre de Controle", color: "from-emerald-500/20 to-emerald-600/5",
    desc: "BI completo com KPIs financeiros, sazonalidade, projeção de metas, heatmap geográfico e a Torre de Controle operacional para gerir viagens em tempo real.",
    features: ["KPIs em tempo real", "Mapa de rotas Leaflet", "Score de Saúde Empresarial", "Modo CEO"],
  },
  {
    icon: MessageSquare, title: "LiveChat WhatsApp + IA", color: "from-green-500/20 to-green-600/5",
    desc: "Atendimento omnichannel com Z-API, sugestões inteligentes em tempo real, auto-tagging de leads e detecção de momento de compra.",
    features: ["WhatsApp Z-API", "Auto-tagging por regex", "Análise de Atendimento", "Painel de Inteligência ao vivo"],
  },
  {
    icon: Bot, title: "AI Team — O Batalhão da Nath", color: "from-violet-500/20 to-violet-600/5",
    desc: "21 agentes especializados em 7 squads (Comercial, Operações, Financeiro, Pós-venda, Inteligência, Conteúdo, RH) — todos se identificam como Nath, com prompts versionados e Skills atribuíveis.",
    features: ["Maya · Atlas · Habibi · ÓRION", "Squads especializados", "Skills System v2", "Simulador Camaleão"],
  },
  {
    icon: FileSignature, title: "Pipeline de Cotações & Propostas", color: "from-cyan-500/20 to-cyan-600/5",
    desc: "Briefing → Pipeline 13 etapas → Proposta IA com landing page imersiva, capa inteligente (Wikimedia + Gemini), analytics de engajamento e ponte com o Portal de Cotações.",
    features: ["Funil de 13 etapas", "Proposta IA journey-aware", "Capa inteligente por destino", "Analytics de engajamento"],
  },
  {
    icon: Plane, title: "Operações Aéreas & Check-in", color: "from-blue-500/20 to-blue-600/5",
    desc: "Integração Amadeus, voos em estilo boarding pass, logos das companhias, classificação de itinerário (round-trip / open-jaw / multi-city) e Centro de Check-in com monitoramento proativo.",
    features: ["Integração Amadeus", "Check-in individual por PAX", "Alertas de proximidade", "Alterações de viagem"],
  },
  {
    icon: Compass, title: "Portal do Viajante — Minhas Viagens", color: "from-sky-500/20 to-sky-600/5",
    desc: "Experiência editorial e imersiva para o passageiro, centralizando itinerário, voos, hospedagem, experiências, contagem regressiva e documentos de embarque.",
    features: ["Hero por destino", "Timeline da viagem", "Portal pública para o cliente", "Apresentação cinematográfica"],
  },
  {
    icon: Brain, title: "Cérebro NatLeva & Inteligência de Clientes", color: "from-purple-500/20 to-purple-600/5",
    desc: "Hub de inteligência que calcula probabilidade de fechamento, Score NatLeva (0-100) com 5 pilares, predição de churn, LTV, recomendações personalizadas e ciclos de viagem.",
    features: ["Score NatLeva (5 pilares)", "Probabilidade de fechamento", "Memória de viagens por ciclo", "Predição de churn"],
  },
  {
    icon: Sparkles, title: "NatLeva Intelligence (Consultor IA)", color: "from-amber-500/20 to-amber-600/5",
    desc: "Orquestração multi-modelo (Gemini 2.5/3, GPT-5, Claude Sonnet) que acessa o banco completo, faz pesquisa web ao vivo e devolve insights acionáveis com voz, imagem e texto.",
    features: ["AI Routing automático", "Pesquisa web em tempo real", "Comando por voz (STT)", "Geração de imagens"],
  },
  {
    icon: BookMarked, title: "ÓRION — Base de Conhecimento", color: "from-orange-500/20 to-orange-600/5",
    desc: "Pipeline híbrido de extração (PDF, áudio, vídeo, YouTube) que neutraliza pacotes de terceiros, organiza por taxonomia e roteia conhecimento para os agentes via Precision Routing.",
    features: ["Extração YouTube + áudio", "Taxonomia ÓRION", "RAG com integridade factual", "Roteamento por especialista"],
  },
  {
    icon: GitBranch, title: "Flow Builder Visual", color: "from-pink-500/20 to-pink-600/5",
    desc: "Plataforma de automação visual (ReactFlow) que serve como blueprint estratégico da jornada do cliente, com Funil Vivo 3D em tempo real e templates operacionais.",
    features: ["ReactFlow drag-and-drop", "Template New Flow NatLeva", "Funil Vivo 3D", "Auto-sync com agentes"],
  },
  {
    icon: DollarSign, title: "Financeiro Completo", color: "from-yellow-500/20 to-yellow-600/5",
    desc: "Contas a pagar/receber, fluxo de caixa, DRE automática, plano de contas, comissionamento por origem do lead (15% agência / 30% indicação) e simulador de taxas.",
    features: ["DRE automática", "Comissão por origem", "Cartões e parcelas", "Fornecedores"],
  },
  {
    icon: Users2, title: "RH & Pessoas", color: "from-rose-500/20 to-rose-600/5",
    desc: "Gestão completa do time: ponto eletrônico, folha, metas, desempenho, feedbacks 1:1, clima e aniversariantes integrados ao CRM.",
    features: ["Ponto eletrônico", "Metas & bônus", "Feedbacks 1:1", "Aniversários"],
  },
  {
    icon: Shield, title: "Admin, Segurança & Auditoria", color: "from-slate-500/20 to-slate-600/5",
    desc: "Hierarquia de permissões (Admin > Gestor > Vendedor > Operacional > Financeiro), RLS em todas as tabelas, auditoria completa e governança da IA.",
    features: ["RLS granular", "6 níveis de acesso", "Audit log da IA", "Estratégia IA"],
  },
];

const differentials = [
  { icon: Bot, title: "Batalhão de 21 agentes IA", desc: "Squads especializados que se identificam como 'Nath' — atendem, cotam, fecham e fazem pós-venda 24/7 com personalidade unificada." },
  { icon: Wand2, title: "Capa inteligente em propostas", desc: "Sugestão automática de fotos reais (Wikimedia Commons) ou imagens cinematográficas geradas por Gemini, baseadas no destino do cliente." },
  { icon: Compass, title: "Portal do Viajante imersivo", desc: "Cada cliente recebe uma landing page editorial da própria viagem, com voos, hospedagem, contagem regressiva e documentos." },
  { icon: HeartPulse, title: "Detecção de momento de compra", desc: "A IA monitora conversas em tempo real e dispara alertas quando sinais de compra aparecem — você nunca perde o timing." },
  { icon: Target, title: "Score NatLeva (0–100)", desc: "Avalia clientes por Valor, Lucratividade, Frequência, Engajamento e Recomendação. Saiba quem priorizar hoje." },
  { icon: Network, title: "Funil Vivo em 3D", desc: "Flow Builder com visualização 3D em tempo real do estágio em que cada lead está dentro da jornada." },
  { icon: BookMarked, title: "ÓRION — extrai tudo", desc: "Sobe um vídeo do YouTube, PDF ou áudio e a IA destila o conhecimento factual, sem alucinação, e distribui para os agentes certos." },
  { icon: ClipboardCheck, title: "Check-in proativo por PAX", desc: "Centro de check-in com 4 níveis de alerta por proximidade do voo e upload de cartão de embarque por passageiro." },
  { icon: Globe, title: "Pesquisa web ao vivo", desc: "A IA consulta DuckDuckGo, Google, Wikipedia e Google News em tempo real para enriquecer recomendações." },
];

const iaCapabilities = [
  { icon: Bot, label: "Batalhão de 21 agentes", desc: "7 squads especializados — Maya recepciona, Atlas qualifica, Habibi cota destinos premium, ÓRION estuda, e todos atendem como Nath." },
  { icon: Mic, label: "Comando por voz", desc: "Fale com a Nath usando o microfone — speech-to-text integrado, ela entende e responde em tempo real." },
  { icon: Search, label: "Busca web ao vivo", desc: "DuckDuckGo, Google, Wikipedia e Google News integrados ao motor de raciocínio dos agentes." },
  { icon: ImageIcon, label: "Geração de imagens", desc: "Crie capas de proposta, banners e materiais promocionais cinematográficos com Gemini direto no chat." },
  { icon: Eye, label: "Resumo IA em toda página", desc: "Botão flutuante em qualquer tela gera um relatório executivo com plano de ação em segundos." },
  { icon: HeartPulse, label: "Detecção de momento de compra", desc: "Monitora conversas WhatsApp e gera alertas dinâmicos quando o cliente está pronto para fechar." },
  { icon: BookMarked, label: "ÓRION — extração de conhecimento", desc: "Pipeline híbrido para YouTube, PDF e áudio com Gemini 2.5 Pro. Vira conteúdo estruturado e auditável." },
  { icon: Wand2, label: "Capa inteligente por destino", desc: "Busca fotos reais no Wikimedia ou gera imagens cinematográficas — sem marca d'água, alta qualidade." },
  { icon: Layers3, label: "Simulador Camaleão", desc: "Testa a IA contra perfis de desafio (Fantasma, Pechinchador, Indeciso) e devolve framework de avaliação 360°." },
];

const testimonialPhrases = [
  { text: "A Nath responde meus leads no WhatsApp como se fosse minha melhor vendedora. E nunca dorme.", author: "Diretora Comercial", role: "NatLeva Viagens" },
  { text: "Mando uma proposta com capa do destino gerada por IA e o cliente responde 'uau' antes mesmo de ler o preço.", author: "Consultora Sênior", role: "Premium Travel" },
  { text: "O Cérebro NatLeva me diz qual lead tem 80% de chance de fechar essa semana. Foco total.", author: "Gerente de Vendas", role: "Top Travel" },
  { text: "Subo um vídeo do YouTube de hotel em Maldivas e o ÓRION ensina meus agentes em 2 minutos.", author: "Head de Conhecimento", role: "Dream Trips" },
  { text: "O Centro de Check-in me avisa 48h antes — zero passageiro perdido em 2026.", author: "Coordenadora de Operações", role: "Fly Experience" },
  { text: "O DRE automático e a comissão por origem de lead me economizam 3 dias de fechamento por mês.", author: "Controller", role: "Viagens Premium" },
];

const processSteps = [
  { icon: MessageSquare, title: "Entrada do Lead", desc: "WhatsApp, portal de cotações, indicação ou site — a Nath (Maya) recepciona com saudação temporal e qualifica.", num: "01" },
  { icon: Brain, title: "Diagnóstico & Briefing", desc: "Atlas qualifica em profundidade. Briefing estruturado é gerado e a IA detecta destino, datas e composição do grupo.", num: "02" },
  { icon: FileSignature, title: "Proposta IA", desc: "Habibi monta a proposta com voos Amadeus, hospedagem, capa inteligente do destino e landing page imersiva.", num: "03" },
  { icon: HeartPulse, title: "Inteligência ao Vivo", desc: "Cérebro NatLeva calcula probabilidade de fechamento e dispara alertas no momento de compra do cliente.", num: "04" },
  { icon: Plane, title: "Operação", desc: "Emissão, check-in proativo por PAX, controle de alterações de viagem e envio de documentos pelo Portal do Viajante.", num: "05" },
  { icon: DollarSign, title: "Financeiro", desc: "Custos, recebíveis, comissão por origem e DRE calculados automaticamente. Plano de contas integrado.", num: "06" },
  { icon: Compass, title: "Pós-venda & Portal", desc: "Cliente vive a viagem pelo portal 'Minhas Viagens' com itinerário, contagem regressiva e contato direto.", num: "07" },
  { icon: RefreshCw, title: "Recompra Inteligente", desc: "Score NatLeva, predição de churn e ciclos de viagem garantem recorrência e crescimento orgânico.", num: "08" },
];

const comparisonItems = [
  { feature: "CRM de viagens completo", natleva: true, others: "Parcial" },
  { feature: "21 agentes de IA especializados (Nath)", natleva: true, others: false },
  { feature: "Proposta IA com capa inteligente do destino", natleva: true, others: false },
  { feature: "Portal do viajante imersivo (Minhas Viagens)", natleva: true, others: false },
  { feature: "Cérebro NatLeva (probabilidade de fechamento)", natleva: true, others: false },
  { feature: "Detecção de momento de compra em tempo real", natleva: true, others: false },
  { feature: "Centro de Check-in proativo por PAX", natleva: true, others: false },
  { feature: "Financeiro integrado (DRE, Fluxo, Comissão)", natleva: true, others: false },
  { feature: "Flow Builder visual com Funil Vivo 3D", natleva: true, others: false },
  { feature: "ÓRION — base de conhecimento auditável", natleva: true, others: false },
  { feature: "Pesquisa web ao vivo na IA", natleva: true, others: false },
  { feature: "Comando por voz e geração de imagens", natleva: true, others: false },
  { feature: "Score de clientes (5 pilares) e churn", natleva: true, others: false },
  { feature: "Gestão de RH e ponto", natleva: true, others: false },
];

export default function ApresentacaoGeral() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [hoveredModule, setHoveredModule] = useState<number | null>(null);

  useEffect(() => {
    const t = setInterval(() => setActiveTestimonial(p => (p + 1) % testimonialPhrases.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative min-h-[95vh] flex items-center justify-center overflow-hidden">
        {/* Animated grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(hsl(var(--accent)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent)) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, hsl(var(--accent) / 0.5), transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.4), transparent 70%)' }} />
        {/* Scan line */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent animate-pulse" style={{ top: '30%' }} />
        </div>

        <div className="relative z-10 text-center max-w-6xl mx-auto px-6">
          <FadeIn>
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-accent/30 bg-accent/5 mb-8 backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-sm sm:text-base font-medium text-accent">Plataforma Inteligente para Agências de Viagens</span>
            </div>
          </FadeIn>

          <FadeIn delay={100}>
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-foreground leading-[1.05] mb-8">
              O sistema que{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-accent via-primary to-accent bg-clip-text text-transparent bg-[length:200%_auto] animate-[shimmer_3s_ease-in-out_infinite]">transforma</span>
              </span>
              <br />
              <span className="relative">
                dados em <span className="text-accent">lucro</span>
                <span className="absolute -bottom-2 left-0 right-0 h-1 rounded-full bg-gradient-to-r from-accent/60 via-primary/40 to-transparent" />
              </span>
            </h1>
          </FadeIn>

          <FadeIn delay={200}>
            <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
              CRM, Financeiro, RH, 21 agentes de IA (Nath), Portal do Viajante e Automação —
              <br className="hidden sm:block" />
              tudo numa plataforma que{" "}
              <strong className="text-foreground">pensa, vende e opera junto com você</strong>.
            </p>
          </FadeIn>

          <FadeIn delay={300}>
            <div className="flex flex-wrap justify-center gap-4 mb-16">
              <a href="#prints" className="group inline-flex items-center gap-2.5 px-10 py-5 rounded-2xl bg-accent text-accent-foreground font-bold text-lg shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:shadow-2xl hover:scale-105 transition-all duration-300">
                Ver o Sistema <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
              <a href="#como-funciona" className="group inline-flex items-center gap-2.5 px-10 py-5 rounded-2xl border-2 border-border text-foreground font-bold text-lg hover:border-accent/50 hover:bg-accent/5 transition-all duration-300">
                <Play className="w-5 h-5 group-hover:scale-110 transition-transform" /> Como funciona
              </a>
            </div>
          </FadeIn>

          <FadeIn delay={400}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {stats.map((s, i) => (
                <div key={i} className="group text-center p-5 rounded-2xl bg-card/40 border border-border/40 backdrop-blur-sm hover:border-accent/30 hover:bg-card/60 transition-all duration-300">
                  <s.icon className="w-5 h-5 text-accent mx-auto mb-2 opacity-60 group-hover:opacity-100 transition-opacity" />
                  <div className="text-3xl sm:text-4xl font-bold text-accent mb-1">
                    <AnimatedCounter target={s.value} />
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={600}>
            <div className="mt-16 flex flex-col items-center gap-2 text-muted-foreground/50 text-xs">
              <span>Descubra mais</span>
              <ChevronDown className="w-5 h-5 animate-bounce" />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ LOGO BAR ═══════════ */}
      <section className="py-8 border-y border-border/30 bg-card/20">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-center flex-wrap gap-x-8 gap-y-2 text-muted-foreground/40 text-xs font-mono uppercase tracking-[0.25em]">
          <span>Amadeus</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
          <span>WhatsApp · Z-API</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
          <span>Gemini 2.5 / 3</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
          <span>GPT-5</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/20 hidden sm:block" />
          <span className="hidden sm:inline">Claude Sonnet</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/20 hidden md:block" />
          <span className="hidden md:inline">Wikimedia</span>
        </div>
      </section>

      {/* ═══════════ SOCIAL PROOF ═══════════ */}
      <section className="py-24 bg-card/30">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <FadeIn>
            <div className="flex items-center justify-center gap-1 mb-6">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-7 h-7 fill-amber-400 text-amber-400" />)}
            </div>
            <div className="min-h-[8rem] flex flex-col justify-center">
              <p className="text-2xl sm:text-3xl lg:text-4xl italic text-foreground/80 transition-all duration-700 leading-relaxed">
                "{testimonialPhrases[activeTestimonial].text}"
              </p>
              <div className="mt-6">
                <p className="text-base font-semibold text-foreground">— {testimonialPhrases[activeTestimonial].author}</p>
                <p className="text-sm text-muted-foreground">{testimonialPhrases[activeTestimonial].role}</p>
              </div>
            </div>
            <div className="flex justify-center gap-2 mt-8">
              {testimonialPhrases.map((_, i) => (
                <button key={i} onClick={() => setActiveTestimonial(i)}
                  className={cn("h-2 rounded-full transition-all duration-300", i === activeTestimonial ? "bg-accent w-10" : "bg-muted-foreground/20 w-2 hover:bg-muted-foreground/40")} />
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ COMO FUNCIONA ═══════════ */}
      <section id="como-funciona" className="py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center mb-20">
              <span className="text-sm font-bold text-accent uppercase tracking-[0.2em]">Jornada inteligente</span>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mt-4 mb-5">
                Do primeiro "oi" no WhatsApp<br />à viagem dos sonhos
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Cada etapa é orquestrada por agentes de IA, monitorada em tempo real e otimizada para fechar mais e operar melhor.
              </p>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {processSteps.map((step, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="group relative p-8 rounded-2xl border border-border/50 bg-card/50 hover:border-accent/40 hover:bg-card transition-all duration-500 hover:-translate-y-1.5">
                  <span className="absolute top-6 right-6 text-5xl font-black text-muted-foreground/[0.06] group-hover:text-accent/[0.08] transition-colors">
                    {step.num}
                  </span>
                  <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-5 group-hover:bg-accent/20 group-hover:scale-110 transition-all duration-300">
                    <step.icon className="w-7 h-7 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{step.title}</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ PRINTS DO SISTEMA ═══════════ */}
      <section id="prints" className="py-28 px-6 bg-card/30 border-y border-border/30">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center mb-20">
              <span className="text-sm font-bold text-accent uppercase tracking-[0.2em]">Interface real</span>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mt-4 mb-5">
                Conheça o sistema<br />por dentro
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Cada tela foi projetada para entregar <strong className="text-foreground">clareza, velocidade e inteligência</strong>.
              </p>
            </div>
          </FadeIn>

          <ScreenshotShowcase
            image={printDashboard}
            title="Dashboard Master & Torre de Controle"
            badge="BI + Operação"
            description="Todas as métricas que importam num único painel: faturamento, lucro, margem, sazonalidade, mapa de rotas em Leaflet, ranking de vendedores e Score de Saúde Empresarial."
            features={[
              "KPIs com variação % e tendência automática",
              "Mapa de rotas com IATA → cidade real",
              "Heatmap geográfico e nuvem de destinos",
              "Modo CEO simplificado para diretoria",
            ]}
          />

          <div className="my-20 flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-border/60" />
            <Sparkles className="w-5 h-5 text-accent/40" />
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-border/60" />
          </div>

          <ScreenshotShowcase
            image={printIntelligence}
            title="NatLeva Intelligence + Batalhão da Nath"
            badge="21 agentes IA"
            description="A Nath atende, qualifica, cota e fecha — 24/7. Orquestração multi-modelo (Gemini 2.5/3, GPT-5, Claude Sonnet) com acesso ao banco, pesquisa web ao vivo e geração de imagens."
            features={[
              "Maya recepciona · Atlas qualifica · Habibi cota",
              "ÓRION extrai conhecimento de YouTube e PDFs",
              "Comando por voz e geração de capas por IA",
              "Simulador Camaleão para testes 360°",
            ]}
            reverse
          />

          <div className="my-20 flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-border/60" />
            <DollarSign className="w-5 h-5 text-accent/40" />
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-border/60" />
          </div>

          <ScreenshotShowcase
            image={printFinanceiro}
            title="Financeiro Completo"
            badge="Controle Total"
            description="Contas a pagar e receber, fluxo de caixa visual, cartões, parcelas, DRE automática, plano de contas e comissionamento por origem do lead (15% agência / 30% indicação)."
            features={[
              "DRE 100% automática",
              "Fluxo de caixa com previsão de saldo",
              "Comissão por origem (agência vs. indicação)",
              "Fornecedores e simulador de taxas",
            ]}
          />

          <div className="my-20 flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-border/60" />
            <Users className="w-5 h-5 text-accent/40" />
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-border/60" />
          </div>

          <ScreenshotShowcase
            image={printClientes}
            title="Cérebro NatLeva — Inteligência de Clientes"
            badge="Score 0–100"
            description="Probabilidade de fechamento, Score NatLeva (5 pilares), risco de churn, LTV e ciclos de viagem. Saiba exatamente quem priorizar hoje e quem está pronto para a próxima."
            features={[
              "5 pilares: Valor, Lucro, Frequência, Engajamento, Indicação",
              "Memória de viagens por ciclo (client_trip_memory)",
              "Predição de churn baseada em comportamento real",
              "Recomendações de destinos personalizadas pela IA",
            ]}
            reverse
          />
        </div>
      </section>

      {/* ═══════════ IA CAPABILITIES GRID ═══════════ */}
      <section className="py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <span className="text-sm font-bold text-accent uppercase tracking-[0.2em]">Super-poderes da IA</span>
              <h2 className="text-4xl sm:text-5xl font-bold text-foreground mt-4 mb-5">
                Tudo que a Nath e o<br />Batalhão fazem por você
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Não é uma IA genérica — é um <strong className="text-foreground">batalhão treinado no seu negócio</strong>, com acesso aos seus dados reais e à internet ao vivo.
              </p>
            </div>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {iaCapabilities.map((cap, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="relative p-7 rounded-2xl border border-border/50 bg-card/50 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5 transition-all duration-500 group hover:-translate-y-1.5 overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl"
                    style={{ background: 'radial-gradient(circle, hsl(var(--accent) / 0.15), transparent 70%)' }} />
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5 group-hover:bg-accent/20 group-hover:scale-110 transition-all duration-300">
                      <cap.icon className="w-6 h-6 text-accent" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">{cap.label}</h3>
                    <p className="text-base text-muted-foreground leading-relaxed">{cap.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ COMPARISON TABLE ═══════════ */}
      <section className="py-28 px-6 bg-card/30 border-y border-border/30">
        <div className="max-w-4xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <span className="text-sm font-bold text-accent uppercase tracking-[0.2em]">Comparativo honesto</span>
              <h2 className="text-4xl sm:text-5xl font-bold text-foreground mt-4 mb-5">
                NatLeva vs. Soluções<br />tradicionais
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Veja o que está incluso na plataforma — sem custos extras ou integrações externas.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={100}>
            <div className="rounded-2xl border border-border/60 overflow-hidden bg-card">
              <div className="grid grid-cols-[1fr_auto_auto] gap-0">
                {/* Header */}
                <div className="px-6 py-4 bg-muted/50 border-b border-border/50 text-sm font-semibold text-muted-foreground">Funcionalidade</div>
                <div className="px-6 py-4 bg-accent/10 border-b border-accent/20 text-sm font-bold text-accent text-center min-w-[100px]">NatLeva</div>
                <div className="px-6 py-4 bg-muted/50 border-b border-border/50 text-sm font-semibold text-muted-foreground text-center min-w-[100px]">Outros</div>

                {comparisonItems.map((item, i) => (
                  <div key={i} className="contents">
                    <div className={cn("px-6 py-3.5 border-b border-border/30 text-sm text-foreground/80", i % 2 === 0 && "bg-muted/20")}>{item.feature}</div>
                    <div className={cn("px-6 py-3.5 border-b border-border/30 text-center", i % 2 === 0 && "bg-accent/[0.03]")}>
                      {item.natleva === true && <CheckCircle2 className="w-5 h-5 text-accent mx-auto" />}
                    </div>
                    <div className={cn("px-6 py-3.5 border-b border-border/30 text-center text-sm text-muted-foreground", i % 2 === 0 && "bg-muted/20")}>
                      {item.others === false ? <span className="text-destructive/60">✕</span> : <span className="text-warning-foreground/60">{item.others}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ MODULES ═══════════ */}
      <section id="modulos" className="py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <span className="text-sm font-bold text-accent uppercase tracking-[0.2em]">Ecossistema Completo</span>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mt-4 mb-5">
                13 módulos integrados,<br />uma plataforma viva
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Comercial, operacional, financeiro, IA e pós-venda — tudo conectado. Cada módulo elimina retrabalho e gera insights que aumentam sua receita.
              </p>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-2 gap-5">
            {modules.map((mod, i) => (
              <FadeIn key={i} delay={i * 70}>
                <div
                  onMouseEnter={() => setHoveredModule(i)}
                  onMouseLeave={() => setHoveredModule(null)}
                  className={cn(
                    "group relative p-7 sm:p-9 rounded-2xl border border-border/50 bg-gradient-to-br overflow-hidden",
                    mod.color,
                    "hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5 transition-all duration-500 hover:-translate-y-1"
                  )}
                >
                  <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl"
                    style={{ background: 'radial-gradient(circle, hsl(var(--accent) / 0.1), transparent 70%)' }} />
                  <div className="relative z-10 flex items-start gap-5">
                    <div className="shrink-0 w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 group-hover:scale-110 transition-all duration-300">
                      <mod.icon className="w-7 h-7 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">{mod.title}</h3>
                      <p className="text-base text-muted-foreground leading-relaxed mb-4">{mod.desc}</p>
                      <div className="flex flex-wrap gap-2">
                        {mod.features.map((f, fi) => (
                          <span key={fi} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-accent/10 text-accent border border-accent/10">
                            <CheckCircle2 className="w-3 h-3" /> {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ DIFFERENTIALS ═══════════ */}
      <section id="diferenciais" className="py-28 px-6 bg-card/30 border-y border-border/30">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <span className="text-sm font-bold text-accent uppercase tracking-[0.2em]">Por que somos diferentes</span>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mt-4 mb-5">
                Inteligência que nenhum<br />concorrente oferece
              </h2>
            </div>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {differentials.map((d, i) => (
              <FadeIn key={i} delay={i * 90}>
                <div className="relative p-7 rounded-2xl border border-border/50 bg-card/50 hover:border-accent/30 transition-all duration-500 group hover:-translate-y-1.5 overflow-hidden">
                  <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700 blur-2xl"
                    style={{ background: 'radial-gradient(circle, hsl(var(--accent) / 0.2), transparent 70%)' }} />
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5 group-hover:bg-accent/20 group-hover:scale-110 transition-all duration-300">
                      <d.icon className="w-6 h-6 text-accent" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3">{d.title}</h3>
                    <p className="text-base text-muted-foreground leading-relaxed">{d.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ AI HIGHLIGHT BENTO ═══════════ */}
      <section className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <div className="relative overflow-hidden rounded-3xl border border-accent/20 p-10 sm:p-14 md:p-20"
              style={{ background: 'linear-gradient(135deg, hsl(var(--accent) / 0.08), hsl(var(--accent) / 0.02))' }}>

              <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-15 blur-3xl"
                style={{ background: 'radial-gradient(circle, hsl(var(--accent) / 0.5), transparent 70%)' }} />
              <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-10 blur-3xl"
                style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.3), transparent 70%)' }} />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-8">
                  <Sparkles className="w-5 h-5 text-accent" />
                  <span className="text-xs font-bold text-accent uppercase tracking-[0.15em]">Exclusivo NatLeva</span>
                </div>

                <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
                  IA que vende, opera<br />e nunca dorme
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed mb-12">
                  A Nath é o batalhão de 21 agentes da NatLeva. Recepciona pelo WhatsApp, qualifica, monta proposta com capa cinematográfica do destino,
                  detecta o momento de compra e <strong className="text-foreground">cuida do cliente até o pós-viagem</strong>.
                </p>

                <div className="grid sm:grid-cols-3 gap-5">
                  {[
                    { icon: HeartPulse, label: "Detecção de momento de compra", sub: "Alertas em tempo real quando o cliente está pronto para fechar" },
                    { icon: Wand2, label: "Capa inteligente do destino", sub: "Fotos reais do Wikimedia ou geração cinematográfica por IA" },
                    { icon: Compass, label: "Portal do Viajante imersivo", sub: "Cliente vive a viagem em landing page editorial dedicada" },
                  ].map((item, i) => (
                    <div key={i} className="group p-6 rounded-xl bg-background/40 border border-border/40 hover:border-accent/30 transition-all duration-300 backdrop-blur-sm">
                      <item.icon className="w-9 h-9 text-accent mb-4 group-hover:scale-110 transition-transform" />
                      <h4 className="font-bold text-foreground text-lg mb-2">{item.label}</h4>
                      <p className="text-base text-muted-foreground">{item.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ SECURITY & TRUST ═══════════ */}
      <section className="py-20 px-6 bg-card/30 border-y border-border/30">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="flex flex-col md:flex-row items-center gap-10">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                  <span className="text-xs font-bold text-accent uppercase tracking-[0.15em]">Segurança</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                  Seus dados protegidos<br />com nível bancário
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Row Level Security em todas as tabelas, autenticação robusta, auditoria completa de ações
                  e roles granulares. Seus dados nunca saem da sua instância.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 shrink-0">
                {[
                  { icon: Lock, label: "RLS ativo" },
                  { icon: ShieldCheck, label: "Auditoria" },
                  { icon: Database, label: "Isolamento" },
                  { icon: Eye, label: "Logs completos" },
                ].map((item, i) => (
                  <div key={i} className="p-5 rounded-xl border border-border/50 bg-card/50 text-center">
                    <item.icon className="w-7 h-7 text-accent mx-auto mb-2" />
                    <span className="text-xs font-semibold text-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ RESULTS ═══════════ */}
      <section className="py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <span className="text-sm font-bold text-accent uppercase tracking-[0.2em]">Impacto real</span>
              <h2 className="text-4xl sm:text-5xl font-bold text-foreground mt-4 mb-5">Resultados que falam por si</h2>
              <p className="text-xl text-muted-foreground">Números reais de agências que já utilizam a plataforma.</p>
            </div>
          </FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { value: "85", suffix: "%", label: "Redução de retrabalho", icon: Clock },
              { value: "3", suffix: "x", label: "Mais produtividade", icon: Rocket },
              { value: "40", suffix: "%", label: "Aumento de margem", icon: TrendingUp },
              { value: "100", suffix: "%", label: "Dados centralizados", icon: Award },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="group text-center p-8 rounded-2xl border border-border/50 bg-card/50 hover:border-accent/30 hover:-translate-y-1 transition-all duration-300">
                  <item.icon className="w-10 h-10 text-accent mx-auto mb-4 group-hover:scale-110 transition-transform" />
                  <div className="text-4xl sm:text-5xl font-bold text-accent mb-2">
                    <AnimatedCounter target={item.value} suffix={item.suffix} />
                  </div>
                  <div className="text-sm text-muted-foreground">{item.label}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(hsl(var(--accent)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent)) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, hsl(var(--accent) / 0.4), transparent 70%)' }} />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <FadeIn>
            <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-10 border border-accent/20">
              <Rocket className="w-10 h-10 text-accent" />
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-8">
              Pronto para transformar<br />sua agência?
            </h2>
            <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
              Cada dia sem a ferramenta certa é receita perdida.
              <br />Comece agora e veja a diferença nos seus resultados.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/dashboard" className="group inline-flex items-center justify-center gap-3 px-12 py-6 rounded-2xl bg-accent text-accent-foreground font-bold text-xl shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:shadow-2xl hover:scale-105 transition-all duration-300">
                Acessar o Sistema <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </a>
              <a href="#prints" className="group inline-flex items-center justify-center gap-3 px-12 py-6 rounded-2xl border-2 border-border text-foreground font-bold text-lg hover:border-accent/50 hover:bg-accent/5 transition-all duration-300">
                <Eye className="w-5 h-5" /> Ver demonstração
              </a>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-12 px-6 bg-card/20">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoNatleva} alt="NatLeva" className="h-7 opacity-50" />
            <span className="text-xs text-muted-foreground/50 font-mono">v3.0 · Abr 2026</span>
          </div>
          <p className="text-sm text-muted-foreground/60">© {new Date().getFullYear()} NatLeva Viagens — Plataforma de Gestão Inteligente</p>
        </div>
      </footer>
    </div>
  );
}
