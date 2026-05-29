# VainMuze — Development Log

**Platform:** Multi-artist independent music store (Bandcamp alternative)  
**Stack:** React + Vite + Supabase + Stripe + Vercel  
**Owner:** Ali (mooresquesigh@gmail.com)  
**Started:** May 2026  

---

## Origin

VainMuze began as a basic React music store with hardcoded song data and a Stripe checkout. It was deployed on Vercel at vainmuze.vercel.app. The goal evolved into building a full multi-artist platform where independent artists can sell music directly to fans — no labels, no gatekeepers.

---

## Session 1 — May 25, 2026

### What Was Built

#### 1. Architecture Decision
Replaced the Bubble app approach with a Claude + Supabase + React stack. Advantages: no platform limitations, full code ownership, Claude knows the entire codebase, faster iteration.

#### 2. Supabase Project Setup
- Created new Supabase project: `vainmuze`
- Project URL: `https://jjhphtvblycudqjjenqf.supabase.co`
- Enabled Data API

#### 3. Database Schema
Two core tables:

**artists**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key, auto |
| user_id | uuid | Nullable — links to auth.users |
| name | text | Artist display name |
| slug | text | URL-safe identifier |
| location | text | e.g. "Portland, Oregon" |
| established | text | Year started |
| bio1 | text | First bio paragraph |
| bio2 | text | Second bio paragraph (optional) |
| bio3 | text | Third bio paragraph (optional) |
| genres | text[] | Array of genre strings |
| photo_url | text | Profile image URL |
| status | text | 'pending' / 'approved' / 'rejected' |
| created_at | timestamptz | Auto |

**songs**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key, auto |
| artist_id | uuid | FK → artists.id |
| title | text | Song title |
| genre | text | Genre label |
| duration | text | e.g. "3:45" |
| price | numeric | Default 0.99 |
| audio_url | text | Full audio file URL |
| preview_url | text | Preview URL (same as audio for now) |
| created_at | timestamptz | Auto |

#### 4. Row Level Security (RLS) Policies

**artists table:**
- Public can view approved artists (`status = 'approved'`)
- Artist can view/update/insert own profile (`auth.uid() = user_id`)
- Admin (mooresquesigh@gmail.com) can view/update/delete all (`auth.jwt() ->> 'email' = 'mooresquesigh@gmail.com'`)

**songs table:**
- Public can view songs of approved artists
- Artists can insert/update/delete own songs
- Admin can view/update/delete all

**Storage buckets:**
- `audio` — public read, authenticated upload
- `artist-photos` — public read, authenticated upload

**Role grants (critical — must run after RLS setup):**
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.songs TO authenticated;
GRANT SELECT ON public.artists TO anon;
GRANT SELECT ON public.songs TO anon;
```

#### 5. VainMuze Seed Data
Seeded via `supabase_admin_seed.sql`:
- VainMuze artist (status=approved, linked to Ali's auth account)
- 9 songs: America, Human Tragedy, My Shadow and I, Crying, Falling, I Pray for You, Maybe in the Next Hour, My Life, Pretty for Me
- Audio served from Vercel `/public` folder

**To link seeded artist to auth account:**
```sql
UPDATE artists SET user_id = '<YOUR_AUTH_UUID>' WHERE slug = 'vainmuze';
UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = 'mooresquesigh@gmail.com';
```

#### 6. Supabase Client Setup
`src/supabase.js`:
```js
import { createClient } from '@supabase/supabase-js'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

`.env.local` (gitignored):
```
VITE_SUPABASE_URL=https://jjhphtvblycudqjjenqf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 7. App.jsx Complete Rewrite (~1200 lines)

**Components built:**
- `AuthProvider` / `AuthContext` — session management, artist profile fetch, isAdmin check
- `Sidebar` — fixed left panel for logged-in users (The Backstage)
- `Nav` — top bar with public links (Home, Store, Artists, About, Cart)
- `Home` — hero + featured tracks from Supabase
- `Store` — all tracks with cart
- `About` — artist bio
- `Artists` — all approved artists grid
- `ArtistProfile` — individual artist page with tracks
- `ArtistSignup` — email/password + full profile form → status:pending
- `ArtistLogin` — Supabase auth sign in
- `ArtistDashboard` — tabbed: My Tracks / Upload / Profile / Earnings (soon)
- `AdminPanel` — approve/reject/delete artist applications
- `AppShell` — layout wrapper (sidebar + content)

**Routes:**
```
/               Home
/store          Music store
/about          About VainMuze
/artists        All approved artists
/artists/:slug  Individual artist page
/artist/signup  Artist application form
/artist/login   Artist sign in → The Backstage
/dashboard      Artist dashboard (requires auth)
/admin          Admin panel (requires admin email)
/success        Stripe success
/cancel         Stripe cancel
```

#### 8. Navigation Design

**Top nav (always visible):**
Home · Store · Artists · About · **The Backstage** (logged out) · Cart

**Left sidebar (logged-in users only):**
```
VAINMUZE

THE BACKSTAGE
  Dashboard
    My Music
    Upload
    Profile
    Earnings (coming soon)

ADMIN (platform owner only)
  Applications
  All Artists (soon)
  Fans (soon)
  Revenue (soon)

[Artist photo + name + status]
SIGN OUT
```

#### 9. Bugs Encountered & Fixed

| Bug | Cause | Fix |
|-----|-------|-----|
| `npm install` corrupted binaries | Ran from Linux sandbox on macOS volume | Delete node_modules, reinstall natively on Mac |
| "Failed to fetch" on signup | Wrong Supabase URL (missing `h` in project ref) | Decoded JWT to find correct ref, updated `.env.local` |
| "permission denied for table artists" | Email not confirmed, RLS blocked | Confirmed email via SQL: `UPDATE auth.users SET email_confirmed_at = NOW()` |
| Admin panel showing 0 artists | Role permissions not granted | `GRANT SELECT... TO authenticated` and `anon` |
| White background on content area | Body default white | Set `background:#060608` on body and AppShell wrapper |
| Terminal path issue with apostrophe | `WRITER'S ROOM` path breaks single quotes | Drag folder into terminal, or use double quotes |

---

## Platform Vision & Roadmap

### Pricing
- **Single track:** $0.99 (below iTunes $1.29, matches Amazon)
- **Future:** Album bundles (10 tracks ~$7.99)
- **Support button:** Fan tip jar on artist profiles ($3 / $5 / $10 → straight to artist via Stripe)

### Artist Tiers
- **Artists** — upload and sell music, manage profile, view earnings
- **Fans/Supporters** — buy tracks, support artists directly via tip
- **Admin (Ali)** — approve artists, manage platform

### Upcoming Features (Next Sessions)
- [ ] Add Supabase env vars to Vercel → live deploy
- [ ] Test end-to-end Stripe payment flow with Supabase songs
- [ ] Upload Track fully tested (audio to Supabase Storage)
- [ ] Edit Profile fully tested (photo upload)
- [ ] Songs loading on Home and Store pages confirmed
- [ ] Audio preview playback working with Supabase URLs
- [ ] Support / tip button on artist pages
- [ ] Fan account type (buy without being an artist)
- [ ] Earnings dashboard wired to Stripe
- [ ] Analytics (plays, purchases per track)
- [ ] Artist messaging / notifications

---

## Key Files

| File | Purpose |
|------|---------|
| `src/App.jsx` | Entire frontend application |
| `src/supabase.js` | Supabase client initialization |
| `.env.local` | Supabase credentials (gitignored) |
| `api/create-payment-intent.js` | Stripe checkout session (serverless) |
| `vercel.json` | Vercel config for API routes |
| `supabase_policies_only.sql` | RLS policies (run if tables exist) |
| `supabase_admin_seed.sql` | Admin policies + VainMuze seed data |
| `public/` | Audio files (.wav) served statically |

---

## Supabase SQL Files Run (in order)

1. `Artists, Songs, and Media Storage` — created tables + storage buckets
2. `supabase_policies_only.sql` — RLS policies for artists and songs
3. `supabase_admin_seed.sql` — admin policies + VainMuze artist + 9 songs
4. Role grants — `GRANT SELECT/INSERT/UPDATE/DELETE ON artists/songs TO authenticated/anon`
5. Email confirm + user link — `UPDATE auth.users SET email_confirmed_at` + `UPDATE artists SET user_id`

---

*Last updated: May 25, 2026*
