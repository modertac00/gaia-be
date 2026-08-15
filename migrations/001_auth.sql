create extension if not exists pgcrypto;

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function prevent_multiple_app_users()
returns trigger as $$
begin
  if (select count(*) from app_users) >= 1 then
    raise exception 'Gaia allows exactly one app account';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists app_users_single_account on app_users;

create trigger app_users_single_account
before insert on app_users
for each row
execute function prevent_multiple_app_users();
