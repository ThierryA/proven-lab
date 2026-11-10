---
description: Start or resume a Proven Lab project - onboarding, new or existing, setup, workspace and GitHub
argument-hint: "[what you want to build or change]"
---

Start (or resume) a Proven Lab project for this request: $ARGUMENTS

Follow the Proven Lab runbook (`get_blueprint runbook`, or `references/runbook.md` in the skill):

1. **Project memory:** if `.provenlab/project.md` exists, read it, summarize the project in two lines, and skip every question it answers.
2. **Who and what:** developer or non-developer (from the request and the environment). New or existing project: for an existing one, follow `get_blueprint existing-project`.
3. **Onboarding questions, in one message, only what is not known:** the setup (Classic, Headless Frontend, Headless Admin, Headless Frontend + Admin; `get_blueprint architecture`) with your recommendation; where to build (Local, or in the cloud on WP Engine, which needs an account); GitHub and the push policy (`get_blueprint git-workflow`). Developers choose. Wait for the answer before writing code. Non-developers: propose plainly and continue unless they object.
4. **Workspace:** `get_blueprint local-development` or `wpengine-cloud`; connect GitHub if wanted (`/provenlab:git-connect`).
5. **Write `.provenlab/project.md`.**
6. Then offer the next step: `/provenlab:plan` for anything bigger than a small change, or build directly.

If the `provenlab` tools are not available, use `curl "{{BASE}}/api/<tool>?<args>"` instead.
