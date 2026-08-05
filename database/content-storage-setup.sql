-- Execute no Supabase SQL Editor. Compatível com as tabelas existentes:
-- profiles, conteudos e conteudo_versoes.
-- Não cria, remove ou altera colunas dessas tabelas.

insert into storage.buckets (id, name, public)
values ('conteudos', 'conteudos', true)
on conflict (id) do update set public = true;

-- SECURITY DEFINER evita a recursão de RLS que existia ao consultar profiles.
create or replace function public.is_master()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and hierarquia = 'master'
  );
$$;

grant execute on function public.is_master() to authenticated;

alter table public.conteudos enable row level security;
alter table storage.objects enable row level security;

-- Estas policies são adicionais e não removem suas políticas existentes.
-- Se a política antiga de profiles continuar com recursão, envie-a para revisão
-- antes de remover qualquer política já usada em produção.
drop policy if exists "Authenticated users read active contents" on public.conteudos;
create policy "Authenticated users read active contents"
on public.conteudos for select to authenticated
using (status = 'ativo' or public.is_master());

drop policy if exists "Masters manage contents" on public.conteudos;
create policy "Masters manage contents"
on public.conteudos for all to authenticated
using (public.is_master())
with check (public.is_master());

drop policy if exists "Masters upload content files" on storage.objects;
create policy "Masters upload content files"
on storage.objects for insert to authenticated
with check (bucket_id = 'conteudos' and public.is_master());

drop policy if exists "Masters delete content files" on storage.objects;
create policy "Masters delete content files"
on storage.objects for delete to authenticated
using (bucket_id = 'conteudos' and public.is_master());
