-- SYNDFCO: chuyển từ TEST sang player riêng + admin đăng nhập
-- Chạy toàn bộ file này 1 lần trong Supabase SQL Editor.

alter table public.conversations add column if not exists player_user_id uuid references auth.users(id) on delete set null;
alter table public.conversations add column if not exists admin_alias text;
alter table public.conversations add column if not exists admin_note text;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.admin_users a where a.user_id=auth.uid()) $$;
grant execute on function public.is_admin() to authenticated;

-- Xóa policy TEST cũ
drop policy if exists "test_insert_conversations" on public.conversations;
drop policy if exists "test_read_conversations" on public.conversations;
drop policy if exists "test_update_conversations" on public.conversations;
drop policy if exists "test_insert_messages" on public.messages;
drop policy if exists "test_read_messages" on public.messages;

-- Player: chỉ thấy/tạo conversation của chính auth.uid() ẩn danh.
create policy "player_insert_own_conversation" on public.conversations for insert to authenticated
with check (player_user_id=auth.uid() and not public.is_admin());
create policy "player_read_own_conversation" on public.conversations for select to authenticated
using (player_user_id=auth.uid() or public.is_admin());

-- Admin: xem và cập nhật mọi conversation.
create policy "admin_update_conversations" on public.conversations for update to authenticated
using (public.is_admin()) with check (public.is_admin());

-- Message: player chỉ đọc chat của conversation mình; admin đọc tất cả.
create policy "read_allowed_messages" on public.messages for select to authenticated
using (public.is_admin() or exists(select 1 from public.conversations c where c.id=conversation_id and c.player_user_id=auth.uid()));
create policy "player_send_message" on public.messages for insert to authenticated
with check (sender='player' and exists(select 1 from public.conversations c where c.id=conversation_id and c.player_user_id=auth.uid()) and not public.is_admin());
create policy "admin_send_message" on public.messages for insert to authenticated
with check (sender='admin' and public.is_admin());

-- Data API grants; RLS ở trên mới quyết định được xem/sửa dòng nào.
grant usage on schema public to authenticated;
grant select,insert,update on public.conversations to authenticated;
grant select,insert on public.messages to authenticated;
grant usage,select on all sequences in schema public to authenticated;
revoke all on public.conversations from anon;
revoke all on public.messages from anon;

-- updated_at tự đổi khi có tin nhắn mới để inbox mới nhất nổi lên trên.
create or replace function public.touch_conversation() returns trigger language plpgsql security definer set search_path=public as $$
begin update public.conversations set updated_at=now() where id=new.conversation_id; return new; end $$;
drop trigger if exists trg_touch_conversation on public.messages;
create trigger trg_touch_conversation after insert on public.messages for each row execute function public.touch_conversation();
