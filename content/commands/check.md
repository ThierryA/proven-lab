---
description: Run the full checks on demand - WP-CLI, test suites, static analysis and a screenshot review, locally or in CI
---

Run the full checks on the current work. They run on demand (when the user asks or runs this command), not after every change; every change already gets a quick WP-CLI check.

**Where:** locally (the user's Local site, or `wp-env`) or in CI on GitHub. On WP Engine, keep to quick WP-CLI checks in `sandbox_bash`: do not install test suites or run long checks in the sandbox unless the user asks for it there, and say first that it is slow and uses sandbox time.


1. Prove behavior with WP-CLI and real HTTP requests (`get_blueprint wp-cli-for-agents`; `get_template verify-script` has a ready script).
2. Developers: run the project's coding standards, static analysis and tests (`get_blueprint best-practices`), locally or by pushing and following CI (`gh run watch`).
3. Anything people see: screenshots at 375, 768 and 1280 px wide, reviewed against `get_blueprint frontend-design`; fix before showing the user.
4. Commit what passed (`get_blueprint git-workflow`).
5. Report exactly what you checked and the results, plainly for non-developers. End with the next steps, never an open question: two or three concrete options in plain words, your recommendation first (as choices if your app can). For example: fix what failed, ship it to staging, or keep building.
