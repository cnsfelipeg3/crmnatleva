import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Plane, Users, Brain, Sparkles, DollarSign, MessageSquare,
  Users2, ClipboardCheck, Hotel, Shield, Target, BarChart3, Zap, GitBranch,
  BookOpen, Star, ArrowRight, CheckCircle2, TrendingUp, Clock, Rocket,
  ChevronDown, Play, Award, Globe, Lock, Cpu, PieChart, FileText, Eye,
  MousePointer, Mic, Search, Image as ImageIcon
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

/* ── Screenshot showcase component ── */
function ScreenshotShowcase({ image, title, description, features, reverse = false }: {
  image: string; title: string; description: string; features: string[]; reverse?: boolean;
}) {
  return (
    <FadeIn>
      <div className={cn("flex flex-col gap-8 items-center py-12", reverse ? "lg:flex-row-reverse" : "lg:flex-row")}>
        {/* Image */}
        <div className="flex-1 w-full lg:w-1/2">
          <div className="relative group">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-accent/30 to-primary/20 blur-lg opacity-40 group-hover:opacity-70 transition-opacity duration-500" />
            <div className="relative rounded-2xl overflow-hidden border border-border/60 shadow-2xl shadow-accent/10">
              <img src={image} alt={title} className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-700" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="flex-1 w-full lg:w-1/2 space-y-5">
          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight">{title}</h3>
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">{description}</p>
          <ul className="space-y-3">
            {features.map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-base sm:text-lg text-foreground/80">
                <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
                {f}
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
  { value: "31+", label: "Tabelas integradas" },
  { value: "100%", label: "Automação inteligente" },
  { value: "360°", label: "Visão do cliente" },
  { value: "24/7", label: "IA sempre ativa" },
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
  { icon: Mic, label: "Comando por voz", desc: "Fale com a IA usando microfone — ela entende e responde" },
  { icon: Search, label: "Busca web ao vivo", desc: "Pesquisa DuckDuckGo, Google, Wikipedia e Google News" },
  { icon: ImageIcon, label: "Geração de imagens", desc: "Crie banners e materiais promocionais direto no chat" },
  { icon: FileText, label: "PDF e Planilhas", desc: "Exporte análises completas em PDF ou Excel" },
  { icon: Eye, label: "Resumo IA em toda página", desc: "Gere relatórios executivos com 1 clique em qualquer tela" },
  { icon: MousePointer, label: "Sugestões inteligentes", desc: "A IA sugere ações baseadas no contexto dos seus dados" },
];

const testimonialPhrases = [
  { text: "Antes eu perdia horas cruzando planilhas. Agora tenho tudo num clique.", author: "Gerente Comercial" },
  { text: "A IA me avisa quando um cliente está em risco de churn. Isso mudou meu jogo.", author: "Diretor de Vendas" },
  { text: "O DRE automático me economiza 2 dias por mês de trabalho manual.", author: "Controller Financeiro" },
];

export default function ApresentacaoGeral() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActiveTestimonial(p => (p + 1) % testimonialPhrases.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ═══════════ HERO ═══════════ */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(hsl(160 60% 50% / 0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(160 60% 50% / 0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, hsl(160 60% 50% / 0.35), transparent 70%)' }} />

        <div className="relative z-10 text-center max-w-5xl mx-auto px-6">
          <FadeIn>
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-accent/30 bg-accent/5 mb-8">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-base font-medium text-accent">Plataforma Inteligente de Gestão para Agências</span>
            </div>
          </FadeIn>

          <FadeIn delay={100}>
            <h1 className="text-5xl sm:text-6xl md:text-8xl font-bold tracking-tight text-foreground leading-[1.08] mb-8">
              O sistema que{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">transforma dados</span>
                <span className="absolute -bottom-2 left-0 right-0 h-1 rounded-full bg-gradient-to-r from-accent to-primary opacity-60" />
              </span>
              <br />em decisões lucrativas
            </h1>
          </FadeIn>

          <FadeIn delay={200}>
            <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
              CRM, Financeiro, RH, Inteligência Artificial e Automação — tudo integrado numa única plataforma
              construída para agências de viagens que querem <strong className="text-foreground">escalar com inteligência</strong>.
            </p>
          </FadeIn>

          <FadeIn delay={300}>
            <div className="flex flex-wrap justify-center gap-5 mb-16">
              <a href="#prints" className="inline-flex items-center gap-2 px-10 py-5 rounded-xl bg-accent text-accent-foreground font-bold text-xl shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:scale-105 transition-all duration-300">
                Ver o Sistema <ArrowRight className="w-6 h-6" />
              </a>
              <a href="#diferenciais" className="inline-flex items-center gap-2 px-10 py-5 rounded-xl border-2 border-border text-foreground font-bold text-xl hover:border-accent/50 hover:bg-accent/5 transition-all duration-300">
                <Play className="w-5 h-5" /> Diferenciais
              </a>
            </div>
          </FadeIn>

          <FadeIn delay={400}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 max-w-4xl mx-auto">
              {stats.map((s, i) => (
                <div key={i} className="text-center p-5 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm">
                  <div className="text-3xl sm:text-4xl font-bold text-accent mb-1">{s.value}</div>
                  <div className="text-sm sm:text-base text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={500}>
            <div className="mt-14 animate-bounce">
              <ChevronDown className="w-7 h-7 text-muted-foreground mx-auto" />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ SOCIAL PROOF ═══════════ */}
      <section className="py-20 border-y border-border/50 bg-card/30">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <FadeIn>
            <div className="flex items-center justify-center gap-1 mb-5">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-6 h-6 fill-amber-400 text-amber-400" />)}
            </div>
            <p className="text-2xl sm:text-3xl italic text-foreground/80 min-h-[5rem] transition-all duration-500 leading-relaxed">
              "{testimonialPhrases[activeTestimonial].text}"
            </p>
            <p className="text-base text-accent font-semibold mt-4">— {testimonialPhrases[activeTestimonial].author}</p>
            <div className="flex justify-center gap-2 mt-6">
              {testimonialPhrases.map((_, i) => (
                <button key={i} onClick={() => setActiveTestimonial(i)}
                  className={cn("w-2.5 h-2.5 rounded-full transition-all", i === activeTestimonial ? "bg-accent w-8" : "bg-muted-foreground/30")} />
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════ PRINTS DO SISTEMA ═══════════ */}
      <section id="prints" className="py-24 sm:py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center mb-20">
              <span className="text-base font-semibold text-accent uppercase tracking-widest">Veja com seus próprios olhos</span>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mt-4 mb-5">
                Conheça o sistema<br />por dentro
              </h2>
              <p className="text-xl sm:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Cada tela foi projetada para entregar <strong className="text-foreground">clareza, velocidade e inteligência</strong>. 
                Veja como funciona na prática.
              </p>
            </div>
          </FadeIn>

          <ScreenshotShowcase
            image={printDashboard}
            title="Dashboard Estratégico — Sua Torre de Controle"
            description="Todas as métricas que importam, num único painel. Faturamento, lucro, margem, vendas por destino, ranking de vendedores e projeção de metas — tudo atualizado em tempo real."
            features={[
              "KPIs com variação percentual e tendência",
              "Gráficos de receita × custo × lucro mensal",
              "Heatmap de vendas por dia e horário",
              "Modo CEO com visão simplificada para diretoria",
            ]}
          />

          <div className="my-16 border-t border-border/30" />

          <ScreenshotShowcase
            image={printIntelligence}
            title="NatLeva Intelligence — Seu Consultor com IA"
            description="Pergunte qualquer coisa sobre seu negócio e receba análises profundas com dados reais. A IA acessa 31 tabelas do banco, faz pesquisa web em tempo real e gera planos de ação."
            features={[
              "Multi-modelo: Flash, Pro, Imagem, STT e TTS",
              "Busca web ao vivo (DuckDuckGo, Google, Wikipedia)",
              "Geração de imagens promocionais no chat",
              "Comando por voz — fale e ela responde",
            ]}
            reverse
          />

          <div className="my-16 border-t border-border/30" />

          <ScreenshotShowcase
            image={printFinanceiro}
            title="Financeiro Completo — Controle Total"
            description="Contas a pagar e receber, fluxo de caixa visual, cartões de crédito, DRE automática, fornecedores e simulador de taxas. Tudo num só lugar, sem planilhas."
            features={[
              "DRE (Demonstração de Resultado) automática",
              "Fluxo de caixa com previsão de saldo",
              "Gestão de cartões e parcelas",
              "Comissões calculadas automaticamente",
            ]}
          />

          <div className="my-16 border-t border-border/30" />

          <ScreenshotShowcase
            image={printClientes}
            title="Inteligência de Clientes — Conheça cada um"
            description="Score de fidelidade, risco de churn, LTV calculado e recomendações personalizadas. Saiba exatamente quem precisa de atenção e quem está pronto para comprar de novo."
            features={[
              "Scoring automático com algoritmo proprietário",
              "Predição de churn baseada em comportamento",
              "Histórico de viagens e padrão de gastos",
              "Recomendações de destinos e pacotes por IA",
            ]}
            reverse
          />
        </div>
      </section>

      {/* ═══════════ IA CAPABILITIES GRID ═══════════ */}
      <section className="py-24 px-6 bg-card/50 border-y border-border/50">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <span className="text-base font-semibold text-accent uppercase tracking-widest">Super-poderes da IA</span>
              <h2 className="text-4xl sm:text-5xl font-bold text-foreground mt-4 mb-5">
                Tudo o que a NatLeva<br />Intelligence faz por você
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Uma IA que não é genérica — ela <strong className="text-foreground">entende seu negócio</strong> porque tem acesso aos seus dados reais.
              </p>
            </div>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {iaCapabilities.map((cap, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className="p-7 rounded-2xl border border-border/60 bg-card hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300 group hover:-translate-y-1">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5 group-hover:bg-accent/20 group-hover:scale-110 transition-all">
                    <cap.icon className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{cap.label}</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">{cap.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ MODULES ═══════════ */}
      <section id="modulos" className="py-24 sm:py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <span className="text-base font-semibold text-accent uppercase tracking-widest">Ecossistema Completo</span>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mt-4 mb-5">
                Tudo o que você precisa,<br />num único lugar
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Cada módulo foi projetado para eliminar retrabalho, automatizar processos e gerar insights que aumentam sua receita.
              </p>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-2 gap-6">
            {modules.map((mod, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className={cn(
                  "group relative p-7 sm:p-9 rounded-2xl border border-border/60 bg-gradient-to-br",
                  mod.color,
                  "hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 transition-all duration-500 hover:-translate-y-1"
                )}>
                  <div className="flex items-start gap-5">
                    <div className="shrink-0 w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                      <mod.icon className="w-7 h-7 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-3">{mod.title}</h3>
                      <p className="text-base text-muted-foreground leading-relaxed mb-4">{mod.desc}</p>
                      <div className="flex flex-wrap gap-2">
                        {mod.features.map((f, fi) => (
                          <span key={fi} className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full bg-accent/10 text-accent">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {f}
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
      <section id="diferenciais" className="py-24 sm:py-32 px-6 bg-card/50 border-y border-border/50">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <span className="text-base font-semibold text-accent uppercase tracking-widest">Por que somos diferentes</span>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mt-4 mb-5">
                Inteligência que nenhum<br />concorrente oferece
              </h2>
            </div>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {differentials.map((d, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="relative p-7 rounded-2xl border border-border/60 bg-card hover:border-accent/30 transition-all duration-300 group hover:-translate-y-1">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <d.icon className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{d.title}</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">{d.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ AI HIGHLIGHT ═══════════ */}
      <section className="py-24 sm:py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <div className="relative overflow-hidden rounded-3xl border border-accent/20 p-10 sm:p-14 md:p-20"
              style={{ background: 'linear-gradient(135deg, hsl(160 60% 50% / 0.08), hsl(160 60% 50% / 0.02))' }}>

              <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-20"
                style={{ background: 'radial-gradient(circle, hsl(160 60% 50% / 0.4), transparent 70%)' }} />

              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-8">
                  <Sparkles className="w-5 h-5 text-accent" />
                  <span className="text-sm font-semibold text-accent uppercase tracking-wider">Exclusivo NatLeva</span>
                </div>

                <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
                  IA que entende<br />o seu negócio
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed mb-10">
                  Não é uma IA genérica. A NatLeva Intelligence tem acesso completo ao seu banco de dados,
                  entende seu contexto operacional e entrega <strong className="text-foreground">recomendações que realmente funcionam</strong>.
                </p>

                <div className="grid sm:grid-cols-3 gap-5">
                  {[
                    { icon: BarChart3, label: "Análise preditiva", sub: "Antecipe tendências antes dos concorrentes" },
                    { icon: FileText, label: "Relatórios automáticos", sub: "DRE, Fluxo de Caixa e KPIs sem esforço" },
                    { icon: PieChart, label: "Insights acionáveis", sub: "Cada dado vira uma decisão de lucro" },
                  ].map((item, i) => (
                    <div key={i} className="p-6 rounded-xl bg-background/50 border border-border/50">
                      <item.icon className="w-9 h-9 text-accent mb-4" />
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

      {/* ═══════════ RESULTS ═══════════ */}
      <section className="py-24 px-6 bg-card/50 border-y border-border/50">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="text-center mb-14">
              <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-5">Resultados que falam por si</h2>
              <p className="text-xl text-muted-foreground">Números reais de agências que já utilizam a plataforma.</p>
            </div>
          </FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: "85%", label: "Redução de retrabalho", icon: Clock },
              { value: "3x", label: "Mais produtividade", icon: Rocket },
              { value: "40%", label: "Aumento de margem", icon: TrendingUp },
              { value: "100%", label: "Dados centralizados", icon: Award },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="text-center p-8 rounded-2xl border border-border/50 bg-card">
                  <item.icon className="w-10 h-10 text-accent mx-auto mb-4" />
                  <div className="text-4xl sm:text-5xl font-bold text-accent mb-2">{item.value}</div>
                  <div className="text-base text-muted-foreground">{item.label}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section className="py-24 sm:py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <FadeIn>
            <Rocket className="w-14 h-14 text-accent mx-auto mb-8" />
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground mb-8">
              Pronto para transformar<br />sua agência?
            </h2>
            <p className="text-xl sm:text-2xl text-muted-foreground max-w-xl mx-auto mb-12 leading-relaxed">
              Cada dia sem a ferramenta certa é receita perdida.
              Comece agora e veja a diferença nos seus resultados.
            </p>
            <a href="/dashboard" className="inline-flex items-center gap-3 px-12 py-6 rounded-xl bg-accent text-accent-foreground font-bold text-xl shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:scale-105 transition-all duration-300">
              Acessar o Sistema <ArrowRight className="w-6 h-6" />
            </a>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src={logoNatleva} alt="NatLeva" className="h-7 opacity-60" />
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} NatLeva Viagens — Plataforma de Gestão Inteligente</p>
        </div>
      </footer>
    </div>
  );
}
