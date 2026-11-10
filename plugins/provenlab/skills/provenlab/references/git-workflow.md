# Git and GitHub: history, commits and deploy on push

> **Runbook step 2 · Workspace** (connect), used again in steps 3 to 6 (commit, push, deploy). Command: `/provenlab:git-connect`. **Next:** step 3, build.

## 1. Ask during onboarding

In step 1's single message, include GitHub:

- **Developers:** "Should I put this in a GitHub repository? I can create a new private one, use an existing one, or skip it for now."
- **Non-developers:** "I can keep a history of every change on GitHub (free), so nothing is ever lost and we can undo mistakes. Want that?" Skip it if they say no; offer again before the first production deploy.

Also ask the **push policy** once: push after each change you approve (default), or push automatically after every commit.

## 2. Connect

1. `git --version`; if Git is missing, tell the user how to install it (developers) or skip GitHub (non-developers without Git).
2. `gh auth status`. Not signed in: ask the user to run `gh auth login` (or install the GitHub CLI from https://cli.github.com). Never ask for a token or password in chat.
3. **New repository** (in the project folder):

```bash
git init -b main
gh repo create <name> --private --source=. --remote=origin
```

4. **Existing repository:** `git clone <url>`, or in an existing folder `git remote add origin <url>`. Read the README, the default branch and any contribution rules first.
5. Add a `.gitignore` before the first commit. For a repository whose root contains `wp-content/` (plugin and theme together), ignore everything else:

```gitignore
/*
!/wp-content/
/wp-content/*
!/wp-content/plugins/
!/wp-content/themes/
/wp-content/plugins/*
!/wp-content/plugins/<slug>/
/wp-content/themes/*
!/wp-content/themes/<theme>/
!/.github/
!/.gitignore
!/README.md
!/.provenlab/
vendor/
node_modules/
.env
*.log
```

For a plugin-only repository, the plugin template's `.gitignore` is enough.

6. First commit and push: `git add -A && git commit -m "Initial commit: <app> plugin and theme" && git push -u origin main`.
7. Record it in `.provenlab/project.md`: repository URL, default branch, push policy, deploy on push (yes or no).

## 3. Commit discipline

- **Commit each verified step:** after a change works (step 5 checks pass), commit it. One logical change per commit; never commit broken code to `main`.
- **Messages:** imperative summary under 70 characters, then a short body when the why is not obvious. Example: `Add featured flag to books, exposed in REST`.
- **Never commit secrets:** `.env`, application passwords, API keys, `wp-config.php`. Check `git status` before each commit.
- **Developers:** work on a branch (`git switch -c feature/<name>`), and open a pull request with `gh pr create` when the user wants review. Non-developers: commit on `main`.

## 4. Push

- **Always commit before pushing**, and never push uncommitted or unverified work.
- Follow the push policy in `.provenlab/project.md`: by default, ask "Ready to push these changes to GitHub?" and push on yes; with automatic pushes, push after each commit and say so.
- Never force-push to a shared branch, and never push to a branch the user has not agreed to.

## 5. Deploy on push (WP Engine)

With WP Engine, a push can deploy to staging automatically through WP Engine's GitHub Action:

1. `get_template` with `deploy-github-action` adds `.github/workflows/deploy.yml`: a push to `main` deploys to staging; production runs only when the workflow is started by hand, after the user's yes.
2. The user connects the repository once with WP Engine's guided setup (User Portal → **Profile → GitHub Action**), which stores the deploy key as a repository secret. Never create keys yourself.
3. Set the environment names: `gh variable set WPE_STAGING_ENV --body <staging install>` and `gh variable set WPE_PRODUCTION_ENV --body <production install>`.
4. After a push, follow the run with `gh run watch`, then send the user the staging link. Production: `gh workflow run deploy.yml` only after their yes.

Without WP Engine or without the Action, deploy as `wpe-deployment` describes; the repository still keeps the history.

## Done when

The repository exists and is recorded in `.provenlab/project.md`, every verified change is a commit, pushes follow the user's policy, and (with WP Engine) a push to `main` deploys to staging.
