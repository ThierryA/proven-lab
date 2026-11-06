---
nav: "Overview"
title: "Cloud AI API: overview"
summary: An HTTP API for models, search over your content, and agents. What it includes, how to authenticate, and how to call it from WordPress or a custom app.
---

# Cloud AI API

The Cloud AI API is an HTTP API that runs on its own infrastructure, outside WordPress. Call it from WordPress (PHP) or from a custom app's server.

- **Base URL:** `https://api.ai.wpengine.com/v1`
- **Spec:** `/openapi/cloud-ai-api.yaml` (a snapshot of the published OpenAPI spec)
- **Look up an operation:** `get_ai_operation` (for example `get_ai_operation createChatCompletion`)

## What it includes

| Part | What it does | Main operations |
|---|---|---|
| **Gateway** | Chat, images, speech and transcription across several model providers; models are chosen by id (for example `google/gemini-3.5-flash`) | `createChatCompletion`, `createImageGeneration`, `createSpeech`, `createTranscription`, `listModels` |
| **Content endpoints** | Single-call tasks | `createImageAltText`, `summarizeContent`, `suggestTaxonomy` |
| **Knowledge base** | Index documents into collections and search them | `createCollection`, `indexDocument`, `bulkIndexDocuments`, `searchCollection` |
| **Agents and sessions** | Managed agents with tools, grounded in a collection; conversations as sessions | `createAgent`, `createSession`, `sendSessionEvents`, `listSessionEvents` |
| **Site connection** | Connects a WordPress site; used by the WP Engine AI plugin | `registerSite`, `heartbeatSite` |
| **Analytics, credits** | Usage and balance; account login only | `getAnalytics`, `getCredits` |

## Compatibility

- `POST /v1/chat/completions` follows the OpenAI Chat Completions API, so OpenAI SDKs work with `baseURL` set to the base URL above.
- `POST /v1/messages` follows the Anthropic Messages API, for Anthropic models only.
- The Responses, Embeddings and legacy Completions APIs are not available.

## Authentication

- Send `Authorization: Bearer <key>` on every request except the model catalog (`GET /v1/models`).
- Create keys in the WP Engine User Portal. Use an **account key** (`wpe_`) for servers; a **user key** (`wpe_pat_`) acts as the person who created it.
- Each endpoint needs a scope (`chat`, `image`, `speech`, `transcribe`, `collections`, `documents`, `search`, `agents`, `session_events`) at `read` or `write`.
- Keep keys on the server; browsers call your server.

## Errors and limits

- Errors use one JSON envelope: `{"error": {"message", "type", "code", "request_id"}}`. Do not retry `400`, `401`, `402` (no credits), `403` or `404`.
- Rate limits apply across all of `/v1/*`: 600 requests per 60 seconds per key, 60 per 60 seconds per IP without a key. A limit returns `429` (an HTML body, no `Retry-After`): back off exponentially with jitter.

## From WordPress

- **Gateway from PHP:** the WordPress AI Client (`wp_ai_client_prompt()`, WordPress 7.0+) with the WP Engine AI Connector plugin, or `wp_remote_post()`.
- **Everything else:** HTTP from PHP or from your custom app's server.

Patterns with code (search over site content, agents, keeping the knowledge base in sync): `ai-features`.
