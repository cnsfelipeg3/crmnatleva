
DO $$
DECLARE
  fid_maya uuid := gen_random_uuid();
  fid_atlas uuid := gen_random_uuid();
  fid_habibi uuid := gen_random_uuid();
  fid_nemo uuid := gen_random_uuid();
  fid_dante uuid := gen_random_uuid();
  fid_luna uuid := gen_random_uuid();
  fid_nero uuid := gen_random_uuid();
  fid_iris uuid := gen_random_uuid();
  -- MAYA nodes
  nm1 uuid; nm2 uuid; nm3 uuid; nm4 uuid; nm5 uuid; nm6 uuid; nm7 uuid;
  -- ATLAS nodes
  na1 uuid; na2 uuid; na3 uuid; na4 uuid; na5 uuid; na6 uuid; na7 uuid; na8 uuid;
  -- HABIBI nodes
  nh1 uuid; nh2 uuid; nh3 uuid; nh4 uuid; nh5 uuid; nh6 uuid; nh7 uuid;
  -- NEMO nodes
  nn1 uuid; nn2 uuid; nn3 uuid; nn4 uuid; nn5 uuid; nn6 uuid; nn7 uuid;
  -- DANTE nodes
  nd1 uuid; nd2 uuid; nd3 uuid; nd4 uuid; nd5 uuid; nd6 uuid; nd7 uuid;
  -- LUNA nodes
  nl1 uuid; nl2 uuid; nl3 uuid; nl4 uuid; nl5 uuid; nl6 uuid; nl7 uuid;
  -- NERO nodes
  nr1 uuid; nr2 uuid; nr3 uuid; nr4 uuid; nr5 uuid; nr6 uuid; nr7 uuid; nr8 uuid;
  -- IRIS nodes
  ni1 uuid; ni2 uuid; ni3 uuid; ni4 uuid; ni5 uuid; ni6 uuid; ni7 uuid;
BEGIN
  -- Generate node UUIDs
  nm1:=gen_random_uuid(); nm2:=gen_random_uuid(); nm3:=gen_random_uuid(); nm4:=gen_random_uuid(); nm5:=gen_random_uuid(); nm6:=gen_random_uuid(); nm7:=gen_random_uuid();
  na1:=gen_random_uuid(); na2:=gen_random_uuid(); na3:=gen_random_uuid(); na4:=gen_random_uuid(); na5:=gen_random_uuid(); na6:=gen_random_uuid(); na7:=gen_random_uuid(); na8:=gen_random_uuid();
  nh1:=gen_random_uuid(); nh2:=gen_random_uuid(); nh3:=gen_random_uuid(); nh4:=gen_random_uuid(); nh5:=gen_random_uuid(); nh6:=gen_random_uuid(); nh7:=gen_random_uuid();
  nn1:=gen_random_uuid(); nn2:=gen_random_uuid(); nn3:=gen_random_uuid(); nn4:=gen_random_uuid(); nn5:=gen_random_uuid(); nn6:=gen_random_uuid(); nn7:=gen_random_uuid();
  nd1:=gen_random_uuid(); nd2:=gen_random_uuid(); nd3:=gen_random_uuid(); nd4:=gen_random_uuid(); nd5:=gen_random_uuid(); nd6:=gen_random_uuid(); nd7:=gen_random_uuid();
  nl1:=gen_random_uuid(); nl2:=gen_random_uuid(); nl3:=gen_random_uuid(); nl4:=gen_random_uuid(); nl5:=gen_random_uuid(); nl6:=gen_random_uuid(); nl7:=gen_random_uuid();
  nr1:=gen_random_uuid(); nr2:=gen_random_uuid(); nr3:=gen_random_uuid(); nr4:=gen_random_uuid(); nr5:=gen_random_uuid(); nr6:=gen_random_uuid(); nr7:=gen_random_uuid(); nr8:=gen_random_uuid();
  ni1:=gen_random_uuid(); ni2:=gen_random_uuid(); ni3:=gen_random_uuid(); ni4:=gen_random_uuid(); ni5:=gen_random_uuid(); ni6:=gen_random_uuid(); ni7:=gen_random_uuid();

  -- ═══ FLOWS ═══
  INSERT INTO automation_flows (id, name, description, status, is_template, version) VALUES
    (fid_maya, 'Fluxo de Boas-vindas e Qualificação Inicial', 'Workflow da MAYA: acolher lead, coletar nome, destino e perfil básico, transferir para ATLAS', 'active', false, 1),
    (fid_atlas, 'Fluxo de Qualificação SDR', 'Workflow do ATLAS: qualificação profunda com período, viajantes, perfil e orçamento', 'active', false, 1),
    (fid_habibi, 'Fluxo Especialista Dubai & Oriente', 'Workflow do HABIBI: apresentar destino, responder dúvidas, sugerir experiências', 'active', false, 1),
    (fid_nemo, 'Fluxo Especialista Orlando & Américas', 'Workflow do NEMO: apresentar destino, responder dúvidas, sugerir experiências', 'active', false, 1),
    (fid_dante, 'Fluxo Especialista Europa', 'Workflow do DANTE: apresentar destino, responder dúvidas, sugerir experiências', 'active', false, 1),
    (fid_luna, 'Fluxo de Montagem de Proposta', 'Workflow da LUNA: montar proposta personalizada, apresentar e responder dúvidas', 'active', false, 1),
    (fid_nero, 'Fluxo de Fechamento & Negociação', 'Workflow do NERO: follow-up, contornar objeções, criar urgência, fechar', 'active', false, 1),
    (fid_iris, 'Fluxo de Pós-venda & Fidelização', 'Workflow da IRIS: follow-ups D+1, D+7, D+30, NPS e indicação', 'active', false, 1);

  -- ═══ MAYA NODES ═══
  INSERT INTO automation_nodes (id, flow_id, node_type, label, position_x, position_y, config) VALUES
    (nm1, fid_maya, 'trigger', 'Lead entra em contato', 0, 0, '{"description":"Cliente enviou primeira mensagem via WhatsApp, Instagram ou site"}'),
    (nm2, fid_maya, 'ai_agent', 'Acolher e pedir nome', 250, 0, '{"agentId":"maya","description":"Saudação calorosa como Nath, perguntar o nome do cliente de forma natural"}'),
    (nm3, fid_maya, 'ai_agent', 'Descobrir destino de interesse', 500, 0, '{"agentId":"maya","description":"Perguntar pra onde quer viajar, com entusiasmo genuíno"}'),
    (nm4, fid_maya, 'ai_agent', 'Criar conexão e coletar perfil', 750, 0, '{"agentId":"maya","description":"Perguntar se é primeira vez, quem vai junto, construir rapport com mínimo 5 trocas"}'),
    (nm5, fid_maya, 'condition_if_else', 'Destino e perfil mínimo?', 1000, 0, '{"description":"Destino + quem vai + mínimo 5 trocas?","conditionYes":"Tudo coletado","conditionNo":"Falta info"}'),
    (nm6, fid_maya, 'handoff_transfer', 'Transferir para ATLAS', 1250, 0, '{"agentId":"maya","targetAgentId":"atlas","description":"Enviar para SDR com nome, destino, quem vai, tom da conversa"}'),
    (nm7, fid_maya, 'trigger', 'Lead qualificado no SDR', 1500, 0, '{"description":"ATLAS assume a qualificação profunda"}');
  INSERT INTO automation_edges (flow_id, source_node_id, target_node_id, label, source_handle, target_handle) VALUES
    (fid_maya, nm1, nm2, NULL, 'out', 'target'), (fid_maya, nm2, nm3, NULL, 'out', 'target'),
    (fid_maya, nm3, nm4, NULL, 'out', 'target'), (fid_maya, nm4, nm5, NULL, 'out', 'target'),
    (fid_maya, nm5, nm4, 'Não', 'no', 'target'), (fid_maya, nm5, nm6, 'Sim', 'yes', 'target'),
    (fid_maya, nm6, nm7, NULL, 'out', 'target');

  -- ═══ ATLAS NODES ═══
  INSERT INTO automation_nodes (id, flow_id, node_type, label, position_x, position_y, config) VALUES
    (na1, fid_atlas, 'trigger', 'Receber lead da MAYA', 0, 0, '{"description":"Lead qualificado com nome, destino e perfil básico"}'),
    (na2, fid_atlas, 'ai_agent', 'Coletar período/datas', 250, 0, '{"agentId":"atlas","description":"Quando pretende viajar, flexibilidade de datas"}'),
    (na3, fid_atlas, 'ai_agent', 'Coletar viajantes', 500, 0, '{"agentId":"atlas","description":"Quantas pessoas, idades, necessidades especiais"}'),
    (na4, fid_atlas, 'ai_agent', 'Coletar perfil de viagem', 750, 0, '{"agentId":"atlas","description":"Aventura, relax, gastronomia, cultura"}'),
    (na5, fid_atlas, 'ai_agent', 'Coletar orçamento', 1000, 0, '{"agentId":"atlas","description":"Faixa de investimento, por último e com naturalidade"}'),
    (na6, fid_atlas, 'condition_if_else', 'Perfil completo?', 1250, 0, '{"description":"Tem destino, período, viajantes e perfil?","conditionYes":"Completo","conditionNo":"Falta info"}'),
    (na7, fid_atlas, 'handoff_transfer', 'Transferir para especialista', 1500, 0, '{"agentId":"atlas","targetAgentId":"luna","description":"HABIBI se Dubai, NEMO se Orlando, DANTE se Europa, LUNA se genérico"}'),
    (na8, fid_atlas, 'trigger', 'Especialista assume', 1750, 0, '{"description":"Especialista recebe briefing completo"}');
  INSERT INTO automation_edges (flow_id, source_node_id, target_node_id, label, source_handle, target_handle) VALUES
    (fid_atlas, na1, na2, NULL, 'out', 'target'), (fid_atlas, na2, na3, NULL, 'out', 'target'),
    (fid_atlas, na3, na4, NULL, 'out', 'target'), (fid_atlas, na4, na5, NULL, 'out', 'target'),
    (fid_atlas, na5, na6, NULL, 'out', 'target'), (fid_atlas, na6, na5, 'Não', 'no', 'target'),
    (fid_atlas, na6, na7, 'Sim', 'yes', 'target'), (fid_atlas, na7, na8, NULL, 'out', 'target');

  -- ═══ HABIBI NODES ═══
  INSERT INTO automation_nodes (id, flow_id, node_type, label, position_x, position_y, config) VALUES
    (nh1, fid_habibi, 'trigger', 'Receber briefing do ATLAS', 0, 0, '{"description":"Lead com destino Dubai/Oriente"}'),
    (nh2, fid_habibi, 'ai_agent', 'Apresentar destino com paixão', 250, 0, '{"agentId":"habibi","description":"Entusiasmo genuíno sobre Dubai/Oriente, criar desejo"}'),
    (nh3, fid_habibi, 'ai_agent', 'Responder dúvidas', 500, 0, '{"agentId":"habibi","description":"Visto, clima, cultura, segurança"}'),
    (nh4, fid_habibi, 'ai_agent', 'Sugerir experiências', 750, 0, '{"agentId":"habibi","description":"Passeios, hotéis e experiências baseado no perfil"}'),
    (nh5, fid_habibi, 'condition_if_else', 'Pronto pra proposta?', 1000, 0, '{"description":"Engajado e quer avançar?","conditionYes":"Sim","conditionNo":"Ainda tem dúvidas"}'),
    (nh6, fid_habibi, 'handoff_transfer', 'Transferir para LUNA', 1250, 0, '{"agentId":"habibi","targetAgentId":"luna","description":"Briefing completo para proposta"}'),
    (nh7, fid_habibi, 'trigger', 'LUNA assume proposta', 1500, 0, '{"description":"LUNA monta proposta personalizada"}');
  INSERT INTO automation_edges (flow_id, source_node_id, target_node_id, label, source_handle, target_handle) VALUES
    (fid_habibi, nh1, nh2, NULL, 'out', 'target'), (fid_habibi, nh2, nh3, NULL, 'out', 'target'),
    (fid_habibi, nh3, nh4, NULL, 'out', 'target'), (fid_habibi, nh4, nh5, NULL, 'out', 'target'),
    (fid_habibi, nh5, nh3, 'Não', 'no', 'target'), (fid_habibi, nh5, nh6, 'Sim', 'yes', 'target'),
    (fid_habibi, nh6, nh7, NULL, 'out', 'target');

  -- ═══ NEMO NODES ═══
  INSERT INTO automation_nodes (id, flow_id, node_type, label, position_x, position_y, config) VALUES
    (nn1, fid_nemo, 'trigger', 'Receber briefing do ATLAS', 0, 0, '{"description":"Lead com destino Orlando/Américas"}'),
    (nn2, fid_nemo, 'ai_agent', 'Apresentar destino com paixão', 250, 0, '{"agentId":"nemo","description":"Entusiasmo sobre Orlando, Disney, parques"}'),
    (nn3, fid_nemo, 'ai_agent', 'Responder dúvidas', 500, 0, '{"agentId":"nemo","description":"Ingressos, roteiro de parques, hospedagem"}'),
    (nn4, fid_nemo, 'ai_agent', 'Sugerir experiências', 750, 0, '{"agentId":"nemo","description":"Roteiro de parques, hotéis e experiências"}'),
    (nn5, fid_nemo, 'condition_if_else', 'Pronto pra proposta?', 1000, 0, '{"description":"Engajado e quer avançar?","conditionYes":"Sim","conditionNo":"Ainda tem dúvidas"}'),
    (nn6, fid_nemo, 'handoff_transfer', 'Transferir para LUNA', 1250, 0, '{"agentId":"nemo","targetAgentId":"luna","description":"Briefing completo para proposta"}'),
    (nn7, fid_nemo, 'trigger', 'LUNA assume proposta', 1500, 0, '{"description":"LUNA monta proposta personalizada"}');
  INSERT INTO automation_edges (flow_id, source_node_id, target_node_id, label, source_handle, target_handle) VALUES
    (fid_nemo, nn1, nn2, NULL, 'out', 'target'), (fid_nemo, nn2, nn3, NULL, 'out', 'target'),
    (fid_nemo, nn3, nn4, NULL, 'out', 'target'), (fid_nemo, nn4, nn5, NULL, 'out', 'target'),
    (fid_nemo, nn5, nn3, 'Não', 'no', 'target'), (fid_nemo, nn5, nn6, 'Sim', 'yes', 'target'),
    (fid_nemo, nn6, nn7, NULL, 'out', 'target');

  -- ═══ DANTE NODES ═══
  INSERT INTO automation_nodes (id, flow_id, node_type, label, position_x, position_y, config) VALUES
    (nd1, fid_dante, 'trigger', 'Receber briefing do ATLAS', 0, 0, '{"description":"Lead com destino Europa"}'),
    (nd2, fid_dante, 'ai_agent', 'Apresentar destino com paixão', 250, 0, '{"agentId":"dante","description":"Entusiasmo sobre Europa, cultura, gastronomia"}'),
    (nd3, fid_dante, 'ai_agent', 'Responder dúvidas', 500, 0, '{"agentId":"dante","description":"Visto Schengen, clima, roteiro multi-país"}'),
    (nd4, fid_dante, 'ai_agent', 'Sugerir experiências', 750, 0, '{"agentId":"dante","description":"Roteiro cultural, hotéis boutique, experiências locais"}'),
    (nd5, fid_dante, 'condition_if_else', 'Pronto pra proposta?', 1000, 0, '{"description":"Engajado e quer avançar?","conditionYes":"Sim","conditionNo":"Ainda tem dúvidas"}'),
    (nd6, fid_dante, 'handoff_transfer', 'Transferir para LUNA', 1250, 0, '{"agentId":"dante","targetAgentId":"luna","description":"Briefing completo para proposta"}'),
    (nd7, fid_dante, 'trigger', 'LUNA assume proposta', 1500, 0, '{"description":"LUNA monta proposta personalizada"}');
  INSERT INTO automation_edges (flow_id, source_node_id, target_node_id, label, source_handle, target_handle) VALUES
    (fid_dante, nd1, nd2, NULL, 'out', 'target'), (fid_dante, nd2, nd3, NULL, 'out', 'target'),
    (fid_dante, nd3, nd4, NULL, 'out', 'target'), (fid_dante, nd4, nd5, NULL, 'out', 'target'),
    (fid_dante, nd5, nd3, 'Não', 'no', 'target'), (fid_dante, nd5, nd6, 'Sim', 'yes', 'target'),
    (fid_dante, nd6, nd7, NULL, 'out', 'target');

  -- ═══ LUNA NODES ═══
  INSERT INTO automation_nodes (id, flow_id, node_type, label, position_x, position_y, config) VALUES
    (nl1, fid_luna, 'trigger', 'Receber briefing do especialista', 0, 0, '{"description":"Lead com destino, perfil e preferências completas"}'),
    (nl2, fid_luna, 'ai_agent', 'Montar proposta personalizada', 250, 0, '{"agentId":"luna","description":"Criar proposta com voos, hotéis e experiências"}'),
    (nl3, fid_luna, 'ai_agent', 'Apresentar proposta', 500, 0, '{"agentId":"luna","description":"Enviar proposta com storytelling e diferenciais"}'),
    (nl4, fid_luna, 'ai_agent', 'Responder dúvidas da proposta', 750, 0, '{"agentId":"luna","description":"Esclarecer valores, condições, alterações"}'),
    (nl5, fid_luna, 'condition_if_else', 'Cliente quer avançar?', 1000, 0, '{"description":"Aprovou a proposta?","conditionYes":"Quer avançar","conditionNo":"Tem objeções"}'),
    (nl6, fid_luna, 'handoff_transfer', 'Transferir para NERO', 1250, 0, '{"agentId":"luna","targetAgentId":"nero","description":"Proposta aprovada para fechamento"}'),
    (nl7, fid_luna, 'trigger', 'NERO assume fechamento', 1500, 0, '{"description":"NERO inicia processo de fechamento"}');
  INSERT INTO automation_edges (flow_id, source_node_id, target_node_id, label, source_handle, target_handle) VALUES
    (fid_luna, nl1, nl2, NULL, 'out', 'target'), (fid_luna, nl2, nl3, NULL, 'out', 'target'),
    (fid_luna, nl3, nl4, NULL, 'out', 'target'), (fid_luna, nl4, nl5, NULL, 'out', 'target'),
    (fid_luna, nl5, nl4, 'Não', 'no', 'target'), (fid_luna, nl5, nl6, 'Sim', 'yes', 'target'),
    (fid_luna, nl6, nl7, NULL, 'out', 'target');

  -- ═══ NERO NODES ═══
  INSERT INTO automation_nodes (id, flow_id, node_type, label, position_x, position_y, config) VALUES
    (nr1, fid_nero, 'trigger', 'Receber proposta da LUNA', 0, 0, '{"description":"Proposta aprovada, pronta para fechamento"}'),
    (nr2, fid_nero, 'ai_agent', 'Follow-up sobre proposta', 250, 0, '{"agentId":"nero","description":"Retomar contato, reforçar benefícios"}'),
    (nr3, fid_nero, 'ai_agent', 'Contornar objeções', 500, 0, '{"agentId":"nero","description":"Identificar e contornar objeções com elegância"}'),
    (nr4, fid_nero, 'ai_agent', 'Criar urgência com elegância', 750, 0, '{"agentId":"nero","description":"Disponibilidade, sazonalidade, sem pressão artificial"}'),
    (nr5, fid_nero, 'condition_if_else', 'Fechou a venda?', 1000, 0, '{"description":"Cliente confirmou fechamento?","conditionYes":"Venda fechada","conditionNo":"Precisa mais follow-up"}'),
    (nr6, fid_nero, 'ai_agent', 'Reagendar follow-up', 1250, 200, '{"agentId":"nero","description":"Agendar próximo contato em 2-3 dias"}'),
    (nr7, fid_nero, 'handoff_transfer', 'Transferir para IRIS', 1250, 0, '{"agentId":"nero","targetAgentId":"iris","description":"Cliente fechado para pós-venda"}'),
    (nr8, fid_nero, 'trigger', 'IRIS assume pós-venda', 1500, 0, '{"description":"IRIS inicia acompanhamento"}');
  INSERT INTO automation_edges (flow_id, source_node_id, target_node_id, label, source_handle, target_handle) VALUES
    (fid_nero, nr1, nr2, NULL, 'out', 'target'), (fid_nero, nr2, nr3, NULL, 'out', 'target'),
    (fid_nero, nr3, nr4, NULL, 'out', 'target'), (fid_nero, nr4, nr5, NULL, 'out', 'target'),
    (fid_nero, nr5, nr6, 'Não', 'no', 'target'), (fid_nero, nr6, nr2, NULL, 'out', 'target'),
    (fid_nero, nr5, nr7, 'Sim', 'yes', 'target'), (fid_nero, nr7, nr8, NULL, 'out', 'target');

  -- ═══ IRIS NODES ═══
  INSERT INTO automation_nodes (id, flow_id, node_type, label, position_x, position_y, config) VALUES
    (ni1, fid_iris, 'trigger', 'Receber cliente do NERO', 0, 0, '{"description":"Cliente com venda confirmada"}'),
    (ni2, fid_iris, 'ai_agent', 'Follow-up D+1', 250, 0, '{"agentId":"iris","description":"Mensagem calorosa perguntando se está tudo certo"}'),
    (ni3, fid_iris, 'ai_agent', 'Follow-up D+7: NPS', 500, 0, '{"agentId":"iris","description":"Pedir avaliação, coletar NPS"}'),
    (ni4, fid_iris, 'condition_if_else', 'NPS alto (9-10)?', 750, 0, '{"description":"Nota alta?","conditionYes":"NPS 9-10","conditionNo":"NPS abaixo de 9"}'),
    (ni5, fid_iris, 'ai_agent', 'Pedir indicação', 1000, 0, '{"agentId":"iris","description":"Pedir indicação de forma natural e agradecida"}'),
    (ni6, fid_iris, 'ai_agent', 'Follow-up D+30: Próxima viagem', 1250, 0, '{"agentId":"iris","description":"Sugerir próxima viagem baseado no perfil"}'),
    (ni7, fid_iris, 'trigger', 'Ciclo completo', 1500, 0, '{"description":"Cliente fidelizado"}');
  INSERT INTO automation_edges (flow_id, source_node_id, target_node_id, label, source_handle, target_handle) VALUES
    (fid_iris, ni1, ni2, NULL, 'out', 'target'), (fid_iris, ni2, ni3, NULL, 'out', 'target'),
    (fid_iris, ni3, ni4, NULL, 'out', 'target'), (fid_iris, ni4, ni5, 'Sim', 'yes', 'target'),
    (fid_iris, ni4, ni6, 'Não', 'no', 'target'), (fid_iris, ni5, ni6, NULL, 'out', 'target'),
    (fid_iris, ni6, ni7, NULL, 'out', 'target');

  -- ═══ AUDIT LOG ═══
  INSERT INTO ai_team_audit_log (action_type, entity_type, entity_name, agent_id, agent_name, description) VALUES
    ('create', 'flow', 'Fluxo Boas-vindas e Qualificação', 'maya', 'MAYA', 'Workflow criado: 7 steps (início, acolher, destino, perfil, decisão, transferir ATLAS, fim)'),
    ('create', 'flow', 'Fluxo Qualificação SDR', 'atlas', 'ATLAS', 'Workflow criado: 8 steps (receber, período, viajantes, perfil, orçamento, decisão, transferir especialista, fim)'),
    ('create', 'flow', 'Fluxo Especialista Dubai', 'habibi', 'HABIBI', 'Workflow criado: 7 steps (receber, apresentar, dúvidas, experiências, decisão, transferir LUNA, fim)'),
    ('create', 'flow', 'Fluxo Especialista Orlando', 'nemo', 'NEMO', 'Workflow criado: 7 steps (receber, apresentar, dúvidas, experiências, decisão, transferir LUNA, fim)'),
    ('create', 'flow', 'Fluxo Especialista Europa', 'dante', 'DANTE', 'Workflow criado: 7 steps (receber, apresentar, dúvidas, experiências, decisão, transferir LUNA, fim)'),
    ('create', 'flow', 'Fluxo Montagem de Proposta', 'luna', 'LUNA', 'Workflow criado: 7 steps (receber, montar, apresentar, dúvidas, decisão, transferir NERO, fim)'),
    ('create', 'flow', 'Fluxo Fechamento & Negociação', 'nero', 'NERO', 'Workflow criado: 8 steps (receber, follow-up, objeções, urgência, decisão, reagendar/transferir IRIS, fim)'),
    ('create', 'flow', 'Fluxo Pós-venda & Fidelização', 'iris', 'IRIS', 'Workflow criado: 7 steps (receber, D+1, D+7 NPS, decisão NPS, indicação, D+30, fim)');
END $$;
