# Domain glossary

Source of truth for the data model plan: `docs/gaia-db-plan.md`. Value lists below are **target contract lists** (`@moderta/api-contracts/gaia`); today they are duplicated as local arrays in `src/research/dto/research.dto.ts` and `src/research-note-chats/dto/research-note-chats.dto.ts`.

| Term | Meaning | Table |
|---|---|---|
| Account / user | The authenticated Gaia operator (currently a single account enforced by DB trigger) | `app_users` |
| Research | A research request: title, topic, type, scope notes, AI instructions, lifecycle status | `research` |
| Research type | `market`, `regulation`, `competitor`, `customer-problem` | — |
| Research status | `requested`, `queued`, `researching`, `draft_ready`, `in_review`, `approved`, `rejected`, `consumed_by_atlas` (+ `archived` used by DELETE today) | — |
| Research note | A versioned output document for a research request | `research_notes` |
| Note status | `draft`, `in_review`, `approved`, `rejected` | — |
| Note section | Ordered content block of a note with a content format | `research_note_sections` |
| Content format | `plain_text`, `markdown`, `json_text`, `csv_text`, `table_text`, `prompt_text` | — |
| Paper | Knowledge-base source attached to a research, with verification flag | `knowledge_base_papers` |
| Chat message | Message on a note thread; has role and message type | `research_notes_chats` |
| Chat role | `user`, `assistant`, `system`, `tool` | — |
| Message type / task type | `chat`, `instruction`, `paper_search`, `regulation_scan`, `competitor_scan`, `summary`, `source_verification`, `note_revision` | — |
| LLM run | Planned durable record of an AI call (prompt, model, tokens, cost, output) | planned |
| Atlas | Downstream consumer that receives approved research (`consumed_by_atlas`) | — |
| Init data | Legacy JSONB UI payload (`app_init_data`, key `research-library`); compatibility endpoints only | `app_init_data` |
