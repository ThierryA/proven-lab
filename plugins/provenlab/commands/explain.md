---
description: Explain something about the project visually - the site's structure, the data model, how it fits together, the plan or the deploy path
argument-hint: "[what to explain, e.g. the site structure]"
---

Explain this visually: $ARGUMENTS

If nothing specific was asked, explain the project's overall structure: its pages and navigation, its main records, and where it runs.

1. **Look first, do not guess.** Read `.provenlab/project.md` and `.provenlab/plan.md` if they exist, then the actual project: the plugin's post types, fields, roles and routes; the theme's templates and menus; on a running site `wp post-type list`, `wp menu list` and `wp plugin list`. For how the pieces fit in general, `get_blueprint architecture`.
2. **Draw it** with the best your app supports (runbook, "Explain visually"):
   - **Generative UI** if your app can render interactive visuals (widgets, artifacts, canvases, HTML or SVG): boxes and arrows, short labels, and if it helps, click or hover to reveal details.
   - Otherwise a **Mermaid** diagram: `flowchart` for pages, navigation, architecture and deploys; `erDiagram` for the data model; `sequenceDiagram` for a request or an AI flow.
   - Otherwise a compact text tree or table.
3. **One idea per visual**, about 15 boxes at most; split a big subject into two or three visuals. Label in the user's words; for non-developers, no technical names.
4. Follow with three to five short sentences on what the visual shows and what matters most, then offer to zoom into one part.
