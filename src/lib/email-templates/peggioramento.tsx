import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  title?: string
  route?: string
  reasons?: string[]
  now?: string
  before?: string
  url?: string
}

const Email = ({ title, route, reasons, now, before, url }: Props) => (
  <Html lang="it" dir="ltr">
    <Head />
    <Preview>{title ?? 'Meteo in peggioramento su una tua rotta'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>ROTTA ADRIATICA</Text>
        <Heading style={h1}>{title ?? 'Meteo in peggioramento'}</Heading>
        {route ? <Text style={routeStyle}>Rotta: {route}</Text> : null}
        {reasons && reasons.length ? (
          <Text style={text}>
            {reasons.map((r, i) => <span key={i}>{i > 0 ? <br /> : null}• {r}</span>)}
          </Text>
        ) : null}
        {now ? <Text style={text}>Adesso: {now}</Text> : null}
        {before ? <Text style={small}>Al momento del salvataggio: {before}</Text> : null}
        {url ? <Button href={url} style={button}>Apri nell'app</Button> : null}
        <Text style={small}>
          Ricevi questa email perché hai salvato questa rotta e chiesto di essere avvisato se il meteo peggiora.
          Il giudizio è indicativo: verifica sempre i bollettini ufficiali prima di partire.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => d['title'] ?? 'Meteo in peggioramento – Rotta Adriatica',
  displayName: 'Peggioramento meteo su una rotta salvata',
  previewData: {
    title: 'Meteo in peggioramento – Venezia → Trieste',
    route: 'Venezia → Trieste',
    reasons: ['raffiche +7 kn (20 → 27 kn)', 'onda +0.6 m (0.8 → 1.4 m)'],
    now: 'vento 18 kn, raffiche 27 kn, onda 1.4 m',
    before: 'vento 12 kn, raffiche 20 kn, onda 0.8 m',
    url: 'https://rotta.adriatica.italythroughtime.world/rotte',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const brand = { color: '#0b2a4a', fontSize: '12px', letterSpacing: '2px', fontWeight: 700 }
const h1 = { color: '#0b2a4a', fontSize: '22px', margin: '8px 0 12px' }
const routeStyle = { color: '#0b2a4a', fontSize: '16px', fontWeight: 700, margin: '0 0 12px' }
const text = { color: '#1f2937', fontSize: '16px', lineHeight: '24px' }
const button = { backgroundColor: '#0b2a4a', color: '#ffffff', padding: '12px 20px', borderRadius: '10px', fontWeight: 700 }
const small = { color: '#6b7280', fontSize: '12px', marginTop: '24px' }
