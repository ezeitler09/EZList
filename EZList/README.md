# 🛒 CartShare — Shared Grocery List (v1, Milestone 1)

A mobile-friendly shared grocery list for your household. Real-time sync between
your phones, tap-to-check items, automatic grouping by store section, and
passwordless profiles — just a 6-letter household code.

**What's in this release (Milestone 1):** shared real-time list, check-off flow,
store-section auto-categorization with per-household corrections, section
re-ordering to match your store, household join codes, PWA (add to home screen),
dark mode. Recipe import (paste / URL / photo OCR) is Milestone 2.

---

## One-time setup (~10 minutes, all free)

### Step 1 — Create the backend (Supabase)

1. Go to [supabase.com](https://supabase.com) → sign up (free) → **New project**.
   Pick any name (e.g. `cartshare`) and a region near you. Wait ~1 min for it to provision.
2. Enable passwordless sign-in: **Authentication → Sign In / Up** (under Auth Providers) → toggle **Anonymous sign-ins** ON → Save.
3. Create the database: **SQL Editor → New query** → paste the entire contents of
   [`supabase/migration.sql`](supabase/migration.sql) → **Run**. You should see "Success".
4. Grab your two keys: **Project Settings → API** → copy the **Project URL** and the **anon public** key.

### Step 2 — Deploy the app (Vercel)

1. Push this folder to a GitHub repo (or drag-and-drop deploy, below).
2. Go to [vercel.com](https://vercel.com) → sign up (free) → **New Project** → import the repo.
   Vercel auto-detects Vite; no settings to change.
3. Before clicking Deploy, add two **Environment Variables**:
   - `VITE_SUPABASE_URL` = your Project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon public key
4. Deploy. You'll get a URL like `https://cartshare-xyz.vercel.app`.

> **No GitHub? Quickest path:** run `npm install && npm run build` locally, then drag the
> `dist/` folder onto [app.netlify.com/drop](https://app.netlify.com/drop). Since env vars
> aren't set that way, the app will show a one-time setup screen asking you to paste the
> Project URL and anon key — do that once per device and you're in.

### Step 3 — Set up your household (~1 minute)

1. Open the app URL on your phone → **Start a new household** → enter your name, pick a color.
2. Open **⚙️ Settings** → **Share join link** → text it to your wife.
3. She opens the link, enters her name, done. You're now syncing in real time.
4. On both phones: use your browser's **Add to Home Screen** so it feels like a native app
   (Safari: Share → Add to Home Screen; Chrome: menu → Install app).

---

## Everyday use

- **Add items** with the bar at the bottom — they're auto-sorted into store sections.
- **Tap the circle** to check something off mid-aisle; it moves to "Checked" on both phones instantly. Tap again to undo. Checked items auto-clear after 24 hours, or use **Clear all**.
- **Tap an item** to edit its name, quantity, or store section. If you move "tortillas" to Bakery, CartShare remembers that for next time.
- **⚙️ Settings** → reorder store sections to match the way you actually walk your store.

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
```

Tech: React + Vite PWA · Supabase (Postgres, anonymous auth, realtime) · no passwords, ever.

## Project structure

```
supabase/migration.sql     # full DB schema, RLS policies, join/create RPCs
src/App.jsx                # session bootstrap (anonymous auth → household check)
src/components/            # Setup / Join / List screens + edit & settings sheets
src/lib/categorize.js      # store-section keyword dictionary (~200 keywords)
src/lib/supabase.js        # client config (env vars or one-time paste)
```

## Roadmap

- **Milestone 2:** recipe → list (paste text, recipe URL, photo/screenshot OCR) with a review screen before items hit the list.
- **Milestone 3:** autocomplete from history, offline edit queue, polish.
