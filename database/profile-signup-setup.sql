-- Execute no Supabase SQL Editor.
-- Mantém o e-mail confirmado/cadastrado em auth.users sincronizado com profiles.

alter table public.profiles add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
  and p.email is null;

create unique index if not exists profiles_email_unique
on public.profiles (lower(email))
where email is not null;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, telefone, cpf, email, hierarquia)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), 'Usuário'),
    nullif(new.raw_user_meta_data ->> 'telefone', ''),
    nullif(new.raw_user_meta_data ->> 'cpf', ''),
    new.email,
    'membro'
  )
  on conflict (id) do update set
    nome = excluded.nome,
    telefone = excluded.telefone,
    cpf = excluded.cpf,
    email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user_profile();
