<?php
/**
 * Custom REST routes. Plain CRUD is already available at /wp/v2/{{slug}}-items.
 *
 * @package {{namespace}}
 */

namespace {{namespace}};

defined( 'ABSPATH' ) || exit;

/**
 * Registers the example route: GET /wp-json/{{slug}}/v1/items/summary
 */
function register_routes(): void {
	register_rest_route(
		'{{slug}}/v1',
		'/items/summary',
		array(
			'methods'             => \WP_REST_Server::READABLE,
			'callback'            => __NAMESPACE__ . '\\items_summary',
			'permission_callback' => static fn() => current_user_can( 'edit_posts' ),
			'args'                => array(
				'status' => array(
					'type'    => 'string',
					'enum'    => array( 'publish', 'draft' ),
					'default' => 'publish',
				),
			),
		)
	);
}

/**
 * Returns the number of items and their total price.
 *
 * @param \WP_REST_Request $request The request; `status` is validated by the route schema.
 * @return \WP_REST_Response
 */
function items_summary( \WP_REST_Request $request ): \WP_REST_Response {
	$query = new \WP_Query(
		array(
			'post_type'      => '{{prefix}}_item',
			'post_status'    => $request->get_param( 'status' ),
			'fields'         => 'ids',
			'posts_per_page' => 500,
			'no_found_rows'  => true,
		)
	);
	$total = 0.0;
	foreach ( $query->posts as $post_id ) {
		$total += (float) get_post_meta( $post_id, '{{prefix}}_price', true );
	}
	return rest_ensure_response(
		array(
			'count' => count( $query->posts ),
			'total' => $total,
		)
	);
}
