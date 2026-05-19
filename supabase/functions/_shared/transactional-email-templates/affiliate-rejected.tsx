/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
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
  reason?: string
}

const AffiliateRejectedEmail = ({ name, reason }: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Atualização sobre seu cadastro no Programa de Bônus NatLeva</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>NATLEVA</Text>
          <Text style={tagline}>Programa de Bônus · Indique &amp; Ganhe</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>
            {name ? `Olá, ${name}` : 'Olá'}
          </Heading>
          <Text style={lead}>
            Agradecemos muito seu interesse em fazer parte do Programa de Bônus
            da NatLeva.
          </Text>
          <Text style={text}>
            Após uma análise cuidadosa, neste momento <strong>não pudemos
            aprovar</strong> seu cadastro como afiliado.
          </Text>
          {reason ? (
            <Section style={reasonBox}>
              <Text style={reasonLabel}>Observação da nossa equipe</Text>
              <Text style={reasonText}>{reason}</Text>
            </Section>
          ) : null}
          <Hr style={hr} />
          <Text style={small}>
            Se quiser conversar ou tentar novamente no futuro, é só responder a
            este e-mail. A gente está por aqui.
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
  component: AffiliateRejectedEmail,
  subject: 'Atualização sobre seu cadastro · Programa de Bônus NatLeva',
  displayName: 'Afiliado · não aprovado',
  previewData: { name: 'Carolina', reason: 'Cadastro com dados incompletos.' },
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
const text = {
  fontSize: '14px',
  color: '#4b5563',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const reasonBox = {
  background: '#ffffff',
  border: '1px solid #EDE7D6',
  borderLeft: '3px solid #C9A84C',
  borderRadius: '8px',
  padding: '14px 16px',
  margin: '0 0 16px',
}
const reasonLabel = {
  fontSize: '11px',
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
  color: '#9ca3af',
  margin: '0 0 6px',
}
const reasonText = { fontSize: '14px', color: '#111827', margin: 0, lineHeight: '1.5' }
const hr = { borderColor: '#EDE7D6', margin: '20px 0' }
const small = { fontSize: '12px', color: '#6b7280', margin: 0, lineHeight: '1.5' }
const footer = {
  fontSize: '11px',
  color: '#9ca3af',
  textAlign: 'center' as const,
  margin: '24px 0 0',
}
