# scla-labelling

Standalone labelling app that produces JSON labels SCLA consumes
directly. See [`SCOPE.md`](SCOPE.md) for what v1 ships.

This is a **sibling project** to SCLA. Labellers see the labelling
UI; they do NOT see SCLA models, pipeline code, or any data outside
the queued frames.

## Quick start (local dev)

### 1. External services (one-time)

You need three free-tier accounts wired up before the app boots:

- **Supabase** — Postgres for labellers + tasks + labels. Create a
  project at https://supabase.com, take the project URL + the
  service-role key (NOT the anon key — the app talks to Supabase
  with service-role auth from the Next.js server only).
- **Cloudflare R2** — frame storage. Either reuse SCLA's `scla-dev`
  bucket with a separate `labelling/` prefix (simpler) or create a
  dedicated `scla-labelling` bucket. Either way the app needs an R2
  API token with read+write on that prefix.
- **Resend** — magic-link email. Reuse SCLA's existing API key (the
  `scla.sheetsolved.com` sending domain is already verified).

### 2. Clone + install

```bash
cd ..  # from SCLA, sibling directory
git clone <repo-url> scla-labelling
cd scla-labelling
npm install
cp .env.example .env.local   # fill in the secrets
```

### 3. Apply the database schema

Open the Supabase SQL editor (Project → SQL → New query) and run
each file in `supabase/migrations/` in order:

```bash
ls supabase/migrations/
# 001_init.sql
```

Then seed yourself as the first admin labeller:

```sql
INSERT INTO labellers (email, display_name, is_admin)
VALUES ('cesairetobias@gmail.com', 'Ces', true);
```

### 4. Run

```bash
npm run dev
# → http://localhost:3000
```

Go to `/login`, type your seeded email, click the magic link in your
inbox (or read the link from the dev console — Resend in development
prints the URL even when the email fails).

### 5. Push tasks from the SCLA repo

From the SCLA repo:

```bash
# 1. Build the candidate queue (existing script).
uv run python scripts/sample_gesture_candidates.py \
    --match match_E \
    --whistle-csv reports/whistle_cascade/match_E/top_k_review.csv

# 2. Push it into the labelling app's DB + upload frames to R2.
uv run python scripts/push_labelling_tasks.py \
    --match match_E \
    --queue data/gesture_queues/match_E.json \
    --frames-dir data/multi_match/match_E/frames

# Set SCLA_LABELLING_DB_URL + R2 vars in SCLA's .env
# (the script reads the same R2 credentials SCLA's pipeline uses).
```

### 6. Pull labels back into SCLA

When labellers have produced labels and you want to train against
them:

```bash
# Still from the SCLA repo:
uv run python scripts/pull_labelling_results.py --match match_E
# → data/referee_gestures/match_E.json (referee_gestures_v1 schema)
```

The script reads from the labelling DB directly; no API call.

## Deployment

Deploy to Vercel. Set the same `.env.local` variables in the Vercel
project's environment. Push to `main` → auto-deploy.

The middleware (`middleware.ts`) and the auth/session machinery are
designed to work on Vercel's edge runtime where possible; magic-link
generation falls back to the Node runtime because Resend's SDK needs
it.

## Repository layout

```
.
├── SCOPE.md               # v1 completion contract
├── README.md              # this file
├── .env.example           # required env vars
├── middleware.ts          # session check on /label + /admin
├── app/
│   ├── layout.tsx
│   ├── login/page.tsx     # email-entry form
│   ├── magic/page.tsx     # magic-link landing
│   ├── (labelling)/
│   │   └── label/page.tsx # the gesture-labelling loop
│   ├── admin/
│   │   └── page.tsx       # invite labellers, view progress
│   └── api/
│       ├── auth/...       # magic-link send + callback + logout
│       ├── next-task/     # GET the next candidate frame
│       ├── label/         # POST a label
│       └── admin/...      # invite, tasks, stats
├── lib/
│   ├── gestures.ts        # 12-class taxonomy (mirrors SCLA)
│   ├── supabase.ts        # DB client (service-role)
│   ├── r2.ts              # signed-URL helper
│   ├── email.ts           # magic-link via Resend
│   └── auth.ts            # session helpers + middleware utils
└── supabase/migrations/
    └── 001_init.sql       # tables: labellers, sessions, magic_tokens,
                           #          tasks, labels
```

## Constraints labellers are bound by

- They never see frames except via a signed R2 URL with a 24 h TTL.
  R2 keys carry a random nonce so URL guessing doesn't enumerate the
  bucket.
- They see `match_id` (e.g. `match_E`) but no other match metadata.
- They cannot list tasks — the API returns ONE task at a time, the
  next unlabelled one in their assigned queue.
- They cannot see other labellers' labels until you (the admin)
  surface aggregate stats on the admin page.

## Schema drift policy

The 12-class gesture taxonomy in `lib/gestures.ts` MUST match
`scla/sports/rugby/referee_gestures.py` in the SCLA repo exactly. If
you add a class to SCLA, add it here in the same PR and re-deploy.
The pull script's schema validator rejects unknown codes, so drift
fails loudly rather than silently producing bad labels.
