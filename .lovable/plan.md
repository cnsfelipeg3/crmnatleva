# Ecossistema do Afiliado · Plano de Construção

Vamos transformar o `/vitrine` em uma plataforma completa pro afiliado, no estilo de programas de indicação profissionais (Hotmart, Booking Partner, etc). A vitrine de pacotes (atual) vira só uma das abas dentro de um painel maior.

## Nova estrutura de navegação (dentro de `/vitrine`)

Sidebar lateral fixa (estilo dashboard SaaS), com tema verde escuro/dourado da NatLeva:

```text
/vitrine                      Home · visão geral do afiliado
/vitrine/pacotes              Vitrine de pacotes (o que existe hoje)
/vitrine/indicacoes           Minhas indicações · pipeline de leads enviados
/vitrine/comissoes            Extrato financeiro · pagamentos PIX
/vitrine/metas                Metas e progresso do mês
/vitrine/premiacoes           Bônus, ranking e conquistas
/vitrine/materiais            Kit de divulgação (links, imagens, textos prontos)
/vitrine/perfil               Dados pessoais, PIX, foto
```

## 1 · Home (`/vitrine`)

Painel inicial com:
- Saudação personalizada · "Olá, [nome] · você está no nível Prata"
- 4 KPIs principais · Comissão do mês · Indicações ativas · Conversões · Saldo a receber
- Card grande "Próxima meta" com barra de progresso
- Últimas 5 indicações (mini timeline)
- 3 pacotes em destaque (atalho pra vitrine)
- Ranking · sua posição entre os afiliados do mês

## 2 · Vitrine de pacotes (`/vitrine/pacotes`)

O que já existe hoje (Indique & Ganhe) · só renomear a rota.

## 3 · Minhas indicações (`/vitrine/indicacoes`)

Tabela com cada lead/cliente que o afiliado indicou:
- Status: Novo lead · Em negociação · Proposta enviada · Fechado · Perdido
- Pacote indicado · valor potencial de comissão · data
- Timeline visual de cada indicação

## 4 · Comissões (`/vitrine/comissoes`)

- Saldo disponível · Saldo pendente · Total recebido (lifetime)
- Extrato detalhado: data · cliente · pacote · % · valor · status PIX
- Filtros por período, status (pago/pendente/cancelado)
- Botão "Solicitar saque" (se houver saldo)
- Histórico de pagamentos com comprovantes

## 5 · Metas (`/vitrine/metas`)

- Meta do mês definida pela NatLeva (ex: 5 conversões = bônus de R$500)
- Barra de progresso animada
- Histórico de metas batidas
- Próximas metas desbloqueadas conforme nível

## 6 · Premiações (`/vitrine/premiacoes`)

- Sistema de níveis · Bronze → Prata → Ouro → Diamante
- Conquistas/badges (1ª venda, 10 indicações, top 3 do mês…)
- Ranking mensal dos afiliados (com privacidade · só primeiro nome)
- Bônus especiais ativos · ex: "Dobro de comissão em Foz neste mês"

## 7 · Materiais (`/vitrine/materiais`)

- Link personalizado de afiliado (com tracking ?ref=)
- Imagens prontas pra Instagram/Stories
- Textos prontos pra WhatsApp
- Botão copiar com 1 clique
- QR Code do link pessoal

## 8 · Perfil (`/vitrine/perfil`)

- Dados pessoais, foto, bio
- Chave PIX (obrigatória pra receber)
- Dados bancários alternativos
- Configurações de notificação (WhatsApp/Email)

## Backend · novas tabelas

- `affiliate_referrals` · leads indicados (affiliate_id, customer_phone, sale_id, status, potential_commission)
- `affiliate_commissions` · registro de comissão por venda (affiliate_id, sale_id, amount, status: pendente/disponivel/pago, paid_at)
- `affiliate_goals` · metas configuradas pela NatLeva
- `affiliate_achievements` · badges/conquistas conquistadas
- `affiliate_levels` · nível atual do afiliado (calculado por volume de vendas)
- `affiliate_materials` · biblioteca de materiais de marketing
- extensão em `affiliates` · pix_key, avatar_url, bio, level, total_earned

Todas com RLS · o afiliado só vê os próprios dados; admin vê tudo.

## Admin (já existe em `/admin/vitrine`)

Vou expandir depois com: gestão de comissões/pagamentos, criação de metas, upload de materiais, ranking geral. Foco inicial é o lado do afiliado.

## Etapas de implementação

Pra não virar um deploy gigante de uma vez, sugiro fatiar assim:

**Fase 1 · Estrutura + Home + Pacotes (esta entrega)**
- Sidebar/layout do painel do afiliado
- Home com KPIs (mockados se ainda não houver dados reais)
- Migração da vitrine atual pra `/vitrine/pacotes`
- Página de Perfil básica (PIX, foto)

**Fase 2 · Indicações + Comissões**
- Tabelas no banco
- Tracking de indicações via link `?ref=`
- Extrato real de comissões integrado com vendas fechadas

**Fase 3 · Metas + Premiações + Materiais**
- Sistema de níveis/badges
- Ranking
- Biblioteca de materiais

Posso começar pela **Fase 1** agora?
