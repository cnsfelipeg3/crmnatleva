import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  HelpCircle, X, Lightbulb, BookOpen, MousePointerClick,
  ArrowRight, MessageCircleQuestion, Compass, CheckCircle2,
  Layers, AlertTriangle, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface PanelHelp {
  title: string;
  subtitle?: string;
  description: string;
  features: string[];
  tips: string[];
  steps?: { title: string; detail: string }[];
  faq?: { q: string; a: string }[];
  warnings?: string[];
  relatedPanels?: { label: string; path: string }[];
  quickActions?: string[];
}

// ──────────────────────────────────────────────────────────
//  HELP DATABASE — detailed guides per panel
// ──────────────────────────────────────────────────────────

const PANEL_HELP: Record<string, PanelHelp> = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Painel de Business Intelligence",
    description:
      "Visão 360° de toda a operação da agência em tempo real. Aqui você encontra os KPIs mais importantes, gráficos interativos, rankings de vendedores, mapas de distribuição geográfica, heatmaps de sazonalidade e análise de margem por destino. É o ponto de partida para entender a saúde do negócio e tomar decisões estratégicas.",
    features: [
      "KPIs em tempo real com comparação automática de períodos (mês, trimestre, ano)",
      "Gráficos interativos com drill-down — clique em qualquer dado para explorar camadas mais profundas",
      "Heatmap de sazonalidade (estilo GitHub) cruzando dia da semana × mês para identificar padrões",
      "Ranking de vendedores com métricas de faturamento, ticket médio e conversão",
      "Análise de margem por destino para identificar os mais e menos rentáveis",
      "Mapa geográfico interativo mostrando a distribuição de clientes e destinos",
      "Funil de vendas visual com taxas de conversão entre cada etapa",
      "Filtros combinados por período, vendedor, destino, status e canal de origem",
    ],
    steps: [
      { title: "Selecione o período", detail: "Use os filtros no topo para definir o intervalo de datas que deseja analisar. Compare com o período anterior para identificar crescimento." },
      { title: "Analise os KPIs principais", detail: "Os cards no topo mostram faturamento, número de vendas, ticket médio e taxa de conversão. Setas verdes/vermelhas indicam variação vs período anterior." },
      { title: "Explore os gráficos", detail: "Clique em barras, fatias ou pontos nos gráficos para abrir detalhamentos. Por exemplo, clicar em um destino no gráfico de pizza abre as vendas daquele destino." },
      { title: "Use o mapa", detail: "O mapa mostra de onde vêm seus clientes. Zonas mais escuras indicam maior concentração. Clique em regiões para filtrar." },
      { title: "Revise o ranking", detail: "O ranking de vendedores mostra quem está performando melhor. Use para definir metas e bonificações." },
    ],
    faq: [
      { q: "Os dados são atualizados em tempo real?", a: "Sim, os KPIs e gráficos são atualizados automaticamente a cada vez que você acessa o dashboard ou recarrega a página." },
      { q: "Posso exportar os dados do dashboard?", a: "Sim, use o botão de exportação disponível em cada seção para baixar os dados em formato CSV ou PDF." },
      { q: "O que significa o heatmap de sazonalidade?", a: "É uma visualização que cruza o dia da semana com o mês do ano, mostrando em quais combinações você teve mais vendas. Útil para planejar promoções e ações." },
    ],
    warnings: [
      "Os dados refletem apenas vendas com status 'confirmada'. Vendas pendentes ou canceladas são excluídas dos KPIs principais.",
    ],
    tips: [
      "Clique em qualquer KPI para ver as vendas detalhadas por trás do número",
      "Use os filtros de período para comparar meses e identificar tendências sazonais",
      "O mapa mostra a distribuição geográfica — use para planejar ações regionais",
      "Compare o ranking de vendedores mês a mês para avaliar evolução",
      "O heatmap revela o melhor dia da semana para promoções por mês",
    ],
    relatedPanels: [
      { label: "Vendas", path: "/sales" },
      { label: "Inteligência de Clientes", path: "/inteligencia-clientes" },
      { label: "Financeiro", path: "/financeiro" },
    ],
    quickActions: [
      "Filtrar por período → topo da página",
      "Exportar relatório → botão no canto do gráfico",
      "Ver detalhes de KPI → clique no card",
    ],
  },

  "/sales/new": {
    title: "Nova Venda",
    subtitle: "Registro de venda completa",
    description:
      "Formulário completo para registro de uma nova venda. Preencha os dados do cliente, selecione passageiros, adicione voos, hospedagem, experiências e configure os valores e forma de pagamento. O sistema calcula automaticamente custos, margens e parcelas.",
    features: [
      "Autocomplete de clientes existentes com dados preenchidos automaticamente",
      "Adição de múltiplos passageiros com dados de documentos",
      "Registro de voos com busca por companhia aérea e aeroporto",
      "Inclusão de hotéis com datas de check-in/check-out e tipo de quarto",
      "Blocos de custo detalhados (aéreo, hotel, seguro, taxas, extras)",
      "Cálculo automático de valores, margens e parcelas",
      "Anexos de comprovantes e documentos",
    ],
    steps: [
      { title: "Selecione o cliente", detail: "Comece digitando o nome do cliente no campo de busca. Se for novo, clique em 'Novo Cliente' para cadastrar. Os dados de contato serão preenchidos automaticamente." },
      { title: "Adicione passageiros", detail: "Inclua todos os viajantes desta venda. Cada passageiro precisa de nome completo e, idealmente, documento de identidade e data de nascimento." },
      { title: "Configure os voos", detail: "Adicione cada trecho do voo: origem, destino, companhia aérea, número do voo, data e horário. O sistema busca logos e dados da cia aérea automaticamente." },
      { title: "Adicione hospedagem", detail: "Inclua os hotéis com datas de check-in/check-out, tipo de quarto e regime de alimentação. Você pode buscar hotéis pelo nome." },
      { title: "Preencha os custos", detail: "No bloco de custos, detalhe cada item: aéreo, hotel, seguro viagem, taxas, extras. O sistema calcula a margem automaticamente." },
      { title: "Defina pagamento", detail: "Configure a forma de pagamento, número de parcelas e datas de vencimento. O sistema gera as parcelas automaticamente." },
      { title: "Salve e confirme", detail: "Revise todos os dados e clique em 'Salvar'. A venda ficará como 'pendente' até ser confirmada." },
    ],
    faq: [
      { q: "Posso salvar uma venda incompleta?", a: "Sim, você pode salvar a qualquer momento e completar depois. Campos obrigatórios mínimos: cliente e pelo menos um valor." },
      { q: "Como adicionar um passageiro que não é o cliente?", a: "No bloco de passageiros, clique em 'Adicionar Passageiro' e preencha os dados. Não é necessário que o passageiro seja o titular da venda." },
      { q: "O que acontece se eu errar um dado?", a: "Você pode editar qualquer informação a qualquer momento acessando o detalhe da venda. Alterações são registradas no log de auditoria." },
    ],
    tips: [
      "Comece pelo cliente — os dados serão preenchidos automaticamente",
      "Você pode salvar a venda parcialmente e completar depois",
      "Use o autocomplete de aeroportos para evitar erros de digitação",
      "Revise os custos antes de salvar — a margem é calculada automaticamente",
    ],
    warnings: [
      "Certifique-se de que os dados dos passageiros estão corretos — erros em nomes podem causar problemas no check-in.",
      "Valores de custo impactam diretamente o cálculo de margem e comissões.",
    ],
    relatedPanels: [
      { label: "Vendas", path: "/sales" },
      { label: "Passageiros", path: "/passengers" },
      { label: "Contas a Receber", path: "/financeiro/receber" },
    ],
  },

  "/sales": {
    title: "Vendas",
    subtitle: "Central de gestão de vendas",
    description:
      "Visualize, filtre e gerencie todas as vendas da agência. Esta tela mostra a lista completa de vendas com informações resumidas, status visual por cores e acesso rápido ao detalhe de cada uma. Use os filtros para encontrar vendas específicas por cliente, destino, período ou status.",
    features: [
      "Lista completa de vendas com busca por nome do cliente, destino ou código",
      "Filtros avançados por status (pendente, confirmada, cancelada), período e vendedor",
      "Status visual por cores para identificação rápida",
      "Ordenação por data, valor ou cliente",
      "Acesso direto ao detalhe clicando na venda",
      "Botão de nova venda no topo",
    ],
    steps: [
      { title: "Busque ou filtre", detail: "Use a barra de busca para encontrar por nome ou destino, ou os filtros para refinar por status e período." },
      { title: "Clique para detalhar", detail: "Clique em qualquer venda para abrir o painel completo com voos, hospedagem, passageiros, pagamentos e timeline." },
      { title: "Crie nova venda", detail: "Use o botão '+ Nova Venda' no topo direito para iniciar o registro de uma venda." },
    ],
    tips: [
      "Use a busca para encontrar vendas por nome do cliente, destino ou ID",
      "Clique em uma venda para ver todos os detalhes completos",
      "Filtre por 'pendentes' para focar no que precisa de ação",
    ],
    relatedPanels: [
      { label: "Nova Venda", path: "/sales/new" },
      { label: "Dashboard", path: "/dashboard" },
      { label: "Contas a Receber", path: "/financeiro/receber" },
    ],
  },

  "/viagens": {
    title: "Viagens",
    subtitle: "Gestão de roteiros e viagens",
    description:
      "Visão consolidada de todas as viagens em andamento, futuras e concluídas. Cada viagem agrega voos, hospedagens, experiências e passageiros em um único roteiro visual. Use o mapa de rotas para visualizar os trajetos e a timeline para acompanhar cada etapa.",
    features: [
      "Timeline visual de todas as viagens com indicadores de status",
      "Detalhamento do roteiro completo dia a dia",
      "Mapa interativo de rotas aéreas e terrestres",
      "Status em tempo real de cada etapa (confirmado, pendente, alterado)",
      "Vinculação com check-in, hospedagem e experiências",
    ],
    steps: [
      { title: "Visualize as viagens", detail: "A lista mostra viagens organizadas por data. As em andamento aparecem primeiro, seguidas pelas futuras e concluídas." },
      { title: "Abra o detalhe", detail: "Clique em uma viagem para ver o roteiro completo: voos, hotéis, experiências e documentos." },
      { title: "Acompanhe no mapa", detail: "Use a visualização de mapa para ver as rotas e destinos em um globo interativo." },
    ],
    tips: [
      "Use a visualização de mapa para ter uma visão geográfica das viagens",
      "Clique em uma viagem para acessar o roteiro dia a dia",
      "Viagens com alertas (ícone amarelo) precisam de atenção",
    ],
    relatedPanels: [
      { label: "Check-in", path: "/checkin" },
      { label: "Hospedagem", path: "/hospedagem" },
      { label: "Alterações", path: "/alteracoes" },
    ],
  },

  "/checkin": {
    title: "Check-in",
    subtitle: "Gestão centralizada de check-ins",
    description:
      "Nunca perca uma janela de check-in. Este painel organiza todas as tarefas de check-in dos clientes por urgência, mostrando quando cada janela abre e fecha. Inclui links diretos para o check-in de cada companhia aérea e registro de confirmações.",
    features: [
      "Lista de check-ins pendentes ordenada por urgência (vermelho = urgente)",
      "Alertas automáticos quando a janela de check-in abre",
      "Links diretos para o site/app de check-in de cada cia aérea",
      "Registro de assento selecionado e evidências (print/email)",
      "Status: pendente → em andamento → concluído",
      "Filtros por data, cia aérea e responsável",
    ],
    steps: [
      { title: "Verifique os urgentes", detail: "Check-ins em vermelho estão com janela aberta e precisam ser feitos agora. Priorize sempre os vermelhos." },
      { title: "Acesse o link de check-in", detail: "Clique no botão da cia aérea para abrir o site de check-in em nova aba. Use os dados do passageiro para completar." },
      { title: "Selecione o assento", detail: "Após o check-in, registre o assento selecionado no campo correspondente para referência do cliente." },
      { title: "Anexe evidência", detail: "Faça um print do cartão de embarque ou salve o email de confirmação e anexe como evidência." },
      { title: "Marque como concluído", detail: "Após completar, mude o status para 'Concluído'. O cliente será notificado automaticamente se estiver no portal." },
    ],
    faq: [
      { q: "Quando a janela de check-in abre?", a: "Varia por companhia aérea. Geralmente 48h antes (nacionais) ou 24h antes (internacionais). O sistema calcula automaticamente com base nas regras de cada cia." },
      { q: "E se eu perder a janela?", a: "O check-in ficará marcado como 'expirado'. Será necessário fazer no aeroporto. Registre uma nota explicando a situação." },
    ],
    tips: [
      "Os check-ins são ordenados por prioridade — foque nos vermelhos primeiro",
      "Registre o assento selecionado para referência do cliente",
      "Monitore diariamente pela manhã para não perder janelas",
    ],
    warnings: [
      "Check-ins expirados podem gerar cobrança extra no aeroporto para algumas cias.",
    ],
    relatedPanels: [
      { label: "Viagens", path: "/viagens" },
      { label: "Passageiros", path: "/passengers" },
    ],
  },

  "/hospedagem": {
    title: "Hospedagem",
    subtitle: "Gestão de reservas hoteleiras",
    description:
      "Central de gestão de reservas de hospedagem. Visualize todas as reservas ativas, confirme detalhes com fornecedores, verifique datas de check-in/check-out e compartilhe galerias de fotos com clientes.",
    features: [
      "Lista de todas as reservas de hotel ativas e futuras",
      "Detalhes de check-in/check-out, tipo de quarto e regime",
      "Status de confirmação com fornecedor (pendente, confirmado, alterado)",
      "Galeria de fotos dos hotéis classificadas por área",
      "Horários de check-in/check-out pré-preenchidos por hotel",
    ],
    steps: [
      { title: "Revise as reservas", detail: "Verifique as reservas pendentes de confirmação e entre em contato com o fornecedor se necessário." },
      { title: "Confirme detalhes", detail: "Atualize o status para 'Confirmado' após receber a confirmação do hotel. Registre o número da reserva." },
      { title: "Compartilhe fotos", detail: "Use a galeria de fotos para montar uma apresentação visual para o cliente sobre o hotel." },
    ],
    tips: [
      "Verifique as políticas de cancelamento antes de confirmar alterações",
      "A galeria de fotos pode ser compartilhada com o cliente via proposta",
      "Mantenha os números de reserva atualizados para facilitar check-in",
    ],
    relatedPanels: [
      { label: "Viagens", path: "/viagens" },
      { label: "Mídias", path: "/midias" },
    ],
  },

  "/passengers": {
    title: "Passageiros",
    subtitle: "Cadastro e gestão de viajantes",
    description:
      "Cadastro completo de todos os passageiros da agência. Cada passageiro tem um perfil com dados pessoais, documentos (passaporte, visto, vacinas), preferências de viagem e histórico completo de todas as viagens realizadas.",
    features: [
      "Lista com busca por nome, documento, email ou telefone",
      "Perfil detalhado com foto, dados pessoais e preferências",
      "Gestão de documentos: passaporte, visto, vacinas com alertas de vencimento",
      "Preferências de viagem: assento, refeição, cia aérea favorita",
      "Histórico completo de todas as viagens realizadas",
      "Programas de fidelidade vinculados",
    ],
    steps: [
      { title: "Busque o passageiro", detail: "Use a barra de busca para encontrar por nome, CPF ou email. Se não existir, clique em 'Novo Passageiro'." },
      { title: "Revise os documentos", detail: "Verifique se passaporte, vistos e vacinas estão dentro da validade. Documentos vencendo em 6 meses recebem alerta." },
      { title: "Atualize preferências", detail: "Registre preferências de assento, refeição e necessidades especiais para agilizar reservas futuras." },
    ],
    tips: [
      "Mantenha os documentos atualizados para evitar problemas no embarque",
      "O perfil do passageiro mostra automaticamente todas as viagens realizadas",
      "Registre programas de fidelidade para acumular milhas corretamente",
    ],
    warnings: [
      "Passaportes precisam ter ao menos 6 meses de validade para viagens internacionais.",
      "Verifique exigências de visto ANTES de emitir passagens.",
    ],
    relatedPanels: [
      { label: "Vendas", path: "/sales" },
      { label: "Check-in", path: "/checkin" },
    ],
  },

  "/inteligencia-clientes": {
    title: "Inteligência de Clientes",
    subtitle: "Scoring e análise de base",
    description:
      "Visão estratégica da sua base de clientes com scoring automático, segmentação por perfil de viagem, recomendações de destinos por IA e timeline completa de interações. Use para identificar clientes VIP, inativos em risco e oportunidades de upsell.",
    features: [
      "Score de cada cliente (0-100) baseado em histórico, frequência e ticket médio",
      "Segmentação automática: VIP, Recorrente, Potencial, Novo, Inativo",
      "Recomendações de destinos baseadas em preferências e viagens anteriores",
      "Timeline completa de interações: vendas, conversas, propostas, viagens",
      "Mapa de distribuição geográfica dos clientes",
      "Alertas de clientes em risco de churn (sem atividade recente)",
    ],
    steps: [
      { title: "Explore os segmentos", detail: "Use os filtros de segmento (VIP, Recorrente, etc.) para focar em grupos específicos de clientes." },
      { title: "Analise o perfil", detail: "Clique em um cliente para ver o score, timeline de interações e recomendações de destinos." },
      { title: "Identifique oportunidades", detail: "Clientes com score alto e sem viagem recente são oportunidades de reativação. Use as recomendações de destino para abordagem." },
      { title: "Planeje ações", detail: "Com base na análise, crie propostas personalizadas ou envie mensagens via WhatsApp diretamente do perfil." },
    ],
    faq: [
      { q: "Como o score do cliente é calculado?", a: "O score leva em conta: número de viagens, valor total gasto, frequência de compra, tempo desde última viagem, engajamento com propostas e interações no WhatsApp." },
      { q: "Posso alterar a segmentação manualmente?", a: "A segmentação é automática, mas você pode adicionar tags personalizadas para criar seus próprios grupos." },
    ],
    tips: [
      "Clique em um cliente para ver seu perfil completo com timeline de todas as interações",
      "Use os filtros de segmento para campanhas direcionadas",
      "Clientes 'Inativos' há mais de 12 meses são candidatos a reativação",
      "As recomendações de IA consideram perfil de viagem e sazonalidade",
    ],
    relatedPanels: [
      { label: "Dashboard", path: "/dashboard" },
      { label: "NatLeva Intelligence", path: "/natleva-intelligence" },
      { label: "Aniversariantes", path: "/birthdays" },
    ],
  },

  "/natleva-intelligence": {
    title: "NatLeva Intelligence",
    subtitle: "Insights de IA operacional",
    description:
      "Painel de inteligência artificial que analisa toda a operação e gera insights acionáveis. A IA identifica padrões de vendas, oportunidades de melhoria, alertas de risco e recomendações estratégicas baseadas nos dados reais da agência.",
    features: [
      "Insights gerados automaticamente pela IA a cada ciclo de análise",
      "Alertas de oportunidades: clientes para reativar, destinos em alta, sazonalidade",
      "Alertas de riscos: queda de vendas, fornecedores com problemas, pendências acumuladas",
      "Recomendações de ações práticas com impacto estimado",
      "Histórico de insights anteriores para acompanhamento",
    ],
    steps: [
      { title: "Revise os insights", detail: "Os insights são organizados por relevância. Os mais urgentes aparecem primeiro com badges vermelhos." },
      { title: "Leia o detalhe", detail: "Clique em um insight para ver a análise completa, dados de suporte e ação recomendada." },
      { title: "Execute a ação", detail: "Cada insight sugere uma ação concreta. Use os links diretos para navegar ao painel relevante." },
    ],
    tips: [
      "Revise os insights diariamente para tomar decisões proativas",
      "Insights com badge 'alta confiança' são baseados em dados sólidos",
      "Use os insights para embasar reuniões de equipe e planejamento",
    ],
    relatedPanels: [
      { label: "Dashboard", path: "/dashboard" },
      { label: "Inteligência de Clientes", path: "/inteligencia-clientes" },
      { label: "Cérebro NatLeva", path: "/implementacao/cerebro-natleva" },
    ],
  },

  "/birthdays": {
    title: "Aniversariantes",
    subtitle: "Relacionamento e datas especiais",
    description:
      "Calendário completo de aniversários de clientes e passageiros. Use para ações de relacionamento como mensagens personalizadas, ofertas especiais e propostas temáticas. O sistema alerta automaticamente sobre aniversários próximos.",
    features: [
      "Lista de aniversariantes do dia, semana e mês",
      "Calendário visual com destaques de datas",
      "Ações rápidas: enviar mensagem WhatsApp, criar proposta especial",
      "Integração com histórico de viagens do cliente",
    ],
    steps: [
      { title: "Verifique os aniversariantes de hoje", detail: "A seção do topo mostra quem faz aniversário hoje. Envie uma mensagem personalizada!" },
      { title: "Planeje a semana", detail: "Use a visão semanal para se preparar com antecedência e criar propostas especiais." },
      { title: "Envie mensagem", detail: "Clique no ícone de WhatsApp para enviar uma mensagem de felicitação personalizada." },
    ],
    tips: [
      "Aproveite aniversários para enviar propostas personalizadas com condições especiais",
      "Configure lembretes automáticos para não perder nenhuma data importante",
      "Clientes VIP merecem atenção especial em seus aniversários",
    ],
    relatedPanels: [
      { label: "Inteligência de Clientes", path: "/inteligencia-clientes" },
      { label: "Propostas", path: "/propostas" },
    ],
  },

  "/pendencias": {
    title: "Pendências",
    subtitle: "Tarefas e ações necessárias",
    description:
      "Central de todas as tarefas pendentes na agência. Aqui você vê tudo que precisa de atenção: documentos faltantes, pagamentos pendentes, confirmações de hotel, check-ins próximos e qualquer ação necessária organizada por prioridade e prazo.",
    features: [
      "Tarefas organizadas por prioridade (urgente, alta, média, baixa) e prazo",
      "Filtros por tipo (documento, pagamento, confirmação), responsável e status",
      "Vinculação automática com vendas, viagens e clientes",
      "Notificações de prazos próximos com contagem regressiva",
      "Atribuição de responsável para cada pendência",
    ],
    steps: [
      { title: "Filtre por urgência", detail: "Comece pelos itens urgentes (vermelho). Estes têm prazo vencido ou vencendo hoje." },
      { title: "Resolva e marque", detail: "Para cada pendência, execute a ação necessária e marque como concluída." },
      { title: "Delegue se preciso", detail: "Atribua pendências a outros membros da equipe usando o campo de responsável." },
    ],
    tips: [
      "Revise as pendências diariamente logo pela manhã",
      "Use os filtros para focar em um tipo específico de tarefa",
      "Pendências vencidas impactam negativamente o score de atendimento",
    ],
    relatedPanels: [
      { label: "Check-in", path: "/checkin" },
      { label: "Vendas", path: "/sales" },
    ],
  },

  "/cotacoes": {
    title: "Cotações do Portal",
    subtitle: "Solicitações de orçamento dos clientes",
    description:
      "Receba e gerencie solicitações de cotação enviadas pelos clientes através do Portal do Viajante. Cada cotação contém destino desejado, datas, número de viajantes e preferências. Use para criar propostas personalizadas.",
    features: [
      "Lista de cotações recebidas com detalhes do pedido",
      "Status de cada cotação: nova, em análise, respondida",
      "Dados completos: destino, datas, passageiros, preferências",
      "Ação rápida para criar proposta a partir da cotação",
    ],
    steps: [
      { title: "Verifique novas cotações", detail: "Cotações com badge 'Nova' acabaram de chegar e precisam de atenção." },
      { title: "Analise o pedido", detail: "Leia os detalhes da cotação: destino, datas, número de viajantes e preferências especiais." },
      { title: "Crie a proposta", detail: "Clique em 'Criar Proposta' para gerar uma proposta comercial com base nos dados da cotação." },
      { title: "Responda o cliente", detail: "Após criar a proposta, envie pelo WhatsApp ou email diretamente ao cliente." },
    ],
    tips: [
      "Responda cotações em até 2 horas para melhor taxa de conversão",
      "Use os dados de preferência para personalizar a proposta",
    ],
    relatedPanels: [
      { label: "Propostas", path: "/propostas" },
      { label: "Portal Admin", path: "/portal-admin" },
    ],
  },

  "/propostas": {
    title: "Propostas",
    subtitle: "Propostas comerciais imersivas",
    description:
      "Criação e gestão de propostas comerciais visuais e imersivas. Cada proposta é uma landing page exclusiva para o cliente com fotos, roteiro, voos, hotéis e valores. Inclui tracking de engajamento para saber exatamente como o cliente interagiu com a proposta.",
    features: [
      "Editor visual de propostas com preview em tempo real",
      "4 modelos de template: Luxo, Editorial, Moderno e Tropical",
      "Personalização de cores, fontes e layout por proposta",
      "Envio por link para o cliente com tracking de engajamento",
      "Métricas: tempo de leitura, scroll depth, seções mais visualizadas",
      "Preview responsivo: desktop, tablet e mobile",
    ],
    steps: [
      { title: "Crie ou selecione proposta", detail: "Clique em 'Nova Proposta' ou selecione uma existente para editar." },
      { title: "Escolha o modelo", detail: "Selecione entre os 4 modelos visuais disponíveis. Cada um tem estética distinta." },
      { title: "Personalize o conteúdo", detail: "Preencha destino, datas, voos, hotéis, experiências e valores." },
      { title: "Configure o visual", detail: "Ajuste cores, fontes e seções no configurador de template." },
      { title: "Envie ao cliente", detail: "Copie o link da proposta e envie por WhatsApp, email ou compartilhe pelo portal." },
      { title: "Acompanhe o engajamento", detail: "Monitore se o cliente abriu, quanto tempo leu e quais seções mais visualizou." },
    ],
    faq: [
      { q: "O cliente precisa de login para ver a proposta?", a: "Não. O link é público e pode ser acessado por qualquer pessoa com o link." },
      { q: "Posso editar uma proposta após enviar?", a: "Sim. As alterações são refletidas em tempo real no link do cliente." },
      { q: "Como sei se o cliente viu a proposta?", a: "O tracking mostra data/hora da primeira visualização, tempo de leitura e quais seções foram mais vistas." },
    ],
    tips: [
      "Use 'Gerenciar Modelos' para padronizar propostas da agência",
      "O tracking mostra exatamente o que o cliente mais olhou na proposta",
      "Teste o preview em mobile antes de enviar — a maioria dos clientes abre pelo celular",
      "Propostas com fotos de alta qualidade têm maior taxa de conversão",
    ],
    relatedPanels: [
      { label: "Modelos de Propostas", path: "/propostas/modelos" },
      { label: "Cotações", path: "/cotacoes" },
      { label: "Mídias", path: "/midias" },
    ],
  },

  "/propostas/modelos": {
    title: "Modelos de Propostas",
    subtitle: "Configuração de templates visuais",
    description:
      "Central de configuração de templates visuais para propostas. Aqui você define, personaliza e gerencia os modelos que serão usados nas propostas comerciais. Cada modelo pode ter paleta de cores, fontes, layout e seções diferentes.",
    features: [
      "4 modelos base: Luxo, Editorial, Moderno e Tropical",
      "Editor drag-and-drop de seções e blocos",
      "Paletas de cores e combinações de fontes personalizáveis",
      "Preview em tempo real com troca de dispositivo (desktop/tablet/mobile)",
      "Sugestões inteligentes de IA para estilos por tipo de viagem",
      "Abertura de preview em nova aba para visualização completa",
    ],
    steps: [
      { title: "Selecione o modelo", detail: "Clique em um dos modelos disponíveis para abrir o configurador." },
      { title: "Personalize cores e fontes", detail: "Use o painel lateral para ajustar a paleta de cores e fontes do modelo." },
      { title: "Configure as seções", detail: "Arraste e reordene os blocos da proposta: hero, destinos, voos, hotéis, experiências, valores." },
      { title: "Teste responsividade", detail: "Alterne entre desktop, tablet e mobile para verificar como o modelo aparece em cada dispositivo." },
      { title: "Defina como padrão", detail: "Marque um modelo como 'padrão' para que seja usado automaticamente em novas propostas." },
    ],
    tips: [
      "Defina um modelo como 'padrão' para usar automaticamente em novas propostas",
      "Use as sugestões de IA para criar modelos temáticos rapidamente",
      "Sempre teste o modelo em mobile antes de usar com clientes",
    ],
    relatedPanels: [
      { label: "Propostas", path: "/propostas" },
    ],
  },

  "/midias": {
    title: "Mídias",
    subtitle: "Biblioteca de fotos e vídeos",
    description:
      "Biblioteca de mídias dos hotéis com fotos classificadas por área (quarto, piscina, restaurante, fachada, etc.). Use para enriquecer propostas e compartilhar com clientes.",
    features: [
      "Fotos organizadas por hotel e área (quarto, lobby, piscina, etc.)",
      "Classificação automática de fotos por IA",
      "Seleção expressa para uso rápido em propostas",
      "Busca por hotel ou tipo de foto",
    ],
    tips: [
      "Use a seleção expressa para montar uma galeria rápida para o cliente",
      "Fotos classificadas por IA podem ser recategorizadas manualmente",
    ],
    relatedPanels: [
      { label: "Propostas", path: "/propostas" },
      { label: "Hospedagem", path: "/hospedagem" },
    ],
  },

  "/alteracoes": {
    title: "Alterações de Viagem",
    subtitle: "Gestão de mudanças em itinerários",
    description:
      "Gerencie solicitações de alteração em viagens existentes: mudanças de data, troca de hotel, cancelamento parcial de trechos e ajustes em roteiro. Cada alteração é rastreada com impacto financeiro.",
    features: [
      "Lista de alterações solicitadas com status",
      "Cálculo automático de impacto financeiro (multas, diferenças)",
      "Histórico de alterações por viagem",
      "Comunicação direta com fornecedor",
    ],
    tips: [
      "Verifique as políticas de alteração antes de processar mudanças",
      "Registre o impacto financeiro para manter o controle preciso",
    ],
    relatedPanels: [
      { label: "Viagens", path: "/viagens" },
      { label: "Vendas", path: "/sales" },
    ],
  },

  // ── Operação ──────────────────────────────────────
  "/operacao/inbox": {
    title: "Inbox de Conversas",
    subtitle: "Central de comunicação unificada",
    description:
      "Central de comunicação com todos os canais de atendimento unificados. WhatsApp, mensagens e interações em um só lugar. Inclui pipeline visual de vendas, sugestões de IA para respostas e contexto completo do cliente ao lado da conversa.",
    features: [
      "Conversas em tempo real com atualização automática via WebSocket",
      "Pipeline visual de estágios (lead → qualificação → proposta → negociação → fechamento)",
      "Sugestões de IA para respostas e próximos passos baseadas no contexto",
      "Painel lateral com perfil completo do cliente, vendas e viagens",
      "Envio e recebimento de áudios, imagens e documentos",
      "Busca em todas as conversas por texto, cliente ou tag",
      "Tags e classificação para organização",
    ],
    steps: [
      { title: "Selecione uma conversa", detail: "A lista à esquerda mostra todas as conversas ordenadas por mais recente. Clique para abrir." },
      { title: "Leia o contexto", detail: "O painel direito mostra quem é o cliente, histórico de vendas e viagens. Use para personalizar a resposta." },
      { title: "Use as sugestões de IA", detail: "A IA analisa a conversa e sugere respostas. Clique para usar como base e personalize antes de enviar." },
      { title: "Mova no pipeline", detail: "Altere o estágio da conversa (lead → proposta → fechamento) para acompanhar o funil." },
      { title: "Vincule ao cliente", detail: "Se a conversa não estiver vinculada, use 'Vincular Cliente' para associar ao cadastro." },
    ],
    faq: [
      { q: "As mensagens do WhatsApp chegam automaticamente?", a: "Sim, desde que a integração com WhatsApp esteja configurada e ativa em Integrações." },
      { q: "Posso enviar mensagens proativamente?", a: "Sim, você pode iniciar conversas. Para WhatsApp Business API, use templates aprovados para a primeira mensagem." },
    ],
    tips: [
      "Use as sugestões da IA para agilizar respostas mantendo qualidade",
      "Vincule conversas a clientes para manter o histórico completo",
      "O pipeline ajuda a visualizar o funil de vendas por conversa",
      "Tags ajudam a categorizar conversas para acompanhamento posterior",
    ],
    relatedPanels: [
      { label: "Flow Builder", path: "/operacao/flows" },
      { label: "Integrações", path: "/operacao/integracoes" },
      { label: "Tags & Pipeline", path: "/operacao/pipeline" },
    ],
  },

  "/operacao/flows": {
    title: "Flow Builder",
    subtitle: "Automações visuais",
    description:
      "Construtor visual de automações e fluxos de trabalho. Crie chatbots para WhatsApp, automações de follow-up, regras de encaminhamento e workflows operacionais usando blocos visuais conectáveis.",
    features: [
      "Editor drag-and-drop com blocos visuais conectáveis",
      "Blocos disponíveis: IA, condição, ação, mensagem, delay, webhook",
      "Templates prontos para cenários comuns (boas-vindas, follow-up, qualificação)",
      "Simulador integrado para testar fluxos antes de ativar",
      "Variáveis dinâmicas: nome do cliente, destino, data, etc.",
      "Logs de execução para monitorar cada fluxo em produção",
    ],
    steps: [
      { title: "Crie ou edite um fluxo", detail: "Clique em 'Novo Fluxo' ou selecione um existente. Use templates como base." },
      { title: "Monte a lógica", detail: "Arraste blocos da biblioteca e conecte-os na sequência desejada. Cada bloco tem configurações específicas." },
      { title: "Configure os blocos", detail: "Clique em cada bloco para configurar: texto da mensagem, condições de decisão, ações automáticas." },
      { title: "Teste no simulador", detail: "Use o simulador para enviar mensagens de teste e ver como o fluxo se comporta." },
      { title: "Ative o fluxo", detail: "Quando satisfeito, mude o status para 'Ativo'. O fluxo começará a processar conversas automaticamente." },
    ],
    tips: [
      "Comece com um template e personalize conforme sua necessidade",
      "Use o simulador para validar o comportamento antes de publicar",
      "Fluxos complexos devem ter tratamento de erro em cada etapa",
    ],
    warnings: [
      "Fluxos ativos processam conversas reais — teste sempre antes de ativar.",
    ],
    relatedPanels: [
      { label: "Inbox", path: "/operacao/inbox" },
      { label: "Simulador", path: "/operacao/simulador" },
      { label: "Logs", path: "/operacao/logs" },
    ],
  },

  "/operacao/integracoes": {
    title: "Integrações",
    subtitle: "Conexões com serviços externos",
    description:
      "Central de configuração de integrações com ferramentas externas: WhatsApp Business API, Z-API, APIs de voos e hotéis, gateways de pagamento e webhooks personalizados.",
    features: [
      "Conexão com WhatsApp Business API e Z-API",
      "Integração com Amadeus (busca de voos)",
      "APIs de busca de hotéis",
      "Webhooks para sistemas externos",
      "Status e logs de cada integração",
    ],
    steps: [
      { title: "Verifique o status", detail: "Cada integração mostra seu status: ativo (verde), inativo (cinza), erro (vermelho)." },
      { title: "Configure credenciais", detail: "Clique na integração para inserir ou atualizar as credenciais de API." },
      { title: "Teste a conexão", detail: "Use o botão 'Testar' para verificar se as credenciais estão funcionando." },
    ],
    tips: [
      "Verifique o status das integrações regularmente para evitar interrupções",
      "Use os logs para diagnosticar problemas de comunicação",
    ],
    relatedPanels: [
      { label: "Inbox", path: "/operacao/inbox" },
      { label: "Logs", path: "/operacao/logs" },
    ],
  },

  "/operacao/pipeline": {
    title: "Tags & Pipeline",
    subtitle: "Organização de conversas",
    description:
      "Configure os estágios do pipeline de vendas e as tags de classificação de conversas. Personalize o funil de vendas para refletir seu processo real de atendimento.",
    features: [
      "Criação e edição de tags personalizadas com cores e ícones",
      "Configuração de estágios do pipeline de vendas",
      "Regras automáticas de atribuição de tags",
      "Visualização do funil com contagem por estágio",
    ],
    tips: [
      "Mantenha tags simples e padronizadas para facilitar a busca",
      "Configure o pipeline refletindo seu processo real de vendas",
      "Use cores distintas para identificação visual rápida",
    ],
    relatedPanels: [
      { label: "Inbox", path: "/operacao/inbox" },
    ],
  },

  "/operacao/simulador": {
    title: "Simulador",
    subtitle: "Teste de fluxos e automações",
    description:
      "Ambiente seguro para testar fluxos de automação, chatbots e respostas de IA antes de colocá-los em produção. Simule conversas completas e verifique o comportamento.",
    features: [
      "Simulação de conversas com chatbot em ambiente isolado",
      "Teste de fluxos de automação passo a passo",
      "Visualização do caminho percorrido no fluxo",
      "Validação de regras e condições",
    ],
    tips: [
      "Sempre teste novos fluxos aqui antes de ativar para clientes reais",
      "Simule cenários diferentes para validar todas as ramificações do fluxo",
    ],
    relatedPanels: [
      { label: "Flow Builder", path: "/operacao/flows" },
      { label: "Inbox", path: "/operacao/inbox" },
    ],
  },

  "/operacao/logs": {
    title: "Logs & Auditoria",
    subtitle: "Monitoramento de execuções",
    description:
      "Monitoramento detalhado de todas as execuções de IA, automações e integrações do sistema. Cada chamada de IA, execução de fluxo e interação com APIs externas é registrada com tempo de resposta e resultado.",
    features: [
      "Histórico completo de chamadas de IA com modelo usado e tempo de resposta",
      "Custo estimado por execução para controle de gastos",
      "Filtros por tipo (IA, fluxo, integração), status (sucesso, erro) e período",
      "Detalhamento de erros com stack trace para diagnóstico",
    ],
    tips: [
      "Use os filtros de erro para identificar rapidamente problemas",
      "Monitore os custos de IA para otimizar o uso e evitar surpresas",
      "Logs antigos são arquivados automaticamente após 90 dias",
    ],
    relatedPanels: [
      { label: "Integrações", path: "/operacao/integracoes" },
      { label: "Flow Builder", path: "/operacao/flows" },
    ],
  },

  // ── Financeiro ──────────────────────────────────────
  "/financeiro": {
    title: "Financeiro",
    subtitle: "Mini-ERP financeiro",
    description:
      "Dashboard financeiro completo da agência. Visão geral de receitas, despesas, fluxo de caixa e indicadores de saúde financeira. Este é o ponto de entrada para todos os submódulos financeiros.",
    features: [
      "KPIs financeiros: receita bruta, líquida, despesas e lucro",
      "Gráfico de receitas vs despesas ao longo do tempo",
      "Resumo de contas a receber e a pagar",
      "Indicadores de inadimplência e pontualidade",
      "Acesso rápido a todos os submódulos financeiros",
    ],
    steps: [
      { title: "Analise os KPIs", detail: "Os cards no topo mostram receita, despesas e lucro do período. Compare com meses anteriores." },
      { title: "Verifique pendências", detail: "O resumo de contas mostra valores a receber e a pagar. Atenção especial aos vencidos." },
      { title: "Explore os submódulos", detail: "Use o menu lateral para acessar Contas a Receber, Pagar, DRE, Comissões e outros." },
    ],
    tips: [
      "Revise o fluxo de caixa semanalmente para antecipar necessidades",
      "Use o DRE para análise mensal de rentabilidade",
      "Contas vencidas impactam o fluxo de caixa projetado",
    ],
    relatedPanels: [
      { label: "Contas a Receber", path: "/financeiro/receber" },
      { label: "Contas a Pagar", path: "/financeiro/pagar" },
      { label: "DRE", path: "/financeiro/dre" },
    ],
  },

  "/financeiro/receber": {
    title: "Contas a Receber",
    subtitle: "Gestão de recebíveis",
    description:
      "Gestão de todos os recebíveis da agência: parcelas de clientes, comissões de fornecedores e demais entradas. Acompanhe o status de cada parcela, registre recebimentos e monitore inadimplência.",
    features: [
      "Lista de recebíveis por cliente, venda e vencimento",
      "Filtros por status: pendente, recebido, atrasado",
      "Registro de recebimento com data e forma de pagamento",
      "Cálculo automático de taxas e fees por forma de pagamento",
      "Alertas de parcelas vencidas com contagem de dias",
    ],
    tips: [
      "Monitore os atrasados diariamente para ações de cobrança rápidas",
      "Registre o recebimento assim que confirmado para manter o saldo atualizado",
    ],
    relatedPanels: [
      { label: "Financeiro", path: "/financeiro" },
      { label: "Vendas", path: "/sales" },
    ],
  },

  "/financeiro/pagar": {
    title: "Contas a Pagar",
    subtitle: "Controle de obrigações",
    description:
      "Controle de todas as obrigações financeiras: fornecedores, despesas operacionais, custos de viagem e despesas recorrentes.",
    features: [
      "Cadastro de contas por fornecedor e categoria contábil",
      "Alertas de vencimento próximo com contagem regressiva",
      "Controle de parcelas e recorrências automáticas",
      "Vinculação com vendas e plano de contas para análise de margem",
    ],
    tips: [
      "Vincule contas a pagar com vendas para análise de margem precisa",
      "Use categorias do plano de contas para relatórios organizados",
    ],
    relatedPanels: [
      { label: "Financeiro", path: "/financeiro" },
      { label: "Fornecedores", path: "/financeiro/fornecedores" },
    ],
  },

  "/financeiro/fluxo": {
    title: "Fluxo de Caixa",
    subtitle: "Projeção e acompanhamento",
    description:
      "Projeção e acompanhamento do fluxo de caixa da agência. Visualize entradas e saídas ao longo do tempo, com projeção futura baseada em contas programadas.",
    features: [
      "Gráfico de entradas vs saídas ao longo do tempo",
      "Projeção futura baseada em contas a receber e pagar programadas",
      "Saldo acumulado dia a dia com linha de tendência",
      "Visão diária, semanal e mensal",
    ],
    tips: [
      "Use a projeção para planejar investimentos e evitar descoberto",
      "Revise semanalmente para antecipar necessidades de capital",
    ],
    relatedPanels: [
      { label: "Contas a Receber", path: "/financeiro/receber" },
      { label: "Contas a Pagar", path: "/financeiro/pagar" },
    ],
  },

  "/financeiro/cartoes": {
    title: "Cartões de Crédito",
    subtitle: "Gestão de faturas e cartões",
    description: "Controle de cartões corporativos e faturas. Gerencie limites, despesas e fechamentos de fatura.",
    features: ["Cadastro de cartões corporativos", "Controle de limite disponível", "Vinculação de despesas", "Alertas de fatura"],
    tips: ["Mantenha os limites atualizados para evitar surpresas"],
    relatedPanels: [{ label: "Financeiro", path: "/financeiro" }],
  },

  "/financeiro/fornecedores": {
    title: "Fornecedores",
    subtitle: "Cadastro e gestão de fornecedores",
    description:
      "Cadastro completo de fornecedores: operadoras, hotéis, cias aéreas, seguradoras e serviços. Registre dados de contato, dados bancários e acompanhe o histórico de transações.",
    features: [
      "Cadastro com dados completos: contato, bancário, fiscal",
      "Histórico de transações por fornecedor",
      "Avaliação e notas sobre qualidade do serviço",
      "Vinculação com contas a pagar",
    ],
    tips: [
      "Mantenha os dados bancários atualizados para agilizar pagamentos",
      "Use as avaliações para escolher fornecedores em futuras vendas",
    ],
    relatedPanels: [
      { label: "Contas a Pagar", path: "/financeiro/pagar" },
      { label: "Fechamento", path: "/financeiro/fechamento" },
    ],
  },

  "/financeiro/taxas": {
    title: "Taxas & Tarifas",
    subtitle: "Configuração de taxas financeiras",
    description: "Configure taxas de cartão, tarifas bancárias e fees operacionais. Essas taxas são usadas no cálculo automático de receita líquida.",
    features: ["Cadastro por bandeira e meio de pagamento", "Taxas por parcela (1x, 2x, 3x...)", "Impacto calculado automaticamente"],
    tips: ["Mantenha as taxas atualizadas — elas impactam toda a análise financeira"],
    relatedPanels: [{ label: "Simulador", path: "/financeiro/simulador" }],
  },

  "/financeiro/gateways": {
    title: "Gateway de Pagamentos",
    subtitle: "Links de pagamento e cobranças",
    description: "Gerencie cobranças e links de pagamento para clientes. Integração com gateways para recebimento online.",
    features: ["Geração de links de pagamento", "Acompanhamento de status", "Integração com gateways"],
    tips: ["Links de pagamento expiram — monitore os pendentes"],
    relatedPanels: [{ label: "Contas a Receber", path: "/financeiro/receber" }],
  },

  "/financeiro/simulador": {
    title: "Simulador de Taxas",
    subtitle: "Calcule impacto de taxas",
    description: "Simule o impacto de diferentes formas de pagamento e taxas na receita líquida. Use para tomar decisões informadas sobre formas de pagamento.",
    features: ["Simulação por forma de pagamento", "Comparativo de cenários", "Impacto na margem líquida"],
    tips: ["Use o simulador antes de oferecer condições especiais ao cliente"],
    relatedPanels: [{ label: "Taxas", path: "/financeiro/taxas" }],
  },

  "/financeiro/plano-contas": {
    title: "Plano de Contas",
    subtitle: "Estrutura contábil",
    description: "Hierarquia de categorias contábeis para classificação de receitas e despesas. Essencial para o DRE e relatórios financeiros.",
    features: ["Contas organizadas hierarquicamente", "Tipos: receita, despesa, custo", "Criação de subcontas personalizadas"],
    tips: ["Organize refletindo sua operação real para relatórios mais úteis"],
    relatedPanels: [{ label: "DRE", path: "/financeiro/dre" }],
  },

  "/financeiro/comissoes": {
    title: "Comissões",
    subtitle: "Gestão de comissões da equipe",
    description: "Cálculo e gestão de comissões dos vendedores. Defina regras de comissão por vendedor ou faixa de valor e acompanhe pagamentos.",
    features: ["Cálculo automático por venda", "Regras por vendedor ou faixa", "Relatório de comissões pagas e pendentes"],
    tips: ["Configure as regras antes de lançar vendas para cálculo automático"],
    relatedPanels: [{ label: "Financeiro", path: "/financeiro" }, { label: "Metas & Bônus", path: "/rh/metas" }],
  },

  "/financeiro/fechamento": {
    title: "Fechamento de Fornecedores",
    subtitle: "Conciliação com fornecedores",
    description: "Concilie pagamentos com fornecedores. Compare valores cobrados vs valores pagos e identifique diferenças.",
    features: ["Comparativo: cobrado vs pago", "Identificação de diferenças", "Status de conciliação"],
    tips: ["Faça o fechamento mensalmente para manter o financeiro organizado"],
    relatedPanels: [{ label: "Fornecedores", path: "/financeiro/fornecedores" }],
  },

  "/financeiro/dre": {
    title: "DRE",
    subtitle: "Demonstração de Resultado do Exercício",
    description: "Relatório contábil com visão consolidada de receitas, custos e lucro. Compare períodos para identificar tendências de rentabilidade.",
    features: ["DRE mensal e anual", "Categorização automática pelo plano de contas", "Comparativo entre períodos"],
    tips: ["Compare mês a mês para identificar tendências de rentabilidade"],
    relatedPanels: [{ label: "Plano de Contas", path: "/financeiro/plano-contas" }, { label: "Financeiro", path: "/financeiro" }],
  },

  // ── AI Team ──────────────────────────────────────
  "/ai-team": {
    title: "Mission Control",
    subtitle: "Central de Comando do AI Team v4",
    description:
      "Quartel-general da equipe de 21 agentes IA organizados em 7 squads. Aqui você monitora KPIs em tempo real, acompanha o feed de atividades, gerencia missões no Kanban e visualiza o status de cada agente. É o ponto central de controle de toda a operação de IA da NatLeva.",
    features: [
      "KPIs de visão geral: agentes ativos, tarefas concluídas, alertas e sugestões",
      "Live Feed cronológico com filtros por tipo (Alertas, Sugestões, Decisões, Sistema)",
      "Kanban de Missões: Sugeridas → Executando → Concluídas",
      "Grid de 21 agentes com status, XP, nível e squad",
      "Work Log individual por agente com timeline de decisões",
      "Escritório 3D interativo com os agentes em ambiente virtual",
    ],
    steps: [
      { title: "Monitore os KPIs", detail: "Os cards no topo mostram a saúde geral do time: agentes online, tarefas do dia, alertas pendentes e sugestões geradas." },
      { title: "Acompanhe o Feed", detail: "O Live Feed mostra tudo que os agentes estão fazendo em tempo real. Filtre por tipo para focar em alertas ou decisões." },
      { title: "Gerencie Missões", detail: "O Kanban permite arrastar missões entre colunas. Clique para ver detalhes e atribuir a agentes específicos." },
      { title: "Clique em um agente", detail: "Acesse o HUD Tático do agente para ver missões, métricas, terminal de comando e logs detalhados." },
    ],
    tips: [
      "Use os filtros do Feed para identificar rapidamente alertas críticos",
      "O Kanban mostra missões de todos os squads — filtre por squad para focar",
      "Clique em qualquer agente para acessar seu painel detalhado com terminal de comando",
    ],
    relatedPanels: [
      { label: "Equipe", path: "/ai-team/equipe" },
      { label: "Laboratório", path: "/ai-team/laboratorio" },
      { label: "Evolution Engine", path: "/ai-team/evolution" },
    ],
  },

  "/ai-team/equipe": {
    title: "Equipe de Agentes",
    subtitle: "Grid completo dos 21 agentes IA",
    description:
      "Visualize todos os 21 agentes organizados em 7 squads especializados. Cada card mostra nome, função, status, nível, XP e habilidades. Filtre por squad, status ou busque por nome para encontrar rapidamente qualquer agente.",
    features: [
      "Grid responsivo com cards de cada agente mostrando avatar, nível e status",
      "Filtros por squad (Orquestração, Comercial, Criativo, Operacional, Financeiro, QA, Growth)",
      "Indicador visual de status: ativo, ocioso, em tarefa, offline",
      "Barra de XP mostrando progresso para o próximo nível",
      "Clique para abrir o HUD Tático detalhado de cada agente",
    ],
    steps: [
      { title: "Navegue pelos squads", detail: "Use os filtros no topo para ver apenas agentes de um squad específico, como 'Comercial' ou 'QA/VIGIL'." },
      { title: "Verifique o status", detail: "Agentes verdes estão ativos. Amarelos estão ociosos. Verifique se algum está sobrecarregado." },
      { title: "Acesse o detalhe", detail: "Clique em qualquer agente para abrir seu HUD Tático com missões, terminal e métricas." },
    ],
    tips: [
      "Agentes com XP próximo do máximo estão prestes a subir de nível",
      "Use a visão por squad para entender a distribuição de carga de trabalho",
      "O status 'em tarefa' indica que o agente está processando algo no momento",
    ],
    relatedPanels: [
      { label: "Mission Control", path: "/ai-team" },
      { label: "Skills", path: "/ai-team/skills" },
      { label: "Academia", path: "/ai-team/academia" },
    ],
  },

  "/ai-team/evolution": {
    title: "Evolution Engine",
    subtitle: "Motor de evolução contínua dos agentes",
    description:
      "Sistema de melhoria contínua onde os agentes propõem otimizações baseadas em seus aprendizados. Cada sugestão passa por aprovação humana antes de ser aplicada. Inclui A/B testing para comparar versões de comportamento.",
    features: [
      "Lista de melhorias propostas pelos agentes com score de impacto",
      "Fluxo de aprovação: Pendente → Aprovado → Aplicado",
      "Categorias: Prompt, Workflow, Integração, Performance",
      "A/B Testing para comparar comportamentos antes e depois",
      "Histórico completo de evoluções aplicadas por agente",
    ],
    steps: [
      { title: "Revise as propostas", detail: "Cada melhoria mostra o agente que propôs, a categoria, descrição detalhada e score de impacto estimado." },
      { title: "Aprove ou rejeite", detail: "Avalie se a melhoria faz sentido para o negócio. Aprovações são aplicadas imediatamente ao comportamento do agente." },
      { title: "Acompanhe o A/B Test", detail: "Compare métricas antes e depois de aplicar uma melhoria para validar o impacto real." },
    ],
    tips: [
      "Priorize melhorias com score de impacto alto (acima de 80)",
      "Use o A/B Testing antes de aprovar mudanças em agentes críticos como NATH.AI",
      "O histórico de evoluções mostra a jornada de aprendizado de cada agente",
    ],
    relatedPanels: [
      { label: "Mission Control", path: "/ai-team" },
      { label: "Laboratório", path: "/ai-team/laboratorio" },
      { label: "Skills", path: "/ai-team/skills" },
    ],
  },

  "/ai-team/conhecimento": {
    title: "Base de Conhecimento",
    subtitle: "Memória RAG dos agentes IA",
    description:
      "Repositório central de conhecimento que alimenta todos os agentes. Aqui você gerencia documentos, textos e referências que a IA usa para fundamentar suas respostas. Funciona como a 'biblioteca' dos agentes.",
    features: [
      "Upload de documentos (PDF, TXT, DOCX) para a base de conhecimento",
      "Categorização por área: vendas, destinos, políticas, procedimentos",
      "Busca semântica nos documentos carregados",
      "Ativação/desativação de documentos sem excluí-los",
      "Visualização de quais agentes utilizam cada documento",
    ],
    steps: [
      { title: "Adicione conhecimento", detail: "Faça upload de documentos ou cole textos diretamente. A IA indexa o conteúdo para busca semântica." },
      { title: "Organize por categoria", detail: "Classifique cada item para que os agentes certos acessem o conhecimento relevante." },
      { title: "Gerencie a base", detail: "Ative ou desative documentos conforme necessário. Documentos desativados não são consultados pela IA." },
    ],
    tips: [
      "Documentos mais específicos geram respostas melhores do que genéricos",
      "Atualize regularmente as políticas de cancelamento e condições de viagem",
      "Use categorias para que cada agente acesse apenas o conhecimento relevante ao seu squad",
    ],
    relatedPanels: [
      { label: "Estratégia IA", path: "/implementacao/estrategia-ia" },
      { label: "Mission Control", path: "/ai-team" },
    ],
  },

  "/ai-team/skills": {
    title: "Skills dos Agentes",
    subtitle: "Habilidades e capacidades de cada agente",
    description:
      "Gerencie as habilidades técnicas e comportamentais de cada agente. Skills determinam quais tarefas um agente pode executar e com qual qualidade. Agentes ganham novas skills ao subir de nível.",
    features: [
      "Catálogo de skills disponíveis no sistema",
      "Atribuição de skills por agente com nível de proficiência",
      "Skills desbloqueáveis por nível (sistema de progressão)",
      "Visualização de gaps — habilidades faltantes no time",
    ],
    steps: [
      { title: "Veja as skills do time", detail: "O dashboard mostra todas as skills e quais agentes as possuem. Identifique lacunas." },
      { title: "Atribua novas skills", detail: "Selecione um agente e adicione skills compatíveis com sua função e squad." },
    ],
    tips: [
      "Skills de comunicação são essenciais para agentes do squad Comercial",
      "O VIGIL squad precisa de skills de análise e compliance",
      "Verifique se não há skill crítica coberta por apenas um agente (ponto único de falha)",
    ],
    relatedPanels: [
      { label: "Equipe", path: "/ai-team/equipe" },
      { label: "Academia", path: "/ai-team/academia" },
    ],
  },

  "/ai-team/workflow": {
    title: "Workflow Visual",
    subtitle: "Mapa de conexões entre squads e agentes",
    description:
      "Visualização gráfica de como os 7 squads se conectam e como as tarefas fluem entre agentes. Mostra os handoffs automáticos e as dependências entre agentes.",
    features: [
      "Diagrama visual dos 7 squads com conexões",
      "Fluxo de handoff entre agentes (ex: ÓRION → MAYA → ATLAS)",
      "Indicadores de volume de tarefas em cada conexão",
      "Detecção de gargalos no fluxo de trabalho",
    ],
    steps: [
      { title: "Entenda o fluxo", detail: "Cada squad é um bloco no diagrama. As setas mostram como tarefas são repassadas entre squads." },
      { title: "Identifique gargalos", detail: "Conexões com alto volume e baixa vazão indicam gargalos que precisam de atenção." },
    ],
    tips: [
      "O squad de Orquestração (NATH.AI + ÓRION) é o hub central de distribuição",
      "Acompanhe se o fluxo Comercial → Criativo está fluindo sem acúmulos",
      "Use essa visão para planejar a adição de novos agentes em squads sobrecarregados",
    ],
    relatedPanels: [
      { label: "Mission Control", path: "/ai-team" },
      { label: "Equipe", path: "/ai-team/equipe" },
    ],
  },

  "/ai-team/memoria": {
    title: "Memória & Fiscal",
    subtitle: "Sistema de memória persistente e auditoria",
    description:
      "Painel de memória de longo prazo dos agentes e logs de fiscalização do VIGIL. Aqui você vê o que os agentes aprenderam, retiveram e como o quality gate está filtrando decisões.",
    features: [
      "Memórias retidas por agente com contexto e data",
      "Logs do VIGIL com decisões aprovadas/barradas",
      "Estatísticas de retenção de memória por período",
      "Busca em memórias por palavra-chave ou agente",
    ],
    tips: [
      "Memórias frequentes indicam padrões que podem virar regras na Estratégia IA",
      "Logs do VIGIL barrados merecem revisão — podem indicar falsos positivos",
    ],
    relatedPanels: [
      { label: "Conhecimento", path: "/ai-team/conhecimento" },
      { label: "Evolution Engine", path: "/ai-team/evolution" },
    ],
  },

  "/ai-team/academia": {
    title: "Academia",
    subtitle: "Sistema de treinamento e gamificação",
    description:
      "Centro de treinamento gamificado dos agentes. Missões de XP, leaderboard de performance, conquistas desbloqueáveis e progressão de nível. Incentiva a evolução contínua dos agentes.",
    features: [
      "Leaderboard com ranking de XP entre todos os agentes",
      "Missões de treinamento com recompensas em XP",
      "Conquistas desbloqueáveis por marcos atingidos",
      "Histórico de progressão de nível por agente",
    ],
    steps: [
      { title: "Veja o ranking", detail: "O leaderboard mostra quem está evoluindo mais rápido. Use para identificar agentes que precisam de mais missões." },
      { title: "Atribua missões", detail: "Crie missões de treinamento focadas em skills que o agente precisa desenvolver." },
    ],
    tips: [
      "Agentes com XP estagnado podem precisar de missões mais desafiadoras",
      "Conquistas motivam — verifique quais estão próximas de serem desbloqueadas",
      "O leaderboard gera competição saudável entre os squads",
    ],
    relatedPanels: [
      { label: "Skills", path: "/ai-team/skills" },
      { label: "Equipe", path: "/ai-team/equipe" },
    ],
  },

  "/ai-team/simulador": {
    title: "Simulador",
    subtitle: "Chat direto com qualquer agente",
    description:
      "Converse diretamente com qualquer agente IA em tempo real. Teste respostas, valide comportamentos e explore as capacidades de cada agente antes de colocá-lo em produção. O chat usa streaming para respostas naturais.",
    features: [
      "Seleção de qualquer um dos 21 agentes para conversar",
      "Chat em tempo real com streaming de resposta",
      "Contexto da persona e habilidades do agente aplicados automaticamente",
      "Histórico de conversas da sessão para referência",
    ],
    steps: [
      { title: "Escolha o agente", detail: "Selecione o agente que deseja testar no seletor. Cada agente responde de acordo com sua persona e skills." },
      { title: "Envie uma mensagem", detail: "Digite uma situação real (ex: 'Cliente quer viajar para Maldivas em lua de mel'). O agente responderá em caráter." },
      { title: "Avalie a resposta", detail: "Verifique se a resposta está alinhada com as regras de negócio e a persona do agente." },
    ],
    tips: [
      "Teste cenários difíceis: reclamações, cancelamentos, orçamentos apertados",
      "Compare respostas de agentes diferentes para o mesmo cenário",
      "Use o simulador antes de ativar um agente novo em produção",
    ],
    relatedPanels: [
      { label: "Laboratório", path: "/ai-team/laboratorio" },
      { label: "Mission Control", path: "/ai-team" },
    ],
  },

  "/ai-team/laboratorio": {
    title: "Laboratório (War Room)",
    subtitle: "Stress test com avaliação por IA juiz",
    description:
      "Ambiente de testes rigorosos onde você seleciona agentes e perfis de cliente para rodar stress tests. Cada resposta do agente é avaliada automaticamente por uma IA juiz em 4 dimensões: Aderência às regras, Sentimento, Clareza e Proatividade. Ideal para validar agentes antes de ativá-los em produção.",
    features: [
      "Seleção múltipla de agentes para teste simultâneo",
      "8 perfis de cliente realistas: Sonhador, Indeciso, Desconfiado, Pechincheiro, Família, Lua de Mel, Corporativo, Reclamação",
      "Avaliação automática por IA juiz com score 0-100 em 4 dimensões",
      "Resumo qualitativo da avaliação com pontos fortes e fracos",
      "Histórico de resultados para acompanhar evolução",
      "Botão 'Rodar Teste' para executar stress test completo",
    ],
    steps: [
      { title: "Selecione os agentes", detail: "Clique nos badges dos agentes que deseja testar. Você pode selecionar vários para comparar resultados lado a lado." },
      { title: "Escolha um perfil de cliente", detail: "Selecione um dos 8 perfis. Cada perfil simula um tipo diferente de cliente com comportamentos e expectativas distintas." },
      { title: "Rode o teste", detail: "Clique em 'Rodar Teste'. O sistema gera uma mensagem do perfil escolhido, o agente responde, e a IA juiz avalia a resposta." },
      { title: "Analise os resultados", detail: "Veja os scores em cada dimensão. Aderência mede se seguiu as regras. Sentimento avalia empatia. Clareza mede objetividade. Proatividade verifica se ofereceu soluções extras." },
    ],
    faq: [
      { q: "O que é a IA juiz?", a: "É uma segunda camada de IA que avalia a qualidade da resposta do agente. Ela não participa da conversa — apenas analisa e pontua." },
      { q: "Posso testar vários perfis de uma vez?", a: "Você seleciona um perfil por vez, mas pode rodar testes sequenciais e comparar os resultados no painel de histórico." },
      { q: "Os resultados do lab afetam o agente em produção?", a: "Não diretamente. Os testes são isolados. Use os insights para ajustar prompts e skills antes de ativar em produção." },
    ],
    tips: [
      "Teste sempre com o perfil 'Reclamação' — é o cenário mais desafiador",
      "Compare o mesmo agente com perfis diferentes para encontrar fraquezas",
      "Scores abaixo de 60 em qualquer dimensão indicam necessidade de ajuste no prompt",
      "Use os resultados do lab para alimentar o Evolution Engine com melhorias",
    ],
    relatedPanels: [
      { label: "Simulador", path: "/ai-team/simulador" },
      { label: "Evolution Engine", path: "/ai-team/evolution" },
      { label: "Mission Control", path: "/ai-team" },
    ],
  },

  "/ai-team/config": {
    title: "Configurações",
    subtitle: "Identidade, gateway e guardrails do AI Team",
    description:
      "Configure a identidade dos agentes, os modelos de IA utilizados, limites de segurança (guardrails) e parâmetros operacionais do time. Todas as configurações afetam o comportamento dos agentes em tempo real.",
    features: [
      "Configuração de identidade e persona de cada agente",
      "Seleção de modelo de IA (gateway) por agente ou global",
      "Guardrails: limites de tokens, temas proibidos, regras de escalação",
      "Parâmetros de temperatura, top-p e frequência de resposta",
    ],
    tips: [
      "Guardrails são essenciais — defina temas proibidos para evitar respostas inadequadas",
      "Modelos mais rápidos (Flash) são ideais para tarefas simples; use Pro para raciocínio complexo",
      "Teste mudanças no Simulador antes de aplicar em produção",
    ],
    relatedPanels: [
      { label: "Mission Control", path: "/ai-team" },
      { label: "Estratégia IA", path: "/implementacao/estrategia-ia" },
    ],
  },

  "/implementacao/estrategia-ia": {
    title: "Estratégia IA",
    subtitle: "Regras de comportamento da IA",
    description:
      "Base de conhecimento estratégico que guia todo o comportamento da IA NatLeva. Defina regras, prioridades, contextos e diretrizes que a IA seguirá ao sugerir respostas, criar propostas e tomar decisões.",
    features: [
      "Regras de negócio organizadas por categoria, subcategoria e prioridade (P0 a P100)",
      "Importação e exportação de regras em formato TXT para backup e compartilhamento",
      "Ativação/desativação individual de regras sem deletar",
      "Tags e categorias para organização e busca avançada",
      "Contexto e exemplos para cada regra, ajudando a IA a aplicar corretamente",
    ],
    steps: [
      { title: "Explore as categorias", detail: "As regras estão organizadas por área: vendas, atendimento, produto, etc. Use os filtros para navegar." },
      { title: "Crie uma nova regra", detail: "Clique em 'Nova Regra' e defina: título, regra (texto), contexto, exemplo, categoria e prioridade." },
      { title: "Defina a prioridade", detail: "Regras P100 são invioláveis. P0 são sugestivas. Use a escala para calibrar." },
      { title: "Importe regras", detail: "Use o botão de importação para carregar regras de um arquivo TXT formatado." },
    ],
    faq: [
      { q: "O que acontece quando duas regras conflitam?", a: "A IA segue a regra com maior prioridade. Em caso de empate, usa o contexto da conversa para decidir." },
      { q: "As regras são aplicadas imediatamente?", a: "Sim, regras ativas são consideradas na próxima execução de IA." },
    ],
    tips: [
      "Regras P100 são invioláveis pela IA — use para regras de negócio críticas",
      "Use tags para agrupar regras relacionadas e facilitar manutenção",
      "Inclua exemplos para melhorar a aplicação das regras pela IA",
    ],
    relatedPanels: [
      { label: "AI Team", path: "/ai-team" },
      { label: "Aprendizados IA", path: "/implementacao/aprendizados-ia" },
    ],
  },

  "/implementacao/aprendizados-ia": {
    title: "Aprendizados IA",
    subtitle: "Padrões detectados automaticamente",
    description:
      "A IA analisa dados de vendas, conversas e propostas para detectar padrões automaticamente. Aqui você revisa esses padrões, avalia sua relevância e pode promovê-los a regras oficiais na Estratégia IA.",
    features: [
      "Padrões detectados com nível de confiança (0-100%)",
      "Análise de impacto estimado de cada padrão",
      "Promoção de padrões relevantes para regras oficiais com um clique",
      "Filtros por categoria, confiança e status",
    ],
    steps: [
      { title: "Revise os padrões", detail: "Cada padrão mostra o que foi detectado, com que confiança e qual o impacto estimado." },
      { title: "Avalie a relevância", detail: "Decida se o padrão é relevante para seu negócio. Padrões com alta confiança geralmente são mais confiáveis." },
      { title: "Promova ou descarte", detail: "Clique em 'Promover' para transformar o padrão em uma regra oficial, ou descarte se não for relevante." },
    ],
    tips: [
      "Revise os aprendizados semanalmente e promova os mais relevantes",
      "Padrões com confiança acima de 80% tendem a ser muito precisos",
      "Ao promover, você pode editar a regra antes de ativar",
    ],
    relatedPanels: [
      { label: "Estratégia IA", path: "/implementacao/estrategia-ia" },
      { label: "AI Team", path: "/ai-team" },
    ],
  },

  "/implementacao/cerebro-natleva": {
    title: "Cérebro NatLeva",
    subtitle: "Chat avançado com IA",
    description:
      "Interface de chat avançada com a IA central da NatLeva. Faça perguntas sobre vendas, clientes, operação e finanças em linguagem natural. A IA acessa todos os dados do sistema para gerar respostas, análises e relatórios sob demanda.",
    features: [
      "Chat em linguagem natural — pergunte qualquer coisa sobre o negócio",
      "Acesso a dados de vendas, clientes, viagens e financeiro",
      "Geração de relatórios e análises sob demanda",
      "Histórico de conversas salvo automaticamente",
      "Sugestões de perguntas baseadas nos dados mais relevantes",
    ],
    steps: [
      { title: "Faça uma pergunta", detail: "Digite sua pergunta naturalmente, como 'Qual foi o faturamento de março?' ou 'Quais clientes não viajaram nos últimos 6 meses?'" },
      { title: "Explore a resposta", detail: "A IA responderá com dados, gráficos ou tabelas conforme a pergunta. Pode fazer perguntas de follow-up." },
      { title: "Peça ações", detail: "Peça para a IA gerar um relatório, criar uma proposta ou sugerir ações com base nos dados." },
    ],
    tips: [
      "Seja específico nas perguntas para respostas mais precisas",
      "Pergunte sobre tendências, comparações e projeções",
      "Exemplo: 'Compare o faturamento de jan vs fev por destino'",
      "Exemplo: 'Liste os 10 clientes VIP que não viajaram este ano'",
    ],
    relatedPanels: [
      { label: "NatLeva Intelligence", path: "/natleva-intelligence" },
      { label: "Dashboard", path: "/dashboard" },
    ],
  },

  // ── Implementação ──────────────────────────────────
  "/import": {
    title: "Importar Dados",
    subtitle: "Importação em massa de planilhas",
    description:
      "Ferramenta de importação em massa de dados a partir de planilhas Excel/CSV. Importe clientes, vendas, passageiros e outros dados com mapeamento automático de colunas e validação prévia.",
    features: [
      "Upload de planilhas Excel (.xlsx) e CSV",
      "Mapeamento automático de colunas com sugestão inteligente",
      "Validação de dados antes da importação (erros e alertas)",
      "Log detalhado com sucessos, erros e registros ignorados",
      "Templates de exemplo para download",
    ],
    steps: [
      { title: "Baixe o template", detail: "Use o botão 'Baixar Template' para obter a planilha modelo com as colunas corretas." },
      { title: "Preencha seus dados", detail: "Organize seus dados na planilha seguindo o formato do template." },
      { title: "Faça o upload", detail: "Arraste a planilha ou clique para selecionar o arquivo." },
      { title: "Mapeie as colunas", detail: "O sistema sugere o mapeamento automaticamente. Revise e ajuste se necessário." },
      { title: "Revise e confirme", detail: "Verifique os dados na prévia. Corrija erros de validação antes de confirmar." },
    ],
    tips: [
      "Use o template de exemplo para formatar seus dados antes do upload",
      "Revise os erros de validação antes de confirmar a importação",
      "Importe em lotes pequenos para facilitar a revisão",
    ],
    warnings: [
      "Dados importados não podem ser desfeitos automaticamente — revise com cuidado antes de confirmar.",
    ],
    relatedPanels: [
      { label: "Vendas", path: "/sales" },
      { label: "Passageiros", path: "/passengers" },
    ],
  },

  "/livechat/import-chatguru": {
    title: "Importar Conversas",
    subtitle: "Importação do ChatGuru",
    description: "Importe conversas do ChatGuru para centralizar todo o histórico de atendimento no sistema.",
    features: ["Importação de conversas completas", "Mapeamento de contatos", "Preservação de mídia e anexos"],
    tips: ["A importação pode levar alguns minutos dependendo do volume"],
    relatedPanels: [{ label: "Inbox", path: "/operacao/inbox" }],
  },

  "/implementacao/base-conhecimento": {
    title: "Base de Conhecimento",
    subtitle: "Documentos e referências",
    description:
      "Repositório de documentos, guias e materiais de referência que a IA usa para gerar respostas mais precisas. Quanto mais rico o conteúdo aqui, melhor a IA responde.",
    features: [
      "Upload de documentos (PDF, TXT, DOCX)",
      "Categorização por área: vendas, operação, produto, destinos",
      "Busca por conteúdo dentro dos documentos",
      "Ativação/desativação de documentos sem deletar",
    ],
    tips: [
      "Mantenha a base atualizada para que a IA tenha informações precisas",
      "Inclua informações sobre destinos, fornecedores e processos internos",
    ],
    relatedPanels: [
      { label: "Estratégia IA", path: "/implementacao/estrategia-ia" },
      { label: "Cérebro NatLeva", path: "/implementacao/cerebro-natleva" },
    ],
  },

  // ── Portal Admin ──────────────────────────────────
  "/portal-admin": {
    title: "Portal Admin",
    subtitle: "Gestão do portal do cliente",
    description:
      "Administração do Portal do Viajante. Configure o que os clientes veem, gerencie acessos, monitore interações e controle notificações enviadas.",
    features: [
      "Dashboard de uso do portal pelos clientes (acessos, visualizações)",
      "Gestão de acessos: convites, ativações e desativações",
      "Configuração de conteúdo visível no portal",
      "Monitoramento de notificações enviadas e lidas",
    ],
    steps: [
      { title: "Monitore os acessos", detail: "O dashboard mostra quantos clientes acessaram o portal, com que frequência e quais seções mais visitam." },
      { title: "Gerencie clientes", detail: "Em 'Clientes' você vê todos os clientes com acesso ao portal. Crie convites ou desative acessos." },
      { title: "Configure viagens", detail: "Em 'Viagens' você gerencia quais viagens aparecem no portal de cada cliente." },
      { title: "Envie notificações", detail: "Use 'Notificações' para comunicar atualizações importantes aos clientes do portal." },
    ],
    tips: [
      "Monitore quais clientes acessam o portal para priorizar o suporte",
      "Use o ambiente de teste para ver exatamente como o cliente vê o portal",
    ],
    relatedPanels: [
      { label: "Viagens", path: "/portal-admin/viagens" },
      { label: "Clientes", path: "/portal-admin/clientes" },
      { label: "Configurações", path: "/portal-admin/config" },
    ],
  },

  // ── RH ──────────────────────────────────────
  "/rh": {
    title: "Recursos Humanos",
    subtitle: "Gestão completa de pessoas",
    description:
      "Módulo completo de gestão de pessoas da agência. Cadastro de colaboradores, controle de ponto, folha de pagamento, metas e bônus, avaliação de desempenho, feedbacks estruturados e gestão de documentos e contratos.",
    features: [
      "Cadastro de colaboradores com dados completos e histórico",
      "Controle de ponto com banco de horas",
      "Folha de pagamento com cálculos automáticos",
      "Metas individuais e de equipe com bônus",
      "Avaliação de desempenho e competências",
      "Feedbacks 360° entre equipe",
      "Gestão de contratos e documentos com alertas de vencimento",
    ],
    steps: [
      { title: "Cadastre colaboradores", detail: "Comece cadastrando todos os membros da equipe com dados pessoais, cargo, salário e data de admissão." },
      { title: "Configure o ponto", detail: "Defina as jornadas de trabalho e configure o sistema de registro de ponto." },
      { title: "Defina metas", detail: "Estabeleça metas individuais e de equipe para acompanhamento e cálculo de bônus." },
      { title: "Programe avaliações", detail: "Configure ciclos de avaliação de desempenho (mensal, trimestral, semestral)." },
    ],
    tips: [
      "Use o módulo de feedback para manter a equipe engajada e alinhada",
      "Configure alertas de vencimento de contratos e documentos importantes",
      "Revise o clima do time mensalmente para ações preventivas",
    ],
    relatedPanels: [
      { label: "Colaboradores", path: "/rh/colaboradores" },
      { label: "Metas & Bônus", path: "/rh/metas" },
      { label: "Desempenho", path: "/rh/desempenho" },
    ],
  },

  "/rh/colaboradores": {
    title: "Colaboradores",
    subtitle: "Cadastro da equipe",
    description: "Cadastro completo de todos os colaboradores. Perfil com dados pessoais, cargo, salário, documentos e histórico na empresa.",
    features: ["Perfil completo", "Histórico de cargos e salários", "Documentos e contratos vinculados", "Filtros por cargo, área e status"],
    tips: ["Mantenha os dados atualizados para relatórios e folha de pagamento precisos"],
    relatedPanels: [{ label: "RH", path: "/rh" }, { label: "Folha", path: "/rh/folha" }],
  },

  "/rh/ponto": {
    title: "Controle de Ponto",
    subtitle: "Registro de jornada",
    description: "Registro e acompanhamento da jornada de trabalho. Banco de horas, atrasos e relatórios de horas trabalhadas.",
    features: ["Registro de entrada e saída", "Banco de horas automático", "Relatórios de horas trabalhadas por período", "Alertas de atrasos"],
    tips: ["Revise os registros semanalmente para evitar acúmulo de ajustes"],
    relatedPanels: [{ label: "RH", path: "/rh" }, { label: "Folha", path: "/rh/folha" }],
  },

  "/rh/folha": {
    title: "Folha de Pagamentos",
    subtitle: "Processamento mensal",
    description: "Processamento e gestão da folha de pagamento. Cálculos automáticos de salário, descontos, benefícios e encargos.",
    features: ["Cálculo automático de salários e descontos", "Histórico de pagamentos", "Exportação para contabilidade"],
    tips: ["Confira todos os descontos antes de fechar a folha do mês"],
    relatedPanels: [{ label: "RH", path: "/rh" }, { label: "Ponto", path: "/rh/ponto" }],
  },

  "/rh/metas": {
    title: "Metas & Bônus",
    subtitle: "Acompanhamento de metas",
    description: "Defina metas individuais e de equipe com faixas de bônus (80%, 100%, 120%). Acompanhe o progresso em tempo real.",
    features: ["Metas por vendedor e por equipe", "Tracking de progresso em tempo real", "Cálculo automático de bônus por faixa"],
    tips: ["Defina metas SMART — específicas, mensuráveis e com prazo definido"],
    relatedPanels: [{ label: "RH", path: "/rh" }, { label: "Comissões", path: "/financeiro/comissoes" }],
  },

  "/rh/desempenho": {
    title: "Desempenho",
    subtitle: "Avaliação de colaboradores",
    description: "Avaliação estruturada de desempenho com competências, indicadores e plano de desenvolvimento individual.",
    features: ["Avaliações por competência", "Indicadores quantitativos e qualitativos", "Plano de desenvolvimento individual (PDI)"],
    tips: ["Faça avaliações trimestrais para acompanhamento contínuo"],
    relatedPanels: [{ label: "RH", path: "/rh" }, { label: "Feedbacks", path: "/rh/feedbacks" }],
  },

  "/rh/feedbacks": {
    title: "Feedbacks & 1:1",
    subtitle: "Feedback estruturado da equipe",
    description: "Central de feedbacks da equipe. Envie, receba e acompanhe feedbacks estruturados. Inclui templates e histórico por colaborador.",
    features: ["Feedback 360° entre equipe", "Templates de feedback pré-definidos", "Histórico completo por colaborador", "Agendamento de 1:1"],
    tips: ["Incentive feedbacks positivos além dos corretivos para cultura saudável"],
    relatedPanels: [{ label: "Desempenho", path: "/rh/desempenho" }, { label: "Clima", path: "/rh/clima" }],
  },

  "/rh/advertencias": {
    title: "Advertências",
    subtitle: "Registro de ocorrências",
    description: "Registro formal de advertências e ocorrências disciplinares. Mantenha o histórico para gestão transparente.",
    features: ["Registro formal com data e detalhes", "Classificação por tipo e gravidade", "Histórico por colaborador"],
    tips: ["Registre com detalhes para manter transparência e proteção legal"],
    relatedPanels: [{ label: "RH", path: "/rh" }, { label: "Documentos", path: "/rh/documentos" }],
  },

  "/rh/documentos": {
    title: "Contratos & Documentos",
    subtitle: "Gestão documental",
    description: "Gestão de contratos de trabalho, documentos obrigatórios e certidões com alertas automáticos de vencimento.",
    features: ["Upload e organização de documentos", "Alertas de vencimento automáticos", "Vinculação ao perfil do colaborador"],
    tips: ["Configure alertas com 30 dias de antecedência para renovações"],
    relatedPanels: [{ label: "Colaboradores", path: "/rh/colaboradores" }],
  },

  "/rh/permissoes": {
    title: "Permissões & Acessos",
    subtitle: "Controle de acesso por perfil",
    description: "Gerencie perfis de acesso (RBAC) da equipe. Defina o que cada cargo pode visualizar e executar no sistema.",
    features: ["Perfis: Admin, Gestor, Financeiro, Comercial, Operacional, Colaborador", "Permissões granulares por módulo", "Auditoria de acessos"],
    tips: ["Revise as permissões quando um colaborador mudar de cargo"],
    relatedPanels: [{ label: "RH", path: "/rh" }, { label: "Admin", path: "/admin/users" }],
  },

  "/rh/clima": {
    title: "Clima do Time",
    subtitle: "Pesquisa de clima organizacional",
    description: "Acompanhe o clima organizacional da equipe com pesquisas anônimas e indicadores de satisfação.",
    features: ["Pesquisas de clima periódicas", "Indicadores de satisfação por área", "Comparativo entre períodos"],
    tips: ["Faça pesquisas mensais curtas em vez de anuais longas"],
    relatedPanels: [{ label: "Feedbacks", path: "/rh/feedbacks" }],
  },

  "/rh/relatorios": {
    title: "Relatórios RH",
    subtitle: "Análises e métricas de pessoas",
    description: "Relatórios consolidados do módulo de RH: headcount, turnover, absenteísmo, custos com pessoal e mais.",
    features: ["Métricas de headcount e turnover", "Análise de absenteísmo", "Custo total com pessoal"],
    tips: ["Use os relatórios para embasar decisões de contratação e investimento em equipe"],
    relatedPanels: [{ label: "RH", path: "/rh" }],
  },

  "/rh/config": {
    title: "Configurações RH",
    subtitle: "Parâmetros do módulo",
    description: "Configure parâmetros do módulo de RH: jornadas, escalas, perfis de acesso, alertas e regras de bônus.",
    features: ["Jornadas e escalas de trabalho", "Cargos e áreas", "Regras de bônus configuráveis", "Alertas automáticos"],
    tips: ["Configure as regras antes de começar a usar o módulo para melhor resultado"],
    relatedPanels: [{ label: "RH", path: "/rh" }],
  },

  // ── Admin & Settings ──────────────────────────────
  "/admin/users": {
    title: "Usuários & Permissões",
    subtitle: "Gestão de acesso ao sistema",
    description: "Gerencie os usuários do sistema, convide novos membros, defina roles (admin, gestor, vendedor, operador) e controle permissões.",
    features: ["Lista de usuários com status", "Convite de novos usuários por email", "Definição de role e permissões", "Desativação de acesso"],
    steps: [
      { title: "Convide um usuário", detail: "Clique em 'Convidar' e informe o email. O novo usuário receberá um link para criar sua conta." },
      { title: "Defina o role", detail: "Selecione a role: Admin (acesso total), Gestor (equipe), Vendedor (vendas e clientes), Operador (operação)." },
      { title: "Gerencie acessos", detail: "Desative ou reative acessos sem deletar o usuário. Útil para afastamentos temporários." },
    ],
    tips: [
      "Use roles para limitar acesso — não dê admin para todos",
      "Desative acessos de colaboradores desligados imediatamente",
    ],
    relatedPanels: [{ label: "Permissões RH", path: "/rh/permissoes" }],
  },

  "/settings": {
    title: "Configurações",
    subtitle: "Configurações gerais do sistema",
    description: "Configurações gerais: dados da agência, preferências de interface, personalização de campos, moedas e integrações de terceiros.",
    features: ["Dados da empresa (nome, logo, contato)", "Moeda e formato de data", "Personalização de campos e formulários", "Configurações de email"],
    tips: ["Configure o logo e dados da empresa para que apareçam nas propostas e documentos"],
    relatedPanels: [{ label: "Admin", path: "/admin/users" }],
  },

  "/apresentacao": {
    title: "Apresentação Geral",
    subtitle: "Visão geral do sistema NatLeva",
    description: "Página de apresentação com visão geral de todos os módulos e funcionalidades do sistema NatLeva. Ideal para onboarding de novos usuários.",
    features: ["Tour pelos módulos principais", "Descrição de cada funcionalidade", "Links diretos para cada seção"],
    tips: ["Compartilhe esta página com novos membros da equipe para onboarding rápido"],
  },

  "/itinerario": {
    title: "Itinerários",
    subtitle: "Criação de roteiros de viagem",
    description: "Editor de itinerários dia a dia para viagens dos clientes. Inclua atividades, restaurantes, pontos turísticos e dicas para cada dia da viagem.",
    features: [
      "Editor visual dia a dia com arrastar e soltar",
      "Inclusão de atividades, restaurantes e pontos turísticos",
      "Geração de PDF para impressão e envio",
      "Compartilhamento via portal do cliente",
    ],
    steps: [
      { title: "Selecione a viagem", detail: "Escolha a viagem para a qual deseja criar o itinerário." },
      { title: "Monte dia a dia", detail: "Para cada dia, adicione atividades, restaurantes, transfers e dicas locais." },
      { title: "Gere o PDF", detail: "Quando concluir, gere o PDF para enviar ao cliente ou disponibilize no portal." },
    ],
    tips: [
      "Inclua endereços e horários de funcionamento para facilitar a viagem",
      "Use fotos dos locais para tornar o itinerário mais visual e atrativo",
    ],
    relatedPanels: [
      { label: "Viagens", path: "/viagens" },
      { label: "Portal Admin", path: "/portal-admin" },
    ],
  },

  "/analise-atendimento": {
    title: "Análise de Atendimento",
    subtitle: "Métricas de qualidade",
    description: "Análise detalhada da qualidade do atendimento com métricas de tempo de resposta, satisfação do cliente e taxa de conversão por canal e atendente.",
    features: ["Tempo de resposta por atendente", "Taxa de conversão por canal", "Análise de sentimento das conversas", "Comparativo entre períodos"],
    tips: ["Compare tempos de resposta entre atendentes para padronizar e melhorar o atendimento"],
    relatedPanels: [{ label: "Inbox", path: "/operacao/inbox" }, { label: "Dashboard", path: "/dashboard" }],
  },
};

// ──────────────────────────────────────────────────────────
//  RESOLVER
// ──────────────────────────────────────────────────────────

function getHelpForPath(pathname: string): PanelHelp | null {
  if (PANEL_HELP[pathname]) return PANEL_HELP[pathname];

  const parts = pathname.split("/").filter(Boolean);
  while (parts.length > 0) {
    const candidate = "/" + parts.join("/");
    if (PANEL_HELP[candidate]) return PANEL_HELP[candidate];
    parts.pop();
  }

  if (pathname.startsWith("/sales/")) return PANEL_HELP["/sales"];
  if (pathname.startsWith("/viagens/")) return PANEL_HELP["/viagens"];
  if (pathname.startsWith("/propostas/modelos/")) return PANEL_HELP["/propostas/modelos"];
  if (pathname.startsWith("/propostas/")) return PANEL_HELP["/propostas"];
  if (pathname.startsWith("/rh/")) return PANEL_HELP["/rh"];
  if (pathname.startsWith("/financeiro/")) return PANEL_HELP["/financeiro"];
  if (pathname.startsWith("/portal-admin/")) return PANEL_HELP["/portal-admin"];
  
  if (pathname.startsWith("/operacao/")) return PANEL_HELP["/operacao/inbox"];
  if (pathname.startsWith("/implementacao/")) return PANEL_HELP["/implementacao/base-conhecimento"];
  if (pathname.startsWith("/admin/")) return PANEL_HELP["/admin/users"];

  const pageName = pathname.split("/").filter(Boolean).pop() || "Página";
  const formattedName = pageName.charAt(0).toUpperCase() + pageName.slice(1).replace(/-/g, " ");
  return {
    title: formattedName,
    subtitle: "Informações do painel",
    description: `Painel de ${formattedName}. Use este espaço para gerenciar e visualizar informações relacionadas a este módulo.`,
    features: ["Visualização e gestão de dados", "Filtros e busca integrados", "Ações contextuais disponíveis"],
    tips: ["Explore os botões e menus para descobrir todas as funcionalidades"],
  };
}

// ──────────────────────────────────────────────────────────
//  TABS
// ──────────────────────────────────────────────────────────

type Tab = "overview" | "steps" | "faq";

export default function PanelHelpButton() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const help = getHelpForPath(location.pathname);

  if (!help) return null;

  const hasFaq = help.faq && help.faq.length > 0;
  const hasSteps = help.steps && help.steps.length > 0;

  const tabs: { id: Tab; label: string; icon: typeof BookOpen }[] = [
    { id: "overview", label: "Visão Geral", icon: BookOpen },
    ...(hasSteps ? [{ id: "steps" as Tab, label: "Passo a Passo", icon: ArrowRight }] : []),
    ...(hasFaq ? [{ id: "faq" as Tab, label: "Perguntas", icon: MessageCircleQuestion }] : []),
  ];

  return (
    <>
      <button
        onClick={() => { setOpen(true); setTab("overview"); }}
        className={cn(
          "fixed bottom-4 right-4 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full",
          "bg-card/90 backdrop-blur-md border border-border/60 shadow-sm",
          "text-[11px] text-muted-foreground font-medium",
          "hover:bg-card hover:text-foreground hover:shadow-md hover:border-border",
          "transition-all duration-200 group"
        )}
      >
        <HelpCircle className="w-3.5 h-3.5 group-hover:text-primary transition-colors" />
        <span className="hidden sm:inline">Entenda esse painel</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: "spring", duration: 0.45, bounce: 0.15 }}
              className="fixed bottom-6 right-6 z-50 w-[440px] max-h-[80vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="px-5 pt-5 pb-3 shrink-0" style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--accent) / 0.04))" }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">{help.title}</h3>
                      {help.subtitle && <p className="text-[11px] text-muted-foreground">{help.subtitle}</p>}
                    </div>
                  </div>
                  <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Tabs */}
                {tabs.length > 1 && (
                  <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
                    {tabs.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all",
                          tab === t.id
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <t.icon className="w-3.5 h-3.5" />
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {tab === "overview" && (
                  <>
                    {/* Description */}
                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                      {help.description}
                    </p>

                    {/* Features */}
                    <div>
                      <div className="flex items-center gap-2 mb-2.5">
                        <Layers className="w-4 h-4 text-primary" />
                        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Funcionalidades</h4>
                      </div>
                      <div className="space-y-1.5">
                        {help.features.map((f, i) => (
                          <div key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary/70 shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Warnings */}
                    {help.warnings && help.warnings.length > 0 && (
                      <div className="space-y-1.5">
                        {help.warnings.map((w, i) => (
                          <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-destructive/5 border border-destructive/15 text-xs text-destructive">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{w}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tips */}
                    {help.tips.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2.5">
                          <Lightbulb className="w-4 h-4 text-yellow-500" />
                          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Dicas de uso</h4>
                        </div>
                        <div className="space-y-1.5">
                          {help.tips.map((t, i) => (
                            <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted-foreground">
                              <Zap className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                              <span className="leading-relaxed">{t}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick actions */}
                    {help.quickActions && help.quickActions.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2.5">
                          <MousePointerClick className="w-4 h-4 text-accent-foreground" />
                          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Ações Rápidas</h4>
                        </div>
                        <div className="space-y-1">
                          {help.quickActions.map((a, i) => (
                            <div key={i} className="text-xs text-muted-foreground pl-1 flex items-center gap-2">
                              <ArrowRight className="w-3 h-3 text-primary/50 shrink-0" />
                              <span>{a}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Related panels */}
                    {help.relatedPanels && help.relatedPanels.length > 0 && (
                      <div className="pt-2 border-t border-border/40">
                        <div className="flex items-center gap-2 mb-2">
                          <Compass className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Painéis relacionados</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {help.relatedPanels.map((r, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setOpen(false);
                                window.location.href = r.path;
                              }}
                              className="text-[11px] px-2.5 py-1 rounded-full bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border/30 transition-all"
                            >
                              {r.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {tab === "steps" && hasSteps && (
                  <div className="space-y-3">
                    <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
                      Siga este passo a passo para usar este painel de forma eficiente:
                    </p>
                    {help.steps!.map((s, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center shrink-0">
                          <div className="w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">
                            {i + 1}
                          </div>
                          {i < help.steps!.length - 1 && (
                            <div className="w-px flex-1 bg-border/50 mt-1" />
                          )}
                        </div>
                        <div className="pb-4">
                          <h5 className="text-xs font-bold text-foreground mb-1">{s.title}</h5>
                          <p className="text-xs text-muted-foreground leading-relaxed">{s.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {tab === "faq" && hasFaq && (
                  <div className="space-y-3">
                    <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
                      Perguntas mais frequentes sobre este painel:
                    </p>
                    {help.faq!.map((f, i) => (
                      <div key={i} className="p-3 rounded-xl bg-muted/30 border border-border/30 space-y-1.5">
                        <div className="flex items-start gap-2">
                          <MessageCircleQuestion className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          <p className="text-xs font-semibold text-foreground">{f.q}</p>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed pl-5.5 ml-[22px]">{f.a}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
