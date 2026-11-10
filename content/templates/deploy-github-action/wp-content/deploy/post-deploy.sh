#!/bin/bash
# Runs on the WP Engine server after each deploy (path relative to the WordPress root).
set -e
wp rewrite flush
wp cache flush
