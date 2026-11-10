#!/bin/bash
set -e
mkdir -p site/wp-content/plugins/bookshelf
cat > site/wp-content/plugins/bookshelf/bookshelf.php <<'PHP'
<?php
/**
 * Plugin Name: Bookshelf
 * Text Domain: bookshelf
 */
namespace Bookshelf;

defined( 'ABSPATH' ) || exit;

add_action( 'init', __NAMESPACE__ . '\\register_types' );

function register_types(): void {
	register_post_type( 'bookshelf_book', array( 'public' => true, 'show_in_rest' => true, 'supports' => array( 'title', 'editor', 'custom-fields' ), 'label' => 'Books' ) );
}
PHP
