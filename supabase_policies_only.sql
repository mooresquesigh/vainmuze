-- Run this if the tables already exist (skips CREATE TABLE)
-- Paste into Supabase SQL Editor → New query → Run

-- Enable Row Level Security (safe to run again)
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (to avoid duplicates)
DROP POLICY IF EXISTS "Public can view approved artists" ON artists;
DROP POLICY IF EXISTS "Artist can view own profile" ON artists;
DROP POLICY IF EXISTS "Artist can update own profile" ON artists;
DROP POLICY IF EXISTS "Artist can insert own profile" ON artists;
DROP POLICY IF EXISTS "Public can view songs of approved artists" ON songs;
DROP POLICY IF EXISTS "Artist can view own songs" ON songs;
DROP POLICY IF EXISTS "Artist can insert own songs" ON songs;
DROP POLICY IF EXISTS "Artist can update own songs" ON songs;
DROP POLICY IF EXISTS "Artist can delete own songs" ON songs;

-- Artists policies
CREATE POLICY "Public can view approved artists"
  ON artists FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Artist can view own profile"
  ON artists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Artist can update own profile"
  ON artists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Artist can insert own profile"
  ON artists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Songs policies
CREATE POLICY "Public can view songs of approved artists"
  ON songs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM artists
      WHERE artists.id = songs.artist_id
      AND artists.status = 'approved'
    )
  );

CREATE POLICY "Artist can view own songs"
  ON songs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM artists
      WHERE artists.id = songs.artist_id
      AND artists.user_id = auth.uid()
    )
  );

CREATE POLICY "Artist can insert own songs"
  ON songs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM artists
      WHERE artists.id = songs.artist_id
      AND artists.user_id = auth.uid()
    )
  );

CREATE POLICY "Artist can update own songs"
  ON songs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM artists
      WHERE artists.id = songs.artist_id
      AND artists.user_id = auth.uid()
    )
  );

CREATE POLICY "Artist can delete own songs"
  ON songs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM artists
      WHERE artists.id = songs.artist_id
      AND artists.user_id = auth.uid()
    )
  );

-- Storage buckets (safe to run — uses INSERT ... ON CONFLICT DO NOTHING)
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio', 'audio', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('artist-photos', 'artist-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Anyone can listen to audio" ON storage.objects;
DROP POLICY IF EXISTS "Artists can upload audio" ON storage.objects;
DROP POLICY IF EXISTS "Artists can update own audio" ON storage.objects;
DROP POLICY IF EXISTS "Artists can delete own audio" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view artist photos" ON storage.objects;
DROP POLICY IF EXISTS "Artists can upload own photo" ON storage.objects;
DROP POLICY IF EXISTS "Artists can update own photo" ON storage.objects;

CREATE POLICY "Anyone can listen to audio"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'audio');

CREATE POLICY "Artists can upload audio"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'audio' AND auth.role() = 'authenticated');

CREATE POLICY "Artists can update own audio"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Artists can delete own audio"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view artist photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'artist-photos');

CREATE POLICY "Artists can upload own photo"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'artist-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Artists can update own photo"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'artist-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
