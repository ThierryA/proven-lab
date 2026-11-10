---
description: A fully specified developer request. The agent should build a regular plugin (not a must-use plugin or theme functions.php) with prefixed names and REST-exposed fields, starting from the plugin template.
tags: [orchestration, build, developer]
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit]
---

New project, Classic setup, no repository, I'm a developer. WordPress is in ./site (so plugins go in ./site/wp-content/plugins). Do not run any commands; write the files only.

Build a plugin with the slug "recipe-box": a Recipe content type with two fields, ingredients (text) and cook time in minutes (number), both readable and writable over the REST API. When you are done, list the files you wrote.
