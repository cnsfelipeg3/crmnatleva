import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Crown, Sparkles, Flame, Clock, Target, Gift, TrendingUp, Award, Medal } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAffiliateProfile } from "@/components/vitrine/useAffiliateProfile";
import { useAffiliateStats } from "@/components/vitrine/useAffiliateStats";
import { useAffiliateLevels, resolveLevel } from "@/components/vitrine/useAffiliateLevel";
import JourneyTrack from "@/components/vitrine/JourneyTrack";
import { useEffect, useState, useMemo } from "react";
import { smartCapitalizeName } from "@/lib/nameUtils";
import { PrizeDetailDialog, type PrizeDetail } from "@/components/vitrine/PrizeDetailDialog";
import { toast } from "sonner";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const LEVEL_PRIZES = [
  {
    id: "prata",
    name: "Prata",
    emoji: "🥈",
    goal: 20000,
    pix: 200,
    bonus: 1,
    gradient: "from-slate-200 via-slate-100 to-slate-300",
    accent: "#94a3b8",
    image: "linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 50%, #94a3b8 100%)",
    perks: ["R$ 200 via PIX", "+1% comissão extra", "Selo Prata no perfil"],
  },
  {
    id: "ouro",
    name: "Ouro",
    emoji: "🥇",
    goal: 50000,
    pix: 500,
    bonus: 2,
    gradient: "from-amber-200 via-yellow-100 to-amber-300",
    accent: "#f59e0b",
    image: "linear-gradient(135deg, #fde68a 0%, #fbbf24 50%, #d97706 100%)",
    perks: ["R$ 500 via PIX", "+2% comissão extra", "Atendimento prioritário"],
  },
  {
    id: "diamante",
    name: "Diamante",
    emoji: "💎",
    goal: 120000,
    pix: 1500,
    bonus: 3,
    gradient: "from-cyan-200 via-sky-100 to-blue-300",
    accent: "#0ea5e9",
    image: "linear-gradient(135deg, #bae6fd 0%, #7dd3fc 50%, #0284c7 100%)",
    perks: ["R$ 1.500 via PIX", "+3% comissão extra", "Acesso VIP a campanhas"],
  },
  {
    id: "black",
    name: "Black",
    emoji: "👑",
    goal: 300000,
    pix: 0,
    bonus: 0,
    gradient: "from-zinc-800 via-zinc-900 to-black",
    accent: "#facc15",
    image: "linear-gradient(135deg, #18181b 0%, #000000 50%, #27272a 100%)",
    perks: [
      "Viagem nacional completa para 2",
      "Aéreo + hospedagem + passeios",
      "Convite para o Club Black anual",
    ],
    flagship: true,
  },
];

// Campanhas com tratamento cinematográfico · fotos reais, gatilhos psicológicos
const CAMPAIGNS = [
  {
    id: "dubai",
    name: "Operação Dubai",
    tagline: "Domine o deserto do luxo",
    description:
      "Cada venda pra Dubai te aproxima do smartphone que vai dizer, sem precisar falar, em que liga você joga.",
    goal: 150000,
    metric: "vendidos em Dubai",
    prize: "iPhone 18 Pro Titanium",
    prizeValue: "R$ 12.500",
    prizeImage:
      "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=80",
    heroImage:
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1800&q=80",
    videoUrl: "https://www.youtube.com/embed/gXlIAS-rs4M",
    gallery: [
      "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1546412414-e1885259563a?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1582672060674-bc2bd808a8f5?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1600&q=80",
    ],
    deadline: "2026-08-31",
    accent: "#f97316",
    accentDark: "#9a3412",
    competitors: 47,
    psychologyHook: "Apenas 1 leva o iPhone. Os outros 46 levam só a história.",
    powerLaw: "Lei 25 · Recrie-se: o aparelho que dita o seu próximo capítulo.",
    cta: "Quero esse iPhone",
    progress: 0.34,
    longDescription:
      "O iPhone 18 Pro Titanium não é só um celular · é um carimbo. Quem tira ele do bolso já entra na sala dizendo em qual nível joga. Acabamento em titânio aeroespacial, câmera com sensor de 1\" e a tela mais brilhante que a Apple já fez.\n\nNo dia que a Operação Dubai fechar, um único afiliado vai postar o unboxing. Os outros 46 vão dar like.",
    whatsIncluded: [
      "iPhone 18 Pro Titanium 256GB · lacrado",
      "Capa premium em couro Apple",
      "AirPods Pro 3 de brinde para o ganhador",
      "Carregador MagSafe e cabo Thunderbolt",
      "Entrega expressa em casa, com vídeo de unboxing oficial",
      "Post de divulgação no Instagram da NatLeva com o ganhador",
    ],
    experienceSteps: [
      { title: "1. Você vende Dubai", detail: "Cada pacote conta pontos pra sua escalada no ranking." },
      { title: "2. Ranking ao vivo", detail: "Acompanhe sua posição em tempo real no painel." },
      { title: "3. O top 1 ganha", detail: "No último dia, o nome do vencedor entra no grupo." },
      { title: "4. Unboxing em vídeo", detail: "Recebe em casa com cerimônia · e a Nath grava." },
    ],
    testimonials: [
      {
        name: "Ricardo M.",
        role: "Top 1 · Operação Maldivas 2025",
        quote:
          "Quando o iPhone chegou em casa, minha filha viu primeiro. Ela falou: 'pai, você é foda'. Vale cada venda.",
      },
      {
        name: "Juliana P.",
        role: "Afiliada Diamante",
        quote:
          "Eu nunca tinha vendido tanto Dubai. A campanha me forçou a estudar o destino e dobrei meu ticket médio.",
      },
    ],
  },
  {
    id: "europa",
    name: "Operação Europa",
    tagline: "R$ 5.000 em PIX direto na sua conta",
    description:
      "Vender Europa é vender sonho com carimbo. Cada pacote te aproxima de cinco mil reais pra fazer o que quiser, sem prestar conta a ninguém.",
    goal: 250000,
    metric: "vendidos na Europa",
    prize: "R$ 5.000 via PIX",
    prizeValue: "R$ 5.000",
    prizeImage:
      "https://images.unsplash.com/photo-1554260570-9140fd3b7614?auto=format&fit=crop&w=900&q=80",
    heroImage:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1800&q=80",
    videoUrl: "https://www.youtube.com/embed/AQ6GdjE2tyA",
    gallery: [
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1513581166391-887a96ddeafd?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1520939817895-060bdaf4fe1b?auto=format&fit=crop&w=1600&q=80",
    ],
    deadline: "2026-09-30",
    accent: "#8b5cf6",
    accentDark: "#4c1d95",
    competitors: 62,
    psychologyHook: "62 afiliados estão atrás dos mesmos R$ 5.000. Você quer mesmo ficar parado?",
    powerLaw: "Lei 28 · Entre em ação com ousadia: o titubeante perde o pix.",
    cta: "Quero os 5 mil",
    progress: 0.18,
    longDescription:
      "Cinco mil reais. Direto. Na sua conta. Sem desconto, sem promessa de bônus pra mês que vem, sem precisar trocar por produto. PIX no mesmo dia da apuração.\n\nO que você faz com 5k é problema seu · viagem, reforma, investir, pagar dívida, trocar de moto. A NatLeva só te entrega o cheque. O resto da história quem escreve é você.",
    whatsIncluded: [
      "R$ 5.000,00 via PIX no mesmo dia da apuração",
      "Comprovante oficial assinado pela NatLeva",
      "Post no Instagram da empresa anunciando o ganhador",
      "Convite vitalício pro grupo de afiliados Top Europa",
      "Certificado digital de Vendedor Destaque do trimestre",
    ],
    experienceSteps: [
      { title: "1. Foque em Europa", detail: "Toda venda Europa entra na contagem · sem exceções." },
      { title: "2. Apuração transparente", detail: "Ranking público, atualizado todo dia útil." },
      { title: "3. PIX direto", detail: "No primeiro dia útil após o encerramento." },
    ],
    testimonials: [
      {
        name: "Camila S.",
        role: "Top 1 · Operação Caribe 2025",
        quote:
          "Recebi os 5 mil num sábado de manhã. Comprei a passagem da minha mãe pra Portugal. Chorei.",
      },
      {
        name: "André L.",
        role: "Afiliado Ouro",
        quote:
          "PIX caiu, conferi 3 vezes. É real. Já tô na próxima campanha pra repetir a dose.",
      },
    ],
  },
  {
    id: "cruzeiros",
    name: "Operação Cruzeiros",
    tagline: "Top 3 embarcam · o resto assiste do porto",
    description:
      "Cabines de luxo, jantares assinados, paradas em três países. Só três vendedores cruzam essa rampa. O quarto colocado vai contar pros netos que quase foi.",
    goal: 0,
    metric: "Top 3 do ranking",
    prize: "Cruzeiro 7 noites · 2 pessoas",
    prizeValue: "R$ 28.000",
    prizeImage:
      "https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=900&q=80",
    heroImage:
      "https://images.unsplash.com/photo-1599992020148-c4c9b9bfe73e?auto=format&fit=crop&w=1800&q=80",
    videoUrl: "https://www.youtube.com/embed/CWuYqQTwjmI",
    gallery: [
      "https://images.unsplash.com/photo-1599992020148-c4c9b9bfe73e?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1566375638485-aa46497c2bce?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?auto=format&fit=crop&w=1600&q=80",
    ],
    deadline: "2026-12-31",
    accent: "#0ea5e9",
    accentDark: "#0c4a6e",
    competitors: 89,
    psychologyHook: "89 afiliados, 3 vagas no convés. A escassez aqui é cirúrgica.",
    powerLaw: "Lei 6 · Chame atenção a qualquer custo: o top 3 vira lenda interna.",
    cta: "Quero estar no convés",
    progress: 0.62,
    ranking: true,
    longDescription:
      "Sete noites num navio onde a comida é assinada por chef estrelado, o quarto tem varanda pro mar e a programação inclui ópera, casino e festa branca no convés. Três paradas em ilhas onde 90% dos brasileiros nunca vão pisar.\n\nVocê embarca com acompanhante. Tudo pago. Da escova de dente ao espumante de boas-vindas.",
    whatsIncluded: [
      "Cabine Premium Balcony pra 2 pessoas · 7 noites",
      "All inclusive: refeições, drinks e entretenimento a bordo",
      "Transfer privado porto-aeroporto nos dois sentidos",
      "Excursões guiadas em 3 destinos selecionados",
      "Jantar privativo com o capitão · noite branca",
      "Spa day em casal · 90 minutos de massagem",
      "Foto oficial emoldurada como cortesia",
    ],
    experienceSteps: [
      { title: "1. Suba no ranking", detail: "Cada venda multiplica · sazonalidade favorece quem vende cruise." },
      { title: "2. Top 3 garantido", detail: "Apuração no último dia do trimestre, ao vivo no grupo." },
      { title: "3. Embarque dos sonhos", detail: "Aéreo, transfer e cabine prontos · só leva a mala." },
      { title: "4. Volta ovacionado", detail: "Stories, foto oficial e o título de Cruise Master do ano." },
    ],
    testimonials: [
      {
        name: "Patrícia R.",
        role: "Top 2 · Cruzeiros 2024",
        quote:
          "Levei meu marido. Ele chorou no jantar com o capitão. A gente nunca tinha vivido nada parecido. Vale anos de trabalho.",
      },
    ],
  },
  {
    id: "copa",
    name: "Operação Copa do Mundo",
    tagline: "O maior vendedor leva o pacote do ano",
    description:
      "Estádio lotado, hino, gol, hospedagem premium, ingresso na mão. Não é prêmio de catálogo · é memória pra vida inteira. Só um leva.",
    goal: 0,
    metric: "Maior vendedor do período",
    prize: "Pacote Copa do Mundo 2026",
    prizeValue: "R$ 45.000",
    prizeImage:
      "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=900&q=80",
    heroImage:
      "https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=1800&q=80",
    videoUrl: "https://www.youtube.com/embed/4ZbCkOZGFhU",
    gallery: [
      "https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1540552965303-39b22a4cf09c?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=1600&q=80",
    ],
    deadline: "2026-05-31",
    accent: "#059669",
    accentDark: "#064e3b",
    competitors: 104,
    psychologyHook: "Copa do Mundo passa de 4 em 4 anos. Essa janela fecha em poucos dias.",
    powerLaw: "Lei 46 · Nunca pareça perfeito demais: o vencedor é humano, é você.",
    cta: "Quero a Copa",
    progress: 0.08,
    ranking: true,
    longDescription:
      "Um único afiliado vai estar dentro do estádio quando o Brasil entrar em campo na Copa 2026. Hotel 5 estrelas a 15 minutos da arena, ingresso na categoria mais premium, jantar oficial da delegação parceira.\n\nCopa do Mundo não se compra · se conquista. Daqui a 4 anos você vai querer ter essa história pra contar, ou vai querer ter visto pela tv?",
    whatsIncluded: [
      "Aéreo internacional ida e volta · classe executiva",
      "Ingresso categoria 1 pra jogo da seleção",
      "Hotel 5 estrelas · 5 noites com café incluído",
      "Transfer privado em todos os deslocamentos",
      "City tour gastronômico com guia exclusivo",
      "Camisa oficial da seleção autografada",
      "Cobertura fotográfica profissional · 100 fotos editadas",
    ],
    experienceSteps: [
      { title: "1. Domine o ranking", detail: "O maior vendedor do período leva · sem segundo lugar." },
      { title: "2. Apuração no jogo final", detail: "Anúncio ao vivo na live mensal de afiliados." },
      { title: "3. Embarque histórico", detail: "Documentação e roteiro entregues 60 dias antes." },
      { title: "4. Viva a Copa", detail: "Camisa, ingresso, estádio · e um vídeo de cortesia pra vida toda." },
    ],
    testimonials: [
      {
        name: "Fernando G.",
        role: "Top 1 · Eurocopa 2024",
        quote:
          "Eu vi o gol de placa de dentro do estádio. Tem coisa que dinheiro não compra · você precisa conquistar. E foi isso.",
      },
    ],
  },
];



function useCountdown(deadline: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const diff = new Date(deadline).getTime() - now;
  if (diff <= 0) return { days: 0, hours: 0, expired: true };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  return { days, hours, expired: false };
}

function Countdown({ deadline }: { deadline: string }) {
  const { days, hours, expired } = useCountdown(deadline);
  if (expired) return <span className="text-xs font-semibold text-rose-600">encerrada</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
      <Clock className="h-3 w-3" />
      {days}d {hours}h restantes
    </span>
  );
}

export default function VitrinePremiacoes() {
  const { data: affiliate } = useAffiliateProfile();
  const { data: stats } = useAffiliateStats(affiliate?.id);
  const { data: tiers = [] } = useAffiliateLevels();

  // Total vendido (sale_value somado)
  const { data: lifetimeRevenue = 0 } = useQuery({
    queryKey: ["affiliate-lifetime-revenue", affiliate?.id],
    enabled: !!affiliate?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("affiliate_commissions")
        .select("sale_value, status")
        .eq("affiliate_id", affiliate!.id);
      return (data || [])
        .filter((c: any) => c.status !== "canceled")
        .reduce((s: number, c: any) => s + Number(c.sale_value || 0), 0);
    },
  });

  const { data: ranking } = useQuery({
    queryKey: ["affiliate-monthly-ranking"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("affiliate_monthly_ranking", { p_month: null });
      if (error) throw error;
      return data || [];
    },
  });

  const closed = stats?.closedThisMonth ?? 0;
  const lifetime = stats?.totalEarned ?? 0;
  const lvl = tiers.length ? resolveLevel(tiers, closed, lifetime) : null;
  const myRankRow = ranking?.find((r: any) => r.affiliate_id === affiliate?.id);

  // ===== Modal de detalhamento do prêmio =====
  const [openPrize, setOpenPrize] = useState<PrizeDetail | null>(null);

  const buildCampaignDetail = (c: any): PrizeDetail => ({
    id: c.id,
    kind: "campaign",
    name: c.name,
    tagline: c.tagline,
    prize: c.prize,
    prizeValue: c.prizeValue,
    heroImage: c.heroImage,
    prizeImage: c.prizeImage,
    videoUrl: c.videoUrl,
    gallery: c.gallery,
    accent: c.accent,
    accentDark: c.accentDark,
    longDescription: c.longDescription,
    psychologyHook: c.psychologyHook,
    powerLaw: c.powerLaw,
    deadline: c.deadline,
    competitors: c.competitors,
    whatsIncluded: c.whatsIncluded,
    experienceSteps: c.experienceSteps,
    testimonials: c.testimonials,
    cta: c.cta,
    ranking: c.ranking,
  });

  const buildLevelDetail = (p: typeof LEVEL_PRIZES[number]): PrizeDetail => {
    const heroByLevel: Record<string, string> = {
      prata: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1800&q=80",
      ouro: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1800&q=80",
      diamante: "https://images.unsplash.com/photo-1515548212222-ab48aceaff58?auto=format&fit=crop&w=1800&q=80",
      black: "https://images.unsplash.com/photo-1542315192-1f61a1792f33?auto=format&fit=crop&w=1800&q=80",
    };
    const galleryByLevel: Record<string, string[]> = {
      prata: [
        "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1554260570-9140fd3b7614?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1600&q=80",
      ],
      ouro: [
        "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1606293459298-69e85c1bfe40?auto=format&fit=crop&w=1600&q=80",
      ],
      diamante: [
        "https://images.unsplash.com/photo-1515548212222-ab48aceaff58?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1602810316693-3667c854239a?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1605792657660-596af9009e82?auto=format&fit=crop&w=1600&q=80",
      ],
      black: [
        "https://images.unsplash.com/photo-1542315192-1f61a1792f33?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1551918120-9739cb430c6d?auto=format&fit=crop&w=1600&q=80",
      ],
    };
    return {
      id: p.id,
      kind: "level",
      name: `Nível ${p.name} ${p.emoji}`,
      tagline:
        p.id === "black"
          ? "O topo da pirâmide · onde só lendas chegam"
          : `Desbloqueie o nível ${p.name} e mude de patamar`,
      prize: p.flagship ? "Viagem nacional completa para 2" : `${p.pix ? `R$ ${p.pix.toLocaleString("pt-BR")} via PIX` : "Pacote exclusivo"} + benefícios`,
      prizeValue: p.flagship ? "R$ 8.000+" : p.pix ? `R$ ${p.pix.toLocaleString("pt-BR")}` : undefined,
      heroImage: heroByLevel[p.id] || heroByLevel.prata,
      prizeImage: heroByLevel[p.id],
      gallery: galleryByLevel[p.id] || [],
      accent: p.accent,
      accentDark: p.accent,
      longDescription:
        p.id === "black"
          ? "Esse não é um nível · é um clube. Quem chega ao Black entra numa lista que recebe convites, jantares, viagens e oportunidades que nunca aparecem em lugar nenhum. É a NatLeva por dentro. É o que ninguém posta."
          : `O nível ${p.name} é o que separa quem vende do que constrói carreira. Ao bater ${fmtBRL(p.goal)} em vendas, você desbloqueia bônus em dinheiro, comissão extra e status visível no painel de toda a equipe.`,
      whatsIncluded: [
        ...p.perks,
        "Selo permanente no seu perfil de afiliado",
        "Prioridade em campanhas e materiais novos",
        p.flagship ? "Convite anual pro Club Black off-line" : "Reconhecimento público na live mensal",
      ],
      experienceSteps: [
        { title: `1. Atinja ${fmtBRL(p.goal)}`, detail: "Em vendas acumuladas (lifetime)." },
        { title: "2. Liberação automática", detail: "O sistema detecta e a NatLeva entra em contato em 48h." },
        { title: "3. Receba o prêmio", detail: p.pix ? "PIX no mesmo dia." : "Pacote enviado em até 10 dias úteis." },
        { title: "4. Suba a próxima escada", detail: "Status e comissão extra valem pra sempre." },
      ],
      cta: `Quero o nível ${p.name}`,
    };
  };

  const handlePrimaryAction = (p: PrizeDetail) => {
    toast.success(`Bora! Foque em ${p.name} agora mesmo`, {
      description: "Use os materiais e a régua de divulgação na aba Materiais.",
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-12">
      <header className="space-y-1">
        <span className="text-[10px] uppercase tracking-[0.22em] text-amber-700 font-semibold">
          hall of fame · partners club
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl">Premiações</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Cada conquista vira história. A próxima já está te esperando · venda mais, suba de nível
          e leve para casa o que poucos conseguem.
        </p>
      </header>

      {/* ===================== BLOCO 1 · SUA JORNADA ===================== */}
      <section className="space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-amber-700 font-semibold">bloco 01</p>
          <h2 className="font-serif text-2xl mt-1">Sua jornada</h2>
        </div>
        {lvl && (
          <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-emerald-50/40 dark:to-emerald-500/5 p-6 sm:p-8 shadow-sm">
            <JourneyTrack
              tiers={tiers}
              currentId={lvl.current.id}
              nextId={lvl.next?.id || null}
              progress={lvl.progress}
              missingSales={lvl.missingSales}
              missingRevenue={lvl.missingRevenue}
            />
          </div>
        )}
      </section>

      {/* ===================== BLOCO 2 · PRÊMIOS DE NÍVEL ===================== */}
      <section className="space-y-4">
        <div className="flex items-end justify-between flex-wrap gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-amber-700 font-semibold">bloco 02</p>
            <h2 className="font-serif text-2xl mt-1">Prêmios de nível</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Cada degrau libera dinheiro, status e benefícios reais. Total vendido:{" "}
              <strong className="text-foreground">{fmtBRL(lifetimeRevenue)}</strong>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {LEVEL_PRIZES.map((p, i) => {
            const progress = Math.min(1, lifetimeRevenue / p.goal);
            const missing = Math.max(0, p.goal - lifetimeRevenue);
            const unlocked = lifetimeRevenue >= p.goal;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Card
                  onClick={() => setOpenPrize(buildLevelDetail(p))}
                  className={`relative overflow-hidden h-full border-2 transition-all hover:scale-[1.02] hover:shadow-2xl cursor-pointer ${
                    unlocked ? "border-emerald-500/60" : "border-border/60"
                  } ${p.flagship ? "lg:row-span-1" : ""}`}
                >
                  {/* Capa visual */}
                  <div className="h-32 relative overflow-hidden" style={{ background: p.image }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    <div className="absolute top-3 right-3">
                      {unlocked ? (
                        <Badge className="bg-emerald-600 text-white shadow-lg">
                          <Sparkles className="h-3 w-3 mr-1" /> Conquistado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-white/90 backdrop-blur text-[10px]">
                          {Math.round(progress * 100)}%
                        </Badge>
                      )}
                    </div>
                    <div className="absolute bottom-3 left-4 flex items-end gap-2">
                      <span className="text-5xl drop-shadow-lg">{p.emoji}</span>
                      <div className={`pb-1 ${p.flagship ? "text-white" : "text-zinc-900"}`}>
                        <p className="text-[10px] uppercase tracking-widest opacity-80">nível</p>
                        <p className="font-serif text-xl leading-none">{p.name}</p>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-4 space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">meta</p>
                      <p className="font-bold text-lg">{fmtBRL(p.goal)}</p>
                      <p className="text-[10px] text-muted-foreground">em vendas acumuladas</p>
                    </div>

                    <ul className="space-y-1.5 border-t border-border/40 pt-3">
                      {p.perks.map((perk, j) => (
                        <li key={j} className="flex gap-2 text-xs">
                          <Gift className="h-3 w-3 mt-0.5 shrink-0 text-amber-600" />
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-2">
                      <Progress value={progress * 100} className="h-2" />
                      <p className="text-[11px] mt-2 font-semibold">
                        {unlocked ? (
                          <span className="text-emerald-700">Prêmio liberado · fale com a NatLeva</span>
                        ) : (
                          <span className="text-amber-700">Faltam {fmtBRL(missing)}</span>
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ===================== BLOCO 3 · CAMPANHAS ATIVAS ===================== */}
      <section className="space-y-4">
        <div className="flex items-end justify-between flex-wrap gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-rose-600 font-semibold flex items-center gap-1.5">
              <Flame className="h-3 w-3" /> bloco 03 · ao vivo
            </p>
            <h2 className="font-serif text-2xl mt-1">Campanhas ativas</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Missões temporárias com prêmios físicos. Quem se mexe primeiro leva.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {CAMPAIGNS.map((c, i) => {
            const expired = new Date(c.deadline).getTime() < Date.now();
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
              >
                <Card className="group relative overflow-hidden h-full border-0 shadow-xl hover:shadow-2xl transition-all duration-500 rounded-3xl">
                  {/* ============ HERO CINEMATOGRÁFICO ============ */}
                  <div className="relative h-72 overflow-hidden">
                    <img
                      src={c.heroImage}
                      alt={c.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110"
                      loading="lazy"
                    />
                    {/* Vinheta */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
                    <div
                      className="absolute inset-0 mix-blend-overlay opacity-50"
                      style={{
                        background: `linear-gradient(135deg, ${c.accent}55 0%, transparent 60%)`,
                      }}
                    />

                    {/* Tag superior · ao vivo + countdown */}
                    <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-3 z-10">
                      <Badge className="bg-rose-500/95 text-white border-0 backdrop-blur-md shadow-lg gap-1.5 px-2.5 py-1">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                        </span>
                        AO VIVO
                      </Badge>
                      <div className="bg-black/55 backdrop-blur-md rounded-full px-3 py-1 text-white text-[11px] font-semibold flex items-center gap-1.5 border border-white/10">
                        <Clock className="h-3 w-3" />
                        <Countdown deadline={c.deadline} />
                      </div>
                    </div>

                    {/* Identidade + tagline */}
                    <div className="absolute bottom-5 left-5 right-5 text-white z-10">
                      <p
                        className="text-[10px] uppercase tracking-[0.3em] font-semibold mb-1.5 opacity-80"
                        style={{ color: c.accent === "#059669" ? "#86efac" : "#fde68a" }}
                      >
                        Campanha · {c.id}
                      </p>
                      <h3 className="font-serif text-3xl sm:text-4xl leading-[1.05] drop-shadow-lg">
                        {c.name}
                      </h3>
                      <p className="text-sm sm:text-base mt-2 opacity-90 max-w-md font-light italic">
                        {c.tagline}
                      </p>
                    </div>

                    {/* Mini galeria flutuante */}
                    <div className="absolute top-1/2 right-4 -translate-y-1/2 flex flex-col gap-1.5 z-10">
                      {c.gallery.slice(0, 3).map((g, idx) => (
                        <div
                          key={idx}
                          className="w-12 h-12 rounded-lg overflow-hidden border-2 border-white/30 shadow-lg backdrop-blur-sm hover:scale-110 transition-transform duration-300"
                          style={{ transform: `translateY(${idx * -2}px)` }}
                        >
                          <img src={g} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ============ CORPO ============ */}
                  <CardContent className="p-5 space-y-4 bg-card">
                    {/* Hook psicológico · escassez */}
                    <div
                      className="rounded-xl p-3 border-l-4 text-xs italic leading-relaxed"
                      style={{
                        borderColor: c.accent,
                        background: `linear-gradient(90deg, ${c.accent}10, transparent)`,
                      }}
                    >
                      <p className="font-medium text-foreground/90">"{c.psychologyHook}"</p>
                      <p
                        className="text-[10px] uppercase tracking-wider font-semibold mt-1.5 not-italic"
                        style={{ color: c.accent }}
                      >
                        {c.powerLaw}
                      </p>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed">{c.description}</p>

                    {/* PRÊMIO HERO · destaque visual com imagem */}
                    <div
                      className="relative rounded-2xl overflow-hidden border-2 shadow-md"
                      style={{ borderColor: `${c.accent}40` }}
                    >
                      <div className="grid grid-cols-[120px_1fr] gap-0">
                        <div className="relative h-32 bg-muted overflow-hidden">
                          <img
                            src={c.prizeImage}
                            alt={c.prize}
                            className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                            loading="lazy"
                          />
                        </div>
                        <div
                          className="p-3 flex flex-col justify-center"
                          style={{
                            background: `linear-gradient(135deg, ${c.accent}15, transparent)`,
                          }}
                        >
                          <p className="text-[10px] uppercase tracking-widest font-bold flex items-center gap-1"
                             style={{ color: c.accent }}>
                            <Trophy className="h-3 w-3" /> Seu prêmio
                          </p>
                          <p className="font-serif text-lg leading-tight mt-1">{c.prize}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Valor de mercado{" "}
                            <span className="font-bold text-foreground">{c.prizeValue}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Stats · prova social + competição */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-muted/40 p-2.5 text-center">
                        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
                          Concorrentes
                        </p>
                        <p className="font-bold text-lg mt-0.5">{c.competitors}</p>
                        <p className="text-[9px] text-muted-foreground">na disputa</p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-2.5 text-center">
                        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
                          Sua posição
                        </p>
                        <p className="font-bold text-lg mt-0.5" style={{ color: c.accent }}>
                          #{myRankRow?.rank ?? "—"}
                        </p>
                        <p className="text-[9px] text-muted-foreground">no ranking</p>
                      </div>
                      <div className="rounded-lg bg-muted/40 p-2.5 text-center">
                        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
                          {c.ranking ? "Top exigido" : "Meta"}
                        </p>
                        <p className="font-bold text-lg mt-0.5">
                          {c.ranking ? "Top 3" : `${Math.round(c.progress * 100)}%`}
                        </p>
                        <p className="text-[9px] text-muted-foreground">
                          {c.ranking ? "do ranking" : "atingido"}
                        </p>
                      </div>
                    </div>

                    {/* Barra de progresso com gradiente personalizado */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1.5">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Target className="h-2.5 w-2.5" />
                          {c.ranking ? "Sua posição" : "Progresso da meta"}
                        </span>
                        <span className="font-bold" style={{ color: c.accent }}>
                          {c.ranking
                            ? `#${myRankRow?.rank ?? "—"} de ${c.competitors}`
                            : `${fmtBRL(c.goal * c.progress)} / ${fmtBRL(c.goal)}`}
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${Math.round(c.progress * 100)}%`,
                            background: `linear-gradient(90deg, ${c.accent}, ${c.accentDark})`,
                            boxShadow: `0 0 12px ${c.accent}80`,
                          }}
                        />
                      </div>
                    </div>

                    {/* CTA dourado · Lei do desejo */}
                    {!expired && (
                      <button
                        type="button"
                        className="w-full rounded-full py-3 font-semibold text-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-xl flex items-center justify-center gap-2 group/btn"
                        style={{
                          background: `linear-gradient(135deg, ${c.accent}, ${c.accentDark})`,
                          color: "white",
                          boxShadow: `0 8px 24px -8px ${c.accent}80`,
                        }}
                      >
                        <Flame className="h-4 w-4 group-hover/btn:rotate-12 transition-transform" />
                        {c.cta}
                        <Sparkles className="h-3.5 w-3.5 opacity-80" />
                      </button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Manifesto psicológico abaixo das campanhas */}
        <div className="mt-6 rounded-2xl border border-amber-200/40 bg-gradient-to-r from-amber-50/60 via-card to-rose-50/40 dark:from-amber-500/5 dark:to-rose-500/5 p-5 flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 grid place-items-center shrink-0 shadow-lg">
            <Flame className="h-5 w-5 text-white" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-serif text-lg leading-tight">
              "Aquilo que poucos conseguem, todos desejam."
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Cada campanha tem 1, 2 ou 3 vencedores. Não é sobre vender muito · é sobre vender mais
              que os outros. Quem entra cedo, sai com o prêmio. Quem hesita, assiste pelo Instagram
              do colega.
            </p>
          </div>
        </div>
      </section>



      {/* ===================== BLOCO 4 · HALL DA FAMA ===================== */}
      <section className="space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-amber-700 font-semibold">bloco 04</p>
          <h2 className="font-serif text-2xl mt-1">Hall da fama</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Os nomes que estão fazendo história agora. Próximo a aparecer aqui pode ser o seu.
          </p>
        </div>

        {/* Destaques */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              title: "Top do mês",
              icon: Crown,
              gradient: "from-amber-400 to-yellow-600",
              name: smartCapitalizeName(ranking?.[0]?.full_name) || "Em disputa",
              detail: ranking?.[0] ? fmtBRL(Number(ranking[0].total_commission)) : "—",
            },
            {
              title: "Maior comissão",
              icon: TrendingUp,
              gradient: "from-emerald-500 to-teal-600",
              name: smartCapitalizeName(ranking?.[0]?.full_name) || "Em disputa",
              detail: ranking?.[0] ? fmtBRL(Number(ranking[0].total_commission)) : "—",
            },
            {
              title: "Maior crescimento",
              icon: Award,
              gradient: "from-violet-500 to-fuchsia-600",
              name: smartCapitalizeName(ranking?.[1]?.full_name) || "Em disputa",
              detail: ranking?.[1] ? `${ranking[1].sales_count} vendas` : "—",
            },
            {
              title: "Maior venda única",
              icon: Medal,
              gradient: "from-rose-500 to-pink-600",
              name: smartCapitalizeName(ranking?.[2]?.full_name) || "Em disputa",
              detail: ranking?.[2] ? fmtBRL(Number(ranking[2].total_revenue)) : "—",
            },
          ].map((d, i) => {
            const Icon = d.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card className="overflow-hidden border-2 border-border/60 hover:shadow-xl transition-all">
                  <div className={`h-1.5 bg-gradient-to-r ${d.gradient}`} />
                  <CardContent className="p-4">
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${d.gradient} grid place-items-center mb-2 shadow-md`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{d.title}</p>
                    <p className="font-semibold text-sm mt-1 truncate">{d.name}</p>
                    <p className="text-xs text-emerald-700 font-semibold mt-0.5">{d.detail}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Ranking nacional */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-600" /> Top vendedores · este mês
              </CardTitle>
              {myRankRow && (
                <Badge variant="outline" className="text-[10px]">
                  Sua posição · #{myRankRow.rank}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {ranking && ranking.length > 0 ? (
              <div className="divide-y">
                {ranking.slice(0, 10).map((row: any) => {
                  const isMe = row.affiliate_id === affiliate?.id;
                  const podium = row.rank <= 3;
                  return (
                    <div
                      key={row.affiliate_id}
                      className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                        isMe
                          ? "bg-gradient-to-r from-emerald-500/10 to-transparent"
                          : "hover:bg-muted/30"
                      }`}
                    >
                      <div
                        className={`h-9 w-9 rounded-full grid place-items-center font-bold text-xs shrink-0 ${
                          row.rank === 1
                            ? "bg-gradient-to-br from-amber-300 to-amber-500 text-emerald-950"
                            : row.rank === 2
                            ? "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800"
                            : row.rank === 3
                            ? "bg-gradient-to-br from-orange-300 to-orange-500 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {podium ? <Crown className="h-3.5 w-3.5" /> : `#${row.rank}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {smartCapitalizeName(row.full_name)}
                          {isMe && (
                            <span className="text-[10px] text-emerald-700 ml-1 font-semibold">
                              · você
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.sales_count} venda{row.sales_count === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-emerald-700">
                          {fmtBRL(Number(row.total_commission))}
                        </p>
                        <p className="text-[10px] text-muted-foreground">comissão</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-sm text-muted-foreground border-t border-dashed">
                <Trophy className="h-10 w-10 mx-auto mb-2 opacity-40" />
                Ranking começa assim que houver vendas fechadas neste mês.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
