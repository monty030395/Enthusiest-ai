# Contributing to Motormind

## Branch structure

```
main        → production (auto-deploys to Vercel live site)
develop     → shared integration branch (auto-deploys to Vercel preview URL)
feature/*   → individual work, branched off develop
fix/*       → bug fixes, branched off develop
```

## Workflow

### Starting new work

Always branch off `develop`, never off `main`:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

Branch naming:
- `feature/red-flags-ui`
- `feature/supabase-auth`
- `fix/photo-upload-reset`
- `fix/service-worker-cache`

### While working

Commit often. Push your branch to GitHub so it's backed up and visible:

```bash
git push -u origin feature/your-feature-name
```

### Opening a pull request

When your feature is ready:

1. Push your branch to GitHub
2. Open a pull request **into `develop`** (not `main`)
3. Tag the other person for review
4. Don't merge until you have at least 1 approval

### Deploying to production

When `develop` is stable and tested on the preview URL:

1. Open a pull request from `develop` into `main`
2. Both people should review it
3. Merge — Vercel auto-deploys to production

## Rules

- **Never push directly to `main`** — it's protected, PRs only
- **Never push directly to `develop`** if you can avoid it — use feature branches
- Delete your feature branch after it's merged
- If you're unsure, open a draft PR and ask

## Environment variables

Keys live in `.env.local` (not committed). Ask for the current values if you're setting up locally. Never commit API keys.

Required:
- `OPENAI_API_KEY`
- `FIRECRAWL_API_KEY`
- `TRADEME_CONSUMER_KEY`
- `TRADEME_CONSUMER_SECRET`
- `TRADEME_SANDBOX` — set to `true` for local dev against sandbox, remove for production
