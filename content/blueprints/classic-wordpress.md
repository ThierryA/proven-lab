---
title: "Classic: WP Admin and WordPress templating"
summary: Everything runs in the WordPress runtime. Editors use WP Admin, and WordPress renders the frontend with its PHP templates. The simplest setup, one runtime to deploy.
---

# Classic: WP Admin and WordPress templating

**Admin:** WP Admin · **Frontend:** WordPress templating · **Runtimes:** WordPress only.

Pick this for "build me a website": content-led, SEO first, fewest moving parts. To swap either side for a custom app later, see `custom-app`; the data model does not change.

## 1. Define the model

Same as every setup: a must-use plugin in `wp-content/mu-plugins/` that registers post types, taxonomies and fields on `init` (`register_post_type`, `register_taxonomy`, `register_post_meta`, `register_meta`). WP Admin picks them up automatically: `show_ui` comes from `public`, and fields appear in the editor when the post type supports `custom-fields`.

## 2. Render with the template hierarchy

A theme (block theme or classic PHP theme) renders each page. WordPress picks the template from the hierarchy: `single-{post_type}.php`, `archive-{post_type}.php`, `page.php`, `index.php`, plus `template-parts/*`.

```php
<?php
// single-project.php
get_header();
while ( have_posts() ) : the_post();
	$budget = get_post_meta( get_the_ID(), 'budget', true );
	?>
	<article <?php post_class(); ?>>
		<h1><?php the_title(); ?></h1>
		<p>Budget: <?php echo esc_html( $budget ); ?></p>
		<?php the_content(); ?>
	</article>
<?php endwhile;
get_footer();
```

Core APIs: `have_posts`, `the_post`, `the_title`, `the_content`, `get_template_part`, `WP_Query`, `wp_enqueue_script`, `add_theme_support`. For a block theme, use `templates/single-project.html` and blocks instead of PHP.

Escape on output (`esc_html`, `esc_attr`, `esc_url`, `wp_kses_post`) and sanitize on input (`sanitize_text_field`, `sanitize_key`).

## 3. Add AI

Call the AI API from PHP with the WordPress AI Client (`wp_ai_client_prompt`) or `wp_remote_post`, and keep the knowledge base in sync from `save_post`. See `wpe-ai-experiences`.

## 4. Verify with WP-CLI

```bash
wp post-type list --fields=name,public
wp post create --post_type=project --post_title="Smoke test" --post_status=publish --porcelain
wp theme list --status=active
```

Then open the post's URL to check the template renders.
