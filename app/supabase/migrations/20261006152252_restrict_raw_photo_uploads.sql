-- Apply only after secure-car-photo and the corresponding frontend are live.
create policy "Car photos require verified server processing" on storage.objects
as restrictive for insert to authenticated
with check (bucket_id <> 'car-photos');
