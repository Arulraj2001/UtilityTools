-- Safe migration: Add SEO fields to categories table
-- Backward compatible: all fields nullable, no breaking changes

ALTER TABLE categories
ADD COLUMN IF NOT EXISTS seo_title TEXT,
ADD COLUMN IF NOT EXISTS seo_description TEXT,
ADD COLUMN IF NOT EXISTS seo_keywords TEXT,
ADD COLUMN IF NOT EXISTS seo_content TEXT,
ADD COLUMN IF NOT EXISTS featured_image TEXT,
ADD COLUMN IF NOT EXISTS canonical_url TEXT;

-- Optional: Create an index for seo-related queries if needed
-- CREATE INDEX IF NOT EXISTS idx_categories_seo ON categories(seo_title, seo_keywords);

-- Verify migration
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'categories';
