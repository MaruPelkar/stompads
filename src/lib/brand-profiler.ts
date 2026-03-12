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

const VIDEO_SETTINGS = [
  'walking on a busy city street heading to the office, talking into selfie camera',
  'standing in front of their wardrobe mirror in a well-lit bedroom, talking into phone camera',
  'sitting at a cafe table with a laptop and coffee, leaning into the phone camera',
]

const VIDEO_HOOKS = [
  "You would NOT believe what I just found...",
  "Okay this has GOT to be the biggest catch of 2026...",
  "Stop scrolling. I need to tell you about this...",
  "I was today years old when I discovered this...",
  "Why did nobody tell me about this sooner...",
]

export async function generateVideoScripts(brandProfile: BrandProfile): Promise<{ script: string; setting: string }[]> {
  const trace = langfuse.trace({ name: 'generate-video-scripts' })

  // Pick 2 random settings and 2 random hooks (no duplicates)
  const shuffledSettings = [...VIDEO_SETTINGS].sort(() => Math.random() - 0.5).slice(0, 2)
  const shuffledHooks = [...VIDEO_HOOKS].sort(() => Math.random() - 0.5).slice(0, 2)

  const scripts: { script: string; setting: string }[] = []

  for (let i = 0; i < 2; i++) {
    const setting = shuffledSettings[i]
    const hook = shuffledHooks[i]

    const prompt = `Write a 12-second UGC-style video ad script. The person is ${setting}.

Product: ${brandProfile.product_name}
Category: ${brandProfile.category}
Target audience: ${brandProfile.target_audience}
Key benefits: ${brandProfile.key_value_props.join(', ')}
Tone: ${brandProfile.tone}

The script MUST:
- Start with this exact hook: "${hook}"
- Be spoken by an attractive, relatable person directly into camera
- Sound completely natural, like texting a friend about a discovery
- Mention the product name "${brandProfile.product_name}" and one specific benefit
- End with a soft CTA like "just try it" or "thank me later" or "link in bio"
- Be exactly 40-50 words (12 seconds of natural speech)
- Include natural pauses and emphasis (the way real people talk)

Return ONLY the script text. No stage directions, no quotes, no brackets.`

    const generation = trace.generation({
      name: `claude-video-script-${i + 1}`,
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

    scripts.push({ script, setting })
  }

  await langfuse.flushAsync()
  return scripts
}
