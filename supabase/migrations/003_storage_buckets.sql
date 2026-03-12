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
