create extension if not exists pgcrypto;

create table if not exists public.event_sync_registry (
  event_id text primary key,
  sync_code_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_sync_state (
  event_id text primary key references public.event_sync_registry(event_id) on delete cascade,
  payload jsonb not null default '{"attendees":[],"winners":[],"audit":[],"settings":{"foodCapacity":0}}'::jsonb,
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.event_sync_registry enable row level security;
alter table public.event_sync_state enable row level security;

revoke all on public.event_sync_registry from anon, authenticated;
revoke all on public.event_sync_state from anon, authenticated;

create index if not exists event_sync_state_updated_at_idx on public.event_sync_state(updated_at desc);
