---
type: llm
focus: last_message
---
PASS if the final message asks the user, before building, at least two of: whether this is a new project or an existing site; which setup (for example a regular WordPress site versus a separate frontend or admin app, or "Classic" versus "headless"); where to build or host it (their computer, a local tool such as Local, or a hosting provider). The questions may be combined in one message.
FAIL if it starts building without asking, asks only about features (fields, layout) without any of the three topics above, or asks nothing.
