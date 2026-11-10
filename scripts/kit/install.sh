#!/bin/sh
# Proven Lab project kit installer.
#   curl -fsSL {{BASE}}/install.sh | sh
# Adds AGENTS.md, CLAUDE.md, MCP configs (Claude Code, Cursor, VS Code) and a Claude Code skill
# to the current directory. Existing files are left alone (CLAUDE.md only gets an @AGENTS.md line).
set -eu
BASE="${PROVENLAB_URL:-{{BASE}}}"
FILES="__FILES__"
command -v curl >/dev/null 2>&1 || { echo "Proven Lab: curl is required." >&2; exit 1; }

added=""; kept=""
for f in $FILES; do
  if [ -e "$f" ]; then
    if [ "$f" = "CLAUDE.md" ] && ! grep -qx '@AGENTS.md' CLAUDE.md; then
      printf '\n@AGENTS.md\n' >> CLAUDE.md
      added="$added CLAUDE.md(+@AGENTS.md)"
    else
      kept="$kept $f"
    fi
    continue
  fi
  case "$f" in */*) mkdir -p "${f%/*}" ;; esac
  curl -fsSLg "$BASE/kit/$f" -o "$f"
  added="$added $f"
done

echo "Proven Lab kit"
[ -n "$added" ] && echo "  added:$added"
[ -n "$kept" ] && echo "  kept your existing:$kept (merge by hand or ask your agent: $BASE/kit/SETUP.md)"
echo "  MCP server: $BASE/mcp"
echo "Next: restart your agent. In Claude Code, run /mcp and approve 'provenlab'."
