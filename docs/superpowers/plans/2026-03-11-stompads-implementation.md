# Stompads Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Stompads — a self-serve ad platform where users enter a URL + budget, get AI-generated Meta ads, and see live performance metrics.

**Architecture:** Next.js 14 App Router for frontend and API routes, Supabase for auth/DB/storage, Fal.ai for ad generation, Meta Marketing API for campaign management, Stripe for billing.

**Tech Stack:** Next.js 14, TypeScript, Supabase (auth + postgres + storage), Stripe, Fal.ai SDK, Firecrawl SDK, Anthropic SDK (brand profiling), Meta Graph API (direct fetch calls), Tailwind CSS, Vercel

---

## Pre-flight: Verify Fal.ai Model IDs

- [ ] **Step 1: Find Sora 2 model ID**

Go to fal.ai → Models → search "Sora". Copy the exact model ID (format: `fal-ai/xxx`). You will need this in Task 6.

- [ ] **Step 2: Find Nano Banana Pro 2 model ID**

Go to fal.ai → Models → search "Nano Banana". Copy the exact model ID. You will need this in Task 6.

- [ ] **Step 3: Check input schema for each model**

For each model, click through to its fal.ai docs page and note:
- What field name controls video duration (e.g. `duration` or `num_seconds`)
- What field name controls aspect ratio (e.g. `aspect_ratio` or `resolution`)
- What field name returns the output URL in the response

Write these down — you will use them when writing `src/lib/fal-client.ts` in Task 6 Step 1. **Do not proceed to Task 6 until you have confirmed both model IDs and their input schemas.**

---

## Chunk 1: Project Scaffolding + Environment + Database

### Task 1: Bootstrap Next.js Project

**Files:**
- Create: `package.json`
- Create: `.env.local`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `tsconfig.json`

- [ ] **Step 1: Initialize Next.js app**

Pin to Next.js 14 to match the architecture in this plan. Using `@latest` would install Next.js 15, which changes `params` to Promise objects in route handlers and requires additional updates.

```bash
cd /Users/nakulkelkar/Documents/GitHub/stompads
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

Expected: Next.js 14 project scaffolded in current directory

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr stripe @stripe/stripe-js @fal-ai/client @anthropic-ai/sdk @mendable/firecrawl-js
npm install -D @types/node
```

Expected: All packages installed without errors

- [ ] **Step 3: Create `.env.local` with all credentials**

Copy values from your secure notes. Do NOT commit this file.

```bash
cat > .env.local << 'EOF'
# Supabase (get from Supabase dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

# Stripe (get from Stripe dashboard → Developers → API Keys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=YOUR_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=FILL_IN_AFTER_STRIPE_CLI_SETUP

# Fal.ai (get from fal.ai dashboard → API Keys)
FAL_KEY=YOUR_FAL_API_KEY

# Meta (get from Meta Business Manager)
META_AD_ACCOUNT_ID=YOUR_META_AD_ACCOUNT_ID
META_APP_ID=YOUR_META_APP_ID
META_APP_SECRET=YOUR_META_APP_SECRET
META_ACCESS_TOKEN=YOUR_META_SYSTEM_USER_TOKEN
META_PAGE_ID=YOUR_FACEBOOK_PAGE_ID

# Anthropic (get from console.anthropic.com)
ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY

# Firecrawl (get from firecrawl.dev dashboard)
FIRECRAWL_API_KEY=YOUR_FIRECRAWL_API_KEY

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron (generate with: openssl rand -hex 32)
CRON_SECRET=YOUR_RANDOM_SECRET

# Admin
ADMIN_EMAIL=YOUR_EMAIL_ADDRESS
EOF
```

- [ ] **Step 4: Create `.env.example` (safe to commit)**

```bash
cat > .env.example << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
FAL_KEY=
META_AD_ACCOUNT_ID=
META_APP_ID=
META_APP_SECRET=
META_ACCESS_TOKEN=
META_PAGE_ID=
ANTHROPIC_API_KEY=
FIRECRAWL_API_KEY=
NEXT_PUBLIC_APP_URL=
CRON_SECRET=
ADMIN_EMAIL=
EOF
```

- [ ] **Step 5: Update `.gitignore` to protect secrets**

Add to `.gitignore`:
```
.env.local
.env*.local
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: Server running at http://localhost:3000 with default Next.js page

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: bootstrap Next.js project with dependencies"
```

---

### Task 2: Supabase Database Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `supabase/migrations/002_rls_policies.sql`
- Create: `supabase/migrations/003_storage_buckets.sql`

- [ ] **Step 1: Create initial schema migration**

Create `supabase/migrations/001_initial_schema.sql`:

```sql
-- Users table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  created_at timestamptz default now()
);

-- Campaigns
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  url text not null,
  brand_profile jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'generating', 'preview_ready', 'payment_pending', 'generating_full', 'ready', 'live', 'paused')),
  daily_budget integer, -- in cents
  meta_campaign_id text,
  meta_adset_id text,
  stripe_payment_intent_id text,
  created_at timestamptz default now()
);

-- Ads
create table public.ads (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete cascade not null,
  type text not null check (type in ('image', 'video')),
  is_preview boolean default false,
  fal_request_id text,
  asset_url text,
  meta_ad_id text,
  meta_creative_id text,
  status text not null default 'generating'
    check (status in ('generating', 'ready', 'live', 'failed')),
  prompt_used text,
  created_at timestamptz default now()
);

-- Metrics (hourly snapshots per ad)
create table public.metrics (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid references public.ads(id) on delete cascade not null,
  campaign_id uuid references public.campaigns(id) on delete cascade not null,
  impressions integer default 0,
  clicks integer default 0,
  ctr numeric(6,4) default 0,
  cpc numeric(10,2) default 0,
  spend numeric(10,2) default 0,
  recorded_at timestamptz default now()
);

-- Admin ad template library
create table public.ad_library (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  prompt text not null,
  visual_url text,
  notes text,
  created_at timestamptz default now()
);

-- Trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

- [ ] **Step 2: Create RLS policies migration**

Create `supabase/migrations/002_rls_policies.sql`:

```sql
-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.ads enable row level security;
alter table public.metrics enable row level security;
alter table public.ad_library enable row level security;

-- Profiles: users can only see/edit their own
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Campaigns: users own their campaigns
create policy "Users can view own campaigns"
  on public.campaigns for select
  using (auth.uid() = user_id);

create policy "Users can insert own campaigns"
  on public.campaigns for insert
  with check (auth.uid() = user_id);

create policy "Users can update own campaigns"
  on public.campaigns for update
  using (auth.uid() = user_id);

-- Ads: accessible through campaign ownership
create policy "Users can view ads for own campaigns"
  on public.ads for select
  using (
    exists (
      select 1 from public.campaigns
      where campaigns.id = ads.campaign_id
      and campaigns.user_id = auth.uid()
    )
  );

-- Metrics: accessible through campaign ownership
create policy "Users can view metrics for own campaigns"
  on public.metrics for select
  using (
    exists (
      select 1 from public.campaigns
      where campaigns.id = metrics.campaign_id
      and campaigns.user_id = auth.uid()
    )
  );

-- Ad library: readable by all authenticated users, writable only by service role
create policy "Authenticated users can read ad library"
  on public.ad_library for select
  to authenticated
  using (true);
```

- [ ] **Step 3: Create storage buckets migration**

Create `supabase/migrations/003_storage_buckets.sql`:

```sql
-- Ad creatives bucket (generated images/videos)
insert into storage.buckets (id, name, public)
values ('ad-creatives', 'ad-creatives', true);

-- Ad library bucket (admin uploaded templates)
insert into storage.buckets (id, name, public)
values ('ad-library', 'ad-library', true);

-- Storage policies
create policy "Public read for ad-creatives"
  on storage.objects for select
  using (bucket_id = 'ad-creatives');

create policy "Service role can upload ad-creatives"
  on storage.objects for insert
  with check (bucket_id = 'ad-creatives');

create policy "Public read for ad-library"
  on storage.objects for select
  using (bucket_id = 'ad-library');

create policy "Service role can upload ad-library"
  on storage.objects for insert
  with check (bucket_id = 'ad-library');
```

- [ ] **Step 4: Run migrations in Supabase**

Go to Supabase dashboard → SQL Editor → run each migration file in order (001, 002, 003).

Expected: Tables visible in Table Editor, buckets visible in Storage.

- [ ] **Step 5: Commit**

```bash
git add supabase/
git commit -m "feat: add Supabase schema migrations and RLS policies"
```

---

### Task 3: Supabase Client Setup

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/middleware.ts`
- Create: `src/types/database.ts`

- [ ] **Step 1: Create browser client**

Create `src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Create server client**

Create `src/lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

export async function createServiceClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 3: Create middleware**

Create `src/middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const protectedRoutes = ['/dashboard', '/onboard', '/admin']
  const isProtected = protectedRoutes.some(r => request.nextUrl.pathname.startsWith(r))

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)'],
}
```

- [ ] **Step 4: Create database types**

Create `src/types/database.ts`:

```typescript
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string; created_at: string }
        Insert: { id: string; email: string; created_at?: string }
        Update: { email?: string }
      }
      campaigns: {
        Row: {
          id: string
          user_id: string
          url: string
          brand_profile: Json | null
          status: 'draft' | 'generating' | 'preview_ready' | 'payment_pending' | 'generating_full' | 'ready' | 'live' | 'paused'
          daily_budget: number | null
          meta_campaign_id: string | null
          meta_adset_id: string | null
          stripe_payment_intent_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['campaigns']['Row'], 'id' | 'created_at'>
        Update: Partial<Omit<Database['public']['Tables']['campaigns']['Row'], 'id' | 'user_id'>>
      }
      ads: {
        Row: {
          id: string
          campaign_id: string
          type: 'image' | 'video'
          is_preview: boolean
          fal_request_id: string | null
          asset_url: string | null
          meta_ad_id: string | null
          meta_creative_id: string | null
          status: 'generating' | 'ready' | 'live' | 'failed'
          prompt_used: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['ads']['Row'], 'id' | 'created_at'>
        Update: Partial<Omit<Database['public']['Tables']['ads']['Row'], 'id' | 'campaign_id'>>
      }
      metrics: {
        Row: {
          id: string
          ad_id: string
          campaign_id: string
          impressions: number
          clicks: number
          ctr: number
          cpc: number
          spend: number
          recorded_at: string
        }
        Insert: Omit<Database['public']['Tables']['metrics']['Row'], 'id'>
        Update: never
      }
      ad_library: {
        Row: {
          id: string
          category: string
          prompt: string
          visual_url: string | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['ad_library']['Row'], 'id' | 'created_at'>
        Update: Partial<Omit<Database['public']['Tables']['ad_library']['Row'], 'id'>>
      }
    }
  }
}

export type Campaign = Database['public']['Tables']['campaigns']['Row']
export type Ad = Database['public']['Tables']['ads']['Row']
export type Metrics = Database['public']['Tables']['metrics']['Row']
export type AdLibraryItem = Database['public']['Tables']['ad_library']['Row']

export interface BrandProfile {
  category: string
  tone: string
  target_audience: string
  key_value_props: string[]
  product_name: string
  competitor_ad_examples: string[]
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/
git commit -m "feat: add Supabase client setup and database types"
```

---

## Chunk 2: Authentication Pages

### Task 4: Signup Page

**Files:**
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/(auth)/signup/page.tsx`
- Create: `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Create auth layout**

Create `src/app/(auth)/layout.tsx`:

```typescript
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-full max-w-md px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">Stompads</h1>
          <p className="text-gray-400 mt-1">Run ads. Get traffic.</p>
        </div>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create signup page**

Create `src/app/(auth)/signup/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/onboard')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
          placeholder="••••••••"
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition"
      >
        {loading ? 'Creating account...' : 'Create account'}
      </button>
      <p className="text-center text-gray-500 text-sm">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-400 hover:underline">Log in</Link>
      </p>
    </form>
  )
}
```

- [ ] **Step 3: Create login page**

Create `src/app/(auth)/login/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
          placeholder="••••••••"
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition"
      >
        {loading ? 'Logging in...' : 'Log in'}
      </button>
      <p className="text-center text-gray-500 text-sm">
        No account?{' '}
        <Link href="/signup" className="text-blue-400 hover:underline">Sign up</Link>
      </p>
    </form>
  )
}
```

- [ ] **Step 4: Test signup and login manually**

```bash
npm run dev
```

1. Go to http://localhost:3000/signup
2. Create a test account
3. Verify redirect to /onboard
4. Go to http://localhost:3000/login
5. Log in with same credentials
6. Verify redirect to /dashboard
7. Go to http://localhost:3000/dashboard without login → verify redirect to /login

- [ ] **Step 5: Commit**

```bash
git add src/app/\(auth\)/
git commit -m "feat: add signup and login pages with Supabase auth"
```

---

## Chunk 3: Onboarding — Scrape + Brand Profile + Preview Ads

### Task 5: URL Scraping + Brand Profile API

**Files:**
- Create: `src/app/api/campaigns/create/route.ts`
- Create: `src/lib/scraper.ts`
- Create: `src/lib/brand-profiler.ts`

- [ ] **Step 1: Create scraper utility**

Create `src/lib/scraper.ts`:

```typescript
import FirecrawlApp from '@mendable/firecrawl-js'

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY! })

export interface ScrapeResult {
  title: string
  description: string
  content: string
  ogImage?: string
}

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  const result = await firecrawl.scrapeUrl(url, {
    formats: ['markdown', 'extract'],
    extract: {
      prompt: 'Extract: page title, product description, main value proposition, target audience, key features. Return as JSON.',
    }
  })

  if (!result.success) {
    throw new Error(`Failed to scrape ${url}`)
  }

  return {
    title: result.metadata?.title || '',
    description: result.metadata?.description || '',
    content: result.markdown || '',
    ogImage: result.metadata?.ogImage,
  }
}
```

- [ ] **Step 2: Create brand profiler utility**

Create `src/lib/brand-profiler.ts`:

```typescript
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
```

- [ ] **Step 3: Create campaign creation API route**

Create `src/app/api/campaigns/create/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scrapeUrl } from '@/lib/scraper'
import { buildBrandProfile } from '@/lib/brand-profiler'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { url } = await request.json()
  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  // Create campaign in draft state
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .insert({ user_id: user.id, url, status: 'generating' })
    .select()
    .single()

  if (campaignError || !campaign) {
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
  }

  try {
    // Scrape and profile (can take 10-20s, handled client-side with polling)
    const scrape = await scrapeUrl(url)
    const brandProfile = await buildBrandProfile(scrape, url)

    // Update campaign with brand profile
    await supabase
      .from('campaigns')
      .update({ brand_profile: brandProfile as any, status: 'preview_ready' })
      .eq('id', campaign.id)

    return NextResponse.json({ campaignId: campaign.id, brandProfile })
  } catch (err) {
    await supabase
      .from('campaigns')
      .update({ status: 'draft' })
      .eq('id', campaign.id)

    return NextResponse.json({ error: 'Failed to analyze URL' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/ src/app/api/campaigns/
git commit -m "feat: add URL scraping and brand profiling pipeline"
```

---

### Task 5b: Competitor Ad Research

**Files:**
- Create: `src/lib/competitor-research.ts`
- Modify: `src/app/api/campaigns/create/route.ts`

- [ ] **Step 1: Create competitor research utility**

Create `src/lib/competitor-research.ts`:

```typescript
// Meta Ad Library API — public, no special approval needed
// Docs: https://www.facebook.com/ads/library/api/

const META_API_BASE = 'https://graph.facebook.com/v19.0'

export interface CompetitorAd {
  id: string
  page_name: string
  ad_creative_body?: string
  ad_snapshot_url?: string
}

export async function findCompetitorAds(category: string, keywords: string[]): Promise<CompetitorAd[]> {
  const searchTerms = keywords.slice(0, 3).join(' ')

  const params = new URLSearchParams({
    access_token: process.env.META_ACCESS_TOKEN!,
    ad_type: 'ALL',
    ad_reached_countries: '["US"]',
    search_terms: searchTerms,
    fields: 'id,page_name,ad_creative_bodies,ad_snapshot_url',
    limit: '5',
  })

  const res = await fetch(`${META_API_BASE}/ads_archive?${params}`)
  const data = await res.json()

  if (data.error) {
    // Non-fatal: log and return empty — ad generation continues without competitor data
    console.warn('Meta Ad Library fetch failed:', data.error.message)
    return []
  }

  return (data.data || []).map((ad: any) => ({
    id: ad.id,
    page_name: ad.page_name,
    ad_creative_body: ad.ad_creative_bodies?.[0],
    ad_snapshot_url: ad.ad_snapshot_url,
  }))
}
```

- [ ] **Step 2: Wire competitor research into campaign creation**

In `src/app/api/campaigns/create/route.ts`, after `buildBrandProfile`, add:

```typescript
// Inside the try block, after brandProfile is built:
import { findCompetitorAds } from '@/lib/competitor-research'

// After: const brandProfile = await buildBrandProfile(scrape, url)
const competitorAds = await findCompetitorAds(
  brandProfile.category,
  brandProfile.key_value_props
)
brandProfile.competitor_ad_examples = competitorAds.map(a => a.ad_creative_body || '').filter(Boolean)
```

- [ ] **Step 3: Verify competitor research runs without crashing**

```bash
npm run dev
```

Trigger the `/api/campaigns/create` endpoint with a test URL. Check server logs:
- If Meta Ad Library returns results: brand profile will include competitor ad copy snippets
- If it returns an error (common in test): logs show warning but pipeline continues

Expected: Either `competitor_ad_examples` populated, OR warning logged and pipeline continues normally

- [ ] **Step 4: Commit**

```bash
git add src/lib/competitor-research.ts src/app/api/campaigns/
git commit -m "feat: add Meta Ad Library competitor research step"
```

---

### Task 6: Ad Template Selection + Fal.ai Generation

**Files:**
- Create: `src/lib/ad-generator.ts`
- Create: `src/lib/fal-client.ts`
- Create: `src/app/api/campaigns/[campaignId]/generate-preview/route.ts`

- [ ] **Step 1: Create Fal.ai client wrapper**

**PREREQUISITE: Pre-flight must be complete.** Replace the model IDs and input field names below with the exact values you found in the pre-flight steps.

Create `src/lib/fal-client.ts`:

```typescript
import { fal } from '@fal-ai/client'

fal.config({ credentials: process.env.FAL_KEY! })

// REPLACE with exact model IDs from fal.ai (confirmed in pre-flight)
const FAL_IMAGE_MODEL = 'REPLACE_WITH_NANO_BANANA_PRO_2_MODEL_ID'
const FAL_VIDEO_MODEL = 'REPLACE_WITH_SORA_2_MODEL_ID'

export interface GeneratedAd {
  url: string
  type: 'image' | 'video'
  requestId: string
}

export async function generateImageAd(prompt: string): Promise<GeneratedAd> {
  const result = await fal.subscribe(FAL_IMAGE_MODEL, {
    input: {
      prompt,
      image_size: 'square_hd',
      num_images: 1,
    },
  }) as any

  const imageUrl = result.data?.images?.[0]?.url
  if (!imageUrl) throw new Error('No image URL in Fal.ai response')

  return {
    url: imageUrl,
    type: 'image',
    requestId: result.requestId || '',
  }
}

export async function generateVideoAd(prompt: string): Promise<GeneratedAd> {
  // REPLACE field names and response path with values from pre-flight schema check
  // Common variants: duration vs num_seconds, aspect_ratio vs resolution
  // Response path: result.data?.video?.url OR result.data?.output?.url — verify from docs
  const result = await fal.subscribe(FAL_VIDEO_MODEL, {
    input: {
      prompt,
      duration: 15,          // REPLACE with correct field name from pre-flight
      aspect_ratio: '9:16',  // REPLACE with correct field name from pre-flight
    },
  }) as any

  const videoUrl = result.data?.video?.url // REPLACE response path from pre-flight
  if (!videoUrl) throw new Error('No video URL in Fal.ai response')

  return {
    url: videoUrl,
    type: 'video',
    requestId: result.requestId || '',
  }
}
```

- [ ] **Step 2: Create ad generator with template selection**

Create `src/lib/ad-generator.ts`:

```typescript
import { createServiceClient } from '@/lib/supabase/server'
import { generateImageAd, generateVideoAd } from './fal-client'
import type { BrandProfile, AdLibraryItem } from '@/types/database'

export function buildAdPrompt(template: AdLibraryItem | null, brandProfile: BrandProfile, type: 'image' | 'video'): string {
  const base = template?.prompt || ''
  const style = type === 'video'
    ? 'Create a 15-second UGC-style vertical video ad.'
    : 'Create a square UGC-style image ad.'

  return `${style}
Product: ${brandProfile.product_name}
Category: ${brandProfile.category}
Target audience: ${brandProfile.target_audience}
Key benefits: ${brandProfile.key_value_props.join(', ')}
Tone: ${brandProfile.tone}
${base ? `Style inspiration: ${base}` : ''}
Make it feel authentic, relatable, and native to social media. No logos or text overlays needed.`
}

export async function selectTemplate(category: string): Promise<AdLibraryItem | null> {
  const supabase = await createServiceClient()
  const { data } = await supabase
    .from('ad_library')
    .select()
    .ilike('category', `%${category}%`)
    .limit(1)
    .single()

  return data || null
}

export async function generatePreviewAds(
  campaignId: string,
  brandProfile: BrandProfile
): Promise<void> {
  const supabase = await createServiceClient()
  const template = await selectTemplate(brandProfile.category)

  // Generate 1 image + 1 video preview in parallel
  const [imageResult, videoResult] = await Promise.all([
    generateImageAd(buildAdPrompt(template, brandProfile, 'image')),
    generateVideoAd(buildAdPrompt(template, brandProfile, 'video')),
  ])

  await supabase.from('ads').insert([
    {
      campaign_id: campaignId,
      type: 'image',
      is_preview: true,
      asset_url: imageResult.url,
      fal_request_id: imageResult.requestId,
      status: 'ready',
      prompt_used: buildAdPrompt(template, brandProfile, 'image'),
    },
    {
      campaign_id: campaignId,
      type: 'video',
      is_preview: true,
      asset_url: videoResult.url,
      fal_request_id: videoResult.requestId,
      status: 'ready',
      prompt_used: buildAdPrompt(template, brandProfile, 'video'),
    },
  ])
}

export async function generateFullCampaignAds(
  campaignId: string,
  brandProfile: BrandProfile
): Promise<void> {
  const supabase = await createServiceClient()
  const template = await selectTemplate(brandProfile.category)

  // Generate 4 more images + 4 more videos
  const generations = [
    ...Array(4).fill('image'),
    ...Array(4).fill('video'),
  ] as ('image' | 'video')[]

  await Promise.all(
    generations.map(async (type) => {
      const prompt = buildAdPrompt(template, brandProfile, type)
      const result = type === 'image'
        ? await generateImageAd(prompt)
        : await generateVideoAd(prompt)

      await supabase.from('ads').insert({
        campaign_id: campaignId,
        type,
        is_preview: false,
        asset_url: result.url,
        fal_request_id: result.requestId,
        status: 'ready',
        prompt_used: prompt,
      })
    })
  )

  await supabase
    .from('campaigns')
    .update({ status: 'ready' })
    .eq('id', campaignId)
}
```

- [ ] **Step 3: Create preview generation API route**

Create `src/app/api/campaigns/[campaignId]/generate-preview/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generatePreviewAds } from '@/lib/ad-generator'
import type { BrandProfile } from '@/types/database'

export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = await createServiceClient()
  const { data: campaign } = await serviceClient
    .from('campaigns')
    .select()
    .eq('id', params.campaignId)
    .eq('user_id', user.id)
    .single()

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  if (!campaign.brand_profile) return NextResponse.json({ error: 'Brand profile missing' }, { status: 400 })

  await generatePreviewAds(campaign.id, campaign.brand_profile as unknown as BrandProfile)

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/fal-client.ts src/lib/ad-generator.ts src/app/api/campaigns/
git commit -m "feat: add Fal.ai ad generation pipeline with template selection"
```

---

### Task 7: Onboarding UI

**Files:**
- Create: `src/app/(app)/onboard/page.tsx`
- Create: `src/app/(app)/layout.tsx`
- Create: `src/components/onboard/UrlForm.tsx`
- Create: `src/components/onboard/BrandProfileCard.tsx`
- Create: `src/components/onboard/AdPreview.tsx`
- Create: `src/components/onboard/BudgetForm.tsx`

- [ ] **Step 1: Create app layout (authenticated pages)**

Create `src/app/(app)/layout.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-gray-800 px-6 py-4 flex justify-between items-center">
        <span className="text-xl font-bold">Stompads</span>
        <a href="/dashboard" className="text-gray-400 hover:text-white text-sm">Dashboard</a>
      </nav>
      <main className="max-w-4xl mx-auto px-6 py-12">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Create URL form component**

Create `src/components/onboard/UrlForm.tsx`:

```typescript
'use client'

import { useState } from 'react'

interface Props {
  onSubmit: (url: string) => void
  loading: boolean
}

export function UrlForm({ onSubmit, loading }: Props) {
  const [url, setUrl] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const normalized = url.startsWith('http') ? url : `https://${url}`
    onSubmit(normalized)
  }

  return (
    <div className="text-center space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-3">Enter your website URL</h1>
        <p className="text-gray-400 text-lg">We'll analyze your site and build your ad campaign automatically.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-3 max-w-xl mx-auto">
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="yourwebsite.com"
          required
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-lg transition whitespace-nowrap"
        >
          {loading ? 'Analyzing...' : 'Analyze site →'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Create brand profile card**

Create `src/components/onboard/BrandProfileCard.tsx`:

```typescript
import type { BrandProfile } from '@/types/database'

interface Props {
  profile: BrandProfile
}

export function BrandProfileCard({ profile }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
      <h3 className="font-semibold text-lg">Brand Profile</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Product</span>
          <p className="text-white mt-1">{profile.product_name}</p>
        </div>
        <div>
          <span className="text-gray-500">Category</span>
          <p className="text-white mt-1 capitalize">{profile.category}</p>
        </div>
        <div className="col-span-2">
          <span className="text-gray-500">Target Audience</span>
          <p className="text-white mt-1">{profile.target_audience}</p>
        </div>
        <div className="col-span-2">
          <span className="text-gray-500">Key Value Props</span>
          <ul className="mt-1 space-y-1">
            {profile.key_value_props.map((prop, i) => (
              <li key={i} className="text-white">• {prop}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create ad preview component**

Create `src/components/onboard/AdPreview.tsx`:

```typescript
import type { Ad } from '@/types/database'

interface Props {
  ads: Ad[]
  generating: boolean
}

export function AdPreview({ ads, generating }: Props) {
  const imageAd = ads.find(a => a.type === 'image')
  const videoAd = ads.find(a => a.type === 'video')

  if (generating) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400">Generating your preview ads... (this takes ~30 seconds)</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Your Preview Ads</h3>
      <div className="grid grid-cols-2 gap-4">
        {imageAd?.asset_url && (
          <div className="space-y-2">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Image Ad</span>
            <img
              src={imageAd.asset_url}
              alt="Generated image ad"
              className="w-full rounded-lg border border-gray-800"
            />
          </div>
        )}
        {videoAd?.asset_url && (
          <div className="space-y-2">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Video Ad</span>
            <video
              src={videoAd.asset_url}
              controls
              className="w-full rounded-lg border border-gray-800"
            />
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create budget form**

Create `src/components/onboard/BudgetForm.tsx`:

```typescript
'use client'

import { useState } from 'react'

interface Props {
  onSubmit: (dailyBudgetCents: number) => void
  loading: boolean
}

export function BudgetForm({ onSubmit, loading }: Props) {
  const [budget, setBudget] = useState('20')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cents = Math.round(parseFloat(budget) * 100)
    onSubmit(cents)
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-lg">Set your daily budget</h3>
        <p className="text-gray-400 text-sm mt-1">You'll be charged for the first day before we generate your full campaign.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-sm text-gray-400 mb-1">Daily budget (USD)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
            <input
              type="number"
              value={budget}
              onChange={e => setBudget(e.target.value)}
              min="5"
              step="1"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-4 py-3 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-lg transition"
        >
          {loading ? 'Processing...' : 'Generate full campaign →'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 6: Create onboarding page (orchestrates all steps)**

Create `src/app/(app)/onboard/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { UrlForm } from '@/components/onboard/UrlForm'
import { BrandProfileCard } from '@/components/onboard/BrandProfileCard'
import { AdPreview } from '@/components/onboard/AdPreview'
import { BudgetForm } from '@/components/onboard/BudgetForm'
import type { BrandProfile, Ad } from '@/types/database'

type Step = 'url' | 'profiling' | 'generating_preview' | 'preview' | 'budget' | 'generating_full'

export default function OnboardPage() {
  const [step, setStep] = useState<Step>('url')
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null)
  const [previewAds, setPreviewAds] = useState<Ad[]>([])
  const [error, setError] = useState<string | null>(null)

  async function handleUrlSubmit(url: string) {
    setStep('profiling')
    setError(null)

    const res = await fetch('/api/campaigns/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Failed to analyze URL')
      setStep('url')
      return
    }

    setCampaignId(data.campaignId)
    setBrandProfile(data.brandProfile)
    setStep('generating_preview')

    // Trigger preview ad generation
    const genRes = await fetch(`/api/campaigns/${data.campaignId}/generate-preview`, {
      method: 'POST',
    })

    if (!genRes.ok) {
      setError('Failed to generate preview ads')
      setStep('preview')
      return
    }

    // Fetch the generated preview ads
    const adsRes = await fetch(`/api/campaigns/${data.campaignId}/ads?preview=true`)
    const adsData = await adsRes.json()
    setPreviewAds(adsData.ads || [])
    setStep('preview')
  }

  async function handleBudgetSubmit(dailyBudgetCents: number) {
    if (!campaignId) return
    setStep('generating_full')

    const res = await fetch(`/api/campaigns/${campaignId}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dailyBudgetCents }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Payment failed')
      setStep('preview')
      return
    }

    // Redirect to Stripe checkout
    window.location.href = data.checkoutUrl
  }

  return (
    <div className="space-y-8">
      {step === 'url' && (
        <UrlForm onSubmit={handleUrlSubmit} loading={false} />
      )}

      {(step === 'profiling' || step === 'generating_preview') && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400">
            {step === 'profiling' ? 'Analyzing your website...' : 'Generating your preview ads...'}
          </p>
        </div>
      )}

      {(step === 'preview' || step === 'budget' || step === 'generating_full') && brandProfile && (
        <>
          <BrandProfileCard profile={brandProfile} />
          <AdPreview ads={previewAds} generating={step === 'generating_preview'} />
          {step === 'preview' && (
            <BudgetForm onSubmit={handleBudgetSubmit} loading={false} />
          )}
          {step === 'generating_full' && (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-400">Generating your full campaign...</p>
            </div>
          )}
        </>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Create ads fetch API route**

Create `src/app/api/campaigns/[campaignId]/ads/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const preview = request.nextUrl.searchParams.get('preview') === 'true'

  let query = supabase
    .from('ads')
    .select()
    .eq('campaign_id', params.campaignId)

  if (preview) {
    query = query.eq('is_preview', true)
  }

  const { data: ads } = await query

  return NextResponse.json({ ads: ads || [] })
}
```

- [ ] **Step 8: Commit**

```bash
git add src/app/\(app\)/ src/components/
git commit -m "feat: add onboarding flow UI with URL entry, brand profile, and ad preview"
```

---

## Chunk 4: Stripe Billing + Full Campaign Generation

### Task 8: Stripe Checkout

**Files:**
- Create: `src/app/api/campaigns/[campaignId]/checkout/route.ts`
- Create: `src/app/api/webhooks/stripe/route.ts`
- Create: `src/app/(app)/onboard/success/page.tsx`
- Create: `src/app/(app)/onboard/cancel/page.tsx`

- [ ] **Step 1: Create Stripe checkout session API**

Create `src/app/api/campaigns/[campaignId]/checkout/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { dailyBudgetCents } = await request.json()
  if (!dailyBudgetCents || dailyBudgetCents < 500) {
    return NextResponse.json({ error: 'Minimum daily budget is $5' }, { status: 400 })
  }

  const serviceClient = await createServiceClient()
  const { data: campaign } = await serviceClient
    .from('campaigns')
    .select()
    .eq('id', params.campaignId)
    .eq('user_id', user.id)
    .single()

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Stompads Daily Ad Budget',
          description: `First day of ads for ${campaign.url}`,
        },
        unit_amount: dailyBudgetCents,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboard/success?campaign_id=${params.campaignId}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboard/cancel?campaign_id=${params.campaignId}`,
    metadata: {
      campaign_id: params.campaignId,
      user_id: user.id,
      daily_budget_cents: dailyBudgetCents.toString(),
    },
  })

  // Save payment intent to campaign
  await serviceClient
    .from('campaigns')
    .update({
      daily_budget: dailyBudgetCents,
      stripe_payment_intent_id: session.payment_intent as string,
      status: 'payment_pending',
    })
    .eq('id', params.campaignId)

  return NextResponse.json({ checkoutUrl: session.url })
}
```

- [ ] **Step 2: Create Stripe webhook handler**

Create `src/app/api/webhooks/stripe/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { generateFullCampaignAds } from '@/lib/ad-generator'
import type { BrandProfile } from '@/types/database'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.CheckoutSession
    const { campaign_id, daily_budget_cents } = session.metadata || {}

    if (!campaign_id) return NextResponse.json({ received: true })

    const supabase = await createServiceClient()

    const { data: campaign } = await supabase
      .from('campaigns')
      .select()
      .eq('id', campaign_id)
      .single()

    if (!campaign || !campaign.brand_profile) return NextResponse.json({ received: true })

    // Update status and trigger full generation
    await supabase
      .from('campaigns')
      .update({ status: 'generating_full' })
      .eq('id', campaign_id)

    // Generate remaining 4 image + 4 video ads (async, don't await in webhook)
    generateFullCampaignAds(campaign_id, campaign.brand_profile as unknown as BrandProfile)
      .catch(console.error)
  }

  return NextResponse.json({ received: true })
}
```

- [ ] **Step 3: Verify NEXT_PUBLIC_APP_URL is set in .env.local**

Confirm `.env.local` has `NEXT_PUBLIC_APP_URL=http://localhost:3000` (added in Task 1).

- [ ] **Step 4: Create success page**

Create `src/app/(app)/onboard/success/page.tsx`:

```typescript
import Link from 'next/link'

// Next.js 14 App Router: searchParams is a Promise
export default async function SuccessPage({
  searchParams
}: {
  searchParams: Promise<{ campaign_id?: string }>
}) {
  await searchParams // resolve before rendering
  return (
    <div className="text-center space-y-6 py-12">
      <div className="text-6xl">🎉</div>
      <h1 className="text-3xl font-bold">Payment confirmed!</h1>
      <p className="text-gray-400 text-lg">
        We're generating your full campaign now. Check your dashboard in a few minutes.
      </p>
      <Link
        href="/dashboard"
        className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition"
      >
        Go to Dashboard →
      </Link>
    </div>
  )
}
```

- [ ] **Step 5: Create cancel page**

Create `src/app/(app)/onboard/cancel/page.tsx`:

```typescript
import Link from 'next/link'

// Next.js 14 App Router: searchParams is a Promise
export default async function CancelPage({
  searchParams
}: {
  searchParams: Promise<{ campaign_id?: string }>
}) {
  const params = await searchParams
  return (
    <div className="text-center space-y-6 py-12">
      <h1 className="text-3xl font-bold">Payment cancelled</h1>
      <p className="text-gray-400">No charge was made. You can try again whenever you're ready.</p>
      <Link
        href={params.campaign_id ? `/onboard?campaign_id=${params.campaign_id}` : '/onboard'}
        className="inline-block bg-gray-700 hover:bg-gray-600 text-white font-semibold px-8 py-3 rounded-lg transition"
      >
        ← Go back
      </Link>
    </div>
  )
}
```

- [ ] **Step 6: Set up Stripe webhook locally (for testing)**

```bash
# Install Stripe CLI if not installed
brew install stripe/stripe-cli/stripe

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret it prints and update `STRIPE_WEBHOOK_SECRET` in `.env.local`.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/webhooks/ src/app/\(app\)/onboard/
git commit -m "feat: add Stripe checkout and webhook for campaign billing"
```

---

## Chunk 5: Meta Ads Campaign Creation

### Task 9: Meta Campaign API

**Files:**
- Create: `src/lib/meta-ads.ts`
- Create: `src/app/api/campaigns/[campaignId]/go-live/route.ts`

- [ ] **Step 1: Create Meta Ads client**

Create `src/lib/meta-ads.ts`:

```typescript
const META_API_BASE = 'https://graph.facebook.com/v19.0'
const AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID!
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN!

async function metaFetch(path: string, method: 'GET' | 'POST' = 'POST', body?: Record<string, unknown>) {
  const url = `${META_API_BASE}${path}`
  const params = new URLSearchParams({ access_token: ACCESS_TOKEN })

  const res = await fetch(method === 'GET' ? `${url}?${params}` : url, {
    method,
    headers: method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
    body: method === 'POST' ? new URLSearchParams({
      access_token: ACCESS_TOKEN,
      ...Object.fromEntries(
        Object.entries(body || {}).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)])
      ),
    }) : undefined,
  })

  const data = await res.json()
  if (data.error) throw new Error(`Meta API error: ${data.error.message}`)
  return data
}

export async function createCampaign(name: string, dailyBudgetCents: number): Promise<string> {
  const data = await metaFetch(`/${AD_ACCOUNT_ID}/campaigns`, 'POST', {
    name,
    objective: 'OUTCOME_TRAFFIC',
    status: 'ACTIVE',
    special_ad_categories: '[]',
  })
  return data.id
}

export async function createAdSet(
  campaignId: string,
  name: string,
  dailyBudgetCents: number,
  targeting: Record<string, unknown>
): Promise<string> {
  const data = await metaFetch(`/${AD_ACCOUNT_ID}/adsets`, 'POST', {
    name,
    campaign_id: campaignId,
    daily_budget: dailyBudgetCents,
    billing_event: 'IMPRESSIONS',
    optimization_goal: 'LINK_CLICKS',
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    targeting,
    status: 'ACTIVE',
  })
  return data.id
}

export async function uploadAdImage(imageUrl: string): Promise<string> {
  // Download image and upload to Meta
  const imageRes = await fetch(imageUrl)
  const imageBuffer = await imageRes.arrayBuffer()
  const base64 = Buffer.from(imageBuffer).toString('base64')

  const data = await metaFetch(`/${AD_ACCOUNT_ID}/adimages`, 'POST', {
    bytes: base64,
  })

  const hashKey = Object.keys(data.images)[0]
  return data.images[hashKey].hash
}

export async function createImageAdCreative(
  adSetId: string,
  imageHash: string,
  adAccountId: string,
  headline: string,
  body: string,
  websiteUrl: string,
  pageId: string
): Promise<string> {
  const data = await metaFetch(`/${AD_ACCOUNT_ID}/adcreatives`, 'POST', {
    name: `Stompads Image Creative ${Date.now()}`,
    object_story_spec: {
      page_id: pageId,
      link_data: {
        image_hash: imageHash,
        link: websiteUrl,
        message: body,
        name: headline,
        call_to_action: { type: 'LEARN_MORE', value: { link: websiteUrl } },
      },
    },
  })
  return data.id
}

export async function createVideoAdCreative(
  videoUrl: string,
  headline: string,
  body: string,
  websiteUrl: string,
  pageId: string
): Promise<string> {
  // First upload video to Meta
  const uploadData = await metaFetch(`/${AD_ACCOUNT_ID}/advideos`, 'POST', {
    file_url: videoUrl,
    name: `Stompads Video ${Date.now()}`,
  })

  const videoId = uploadData.id

  const data = await metaFetch(`/${AD_ACCOUNT_ID}/adcreatives`, 'POST', {
    name: `Stompads Video Creative ${Date.now()}`,
    object_story_spec: {
      page_id: pageId,
      video_data: {
        video_id: videoId,
        title: headline,
        message: body,
        call_to_action: { type: 'LEARN_MORE', value: { link: websiteUrl } },
      },
    },
  })
  return data.id
}

export async function createAd(adSetId: string, creativeId: string, name: string): Promise<string> {
  const data = await metaFetch(`/${AD_ACCOUNT_ID}/ads`, 'POST', {
    name,
    adset_id: adSetId,
    creative: { creative_id: creativeId },
    status: 'ACTIVE',
  })
  return data.id
}

export function buildTargeting(category: string): Record<string, unknown> {
  // Simple broad targeting based on category
  return {
    geo_locations: { countries: ['US'] },
    age_min: 18,
    age_max: 65,
    publisher_platforms: ['facebook', 'instagram'],
    facebook_positions: ['feed', 'story'],
    instagram_positions: ['stream', 'story'],
  }
}
```

- [ ] **Step 2: Create go-live API route**

Create `src/app/api/campaigns/[campaignId]/go-live/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  createCampaign,
  createAdSet,
  uploadAdImage,
  createImageAdCreative,
  createVideoAdCreative,
  createAd,
  buildTargeting,
} from '@/lib/meta-ads'
import type { BrandProfile } from '@/types/database'

// You need a Facebook Page ID for ad creatives - add this to env
const PAGE_ID = process.env.META_PAGE_ID!

export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = await createServiceClient()

  const { data: campaign } = await serviceClient
    .from('campaigns')
    .select()
    .eq('id', params.campaignId)
    .eq('user_id', user.id)
    .single()

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  if (campaign.status !== 'ready') {
    return NextResponse.json({ error: 'Campaign is not ready to go live' }, { status: 400 })
  }

  const { data: ads } = await serviceClient
    .from('ads')
    .select()
    .eq('campaign_id', params.campaignId)
    .eq('status', 'ready')

  if (!ads || ads.length === 0) {
    return NextResponse.json({ error: 'No ready ads found' }, { status: 400 })
  }

  const brandProfile = campaign.brand_profile as unknown as BrandProfile
  const headline = `${brandProfile.product_name} — ${brandProfile.key_value_props[0]}`
  const body = brandProfile.key_value_props.slice(0, 2).join('. ')
  const targeting = buildTargeting(brandProfile.category)

  try {
    // Create Meta campaign and ad set
    const metaCampaignId = await createCampaign(
      `Stompads - ${brandProfile.product_name}`,
      campaign.daily_budget!
    )

    const metaAdSetId = await createAdSet(
      metaCampaignId,
      `Stompads AdSet - ${brandProfile.category}`,
      campaign.daily_budget!,
      targeting
    )

    // Update campaign with Meta IDs
    await serviceClient
      .from('campaigns')
      .update({ meta_campaign_id: metaCampaignId, meta_adset_id: metaAdSetId })
      .eq('id', params.campaignId)

    // Create Meta ads for each generated creative
    for (const ad of ads) {
      if (!ad.asset_url) continue

      let creativeId: string

      if (ad.type === 'image') {
        const imageHash = await uploadAdImage(ad.asset_url)
        creativeId = await createImageAdCreative(
          metaAdSetId, imageHash, process.env.META_AD_ACCOUNT_ID!,
          headline, body, campaign.url, PAGE_ID
        )
      } else {
        creativeId = await createVideoAdCreative(
          ad.asset_url, headline, body, campaign.url, PAGE_ID
        )
      }

      const metaAdId = await createAd(metaAdSetId, creativeId, `Stompads Ad ${ad.id}`)

      await serviceClient
        .from('ads')
        .update({ meta_ad_id: metaAdId, meta_creative_id: creativeId, status: 'live' })
        .eq('id', ad.id)
    }

    // Mark campaign as live
    await serviceClient
      .from('campaigns')
      .update({ status: 'live' })
      .eq('id', params.campaignId)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Meta campaign launch error:', err)
    return NextResponse.json({ error: 'Failed to launch Meta campaign' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Verify META_PAGE_ID is set in .env.local**

Confirm `.env.local` has `META_PAGE_ID=YOUR_FACEBOOK_PAGE_ID` (added in Task 1).

To find your Page ID: Go to your Facebook Page → About → Page transparency → Page ID.

- [ ] **Step 4: Commit**

```bash
git add src/lib/meta-ads.ts src/app/api/campaigns/
git commit -m "feat: add Meta Ads campaign creation and go-live API"
```

---

## Chunk 6: Dashboard + Metrics

### Task 10: Dashboard Page

**Files:**
- Create: `src/app/(app)/dashboard/page.tsx`
- Create: `src/app/(app)/dashboard/[campaignId]/page.tsx`
- Create: `src/components/dashboard/AdCard.tsx`
- Create: `src/components/dashboard/MetricsBadge.tsx`

- [ ] **Step 1: Create metrics badge component**

Create `src/components/dashboard/MetricsBadge.tsx`:

```typescript
interface Props {
  label: string
  value: string | number
  sub?: string
}

export function MetricsBadge({ label, value, sub }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Create ad card component**

Create `src/components/dashboard/AdCard.tsx`:

```typescript
import type { Ad, Metrics } from '@/types/database'
import { MetricsBadge } from './MetricsBadge'

interface Props {
  ad: Ad
  metrics?: Metrics
}

export function AdCard({ ad, metrics }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="aspect-square bg-gray-800">
        {ad.type === 'image' && ad.asset_url && (
          <img src={ad.asset_url} alt="Ad creative" className="w-full h-full object-cover" />
        )}
        {ad.type === 'video' && ad.asset_url && (
          <video src={ad.asset_url} className="w-full h-full object-cover" muted loop autoPlay />
        )}
      </div>
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs uppercase tracking-wide text-gray-500">{ad.type}</span>
          <span className={`text-xs px-2 py-1 rounded-full ${
            ad.status === 'live' ? 'bg-green-900 text-green-300' :
            ad.status === 'ready' ? 'bg-blue-900 text-blue-300' :
            'bg-gray-800 text-gray-400'
          }`}>
            {ad.status}
          </span>
        </div>
        {metrics && (
          <div className="grid grid-cols-2 gap-2">
            <MetricsBadge label="CTR" value={`${(metrics.ctr * 100).toFixed(2)}%`} />
            <MetricsBadge label="CPC" value={`$${metrics.cpc.toFixed(2)}`} />
            <MetricsBadge label="Clicks" value={metrics.clicks.toLocaleString()} />
            <MetricsBadge label="Spend" value={`$${metrics.spend.toFixed(2)}`} />
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create campaign detail page**

Create `src/app/(app)/dashboard/[campaignId]/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdCard } from '@/components/dashboard/AdCard'
import { MetricsBadge } from '@/components/dashboard/MetricsBadge'
import type { BrandProfile } from '@/types/database'
import GoLiveButton from './GoLiveButton'

export default async function CampaignPage({ params }: { params: { campaignId: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: campaign } = await supabase
    .from('campaigns')
    .select()
    .eq('id', params.campaignId)
    .eq('user_id', user.id)
    .single()

  if (!campaign) redirect('/dashboard')

  const { data: ads } = await supabase
    .from('ads')
    .select()
    .eq('campaign_id', params.campaignId)
    .order('created_at')

  // Get latest metrics per ad
  const adIds = (ads || []).map(a => a.id)
  const { data: allMetrics } = adIds.length > 0
    ? await supabase
        .from('metrics')
        .select()
        .in('ad_id', adIds)
        .order('recorded_at', { ascending: false })
    : { data: [] }

  // Latest metric per ad
  const latestMetrics = new Map<string, typeof allMetrics extends (infer T)[] | null ? T : never>()
  for (const m of allMetrics || []) {
    if (!latestMetrics.has(m.ad_id)) latestMetrics.set(m.ad_id, m)
  }

  const brandProfile = campaign.brand_profile as unknown as BrandProfile
  const totalSpend = Array.from(latestMetrics.values()).reduce((s, m) => s + (m?.spend || 0), 0)
  const totalClicks = Array.from(latestMetrics.values()).reduce((s, m) => s + (m?.clicks || 0), 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{brandProfile?.product_name || campaign.url}</h1>
        <p className="text-gray-400 mt-1">{campaign.url}</p>
        <span className={`inline-block mt-2 text-xs px-3 py-1 rounded-full ${
          campaign.status === 'live' ? 'bg-green-900 text-green-300' :
          campaign.status === 'ready' ? 'bg-blue-900 text-blue-300' :
          'bg-gray-800 text-gray-400'
        }`}>
          {campaign.status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <MetricsBadge
          label="Daily Budget"
          value={`$${((campaign.daily_budget || 0) / 100).toFixed(0)}/day`}
        />
        <MetricsBadge label="Total Spend" value={`$${totalSpend.toFixed(2)}`} />
        <MetricsBadge label="Total Clicks" value={totalClicks.toLocaleString()} />
      </div>

      {campaign.status === 'ready' && (
        <GoLiveButton campaignId={campaign.id} />
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">Your Ads</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {(ads || []).map(ad => (
            <AdCard
              key={ad.id}
              ad={ad}
              metrics={latestMetrics.get(ad.id) ?? undefined}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create GoLiveButton client component**

Create `src/app/(app)/dashboard/[campaignId]/GoLiveButton.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function GoLiveButton({ campaignId }: { campaignId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleGoLive() {
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/campaigns/${campaignId}/go-live`, { method: 'POST' })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Failed to go live')
      setLoading(false)
      return
    }

    router.refresh()
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleGoLive}
        disabled={loading}
        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl text-lg transition"
      >
        {loading ? 'Launching campaign...' : '🚀 Go Live — Get Traffic'}
      </button>
      {error && <p className="text-red-400 text-sm text-center">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 5: Create main dashboard page**

Create `src/app/(app)/dashboard/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select()
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="text-center py-20 space-y-6">
        <h1 className="text-3xl font-bold">No campaigns yet</h1>
        <p className="text-gray-400">Create your first campaign and get traffic in minutes.</p>
        <Link
          href="/onboard"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition"
        >
          Create campaign →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Your Campaigns</h1>
        <Link
          href="/onboard"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
        >
          + New campaign
        </Link>
      </div>

      <div className="space-y-3">
        {campaigns.map(campaign => (
          <Link
            key={campaign.id}
            href={`/dashboard/${campaign.id}`}
            className="block bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-5 transition"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{campaign.url}</p>
                <p className="text-sm text-gray-400 mt-1">
                  ${((campaign.daily_budget || 0) / 100).toFixed(0)}/day
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                campaign.status === 'live' ? 'bg-green-900 text-green-300' :
                campaign.status === 'ready' ? 'bg-blue-900 text-blue-300' :
                'bg-gray-800 text-gray-400'
              }`}>
                {campaign.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/dashboard/ src/components/dashboard/
git commit -m "feat: add dashboard with campaign list and per-ad metrics"
```

---

## Chunk 7: Metrics Sync Cron + Admin Library

### Task 11: Meta Metrics Sync

**Files:**
- Create: `src/app/api/cron/sync-metrics/route.ts`
- Create: `vercel.json`

- [ ] **Step 1: Create metrics sync route**

Create `src/app/api/cron/sync-metrics/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const META_API_BASE = 'https://graph.facebook.com/v19.0'

async function fetchMetaInsights(metaCampaignId: string, accessToken: string) {
  const fields = 'impressions,clicks,ctr,cpc,spend'
  const url = `${META_API_BASE}/${metaCampaignId}/ads?fields=id,name,insights{${fields}}&access_token=${accessToken}`
  const res = await fetch(url)
  const data = await res.json()
  return data.data || []
}

export async function GET(request: NextRequest) {
  // Protect cron endpoint
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()

  // Get all live campaigns with Meta campaign IDs
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select()
    .eq('status', 'live')
    .not('meta_campaign_id', 'is', null)

  if (!campaigns || campaigns.length === 0) {
    return NextResponse.json({ synced: 0 })
  }

  let synced = 0

  for (const campaign of campaigns) {
    try {
      const metaAds = await fetchMetaInsights(
        campaign.meta_campaign_id!,
        process.env.META_ACCESS_TOKEN!
      )

      for (const metaAd of metaAds) {
        const insights = metaAd.insights?.data?.[0]
        if (!insights) continue

        // Find the matching ad in our DB
        const { data: ad } = await supabase
          .from('ads')
          .select()
          .eq('meta_ad_id', metaAd.id)
          .single()

        if (!ad) continue

        await supabase.from('metrics').insert({
          ad_id: ad.id,
          campaign_id: campaign.id,
          impressions: parseInt(insights.impressions || '0'),
          clicks: parseInt(insights.clicks || '0'),
          ctr: parseFloat(insights.ctr || '0'),
          cpc: parseFloat(insights.cpc || '0'),
          spend: parseFloat(insights.spend || '0'),
        })

        synced++
      }
    } catch (err) {
      console.error(`Failed to sync campaign ${campaign.id}:`, err)
    }
  }

  return NextResponse.json({ synced })
}
```

- [ ] **Step 2: Verify CRON_SECRET is set in .env.local**

Confirm `.env.local` has `CRON_SECRET=` set (added in Task 1). Generate the value with: `openssl rand -hex 32`

- [ ] **Step 3: Create vercel.json with cron**

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-metrics",
      "schedule": "0 * * * *"
    }
  ]
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/ vercel.json
git commit -m "feat: add hourly Meta metrics sync cron job"
```

---

### Task 12: Admin Library

**Files:**
- Create: `src/app/api/admin/library/route.ts`
- Create: `src/app/(app)/admin/library/page.tsx`

- [ ] **Step 1: Create admin library API**

Create `src/app/api/admin/library/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

function isAdmin(email: string) {
  return email === process.env.ADMIN_EMAIL
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email!)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const serviceClient = await createServiceClient()
  const { data } = await serviceClient.from('ad_library').select().order('created_at', { ascending: false })
  return NextResponse.json({ items: data || [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email!)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const category = formData.get('category') as string
  const prompt = formData.get('prompt') as string
  const notes = formData.get('notes') as string
  const file = formData.get('visual') as File | null

  let visualUrl: string | null = null

  if (file) {
    const serviceClient = await createServiceClient()
    const fileName = `${Date.now()}-${file.name}`
    const { data: upload } = await serviceClient.storage
      .from('ad-library')
      .upload(fileName, file)

    if (upload) {
      const { data: { publicUrl } } = serviceClient.storage
        .from('ad-library')
        .getPublicUrl(fileName)
      visualUrl = publicUrl
    }
  }

  const serviceClient = await createServiceClient()
  const { data, error } = await serviceClient
    .from('ad_library')
    .insert({ category, prompt, notes, visual_url: visualUrl })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}
```

- [ ] **Step 2: Create admin library page**

Create `src/app/(app)/admin/library/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import type { AdLibraryItem } from '@/types/database'

export default function AdminLibraryPage() {
  const [items, setItems] = useState<AdLibraryItem[]>([])
  const [category, setCategory] = useState('')
  const [prompt, setPrompt] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/library')
      .then(r => r.json())
      .then(d => setItems(d.items || []))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const formData = new FormData()
    formData.append('category', category)
    formData.append('prompt', prompt)
    formData.append('notes', notes)
    if (file) formData.append('visual', file)

    const res = await fetch('/api/admin/library', { method: 'POST', body: formData })
    const data = await res.json()

    if (!res.ok) {
      setMessage(`Error: ${data.error}`)
    } else {
      setItems(prev => [data.item, ...prev])
      setCategory('')
      setPrompt('')
      setNotes('')
      setFile(null)
      setMessage('Template saved!')
    }
    setLoading(false)
  }

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold">Ad Template Library</h1>

      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold">Add New Template</h2>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Category</label>
          <input
            value={category}
            onChange={e => setCategory(e.target.value)}
            required
            placeholder="e.g. ecommerce, saas, fitness"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Prompt Inspiration</label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            required
            rows={4}
            placeholder="Describe the style, format, and feel of this ad template..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Notes (optional)</label>
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Why this works, when to use it..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Reference Visual (optional)</label>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="text-gray-400"
          />
        </div>
        {message && <p className="text-sm text-green-400">{message}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg transition"
        >
          {loading ? 'Saving...' : 'Save Template'}
        </button>
      </form>

      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex justify-between">
              <span className="text-xs uppercase text-blue-400 tracking-wide">{item.category}</span>
              <span className="text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString()}</span>
            </div>
            <p className="text-sm text-gray-300 mt-2 line-clamp-2">{item.prompt}</p>
            {item.notes && <p className="text-xs text-gray-500 mt-1">{item.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/admin/ src/app/api/admin/
git commit -m "feat: add admin ad template library with upload"
```

---

## Chunk 8: Landing Page + Final Wiring

### Task 13: Landing Page

**Files:**
- Create: `src/app/page.tsx`

- [ ] **Step 1: Create landing page**

Create `src/app/page.tsx`:

```typescript
import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="px-8 py-6 flex justify-between items-center border-b border-gray-900">
        <span className="text-xl font-bold">Stompads</span>
        <div className="flex gap-4">
          <Link href="/login" className="text-gray-400 hover:text-white text-sm">Log in</Link>
          <Link href="/signup" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
            Get started
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-8 py-24 text-center space-y-8">
        <h1 className="text-6xl font-bold leading-tight">
          Enter URL.<br />Get traffic.
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Stompads generates AI-powered video and image ads for your product and runs them on Meta — automatically. No ad account needed.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/signup" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl text-lg transition">
            Start for free →
          </Link>
        </div>

        <div className="pt-16 grid grid-cols-3 gap-8 text-left">
          {[
            { title: 'Enter your URL', desc: 'We scrape your site and understand your product instantly.' },
            { title: 'We generate your ads', desc: 'AI-generated UGC video and image ads tailored to your brand.' },
            { title: 'Sit back and watch', desc: 'We run ads on Meta, optimize automatically, and show you results.' },
          ].map(item => (
            <div key={item.title} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-gray-400 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Final end-to-end test**

Walk through the full flow manually:
1. Go to http://localhost:3000 — landing page loads
2. Sign up → redirects to /onboard
3. Enter a URL → brand profile appears
4. Preview ads generate
5. Enter budget → Stripe test checkout (use card `4242 4242 4242 4242`, any future date, any CVC)
6. After payment → success page → dashboard
7. Dashboard shows campaign in `generating_full` state
8. Check Supabase dashboard → verify ads rows created with `status=ready`
9. Campaign moves to `ready` → Go Live button appears

**To test Go Live without hitting real Meta API:** In `src/app/api/campaigns/[campaignId]/go-live/route.ts`, temporarily wrap the meta calls in `if (process.env.NODE_ENV !== 'development')` or comment out the `createCampaign` call and hardcode a fake `metaCampaignId = 'test_123'`. Verify the campaign status updates to `live` in Supabase. Revert before deploying to production.

**Vercel webhook note:** The Stripe webhook fires `generateFullCampaignAds(...)` without awaiting. On Vercel serverless, the function terminates after the response — meaning the async generation may be cut off. Before production deploy, wrap the call with `waitUntil` from Vercel's `@vercel/functions` package:
```typescript
import { waitUntil } from '@vercel/functions'
// Replace the fire-and-forget call with:
waitUntil(generateFullCampaignAds(campaign_id, campaign.brand_profile as unknown as BrandProfile))
```
Add `@vercel/functions` to dependencies: `npm install @vercel/functions`

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: add landing page and complete Stompads v1"
```

---

## Deployment Checklist

After all tasks are complete:

- [ ] Push to GitHub: `git push origin main`
- [ ] Go to vercel.com → New Project → import GitHub repo → configure project
- [ ] In Vercel project settings → Environment Variables → add all vars from `.env.example` with production values
- [ ] Set `NEXT_PUBLIC_APP_URL` to your production domain (e.g. `https://stompads.com`)
- [ ] Deploy first time → get production URL
- [ ] In Stripe dashboard → Developers → Webhooks → Add endpoint: `https://yourdomain.com/api/webhooks/stripe` → select event `checkout.session.completed`
- [ ] Copy the new Stripe webhook signing secret → add as `STRIPE_WEBHOOK_SECRET` in Vercel env vars → redeploy
- [ ] Add `@vercel/functions` and update Stripe webhook to use `waitUntil` (see Task 13 Step 2 note)
- [ ] Test full flow on production with a real Stripe test card
- [ ] Verify cron job appears in Vercel dashboard → Cron Jobs tab

---

## Still Needed From You

Before Task 9 (Meta go-live) can work, you need:
- **Facebook Page ID** — a Meta Ad must be associated with a Facebook Page. Find it: Facebook Page → About → Page ID. Add as `META_PAGE_ID` in `.env.local`.
- **Rotated Meta credentials** — update `.env.local` with new App Secret and Access Token after rotating.
- **Anthropic API key** — for brand profiling (`ANTHROPIC_API_KEY`)
- **Firecrawl API key** — for URL scraping (`FIRECRAWL_API_KEY`)
- **Fal.ai model IDs** — verify exact model IDs for Sora 2 and Nano Banana Pro 2 on fal.ai
