import Anthropic from '@anthropic-ai/sdk'
import type { ScrapeResult } from './scraper'
import type { BrandProfile, AdCopy } from '@/types/database'
import { langfuse } from './langfuse'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export interface ProfileResult {
  brandProfile: BrandProfile
  adCopy: AdCopy
}

export async function buildBrandProfile(scrape: ScrapeResult, url: string): Promise<ProfileResult> {
  const trace = langfuse.trace({
    name: 'build-brand-profile',
    metadata: { url },
  })

  const prompt = `Analyze this website and return a JSON object with TWO sections: a brand profile and ad copy.

URL: ${url}
Title: ${scrape.title}
Description: ${scrape.description}
Content: ${scrape.content.slice(0, 3000)}

Return ONLY valid JSON with this exact structure:
{
  "brand_profile": {
    "category": "e.g. ecommerce, saas, fitness, food, fashion, beauty",
    "tone": "e.g. professional, playful, luxury, urgent, friendly",
    "target_audience": "one sentence description of who buys this",
    "key_value_props": ["prop1", "prop2", "prop3"],
    "product_name": "name of the product or service",
    "competitor_ad_examples": []
  },
  "ad_copy": {
    "headline": "max 25 characters, punchy and direct, e.g. 'Try Aurora Glow'",
    "primaryText": "max 100 characters, hook + value proposition, e.g. 'Tired of dull skin? Aurora Glow transforms your complexion in just 7 days.'",
    "description": "max 25 characters, CTA style, e.g. 'Shop now — free shipping'"
  }
}

IMPORTANT for ad_copy:
- headline must be under 25 characters
- primaryText must be under 100 characters, start with a hook
- description must be under 25 characters, include a call to action
- All text should be specific to THIS product, not generic`

  const generation = trace.generation({
    name: 'claude-brand-profile-and-copy',
    model: 'claude-sonnet-4-6',
    input: [{ role: 'user', content: prompt }],
  })

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  generation.end({
    output: text,
    usage: {
      input: message.usage.input_tokens,
      output: message.usage.output_tokens,
    },
  })

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    trace.update({ metadata: { error: 'Failed to parse JSON' } })
    await langfuse.flushAsync()
    throw new Error('Failed to parse brand profile from Claude response')
  }

  const parsed = JSON.parse(jsonMatch[0])
  const result: ProfileResult = {
    brandProfile: parsed.brand_profile as BrandProfile,
    adCopy: parsed.ad_copy as AdCopy,
  }

  trace.update({ output: result })
  await langfuse.flushAsync()

  return result
}

export async function generateVideoScript(brandProfile: BrandProfile): Promise<string> {
  const trace = langfuse.trace({ name: 'generate-video-script' })

  const prompt = `Write a 10-second UGC-style video ad script for a person talking directly into the camera about this product.

Product: ${brandProfile.product_name}
Category: ${brandProfile.category}
Target audience: ${brandProfile.target_audience}
Key benefits: ${brandProfile.key_value_props.join(', ')}
Tone: ${brandProfile.tone}

The script should:
- Start with a catchy hook like "you're not gonna believe this..." or "I wish someone told me about this sooner..."
- Be spoken by an attractive, relatable person
- Sound natural and authentic, like a real person sharing a discovery
- Mention the product name and one key benefit
- End with a soft CTA like "just try it" or "thank me later"
- Be about 30-40 words total (10 seconds of speech)

Return ONLY the script text, nothing else. No stage directions, no brackets.`

  const generation = trace.generation({
    name: 'claude-video-script',
    model: 'claude-sonnet-4-6',
    input: [{ role: 'user', content: prompt }],
  })

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  })

  const script = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

  generation.end({
    output: script,
    usage: {
      input: message.usage.input_tokens,
      output: message.usage.output_tokens,
    },
  })
  await langfuse.flushAsync()

  return script
}
