import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Plane, Users, Brain, Sparkles, DollarSign, MessageSquare,
  Users2, ClipboardCheck, Hotel, Shield, Target, BarChart3, Zap, GitBranch,
  BookOpen, Star, ArrowRight, CheckCircle2, TrendingUp, Clock, Rocket,
  ChevronDown, Play, Award, Globe, Lock, Cpu, PieChart, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import logoNatleva from "@/assets/logo-natleva.png";

const useInView = (threshold = 0.15) => {
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

const stats = [
  { value: "31+", label: "Tabelas integradas" },
  { value: "100%", label: "Automação inteligente" },
  { value: "360°", label: "Visão do cliente" },
  { value: "24/7", label: "IA sempre ativa" },
];

const modules = [
  {
    icon: LayoutDashboard, title: "Dashboard Estratégico", color: "from-emerald-500/20 to-emerald-600/5",
    desc: "Visão completa em tempo real: KPIs, funil de vendas, sazonalidade, análise de margem, ranking de vendedores e projeção de metas. Tudo num único painel de controle.",
    features: ["KPIs em tempo real", "Funil de conversão", "Heatmap de vendas", "Projeção de metas"],
  },
  {
    icon: Plane, title: "Gestão de Viagens", color: "from-blue-500/20 to-blue-600/5",
    desc: "Centro de operações com timeline visual de voos, check-in automatizado, hospedagens e gestão completa de passageiros com perfil 360°.",
    features: ["Timeline de voos", "Check-in automático", "Gestão de hospedagem", "Perfil de passageiros"],
  },
  {
    icon: Brain, title: "Inteligência de Clientes", color: "from-purple-500/20 to-purple-600/5",
    desc: "Scoring avançado com LTV, risco de churn e fidelidade. Recomendações estratégicas personalizadas para cada cliente da sua carteira.",
    features: ["Score de fidelidade", "Predição de churn", "LTV calculado", "Recomendações IA"],
  },
  {
    icon: Sparkles, title: "NatLeva Intelligence", color: "from-amber-500/20 to-amber-600/5",
    desc: "Consultor estratégico com IA que acessa 31 tabelas do banco, pesquisa na web em tempo real e gera insights acionáveis para o seu negócio.",
    features: ["Acesso total ao banco", "Pesquisa web ao vivo", "Insights estratégicos", "Consultor 24/7"],
  },
  {
    icon: MessageSquare, title: "LiveChat WhatsApp", color: "from-green-500/20 to-green-600/5",
    desc: "Atendimento omnichannel com integração WhatsApp, automações inteligentes, base de conhecimento e análise de atendimento com IA.",
    features: ["WhatsApp integrado", "Agentes de IA", "Base de conhecimento", "Análise de atendimento"],
  },
  {
    icon: DollarSign, title: "Financeiro Completo", color: "from-yellow-500/20 to-yellow-600/5",
    desc: "Contas a pagar/receber, fluxo de caixa, cartões, fornecedores, comissões, DRE automática e simulador de taxas. Controle total.",
    features: ["Fluxo de caixa", "DRE automática", "Comissões", "Simulador de taxas"],
  },
  {
    icon: Users2, title: "RH & Pessoas", color: "from-rose-500/20 to-rose-600/5",
    desc: "Gestão completa de colaboradores: ponto, folha, metas, desempenho, feedbacks, advertências, clima do time e relatórios gerenciais.",
    features: ["Ponto eletrônico", "Metas & bônus", "Feedbacks 1:1", "Clima do time"],
  },
  {
    icon: Shield, title: "Admin & Segurança", color: "from-slate-500/20 to-slate-600/5",
    desc: "Controle granular de permissões por papel, gestão de usuários, auditoria completa e configurações avançadas do sistema.",
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

const testimonialPhrases = [
  "Antes eu perdia horas cruzando planilhas. Agora tenho tudo num clique.",
  "A IA me avisa quando um cliente está em risco de churn. Isso mudou meu jogo.",
  "O DRE automático me economiza 2 dias por mês de trabalho manual.",
];

export default function ApresentacaoGeral() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActiveTestimonial(p => (p + 1) % testimonialPhrases.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* HERO */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Animated grid background */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(hsl(160 60% 50% / 0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(160 60% 50% / 0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, hsl(160 60% 50% / 0.3), transparent 70%)' }} />
        
        <div className="relative z-10 text-center max-w-5xl mx-auto px-6">
          <FadeIn>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-accent/30 bg-accent/5 mb-8">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">Plataforma Inteligente de Gestão</span>
            </div>
          </FadeIn>
          
          <FadeIn delay={100}>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.1] mb-6">
              O sistema que{" "}
              <span className="relative">
                <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">transforma dados</span>
                <span className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full bg-gradient-to-r from-accent to-primary opacity-60" />
              </span>
              <br />em decisões lucrativas
            </h1>
          </FadeIn>
          
          <FadeIn delay={200}>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              CRM, Financeiro, RH, Inteligência Artificial e Automação — tudo integrado numa única plataforma 
              construída para agências de viagens que querem <strong className="text-foreground">escalar com inteligência</strong>.
            </p>
          </FadeIn>
          
          <FadeIn delay={300}>
            <div className="flex flex-wrap justify-center gap-4 mb-16">
              <a href="#modulos" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-accent text-accent-foreground font-semibold text-lg shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:scale-105 transition-all duration-300">
                Explorar Módulos <ArrowRight className="w-5 h-5" />
              </a>
              <a href="#diferenciais" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border-2 border-border text-foreground font-semibold text-lg hover:border-accent/50 hover:bg-accent/5 transition-all duration-300">
                <Play className="w-5 h-5" /> Ver Diferenciais
              </a>
            </div>
          </FadeIn>

          {/* Stats bar */}
          <FadeIn delay={400}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {stats.map((s, i) => (
                <div key={i} className="text-center p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
                  <div className="text-2xl sm:text-3xl font-bold text-accent mb-1">{s.value}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={500}>
            <div className="mt-12 animate-bounce">
              <ChevronDown className="w-6 h-6 text-muted-foreground mx-auto" />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="py-16 border-y border-border/50 bg-card/30">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <FadeIn>
            <div className="flex items-center justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
            </div>
            <p className="text-xl sm:text-2xl italic text-foreground/80 min-h-[4rem] transition-all duration-500">
              "{testimonialPhrases[activeTestimonial]}"
            </p>
            <div className="flex justify-center gap-2 mt-6">
              {testimonialPhrases.map((_, i) => (
                <button key={i} onClick={() => setActiveTestimonial(i)}
                  className={cn("w-2 h-2 rounded-full transition-all", i === activeTestimonial ? "bg-accent w-6" : "bg-muted-foreground/30")} />
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* MODULES */}
      <section id="modulos" className="py-20 sm:py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <span className="text-sm font-semibold text-accent uppercase tracking-widest">Ecossistema Completo</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mt-3 mb-4">
                Tudo o que você precisa,<br />num único lugar
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Cada módulo foi projetado para eliminar retrabalho, automatizar processos e gerar insights que aumentam sua receita.
              </p>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-2 gap-6">
            {modules.map((mod, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div className={cn(
                  "group relative p-6 sm:p-8 rounded-2xl border border-border/60 bg-gradient-to-br",
                  mod.color,
                  "hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5 transition-all duration-500 hover:-translate-y-1"
                )}>
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                      <mod.icon className="w-6 h-6 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2">{mod.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{mod.desc}</p>
                      <div className="flex flex-wrap gap-2">
                        {mod.features.map((f, fi) => (
                          <span key={fi} className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-accent/10 text-accent">
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

      {/* DIFFERENTIALS */}
      <section id="diferenciais" className="py-20 sm:py-28 px-6 bg-card/50 border-y border-border/50">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <span className="text-sm font-semibold text-accent uppercase tracking-widest">Por que somos diferentes</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mt-3 mb-4">
                Inteligência que nenhum<br />concorrente oferece
              </h2>
            </div>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {differentials.map((d, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="relative p-6 rounded-2xl border border-border/60 bg-card hover:border-accent/30 transition-all duration-300 group">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <d.icon className="w-5 h-5 text-accent" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{d.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{d.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* AI FEATURE HIGHLIGHT */}
      <section className="py-20 sm:py-28 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="relative overflow-hidden rounded-3xl border border-accent/20 p-8 sm:p-12 md:p-16"
              style={{ background: 'linear-gradient(135deg, hsl(160 60% 50% / 0.08), hsl(160 60% 50% / 0.02))' }}>
              
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20"
                style={{ background: 'radial-gradient(circle, hsl(160 60% 50% / 0.4), transparent 70%)' }} />
              
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-6">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span className="text-xs font-semibold text-accent uppercase tracking-wider">Exclusivo</span>
                </div>
                
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                  IA que entende o seu negócio
                </h2>
                <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed mb-8">
                  Não é uma IA genérica. A NatLeva Intelligence tem acesso completo ao seu banco de dados, 
                  entende seu contexto operacional e entrega <strong className="text-foreground">recomendações que realmente funcionam</strong>.
                </p>

                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { icon: BarChart3, label: "Análise preditiva", sub: "Antecipe tendências antes dos concorrentes" },
                    { icon: FileText, label: "Relatórios automáticos", sub: "DRE, Fluxo de Caixa e KPIs sem esforço" },
                    { icon: PieChart, label: "Insights acionáveis", sub: "Cada dado vira uma decisão de lucro" },
                  ].map((item, i) => (
                    <div key={i} className="p-4 rounded-xl bg-background/50 border border-border/50">
                      <item.icon className="w-8 h-8 text-accent mb-3" />
                      <h4 className="font-semibold text-foreground text-sm mb-1">{item.label}</h4>
                      <p className="text-xs text-muted-foreground">{item.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* NUMBERS / TRUST */}
      <section className="py-20 px-6 bg-card/50 border-y border-border/50">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Resultados que falam por si</h2>
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
                <div className="text-center p-6 rounded-2xl border border-border/50 bg-card">
                  <item.icon className="w-8 h-8 text-accent mx-auto mb-3" />
                  <div className="text-3xl sm:text-4xl font-bold text-accent mb-1">{item.value}</div>
                  <div className="text-sm text-muted-foreground">{item.label}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <FadeIn>
            <Rocket className="w-12 h-12 text-accent mx-auto mb-6" />
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6">
              Pronto para transformar<br />sua agência?
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
              Cada dia sem a ferramenta certa é receita perdida. 
              Comece agora e veja a diferença nos seus resultados.
            </p>
            <a href="/dashboard" className="inline-flex items-center gap-2 px-10 py-5 rounded-xl bg-accent text-accent-foreground font-bold text-lg shadow-lg shadow-accent/25 hover:shadow-accent/40 hover:scale-105 transition-all duration-300">
              Acessar o Sistema <ArrowRight className="w-5 h-5" />
            </a>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src={logoNatleva} alt="NatLeva" className="h-6 opacity-60" />
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} NatLeva Viagens — Plataforma de Gestão Inteligente</p>
        </div>
      </footer>
    </div>
  );
}
