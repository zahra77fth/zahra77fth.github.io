# Git workflow

This repo uses a lightweight **GitHub Flow** with a long-lived `develop` branch.

## Branches

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code; deploy from here (Vercel). Only merge via PR. |
| `develop` | Integration branch; default target for feature PRs. |
| `feature/*` | New UI, sections, or behavior |
| `fix/*` | Bug fixes |
| `chore/*` | Tooling, deps, CI |
| `docs/*` | README, copy, workflow docs only |
| `legacy/*` | Archived old history (do not delete without reason) |

## Day-to-day flow

```bash
# Start from latest integration branch
git checkout develop
git pull origin develop

# New work
git checkout -b feature/about-copy-update

# Commit with conventional messages (see below)
git add src/data/profile.json
git commit -m "docs(content): refresh about summary"

# Push and open PR into develop
git push -u origin feature/about-copy-update
```

After QA on `develop`, open a **release PR** `develop` → `main`, tag on merge:

```bash
git checkout main && git pull
git tag -a v1.0.0 -m "First public portfolio release"
git push origin v1.0.0
```

## Commit message format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`

**Scopes (examples):** `home`, `projects`, `sky`, `galaxy`, `data`, `layout`, `ci`, `deps`

Examples:

- `feat(projects): portal modal to document body`
- `fix(cursor): show close hint on modal backdrop`
- `chore(ci): run lint and build on pull requests`

## Pull requests

1. Target `develop` (unless hotfix → `main`).
2. Keep PRs focused (one feature or fix).
3. CI must pass (`lint` + `build`).
4. Squash-merge optional for noisy feature branches; merge commit is fine for release PRs.

## Hotfix (production)

```bash
git checkout main
git pull
git checkout -b fix/contact-form-action
# fix, commit, PR to main
# then cherry-pick or merge main back into develop
```

## First-time setup after clone

```bash
npm install
git fetch origin
git checkout develop
```
