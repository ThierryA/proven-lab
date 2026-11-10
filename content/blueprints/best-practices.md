---
nav: "Quality checks"
title: "Quality checks: WordPress best practices"
summary: "Apply on every project: WordPress Coding Standards (PHPCS), PHPUnit with the WordPress test suite, static analysis, JavaScript tooling, Plugin Check, security, i18n, performance and CI."
agent_does:
  - "Sets up WordPress coding standards, tests and quality checks."
  - "Runs them before saying the work is done."
you_do:
  - "Nothing."
---

# Quality checks: WordPress best practices

> **Runbook step 5 · Verify,** for developers. Set the tooling up at the start of step 3 and run it before saying the work is done. **Next:** step 6, `wpe-deployment`.

Apply these on every project, whatever the setup. Add the tooling at the start, run it before saying the work is done, and keep it in CI.

## 1. Project layout

Use the core APIs before writing your own (runbook, step 3: post types and meta instead of custom tables, core users and capabilities instead of custom auth, transients instead of custom caches, `wp_remote_*` instead of raw HTTP). Never change WordPress core or third-party plugins and themes: extend them with hooks.

Put the application's PHP in a regular plugin, never in a theme, in WordPress core or in a must-use plugin (must-use plugins cannot be deactivated, have no activation or uninstall hooks, and are skipped by Plugin Check). Use a must-use plugin only for small site-wide code the user explicitly wants always on.

```
wp-content/plugins/my-app/
  my-app.php            # plugin header, bootstrap only
  includes/             # classes and functions, prefixed or namespaced
  tests/                # PHPUnit tests
  languages/            # translations (.pot)
  uninstall.php         # removes options, tables and custom data
  composer.json  phpcs.xml.dist  phpunit.xml.dist  phpstan.neon.dist
```

- **Prefix or namespace everything global:** functions, classes, constants, options, hooks, post types, meta keys (`my_app_`, `My_App\`). Post type keys are limited to 20 characters.
- **Text domain = plugin slug** (`my-app`) in every translatable string.
- **Bootstrap file:** only the header, constants, `require` statements and hook registrations.

## 2. WordPress Coding Standards (PHPCS)

```bash
composer require --dev wp-coding-standards/wpcs:"^3.4" phpcompatibility/phpcompatibility-wp:"^2.1" dealerdirect/phpcodesniffer-composer-installer:"^1.2"
composer config allow-plugins.dealerdirect/phpcodesniffer-composer-installer true
```

`phpcs.xml.dist`:

```xml
<?xml version="1.0"?>
<ruleset name="my-app">
	<file>.</file>
	<exclude-pattern>/vendor/*</exclude-pattern>
	<exclude-pattern>/node_modules/*</exclude-pattern>
	<arg name="extensions" value="php"/>
	<arg value="sp"/>

	<rule ref="WordPress"/>
	<rule ref="PHPCompatibilityWP"/>
	<config name="testVersion" value="7.4-"/>
	<config name="minimum_wp_version" value="6.9"/>

	<rule ref="WordPress.NamingConventions.PrefixAllGlobals">
		<properties><property name="prefixes" type="array"><element value="my_app"/><element value="My_App"/></property></properties>
	</rule>
	<rule ref="WordPress.WP.I18n">
		<properties><property name="text_domain" type="array"><element value="my-app"/></property></properties>
	</rule>
</ruleset>
```

Run `vendor/bin/phpcs` to check and `vendor/bin/phpcbf` to fix what can be fixed automatically. Set `minimum_wp_version` to the oldest WordPress version you support (6.9 if you use the Abilities API).

## 3. PHPUnit with the WordPress test suite

Generate the test files, then install the test suite against a test database:

```bash
wp scaffold plugin-tests my-app --ci=github
composer require --dev phpunit/phpunit:"^9.6" yoast/phpunit-polyfills:"^1.1"
bash bin/install-wp-tests.sh wordpress_test root '' localhost latest
vendor/bin/phpunit
```

`install-wp-tests.sh` downloads WordPress and its test library and creates the database `wordpress_test`; use a database you can throw away. These are the PHPUnit and Polyfills versions WordPress core's own test suite uses. Without a local MySQL, use `@wordpress/env` (Docker): `npx @wordpress/env start`, then `npx @wordpress/env run tests-cli --env-cwd=wp-content/plugins/my-app vendor/bin/phpunit`.

Tests extend `WP_UnitTestCase`, which resets the database after each test and provides factories. Test the behavior the app relies on:

```php
<?php
class Test_My_App_Model extends WP_UnitTestCase {

	public function test_project_post_type_is_in_the_rest_api() {
		$this->assertTrue( post_type_exists( 'project' ) );
		$this->assertTrue( get_post_type_object( 'project' )->show_in_rest );
	}

	public function test_budget_meta_round_trips_over_rest() {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'editor' ) ) );

		$request = new WP_REST_Request( 'POST', '/wp/v2/projects' );
		$request->set_body_params( array( 'title' => 'Test', 'status' => 'publish', 'meta' => array( 'budget' => 1200 ) ) );
		$response = rest_do_request( $request );

		$this->assertSame( 201, $response->get_status() );
		$this->assertEquals( 1200, get_post_meta( $response->get_data()['id'], 'budget', true ) );
	}

	public function test_anonymous_users_cannot_create_projects() {
		wp_set_current_user( 0 );
		$request = new WP_REST_Request( 'POST', '/wp/v2/projects' );
		$request->set_body_params( array( 'title' => 'Nope' ) );
		$this->assertSame( 401, rest_do_request( $request )->get_status() );
	}

	public function test_archive_ability_changes_the_status() {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'editor' ) ) );
		$id     = self::factory()->post->create( array( 'post_type' => 'project' ) );
		$result = wp_get_ability( 'app/archive-project' )->execute( array( 'id' => $id ) );

		$this->assertSame( array( 'archived' => true ), $result );
		$this->assertSame( 'archived', get_post_status( $id ) );
	}
}
```

What to cover: every registered post type, taxonomy and meta key (REST exposure and types), every REST route and Ability (success, validation error, permission denied), and every hook callback that changes data.

## 4. Static analysis

```bash
composer require --dev szepeviktor/phpstan-wordpress:"^2.0" phpstan/extension-installer
composer config allow-plugins.phpstan/extension-installer true
```

`phpstan.neon.dist`:

```yaml
parameters:
  level: 6
  paths:
    - includes
    - my-app.php
```

Run `vendor/bin/phpstan analyse`. Raise the level as the code allows.

## 5. JavaScript, CSS and blocks

Use `@wordpress/scripts` for build, lint and tests (`wp-scripts build`, `wp-scripts lint-js`, `wp-scripts lint-style`, `wp-scripts test-unit-js`). Create blocks with `npx @wordpress/create-block`. Enqueue assets with `wp_enqueue_script()` and `wp_enqueue_style()` and the generated `*.asset.php` file for dependencies and version; load them only where they are used; pass `array( 'strategy' => 'defer' )` as the last argument when the script allows it; use `wp_set_script_translations()` for translated JavaScript.

## 6. Plugin Check

Install the [Plugin Check](https://wordpress.org/plugins/plugin-check/) plugin and run it from **Tools → Plugin Check**, or with its WP-CLI command `wp plugin check my-app`. It runs the checks WordPress.org uses for plugin review (security, internationalization, performance, plugin header).

## 7. Security rules

- **Check capabilities** on every action: `current_user_can()`, and `permission_callback` on every REST route and Ability (`__return_true` only for genuinely public, read-only data).
- **Check nonces** on forms and admin actions: `wp_nonce_field()` with `check_admin_referer()`, or `check_ajax_referer()`. REST requests from the browser use the `wp_rest` nonce; application passwords replace it for servers.
- **Sanitize input** (`sanitize_text_field()`, `absint()`, `sanitize_key()`, `wp_kses_post()`) and give REST and Ability arguments a schema so WordPress validates them.
- **Escape output late:** `esc_html()`, `esc_attr()`, `esc_url()`, `wp_kses_post()`, and the `esc_html__()` family for translated strings.
- **SQL:** prefer the APIs (`WP_Query`, `get_posts()`); for raw queries use `$wpdb->prepare()`.
- No `eval`, no `extract()`, no unserializing user input; prefer `wp_remote_get()` and `wp_safe_remote_get()` over cURL.

## 8. Internationalization

Wrap every user-facing string: `__( 'Projects', 'my-app' )`, `esc_html_e()`, `_n()` for plurals, `_x()` for context, with translator comments for placeholders. Generate the template with `wp i18n make-pot . languages/my-app.pot`.

## 9. Performance

- No queries inside loops; fetch in one query.
- `WP_Query`: set `no_found_rows => true` when you do not paginate, and limit `posts_per_page`.
- Cache expensive results with `wp_cache_set()` or transients.
- Options: pass `false` as the autoload argument for options that are not needed on every page load.
- Heavy work (indexing, remote calls) goes to scheduled events, not into the request.

## 10. Uninstall

`uninstall.php` (checked with `defined( 'WP_UNINSTALL_PLUGIN' )`) deletes the plugin's options, custom tables, scheduled events and, if the user expects it, its posts and meta.

## 11. Continuous integration

Run all checks on every push: PHPCS, PHPStan, PHPUnit (the workflow `wp scaffold plugin-tests --ci=github` generates is a starting point; add a MySQL service and a PHP version matrix), and `wp-scripts lint-js` if there is JavaScript. A change is done when CI is green.

## Definition of done

1. `vendor/bin/phpcs` reports no errors.
2. `vendor/bin/phpunit` passes, with tests for the model, the REST routes, the Abilities and permissions.
3. `vendor/bin/phpstan analyse` passes at the configured level.
4. Plugin Check reports no errors.
5. Verified on a real site with WP-CLI and real requests.
