#!/usr/bin/env bash
# Verify the {{slug}} plugin against a running WordPress. Usage: WP="wp --path=/path/to/site" bash bin/verify.sh
set -euo pipefail
WP="${WP:-wp}"
SLUG="{{slug}}"
fail=0
step() { printf '\n== %s\n' "$1"; }

step "PHP syntax"
while IFS= read -r -d '' f; do php -l "$f" >/dev/null || { echo "syntax error: $f"; fail=1; }; done < <(find . -name '*.php' -not -path './vendor/*' -not -path './node_modules/*' -print0)

step "Activate"
$WP plugin activate "$SLUG" >/dev/null
status=$($WP plugin list --name="$SLUG" --field=status)
[ "$status" = "active" ] || { echo "plugin is $status"; fail=1; }

step "Post types"
$WP post-type list --fields=name,show_in_rest --format=csv | grep -E '^{{prefix}}_' || echo "(no {{prefix}}_ post types)"

step "REST routes"
$WP eval 'foreach ( array_keys( rest_get_server()->get_routes() ) as $r ) { if ( str_starts_with( $r, "/{{slug}}/" ) ) { echo $r, PHP_EOL; } }'

step "PHP errors in debug.log"
log=$($WP eval 'echo WP_CONTENT_DIR . "/debug.log";')
if [ -f "$log" ]; then
  if tail -n 200 "$log" | grep -E 'PHP (Fatal|Warning|Parse)|Doing it wrong' | grep -i "$SLUG"; then fail=1; else echo "no errors from $SLUG"; fi
else
  echo "no debug.log (enable WP_DEBUG_LOG to capture errors)"
fi

step "Plugin Check"
if $WP plugin is-installed plugin-check 2>/dev/null; then $WP plugin check "$SLUG" --format=table || fail=1; else echo "Plugin Check not installed: wp plugin install plugin-check --activate"; fi

if [ "$fail" = 0 ]; then printf "\nOK\n"; else printf "\nFAILED\n"; exit 1; fi
