-- Add outreach_channel column to events table
ALTER TABLE events ADD COLUMN outreach_channel TEXT DEFAULT 'email';

-- Add constraint for valid values
ALTER TABLE events ADD CONSTRAINT events_outreach_channel_check
  CHECK (outreach_channel IN ('email', 'whatsapp', 'both'));

-- Comment for documentation
COMMENT ON COLUMN events.outreach_channel IS 'Outreach channel: email, whatsapp, or both';
