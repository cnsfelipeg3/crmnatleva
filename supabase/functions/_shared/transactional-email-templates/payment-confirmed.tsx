/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  productTitle?: string
  amount?: number
  receiptUrl?: string | null
  isEntryOnly?: boolean
  balance?: number
}

const fmtBRL = (n?: number) =>
  typeof n === 'number'
    ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'R$ 0,00'

const PaymentConfirmedEmail = ({
  name,
  productTitle = 'Sua reserva',
  amount = 0,
  receiptUrl,
  isEntryOnly,
  balance,
}: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Pagamento confirmado · {productTitle}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>NATLEVA</Text>
          <Text style={tagline}>Confirmação de pagamento</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>
            {name ? `Obrigada, ${name}!` : 'Obrigada!'}
          </Heading>
          <Text style={lead}>
            Recebemos seu pagamento e sua reserva de{' '}
            <strong style={accent}>{productTitle}</strong> está confirmada.
          </Text>

          <Section style={summary}>
            <Text style={summaryLabel}>Valor pago</Text>
            <Text style={summaryValue}>{fmtBRL(amount)}</Text>
            {isEntryOnly && typeof balance === 'number' && balance > 0 ? (
              <>
                <Hr style={hr} />
                <Text style={summaryLabel}>Saldo restante</Text>
                <Text style={summaryValueAlt}>{fmtBRL(balance)}</Text>
                <Text style={small}>
                  Entraremos em contato com as condições do saldo.
                </Text>
              </>
            ) : null}
          </Section>

          {receiptUrl ? (
            <Section style={btnWrap}>
              <Button style={button} href={receiptUrl}>
                Ver comprovante
              </Button>
            </Section>
          ) : null}

          <Hr style={hr} />
          <Text style={text}>
            <strong>Próximos passos:</strong> a gente já está organizando sua
            viagem. Em breve você recebe uma mensagem da nossa equipe com os
            detalhes da emissão, documentos necessários e o que esperar daqui
            pra frente.
          </Text>
          <Text style={small}>
            Qualquer dúvida, é só responder este e-mail ou falar com a gente no
            WhatsApp.
          </Text>
        </Section>
        <Text style={footer}>
          NatLeva · Curadoria de viagens com cuidado humano
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentConfirmedEmail,
  subject: 'Pagamento confirmado · sua reserva está garantida',
  displayName: 'Pagamento · confirmado',
  previewData: {
    name: 'Carolina',
    productTitle: 'Foz do Iguaçu · 4 dias',
    amount: 2890,
    receiptUrl: 'https://example.com/r',
    isEntryOnly: false,
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: 0,
  padding: 0,
}
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 20px' }
const header = { textAlign: 'center' as const, marginBottom: '24px' }
const brand = {
  fontSize: '20px',
  fontWeight: 700 as const,
  letterSpacing: '4px',
  color: '#111827',
  margin: 0,
}
const tagline = {
  fontSize: '11px',
  letterSpacing: '2px',
  color: '#C9A84C',
  textTransform: 'uppercase' as const,
  margin: '6px 0 0',
}
const card = {
  background: '#FAFAF7',
  border: '1px solid #EDE7D6',
  borderRadius: '14px',
  padding: '32px 28px',
  borderTop: '4px solid #C9A84C',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 700 as const,
  color: '#111827',
  margin: '0 0 16px',
}
const lead = {
  fontSize: '15px',
  color: '#1f2937',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const accent = { color: '#C9A84C' }
const text = {
  fontSize: '14px',
  color: '#4b5563',
  lineHeight: '1.6',
  margin: '0 0 12px',
}
const summary = {
  background: '#ffffff',
  border: '1px solid #EDE7D6',
  borderRadius: '10px',
  padding: '18px 20px',
  margin: '8px 0 20px',
}
const summaryLabel = {
  fontSize: '11px',
  letterSpacing: '1.5px',
  textTransform: 'uppercase' as const,
  color: '#6b7280',
  margin: 0,
}
const summaryValue = {
  fontSize: '24px',
  fontWeight: 700 as const,
  color: '#111827',
  margin: '4px 0 0',
}
const summaryValueAlt = {
  fontSize: '18px',
  fontWeight: 700 as const,
  color: '#1f2937',
  margin: '4px 0 0',
}
const btnWrap = { textAlign: 'center' as const, margin: '8px 0 16px' }
const button = {
  backgroundColor: '#111827',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600 as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#EDE7D6', margin: '16px 0' }
const small = { fontSize: '12px', color: '#6b7280', margin: '8px 0 0', lineHeight: '1.5' }
const footer = {
  fontSize: '11px',
  color: '#9ca3af',
  textAlign: 'center' as const,
  margin: '24px 0 0',
}
