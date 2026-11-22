import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props { title?: string; body?: string; url?: string }

const Email = ({ title, body, url }: Props) => (
  <Html lang="it" dir="ltr">
    <Head />
    <Preview>{title ?? 'Nuova allerta Rotta Adriatica'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>ROTTA ADRIATICA</Text>
        <Heading style={h1}>{title ?? 'Nuova allerta'}</Heading>
        <Text style={text}>{body ?? ''}</Text>
        {url ? <Button href={url} style={button}>Apri nell'app</Button> : null}
        <Text style={small}>Ricevi questa email perché hai attivato le allerte per le tue zone preferite.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => d['title'] ?? 'Allerta Rotta Adriatica',
  displayName: 'Allerta (avviso o meteo)',
  previewData: { title: 'Meteo sopra soglia – Venezia', body: 'Prossime 12 ore: vento 24 kn, onda 1.8 m', url: 'https://rotta.adriatica.italythroughtime.world/tratta' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const brand = { color: '#0b2a4a', fontSize: '12px', letterSpacing: '2px', fontWeight: 700 }
const h1 = { color: '#0b2a4a', fontSize: '22px', margin: '8px 0 12px' }
const text = { color: '#1f2937', fontSize: '16px', lineHeight: '24px' }
const button = { backgroundColor: '#0b2a4a', color: '#ffffff', padding: '12px 20px', borderRadius: '10px', fontWeight: 700 }
const small = { color: '#6b7280', fontSize: '12px', marginTop: '24px' }
