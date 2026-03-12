-- Config table for ad generation settings (operator-managed)
create table if not exists public.ad_config (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Seed defaults (test mode — cheap and fast)
insert into public.ad_config (key, value) values
  ('video_model', 'fal-ai/sora-2/text-to-video'),
  ('video_duration', '4'),
  ('video_resolution', '720p'),
  ('video_aspect_ratio', '9:16'),
  ('subtitle_enabled', 'true')
on conflict (key) do nothing;

-- Allow service role full access, authenticated users read-only
alter table public.ad_config enable row level security;

create policy "Anyone can read config"
  on public.ad_config for select
  to authenticated
  using (true);
