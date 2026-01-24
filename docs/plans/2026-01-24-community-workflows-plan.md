# Community Workflows Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Community matching alongside Events - monthly rounds with self-signup, availability collection, and auto-scheduled calendar events.

**Architecture:** New `communities`, `community_members`, `community_rounds`, `round_participants`, and `community_matches` tables. Public `/join/[slug]` signup flow. Dashboard pages for community management. Google Calendar OAuth for auto-scheduling. Vercel cron for periodic matching.

**Tech Stack:** Next.js, Supabase, Google Calendar API, Vercel Cron

---

## Phase 1: Database Schema

### Task 1.1: Create Communities Table Migration

**Files:**
- Create: `supabase/migrations/20260124_create_communities.sql`

**Step 1: Create migration file**

```sql
-- Create communities table
CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]',
  matching_frequency TEXT DEFAULT 'monthly' CHECK (matching_frequency IN ('weekly', 'monthly')),
  signup_deadline_day INTEGER DEFAULT 20 CHECK (signup_deadline_day BETWEEN 1 AND 28),
  match_day INTEGER DEFAULT 27 CHECK (match_day BETWEEN 1 AND 28),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for organization lookup
CREATE INDEX idx_communities_organization_id ON communities(organization_id);

-- Create index for slug lookup (public URLs)
CREATE INDEX idx_communities_slug ON communities(slug);

-- RLS policies
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;

-- Owners can manage their communities
CREATE POLICY "Organization owners can manage communities"
  ON communities FOR ALL
  USING (
    organization_id IN (
      SELECT id FROM organizations WHERE owner_id = auth.uid()
    )
  );

-- Public can read communities (for /join/[slug] page)
CREATE POLICY "Public can read communities"
  ON communities FOR SELECT
  USING (true);
```

**Step 2: Apply migration**

Run: `npx supabase db push`

**Step 3: Commit**

```bash
git add supabase/migrations/20260124_create_communities.sql
git commit -m "feat: create communities table with RLS"
```

---

### Task 1.2: Create Community Members Table Migration

**Files:**
- Create: `supabase/migrations/20260124_create_community_members.sql`

**Step 1: Create migration file**

```sql
-- Create community_members table
CREATE TABLE community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  google_calendar_token JSONB,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'removed')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, email)
);

-- Indexes
CREATE INDEX idx_community_members_community_id ON community_members(community_id);
CREATE INDEX idx_community_members_email ON community_members(email);

-- RLS
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;

-- Organization owners can manage members
CREATE POLICY "Organization owners can manage community members"
  ON community_members FOR ALL
  USING (
    community_id IN (
      SELECT c.id FROM communities c
      JOIN organizations o ON c.organization_id = o.id
      WHERE o.owner_id = auth.uid()
    )
  );

-- Members can read their own record
CREATE POLICY "Members can read their own record"
  ON community_members FOR SELECT
  USING (email = auth.email());

-- Public can insert (for self-signup)
CREATE POLICY "Public can join communities"
  ON community_members FOR INSERT
  WITH CHECK (true);
```

**Step 2: Apply migration**

Run: `npx supabase db push`

**Step 3: Commit**

```bash
git add supabase/migrations/20260124_create_community_members.sql
git commit -m "feat: create community_members table with RLS"
```

---

### Task 1.3: Create Community Rounds Table Migration

**Files:**
- Create: `supabase/migrations/20260124_create_community_rounds.sql`

**Step 1: Create migration file**

```sql
-- Create community_rounds table
CREATE TABLE community_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  round_month DATE NOT NULL,
  signup_deadline TIMESTAMPTZ NOT NULL,
  match_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'matching', 'matched')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, round_month)
);

-- Indexes
CREATE INDEX idx_community_rounds_community_id ON community_rounds(community_id);
CREATE INDEX idx_community_rounds_status ON community_rounds(status);

-- RLS
ALTER TABLE community_rounds ENABLE ROW LEVEL SECURITY;

-- Organization owners can manage rounds
CREATE POLICY "Organization owners can manage rounds"
  ON community_rounds FOR ALL
  USING (
    community_id IN (
      SELECT c.id FROM communities c
      JOIN organizations o ON c.organization_id = o.id
      WHERE o.owner_id = auth.uid()
    )
  );

-- Public can read open rounds
CREATE POLICY "Public can read open rounds"
  ON community_rounds FOR SELECT
  USING (status IN ('open', 'closed'));
```

**Step 2: Apply migration**

Run: `npx supabase db push`

**Step 3: Commit**

```bash
git add supabase/migrations/20260124_create_community_rounds.sql
git commit -m "feat: create community_rounds table with RLS"
```

---

### Task 1.4: Create Round Participants Table Migration

**Files:**
- Create: `supabase/migrations/20260124_create_round_participants.sql`

**Step 1: Create migration file**

```sql
-- Enable vector extension if not exists
CREATE EXTENSION IF NOT EXISTS vector;

-- Create round_participants table
CREATE TABLE round_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES community_rounds(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}',
  embedding VECTOR(1536),
  availability JSONB,
  intake_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(round_id, member_id)
);

-- Indexes
CREATE INDEX idx_round_participants_round_id ON round_participants(round_id);
CREATE INDEX idx_round_participants_member_id ON round_participants(member_id);

-- RLS
ALTER TABLE round_participants ENABLE ROW LEVEL SECURITY;

-- Organization owners can read all participants
CREATE POLICY "Organization owners can read participants"
  ON round_participants FOR SELECT
  USING (
    round_id IN (
      SELECT r.id FROM community_rounds r
      JOIN communities c ON r.community_id = c.id
      JOIN organizations o ON c.organization_id = o.id
      WHERE o.owner_id = auth.uid()
    )
  );

-- Members can manage their own participation
CREATE POLICY "Members can manage own participation"
  ON round_participants FOR ALL
  USING (
    member_id IN (
      SELECT id FROM community_members WHERE email = auth.email()
    )
  );

-- Public can insert (for participation signup)
CREATE POLICY "Public can participate in rounds"
  ON round_participants FOR INSERT
  WITH CHECK (true);
```

**Step 2: Apply migration**

Run: `npx supabase db push`

**Step 3: Commit**

```bash
git add supabase/migrations/20260124_create_round_participants.sql
git commit -m "feat: create round_participants table with vector embedding"
```

---

### Task 1.5: Create Community Matches Table Migration

**Files:**
- Create: `supabase/migrations/20260124_create_community_matches.sql`

**Step 1: Create migration file**

```sql
-- Create community_matches table
CREATE TABLE community_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES community_rounds(id) ON DELETE CASCADE,
  member_a_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  member_b_id UUID NOT NULL REFERENCES community_members(id) ON DELETE CASCADE,
  similarity_score FLOAT,
  common_interests TEXT,
  scheduled_time TIMESTAMPTZ,
  calendar_event_id TEXT,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_community_matches_round_id ON community_matches(round_id);
CREATE INDEX idx_community_matches_member_a ON community_matches(member_a_id);
CREATE INDEX idx_community_matches_member_b ON community_matches(member_b_id);

-- RLS
ALTER TABLE community_matches ENABLE ROW LEVEL SECURITY;

-- Organization owners can manage matches
CREATE POLICY "Organization owners can manage matches"
  ON community_matches FOR ALL
  USING (
    round_id IN (
      SELECT r.id FROM community_rounds r
      JOIN communities c ON r.community_id = c.id
      JOIN organizations o ON c.organization_id = o.id
      WHERE o.owner_id = auth.uid()
    )
  );

-- Members can see their own matches
CREATE POLICY "Members can see own matches"
  ON community_matches FOR SELECT
  USING (
    member_a_id IN (SELECT id FROM community_members WHERE email = auth.email())
    OR
    member_b_id IN (SELECT id FROM community_members WHERE email = auth.email())
  );
```

**Step 2: Apply migration**

Run: `npx supabase db push`

**Step 3: Commit**

```bash
git add supabase/migrations/20260124_create_community_matches.sql
git commit -m "feat: create community_matches table with RLS"
```

---

### Task 1.6: Add TypeScript Types

**Files:**
- Modify: `src/types/database.ts`

**Step 1: Add community types**

Add after the existing types:

```typescript
// Community types
export interface Community {
  id: string
  organization_id: string
  name: string
  description: string | null
  slug: string
  questions: Question[]
  matching_frequency: 'weekly' | 'monthly'
  signup_deadline_day: number
  match_day: number
  created_at: string
}

export interface CommunityMember {
  id: string
  community_id: string
  name: string
  email: string
  phone: string | null
  google_calendar_token: object | null
  status: 'active' | 'paused' | 'removed'
  joined_at: string
}

export interface CommunityRound {
  id: string
  community_id: string
  round_month: string
  signup_deadline: string
  match_date: string
  status: 'open' | 'closed' | 'matching' | 'matched'
  created_at: string
}

export interface RoundParticipant {
  id: string
  round_id: string
  member_id: string
  answers: Record<string, string>
  embedding: number[] | null
  availability: Availability | null
  intake_completed_at: string | null
  created_at: string
}

export interface Availability {
  timezone: string
  slots: AvailabilitySlot[]
}

export interface AvailabilitySlot {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  start: string  // HH:MM format
  end: string    // HH:MM format
}

export interface CommunityMatch {
  id: string
  round_id: string
  member_a_id: string
  member_b_id: string
  similarity_score: number | null
  common_interests: string | null
  scheduled_time: string | null
  calendar_event_id: string | null
  notified_at: string | null
  created_at: string
}
```

**Step 2: Commit**

```bash
git add src/types/database.ts
git commit -m "feat: add TypeScript types for community entities"
```

---

## Phase 2: Public Join Flow

### Task 2.1: Create Community Join Landing Page

**Files:**
- Create: `src/app/join/[slug]/page.tsx`

**Step 1: Create the page**

```tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { JoinForm } from './JoinForm'

export default async function JoinCommunityPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: community, error } = await supabase
    .from('communities')
    .select('id, name, description, questions, organization_id, organizations(name)')
    .eq('slug', slug)
    .single()

  if (error || !community) {
    notFound()
  }

  // Get current/next round
  const { data: currentRound } = await supabase
    .from('community_rounds')
    .select('*')
    .eq('community_id', community.id)
    .eq('status', 'open')
    .order('round_month', { ascending: false })
    .limit(1)
    .single()

  const organization = community.organizations as unknown as { name: string }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Join {community.name}</h1>
          {community.description && (
            <p className="text-gray-400">{community.description}</p>
          )}
          <p className="text-sm text-gray-500 mt-2">by {organization.name}</p>
        </div>

        <JoinForm
          communityId={community.id}
          communitySlug={slug}
          nextRoundDate={currentRound?.signup_deadline}
        />
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/join/[slug]/page.tsx
git commit -m "feat: create community join landing page"
```

---

### Task 2.2: Create Join Form Component

**Files:**
- Create: `src/app/join/[slug]/JoinForm.tsx`

**Step 1: Create the component**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

interface JoinFormProps {
  communityId: string
  communitySlug: string
  nextRoundDate?: string
}

export function JoinForm({ communityId, communitySlug, nextRoundDate }: JoinFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/community/${communitySlug}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone: phone || null }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to join')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="pt-6 text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-xl font-bold mb-2">You're in!</h2>
          <p className="text-gray-400">
            {nextRoundDate
              ? `The next matching round deadline is ${new Date(nextRoundDate).toLocaleDateString()}. We'll email you when it's time to participate.`
              : "We'll email you when the next matching round opens."}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+31 6 12345678"
            />
            <p className="text-xs text-gray-500">For WhatsApp notifications</p>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button
            type="submit"
            className="w-full bg-pink-500 hover:bg-pink-600"
            disabled={loading}
          >
            {loading ? 'Joining...' : 'Join Community'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/join/[slug]/JoinForm.tsx
git commit -m "feat: create community join form component"
```

---

### Task 2.3: Create Join API Route

**Files:**
- Create: `src/app/api/community/[slug]/join/route.ts`

**Step 1: Create the route**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const supabase = await createClient()

  try {
    const { name, email, phone } = await request.json()

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    // Find community by slug
    const { data: community, error: communityError } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', slug)
      .single()

    if (communityError || !community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 })
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('community_members')
      .select('id')
      .eq('community_id', community.id)
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      return NextResponse.json({ error: 'You are already a member of this community' }, { status: 400 })
    }

    // Insert new member
    const { data: member, error: insertError } = await supabase
      .from('community_members')
      .insert({
        community_id: community.id,
        name,
        email: email.toLowerCase(),
        phone,
        status: 'active',
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, memberId: member.id })
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Failed to join community'
    }, { status: 500 })
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/community/[slug]/join/route.ts
git commit -m "feat: create community join API route"
```

---

## Phase 3: Dashboard Community Management

### Task 3.1: Create Communities List Page

**Files:**
- Create: `src/app/dashboard/communities/page.tsx`

**Step 1: Create the page**

```tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Users } from 'lucide-react'

export default async function CommunitiesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get user's organization
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!org) redirect('/dashboard')

  // Get communities with member counts
  const { data: communities } = await supabase
    .from('communities')
    .select(`
      *,
      community_members(count)
    `)
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Communities</h1>
        <Link href="/dashboard/communities/new">
          <Button className="bg-pink-500 hover:bg-pink-600">
            <Plus className="w-4 h-4 mr-2" />
            New Community
          </Button>
        </Link>
      </div>

      {communities && communities.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {communities.map((community) => {
            const memberCount = (community.community_members as unknown as { count: number }[])?.[0]?.count || 0
            return (
              <Link key={community.id} href={`/dashboard/communities/${community.id}`}>
                <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors cursor-pointer">
                  <CardHeader>
                    <CardTitle className="text-white">{community.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-gray-400">
                      <Users className="w-4 h-4 mr-2" />
                      {memberCount} members
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      /{community.slug}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      ) : (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No communities yet</h3>
            <p className="text-gray-400 mb-4">Create your first community to start matching members.</p>
            <Link href="/dashboard/communities/new">
              <Button className="bg-pink-500 hover:bg-pink-600">
                <Plus className="w-4 h-4 mr-2" />
                Create Community
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/dashboard/communities/page.tsx
git commit -m "feat: create communities list dashboard page"
```

---

### Task 3.2: Create New Community Page

**Files:**
- Create: `src/app/dashboard/communities/new/page.tsx`

**Step 1: Create the page**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewCommunityPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user?.id)
      .single()

    if (!org) {
      setError('Organization not found')
      setLoading(false)
      return
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

    const defaultQuestions = [
      { id: '1', field: 'goals', label: 'What are you hoping to get from connecting with others?', order: 0 },
      { id: '2', field: 'expertise', label: 'What expertise or experience can you share?', order: 1 },
      { id: '3', field: 'challenges', label: 'What challenges are you currently facing?', order: 2 },
    ]

    const { data: community, error: createError } = await supabase
      .from('communities')
      .insert({
        organization_id: org.id,
        name,
        description,
        slug,
        questions: defaultQuestions,
      })
      .select()
      .single()

    if (createError) {
      setError(createError.message)
      setLoading(false)
      return
    }

    router.push(`/dashboard/communities/${community.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Create New Community</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Community Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="SaaSiest Leaders Network"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A community for SaaS leaders to connect and share insights"
                rows={3}
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-pink-500 hover:bg-pink-600"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Community'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/dashboard/communities/new/page.tsx
git commit -m "feat: create new community page"
```

---

### Task 3.3: Update Sidebar Navigation

**Files:**
- Modify: `src/components/dashboard/Sidebar.tsx`

**Step 1: Add Communities link to sidebar**

Find the navigation items and add:

```tsx
{
  href: '/dashboard/communities',
  label: 'Communities',
  icon: Users,  // from lucide-react
}
```

**Step 2: Commit**

```bash
git add src/components/dashboard/Sidebar.tsx
git commit -m "feat: add communities link to dashboard sidebar"
```

---

## Phase 4: Round Participation Flow

### Task 4.1: Create Round Participation Page

**Files:**
- Create: `src/app/community/[slug]/round/[month]/page.tsx`

This page allows members to complete intake and submit availability for a round.

**Step 1: Create the page structure**

```tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { RoundIntakeFlow } from './RoundIntakeFlow'

export default async function RoundParticipationPage({
  params,
}: {
  params: Promise<{ slug: string; month: string }>
}) {
  const { slug, month } = await params
  const supabase = await createClient()

  // Fetch community and round
  const { data: community } = await supabase
    .from('communities')
    .select('id, name, questions')
    .eq('slug', slug)
    .single()

  if (!community) notFound()

  const { data: round } = await supabase
    .from('community_rounds')
    .select('*')
    .eq('community_id', community.id)
    .eq('round_month', month)
    .single()

  if (!round || round.status !== 'open') notFound()

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">{community.name}</h1>
        <p className="text-gray-400 mb-8">
          {new Date(month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Matching Round
        </p>

        <RoundIntakeFlow
          communityId={community.id}
          roundId={round.id}
          questions={community.questions}
          deadline={round.signup_deadline}
        />
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/community/[slug]/round/[month]/page.tsx
git commit -m "feat: create round participation page"
```

---

### Task 4.2: Create Availability Picker Component

**Files:**
- Create: `src/components/AvailabilityPicker.tsx`

**Step 1: Create the component**

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Availability, AvailabilitySlot } from '@/types/database'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const
const TIME_SLOTS = [
  { start: '09:00', end: '12:00', label: 'Morning (9am-12pm)' },
  { start: '12:00', end: '14:00', label: 'Lunch (12pm-2pm)' },
  { start: '14:00', end: '17:00', label: 'Afternoon (2pm-5pm)' },
  { start: '17:00', end: '19:00', label: 'Evening (5pm-7pm)' },
]

interface AvailabilityPickerProps {
  value: Availability | null
  onChange: (availability: Availability) => void
}

export function AvailabilityPicker({ value, onChange }: AvailabilityPickerProps) {
  const [timezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggleSlot = (day: string, start: string, end: string) => {
    const key = `${day}-${start}-${end}`
    const newSelected = new Set(selected)

    if (newSelected.has(key)) {
      newSelected.delete(key)
    } else {
      newSelected.add(key)
    }

    setSelected(newSelected)

    // Convert to Availability format
    const slots: AvailabilitySlot[] = Array.from(newSelected).map((key) => {
      const [day, start, end] = key.split('-')
      return { day: day as AvailabilitySlot['day'], start, end }
    })

    onChange({ timezone, slots })
  }

  const isSelected = (day: string, start: string, end: string) => {
    return selected.has(`${day}-${start}-${end}`)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Select times when you're available for a 30-min call (timezone: {timezone})
      </p>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left text-sm font-medium text-gray-400 pb-2"></th>
              {DAYS.map((day) => (
                <th key={day} className="text-center text-sm font-medium text-gray-400 pb-2 capitalize">
                  {day.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((slot) => (
              <tr key={slot.start}>
                <td className="text-sm text-gray-400 pr-4 py-1">{slot.label}</td>
                {DAYS.map((day) => (
                  <td key={day} className="text-center py-1">
                    <button
                      type="button"
                      onClick={() => toggleSlot(day, slot.start, slot.end)}
                      className={`w-8 h-8 rounded ${
                        isSelected(day, slot.start, slot.end)
                          ? 'bg-pink-500 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {isSelected(day, slot.start, slot.end) ? '✓' : ''}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        {selected.size} time slot{selected.size !== 1 ? 's' : ''} selected
      </p>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/AvailabilityPicker.tsx
git commit -m "feat: create availability picker component"
```

---

## Phase 5: Matching and Scheduling (Summary)

The remaining tasks for matching and auto-scheduling are more complex. Here's a summary:

### Task 5.1: Create Matching Job API
- Create: `src/app/api/cron/match-communities/route.ts`
- Uses vector similarity like existing event matching
- Finds overlapping availability between matched pairs

### Task 5.2: Google Calendar OAuth Flow
- Create: `src/app/api/auth/google-calendar/route.ts`
- Store refresh token in `community_members.google_calendar_token`

### Task 5.3: Auto-Schedule Calendar Events
- Create: `src/lib/calendar/schedule.ts`
- Find first overlapping slot
- Create Google Calendar events for both parties

### Task 5.4: Vercel Cron Configuration
- Create: `vercel.json` with cron schedule
- `0 0 1 * *` - Create new rounds
- `0 9 27 * *` - Run matching

### Task 5.5: Notification Emails
- Round open notification
- Deadline reminder (2 days before)
- Match notification with calendar details

---

## Summary

| Phase | Tasks | Estimated Effort |
|-------|-------|-----------------|
| 1. Database Schema | 6 migrations + types | 1 hour |
| 2. Public Join Flow | 3 components/pages | 1 hour |
| 3. Dashboard | 3 pages + sidebar | 1.5 hours |
| 4. Round Participation | 2 components | 1.5 hours |
| 5. Matching & Scheduling | 5 complex tasks | 3-4 hours |

**Total: ~8-10 hours**

This is the largest feature. Consider implementing Phases 1-4 first for a working MVP, then adding Phase 5 (auto-scheduling) as a follow-up.
