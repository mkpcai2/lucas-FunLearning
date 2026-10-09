-- 在 Supabase 的 SQL Editor 執行一次。
-- 讓登入的玩家可以看見其他人的寵物形象和經驗。

drop policy if exists "pets read self" on public.pets;
create policy "pets read" on public.pets for select using (true);
