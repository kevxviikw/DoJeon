-- Evidence storage for Proof.
--
-- checkins.file_url has always existed (0001_init.sql) but nothing ever
-- wrote to it -- the Proof screen's "Tap to attach a photo" card was UI
-- only, with no picker or upload wired up (see progress-diary.md,
-- 2026-09-03). This adds the bucket + policies the client now uploads to.
--
-- Private bucket, one folder per user (path "{auth.uid()}/...") -- RLS
-- below restricts every operation to the owner's own folder. This covers
-- the owner viewing/managing their own evidence. It deliberately does NOT
-- yet cover a squad-mate viewing a non-private file (file_private = false)
-- -- that needs the client to fetch a signed URL through a callable that
-- checks checkins.file_private server-side, since storage RLS can't see
-- that column directly. Known follow-up, same shape as the other
-- documented stubs in this app -- not built here.

insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', false)
on conflict (id) do nothing;

create policy "evidence: owner can read own files"
  on storage.objects for select
  using (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "evidence: owner can upload to own folder"
  on storage.objects for insert
  with check (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "evidence: owner can update own files"
  on storage.objects for update
  using (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "evidence: owner can delete own files"
  on storage.objects for delete
  using (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);
