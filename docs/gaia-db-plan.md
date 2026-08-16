# Gaia Database Plan

## Purpose

Gaia currently stores the research library in one seeded JSONB payload:
`app_init_data.payload` with key `research-library`. That is useful for UI
prototyping, but it is not enough for real Gaia workflows where research
requests, AI instructions, LLM calls, source verification, approvals, and Atlas
handoff all need traceable records.

This plan describes the database shape Gaia should move toward before deeper
AI automation is added.

## Current State

Existing tables:

- `app_users`: single local Gaia account.
- `app_init_data`: key/value JSONB storage for seeded UI data.

Current research write path:

- `POST /research-documents` reads `app_init_data.payload`.
- It inserts a queued document into nested JSON.
- It stores generated Markdown instructions inside `documentDetails`.
- It writes the whole JSON payload back.

This is acceptable only as a bridge.

## Concerns

- Whole-document JSON updates are fragile. Two users or background jobs can
  overwrite each other.
- Research documents cannot be queried, filtered, assigned, or audited cleanly.
- Source verification is embedded in presentation JSON instead of modeled as
  reviewable evidence.
- LLM calls have no durable run records, prompts, model metadata, token usage,
  cost, errors, or outputs.
- Generated Markdown instructions are useful, but they should be stored as
  versioned request context, not only as UI detail data.
- Approval state is mixed into display props rather than controlled by domain
  rules.
- Atlas handoff needs immutable approved research snapshots, not mutable draft
  UI payloads.

## Design Principles

- Keep each research request as a first-class record.
- Store AI prompts, Markdown briefs, and LLM outputs as versioned artifacts.
- Separate request intent, generated draft, source evidence, human edits, and
  approval decisions.
- Make every factual claim traceable to one or more source records.
- Preserve enough audit history to explain how a note was created and approved.
- Keep JSONB for flexible AI payloads, but use relational columns for workflow,
  ownership, status, timestamps, and foreign keys.

## Proposed Core Tables

### `research`

One row per research request created by an RA or another system.

Key columns:

- `id uuid primary key`
- `title text not null`
- `topic text not null`
- `research_type text not null`
- `status text not null`
- `requested_by_user_id uuid references app_users(id)`
- `scope_notes text not null default ''`
- `ai_instructions text not null default ''`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Suggested statuses:

- `requested`
- `queued`
- `researching`
- `draft_ready`
- `in_review`
- `approved`
- `rejected`
- `consumed_by_atlas`

### `research_notes`

The version container for a Gaia draft or human-edited note. This table should
not hard-code product sections like summary, key findings, risks, or open
questions. Those sections are flexible and belong in `research_note_sections`.

Key columns:

- `id uuid primary key`
- `request_id uuid not null references research(id)`
- `title text not null`
- `version integer not null`
- `status text not null`
- `format_schema jsonb not null default '{}'::jsonb`
- `created_by text not null`
- `created_at timestamptz not null default now()`

Constraint:

- Unique `(request_id, version)`.

Use this table when Gaia drafts a note or an RA saves an edited version.

### `research_note_sections`

Flexible titled content blocks for one `research_notes` record. The database
stores a title and text content. JSON metadata describes how the content should
be rendered or interpreted by AI.

Key columns:

- `id uuid primary key`
- `note_id uuid not null references research_notes(id)`
- `position integer not null`
- `title text not null`
- `content text not null default ''`
- `content_format text not null default 'plain_text'`
- `format_metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Suggested `content_format` values:

- `plain_text`
- `markdown`
- `json_text`
- `csv_text`
- `table_text`
- `prompt_text`

`knowledge_base_papers`.

Key columns:

- `id uuid primary key`
- `research_id uuid not null references research(id)`
- `title text not null`
- `description text not null`
- `is_verified boolean not null`
- `paper_url`
- `created_by text not null`
- `created_at timestamptz not null default now()`


`research_notes_chats`.

Chat history for a specific `research_notes` record. Each note can have its own
assistant conversation so edits, follow-up questions, paper discovery,
regulation scans, competitor scans, and summaries stay attached to the note
they affected.

Key columns:

- `id uuid primary key`
- `research_note_id uuid not null references research_notes(id)`
- `role text not null`
- `message text not null`
- `message_type text not null default 'chat'`
- `metadata jsonb not null default '{}'::jsonb`
- `llm_run_id uuid`
- `created_by text not null`
- `created_at timestamptz not null default now()`

Suggested `role` values:

- `user`
- `assistant`
- `system`
- `tool`

Suggested `message_type` values:

- `chat`
- `instruction`
- `paper_search`
- `regulation_scan`
- `competitor_scan`
- `summary`
- `source_verification`
- `note_revision`

Example `metadata`:

```json
{
  "taskType": "paper_search",
  "sourceIds": ["source-id-1", "source-id-2"],
  "promptVersion": 1,
  "model": "gpt-5",
  "tokens": {
    "input": 1200,
    "output": 450
  }
}
```

Recommended indexes:

- `research_notes_chats(research_note_id, created_at)`
- `research_notes_chats(research_note_id, message_type, created_at)`

This table should store the conversation transcript and lightweight metadata.
Large structured LLM inputs/outputs should still be stored in a separate LLM run
table when that table is added, with `llm_run_id` linking the chat message back
to the durable run record.

## API Plan

The API should move from UI-shaped mock endpoints toward domain endpoints that
match the database. The frontend can still map these responses into the current
Gaia UI, but the backend should expose research, notes, papers, and note chat as
first-class resources.

### API Principles

- Keep `research` as the top-level resource.
- Keep `research_notes` scoped under one research record.
- Keep `research_notes_chats` scoped under one research note.
- Return stable IDs from create endpoints.
- Use text fields for note/chat content and JSON fields only for flexible
  metadata or format schemas.
- Let LLM-facing endpoints create chat records and, later, durable LLM run
  records.
- Keep current `/init` endpoints temporarily for UI compatibility only.

### Compatibility Endpoints

Keep during migration:

- `GET /init`
- `GET /research-documents/:id`
- `POST /research-documents`

These endpoints can be backed by the new tables later, but they should not be
the long-term API shape.

### Research APIs

#### `GET /research`

List research requests.

Query params:

- `status`
- `researchType`
- `search`
- `limit`
- `cursor`

Response shape:

```json
{
  "items": [
    {
      "id": "research-id",
      "title": "EU CSRD reporting rules - 2026 update",
      "topic": "Regulation",
      "researchType": "regulation",
      "status": "queued",
      "scopeNotes": "Focus on Wave 2 companies",
      "createdAt": "2026-08-16T10:30:00.000Z",
      "updatedAt": "2026-08-16T10:30:00.000Z"
    }
  ],
  "nextCursor": null
}
```

#### `POST /research`

Create a research request.

Request body:

```json
{
  "title": "EU CSRD reporting rules - 2026 update",
  "topic": "Regulation",
  "researchType": "regulation",
  "scopeNotes": "Focus on Wave 2 companies and supplier data requirements.",
  "aiInstructions": "Prefer EU primary sources and keep assumptions separate."
}
```

Response shape:

```json
{
  "id": "research-id",
  "status": "queued"
}
```

#### `GET /research/:researchId`

Get one research request with latest note summary, papers, and lightweight chat
counts.

Response shape:

```json
{
  "id": "research-id",
  "title": "EU CSRD reporting rules - 2026 update",
  "topic": "Regulation",
  "researchType": "regulation",
  "status": "queued",
  "scopeNotes": "Focus on Wave 2 companies and supplier data requirements.",
  "aiInstructions": "Prefer EU primary sources and keep assumptions separate.",
  "latestNote": {
    "id": "research-note-id",
    "title": "Initial Gaia draft",
    "version": 1,
    "status": "draft"
  },
  "paperCount": 3,
  "chatCount": 8,
  "createdAt": "2026-08-16T10:30:00.000Z",
  "updatedAt": "2026-08-16T10:30:00.000Z"
}
```

#### `PATCH /research/:researchId`

Update request-level metadata.

Allowed fields:

- `title`
- `topic`
- `researchType`
- `status`
- `scopeNotes`
- `aiInstructions`

#### `DELETE /research/:researchId`

Soft delete or archive a research request. Prefer a status such as `archived`
instead of physical deletion once chats, notes, and LLM runs exist.

### Research Note APIs

#### `GET /research/:researchId/notes`

List notes for one research request.

Response shape:

```json
{
  "items": [
    {
      "id": "research-note-id",
      "title": "Initial Gaia draft",
      "version": 1,
      "status": "draft",
      "createdBy": "Gaia",
      "createdAt": "2026-08-16T10:35:00.000Z"
    }
  ]
}
```

#### `POST /research/:researchId/notes`

Create a new note version.

Request body:

```json
{
  "title": "Initial Gaia draft",
  "status": "draft",
  "formatSchema": {
    "schemaVersion": 1,
    "defaultContentFormat": "markdown"
  },
  "sections": [
    {
      "title": "Summary",
      "content": "CSRD Wave 2 expands reporting obligations...",
      "contentFormat": "markdown",
      "formatMetadata": {
        "kind": "summary"
      }
    },
    {
      "title": "Open questions",
      "content": "- Which EU member state should be handled first?",
      "contentFormat": "markdown",
      "formatMetadata": {
        "kind": "question_list"
      }
    }
  ]
}
```

Response shape:

```json
{
  "id": "research-note-id",
  "version": 1,
  "status": "draft"
}
```

#### `GET /research/:researchId/notes/:noteId`

Get a note with ordered content sections.

Response shape:

```json
{
  "id": "research-note-id",
  "researchId": "research-id",
  "title": "Initial Gaia draft",
  "version": 1,
  "status": "draft",
  "formatSchema": {
    "schemaVersion": 1
  },
  "sections": [
    {
      "id": "section-id",
      "position": 1,
      "title": "Summary",
      "content": "CSRD Wave 2 expands reporting obligations...",
      "contentFormat": "markdown",
      "formatMetadata": {
        "kind": "summary"
      }
    }
  ]
}
```

#### `PATCH /research/:researchId/notes/:noteId`

Update note title, status, or format schema.

#### `POST /research/:researchId/notes/:noteId/sections`

Add a titled content section to a note.

Request body:

```json
{
  "title": "Competitor scan",
  "content": "Persefoni positions around enterprise carbon accounting...",
  "contentFormat": "markdown",
  "formatMetadata": {
    "kind": "competitor_scan",
    "llmTask": "competitor_scan"
  }
}
```

#### `PATCH /research/:researchId/notes/:noteId/sections/:sectionId`

Update section title, content, position, content format, or metadata.

#### `DELETE /research/:researchId/notes/:noteId/sections/:sectionId`

Delete or hide a section. Prefer soft delete later if audit requirements need
section history.

### Knowledge Base Paper APIs

#### `GET /research/:researchId/papers`

List papers attached to a research request.

#### `POST /research/:researchId/papers`

Attach a paper manually or from an AI paper-search result.

Request body:

```json
{
  "title": "Scope 3 data quality in supplier networks",
  "description": "Relevant to supplier-level data gaps.",
  "paperUrl": "https://example.com/paper",
  "isVerified": false
}
```

#### `PATCH /research/:researchId/papers/:paperId`

Update paper title, description, URL, or verification state.

### Research Note Chat APIs

#### `GET /research/:researchId/notes/:noteId/chats`

List chat messages for a specific research note.

Query params:

- `limit`
- `cursor`
- `messageType`

Response shape:

```json
{
  "items": [
    {
      "id": "chat-id",
      "researchNoteId": "research-note-id",
      "role": "user",
      "message": "Find related papers for supplier data quality.",
      "messageType": "paper_search",
      "metadata": {
        "taskType": "paper_search"
      },
      "createdBy": "RA",
      "createdAt": "2026-08-16T10:40:00.000Z"
    }
  ],
  "nextCursor": null
}
```

#### `POST /research/:researchId/notes/:noteId/chats`

Create a chat message for a specific note. This can be a user message, system
instruction, assistant response, or tool result.

Request body:

```json
{
  "role": "user",
  "message": "Scan regulations and add a regulation table section.",
  "messageType": "regulation_scan",
  "metadata": {
    "taskType": "regulation_scan"
  }
}
```

Response shape:

```json
{
  "id": "chat-id",
  "researchNoteId": "research-note-id"
}
```

#### `POST /research/:researchId/notes/:noteId/chats/run`

Create a user chat message and trigger an AI task. This endpoint should later
create a durable LLM run record and link assistant/tool messages with
`llm_run_id`.

Request body:

```json
{
  "message": "Find related papers and summarize the best five.",
  "taskType": "paper_search",
  "metadata": {
    "maxResults": 5,
    "preferredSources": ["academic", "official"]
  }
}
```

Response shape:

```json
{
  "userChatId": "chat-id",
  "assistantChatId": "chat-id",
  "status": "completed"
}
```

### Approval APIs

These can be added after note/source verification tables are finalized.

- `POST /research/:researchId/notes/:noteId/submit-review`
- `POST /research/:researchId/notes/:noteId/approve`
- `POST /research/:researchId/notes/:noteId/reject`

Approval endpoints should enforce source verification rules before status
changes.

### Atlas Handoff APIs

These can be added once approvals are durable.

- `POST /research/:researchId/notes/:noteId/handoff/atlas`
- `GET /research/:researchId/notes/:noteId/handoffs`

The handoff API should send an immutable note snapshot, not the mutable latest
note rows.

### API Implementation Order

1. `POST /research` and `GET /research`
2. `POST /research/:researchId/notes`
3. `GET /research/:researchId/notes/:noteId`
4. Section create/update APIs
5. `GET` and `POST` note chat APIs
6. Paper attach/list/update APIs
7. AI chat run endpoint
8. Approval and Atlas handoff endpoints
