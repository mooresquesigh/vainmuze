-- Run this in Supabase SQL Editor → New query → Run
-- Adds admin policies + seeds VainMuze artist and songs

-- 1. Make user_id nullable so we can seed artists without an auth account yet
ALTER TABLE artists ALTER COLUMN user_id DROP NOT NULL;

-- 2. Admin policies (mooresquesigh@gmail.com has full access)
DROP POLICY IF EXISTS "Admin can view all artists" ON artists;
DROP POLICY IF EXISTS "Admin can update all artists" ON artists;
DROP POLICY IF EXISTS "Admin can delete artists" ON artists;

CREATE POLICY "Admin can view all artists"
  ON artists FOR SELECT
  USING (auth.jwt() ->> 'email' = 'mooresquesigh@gmail.com');

CREATE POLICY "Admin can update all artists"
  ON artists FOR UPDATE
  USING (auth.jwt() ->> 'email' = 'mooresquesigh@gmail.com');

CREATE POLICY "Admin can delete artists"
  ON artists FOR DELETE
  USING (auth.jwt() ->> 'email' = 'mooresquesigh@gmail.com');

-- Admin can see all songs too
DROP POLICY IF EXISTS "Admin can view all songs" ON songs;
DROP POLICY IF EXISTS "Admin can update all songs" ON songs;
DROP POLICY IF EXISTS "Admin can delete all songs" ON songs;

CREATE POLICY "Admin can view all songs"
  ON songs FOR SELECT
  USING (auth.jwt() ->> 'email' = 'mooresquesigh@gmail.com');

CREATE POLICY "Admin can update all songs"
  ON songs FOR UPDATE
  USING (auth.jwt() ->> 'email' = 'mooresquesigh@gmail.com');

CREATE POLICY "Admin can delete all songs"
  ON songs FOR DELETE
  USING (auth.jwt() ->> 'email' = 'mooresquesigh@gmail.com');

-- 3. Seed VainMuze as approved artist
INSERT INTO artists (name, slug, location, established, bio1, bio2, bio3, genres, photo_url, status)
VALUES (
  'VainMuze',
  'vainmuze',
  'Portland, Oregon',
  '2004',
  'A Portland songwriter and producer, rooted in the beautiful Pacific Northwest. For two decades I have been writing songs that do not apologize.',
  'Hip hop that bleeds truth. Blues that aches. Indie anthems for the ones who will not give up. Cinematic pop for moments that deserve a score.',
  'VainMuze started as an artist name. Now it is becoming a platform where independent voices sell their music directly, without gatekeepers.',
  ARRAY['Hip Hop', 'Blues', 'Indie', 'Cinematic Pop'],
  '/VainMuze_avatar.png',
  'approved'
)
ON CONFLICT (slug) DO NOTHING;

-- 4. Seed VainMuze songs (audio served from Vercel public folder for now)
INSERT INTO songs (artist_id, title, genre, duration, price, audio_url, preview_url)
SELECT
  a.id,
  song.title,
  song.genre,
  song.duration,
  1.15,
  song.audio_url,
  song.audio_url
FROM artists a,
(VALUES
  ('America', 'Hip Hop', '3:45', '/America.wav'),
  ('Human Tragedy', 'Indie', '4:00', '/Human Tragedy.wav'),
  ('My Shadow and I', 'Blues', '3:30', '/My Shadow and I.wav'),
  ('Crying', 'Indie Pop', '3:30', '/Crying.wav'),
  ('Falling', 'Indie', '3:30', '/Falling.wav'),
  ('I Pray for You', 'Indie', '3:30', '/I Pray for You.wav'),
  ('Maybe in the Next Hour', 'Blues', '3:30', '/Maybe in the Next Hour.wav'),
  ('My Life', 'Indie', '3:30', '/My Life.wav'),
  ('Pretty for Me', 'Blues', '3:30', '/Pretty for Me.wav')
) AS song(title, genre, duration, audio_url)
WHERE a.slug = 'vainmuze';
