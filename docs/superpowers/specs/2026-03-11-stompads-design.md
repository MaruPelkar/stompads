# Stompads — Design Spec
**Date:** 2026-03-11
**Status:** Approved

---

## What We're Building

Stompads is a self-serve ad platform. A user enters their URL and daily budget — Stompads scrapes their site, generates UGC video and image ads, launches them on Meta Ads (via the operator's account), and shows live performance metrics. Users never touch Meta.

---

## Onboarding Flow

1. User signs up with email + password
2. Enters their website URL
3. Stompads scrapes the URL → builds a brand profile (category, tone, product, audience)
4. Searches Meta Ad Library for competitor ads in the same category
5. Selects best-matching template from admin ad library (prompt + visual + category)
6. Generates **1 image ad** (Nano Banana Pro 2) + **1 video ad** (Sora 2 via Fal.ai) — free preview
7. User views the preview ads
8. Clicks **"Generate Full Campaign"**
9. Enters daily budget → Stripe charges first day upfront
10. Generates remaining **4 image + 4 video ads**
11. User clicks **"Go Live"** → Meta campaign created via API
12. Dashboard activates with live metrics

---

## Architecture

**Stack:**
- Next.js 14 (App Router) — frontend + API routes
- Supabase — auth (email/password), Postgres DB, file storage (ad creatives)
- Stripe — daily budget billing, charge before campaign launch
- Fal.ai — Sora 2 (video), Nano Banana Pro 2 (images)
- Meta Marketing API — campaign creation, ad delivery, metrics sync
- Firecrawl — URL scraping
- Vercel — deployment

---

## Database Schema

### `users`
- id, email, created_at

### `campaigns`
- id, user_id, url, brand_profile (jsonb), status (draft|generating|live|paused), daily_budget, meta_campaign_id, created_at

### `ads`
- id, campaign_id, type (image|video), fal_job_id, asset_url, meta_ad_id, status (generating|ready|live), created_at

### `metrics`
- id, ad_id, campaign_id, impressions, clicks, ctr, cpc, spend, recorded_at

### `ad_library` (admin-managed)
- id, category, prompt, visual_url, notes, created_at

---

## Key Pages & Components

### Public
- `/` — landing page
- `/signup` — email + password signup
- `/login` — login

### Authenticated
- `/onboard` — URL entry → brand profile → preview ads → budget → go live
- `/dashboard` — campaign overview with per-ad metrics gallery
- `/dashboard/[campaignId]` — detailed single campaign view

### Admin (operator only)
- `/admin/library` — upload ad templates (prompt + visual + category)

---

## Ad Generation Pipeline

1. **Scrape** — Firecrawl extracts full page content, meta tags, product info
2. **Profile** — GPT-4o (via OpenAI) interprets scrape into: category, tone, target audience, key value props
3. **Competitor research** — Meta Ad Library API query by category keywords
4. **Template selection** — match brand profile category against `ad_library` table, pick best fit
5. **Generation:**
   - Image: POST to Fal.ai Nano Banana Pro 2 with customized prompt
   - Video: POST to Fal.ai Sora 2 with customized prompt
   - Poll for completion (Fal.ai async), store result in Supabase storage
6. **Preview** — show 1 image + 1 video before payment

---

## Billing

- Stripe Checkout session created when user clicks "Generate Full Campaign"
- Charge = daily_budget (first day upfront)
- On payment success webhook → trigger full ad generation → create Meta campaign on "Go Live"
- Future: recurring daily charge via Stripe (v2)

---

## Meta Campaign Structure

- One Meta Campaign per Stompads campaign
- One Ad Set (auto targeting based on brand profile category + Facebook interest targeting)
- One Ad per generated creative (up to 5 image + 5 video)
- All run under operator's Meta Ads account / billing

---

## Metrics Sync

- Vercel Cron job runs every hour
- Calls Meta Insights API for all live campaigns
- Writes CTR, CPC, impressions, spend per ad to `metrics` table
- Dashboard reads latest metrics row per ad

---

## Admin Library

- Operator (you) logs in to `/admin/library`
- Uploads: category tag, example prompt, reference visual (image/video)
- Stored in `ad_library` table + Supabase storage
- Pipeline uses this as inspiration seed for new customer ad generation

---

## Auth & Access Control

- Supabase Auth (email + password)
- Admin route protected by checking `user.email` against hardcoded admin email env var
- RLS policies on all tables: users can only read/write their own data

---

## Out of Scope (v1)

- Ad rotation / optimization
- Multiple campaigns per user
- Lookalike or custom audiences
- Meta Pixel / conversion tracking
- Recurring daily billing (manual top-up for now)
- Social login (Google OAuth)
