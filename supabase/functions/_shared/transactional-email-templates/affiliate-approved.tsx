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
  portalUrl?: string
}

const AffiliateApprovedEmail = ({
  name,
  portalUrl = 'https://adm.natleva.com/vitrine',
}: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu acesso ao Programa de Bônus NatLeva foi aprovado.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>NATLEVA</Text>
          <Text style={tagline}>Programa de Bônus · Indique &amp; Ganhe</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>
            {name ? `Boas-vindas, ${name}!` : 'Boas-vindas!'}
          </Heading>
          <Text style={lead}>
            Seu cadastro foi <strong style={accent}>aprovado</strong>. Já liberamos
            seu acesso completo à vitrine de pacotes exclusivos da NatLeva.
          </Text>
          <Text style={text}>
            Agora você pode divulgar os pacotes, acompanhar suas indicações e
            receber seu bônus via PIX no mesmo dia da venda confirmada.
          </Text>
          <Section style={btnWrap}>
            <Button style={button} href={portalUrl}>
              Acessar a vitrine
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={small}>
            Dica: salve a página no seu celular para compartilhar os pacotes
            mais rápido com seus contatos.
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
  component: AffiliateApprovedEmail,
  subject: 'Seu acesso ao Programa de Bônus NatLeva foi aprovado',
  displayName: 'Afiliado · aprovado',
  previewData: { name: 'Carolina' },
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
  margin: '0 0 24px',
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
const hr = { borderColor: '#EDE7D6', margin: '24px 0' }
const small = { fontSize: '12px', color: '#6b7280', margin: 0, lineHeight: '1.5' }
const footer = {
  fontSize: '11px',
  color: '#9ca3af',
  textAlign: 'center' as const,
  margin: '24px 0 0',
}
