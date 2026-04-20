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
  { value: "31+", label: "Tabelas integradas", icon: Database },
  { value: "100%", label: "Automação inteligente", icon: Zap },
  { value: "360°", label: "Visão do cliente", icon: Eye },
  { value: "24/7", label: "IA sempre ativa", icon: BotMessageSquare },
];

const modules = [
  {
    icon: LayoutDashboard, title: "Dashboard Estratégico", color: "from-emerald-500/20 to-emerald-600/5",
    desc: "Visão completa em tempo real: KPIs, funil de vendas, sazonalidade, análise de margem, ranking de vendedores e projeção de metas.",
    features: ["KPIs em tempo real", "Funil de conversão", "Heatmap de vendas", "Projeção de metas"],
  },
  {
    icon: Plane, title: "Gestão de Viagens", color: "from-blue-500/20 to-blue-600/5",
    desc: "Centro de operações com timeline visual de voos, check-in automatizado, hospedagens e gestão completa de passageiros.",
    features: ["Timeline de voos", "Check-in automático", "Gestão de hospedagem", "Perfil de passageiros"],
  },
  {
    icon: Brain, title: "Inteligência de Clientes", color: "from-purple-500/20 to-purple-600/5",
    desc: "Scoring avançado com LTV, risco de churn e fidelidade. Recomendações estratégicas personalizadas.",
    features: ["Score de fidelidade", "Predição de churn", "LTV calculado", "Recomendações IA"],
  },
  {
    icon: Sparkles, title: "NatLeva Intelligence", color: "from-amber-500/20 to-amber-600/5",
    desc: "Consultor estratégico com IA que acessa 31 tabelas, pesquisa na web em tempo real e gera insights acionáveis.",
    features: ["Acesso total ao banco", "Pesquisa web ao vivo", "Insights estratégicos", "Consultor 24/7"],
  },
  {
    icon: MessageSquare, title: "LiveChat WhatsApp", color: "from-green-500/20 to-green-600/5",
    desc: "Atendimento omnichannel com integração WhatsApp, automações inteligentes e análise de atendimento.",
    features: ["WhatsApp integrado", "Agentes de IA", "Base de conhecimento", "Análise de atendimento"],
  },
  {
    icon: DollarSign, title: "Financeiro Completo", color: "from-yellow-500/20 to-yellow-600/5",
    desc: "Contas a pagar/receber, fluxo de caixa, DRE automática, comissões e simulador de taxas.",
    features: ["Fluxo de caixa", "DRE automática", "Comissões", "Simulador de taxas"],
  },
  {
    icon: Users2, title: "RH & Pessoas", color: "from-rose-500/20 to-rose-600/5",
    desc: "Gestão completa de colaboradores: ponto, folha, metas, desempenho, feedbacks e clima do time.",
    features: ["Ponto eletrônico", "Metas & bônus", "Feedbacks 1:1", "Clima do time"],
  },
  {
    icon: Shield, title: "Admin & Segurança", color: "from-slate-500/20 to-slate-600/5",
    desc: "Controle granular de permissões, gestão de usuários, auditoria completa e configurações avançadas.",
    features: ["Controle de acesso", "Auditoria completa", "Roles granulares", "Configurações"],
  },
];

const differentials = [
  { icon: Cpu, title: "IA em cada página", desc: "Botão 'Resumo IA' gera análise executiva com plano de ação em qualquer tela do sistema." },
  { icon: Globe, title: "Pesquisa web em tempo real", desc: "NatLeva Intelligence busca eventos, tendências e informações atualizadas para suas recomendações." },
  { icon: Target, title: "Score de Saúde Empresarial", desc: "Indicador 0-100 que avalia margem, fluxo de caixa e pendências em tempo real." },
  { icon: TrendingUp, title: "Modo CEO", desc: "Interface simplificada com indicadores de crescimento, margem real e metas anuais." },
  { icon: Lock, title: "Segurança bancária", desc: "RLS em todas as tabelas, roles separadas, autenticação robusta e auditoria completa." },
  { icon: Zap, title: "Automação total", desc: "Fluxos visuais, agentes de IA, check-in automático e alertas inteligentes." },
];

const iaCapabilities = [
  { icon: Mic, label: "Comando por voz", desc: "Fale com a IA usando microfone — ela entende e responde em tempo real" },
  { icon: Search, label: "Busca web ao vivo", desc: "Pesquisa DuckDuckGo, Google, Wikipedia e Google News integrados" },
  { icon: ImageIcon, label: "Geração de imagens", desc: "Crie banners e materiais promocionais direto no chat com IA" },
  { icon: FileText, label: "PDF e Planilhas", desc: "Exporte análises completas em PDF ou Excel com formatação profissional" },
  { icon: Eye, label: "Resumo IA em toda página", desc: "Gere relatórios executivos com 1 clique em qualquer tela do sistema" },
  { icon: MousePointer, label: "Sugestões inteligentes", desc: "A IA sugere ações baseadas no contexto dos seus dados reais" },
];

const testimonialPhrases = [
  { text: "Antes eu perdia horas cruzando planilhas. Agora tenho tudo num clique.", author: "Gerente Comercial", role: "Agência Top Travel" },
  { text: "A IA me avisa quando um cliente está em risco de churn. Isso mudou meu jogo.", author: "Diretor de Vendas", role: "TravelMax Brasil" },
  { text: "O DRE automático me economiza 2 dias por mês de trabalho manual.", author: "Controller Financeiro", role: "Viagens Premium" },
  { text: "O check-in automático eliminou completamente os atrasos. Zero reclamação de cliente.", author: "Gerente de Operações", role: "Fly Experience" },
  { text: "Consigo ver em 10 segundos quais clientes preciso ligar hoje. Antes levava 1 hora.", author: "Consultora de Viagens", role: "Dream Trips" },
];

const processSteps = [
  { icon: Users, title: "Captura", desc: "Leads chegam por WhatsApp, site ou indicação e entram direto no funil do CRM", num: "01" },
  { icon: MessageSquare, title: "Atendimento", desc: "Chat integrado com IA sugere destinos, calcula preços e qualifica automaticamente", num: "02" },
  { icon: Plane, title: "Operação", desc: "Emissão de aéreos, hospedagens e serviços com controle financeiro por item", num: "03" },
  { icon: DollarSign, title: "Financeiro", desc: "Custos, receitas, comissões e DRE calculados automaticamente em tempo real", num: "04" },
  { icon: Brain, title: "Inteligência", desc: "IA analisa dados, identifica padrões e entrega recomendações acionáveis", num: "05" },
  { icon: RefreshCw, title: "Recompra", desc: "Score de fidelidade e alertas de churn garantem recorrência e crescimento", num: "06" },
];

const comparisonItems = [
  { feature: "CRM de viagens completo", natleva: true, others: "Parcial" },
  { feature: "IA com acesso a dados reais", natleva: true, others: false },
  { feature: "Financeiro integrado (DRE, Fluxo)", natleva: true, others: false },
  { feature: "Check-in automatizado", natleva: true, others: false },
  { feature: "Pesquisa web ao vivo na IA", natleva: true, others: false },
  { feature: "Gestão de RH e ponto", natleva: true, others: false },
  { feature: "Geração de imagens por IA", natleva: true, others: false },
  { feature: "Comando por voz", natleva: true, others: false },
  { feature: "Automação de fluxos visuais", natleva: true, others: "Parcial" },
  { feature: "Score de clientes e churn", natleva: true, others: false },
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
              CRM, Financeiro, RH, Inteligência Artificial e Automação —
              <br className="hidden sm:block" />
              tudo numa plataforma que{" "}
              <strong className="text-foreground">pensa junto com você</strong>.
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
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-center gap-8 text-muted-foreground/40 text-xs font-mono uppercase tracking-[0.25em]">
          <span>Amadeus</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
          <span>WhatsApp Business</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
          <span>Google AI</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/20 hidden sm:block" />
          <span className="hidden sm:inline">OpenAI</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/20 hidden md:block" />
          <span className="hidden md:inline">DuckDuckGo</span>
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
              <span className="text-sm font-bold text-accent uppercase tracking-[0.2em]">Fluxo inteligente</span>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mt-4 mb-5">
                Do lead à recompra<br />em 6 passos
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Cada etapa do ciclo de vendas é automatizada, monitorada e otimizada pela IA.
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
            title="Dashboard Estratégico"
            badge="Torre de Controle"
            description="Todas as métricas que importam, num único painel. Faturamento, lucro, margem, vendas por destino, ranking de vendedores e projeção de metas — tudo atualizado em tempo real."
            features={[
              "KPIs com variação percentual e tendência automática",
              "Gráficos de receita × custo × lucro mensal",
              "Heatmap de vendas por dia da semana e horário",
              "Modo CEO com visão simplificada para diretoria",
            ]}
          />

          <div className="my-20 flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-border/60" />
            <Sparkles className="w-5 h-5 text-accent/40" />
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-border/60" />
          </div>

          <ScreenshotShowcase
            image={printIntelligence}
            title="NatLeva Intelligence"
            badge="Consultor com IA"
            description="Pergunte qualquer coisa sobre seu negócio. A IA acessa 31 tabelas do banco, faz pesquisa web em tempo real e gera planos de ação personalizados."
            features={[
              "Multi-modelo: Flash, Pro, Imagem, Speech-to-Text",
              "Busca web ao vivo (DuckDuckGo, Google, Wikipedia)",
              "Geração de imagens promocionais direto no chat",
              "Comando por voz — fale e ela responde",
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
            description="Contas a pagar e receber, fluxo de caixa visual, cartões de crédito, DRE automática, fornecedores e simulador de taxas. Zero planilha."
            features={[
              "DRE (Demonstração de Resultado) 100% automática",
              "Fluxo de caixa com previsão inteligente de saldo",
              "Gestão de cartões, parcelas e taxas",
              "Comissões calculadas por regra personalizada",
            ]}
          />

          <div className="my-20 flex items-center gap-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-border/60" />
            <Users className="w-5 h-5 text-accent/40" />
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-border/60" />
          </div>

          <ScreenshotShowcase
            image={printClientes}
            title="Inteligência de Clientes"
            badge="Conheça cada um"
            description="Score de fidelidade, risco de churn, LTV calculado e recomendações personalizadas. Saiba exatamente quem precisa de atenção e quem está pronto para comprar."
            features={[
              "Scoring automático com algoritmo proprietário",
              "Predição de churn baseada em comportamento real",
              "Histórico completo de viagens e padrão de gastos",
              "Recomendações de destinos e pacotes por IA",
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
                Tudo o que a NatLeva<br />Intelligence faz por você
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Uma IA que não é genérica — ela <strong className="text-foreground">entende seu negócio</strong> porque tem acesso aos seus dados reais.
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
                8 módulos integrados,<br />uma plataforma
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Cada módulo elimina retrabalho, automatiza processos e gera insights que aumentam sua receita.
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
                  IA que entende<br />o seu negócio
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed mb-12">
                  Não é uma IA genérica. A NatLeva Intelligence tem acesso completo ao seu banco de dados,
                  entende seu contexto operacional e entrega <strong className="text-foreground">recomendações que realmente funcionam</strong>.
                </p>

                <div className="grid sm:grid-cols-3 gap-5">
                  {[
                    { icon: BarChart3, label: "Análise preditiva", sub: "Antecipe tendências antes dos concorrentes" },
                    { icon: Activity, label: "Monitoramento 24/7", sub: "Alertas automáticos sobre anomalias nos dados" },
                    { icon: PieChart, label: "Insights acionáveis", sub: "Cada dado vira uma decisão de lucro" },
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
            <span className="text-xs text-muted-foreground/50 font-mono">v2.0</span>
          </div>
          <p className="text-sm text-muted-foreground/60">© {new Date().getFullYear()} NatLeva Viagens — Plataforma de Gestão Inteligente</p>
        </div>
      </footer>
    </div>
  );
}
