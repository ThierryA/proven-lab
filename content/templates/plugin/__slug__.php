<?php
/**
 * Plugin Name:       {{name}}
 * Description:       Data model, REST routes and Abilities for {{name}}.
 * Version:           0.1.0
 * Requires at least: 6.9
 * Requires PHP:      8.1
 * Author:            {{name}}
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       {{slug}}
 *
 * @package {{namespace}}
 */

namespace {{namespace}};

defined( 'ABSPATH' ) || exit;

const VERSION = '0.1.0';
const PLUGIN_FILE = __FILE__;

require_once __DIR__ . '/includes/post-types.php';
require_once __DIR__ . '/includes/rest.php';
require_once __DIR__ . '/includes/abilities.php';

add_action( 'init', __NAMESPACE__ . '\\register_post_types' );
add_action( 'rest_api_init', __NAMESPACE__ . '\\register_routes' );
add_action( 'wp_abilities_api_categories_init', __NAMESPACE__ . '\\register_ability_category' );
add_action( 'wp_abilities_api_init', __NAMESPACE__ . '\\register_abilities' );

/**
 * Registers the post types, then flushes rewrite rules once so their URLs work.
 */
function activate(): void {
	register_post_types();
	flush_rewrite_rules();
}
register_activation_hook( __FILE__, __NAMESPACE__ . '\\activate' );
register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );
