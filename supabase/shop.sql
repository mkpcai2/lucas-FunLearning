-- 在 Supabase 的 SQL Editor 執行一次。
-- 讓玩學科遊戲時拿到的寵物幣可以存進大家共用的帳號。

alter table public.pets add column if not exists coins int not null default 0;
alter table public.pets add column if not exists day_coins int not null default 0;
