import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'

/**
 * Parse a CSV line handling quoted values correctly.
 * Handles: "value with, comma", unquoted, "quoted ""escaped"" quotes"
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0

  while (i < line.length) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ("")
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i += 2
          continue
        }
        // End of quoted field
        inQuotes = false
        i++
        continue
      }
      current += char
      i++
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true
        i++
        continue
      }
      if (char === ',') {
        result.push(current.trim())
        current = ''
        i++
        continue
      }
      current += char
      i++
    }
  }

  // Push the last field
  result.push(current.trim())

  return result
}

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params
  const supabase = await createClient()

  try {
    // C2: Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // C2: Authorization check - verify user owns the organization for this event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, organization_id, organizations!inner(owner_id)')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if the user owns the organization
    // The !inner join returns a single object, but TypeScript infers it as an array
    const organization = event.organizations as unknown as { owner_id: string }
    if (organization.owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV must have header and at least one row' }, { status: 400 })
    }

    // C1: Parse header using proper CSV parsing
    const header = parseCSVLine(lines[0]).map(h => h.toLowerCase())
    const emailIndex = header.indexOf('email')
    const nameIndex = header.indexOf('name')
    // Support multiple phone column names
    const phoneColumns = ['phone', 'phone_number', 'mobile', 'whatsapp', 'tel', 'telephone']
    const phoneIndex = phoneColumns.reduce((found, col) => {
      if (found !== -1) return found
      return header.indexOf(col)
    }, -1)

    if (emailIndex === -1) {
      return NextResponse.json({ error: 'CSV must have an email column' }, { status: 400 })
    }

    // C3: Get existing emails for this event to check for duplicates
    const { data: existingAttendees } = await supabase
      .from('attendees')
      .select('email')
      .eq('event_id', eventId)

    const existingEmails = new Set(
      (existingAttendees || []).map(a => a.email.toLowerCase())
    )

    // C1: Parse rows using proper CSV parsing
    const attendees = []
    let skippedDuplicates = 0

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      const email = values[emailIndex]?.trim()

      if (!email || !email.includes('@')) continue

      // C3: Skip duplicate emails
      if (existingEmails.has(email.toLowerCase())) {
        skippedDuplicates++
        continue
      }

      // Add to set to prevent duplicates within the CSV itself
      existingEmails.add(email.toLowerCase())

      attendees.push({
        event_id: eventId,
        email,
        name: nameIndex !== -1 ? values[nameIndex] || null : null,
        phone: normalizePhone(phoneIndex !== -1 ? values[phoneIndex] : undefined),
        status: 'imported',
      })
    }

    if (attendees.length === 0) {
      if (skippedDuplicates > 0) {
        return NextResponse.json({
          success: true,
          count: 0,
          skippedDuplicates,
          message: `All ${skippedDuplicates} attendees already exist in this event`
        })
      }
      return NextResponse.json({ error: 'No valid attendees found in CSV' }, { status: 400 })
    }

    // Insert attendees
    const { data, error } = await supabase
      .from('attendees')
      .insert(attendees)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      count: data.length,
      skippedDuplicates,
      message: skippedDuplicates > 0
        ? `Imported ${data.length} attendees (${skippedDuplicates} duplicates skipped)`
        : `Imported ${data.length} attendees`
    })
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Import failed'
    }, { status: 500 })
  }
}
