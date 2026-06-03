#!/usr/bin/env zsh
# Publish portfolio-pro to GitHub without Homebrew.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GH="$ROOT/.tools/gh_2.93.0_macOS_arm64/bin/gh"
REPO_NAME="${1:-portfolio-pro}"

if [[ ! -x "$GH" ]]; then
  echo "GitHub CLI not found. Downloading gh for macOS arm64..."
  mkdir -p "$ROOT/.tools"
  curl -fsSL "https://github.com/cli/cli/releases/download/v2.93.0/gh_2.93.0_macOS_arm64.zip" -o "$ROOT/.tools/gh.zip"
  unzip -qo "$ROOT/.tools/gh.zip" -d "$ROOT/.tools"
fi

if ! "$GH" auth status &>/dev/null; then
  echo "Log in to GitHub (choose GitHub.com → HTTPS → Login with browser):"
  "$GH" auth login
fi

cd "$ROOT"

if git remote get-url origin &>/dev/null; then
  echo "Remote 'origin' already set. Pushing main..."
  git push -u origin main
else
  echo "Creating public repo: $REPO_NAME"
  "$GH" repo create "$REPO_NAME" --public --source=. --remote=origin --push \
    --description "Modern React portfolio with JSON content and 3D backgrounds"
fi

echo ""
echo "Done. Open: $("$GH" repo view --web 2>/dev/null || echo "https://github.com/$( "$GH" api user -q .login )/$REPO_NAME")"
