---
description: Start or resume a Proven Lab project - what we are doing (quick prototype, new project or existing site), then only what that path needs
argument-hint: "[what you want to build or change]"
---

Start (or resume) a Proven Lab project for this request: $ARGUMENTS

Follow the Proven Lab runbook (`get_blueprint runbook`, or `references/runbook.md` in the skill):

1. **Project memory:** if `.provenlab/project.md` exists, read it, summarize the project in two lines, and skip every question it answers.
2. **Who:** developer or non-developer (from the request and the environment). Word every question for both: plain words first, the technical name in brackets.
3. **Always ask first, and wait for the answer** (developers and non-developers; skip only if the user named the path in their own words, not because the request is detailed), with your recommendation, for example "I'd build it properly so it can go live; or I can make a quick prototype first so you see it in minutes." **"What would you like to do?"** "Try an idea quickly: a working version in minutes" (prototype: follow the `prototype` command and stop here) · "Build it properly, ready to grow and go live" (new project) · "Change a site you already have" (existing project: `get_blueprint existing-project`). If a prototype already exists (`.provenlab/project.md` says **Mode: prototype**), this is the step that makes it a real project: keep the code, then continue below.
4. **New project, in one message, only what is not known:** "How should it work?" (Classic, Headless Frontend, Headless Admin, Headless Frontend + Admin, each described plainly; `get_blueprint architecture`) with your recommendation; "Where should we build it?" (on your computer with Local, or in the cloud on WP Engine, which needs an account); "Keep a history of every change on GitHub?" and the push policy (`get_blueprint git-workflow`). Developers choose. Wait for the answer before writing code. Non-developers: propose in one line and continue unless they object.
5. **Workspace:** `get_blueprint local-development` or `wpengine-cloud`; connect GitHub if wanted (the `git-connect` command).
6. **Write `.provenlab/project.md`,** and show the user the project's structure as a visual (pages, main records, where it runs; generative UI if your app supports it, else Mermaid; see "Explain visually" in the runbook).
7. Then offer the next step: the `plan` command for anything bigger than a small change, or build directly.

If the `provenlab` tools are not available, use `curl "{{BASE}}/api/<tool>?<args>"` instead.
