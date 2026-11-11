---
description: Connect the project to GitHub - create or link the repository, first commit, push policy, deploy on push
---

Connect this project to GitHub, following `get_blueprint git-workflow`:

1. Check `git --version` and `gh auth status`. If the GitHub CLI is not signed in, ask the user to run `gh auth login`; never ask for a token in chat.
2. Ask, in one message, only what is not known: a new private repository (and its name) or an existing one (its URL); the push policy (push after their OK, the default, or automatically).
3. Create or link the repository, add the `.gitignore` from the guide, make the first commit, and push.
4. With WP Engine, offer deploy on push: `get_template` with `deploy-github-action`, the user's one-time WP Engine GitHub Action setup, and the environment variables.
5. Record the repository, default branch, push policy and deploy setting in `.provenlab/project.md`, and tell the user what is set up.
