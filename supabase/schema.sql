-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- Scope: trimmed to what the MVP actually needs. Things intentionally
-- left out for now (see README "Lo que dejamos fuera del MVP"):
--   - document version history (only latest version is stored)
--   - conversations as a separate table (stored inline as jsonb for speed)
--   - pgvector / semantic search

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  experiencia jsonb default '[]'::jsonb,
  educacion jsonb default '[]'::jsonb,
  habilidades jsonb default '[]'::jsonb,
  intereses jsonb default '[]'::jsonb,
  suggested_roles jsonb default '[]'::jsonb,
  upskilling_suggestions jsonb default '[]'::jsonb,
  completeness int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company text not null,
  role text not null,
  job_description text,
  status text not null default 'borrador'
    check (status in ('borrador', 'aplicado', 'entrevista', 'oferta', 'rechazado')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  type text not null check (type in ('cv', 'cover_letter')),
  content text not null default '',
  chat_history jsonb default '[]'::jsonb, -- MVP: chat stored inline, not a separate table
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security — every table, every user only sees their own rows.
alter table profiles enable row level security;
alter table applications enable row level security;
alter table application_documents enable row level security;

create policy "profiles_owner" on profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "applications_owner" on applications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "application_documents_owner" on application_documents
  for all using (
    exists (
      select 1 from applications a
      where a.id = application_documents.application_id
      and a.user_id = auth.uid()
    )
  );
