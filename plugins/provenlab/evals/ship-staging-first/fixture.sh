#!/bin/bash
set -e
mkdir -p .provenlab site/wp-content/plugins/bookshelf
cat > .provenlab/project.md <<'MD'
# Proven Lab project
- User: developer
- Project: existing (Bookshelf plugin)
- Setup: Classic
- WordPress: ./site, 7.1
- Plugin: bookshelf, prefix bookshelf_, text domain bookshelf
- Environments: local; WP Engine production install "bookshelfprod"; no staging
- Repository: none
MD
printf '<?php\n/**\n * Plugin Name: Bookshelf\n */\n' > site/wp-content/plugins/bookshelf/bookshelf.php
