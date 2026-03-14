-- Add pipeline_step to ads for granular progress tracking
-- Add raw_asset_url to preserve the pre-subtitle video

ALTER TABLE ads ADD COLUMN pipeline_step text NOT NULL DEFAULT 'video_generating';
ALTER TABLE ads ADD COLUMN raw_asset_url text;
