-- Run once in Supabase: SQL Editor → New query → paste → Run.

-- One row per person who has picked a reaction.
create table reactions (
  name text primary key check (char_length(name) between 1 and 60),
  reaction text not null check (reaction ~ '^[a-z-]{1,24}$')
);

-- The why-round. Always exactly one row.
create table round (
  id int primary key default 1 check (id = 1),
  speakers text[] not null default '{}', -- names in speaking order
  speaker int not null default -1,       -- -1 = no why-round, length of speakers = finished
  shuffled boolean not null default false
);
insert into round default values;

-- Anyone with the link can check in, run the why-round and reset (same as before).
-- The round row itself can't be added or deleted.
alter table reactions enable row level security;
alter table round enable row level security;
create policy "read" on reactions for select using (true);
create policy "add" on reactions for insert with check (true);
create policy "change" on reactions for update using (true);
create policy "remove" on reactions for delete using (true);
create policy "read" on round for select using (true);
create policy "change" on round for update using (true);
grant select, insert, update, delete on reactions to anon;
grant select, update on round to anon;

-- Push changes live to every open page.
alter publication supabase_realtime add table reactions, round;
