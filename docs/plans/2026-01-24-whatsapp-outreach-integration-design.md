# WhatsApp Outreach Integration Design

**Date:** 2026-01-24
**Status:** Approved
**Context:** Matchys.ai MVP - add WhatsApp as outreach channel for SaaSiest pilot

## Problem

Currently, attendee outreach is email-only. WhatsApp has higher open rates and may be preferred in some markets/contexts. Organizers need the option to reach attendees via WhatsApp.

## Solution

Add WhatsApp as an additional outreach channel using Twilio WhatsApp API. Organizers select the channel at the event level.

## Design

### Database Changes

**Add phone column to attendees:**
```sql
ALTER TABLE attendees ADD COLUMN phone TEXT;
```

**Add outreach channel setting to events:**
```sql
ALTER TABLE events ADD COLUMN outreach_channel TEXT DEFAULT 'email';
-- Values: 'email', 'whatsapp', 'both'
```

### Environment Variables

```
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_WHATSAPP_NUMBER=+14155238886
```

### API Route

**New file: `src/app/api/events/[id]/send-whatsapp/route.ts`**

Mirrors the email route structure:
1. Validate auth and event ownership
2. Fetch attendees with status 'imported' AND phone IS NOT NULL
3. For each attendee, send WhatsApp message via Twilio
4. Update status to 'contacted'
5. Return sent/failed/skipped counts

**Twilio integration:**
```typescript
import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

await client.messages.create({
  from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
  to: `whatsapp:${attendee.phone}`,
  body: messageBody,
})
```

### Message Template

```
Hi {{attendeeName}}! 👋

You're invited to share what you're looking for at {{eventName}} so we can match you with the right people.

Tap here to start: {{intakeUrl}}

- {{organizerName}}
```

**Note:** WhatsApp Business API requires pre-approved message templates for outbound messages. Submit this template in Twilio console for approval (24-48 hours).

### UI Changes

**CSV Import:**
- Recognize phone columns: `phone`, `phone_number`, `mobile`, `whatsapp`
- Map to `phone` field in attendees table

**Event Settings (creation/edit page):**
```
Outreach Channel
○ Email only
○ WhatsApp only
○ Both (sends to all available contacts)
```

**Attendees Table:**
- Add phone column to table view
- Show WhatsApp icon next to attendees with phone numbers

**Send Button Logic:**
- `email` → calls `/api/events/[id]/send-emails`
- `whatsapp` → calls `/api/events/[id]/send-whatsapp`
- `both` → calls both endpoints

### Edge Cases & Validation

**Missing phone numbers:**
- Skip attendees without phone (don't fail)
- Return: "Sent 15 WhatsApp messages (5 skipped - no phone number)"

**"Both" channel selected:**
- Send email to all with email address
- Send WhatsApp to all with phone number
- Attendees with both contact methods receive both
- Single status update to 'contacted' after either succeeds

**Phone number formatting:**
- Store as E.164 format (+31629470881)
- On CSV import, normalize using `libphonenumber-js`
- If unparseable, store raw and let Twilio attempt delivery

**Rate limiting:**
- Add 200ms delay between messages to avoid Twilio rate limits

## Implementation Steps

1. **Database migration** - Add phone column to attendees, outreach_channel to events
2. **CSV import update** - Recognize and import phone column
3. **Event settings UI** - Add outreach channel selector
4. **Attendees table UI** - Show phone column and WhatsApp indicator
5. **Twilio setup** - Create account, get WhatsApp number, submit message template
6. **Send WhatsApp API route** - Implement `/api/events/[id]/send-whatsapp`
7. **Update send button** - Route to correct API based on event setting
8. **Test** - End-to-end test with real WhatsApp messages

## Dependencies

- Twilio account with WhatsApp enabled
- Approved WhatsApp message template (24-48 hour approval)
- `twilio` npm package
- `libphonenumber-js` npm package (for phone parsing)

## Success Criteria

- Organizers can select outreach channel at event level
- CSV import captures phone numbers
- WhatsApp messages delivered successfully
- Status correctly updated to 'contacted'
- Skipped attendees (no phone) are logged and counted
