---
description: An AI feature. The agent should use the Cloud AI API through the WP Engine AI plugins (site connection, no API key), not the browser Web Speech API and not a hard-coded key.
tags: [orchestration, ai]
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit]
---

New project, Classic setup, I'm a developer, WordPress 7.1 is in ./site. Do not run any commands; write the files only.

Create a plugin "voice-notes" that lets editors record a voice note in WP Admin and turns it into the text of a draft post.
