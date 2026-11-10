---
type: llm
focus: last_message
---
PASS if the final message (1) uses plain language a non-developer understands, with no unexplained technical terms such as "headless", "REST API", "post type", "plugin slug", "repository" or "CLI"; (2) proposes an approach instead of asking the user to choose between technical setups (for example "I'll build it as a regular WordPress site"); and (3) mentions what the user will need or do about hosting or an account (for example a hosting account, installing a free tool, or that the agent can set it up in the cloud), or asks about it plainly.
FAIL if it asks the user to pick between technical architectures, uses unexplained jargon, or ignores where the site will run.
