# scla-labelling — SCOPE

A standalone web app that lets people outside the SCLA codebase produce
labels SCLA can consume directly. The goal is to outsource data
collection (referee gestures first, tracking truth + field keypoints
later) without exposing SCLA's models, pipeline, or proprietary code.

This is a **sibling project** to SCLA — separate repo, separate deploy,
zero SCLA imports. Schemas are mirrored, not imported. Labels flow
back to SCLA via a one-way pull script that runs from the SCLA repo.

## What "done" means for v1

Pass/fail criteria for the MVP. v1 ships when ALL of these hold:

- [ ] An invited labeller can sign in with email + magic-link, see a
      queue of candidate frames, and label them with one keystroke per
      gesture class. The 12-class taxonomy matches
      `scla/sports/rugby/referee_gestures.py` exactly (any drift breaks
      downstream import).
- [ ] An admin can invite labellers by email, assign per-labeller
      queues from uploaded task batches, and watch per-class /
      per-labeller counts update live.
- [ ] An SCLA operator can push a new batch of candidate frames into
      the labelling app via a script in the SCLA repo
      (`scripts/push_labelling_tasks.py`). The script uploads frames
      to R2 with non-enumerable keys and inserts task rows.
- [ ] An SCLA operator can pull completed labels back into the SCLA
      repo via `scripts/pull_labelling_results.py`. Output JSON files
      drop into `data/referee_gestures/<match>.json` in the schema
      `scla.sports.rugby.gesture_dataset.load_match` consumes.
- [ ] A labeller has NO access to: SCLA source code, model weights,
      match metadata beyond `match_id`, or any R2 prefix outside the
      `labelling/` subtree.
- [ ] Labels persist on every action. A labeller closing the tab
      mid-session loses no work.
- [ ] App boots locally in <2 min with the README's instructions, and
      deploys to Vercel + Supabase + R2 free tiers.

## What's explicitly OUT of scope for v1

- **Tracking truth + field keypoint labelling.** Those are different
  UX patterns (spreadsheet for tracking, click-on-image for field
  keypoints). The schemas and tools to feed them will follow once the
  gesture loop is proven on real labellers.
- **Payment / payout tracking.** v1 only tracks contribution counts.
  Payment happens out-of-band.
- **Inter-rater agreement / Cohen's κ.** The DB schema has a
  `required_labels` column so a future QC pass can ship overlap
  semantics, but v1 ships with `required_labels = 1` (no overlap).
- **Public sign-up.** Invite-only. No "create account" path. An
  admin types an email into the admin page and a magic-link goes
  out.
- **Mobile-first UI.** v1 is desktop-first. Mobile is a usability
  enhancement, not a contract.
- **Localisation.** English only.

## Quality bar

Production-grade for the **labeller-facing** path — labellers are
external. Errors surface in plain English. Magic links don't reveal
emails to people without them. Frames are signed with short-TTL URLs.
Auth gates every protected route at middleware level, not per-page.

Internal-tool grade for the **admin page** — Ces is the only admin
in v1; obvious-but-acceptable UX shortcuts (no virtualised lists,
trust admin input shape) are fine.

## Sign-off

- **Owner:** Ces (also the v1 admin).
- **Reviewer:** Ces.
- **Done when:** the operator workflow in section 1 completes
  end-to-end against the real Supabase + R2 deployment, AND at least
  one external labeller has produced ≥10 labels that import cleanly
  into the SCLA repo's `data/referee_gestures/` path.

## Architecture

- **Stack:** Next.js 16 (App Router) + Tailwind + shadcn-style
  components, mirroring SCLA frontend conventions so anything you
  build there transfers.
- **DB:** Supabase Postgres (free tier). Tables: `labellers`,
  `sessions`, `magic_tokens`, `tasks`, `labels`.
- **Storage:** Cloudflare R2. New `labelling/` prefix in the existing
  `scla-dev` bucket OR a dedicated `scla-labelling` bucket — chosen
  during setup. Frames signed with 24-hour TTL.
- **Email:** Resend, using the existing verified domain
  `scla.sheetsolved.com`.
- **Deploy:** Vercel (free tier). Supabase + R2 free tiers cover
  every backend dependency.

See `README.md` for setup.
