#!/usr/bin/env bash
#
# Manual git add → commit → push for net-tools (no Cursor co-author injection).
#
# Usage:
#   ./scripts/git-push.sh "Short commit title"
#   ./scripts/git-push.sh "Title" "Optional longer body paragraph."
#   ./scripts/git-push.sh --dry-run "Title"
#   ./scripts/git-push.sh --status          # preview changes only
#
# First push to empty GitHub repo:
#   git remote add origin https://github.com/arulriyadi/net-tools.git
#   ./scripts/git-push.sh "Initial commit"
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REMOTE="${GIT_REMOTE:-origin}"
BRANCH="${GIT_BRANCH:-main}"
EXPECTED_EMAIL="${GIT_AUTHOR_EMAIL:-nazarula589@gmail.com}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { printf "${CYAN}→${NC} %s\n" "$*"; }
ok()    { printf "${GREEN}✓${NC} %s\n" "$*"; }
warn()  { printf "${YELLOW}!${NC} %s\n" "$*"; }
fail()  { printf "${RED}✗${NC} %s\n" "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage:
  ./scripts/git-push.sh --status
  ./scripts/git-push.sh [--dry-run] "Commit title"
  ./scripts/git-push.sh [--dry-run] "Commit title" "Commit body (optional)"

Examples:
  ./scripts/git-push.sh "Add Service List tab to firewall detail"
  ./scripts/git-push.sh "Fix NAT filter export" "Handle semicolon-separated Palo fields."

Env overrides:
  GIT_REMOTE=origin   GIT_BRANCH=main   GIT_AUTHOR_EMAIL=nazarula589@gmail.com
EOF
}

ensure_git_repo() {
  git rev-parse --git-dir >/dev/null 2>&1 || fail "Not a git repo. Run: git init && git branch -M main"
}

check_identity() {
  local email name
  email="$(git config user.email || true)"
  name="$(git config user.name || true)"
  if [[ -z "$email" ]]; then
    fail "git user.email not set. Example: git config user.email \"$EXPECTED_EMAIL\""
  fi
  info "Git identity: ${name:-unknown} <$email>"
  if [[ "$email" != "$EXPECTED_EMAIL" ]]; then
    warn "Email is not $EXPECTED_EMAIL — commit will use <$email>"
  fi
}

check_remote() {
  if ! git remote get-url "$REMOTE" >/dev/null 2>&1; then
    fail "Remote '$REMOTE' not found. Run:\n  git remote add origin https://github.com/arulriyadi/net-tools.git"
  fi
  info "Remote: $REMOTE → $(git remote get-url "$REMOTE")"
}

scan_sensitive_staged() {
  local bad
  bad="$(git diff --cached --name-only 2>/dev/null | grep -E \
    '(^|/)\.env(\.|$)|\.pem$|\.key$|id_rsa|id_ed25519|/ssh-keys/|/secrets/|/credentials/' \
    | grep -vE '\.env\.example$' \
    || true)"
  if [[ -n "$bad" ]]; then
    fail "Refusing to commit sensitive paths:\n$bad"
  fi
}

show_status() {
  ensure_git_repo
  check_identity
  echo ""
  info "Branch: $(git branch --show-current) → ${REMOTE}/${BRANCH}"
  echo ""
  if git diff --quiet && git diff --cached --quiet && [[ -z "$(git ls-files --others --exclude-standard)" ]]; then
    ok "Working tree clean — nothing to commit."
    exit 0
  fi
  info "Changed files:"
  echo ""
  git status -sb
  echo ""
  info "Diff stat (unstaged + staged):"
  git diff --stat HEAD 2>/dev/null || git diff --stat
  echo ""
  info "Untracked (respects .gitignore):"
  git ls-files --others --exclude-standard | sed 's/^/  /' || true
  echo ""
}

do_push() {
  local dry_run=false
  local title="" body=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dry-run) dry_run=true; shift ;;
      -h|--help) usage; exit 0 ;;
      --status) show_status; exit 0 ;;
      *) break ;;
    esac
  done

  if [[ $# -lt 1 ]]; then
    usage
    fail "Commit message required as first argument."
  fi

  title="$1"
  body="${2:-}"

  ensure_git_repo
  check_identity
  check_remote

  echo ""
  show_status
  echo ""

  if git diff --quiet && git diff --cached --quiet && [[ -z "$(git ls-files --others --exclude-standard)" ]]; then
    ok "Nothing to commit."
    exit 0
  fi

  info "Staging all tracked changes (honours .gitignore)…"
  git add .

  scan_sensitive_staged

  if $dry_run; then
    warn "Dry run — would commit with message:"
    echo "  $title"
    [[ -n "$body" ]] && echo "  $body"
    echo ""
    info "Staged diff stat:"
    git diff --cached --stat
    ok "Dry run complete (no commit/push)."
    exit 0
  fi

  if [[ -n "$body" ]]; then
    git commit -m "$title" -m "$body"
  else
    git commit -m "$title"
  fi

  ok "Committed: $(git rev-parse --short HEAD) — $(git log -1 --format='%s')"

  info "Pushing to ${REMOTE}/${BRANCH}…"
  if git rev-parse "@{upstream}" >/dev/null 2>&1; then
    git push "$REMOTE" "$BRANCH"
  else
    git push -u "$REMOTE" "$BRANCH"
  fi

  ok "Pushed to $(git remote get-url "$REMOTE") ($BRANCH)"
  echo ""
  info "Author on last commit: $(git log -1 --format='%an <%ae>')"
}

case "${1:-}" in
  --status|-s) show_status ;;
  -h|--help) usage ;;
  *) do_push "$@" ;;
esac
