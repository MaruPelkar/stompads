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
