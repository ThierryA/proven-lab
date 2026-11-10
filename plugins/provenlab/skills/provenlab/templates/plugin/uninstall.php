<?php
/**
 * Runs when the plugin is deleted from WP Admin. Remove options the plugin created; keep user content.
 *
 * @package {{namespace}}
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

delete_option( '{{prefix}}_settings' );
