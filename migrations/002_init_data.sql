create table if not exists app_init_data (
  key text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_app_init_data_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists app_init_data_updated_at on app_init_data;

create trigger app_init_data_updated_at
before update on app_init_data
for each row
execute function set_app_init_data_updated_at();
