create table if not exists research (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  topic text not null,
  research_type text not null,
  status text not null default 'queued',
  requested_by_user_id uuid references app_users(id),
  scope_notes text not null default '',
  ai_instructions text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists research_notes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references research(id) on delete cascade,
  title text not null,
  version integer not null,
  status text not null default 'draft',
  format_schema jsonb not null default '{}'::jsonb,
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (request_id, version)
);

create table if not exists research_note_sections (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references research_notes(id) on delete cascade,
  position integer not null,
  title text not null,
  content text not null default '',
  content_format text not null default 'plain_text',
  format_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists knowledge_base_papers (
  id uuid primary key default gen_random_uuid(),
  research_id uuid not null references research(id) on delete cascade,
  title text not null,
  description text not null default '',
  is_verified boolean not null default false,
  paper_url text,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists research_notes_chats (
  id uuid primary key default gen_random_uuid(),
  research_note_id uuid not null references research_notes(id) on delete cascade,
  role text not null,
  message text not null,
  message_type text not null default 'chat',
  metadata jsonb not null default '{}'::jsonb,
  llm_run_id uuid,
  created_by text not null,
  created_at timestamptz not null default now()
);

create or replace function set_research_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists research_updated_at on research;

create trigger research_updated_at
before update on research
for each row
execute function set_research_updated_at();

create or replace function set_research_note_sections_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists research_note_sections_updated_at on research_note_sections;

create trigger research_note_sections_updated_at
before update on research_note_sections
for each row
execute function set_research_note_sections_updated_at();

create index if not exists research_status_created_at_idx
  on research (status, created_at desc);

create index if not exists research_type_created_at_idx
  on research (research_type, created_at desc);

create index if not exists research_notes_request_version_idx
  on research_notes (request_id, version desc);

create index if not exists research_note_sections_note_position_idx
  on research_note_sections (note_id, position);

create index if not exists knowledge_base_papers_research_idx
  on knowledge_base_papers (research_id, created_at desc);

create index if not exists research_notes_chats_note_created_at_idx
  on research_notes_chats (research_note_id, created_at);

create index if not exists research_notes_chats_note_type_created_at_idx
  on research_notes_chats (research_note_id, message_type, created_at);
