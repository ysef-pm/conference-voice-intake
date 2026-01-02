-- Allow public to update responses for upsert to work
-- The submit-chat API uses upsert which requires both INSERT and UPDATE permissions

create policy "Anyone can update responses"
  on responses for update
  using (true);
