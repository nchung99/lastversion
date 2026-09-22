-- SYNDFCO - Chat gửi hình ảnh User <-> Admin
-- Chạy 1 lần trong Supabase SQL Editor.

alter table public.messages
  add column if not exists image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('support-images','support-images',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public=false,
  file_size_limit=5242880,
  allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "support_images_read" on storage.objects;
drop policy if exists "support_images_upload" on storage.objects;

-- Chỉ Admin hoặc chính player của conversation mới đọc được ảnh.
create policy "support_images_read" on storage.objects
for select to authenticated
using (
  bucket_id='support-images' and (
    public.is_admin() or exists (
      select 1 from public.conversations c
      where c.id::text=(storage.foldername(name))[2]
        and c.player_user_id=auth.uid()
    )
  )
);

-- Chỉ Admin hoặc chính player của conversation mới upload được ảnh vào conversation đó.
create policy "support_images_upload" on storage.objects
for insert to authenticated
with check (
  bucket_id='support-images'
  and (storage.foldername(name))[1]=auth.uid()::text
  and (
    public.is_admin() or exists (
      select 1 from public.conversations c
      where c.id::text=(storage.foldername(name))[2]
        and c.player_user_id=auth.uid()
    )
  )
);
