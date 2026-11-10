---
description: Verify the work before handing it over - WP-CLI, quality checks and a screenshot review
---

Verify the current work before handing it over:

1. Prove behavior with WP-CLI and real HTTP requests (`get_blueprint wp-cli-for-agents`; `get_template verify-script` has a ready script). On WP Engine, run WP-CLI through the WP Engine MCP server's `sandbox_bash`.
2. Developers: run the project's coding standards, static analysis and tests (`get_blueprint best-practices`).
3. Anything people see: screenshots at 375, 768 and 1280 px wide, reviewed against `get_blueprint frontend-design`; fix before showing the user.
4. Commit what passed (`get_blueprint git-workflow`).
5. Report exactly what you checked and the results, plainly for non-developers.
