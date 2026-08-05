-- Execute este script no Supabase SQL Editor.
-- Ele cria a estrutura para arquivos enviados pelo painel administrativo.

create table if not exists public.conteudos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  "fileName" text not null,
  date text,
  tag text not null default 'online',
  categoria text,
  file_url text not null,
  storage_path text not null unique,
  file_type text not null check (file_type in ('pdf', 'image', 'video')),
  page_count integer check (page_count is null or page_count > 0),
  size_bytes bigint,
  status text not null default 'ativo',
  created_at timestamptz not null default now()
);

alter table public.conteudos add column if not exists title text;
alter table public.conteudos add column if not exists description text;
alter table public.conteudos add column if not exists "fileName" text;
alter table public.conteudos add column if not exists date text;
alter table public.conteudos add column if not exists tag text default 'online';
alter table public.conteudos add column if not exists categoria text;
alter table public.conteudos add column if not exists file_url text;
alter table public.conteudos add column if not exists storage_path text;
alter table public.conteudos add column if not exists file_type text;
alter table public.conteudos add column if not exists page_count integer;
alter table public.conteudos add column if not exists size_bytes bigint;
alter table public.conteudos add column if not exists status text default 'ativo';
alter table public.conteudos add column if not exists created_at timestamptz default now();

create index if not exists conteudos_status_idx on public.conteudos (status);

insert into storage.buckets (id, name, public)
values ('conteudos', 'conteudos', true)
on conflict (id) do update set public = true;

alter table public.profiles add column if not exists role text not null default 'member';

-- Leitura para usuários autenticados e upload somente para administradores.
-- A função evita consultar policies diretamente, prevenindo recursão de RLS.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

alter table public.conteudos enable row level security;

drop policy if exists "Authenticated users can read active content" on public.conteudos;
create policy "Authenticated users can read active content"
on public.conteudos for select to authenticated
using (status = 'ativo' or public.is_admin());

drop policy if exists "Admins manage content" on public.conteudos;
create policy "Admins manage content"
on public.conteudos for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can read content files" on storage.objects;
create policy "Authenticated users can read content files"
on storage.objects for select to authenticated
using (bucket_id = 'conteudos');

drop policy if exists "Admins upload content files" on storage.objects;
create policy "Admins upload content files"
on storage.objects for insert to authenticated
with check (bucket_id = 'conteudos' and public.is_admin());

drop policy if exists "Admins delete content files" on storage.objects;
create policy "Admins delete content files"
on storage.objects for delete to authenticated
using (bucket_id = 'conteudos' and public.is_admin());
