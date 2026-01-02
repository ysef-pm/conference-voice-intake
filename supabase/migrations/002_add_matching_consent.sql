-- Add matching_consent column to attendees table
-- This column tracks whether an attendee has consented to being matched with other attendees

ALTER TABLE attendees
ADD COLUMN matching_consent boolean DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN attendees.matching_consent IS 'Whether the attendee has consented to being matched with other attendees';
