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
