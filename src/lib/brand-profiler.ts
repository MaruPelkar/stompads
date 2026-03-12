import Anthropic from '@anthropic-ai/sdk'
import type { ScrapeResult } from './scraper'
import type { BrandProfile } from '@/types/database'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function buildBrandProfile(scrape: ScrapeResult, url: string): Promise<BrandProfile> {
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Analyze this website and return a JSON brand profile.

URL: ${url}
Title: ${scrape.title}
Description: ${scrape.description}
Content: ${scrape.content.slice(0, 3000)}

Return ONLY valid JSON with this exact structure:
{
  "category": "e.g. ecommerce, saas, fitness, food, fashion",
  "tone": "e.g. professional, playful, luxury, urgent",
  "target_audience": "one sentence description",
  "key_value_props": ["prop1", "prop2", "prop3"],
  "product_name": "name of the product or service",
  "competitor_ad_examples": []
}`
    }]
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Failed to parse brand profile from Claude response')

  return JSON.parse(jsonMatch[0]) as BrandProfile
}
