-- Subtitle generation config (all params for fal-ai/workflow-utilities/auto-subtitle)
insert into public.ad_config (key, value) values
  ('subtitle_language', 'en'),
  ('subtitle_font_name', 'Montserrat'),
  ('subtitle_font_size', '80'),
  ('subtitle_font_weight', 'bold'),
  ('subtitle_font_color', 'white'),
  ('subtitle_highlight_color', 'orange'),
  ('subtitle_stroke_width', '3'),
  ('subtitle_stroke_color', 'black'),
  ('subtitle_background_color', 'none'),
  ('subtitle_position', 'bottom'),
  ('subtitle_y_offset', '190'),
  ('subtitle_words_per_subtitle', '3'),
  ('subtitle_enable_animation', 'true')
on conflict (key) do nothing;
