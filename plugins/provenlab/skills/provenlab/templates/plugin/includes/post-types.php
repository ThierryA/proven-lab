<?php
/**
 * Data model: post types and registered meta.
 *
 * @package {{namespace}}
 */

namespace {{namespace}};

defined( 'ABSPATH' ) || exit;

/**
 * Registers the example "item" post type and its fields. Rename to the app's model.
 */
function register_post_types(): void {
	register_post_type(
		'{{prefix}}_item',
		array(
			'labels'       => array(
				'name'          => __( 'Items', '{{slug}}' ),
				'singular_name' => __( 'Item', '{{slug}}' ),
			),
			'public'       => true,
			'has_archive'  => true,
			'show_in_rest' => true,
			'rest_base'    => '{{slug}}-items',
			'menu_icon'    => 'dashicons-list-view',
			'supports'     => array( 'title', 'editor', 'thumbnail', 'excerpt', 'custom-fields' ),
			'rewrite'      => array( 'slug' => 'items' ),
		)
	);

	register_post_meta(
		'{{prefix}}_item',
		'{{prefix}}_price',
		array(
			'type'              => 'number',
			'description'       => __( 'Price in the store currency.', '{{slug}}' ),
			'single'            => true,
			'default'           => 0,
			'sanitize_callback' => static fn( $value ) => max( 0, (float) $value ),
			'auth_callback'     => static fn() => current_user_can( 'edit_posts' ),
			'show_in_rest'      => array(
				'schema' => array(
					'type'    => 'number',
					'minimum' => 0,
				),
			),
		)
	);
}
