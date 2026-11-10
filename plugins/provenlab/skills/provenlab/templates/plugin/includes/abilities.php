<?php
/**
 * Abilities: typed, permissioned actions that the REST API, MCP clients and AI agents can discover.
 * The Abilities API is in WordPress 6.9 and later.
 *
 * @package {{namespace}}
 */

namespace {{namespace}};

defined( 'ABSPATH' ) || exit;

/**
 * Registers the ability category (runs on wp_abilities_api_categories_init).
 */
function register_ability_category(): void {
	if ( ! function_exists( 'wp_register_ability_category' ) ) {
		return;
	}
	wp_register_ability_category(
		'{{slug}}',
		array(
			'label'       => __( '{{name}}', '{{slug}}' ),
			'description' => __( 'Actions for {{name}}.', '{{slug}}' ),
		)
	);
}

/**
 * Registers the example ability (runs on wp_abilities_api_init).
 */
function register_abilities(): void {
	if ( ! function_exists( 'wp_register_ability' ) ) {
		return;
	}
	wp_register_ability(
		'{{slug}}/create-item',
		array(
			'label'               => __( 'Create item', '{{slug}}' ),
			'description'         => __( 'Creates a draft item with a title and a price.', '{{slug}}' ),
			'category'            => '{{slug}}',
			'input_schema'        => array(
				'type'                 => 'object',
				'properties'           => array(
					'title' => array(
						'type'      => 'string',
						'minLength' => 1,
					),
					'price' => array(
						'type'    => 'number',
						'minimum' => 0,
					),
				),
				'required'             => array( 'title' ),
				'additionalProperties' => false,
			),
			'output_schema'       => array(
				'type'       => 'object',
				'properties' => array( 'id' => array( 'type' => 'integer' ) ),
			),
			'permission_callback' => static fn() => current_user_can( 'edit_posts' ),
			'execute_callback'    => __NAMESPACE__ . '\\create_item',
			'meta'                => array(
				'annotations' => array(
					'readonly'    => false,
					'destructive' => false,
				),
				'public'      => true, // Available to the REST API, MCP clients and AI agents.
			),
		)
	);
}

/**
 * Creates a draft item.
 *
 * @param array $input Validated against the input schema.
 * @return array|\WP_Error
 */
function create_item( array $input ) {
	$post_id = wp_insert_post(
		array(
			'post_type'   => '{{prefix}}_item',
			'post_title'  => sanitize_text_field( $input['title'] ),
			'post_status' => 'draft',
		),
		true
	);
	if ( is_wp_error( $post_id ) ) {
		return $post_id;
	}
	update_post_meta( $post_id, '{{prefix}}_price', max( 0, (float) ( $input['price'] ?? 0 ) ) );
	return array( 'id' => $post_id );
}
