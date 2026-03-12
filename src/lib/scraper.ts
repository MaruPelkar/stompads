import FirecrawlApp from '@mendable/firecrawl-js'
import { langfuse } from './langfuse'
import type { BrandAssets } from '@/types/database'

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY! })

export interface ScrapeResult {
  title: string
  description: string
  content: string
  brandAssets: BrandAssets
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
        prompt: `Extract from this webpage:
1. "logo_url": URL of the company logo image (look for img tags with "logo" in src, alt, or class; or link[rel="icon"])
2. "favicon_url": URL of the favicon (link[rel="icon"] or link[rel="shortcut icon"])
3. "product_images": array of up to 5 URLs of the most prominent product/hero images (largest images, not icons or decorations)
4. "brand_colors": array of up to 4 hex color codes used prominently on the page (from CSS, meta theme-color, or dominant visual colors)
5. "og_image": URL from og:image meta tag
6. "title": page title
7. "description": meta description or main value proposition
8. "target_audience": who this product is for (one sentence)
9. "key_features": array of up to 5 key features or benefits

Return as JSON.`,
      },
    ],
  })

  const extracted = result.json as Record<string, unknown> | undefined

  const brandAssets: BrandAssets = {
    logoUrl: (extracted?.logo_url as string) || null,
    faviconUrl: (extracted?.favicon_url as string) || null,
    productImages: Array.isArray(extracted?.product_images)
      ? (extracted.product_images as string[]).filter(Boolean).slice(0, 5)
      : [],
    brandColors: Array.isArray(extracted?.brand_colors)
      ? (extracted.brand_colors as string[]).filter(Boolean).slice(0, 4)
      : [],
    ogImage: (extracted?.og_image as string) || result.metadata?.ogImage || null,
  }

  const scrapeResult: ScrapeResult = {
    title: result.metadata?.title || (extracted?.title as string) || '',
    description: result.metadata?.description || (extracted?.description as string) || '',
    content: result.markdown || '',
    brandAssets,
  }

  span.end({
    output: {
      title: scrapeResult.title,
      contentLength: scrapeResult.content.length,
      hasLogo: !!brandAssets.logoUrl,
      productImageCount: brandAssets.productImages.length,
      brandColorCount: brandAssets.brandColors.length,
    },
  })
  await langfuse.flushAsync()

  return scrapeResult
}
