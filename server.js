import Anthropic from '@anthropic-ai/sdk'
import express from 'express'
import { CPS_KNOWLEDGE } from './cps-knowledge.js'

const app = express()
app.use(express.json())

const client = new Anthropic({ apiKey: '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' })

const SYSTEM_PROMPT = `Tu es l'Agent IA officiel de la CPS — Caisse de Prévoyance Sociale de Polynésie française.

Tu aides les assurés et leurs familles à comprendre leurs droits, leurs démarches, et les prestations de la CPS : remboursements de soins, maternité, maladie, retraite, allocations familiales, soins dentaires, médicaments, hospitalisation, et toute autre question liée à la protection sociale en Polynésie française.

Règles :
- Réponds toujours en français, avec un ton chaleureux, clair et professionnel.
- Tu peux utiliser des salutations polynésiennes comme "Ia Orana" pour créer du lien.
- Structure tes réponses avec des listes à puces (•) quand c'est utile pour la clarté.
- Donne des informations précises basées sur la réglementation CPS connue.
- Si tu n'es pas certain d'un montant ou d'une règle précise, dis-le clairement et recommande de contacter la CPS directement au 40 415 415 ou via l'espace personnel en ligne.
- Ne donne jamais de conseils médicaux. Pour les urgences médicales, oriente vers le CHPF ou le 15/18.
- Rappelle toujours que les informations fournies ne sont pas contractuelles et que le règlement CPS fait foi.
- Sois concis : une réponse de 3-5 lignes suffit dans la plupart des cas.

Voici ta base de connaissance officielle sur la CPS. Utilise-la en priorité pour répondre aux questions :

${CPS_KNOWLEDGE}`

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages requis' })
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    const stream = await client.messages.stream({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    console.error('Erreur Claude API:', err.message)
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  }
})

const PORT = 3001
app.listen(PORT, () => console.log(`Serveur CPS démarré sur http://localhost:${PORT}`))
