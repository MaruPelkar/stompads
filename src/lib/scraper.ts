import FirecrawlApp from '@mendable/firecrawl-js'
import { langfuse } from './langfuse'

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY! })

export interface ScrapeResult {
  title: string
  description: string
  content: string
  ogImage?: string
}

export async function scrapeUrl(url: string, traceId?: string): Promise<ScrapeResult> {
  const trace = traceId
    ? langfuse.trace({ id: traceId })
    : langfuse.trace({ name: 'scrape-url' })

  const span = trace.span({
    name: 'firecrawl-scrape',
    input: { url },
  })

  const result = await firecrawl.scrape(url, {
    formats: [
      'markdown',
      {
        type: 'json',
        prompt: 'Extract: page title, product description, main value proposition, target audience, key features. Return as JSON.',
      },
    ],
  })

  const scrapeResult: ScrapeResult = {
    title: result.metadata?.title || '',
    description: result.metadata?.description || '',
    content: result.markdown || '',
    ogImage: result.metadata?.ogImage,
  }

  span.end({
    output: {
      title: scrapeResult.title,
      description: scrapeResult.description,
      contentLength: scrapeResult.content.length,
      hasOgImage: !!scrapeResult.ogImage,
    },
  })
  await langfuse.flushAsync()

  return scrapeResult
}
