# Event vs Community Workflows Design

**Date:** 2026-01-24
**Status:** Approved
**Context:** Matchys.ai MVP - support both event-specific and ongoing community matching

## Problem

The current system only supports event-specific matching (one-time, organizer imports attendees). Users also want ongoing community matching where members self-join and get matched periodically.

## Solution

Add Communities as a sibling entity to Events under Organizations. Communities support monthly matching rounds with opt-in participation, availability collection, and auto-scheduled calendar events.

## Comparison

| Aspect | Event | Community |
|--------|-------|-----------|
| Matching pool | Event attendees only | All opted-in community members |
| Timing | One-time after event | Periodic (monthly rounds) |
| Join model | Organizer imports CSV | Public link, self-signup |
| Matching trigger | Manual by organizer | Scheduled (e.g., 27th of month) |
| Calendar | Optional | Auto-scheduled from availability |

## Design

### Data Model

**New `communities` table:**
```sql
CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,           -- for public URL: /join/[slug]
  questions JSONB NOT NULL,            -- same format as events.questions
  matching_frequency TEXT DEFAULT 'monthly',
  signup_deadline_day INTEGER DEFAULT 20,  -- day of month
  match_day INTEGER DEFAULT 27,            -- day of month
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**New `community_members` table:**
```sql
CREATE TABLE community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  google_calendar_token JSONB,         -- OAuth refresh token for auto-scheduling
  status TEXT DEFAULT 'active',        -- active, paused, removed
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, email)
);
```

**New `community_rounds` table:**
```sql
CREATE TABLE community_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities(id),
  round_month DATE NOT NULL,           -- e.g., 2026-02-01
  signup_deadline TIMESTAMPTZ,         -- e.g., Feb 20th 23:59
  match_date TIMESTAMPTZ,              -- e.g., Feb 27th 09:00
  status TEXT DEFAULT 'open',          -- open, closed, matching, matched
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, round_month)
);
```

**New `round_participants` table:**
```sql
CREATE TABLE round_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES community_rounds(id),
  member_id UUID REFERENCES community_members(id),
  answers JSONB NOT NULL,
  embedding VECTOR(1536),
  availability JSONB,                  -- time slots they're free
  intake_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(round_id, member_id)
);
```

**Availability format:**
```json
{
  "timezone": "Europe/Amsterdam",
  "slots": [
    { "day": "monday", "start": "09:00", "end": "12:00" },
    { "day": "wednesday", "start": "14:00", "end": "17:00" }
  ]
}
```

**New `community_matches` table:**
```sql
CREATE TABLE community_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES community_rounds(id),
  member_a_id UUID REFERENCES community_members(id),
  member_b_id UUID REFERENCES community_members(id),
  similarity_score FLOAT,
  common_interests TEXT,
  scheduled_time TIMESTAMPTZ,          -- when the call is scheduled
  calendar_event_id TEXT,              -- Google Calendar event ID
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Monthly Matching Round Flow

```
1st of month     → New round opens, members invited to participate
~20th of month   → Deadline to complete intake + submit availability
~27th of month   → Matches generated, calendar events auto-scheduled
Next month       → Repeat
```

### Member Experience

**Joining a community (first time):**
```
/join/[slug]
    ↓
Landing page: "Join the SaaSiest Leaders Community"
    ↓
Basic info: Name, email, phone (optional)
    ↓
"You're in! The next matching round opens on Feb 1st. We'll email you."
```

**Participating in a round:**
```
Email/WhatsApp: "February matching is open! Complete by Feb 20th"
    ↓
/community/[slug]/round/[month]
    ↓
Voice or chat intake (same as events)
    ↓
Availability picker: "When are you free for a 30-min call?"
    ↓
"Done! You'll get your match on Feb 27th"
```

**Receiving a match:**
```
Email: "You've been matched with Sarah Chen!"
    ↓
Shows: name, role, common interests, calendar invite already in your calendar
    ↓
"Your call is scheduled for March 3rd at 2pm"
```

### Organizer Dashboard

**New dashboard sections:**
```
/dashboard/communities
    ├── List of communities
    └── Create new community

/dashboard/communities/[id]
    ├── Overview (member count, next round date, participation rate)
    ├── Members (list, status, join date)
    ├── Rounds (history of past rounds, current round status)
    ├── Settings (questions, matching frequency, deadlines)
    └── Matches (view all matches, success metrics)
```

**Round management features:**
- Rounds auto-created based on frequency setting
- Organizer can extend deadline if needed
- View participation: "12 of 45 members signed up for February"
- Trigger matching early or wait for scheduled date

### Auto-Scheduling Integration

**With Google Calendar OAuth:**
```
During availability step:
    → "Connect Google Calendar to auto-schedule your match"
    → OAuth flow → store refresh token in community_members
    → Read busy times to suggest availability
    → Create events directly when matched
```

**Fallback (no calendar connected):**
```
    → Email both parties with ICS attachment
    → "Add to calendar" button
```

**Scheduling logic:**
1. Find overlapping availability between matched pair
2. Pick first available 30-min slot
3. Create calendar event for both (if OAuth connected)
4. Send confirmation email with meeting details

### API Routes

**Public routes:**
- `GET /join/[slug]` - Community landing page
- `POST /api/community/[slug]/join` - Submit basic info to join
- `GET /community/[slug]/round/[month]` - Round participation page
- `POST /api/community/[slug]/round/[month]/participate` - Submit intake + availability

**Dashboard routes:**
- `GET /api/communities` - List org's communities
- `POST /api/communities` - Create community
- `GET /api/communities/[id]` - Community details
- `GET /api/communities/[id]/members` - List members
- `GET /api/communities/[id]/rounds` - List rounds
- `POST /api/communities/[id]/rounds/[roundId]/match` - Trigger matching

**Scheduled jobs:**
- `cron: 0 0 1 * *` - Create new rounds for all communities
- `cron: 0 9 27 * *` - Run matching for rounds past deadline

## Implementation Steps

1. **Database migrations** - Create all new tables
2. **Community CRUD** - Dashboard pages for creating/managing communities
3. **Member join flow** - Public /join/[slug] page and API
4. **Round participation flow** - Intake + availability UI
5. **Availability picker component** - Weekly time slot selector
6. **Google Calendar OAuth** - Connect calendar flow
7. **Matching job** - Cron job to run periodic matching
8. **Auto-scheduling** - Find overlap + create calendar events
9. **Notification emails** - Round open, deadline reminder, match notification

## Dependencies

- Google Calendar API credentials (OAuth)
- Cron job infrastructure (Vercel cron or external)
- `googleapis` npm package

## Success Criteria

- Members can self-join communities via public link
- Members opt-in to monthly rounds with intake + availability
- Matches generated automatically on schedule
- Calendar events auto-created for connected users
- Organizers can view participation and match history
