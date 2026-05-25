-- Migration: Add seo_content field to tools table
-- Description: Adds a new text field to store custom SEO-optimized educational content
-- This field is used for visible content below the tool UI (not meta tags)

-- Add seo_content column if it doesn't exist
ALTER TABLE tools ADD COLUMN IF NOT EXISTS seo_content text;

-- Add comment explaining the field
COMMENT ON COLUMN tools.seo_content IS 'Custom SEO-optimized educational content rendered visibly on tool pages. Supports HTML. Not for meta tags or hidden content.';
