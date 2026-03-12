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
  'sitting on a park bench in golden hour light, casually talking into phone camera',
  'leaning against a kitchen counter at home, talking into phone propped up on the counter',
]

const UGC_COPYWRITER_SYSTEM = `You are an expert UGC ad copywriter who specializes in writing viral hook scripts for social media video ads.

You understand:
- HOOK PSYCHOLOGY: The first 2 seconds decide if someone stops scrolling. You use curiosity gaps ("you won't believe..."), pattern interrupts ("stop scrolling"), urgency ("before they take this down"), FOMO ("everyone's talking about this"), and contrarian takes ("I was wrong about...").
- FIRST PERSON POV: You write as if the person genuinely discovered something amazing and is breathlessly telling their best friend about it. Never salesy. Never corporate. Always authentic.
- PRODUCT VIRTUE HIGHLIGHTING: You find the ONE most compelling benefit and make it feel life-changing. You don't list features — you paint a picture of the transformation.
- NATURAL SPEECH: Real people use filler words, pauses, emphasis, and incomplete sentences. "Like, honestly?" "And here's the thing —" "I'm not even kidding." Your scripts sound like they were never written.
- URGENCY WITHOUT BEING PUSHY: Soft CTAs work best. "Just try it." "Thank me later." "Link in bio, don't sleep on this." Never "BUY NOW" energy.

Your scripts are 40-50 words (12 seconds of natural speech). Every word earns its place.`

export async function generateVideoScripts(brandProfile: BrandProfile): Promise<{ script: string; setting: string }[]> {
  const trace = langfuse.trace({ name: 'generate-video-scripts' })

  const shuffledSettings = [...VIDEO_SETTINGS].sort(() => Math.random() - 0.5).slice(0, 2)
  const scripts: { script: string; setting: string }[] = []

  for (let i = 0; i < 2; i++) {
    const setting = shuffledSettings[i]

    const prompt = `Write a 12-second UGC video ad script for this product. The person is ${setting}.

PRODUCT: ${brandProfile.product_name}
CATEGORY: ${brandProfile.category}
TARGET AUDIENCE: ${brandProfile.target_audience}
KEY BENEFITS: ${brandProfile.key_value_props.join(', ')}
TONE: ${brandProfile.tone}

Requirements:
- Open with a killer hook that stops the scroll (first 2 seconds are everything)
- First person POV — "I" not "you", like sharing a personal discovery
- Mention "${brandProfile.product_name}" naturally, not forced
- Highlight ONE specific benefit that feels transformative
- End with a soft CTA (e.g. "just try it", "thank me later", "link in bio")
- Exactly 40-50 words total
- Sound like a real person, not a script

${i === 0 ? 'Use a CURIOSITY/DISBELIEF hook style (e.g. "You would not believe what I just found..." or "Okay I need someone to explain why nobody told me about this...")' : 'Use an URGENCY/FOMO hook style (e.g. "This has got to be the biggest catch of 2026..." or "Stop scrolling because this is about to change everything...")'}

Return ONLY the spoken words. No stage directions. No quotes. No brackets. Just what they say.`

    const generation = trace.generation({
      name: `claude-ugc-script-${i + 1}`,
      model: 'claude-sonnet-4-6',
      input: [{ role: 'system', content: UGC_COPYWRITER_SYSTEM }, { role: 'user', content: prompt }],
    })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: UGC_COPYWRITER_SYSTEM,
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
