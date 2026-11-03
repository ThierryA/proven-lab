---
title: WordPress as an in-process library / PHP-templated frontend with a Node admin
summary: Skip REST for rendering. Let WordPress's PHP template system render the public site, or load WordPress in-process for custom PHP endpoints, while Node serves a custom admin.
---

# PHP templating and in-process WordPress

Use when you want server-rendered pages straight from WordPress's template engine (fast, cacheable, no extra service for the frontend) but still want an admin that is not wp-admin.

## Option A: classic theme renders the frontend, Node is the admin

- **Frontend**: a theme (block or classic) with the standard template hierarchy: `index.php`, `single-{post_type}.php`, `archive-{post_type}.php`, `page.php`, `template-parts/*`. Core APIs: `have_posts`, `the_post`, `the_title`, `the_content`, `get_template_part`, `WP_Query`, `wp_enqueue_script`, `add_theme_support`.
- **Admin**: Node app using the headless blueprint (REST + Abilities) to manage content. Hide wp-admin from editors with a redirect on `admin_init` for non-`manage_options` users, or restrict it at the proxy.
- **Shared model**: the same must-use plugin registers post types/meta for both.

```php
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

Always escape on output (`esc_html`, `esc_attr`, `esc_url`, `wp_kses_post`) and sanitize on input (`sanitize_text_field`, `sanitize_key`).

## Option B: Node reverse-proxies WordPress-rendered HTML

Node (Next.js rewrites, Hono, nginx) sits in front. Node serves `/admin/*` and `/api/*` itself and proxies everything else to WordPress. Benefits: one domain, Node middleware for auth/AB tests, WordPress for rendering. Pass `X-Forwarded-*` headers and set `WP_HOME`/`WP_SITEURL` to the public origin.

## Option C: WordPress loaded in-process (no REST)

For custom PHP endpoints that use core APIs directly (queries, `wp_insert_post`, caps) without the REST layer:

```php
// api/index.php  (served by PHP-FPM beside WordPress)
define( 'SHORTINIT', false );
require __DIR__ . '/../wp-load.php';
header( 'Content-Type: application/json' );
if ( ! current_user_can( 'edit_posts' ) ) { http_response_code( 403 ); exit; }
echo wp_json_encode( get_posts( [ 'post_type' => 'project', 'numberposts' => 20 ] ) );
```

Prefer `register_rest_route` or Abilities when the caller is another process: they give you auth, schema validation and permission callbacks for free. Use `SHORTINIT` only when you need `$wpdb` and nothing else; it skips plugins, hooks and the user system.

## Choosing

| Need | Pick |
|---|---|
| Best SEO/perf with least moving parts | Option A |
| One domain, Node controls routing and auth | Option B |
| Heavy in-process data jobs, imports, CLI-like scripts | Option C |
| Rich app-like UI | headless-node-app |
