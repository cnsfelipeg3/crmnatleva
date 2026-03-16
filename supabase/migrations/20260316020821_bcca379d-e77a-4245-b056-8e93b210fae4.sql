
CREATE TABLE public.ai_strategy_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL DEFAULT 'geral',
  title TEXT NOT NULL,
  description TEXT,
  rule TEXT NOT NULL,
  example TEXT,
  priority INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.ai_strategy_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active strategy rules"
  ON public.ai_strategy_knowledge FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage strategy rules"
  ON public.ai_strategy_knowledge FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Seed initial rules
INSERT INTO public.ai_strategy_knowledge (category, title, rule, example, priority) VALUES
('priorizacao_contexto', 'Briefing recente tem prioridade absoluta', 'Se houver briefing completo recente com destino, datas e estrutura de viagem, esse contexto deve ter prioridade absoluta sobre qualquer destino antigo da conversa. Um briefing detalhado recente AUTOMATICAMENTE invalida qualquer destino discutido no passado.', 'Cliente falou de San Andrés em dezembro 2025, mas enviou briefing completo de Japão em março 2026 → demanda atual = Japão.', 10),
('priorizacao_contexto', 'Separação temporal obrigatória', 'Identificar TODOS os ciclos de intenção na conversa e classificar cada um: cotacao_solicitada, proposta_enviada, viagem_realizada, cotacao_abandonada, demanda_ativa. NUNCA misturar viagens de ciclos diferentes.', 'San Andrés (2025) = cotação abandonada. Japão (2026) = demanda ativa.', 10),
('priorizacao_contexto', 'Histórico apenas como enriquecimento', 'O histórico de viagens passadas deve servir APENAS para entender preferências e perfil do cliente. NUNCA deve ser usado para definir o destino da proposta atual.', 'Cliente viajou para Dubai em 2024 → sabe-se que gosta de viagens premium, mas proposta atual deve ser do destino citado nas mensagens recentes.', 9),
('interpretacao_conversa', 'Sinais fortes de demanda ativa', 'Mensagens recentes contendo: destinos definidos, datas, voos, hotéis, roteiro, valores, passageiros ou estrutura de viagem indicam demanda ativa com confiança alta.', 'Cliente envia: "Quero Tokyo 3 noites + Osaka 3 noites, dezembro, 5 pessoas" → demanda ativa clara.', 10),
('interpretacao_conversa', 'Novo destino após proposta antiga', 'Se o cliente citar um novo destino após uma proposta anterior não fechada, considerar como início de novo ciclo. O ciclo anterior deve ser classificado como cotação abandonada ou não fechada.', 'Cliente recebeu proposta de Caribe, não respondeu, e 2 meses depois pergunta sobre Europa → Europa = novo ciclo.', 8),
('estrutura_proposta', 'Roteiro padrão Japão', 'Viagens ao Japão geralmente seguem padrão: 3 noites Tokyo, 2-3 noites Osaka, opcional bate-volta Kyoto. Considerar trens-bala (JR Pass). Sugerir experiências culturais: templos, gastronomia, jardins.', 'Japão 10 dias: 4 noites Tokyo + 3 noites Osaka + 2 noites Kyoto.', 7),
('estrutura_proposta', 'Roteiro padrão Disney/Orlando', 'Viagens Disney priorizar hotéis dentro ou próximos dos parques. Considerar pacotes com ingressos. Famílias com crianças: sugerir 5-7 noites mínimo para cobrir principais parques.', 'Orlando família: 6 noites, hotel Disney Resort, Magic Kingdom + Epcot + Hollywood Studios + Animal Kingdom.', 7),
('estrategia_comercial', 'Famílias com crianças', 'Famílias com crianças tendem a preferir hotéis com quartos conectados/conjugados, localização central, e atividades kid-friendly. Priorizar conforto e praticidade sobre luxo extremo.', 'Família com 2 crianças → sugerir hotel com piscina, próximo a transportes, quarto family room.', 7),
('estrategia_comercial', 'Cliente premium/alto ticket', 'Clientes com histórico de ticket médio alto devem receber sugestões premium: business class, hotéis 5 estrelas, experiências exclusivas. Não oferecer opções econômicas a menos que solicitem.', 'Cliente com ticket médio acima de R$ 50k → sugerir premium economy ou business, hotéis Ritz/Four Seasons.', 8),
('calibragem_preco', 'Faixa de preço Japão', 'Japão 10-14 dias faixa média NatLeva: R$ 90k – R$ 150k para casal em classe conforto/premium. Ajustar conforme número de passageiros e nível de hotel.', 'Casal, Japão 12 dias, hotéis 4-5 estrelas → faixa R$ 100k-R$ 130k.', 6),
('calibragem_preco', 'Faixa de preço Europa', 'Europa 10-15 dias faixa média NatLeva: R$ 60k – R$ 120k para casal em classe conforto. Varia muito conforme países e temporada.', 'Casal, Europa 14 dias (Paris+Roma+Londres), hotéis 4 estrelas → faixa R$ 80k-R$ 110k.', 6),
('boas_praticas_vendas', 'Sempre personalizar introdução', 'A introdução da proposta deve ser personalizada com o nome do cliente e referências ao que ele mencionou na conversa. Nunca usar textos genéricos.', 'Sandro mencionou que quer viajar com a família → "Sandro, preparamos um roteiro especial pelo Japão para você e sua família..."', 7);
