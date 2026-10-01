-- Users read and write only their own rows.
alter table public.collections enable row level security;
alter table public.saves enable row level security;

create policy "Own collections: select" on public.collections
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Own collections: insert" on public.collections
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Own collections: update" on public.collections
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Own collections: delete" on public.collections
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Own saves: select" on public.saves
  for select to authenticated using ((select auth.uid()) = user_id);
-- A save may only point at one of the same user's collections.
create policy "Own saves: insert" on public.saves
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and (collection_id is null or exists (
      select 1 from public.collections c where c.id = collection_id and c.user_id = (select auth.uid())
    ))
  );
create policy "Own saves: update" on public.saves
  for update to authenticated using ((select auth.uid()) = user_id) with check (
    (select auth.uid()) = user_id
    and (collection_id is null or exists (
      select 1 from public.collections c where c.id = collection_id and c.user_id = (select auth.uid())
    ))
  );
create policy "Own saves: delete" on public.saves
  for delete to authenticated using ((select auth.uid()) = user_id);
