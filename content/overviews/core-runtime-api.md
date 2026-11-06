---
nav: "Overview"
title: "Core Runtime API: overview"
summary: The WordPress core PHP APIs an application is built on, extracted from WordPress source and grouped by task area.
---

# Core Runtime API

**Core Runtime API** is Proven Lab's name for the WordPress core PHP APIs: the functions, classes and hooks that ship with WordPress. It is not an official WordPress term. Everything here is extracted from the WordPress source release, so signatures, parameters and `@since` versions match the code.

## What it covers

- **Data model:** post types, taxonomies, fields (registered meta), options and settings.
- **Data access:** creating, querying, updating and deleting posts, terms, comments and users.
- **Users and access:** users, roles and capabilities, authentication (cookies, application passwords), sanitization and escaping.
- **Extension:** hooks (actions and filters), plugins and must-use plugins.
- **Rendering:** blocks, themes and the template hierarchy.
- **Interfaces:** the REST API, rewrites, the Abilities API and the AI Client.
- **Services:** media, outbound HTTP, scheduled events and caching.

## How an application uses it

1. **Register on hooks.** Post types, taxonomies and meta on `init`; REST routes on `rest_api_init`; abilities on `wp_abilities_api_init`. Put this code in a plugin or a must-use plugin, never in WordPress core.
2. **Opt in to the REST API.** Post types, taxonomies, meta and settings are only in the REST API with `show_in_rest => true`; post meta also needs the post type to support `custom-fields`.
3. **Let capabilities decide access.** `current_user_can()`, `permission_callback` and `auth_callback` enforce permissions on every request, whatever the admin or frontend.
4. **Expose custom actions as Abilities.** An ability has an input and output schema and a permission check, and is available over REST (and over MCP with the MCP Adapter plugin).
5. **Extend with hooks.** `add_action()` and `add_filter()` change behavior without editing core or other plugins.
6. **Verify with WP-CLI.** For example `wp post-type list` and `wp eval` (see `wp-cli-for-agents`).

## Looking things up

- `list_domains` and `get_domain`: the key functions, classes and hooks for a task area.
- `get_function`, `get_class`, `get_hook`: exact signature, parameters, return value, `@since` history and source file and line.
- `search_docs`: keyword search, including the WordPress developer handbooks.

Some functions live in `wp-admin/includes` and need a `require_once` outside WP Admin; the domain pages call these out.
