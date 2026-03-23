import { useState } from "react";
import { useLocation } from "react-router-dom";
import { HelpCircle, X, Lightbulb, BookOpen, MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface PanelHelp {
  title: string;
  description: string;
  features: string[];
  tips: string[];
}

const PANEL_HELP: Record<string, PanelHelp> = {
  "/dashboard": {
    title: "Dashboard",
    description: "Painel central de Business Intelligence da NatLeva. Aqui você encontra uma visão 360° de toda a operação: vendas, clientes, destinos, performance financeira e sazonalidade.",
    features: [
      "KPIs em tempo real com comparação de períodos",
      "Gráficos interativos com drill-down — clique em qualquer dado para explorar",
      "Heatmap de sazonalidade (estilo GitHub) cruzando dia da semana × mês",
      "Ranking de vendedores e análise de margem por destino",
      "Filtros por período, vendedor, destino e status",
    ],
    tips: [
      "Clique em qualquer KPI para ver as vendas detalhadas por trás do número",
      "Use os filtros de período para comparar meses e identificar tendências",
      "O mapa mostra a distribuição geográfica dos seus clientes",
    ],
  },
  "/vendas": {
    title: "Vendas",
    description: "Central de gestão de vendas. Visualize, filtre e gerencie todas as vendas da agência com status em tempo real.",
    features: [
      "Lista completa de vendas com busca e filtros avançados",
      "Status visual por cores: pendente, confirmada, cancelada",
      "Acesso rápido ao detalhe de cada venda",
      "Criação de nova venda com formulário inteligente",
    ],
    tips: [
      "Use a busca para encontrar vendas por nome do cliente, destino ou ID",
      "Clique em uma venda para ver todos os detalhes, voos, hotéis e pagamentos",
    ],
  },
  "/vendas/nova": {
    title: "Nova Venda",
    description: "Formulário completo para registro de uma nova venda. Preencha os dados do cliente, roteiro, voos, hospedagem e valores.",
    features: [
      "Autocomplete de clientes existentes",
      "Adição de múltiplos passageiros",
      "Registro de voos com busca por companhia aérea",
      "Hotéis e experiências vinculados à venda",
      "Cálculo automático de valores e parcelas",
    ],
    tips: [
      "Comece selecionando o cliente — os dados serão preenchidos automaticamente",
      "Você pode salvar a venda parcialmente e completar depois",
    ],
  },
  "/passageiros": {
    title: "Passageiros",
    description: "Cadastro completo de todos os passageiros da agência. Gerencie documentos, preferências e histórico de viagens.",
    features: [
      "Lista com busca e filtros por nome, documento ou status",
      "Perfil detalhado de cada passageiro com histórico",
      "Gestão de documentos (passaporte, visto, vacinas)",
      "Preferências de viagem (assento, refeição, cia aérea)",
    ],
    tips: [
      "Mantenha os documentos atualizados para evitar problemas no embarque",
      "O perfil do passageiro mostra automaticamente todas as viagens realizadas",
    ],
  },
  "/clientes": {
    title: "Inteligência de Clientes",
    description: "Visão estratégica da sua base de clientes com scoring, segmentação e recomendações de IA.",
    features: [
      "Score de cada cliente baseado em histórico e engajamento",
      "Segmentação automática (VIP, recorrente, novo, inativo)",
      "Recomendações de destinos baseadas em preferências",
      "Timeline completa de interações e viagens",
    ],
    tips: [
      "Clique em um cliente para ver seu perfil completo com timeline",
      "Use os filtros de segmento para campanhas direcionadas",
    ],
  },
  "/checkin": {
    title: "Check-in",
    description: "Gestão centralizada de tarefas de check-in para todos os voos dos clientes. Nunca perca uma janela de check-in.",
    features: [
      "Lista de check-ins pendentes ordenada por urgência",
      "Alertas automáticos de janela de check-in abrindo",
      "Links diretos para o check-in de cada companhia aérea",
      "Registro de evidências e confirmações",
    ],
    tips: [
      "Os check-ins são ordenados por prioridade — foque nos vermelhos primeiro",
      "Registre o assento selecionado para referência do cliente",
    ],
  },
  "/hospedagem": {
    title: "Hospedagem",
    description: "Central de gestão de reservas de hospedagem com detalhes de hotéis, datas e status de confirmação.",
    features: [
      "Lista de todas as reservas de hotel ativas",
      "Detalhes de check-in/check-out e tipo de quarto",
      "Status de confirmação com fornecedor",
      "Galeria de fotos dos hotéis",
    ],
    tips: [
      "Verifique as políticas de cancelamento antes de confirmar alterações",
      "A galeria de fotos pode ser compartilhada com o cliente",
    ],
  },
  "/viagens": {
    title: "Viagens",
    description: "Visão consolidada de todas as viagens em andamento, futuras e concluídas. Gerencie roteiros completos.",
    features: [
      "Timeline visual de todas as viagens",
      "Detalhamento do roteiro completo por viagem",
      "Status em tempo real de cada etapa",
      "Mapa de rotas e destinos",
    ],
    tips: [
      "Use a visualização de mapa para ter uma visão geográfica das viagens",
      "Clique em uma viagem para acessar o roteiro detalhado",
    ],
  },
  "/propostas": {
    title: "Propostas",
    description: "Criação e gestão de propostas comerciais imersivas. Gere landing pages exclusivas para cada cliente com branding NatLeva.",
    features: [
      "Editor visual de propostas com preview em tempo real",
      "Templates personalizáveis com cores, fontes e layout",
      "Envio por link para o cliente com tracking de engajamento",
      "Métricas de visualização: tempo de leitura, scroll e cliques",
    ],
    tips: [
      "Use 'Gerenciar Modelos' para padronizar propostas da agência",
      "O tracking mostra exatamente o que o cliente mais olhou na proposta",
    ],
  },
  "/propostas/modelos": {
    title: "Modelos de Propostas",
    description: "Central de configuração de templates visuais para propostas. Defina padrões de cores, fontes e layout para toda a agência.",
    features: [
      "Criação de modelos com editor visual avançado",
      "Paletas de cores e combinações de fontes pré-definidas",
      "Configuração de seções (hero, destinos, voos, hotéis, valores)",
      "Sugestões inteligentes de IA para estilos por tipo de viagem",
    ],
    tips: [
      "Defina um modelo como 'padrão' para usar automaticamente em novas propostas",
      "Use as sugestões de IA para criar modelos temáticos rapidamente",
    ],
  },
  "/pendencias": {
    title: "Pendências",
    description: "Lista centralizada de todas as tarefas pendentes e ações necessárias na agência.",
    features: [
      "Tarefas organizadas por prioridade e prazo",
      "Filtros por tipo, responsável e status",
      "Vinculação automática com vendas e viagens",
      "Notificações de prazos próximos",
    ],
    tips: [
      "Revise as pendências diariamente para manter o fluxo organizado",
      "Use os filtros para focar nas tarefas mais urgentes",
    ],
  },
  "/aniversarios": {
    title: "Aniversários",
    description: "Calendário de aniversários dos clientes e passageiros para ações de relacionamento.",
    features: [
      "Lista de aniversariantes do mês",
      "Calendário visual com destaque",
      "Ações rápidas: enviar mensagem, criar proposta especial",
    ],
    tips: [
      "Aproveite aniversários para enviar propostas personalizadas",
      "Configure lembretes automáticos para não perder nenhuma data",
    ],
  },
  "/operacao/inbox": {
    title: "Inbox de Conversas",
    description: "Central de comunicação unificada com todos os canais de atendimento. WhatsApp, mensagens e interações em um só lugar.",
    features: [
      "Conversas em tempo real com atualização automática",
      "Pipeline visual de estágios (lead → proposta → fechamento)",
      "Sugestões de IA para respostas e próximos passos",
      "Vinculação de conversas com vendas e clientes",
      "Áudio, imagens e documentos integrados",
    ],
    tips: [
      "Use as sugestões da IA para agilizar respostas",
      "Vincule conversas a clientes para manter o histórico completo",
      "O pipeline ajuda a visualizar o funil de vendas por mensagem",
    ],
  },
  "/operacao/flow-builder": {
    title: "Flow Builder",
    description: "Construtor visual de automações e fluxos de trabalho. Crie chatbots, automações de follow-up e workflows operacionais.",
    features: [
      "Editor drag-and-drop de fluxos com blocos conectáveis",
      "Blocos de IA, condições, ações e integrações",
      "Templates prontos para cenários comuns",
      "Simulador para testar fluxos antes de ativar",
    ],
    tips: [
      "Comece com um template e personalize conforme sua necessidade",
      "Use o simulador para validar o comportamento antes de publicar",
    ],
  },
  "/operacao/integracoes": {
    title: "Integrações",
    description: "Central de configuração de integrações com ferramentas externas: WhatsApp, APIs, serviços de pagamento e mais.",
    features: [
      "Conexão com WhatsApp Business API",
      "Integração com gateways de pagamento",
      "APIs de busca de voos e hotéis",
      "Logs de execução e monitoramento",
    ],
    tips: [
      "Verifique o status das integrações regularmente para evitar interrupções",
      "Use os logs para diagnosticar problemas de comunicação",
    ],
  },
  "/operacao/tags-pipeline": {
    title: "Tags & Pipeline",
    description: "Gestão de tags e configuração do pipeline de vendas. Organize e categorize conversas e negociações.",
    features: [
      "Criação e edição de tags personalizadas",
      "Configuração de estágios do pipeline",
      "Cores e ícones personalizados por tag",
      "Regras automáticas de atribuição",
    ],
    tips: [
      "Mantenha tags simples e padronizadas para facilitar a busca",
      "Configure o pipeline refletindo seu processo real de vendas",
    ],
  },
  "/operacao/logs": {
    title: "Logs de Execução",
    description: "Monitoramento detalhado de todas as execuções de IA, automações e integrações do sistema.",
    features: [
      "Histórico completo de chamadas de IA",
      "Tempo de resposta e custo estimado por execução",
      "Filtros por tipo, status e período",
      "Detalhamento de erros para diagnóstico",
    ],
    tips: [
      "Use os filtros de erro para identificar rapidamente problemas",
      "Monitore os custos de IA para otimizar o uso",
    ],
  },
  "/operacao/simulador": {
    title: "Simulador de Operação",
    description: "Ambiente de teste para simular fluxos, automações e interações de IA antes de colocá-los em produção.",
    features: [
      "Simulação de conversas com chatbot",
      "Teste de fluxos de automação",
      "Validação de regras e condições",
    ],
    tips: [
      "Sempre teste novos fluxos aqui antes de ativar para clientes reais",
    ],
  },
  "/financeiro": {
    title: "Financeiro",
    description: "Mini-ERP financeiro da agência. Controle completo de receitas, despesas, comissões e fluxo de caixa.",
    features: [
      "Dashboard financeiro com KPIs de receita e despesa",
      "Contas a receber e a pagar com vencimentos",
      "Fluxo de caixa projetado",
      "DRE — Demonstração de Resultado do Exercício",
      "Gestão de fornecedores e comissões",
    ],
    tips: [
      "Revise o fluxo de caixa semanalmente para antecipar necessidades",
      "Use o DRE para análise mensal de rentabilidade",
    ],
  },
  "/financeiro/contas-receber": {
    title: "Contas a Receber",
    description: "Gestão de todos os recebíveis da agência: parcelas de clientes, comissões de fornecedores e demais entradas.",
    features: [
      "Lista de recebíveis por cliente e venda",
      "Filtros por status: pendente, recebido, atrasado",
      "Registro de recebimento com data e forma de pagamento",
      "Cálculo automático de taxas e fees",
    ],
    tips: [
      "Monitore os atrasados diariamente para ações de cobrança rápidas",
    ],
  },
  "/financeiro/contas-pagar": {
    title: "Contas a Pagar",
    description: "Controle de todas as obrigações financeiras: fornecedores, despesas operacionais e custos de viagem.",
    features: [
      "Cadastro de contas por fornecedor e categoria",
      "Alertas de vencimento próximo",
      "Controle de parcelas e recorrências",
      "Vinculação com vendas e plano de contas",
    ],
    tips: [
      "Vincule contas a pagar com vendas para análise de margem precisa",
    ],
  },
  "/financeiro/fluxo-caixa": {
    title: "Fluxo de Caixa",
    description: "Projeção e acompanhamento do fluxo de caixa da agência com visão diária, semanal e mensal.",
    features: [
      "Gráfico de entradas vs saídas ao longo do tempo",
      "Projeção futura baseada em contas programadas",
      "Saldo acumulado dia a dia",
    ],
    tips: [
      "Use a projeção para planejar investimentos e evitar descoberto",
    ],
  },
  "/financeiro/fornecedores": {
    title: "Fornecedores",
    description: "Cadastro e gestão de fornecedores da agência: operadoras, hotéis, companhias aéreas e serviços.",
    features: [
      "Cadastro completo com dados de contato e bancários",
      "Histórico de transações por fornecedor",
      "Avaliação e notas sobre cada fornecedor",
    ],
    tips: [
      "Mantenha os dados bancários atualizados para agilizar pagamentos",
    ],
  },
  "/financeiro/comissoes": {
    title: "Comissões",
    description: "Gestão de comissões dos vendedores e parceiros. Cálculo automático baseado nas vendas realizadas.",
    features: [
      "Cálculo automático de comissões por venda",
      "Regras de comissão por vendedor ou faixa de valor",
      "Relatório de comissões pagas e pendentes",
    ],
    tips: [
      "Configure as regras de comissão por vendedor para cálculo automático",
    ],
  },
  "/financeiro/dre": {
    title: "DRE — Resultado do Exercício",
    description: "Demonstração de Resultado do Exercício com visão consolidada de receitas, custos e lucro da agência.",
    features: [
      "Relatório DRE mensal e anual",
      "Categorização automática por plano de contas",
      "Comparativo entre períodos",
    ],
    tips: [
      "Compare mês a mês para identificar tendências de rentabilidade",
    ],
  },
  "/financeiro/taxas-tarifas": {
    title: "Taxas e Tarifas",
    description: "Configuração de taxas de cartão, tarifas bancárias e fees operacionais que impactam a receita líquida.",
    features: [
      "Cadastro de taxas por bandeira e meio de pagamento",
      "Simulador de impacto nas margens",
    ],
    tips: [
      "Mantenha as taxas atualizadas para cálculos de margem precisos",
    ],
  },
  "/financeiro/plano-contas": {
    title: "Plano de Contas",
    description: "Estrutura contábil de categorias para classificação de receitas e despesas.",
    features: [
      "Hierarquia de contas (receita, despesa, custo)",
      "Criação de subcontas personalizadas",
      "Vinculação com DRE e relatórios",
    ],
    tips: [
      "Organize o plano de contas refletindo a estrutura real da sua operação",
    ],
  },
  "/rh": {
    title: "Recursos Humanos",
    description: "Módulo completo de gestão de pessoas: colaboradores, ponto, folha, metas, feedbacks e documentos.",
    features: [
      "Cadastro de colaboradores com dados completos",
      "Controle de ponto e jornada",
      "Folha de pagamento e benefícios",
      "Avaliação de desempenho e metas",
      "Gestão de contratos e documentos",
    ],
    tips: [
      "Use o módulo de feedback para manter a equipe engajada",
      "Configure alertas de vencimento de contratos e documentos",
    ],
  },
  "/rh/colaboradores": {
    title: "Colaboradores",
    description: "Cadastro completo de todos os colaboradores da agência com dados pessoais, cargos e histórico.",
    features: ["Perfil completo de cada colaborador", "Histórico de cargos e salários", "Documentos e contratos vinculados"],
    tips: ["Mantenha os dados atualizados para relatórios precisos"],
  },
  "/rh/ponto": {
    title: "Controle de Ponto",
    description: "Registro e acompanhamento da jornada de trabalho dos colaboradores.",
    features: ["Registro de entrada e saída", "Banco de horas", "Relatórios de horas trabalhadas"],
    tips: ["Revise os registros semanalmente para evitar acúmulo de ajustes"],
  },
  "/rh/folha-pagamentos": {
    title: "Folha de Pagamentos",
    description: "Processamento e gestão da folha de pagamento mensal dos colaboradores.",
    features: ["Cálculo automático de salários e descontos", "Histórico de pagamentos", "Exportação para contabilidade"],
    tips: ["Confira os descontos antes de fechar a folha do mês"],
  },
  "/rh/metas-bonus": {
    title: "Metas & Bônus",
    description: "Definição e acompanhamento de metas individuais e de equipe com cálculo de bônus.",
    features: ["Metas por vendedor e por equipe", "Tracking de progresso em tempo real", "Cálculo automático de bônus"],
    tips: ["Defina metas SMART — específicas, mensuráveis e com prazo"],
  },
  "/rh/desempenho": {
    title: "Desempenho",
    description: "Avaliação de desempenho dos colaboradores com métricas e feedbacks estruturados.",
    features: ["Avaliações periódicas", "Competências e indicadores", "Plano de desenvolvimento individual"],
    tips: ["Faça avaliações trimestrais para acompanhamento contínuo"],
  },
  "/rh/feedbacks": {
    title: "Feedbacks",
    description: "Central de feedbacks da equipe — envie, receba e acompanhe feedbacks estruturados.",
    features: ["Feedback 360° entre equipe", "Histórico de feedbacks por colaborador", "Templates de feedback"],
    tips: ["Incentive feedbacks positivos além dos corretivos"],
  },
  "/configuracoes": {
    title: "Configurações",
    description: "Configurações gerais do sistema: dados da agência, preferências, integrações e personalização.",
    features: [
      "Dados da empresa (nome, logo, contato)",
      "Configuração de moedas e idioma",
      "Personalização de campos e formulários",
      "Gestão de usuários e permissões",
    ],
    tips: [
      "Configure o logo e dados da empresa para que apareçam nas propostas",
    ],
  },
  "/ai-team": {
    title: "AI Team",
    description: "Central de comando dos agentes de IA da NatLeva. Gerencie, monitore e configure os agentes inteligentes que automatizam processos.",
    features: [
      "Visão geral dos agentes ativos e seus status",
      "Criação de novos agentes com habilidades específicas",
      "Monitoramento de tarefas executadas por IA",
      "Escritório 3D interativo com os agentes",
    ],
    tips: [
      "Cada agente tem especialidades — distribua tarefas de acordo",
      "Use o escritório 3D para uma visão gamificada da equipe de IA",
    ],
  },
  "/implementacao/estrategia-ia": {
    title: "Estratégia IA",
    description: "Base de conhecimento estratégico que guia o comportamento da IA. Defina regras, prioridades e diretrizes.",
    features: [
      "Regras de negócio organizadas por categoria e prioridade",
      "Importação e exportação de regras em TXT",
      "Ativação/desativação individual de regras",
      "Tags e categorias para organização avançada",
    ],
    tips: [
      "Regras com prioridade P100 são invioláveis pela IA",
      "Use tags para agrupar regras relacionadas",
    ],
  },
  "/implementacao/aprendizados-ia": {
    title: "Aprendizados IA",
    description: "Painel de padrões detectados automaticamente pela IA a partir de dados de vendas, conversas e propostas.",
    features: [
      "Padrões detectados com nível de confiança",
      "Promoção de padrões para regras oficiais",
      "Análise de impacto estimado",
    ],
    tips: [
      "Revise os aprendizados semanalmente e promova os mais relevantes",
    ],
  },
  "/implementacao/cerebro-natleva": {
    title: "Cérebro NatLeva",
    description: "Interface de chat avançada com a IA central da NatLeva. Faça perguntas sobre dados, peça análises e receba insights.",
    features: [
      "Chat em linguagem natural com a IA",
      "Acesso a dados de vendas, clientes e operação",
      "Geração de relatórios e análises sob demanda",
    ],
    tips: [
      "Seja específico nas perguntas para respostas mais precisas",
      "Pergunte sobre tendências, comparações e projeções",
    ],
  },
  "/implementacao/base-conhecimento": {
    title: "Base de Conhecimento",
    description: "Repositório de documentos, guias e materiais de referência para consulta da equipe e da IA.",
    features: [
      "Upload de documentos (PDF, TXT, etc.)",
      "Categorização por área (vendas, operação, produto)",
      "Busca por conteúdo",
    ],
    tips: [
      "Mantenha a base atualizada para que a IA tenha informações precisas",
    ],
  },
  "/portal-admin": {
    title: "Portal Admin",
    description: "Administração do portal do cliente. Configure o que os clientes veem, gerencie acessos e monitore interações.",
    features: [
      "Dashboard de uso do portal pelos clientes",
      "Gestão de acessos e convites",
      "Configuração de conteúdo visível",
      "Monitoramento de notificações enviadas",
    ],
    tips: [
      "Monitore quais clientes acessam o portal para priorizar o suporte",
    ],
  },
  "/import": {
    title: "Importar Dados",
    description: "Ferramenta de importação em massa de dados: clientes, vendas, passageiros e mais a partir de planilhas.",
    features: [
      "Upload de planilhas Excel e CSV",
      "Mapeamento automático de colunas",
      "Validação de dados antes da importação",
      "Log de importação com erros e sucessos",
    ],
    tips: [
      "Use o template de exemplo para formatar seus dados antes do upload",
      "Revise os erros de validação antes de confirmar a importação",
    ],
  },
  "/livechat": {
    title: "Live Chat",
    description: "Atendimento ao vivo com clientes via WhatsApp e chat. Visualize conversas, envie mensagens e use IA para sugestões.",
    features: [
      "Chat em tempo real com clientes",
      "Sugestões de IA para respostas",
      "Painel de contexto do cliente",
      "Envio de áudios, imagens e documentos",
    ],
    tips: [
      "Use as sugestões da IA como base e personalize antes de enviar",
      "O painel de contexto mostra o histórico completo do cliente",
    ],
  },
  "/itinerario": {
    title: "Itinerários",
    description: "Criação e gestão de itinerários de viagem detalhados para os clientes.",
    features: [
      "Editor de itinerário dia a dia",
      "Inclusão de atividades, restaurantes e dicas",
      "Geração de PDF para impressão",
      "Compartilhamento com o cliente via portal",
    ],
    tips: [
      "Inclua detalhes como endereços e horários para facilitar a viagem do cliente",
    ],
  },
  "/natleva-intelligence": {
    title: "NatLeva Intelligence",
    description: "Painel de inteligência operacional com insights de IA sobre a performance da agência.",
    features: [
      "Insights gerados automaticamente pela IA",
      "Alertas de oportunidades e riscos",
      "Recomendações de ações baseadas em dados",
    ],
    tips: [
      "Revise os insights diariamente para tomar decisões proativas",
    ],
  },
  "/analise-atendimento": {
    title: "Análise de Atendimento",
    description: "Análise detalhada da qualidade do atendimento com métricas de tempo de resposta, satisfação e conversão.",
    features: [
      "Métricas de tempo de resposta por atendente",
      "Taxa de conversão por canal",
      "Análise de sentimento das conversas",
    ],
    tips: [
      "Compare o tempo de resposta entre atendentes para padronizar",
    ],
  },
};

function getHelpForPath(pathname: string): PanelHelp | null {
  // Exact match first
  if (PANEL_HELP[pathname]) return PANEL_HELP[pathname];

  // Try parent paths
  const parts = pathname.split("/").filter(Boolean);
  while (parts.length > 0) {
    const candidate = "/" + parts.join("/");
    if (PANEL_HELP[candidate]) return PANEL_HELP[candidate];
    parts.pop();
  }

  // Fallback for dynamic routes
  if (pathname.startsWith("/vendas/")) return PANEL_HELP["/vendas"];
  if (pathname.startsWith("/clientes/")) return PANEL_HELP["/clientes"];
  if (pathname.startsWith("/viagens/")) return PANEL_HELP["/viagens"];
  if (pathname.startsWith("/propostas/modelos/")) return PANEL_HELP["/propostas/modelos"];
  if (pathname.startsWith("/propostas/")) return PANEL_HELP["/propostas"];
  if (pathname.startsWith("/rh/")) return PANEL_HELP["/rh"];
  if (pathname.startsWith("/financeiro/")) return PANEL_HELP["/financeiro"];
  if (pathname.startsWith("/portal-admin/")) return PANEL_HELP["/portal-admin"];
  if (pathname.startsWith("/ai-team/")) return PANEL_HELP["/ai-team"];
  if (pathname.startsWith("/operacao/")) return { title: "Operação", description: "Módulo de operação diária da agência.", features: ["Gestão de processos operacionais"], tips: ["Explore os submódulos para funcionalidades específicas"] };
  if (pathname.startsWith("/configuracoes/")) return PANEL_HELP["/configuracoes"];

  // Fallback genérico para qualquer rota não mapeada
  const pageName = pathname.split("/").filter(Boolean).pop() || "Página";
  const formattedName = pageName.charAt(0).toUpperCase() + pageName.slice(1).replace(/-/g, " ");
  return {
    title: formattedName,
    description: `Painel de ${formattedName}. Use este espaço para gerenciar e visualizar informações relacionadas.`,
    features: ["Visualização e gestão de dados", "Filtros e busca integrados", "Ações contextuais disponíveis"],
    tips: ["Explore os botões e menus para descobrir todas as funcionalidades disponíveis"],
  };
}

export default function PanelHelpButton() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const help = getHelpForPath(location.pathname);

  if (!help) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
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
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
              className="fixed bottom-6 right-6 z-50 w-[380px] max-h-[70vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="px-5 pt-5 pb-4 border-b border-border/50 shrink-0" style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.06), hsl(var(--accent) / 0.04))" }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">{help.title}</h3>
                      <p className="text-[10px] text-muted-foreground">Guia do painel</p>
                    </div>
                  </div>
                  <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {help.description}
                </p>

                {/* Features */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-primary" />
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">Funcionalidades</h4>
                  </div>
                  <div className="space-y-2">
                    {help.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0 mt-1.5" />
                        <span className="leading-relaxed">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tips */}
                {help.tips.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <MousePointerClick className="w-4 h-4 text-accent" />
                      <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">Dicas de uso</h4>
                    </div>
                    <div className="space-y-2">
                      {help.tips.map((t, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border/30 text-xs text-muted-foreground">
                          <span className="text-accent font-bold shrink-0">💡</span>
                          <span className="leading-relaxed">{t}</span>
                        </div>
                      ))}
                    </div>
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
