begin;

-- Read only the signed-in user's password-presence state. Never expose a hash,
-- accept a user-selected ID, or rely on editable user_metadata for this decision.
create or replace function public.fitsync_has_password()
returns boolean language plpgsql security definer set search_path = '' as $$
declare result boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select coalesce(length(encrypted_password),0)>0 into result
    from auth.users where id=auth.uid() and email_confirmed_at is not null;
  if not found then raise exception 'Confirm your email first'; end if;
  return result;
end $$;
revoke all on function public.fitsync_has_password() from public,anon;
grant execute on function public.fitsync_has_password() to authenticated;
notify pgrst,'reload schema';

commit;
