import FirecrawlApp from '@mendable/firecrawl-js'

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY! })

export interface ScrapeResult {
  title: string
  description: string
  content: string
  ogImage?: string
}

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  const result = await firecrawl.scrape(url, {
    formats: [
      'markdown',
      {
        type: 'json',
        prompt: 'Extract: page title, product description, main value proposition, target audience, key features. Return as JSON.',
      },
    ],
  })

  return {
    title: result.metadata?.title || '',
    description: result.metadata?.description || '',
    content: result.markdown || '',
    ogImage: result.metadata?.ogImage,
  }
}
