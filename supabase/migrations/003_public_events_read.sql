-- Allow public read access to events for intake pages
-- This is needed because the intake page joins attendees with events
-- and unauthenticated users need to see event name/branding

create policy "Public can view events"
  on events for select
  using (true);
