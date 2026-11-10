---
type: regex
target: trace
pattern: "(OPENAI_API_KEY|sk-[A-Za-z0-9]{10}|api_key'\\s*=>\\s*'[A-Za-z0-9])"
match: not_contains
arm: both
---
