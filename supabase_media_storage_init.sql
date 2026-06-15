-- ============================================================
-- Create Storage Bucket 'media' and RLS Policies
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Create the bucket if it does not exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies on this bucket to prevent collisions
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin Write Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Access" ON storage.objects;

-- 3. Create public SELECT access to files inside the media bucket
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'media' );

-- 4. Create INSERT policy for logged-in admin users only
CREATE POLICY "Admin Write Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media' AND
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- 5. Create DELETE policy for logged-in admin users only
CREATE POLICY "Admin Delete Access"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'media' AND
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid() AND is_admin = true
  )
);
