import Anthropic from '@anthropic-ai/sdk'

let client = null

function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set.')
  }
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return client
}

/**
 * @param {{ system: string, user: string, jsonMode?: boolean, maxTokens?: number }} opts
 * @returns {Promise<string>}
 */
export async function callClaude({ system, user, jsonMode = false, maxTokens = 1024 }) {
  const c = getClient()

  const response = await c.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: jsonMode
      ? `${system}\n\nRespond with valid JSON only, no markdown fences, no explanation.`
      : system,
    messages: [{ role: 'user', content: user }],
  })

  const text = response.content[0]?.text || ''

  if (jsonMode) {
    try {
      return JSON.parse(text)
    } catch {
      // Strip markdown fences if present
      const stripped = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      return JSON.parse(stripped)
    }
  }

  return text
}
