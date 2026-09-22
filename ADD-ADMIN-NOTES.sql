-- SYNDFCO - thêm Tên ghi nhớ + Ghi chú nội bộ cho Admin
-- Chạy file này 1 lần trong Supabase SQL Editor.

alter table public.conversations
  add column if not exists admin_alias text,
  add column if not exists admin_note text;

-- Không cần policy mới: Admin hiện tại đã có quyền UPDATE conversations.
-- User/player không có quyền UPDATE nên không thể tự sửa hoặc xem qua UI player.
