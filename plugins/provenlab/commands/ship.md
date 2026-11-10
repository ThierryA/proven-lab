---
description: Ship - commit, push, deploy to staging, then production after the user's yes
---

Ship the current work, following `get_blueprint wpe-deployment` and `get_blueprint git-workflow`:

1. Read `.provenlab/project.md` for the repository, push policy and environments.
2. Make sure everything is verified (`/provenlab:check`) and **committed**; then push if the push policy allows, or ask "Ready to push to GitHub?".
3. **Staging first:** with deploy on push, follow the GitHub Action run (`gh run watch`); otherwise deploy the plugin and theme files to staging. No staging environment: suggest creating one, or deploy straight to production only after the user agrees, with a backup first.
4. Send the staging link and what to check. **Production only after the user's yes**: back up a site with real content, deploy, check the live pages.
5. Report what is live and where, and update `.provenlab/project.md`.
