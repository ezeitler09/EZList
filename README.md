# 🛒 EZList — Shared Grocery List (v5)

A mobile-friendly shared grocery list for your household. Real-time sync between
your phones, tap-to-check items, automatic grouping by store section, and
passwordless profiles — just a 6-letter household code.

**Milestone 1:** shared real-time list, check-off flow, store-section
auto-categorization with per-household corrections, section re-ordering,
household join codes, PWA (add to home screen), dark mode.

**Milestone 2:** add-from-recipe via the 📖 button — paste text, recipe link, or
photo/screenshot — with a review screen before anything hits your list, duplicate
detection against what's already on it, and auto-categorized results. Checked
items collapse by default.

**Milestone 3a:** saved recipes. Tick **💾 Save this recipe** on any import's
review screen and it's kept, shared with your household.

**v4:** recipes are a top-level tab. Bottom navigation splits
the app into **🛒 List** and **📚 Recipes** — the Recipes tab has full-page
cards, search (by name or ingredient), and a **+ New recipe** button. Tap a
recipe → review → add: two taps to re-add Taco Night.

**v5 (this release): 🥫 Pantry.** Track what you already have. Counts with +/−
steppers (0 = out, greyed, one tap back onto the list); checking items off at
the store stocks the pantry automatically (toggle in ⚙️ Settings, and
unchecking reverses it); recipe imports flag "🥫 in pantry (n)" and leave those
unchecked; a 🍳 Cooked It button on each saved recipe knocks its ingredients
down by one and tells you what ran out; bulk baseline entry by pasting a list
("2 cans black beans" stocks 2). **Requires running
[`supabase/migration-3.sql`](supabase/migration-3.sql) once** in the SQL Editor
(new query tab, paste, Run — additive only, live data untouched).

> **⚠️ Upgrading from v2?** Run [`supabase/migration-2.sql`](supabase/migration-2.sql)
> once in the Supabase SQL Editor before (or after) deploying — it adds the
> recipes table and touches nothing else. New installs: run `migration.sql`
> then `migration-2.sql`.

---

## One-time setup (~10 minutes, all free)

### Step 1 — Create the backend (Supabase)

1. Go to [supabase.com](https://supabase.com) → sign up (free) → **New project**.
   Pick any name (e.g. `ezlist`) and a region near you. Wait ~1 min for it to provision.
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
4. Deploy. You'll get a URL like `https://ezlist-xyz.vercel.app`.

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

## Recipe import — what works out of the box

Tap **📖** next to the add bar:

- **📋 Paste** — works immediately, no extra setup. A built-in parser strips quantities and prep noise ("2 lbs chicken thighs, cut into pieces" → *Chicken thighs, 2 lbs*).
- **🔗 Link** — works immediately for most recipe sites (they embed structured recipe data the server reads directly). Unusual or paywalled sites fall back to AI extraction if enabled; otherwise the app suggests pasting instead.
- **📷 Photo** — requires AI extraction (below).

### Enabling AI extraction (photo import + smarter parsing)

1. Get an API key at [console.anthropic.com](https://console.anthropic.com) (pay-as-you-go; a recipe import costs a fraction of a cent).
2. In Vercel: your project → **Settings → Environment Variables** → add `ANTHROPIC_API_KEY` = your key → **Redeploy**.

Photos are processed in memory and never stored. Only signed-in household
members can call these endpoints, so strangers can't spend your credits.

> Note for drag-and-drop (Netlify) deploys: the recipe endpoints live in `/api`
> and need a Vercel (or similar) deploy from the repo — paste import still works
> everywhere via the built-in parser.

## Everyday use

- **Add items** with the bar at the bottom — they're auto-sorted into store sections.
- **Tap the circle** to check something off mid-aisle; it moves to "Checked" on both phones instantly. Tap again to undo. Checked items auto-clear after 24 hours, or use **Clear all**.
- **Tap an item** to edit its name, quantity, or store section. If you move "tortillas" to Bakery, EZList remembers that for next time.
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

- Autocomplete from item history; offline edit queue; multiple named lists.
- Voice input (in-app mic; Alexa/Siri parked — see project notes).
- Pantry expiration dates / "use it up" suggestions.
