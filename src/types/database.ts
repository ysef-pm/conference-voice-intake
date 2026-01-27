export interface Organization {
  id: string
  name: string
  owner_id: string
  created_at: string
}

export interface Event {
  id: string
  organization_id: string
  name: string
  slug: string
  questions: Question[]
  email_template: EmailTemplate
  branding: Branding
  status: 'draft' | 'active' | 'completed'
  outreach_channel: 'email' | 'whatsapp' | 'both'
  created_at: string
}

export interface Question {
  id: string
  field: string
  label: string
  order: number
}

export interface EmailTemplate {
  subject?: string
  body?: string
  reminder_subject?: string
  reminder_body?: string
}

export interface Branding {
  logo_url?: string
  primary_color?: string
  event_name?: string
}

export interface Attendee {
  id: string
  event_id: string
  email: string
  name: string | null
  phone: string | null
  token: string
  status: AttendeeStatus
  matching_consent: boolean
  scheduled_at: string | null
  contacted_at: string | null
  completed_at: string | null
  created_at: string
}

export type AttendeeStatus =
  | 'imported'
  | 'contacted'
  | 'scheduled'
  | 'clicked'
  | 'in_progress'
  | 'completed'
  | 'matched'

export interface Response {
  id: string
  attendee_id: string
  answers: Record<string, string>
  embedding: number[] | null
  topics: string[]
  mode: 'voice' | 'chat' | null
  transcript: string | null
  created_at: string
}

export interface Match {
  id: string
  event_id: string
  attendee_a_id: string
  attendee_b_id: string
  similarity_score: number | null
  common_interests: string | null
  status: 'pending' | 'a_consented' | 'b_consented' | 'introduced'
  introduced_at: string | null
  created_at: string
}

// Pipeline stats
export interface PipelineStats {
  imported: number
  contacted: number
  scheduled: number
  clicked: number
  in_progress: number
  completed: number
  matched: number
}
