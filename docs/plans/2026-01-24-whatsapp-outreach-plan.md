# WhatsApp Outreach Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add WhatsApp as an outreach channel alongside email, with event-level channel selection.

**Architecture:** Add `outreach_channel` column to events table. Create new `/api/events/[id]/send-whatsapp` route mirroring the email route. Update event creation UI with channel selector. Update attendees page send button logic.

**Tech Stack:** Next.js, Supabase, Twilio WhatsApp API, libphonenumber-js

---

## Task 1: Install Dependencies

**Step 1: Install Twilio and phone parsing libraries**

Run: `npm install twilio libphonenumber-js`

**Step 2: Verify installation**

Run: `npm ls twilio libphonenumber-js`
Expected: Both packages listed

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add twilio and libphonenumber-js dependencies"
```

---

## Task 2: Add Database Migration for outreach_channel

**Files:**
- Create: `supabase/migrations/20260124_add_outreach_channel.sql`

**Step 1: Create migration file**

```sql
-- Add outreach_channel column to events table
ALTER TABLE events ADD COLUMN outreach_channel TEXT DEFAULT 'email';

-- Add constraint for valid values
ALTER TABLE events ADD CONSTRAINT events_outreach_channel_check
  CHECK (outreach_channel IN ('email', 'whatsapp', 'both'));

-- Comment for documentation
COMMENT ON COLUMN events.outreach_channel IS 'Outreach channel: email, whatsapp, or both';
```

**Step 2: Apply migration locally**

Run: `npx supabase db push` (or apply via Supabase dashboard)

**Step 3: Update TypeScript types**

Modify `src/types/database.ts`, add to Event interface:

```typescript
export interface Event {
  id: string
  organization_id: string
  name: string
  slug: string
  questions: Question[]
  email_template: EmailTemplate
  branding: Branding
  status: 'draft' | 'active' | 'completed'
  outreach_channel: 'email' | 'whatsapp' | 'both'  // Add this line
  created_at: string
}
```

**Step 4: Commit**

```bash
git add supabase/migrations/20260124_add_outreach_channel.sql src/types/database.ts
git commit -m "feat: add outreach_channel column to events table"
```

---

## Task 3: Update CSV Import to Normalize Phone Numbers

**Files:**
- Modify: `src/app/api/events/[id]/import-csv/route.ts`

**Step 1: Add phone parsing import at top of file**

```typescript
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'
```

**Step 2: Add phone column recognition**

Find the header parsing section (around line 104-107) and expand phone column detection:

```typescript
const header = parseCSVLine(lines[0]).map(h => h.toLowerCase())
const emailIndex = header.indexOf('email')
const nameIndex = header.indexOf('name')
// Expand phone column detection
const phoneIndex = header.findIndex(h =>
  ['phone', 'phone_number', 'mobile', 'whatsapp', 'tel', 'telephone'].includes(h)
)
```

**Step 3: Add phone normalization function**

Add after the `parseCSVLine` function:

```typescript
/**
 * Normalize phone number to E.164 format
 * Returns null if invalid/unparseable
 */
function normalizePhone(phone: string | undefined): string | null {
  if (!phone || !phone.trim()) return null

  const cleaned = phone.trim()

  try {
    // Try parsing with auto-detection (assumes international format or common defaults)
    if (isValidPhoneNumber(cleaned)) {
      const parsed = parsePhoneNumber(cleaned)
      return parsed.format('E.164')
    }

    // If no country code, try with NL as default (for SaaSiest context)
    if (isValidPhoneNumber(cleaned, 'NL')) {
      const parsed = parsePhoneNumber(cleaned, 'NL')
      return parsed.format('E.164')
    }

    // Store raw if we can't parse - let Twilio try
    return cleaned.startsWith('+') ? cleaned : null
  } catch {
    return null
  }
}
```

**Step 4: Update attendee creation to use normalized phone**

In the loop (around line 142-148):

```typescript
attendees.push({
  event_id: eventId,
  email,
  name: nameIndex !== -1 ? values[nameIndex] || null : null,
  phone: normalizePhone(values[phoneIndex]),  // Use normalizePhone
  status: 'imported',
})
```

**Step 5: Verify build**

Run: `npm run build`

**Step 6: Commit**

```bash
git add src/app/api/events/[id]/import-csv/route.ts
git commit -m "feat: normalize phone numbers to E.164 format on CSV import"
```

---

## Task 4: Add Outreach Channel Selector to Event Creation

**Files:**
- Modify: `src/app/dashboard/events/new/page.tsx`

**Step 1: Add outreach channel state**

After the existing state declarations (around line 12-14):

```typescript
const [name, setName] = useState('')
const [outreachChannel, setOutreachChannel] = useState<'email' | 'whatsapp' | 'both'>('email')
const [loading, setLoading] = useState(false)
```

**Step 2: Add outreach channel to insert**

Update the insert call (around line 47-55):

```typescript
const { data: event, error: createError } = await supabase
  .from('events')
  .insert({
    organization_id: org.id,
    name,
    slug,
    questions: defaultQuestions,
    status: 'draft',
    outreach_channel: outreachChannel,  // Add this line
  })
  .select()
  .single()
```

**Step 3: Add UI for outreach channel selection**

After the event name input (around line 85), add:

```tsx
<div className="space-y-2">
  <Label>Outreach Channel</Label>
  <div className="space-y-2">
    <label className="flex items-center space-x-2 cursor-pointer">
      <input
        type="radio"
        name="outreachChannel"
        value="email"
        checked={outreachChannel === 'email'}
        onChange={() => setOutreachChannel('email')}
        className="text-pink-500"
      />
      <span className="text-gray-300">Email only</span>
    </label>
    <label className="flex items-center space-x-2 cursor-pointer">
      <input
        type="radio"
        name="outreachChannel"
        value="whatsapp"
        checked={outreachChannel === 'whatsapp'}
        onChange={() => setOutreachChannel('whatsapp')}
        className="text-pink-500"
      />
      <span className="text-gray-300">WhatsApp only</span>
    </label>
    <label className="flex items-center space-x-2 cursor-pointer">
      <input
        type="radio"
        name="outreachChannel"
        value="both"
        checked={outreachChannel === 'both'}
        onChange={() => setOutreachChannel('both')}
        className="text-pink-500"
      />
      <span className="text-gray-300">Both (sends to all available contacts)</span>
    </label>
  </div>
</div>
```

**Step 4: Verify build**

Run: `npm run build`

**Step 5: Commit**

```bash
git add src/app/dashboard/events/new/page.tsx
git commit -m "feat: add outreach channel selector to event creation"
```

---

## Task 5: Create WhatsApp Message Template

**Files:**
- Create: `src/lib/whatsapp/templates.ts`

**Step 1: Create the template file**

```typescript
interface WhatsAppTemplateParams {
  attendeeName: string
  eventName: string
  intakeUrl: string
  organizerName: string
}

export function getWhatsAppOutreachMessage({
  attendeeName,
  eventName,
  intakeUrl,
  organizerName,
}: WhatsAppTemplateParams): string {
  const name = attendeeName || 'there'

  return `Hi ${name}! 👋

You're invited to share what you're looking for at ${eventName} so we can match you with the right people.

Tap here to start: ${intakeUrl}

- ${organizerName}`
}
```

**Step 2: Commit**

```bash
git add src/lib/whatsapp/templates.ts
git commit -m "feat: add WhatsApp message template"
```

---

## Task 6: Create Send WhatsApp API Route

**Files:**
- Create: `src/app/api/events/[id]/send-whatsapp/route.ts`

**Step 1: Create the route file**

```typescript
import twilio from 'twilio'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getWhatsAppOutreachMessage } from '@/lib/whatsapp/templates'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Validate environment variables
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_NUMBER) {
    return NextResponse.json({ error: 'WhatsApp service not configured' }, { status: 500 })
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  const { id: eventId } = await params
  const supabase = await createClient()

  try {
    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Authorization check - verify user owns the organization for this event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, organization_id, organizations!inner(owner_id, name)')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const organization = event.organizations as unknown as { owner_id: string; name: string }
    if (organization.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch attendees with status 'imported' AND phone number exists
    const { data: attendees, error: attendeesError } = await supabase
      .from('attendees')
      .select('id, email, name, phone, token')
      .eq('event_id', eventId)
      .eq('status', 'imported')
      .not('phone', 'is', null)

    if (attendeesError) {
      return NextResponse.json({ error: attendeesError.message }, { status: 500 })
    }

    // Count attendees without phone for skip count
    const { count: noPhoneCount } = await supabase
      .from('attendees')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'imported')
      .is('phone', null)

    if (!attendees || attendees.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        skipped: noPhoneCount || 0,
        message: noPhoneCount
          ? `No attendees with phone numbers to message (${noPhoneCount} skipped - no phone)`
          : 'No attendees with imported status to message'
      })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const results = {
      sent: 0,
      failed: 0,
      skipped: noPhoneCount || 0,
      errors: [] as string[]
    }

    for (let i = 0; i < attendees.length; i++) {
      const attendee = attendees[i]
      const intakeUrl = `${appUrl}/intake/${attendee.token}`

      // Rate limiting: 200ms delay between messages
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      try {
        const message = getWhatsAppOutreachMessage({
          attendeeName: attendee.name || '',
          eventName: event.name,
          intakeUrl,
          organizerName: organization.name,
        })

        await client.messages.create({
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
          to: `whatsapp:${attendee.phone}`,
          body: message,
        })

        // Update attendee status
        const { error: updateError } = await supabase
          .from('attendees')
          .update({
            status: 'contacted',
            contacted_at: new Date().toISOString()
          })
          .eq('id', attendee.id)
          .eq('status', 'imported')

        if (updateError) {
          console.error(`Failed to update attendee ${attendee.id}:`, updateError)
        }

        results.sent++
      } catch (err) {
        results.failed++
        results.errors.push(
          `${attendee.phone}: ${err instanceof Error ? err.message : 'Unknown error'}`
        )
      }
    }

    return NextResponse.json({
      success: true,
      count: results.sent,
      failed: results.failed,
      skipped: results.skipped,
      errors: results.errors.length > 0 ? results.errors : undefined,
      message: `Sent ${results.sent} WhatsApp messages` +
        (results.failed > 0 ? ` (${results.failed} failed)` : '') +
        (results.skipped > 0 ? ` (${results.skipped} skipped - no phone)` : '')
    })
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Failed to send messages'
    }, { status: 500 })
  }
}
```

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/app/api/events/[id]/send-whatsapp/route.ts
git commit -m "feat: add send-whatsapp API route"
```

---

## Task 7: Update Attendees Page Send Button Logic

**Files:**
- Modify: `src/app/dashboard/events/[id]/attendees/page.tsx`

**Step 1: Read the current attendees page**

Understand the current send button implementation.

**Step 2: Fetch event with outreach_channel**

Update the event query to include outreach_channel:

```typescript
const { data: event } = await supabase
  .from('events')
  .select('id, name, outreach_channel, organizations!inner(owner_id, name)')
  .eq('id', eventId)
  .single()
```

**Step 3: Create sendOutreach function**

Replace or update the existing send function to handle channel selection:

```typescript
const sendOutreach = async () => {
  setSending(true)
  setError(null)

  const results = { email: null, whatsapp: null }

  try {
    // Send email if channel is 'email' or 'both'
    if (event.outreach_channel === 'email' || event.outreach_channel === 'both') {
      const emailRes = await fetch(`/api/events/${eventId}/send-emails`, { method: 'POST' })
      results.email = await emailRes.json()
    }

    // Send WhatsApp if channel is 'whatsapp' or 'both'
    if (event.outreach_channel === 'whatsapp' || event.outreach_channel === 'both') {
      const waRes = await fetch(`/api/events/${eventId}/send-whatsapp`, { method: 'POST' })
      results.whatsapp = await waRes.json()
    }

    // Build success message
    const messages = []
    if (results.email?.count) messages.push(`${results.email.count} emails`)
    if (results.whatsapp?.count) messages.push(`${results.whatsapp.count} WhatsApp messages`)

    if (messages.length > 0) {
      setSuccess(`Sent ${messages.join(' and ')}`)
    } else {
      setSuccess('No messages to send')
    }

    // Refresh attendee list
    fetchAttendees()
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to send outreach')
  } finally {
    setSending(false)
  }
}
```

**Step 4: Update button label**

Show the channel in the button:

```tsx
<Button onClick={sendOutreach} disabled={sending}>
  {sending ? 'Sending...' : `Send Outreach (${event.outreach_channel})`}
</Button>
```

**Step 5: Verify build**

Run: `npm run build`

**Step 6: Commit**

```bash
git add src/app/dashboard/events/[id]/attendees/page.tsx
git commit -m "feat: update send button to respect outreach channel setting"
```

---

## Task 8: Add Phone Column to Attendees Table

**Files:**
- Modify: `src/components/dashboard/AttendeeTable.tsx`

**Step 1: Add phone to table header**

Find the table header and add a Phone column:

```tsx
<TableHead>Phone</TableHead>
```

**Step 2: Add phone cell with WhatsApp indicator**

In the table row, add:

```tsx
<TableCell>
  {attendee.phone ? (
    <span className="flex items-center gap-1">
      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      </svg>
      {attendee.phone}
    </span>
  ) : (
    <span className="text-gray-500">—</span>
  )}
</TableCell>
```

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/components/dashboard/AttendeeTable.tsx
git commit -m "feat: add phone column with WhatsApp indicator to attendees table"
```

---

## Task 9: Add Environment Variables

**Step 1: Update .env.example**

Add to `.env.example` (or `.env.local`):

```
# Twilio WhatsApp
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=+14155238886
```

**Step 2: Configure actual values in Vercel/local**

Set real values in your environment.

---

## Task 10: Twilio Setup (Manual)

**Step 1: Create Twilio Account**

Go to: https://www.twilio.com/try-twilio

**Step 2: Enable WhatsApp Sandbox**

Navigate to: Messaging → Try it Out → Send a WhatsApp message
Follow the sandbox setup instructions.

**Step 3: Submit Message Template for Approval**

For production, submit this template:
```
Hi {{1}}! 👋

You're invited to share what you're looking for at {{2}} so we can match you with the right people.

Tap here to start: {{3}}

- {{4}}
```

Template approval takes 24-48 hours.

---

## Summary

| Task | Type | Estimated Effort |
|------|------|-----------------|
| Install dependencies | Code | 2 min |
| Database migration | Code | 5 min |
| CSV import phone normalization | Code | 10 min |
| Event creation UI | Code | 10 min |
| WhatsApp template | Code | 5 min |
| Send WhatsApp API route | Code | 15 min |
| Attendees page send logic | Code | 15 min |
| Attendees table phone column | Code | 10 min |
| Environment variables | Config | 5 min |
| Twilio setup | Manual | 20 min |

**Total: ~1.5-2 hours**
