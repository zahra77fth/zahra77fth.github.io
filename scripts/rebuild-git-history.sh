#!/usr/bin/env zsh
# Rebuild linear history with logical commits (orphan branch).
# Run from repo root. Creates legacy/main backup, then resets main + develop.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export GIT_AUTHOR_NAME="${GIT_AUTHOR_NAME:-Zahra Fattahi}"
export GIT_AUTHOR_EMAIL="${GIT_AUTHOR_EMAIL:-zafth98@gmail.com}"
export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME"
export GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"

BACKUP_BRANCH="legacy/main"
REBUILD_BRANCH="rebuild/history"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree must be clean. Commit or stash changes first."
  exit 1
fi

echo "Backing up current main to $BACKUP_BRANCH"
git branch -f "$BACKUP_BRANCH" main 2>/dev/null || git branch "$BACKUP_BRANCH" main

echo "Creating orphan branch $REBUILD_BRANCH"
git checkout --orphan "$REBUILD_BRANCH"
git rm -rf --cached . >/dev/null 2>&1 || true

commit() {
  local message="$1"
  shift
  if [[ $# -eq 0 ]]; then
    echo "skip empty: $message"
    return
  fi
  git add "$@"
  if git diff --cached --quiet; then
    echo "skip (no staged changes): $message"
    return
  fi
  git commit -m "$message"
  echo "✓ $message"
}

commit "chore: scaffold Vite, TypeScript, and ESLint" \
  .gitignore package.json package-lock.json \
  vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json \
  eslint.config.js index.html

commit "feat(styles): add design tokens and global CSS" \
  src/design-system src/index.css src/lib/theme.ts src/lib/motion.ts

commit "feat(data): add JSON content, types, and portfolio context" \
  src/data src/types src/lib/loadData.ts src/context

commit "feat(app): add routing, providers, and shared hooks" \
  src/main.tsx src/app src/App.tsx src/pages src/hooks

commit "feat(layout): add header, footer, and section navigation" \
  src/features/layout

commit "feat(3d): add sky and galaxy scene backgrounds" \
  src/components/three src/components/background src/components/graphics

commit "feat(ui): add shared components, motion, and effects" \
  src/components/ui src/components/motion src/components/effects \
  src/components/layout src/components/HashScroll.tsx src/components/LoadingScreen.tsx \
  src/components/sections

commit "feat(home): add hero, sections, and project showcase rail" \
  src/features/home src/assets

commit "feat(projects): add project cards and detail modal" \
  src/features/projects

commit "feat(contact): add contact page" \
  src/features/contact

commit "chore: add static assets and deployment config" \
  public vercel.json

commit "docs: add README and architecture guide" \
  README.md ARCHITECTURE.md

commit "chore(tooling): add GitHub publish script and ignore local CLI" \
  scripts/publish-to-github.sh

commit "ci: add GitHub Actions workflow and PR template" \
  .github/workflows/ci.yml .github/pull_request_template.md

commit "docs: add Git branching workflow guide" \
  docs/GIT_WORKFLOW.md

echo ""
echo "Repointing main and develop to $REBUILD_BRANCH"
git branch -f main "$REBUILD_BRANCH"
git branch -f develop "$REBUILD_BRANCH"
git checkout main
git branch -d "$REBUILD_BRANCH" 2>/dev/null || true

echo ""
echo "Done. New history:"
git log --oneline
echo ""
echo "Backup of old main: $BACKUP_BRANCH"
echo "Push with: git push -u origin main --force-with-lease && git push -u origin develop --force-with-lease && git push origin legacy/main"
