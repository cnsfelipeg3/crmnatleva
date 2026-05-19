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
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Confirme seu e-mail para acessar a vitrine NatLeva</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>NATLEVA</Text>
          <Text style={tagline}>Programa de Bônus · Indique &amp; Ganhe</Text>
        </Section>
        <Section style={card}>
          <Heading style={h1}>Confirme seu e-mail</Heading>
          <Text style={lead}>
            Que bom ter você por aqui! Falta só um passo para liberar seu
            acesso à vitrine da {' '}
            <Link href={siteUrl} style={link}>
              <strong>NatLeva</strong>
            </Link>
            .
          </Text>
          <Text style={text}>
            Confirme o e-mail <strong>{recipient}</strong> clicando no botão
            abaixo:
          </Text>
          <Section style={btnWrap}>
            <Button style={button} href={confirmationUrl}>
              Confirmar meu e-mail
            </Button>
          </Section>
          <Text style={small}>
            Se o botão não funcionar, copie e cole este link no navegador:
            <br />
            <Link href={confirmationUrl} style={linkSubtle}>
              {confirmationUrl}
            </Link>
          </Text>
          <Hr style={hr} />
          <Text style={small}>
            Após confirmar, seu cadastro segue para uma rápida análise da
            nossa equipe. Avisamos por e-mail assim que o acesso for liberado.
          </Text>
        </Section>
        <Text style={footer}>
          Se você não criou uma conta na NatLeva, pode ignorar este e-mail.
          <br />
          NatLeva · Curadoria de viagens com cuidado humano
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
  margin: '0 0 24px',
}
const btnWrap = { textAlign: 'center' as const, margin: '8px 0 24px' }
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
const link = { color: '#C9A84C', textDecoration: 'none' }
const linkSubtle = { color: '#6b7280', textDecoration: 'underline', wordBreak: 'break-all' as const }
const hr = { borderColor: '#EDE7D6', margin: '24px 0' }
const small = { fontSize: '12px', color: '#6b7280', margin: '0 0 12px', lineHeight: '1.5' }
const footer = {
  fontSize: '11px',
  color: '#9ca3af',
  textAlign: 'center' as const,
  margin: '24px 0 0',
  lineHeight: '1.5',
}
