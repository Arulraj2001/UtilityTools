-- Migration: Add primary/secondary keywords to tools table
-- Run this on existing Supabase projects to add the new columns

-- Add primary_keywords column if it doesn't exist
ALTER TABLE tools
ADD COLUMN IF NOT EXISTS primary_keywords text;

-- Add secondary_keywords column if it doesn't exist
ALTER TABLE tools
ADD COLUMN IF NOT EXISTS secondary_keywords text;

-- Migration complete - tools table now supports primary and secondary keywords
