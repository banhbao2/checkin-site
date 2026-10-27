-- Run once in Supabase: SQL Editor → New query → paste → Run.
-- Replaces the old single-team tables (their data is deleted).
drop table if exists reactions, round, members, rooms cascade;
drop function if exists room_code;

-- The room code the page sends in the `x-room` header. Every rule below only
-- lets a page see and change its own room, so a room is reachable only by its link.
create function room_code() returns text language sql stable as $$
  select nullif(current_setting('request.headers', true), '')::json ->> 'x-room'
$$;

-- One row per check-in room. The why-round lives here.
create table rooms (
  code text primary key check (code ~ '^[a-z0-9]{10}$'),
  speakers text[] not null default '{}', -- names in speaking order
  speaker int not null default -1,       -- -1 = no why-round, length of speakers = finished
  shuffled boolean not null default false,
  created_at timestamptz not null default now(),
  last_used timestamptz not null default now() -- set each time someone opens the link
);

-- The people in a room and the reaction they picked (null = not picked yet).
create table members (
  room text not null references rooms on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  reaction text check (reaction ~ '^[a-z-]{1,24}$'),
  added_at timestamptz not null default now(),
  primary key (room, name)
);

-- Anyone with the link can add and remove names, check in, run the why-round and reset.
-- Rooms can't be listed or deleted from the website.
alter table rooms enable row level security;
alter table members enable row level security;
create policy "own room" on rooms for select using (code = room_code());
create policy "create" on rooms for insert with check (code = room_code());
create policy "change" on rooms for update using (code = room_code());
create policy "own room" on members for all using (room = room_code()) with check (room = room_code());
grant select, insert, update on rooms to anon;
grant select, insert, update, delete on members to anon;

-- Every Sunday at 03:00 UTC, delete rooms nobody opened for 90 days (their names go with them).
create extension if not exists pg_cron;
select cron.schedule('delete-old-rooms', '0 3 * * 0',
  $$delete from public.rooms where last_used < now() - interval '90 days'$$);
