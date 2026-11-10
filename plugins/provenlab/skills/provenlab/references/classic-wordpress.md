# Build: Classic (WP Admin and WordPress templating)

> **Runbook step 3 · Build,** for the Classic setup, and for the frontend of Headless Admin. **Next:** step 4, `wpe-ai-plugins` if the app needs AI; otherwise step 5, `wp-cli-for-agents`.

**Admin:** WP Admin · **Frontend:** a block theme · **Deploy:** the plugin and the theme.

## 1. The plugin: data model and logic

Start from `get_template` with `plugin` and the app's slug, then replace the example post type, meta, route and ability with the app's model. WP Admin lists a public post type automatically. Keep `show_in_rest => true` so the block editor can edit it. Registered meta has no editing UI by default: add a block editor panel, `add_meta_box()`, or bind it to blocks (below).

## 2. The look: a block theme

New sites use a block theme: start from `get_template` with `block-theme-child` (a child of the default theme) and set its design tokens from the brief in `frontend-design`. Pages, headers and footers are templates, template parts and patterns that editors can change in the Site Editor.

**Templates for the plugin's post types ship with the plugin**, so they work with any block theme. Register them on `init` with `register_block_template()` (WordPress 6.7+); show registered meta with block bindings (`core/post-meta`, WordPress 6.5+; the meta needs `show_in_rest`):

```php
add_action( 'init', function () {
	if ( ! function_exists( 'register_block_template' ) ) {
		return;
	}
	register_block_template(
		'book-club//single-book_club_item',
		array(
			'title'       => __( 'Single item', 'book-club' ),
			'description' => __( 'Displays one item with its price.', 'book-club' ),
			'post_types'  => array( 'book_club_item' ),
			'content'     => '<!-- wp:template-part {"slug":"header"} /-->
<!-- wp:group {"tagName":"main","layout":{"type":"constrained"}} --><main class="wp-block-group">
<!-- wp:post-title {"level":1} /-->
<!-- wp:post-featured-image /-->
<!-- wp:paragraph {"metadata":{"bindings":{"content":{"source":"core/post-meta","args":{"key":"book_club_price"}}}}} --><p></p><!-- /wp:paragraph -->
<!-- wp:post-content /-->
</main><!-- /wp:group -->
<!-- wp:template-part {"slug":"footer"} /-->',
		)
	);
} );
```

Archives work the same way (`archive-book_club_item`, with a `core/query` block); the post type needs `has_archive`.

**Existing classic (PHP) theme:** keep its approach. Add `single-{post_type}.php` and `archive-{post_type}.php` to the theme (or a child theme), using `get_header()`, the loop and `get_footer()`, and escape every value (`esc_html()`, `esc_attr()`, `esc_url()`). Never put PHP templates in a block theme: `get_header()` there loads a deprecated fallback.

## 3. Add AI

Through the WP Engine AI plugins, with no API key: `wpe-ai-plugins`.

## 4. Verify

```bash
wp post-type list --fields=name,public,show_in_rest --format=json
wp post create --post_type=book_club_item --post_title="The Overstory" --post_status=draft --porcelain
wp theme list --status=active --fields=name,version
```

Open the draft's preview link and the archive, check the layout at phone and desktop widths (`frontend-design`), then delete test posts the user did not ask for.
