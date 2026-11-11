---
description: Plan the work before building - steps, files, verification and deploy - and get the user's OK
argument-hint: "[what to build or change]"
---

Plan this before writing code: $ARGUMENTS

1. Read `.provenlab/project.md` (run the `start` command first if it is missing).
2. Look up what the plan needs: the guides for the setup (`get_blueprint classic-wordpress` or `custom-app`, `frontend-design` for anything people see, `wpe-ai-plugins` for AI), the starter files (`get_template`), and existing plugins that already do part of the job.
3. Write `.provenlab/plan.md`:
   - **Goal** in one sentence, in the user's words.
   - **Reuse:** plugins or core features used instead of new code.
   - **Steps:** small, each ending in something that can be verified; for each, the files it creates or changes.
   - **Data model:** post types, fields, roles and capabilities, Abilities (with the plugin prefix).
   - **Verification:** the quick WP-CLI checks and requests that prove each step (the full checks run only on request, locally or in CI).
   - **Commits:** one per step, with the message.
   - **Ship:** staging, then production after the user's yes.
4. Show the plan visually first: the pages and navigation, and the data model (records, fields, relations), with generative UI if your app supports it, else Mermaid (`flowchart`, `erDiagram`). Then summarize it briefly (plain words for non-developers) and wait for the user's OK or changes before building. Offer the choices "Build it" (recommended), "Change the plan". Then work through it step by step, ticking steps off in `.provenlab/plan.md` and committing after each verified step.
