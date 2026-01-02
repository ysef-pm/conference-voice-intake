# Admin Dashboard & Matchys.ai Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the voice intake MVP into a full admin dashboard with CSV import, voice/chat modes, AI matching, and analytics.

**Architecture:** Next.js App Router with Supabase (auth, PostgreSQL + pgvector, storage). Organizers authenticate and manage events via dashboard. Attendees access intake via unique token URLs. OpenAI handles chat mode and embeddings. Resend sends emails.

**Tech Stack:** Next.js 14, Supabase (auth + DB + storage), OpenAI (chat + embeddings), ElevenLabs (voice), Resend (email), TailwindCSS, shadcn/ui

---

## Phase 1: Supabase Setup & Database Schema

### Task 1.1: Initialize Supabase Project

**Files:**
- Create: `.env.local` (add Supabase keys)
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`

**Step 1: Install Supabase packages**

Run:
```bash
npm install @supabase/supabase-js @supabase/ssr
```
Expected: Packages added to package.json

**Step 2: Create Supabase client utilities**

Create `src/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Create `src/lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component
          }
        },
      },
    }
  )
}
```

**Step 3: Update .env.local with Supabase keys**

Add to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
```

**Step 4: Verify build still works**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Supabase client setup"
```

---

### Task 1.2: Create Database Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

**Step 1: Create migration file with full schema**

Create `supabase/migrations/001_initial_schema.sql`:
```sql
-- Enable pgvector extension
create extension if not exists vector;

-- Organizations table
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamp with time zone default now()
);

-- Events table
create table events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  slug text unique not null,
  questions jsonb default '[]'::jsonb,
  email_template jsonb default '{}'::jsonb,
  branding jsonb default '{}'::jsonb,
  status text default 'draft' check (status in ('draft', 'active', 'completed')),
  created_at timestamp with time zone default now()
);

-- Attendees table
create table attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade not null,
  email text not null,
  name text,
  phone text,
  token uuid unique default gen_random_uuid(),
  status text default 'imported' check (status in ('imported', 'contacted', 'scheduled', 'clicked', 'in_progress', 'completed', 'matched')),
  scheduled_at timestamp with time zone,
  contacted_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Responses table
create table responses (
  id uuid primary key default gen_random_uuid(),
  attendee_id uuid references attendees(id) on delete cascade not null unique,
  answers jsonb default '{}'::jsonb,
  embedding vector(1536),
  topics jsonb default '[]'::jsonb,
  mode text check (mode in ('voice', 'chat')),
  transcript text,
  created_at timestamp with time zone default now()
);

-- Matches table
create table matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade not null,
  attendee_a_id uuid references attendees(id) on delete cascade not null,
  attendee_b_id uuid references attendees(id) on delete cascade not null,
  similarity_score float,
  common_interests text,
  status text default 'pending' check (status in ('pending', 'a_consented', 'b_consented', 'introduced')),
  introduced_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Indexes
create index idx_attendees_event on attendees(event_id);
create index idx_attendees_token on attendees(token);
create index idx_attendees_status on attendees(status);
create index idx_responses_attendee on responses(attendee_id);
create index idx_matches_event on matches(event_id);

-- Row Level Security
alter table organizations enable row level security;
alter table events enable row level security;
alter table attendees enable row level security;
alter table responses enable row level security;
alter table matches enable row level security;

-- RLS Policies for organizations
create policy "Users can view own organizations"
  on organizations for select
  using (owner_id = auth.uid());

create policy "Users can create organizations"
  on organizations for insert
  with check (owner_id = auth.uid());

-- RLS Policies for events
create policy "Users can view own events"
  on events for select
  using (organization_id in (
    select id from organizations where owner_id = auth.uid()
  ));

create policy "Users can create events in own orgs"
  on events for insert
  with check (organization_id in (
    select id from organizations where owner_id = auth.uid()
  ));

create policy "Users can update own events"
  on events for update
  using (organization_id in (
    select id from organizations where owner_id = auth.uid()
  ));

-- RLS Policies for attendees (org owners + public token access)
create policy "Org owners can view attendees"
  on attendees for select
  using (event_id in (
    select e.id from events e
    join organizations o on e.organization_id = o.id
    where o.owner_id = auth.uid()
  ));

create policy "Public can view attendee by token"
  on attendees for select
  using (true);

create policy "Org owners can insert attendees"
  on attendees for insert
  with check (event_id in (
    select e.id from events e
    join organizations o on e.organization_id = o.id
    where o.owner_id = auth.uid()
  ));

create policy "Anyone can update attendee status"
  on attendees for update
  using (true);

-- RLS Policies for responses
create policy "Org owners can view responses"
  on responses for select
  using (attendee_id in (
    select a.id from attendees a
    join events e on a.event_id = e.id
    join organizations o on e.organization_id = o.id
    where o.owner_id = auth.uid()
  ));

create policy "Anyone can insert responses"
  on responses for insert
  with check (true);

-- RLS Policies for matches
create policy "Org owners can view matches"
  on matches for select
  using (event_id in (
    select e.id from events e
    join organizations o on e.organization_id = o.id
    where o.owner_id = auth.uid()
  ));

create policy "Org owners can manage matches"
  on matches for all
  using (event_id in (
    select e.id from events e
    join organizations o on e.organization_id = o.id
    where o.owner_id = auth.uid()
  ));
```

**Step 2: Apply migration in Supabase Dashboard**

Go to Supabase Dashboard > SQL Editor > Paste and run the migration

**Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: add database schema with RLS policies"
```

---

### Task 1.3: Create TypeScript Types

**Files:**
- Create: `src/types/database.ts`

**Step 1: Create database types**

Create `src/types/database.ts`:
```typescript
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
```

**Step 2: Update existing types index**

Update `src/types/index.ts`:
```typescript
export * from './database'

export interface Question {
  index: number
  field: string
  label: string
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/types/
git commit -m "feat: add TypeScript types for database schema"
```

---

## Phase 2: Authentication & Dashboard Layout

### Task 2.1: Set Up Supabase Auth

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/signup/page.tsx`
- Create: `src/app/auth/callback/route.ts`
- Create: `src/middleware.ts`

**Step 1: Install shadcn/ui**

Run:
```bash
npx shadcn@latest init -d
npx shadcn@latest add button input label card
```

**Step 2: Create auth callback route**

Create `src/app/auth/callback/route.ts`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
```

**Step 3: Create login page**

Create `src/app/(auth)/login/page.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign In</CardTitle>
          <CardDescription>Enter your credentials to access the dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-pink-500 hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 4: Create signup page**

Create `src/app/(auth)/signup/page.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Create user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (authData.user) {
      // Create organization
      const { error: orgError } = await supabase
        .from('organizations')
        .insert({ name: orgName, owner_id: authData.user.id })

      if (orgError) {
        setError(orgError.message)
        setLoading(false)
        return
      }

      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Account</CardTitle>
          <CardDescription>Sign up to start managing your events</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input
                id="orgName"
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme Events"
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
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-pink-500 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 5: Create middleware for auth protection**

Create `src/middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect logged in users away from auth pages
  if ((request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
}
```

**Step 6: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Supabase auth with login/signup pages"
```

---

### Task 2.2: Create Dashboard Layout

**Files:**
- Create: `src/app/dashboard/layout.tsx`
- Create: `src/app/dashboard/page.tsx`
- Create: `src/components/dashboard/Sidebar.tsx`
- Create: `src/components/dashboard/Header.tsx`

**Step 1: Create Sidebar component**

Create `src/components/dashboard/Sidebar.tsx`:
```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  Users,
  MessageSquare,
  Link2,
  BarChart3,
  Settings
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/events', label: 'Events', icon: Calendar },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 min-h-screen p-4">
      <div className="flex items-center gap-2 mb-8 px-2">
        <div className="w-8 h-8 rounded-lg bg-pink-500 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-white">Matchys.ai</span>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-pink-500/10 text-pink-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
```

**Step 2: Create Header component**

Create `src/components/dashboard/Header.tsx`:
```typescript
'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export function Header() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-16 border-b border-gray-800 bg-gray-900 flex items-center justify-between px-6">
      <h1 className="text-lg font-semibold text-white">Dashboard</h1>
      <Button variant="ghost" size="sm" onClick={handleLogout}>
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </header>
  )
}
```

**Step 3: Create dashboard layout**

Create `src/app/dashboard/layout.tsx`:
```typescript
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Header } from '@/components/dashboard/Header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

**Step 4: Create dashboard home page**

Create `src/app/dashboard/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, MessageSquare, Link2, Mail } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get user's organization
  const { data: { user } } = await supabase.auth.getUser()
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', user?.id)
    .single()

  // Get events count
  const { count: eventsCount } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', org?.id)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">
          Welcome back{org?.name ? `, ${org.name}` : ''}
        </h2>
        <p className="text-gray-400">Here&apos;s an overview of your events</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total Events
            </CardTitle>
            <Users className="w-4 h-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{eventsCount || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              AI Conversations
            </CardTitle>
            <MessageSquare className="w-4 h-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">0</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Matches Made
            </CardTitle>
            <Link2 className="w-4 h-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">0</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Intros Sent
            </CardTitle>
            <Mail className="w-4 h-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">0</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <a
            href="/dashboard/events/new"
            className="flex-1 p-4 rounded-lg border border-gray-700 hover:border-pink-500 transition-colors"
          >
            <h3 className="font-medium text-white">Create Event</h3>
            <p className="text-sm text-gray-400">Set up a new conference</p>
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 5: Install lucide-react**

Run: `npm install lucide-react`

**Step 6: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add dashboard layout with sidebar and stats cards"
```

---

## Phase 3: Event Management

### Task 3.1: Create Event List Page

**Files:**
- Create: `src/app/dashboard/events/page.tsx`
- Create: `src/app/dashboard/events/new/page.tsx`

**Step 1: Create events list page**

Create `src/app/dashboard/events/page.tsx`:
```typescript
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Calendar } from 'lucide-react'

export default async function EventsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', user?.id)
    .single()

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('organization_id', org?.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Events</h2>
          <p className="text-gray-400">Manage your conferences and events</p>
        </div>
        <Link href="/dashboard/events/new">
          <Button className="bg-pink-500 hover:bg-pink-600">
            <Plus className="w-4 h-4 mr-2" />
            Create Event
          </Button>
        </Link>
      </div>

      {events && events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <Link key={event.id} href={`/dashboard/events/${event.id}`}>
              <Card className="bg-gray-900 border-gray-800 hover:border-pink-500 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-pink-500" />
                    {event.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      event.status === 'active'
                        ? 'bg-green-500/10 text-green-500'
                        : event.status === 'completed'
                        ? 'bg-gray-500/10 text-gray-500'
                        : 'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {event.status}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="w-12 h-12 text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No events yet</h3>
            <p className="text-gray-400 mb-4">Create your first event to get started</p>
            <Link href="/dashboard/events/new">
              <Button className="bg-pink-500 hover:bg-pink-600">
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

**Step 2: Create new event page**

Create `src/app/dashboard/events/new/page.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function NewEventPage() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Get user's organization
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

    // Create slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

    // Default questions
    const defaultQuestions = [
      { id: '1', field: 'whyJoining', label: 'Why are you joining this conference?', order: 0 },
      { id: '2', field: 'aboutYourself', label: 'Tell us about yourself and what you do', order: 1 },
      { id: '3', field: 'challenges', label: 'What challenges would you like to discuss?', order: 2 },
    ]

    const { data: event, error: createError } = await supabase
      .from('events')
      .insert({
        organization_id: org.id,
        name,
        slug,
        questions: defaultQuestions,
        status: 'draft',
      })
      .select()
      .single()

    if (createError) {
      setError(createError.message)
      setLoading(false)
      return
    }

    router.push(`/dashboard/events/${event.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Create New Event</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Event Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="SaaSiest 2026"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-pink-500 hover:bg-pink-600"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Event'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add event list and create event pages"
```

---

### Task 3.2: Create Event Detail Page with Tabs

**Files:**
- Create: `src/app/dashboard/events/[id]/page.tsx`
- Create: `src/app/dashboard/events/[id]/layout.tsx`
- Create: `src/components/dashboard/EventTabs.tsx`

**Step 1: Install tabs component**

Run: `npx shadcn@latest add tabs`

**Step 2: Create EventTabs component**

Create `src/components/dashboard/EventTabs.tsx`:
```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface EventTabsProps {
  eventId: string
}

const tabs = [
  { href: '', label: 'Overview' },
  { href: '/attendees', label: 'Attendees' },
  { href: '/questions', label: 'Questions' },
  { href: '/conversations', label: 'Conversations' },
  { href: '/matches', label: 'Matches' },
  { href: '/analytics', label: 'Analytics' },
]

export function EventTabs({ eventId }: EventTabsProps) {
  const pathname = usePathname()
  const basePath = `/dashboard/events/${eventId}`

  return (
    <div className="border-b border-gray-800">
      <nav className="flex gap-4">
        {tabs.map((tab) => {
          const href = `${basePath}${tab.href}`
          const isActive = pathname === href ||
            (tab.href === '' && pathname === basePath)

          return (
            <Link
              key={tab.href}
              href={href}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-pink-500 text-pink-500'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
```

**Step 3: Create event layout**

Create `src/app/dashboard/events/[id]/layout.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { EventTabs } from '@/components/dashboard/EventTabs'

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (!event) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">{event.name}</h2>
        <p className="text-gray-400">Manage your event</p>
      </div>
      <EventTabs eventId={id} />
      {children}
    </div>
  )
}
```

**Step 4: Create event overview page**

Create `src/app/dashboard/events/[id]/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, MessageSquare, Link2, Mail } from 'lucide-react'

export default async function EventOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Get attendee stats
  const { data: attendees } = await supabase
    .from('attendees')
    .select('status')
    .eq('event_id', id)

  const stats = {
    total: attendees?.length || 0,
    imported: attendees?.filter(a => a.status === 'imported').length || 0,
    contacted: attendees?.filter(a => a.status === 'contacted').length || 0,
    scheduled: attendees?.filter(a => a.status === 'scheduled').length || 0,
    completed: attendees?.filter(a => a.status === 'completed').length || 0,
    matched: attendees?.filter(a => a.status === 'matched').length || 0,
  }

  // Get matches count
  const { count: matchesCount } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', id)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total Attendees
            </CardTitle>
            <Users className="w-4 h-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Completed
            </CardTitle>
            <MessageSquare className="w-4 h-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.completed}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Matches Made
            </CardTitle>
            <Link2 className="w-4 h-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{matchesCount || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Response Rate
            </CardTitle>
            <Mail className="w-4 h-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats.total > 0
                ? `${Math.round((stats.completed / stats.total) * 100)}%`
                : '0%'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline funnel */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Pipeline Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {[
              { label: 'Imported', value: stats.imported, color: 'bg-gray-500' },
              { label: 'Contacted', value: stats.contacted, color: 'bg-blue-500' },
              { label: 'Scheduled', value: stats.scheduled, color: 'bg-yellow-500' },
              { label: 'Completed', value: stats.completed, color: 'bg-green-500' },
              { label: 'Matched', value: stats.matched, color: 'bg-pink-500' },
            ].map((stage, i) => (
              <div key={stage.label} className="flex flex-col items-center">
                <div className={`w-16 h-16 rounded-full ${stage.color} flex items-center justify-center text-white font-bold text-lg`}>
                  {stage.value}
                </div>
                <span className="mt-2 text-sm text-gray-400">{stage.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add event detail page with tabs and pipeline overview"
```

---

## Phase 4: CSV Import & Attendee Management

### Task 4.1: Create Attendees Page with CSV Upload

**Files:**
- Create: `src/app/dashboard/events/[id]/attendees/page.tsx`
- Create: `src/app/api/events/[id]/import-csv/route.ts`
- Create: `src/components/dashboard/CSVUpload.tsx`
- Create: `src/components/dashboard/AttendeeTable.tsx`

**Step 1: Install table component**

Run: `npx shadcn@latest add table badge`

**Step 2: Create CSV upload component**

Create `src/components/dashboard/CSVUpload.tsx`:
```typescript
'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, FileSpreadsheet } from 'lucide-react'

interface CSVUploadProps {
  eventId: string
  onUploadComplete: () => void
}

export function CSVUpload({ eventId, onUploadComplete }: CSVUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`/api/events/${eventId}/import-csv`, {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      onUploadComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
      <FileSpreadsheet className="w-12 h-12 text-gray-600 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-white mb-2">Import Attendees</h3>
      <p className="text-sm text-gray-400 mb-4">
        Upload a CSV file with columns: email, name (optional), phone (optional)
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
        id="csv-upload"
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="bg-pink-500 hover:bg-pink-600"
      >
        <Upload className="w-4 h-4 mr-2" />
        {uploading ? 'Uploading...' : 'Upload CSV'}
      </Button>
      {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}
    </div>
  )
}
```

**Step 3: Create attendee table component**

Create `src/components/dashboard/AttendeeTable.tsx`:
```typescript
'use client'

import { Attendee } from '@/types/database'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface AttendeeTableProps {
  attendees: Attendee[]
}

const statusColors: Record<string, string> = {
  imported: 'bg-gray-500',
  contacted: 'bg-blue-500',
  scheduled: 'bg-yellow-500',
  clicked: 'bg-purple-500',
  in_progress: 'bg-orange-500',
  completed: 'bg-green-500',
  matched: 'bg-pink-500',
}

export function AttendeeTable({ attendees }: AttendeeTableProps) {
  return (
    <div className="rounded-lg border border-gray-800 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-800 hover:bg-gray-900">
            <TableHead className="text-gray-400">Name</TableHead>
            <TableHead className="text-gray-400">Email</TableHead>
            <TableHead className="text-gray-400">Status</TableHead>
            <TableHead className="text-gray-400">Scheduled</TableHead>
            <TableHead className="text-gray-400">Completed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attendees.map((attendee) => (
            <TableRow key={attendee.id} className="border-gray-800 hover:bg-gray-900">
              <TableCell className="text-white">
                {attendee.name || '-'}
              </TableCell>
              <TableCell className="text-gray-400">
                {attendee.email}
              </TableCell>
              <TableCell>
                <Badge className={`${statusColors[attendee.status]} text-white`}>
                  {attendee.status}
                </Badge>
              </TableCell>
              <TableCell className="text-gray-400">
                {attendee.scheduled_at
                  ? new Date(attendee.scheduled_at).toLocaleDateString()
                  : '-'}
              </TableCell>
              <TableCell className="text-gray-400">
                {attendee.completed_at
                  ? new Date(attendee.completed_at).toLocaleDateString()
                  : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

**Step 4: Create CSV import API route**

Create `src/app/api/events/[id]/import-csv/route.ts`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params
  const supabase = await createClient()

  try {
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

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().toLowerCase())
    const emailIndex = header.indexOf('email')
    const nameIndex = header.indexOf('name')
    const phoneIndex = header.indexOf('phone')

    if (emailIndex === -1) {
      return NextResponse.json({ error: 'CSV must have an email column' }, { status: 400 })
    }

    // Parse rows
    const attendees = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const email = values[emailIndex]

      if (!email || !email.includes('@')) continue

      attendees.push({
        event_id: eventId,
        email,
        name: nameIndex !== -1 ? values[nameIndex] || null : null,
        phone: phoneIndex !== -1 ? values[phoneIndex] || null : null,
        status: 'imported',
      })
    }

    if (attendees.length === 0) {
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
      message: `Imported ${data.length} attendees`
    })
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Import failed'
    }, { status: 500 })
  }
}
```

**Step 5: Create attendees page**

Create `src/app/dashboard/events/[id]/attendees/page.tsx`:
```typescript
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Attendee } from '@/types/database'
import { CSVUpload } from '@/components/dashboard/CSVUpload'
import { AttendeeTable } from '@/components/dashboard/AttendeeTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AttendeesPage() {
  const params = useParams()
  const eventId = params.id as string
  const [attendees, setAttendees] = useState<Attendee[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchAttendees = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('attendees')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    setAttendees(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchAttendees()
  }, [eventId])

  return (
    <div className="space-y-6">
      <CSVUpload eventId={eventId} onUploadComplete={fetchAttendees} />

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">
            Attendees ({attendees.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-400">Loading...</p>
          ) : attendees.length > 0 ? (
            <AttendeeTable attendees={attendees} />
          ) : (
            <p className="text-gray-400">No attendees yet. Import a CSV to get started.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 6: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add CSV import and attendee management"
```

---

## Phase 5: Attendee Intake (Voice/Chat Choice)

### Task 5.1: Create Intake Landing Page

**Files:**
- Create: `src/app/intake/[token]/page.tsx`
- Create: `src/app/intake/[token]/voice/page.tsx`
- Create: `src/app/intake/[token]/chat/page.tsx`

**Step 1: Create intake landing page with voice/chat choice**

Create `src/app/intake/[token]/page.tsx`:
```typescript
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Mic, MessageSquare } from 'lucide-react'

export default async function IntakeLandingPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  // Fetch attendee by token
  const { data: attendee } = await supabase
    .from('attendees')
    .select('*, events(*)')
    .eq('token', token)
    .single()

  if (!attendee) {
    notFound()
  }

  // Update status to clicked if imported/contacted
  if (['imported', 'contacted', 'scheduled'].includes(attendee.status)) {
    await supabase
      .from('attendees')
      .update({ status: 'clicked' })
      .eq('id', attendee.id)
  }

  const event = attendee.events as { name: string; branding: { primary_color?: string } }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        <div className="w-20 h-20 rounded-2xl bg-pink-500 flex items-center justify-center mx-auto mb-8">
          <MessageSquare className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-4">
          Hi{attendee.name ? `, ${attendee.name}` : ''}!
        </h1>

        <p className="text-gray-400 mb-2">
          Welcome to {event.name}
        </p>

        <p className="text-gray-500 text-sm mb-8">
          We&apos;d love to learn about you to help connect you with the right people.
          Choose how you&apos;d like to share:
        </p>

        <div className="grid grid-cols-2 gap-4">
          <Link
            href={`/intake/${token}/voice`}
            className="p-6 rounded-xl border-2 border-gray-800 hover:border-pink-500 transition-all group"
          >
            <Mic className="w-12 h-12 text-pink-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-semibold text-white mb-2">Talk to me</h3>
            <p className="text-sm text-gray-400">Have a voice conversation</p>
            <p className="text-xs text-gray-500 mt-2">~3 minutes</p>
          </Link>

          <Link
            href={`/intake/${token}/chat`}
            className="p-6 rounded-xl border-2 border-gray-800 hover:border-pink-500 transition-all group"
          >
            <MessageSquare className="w-12 h-12 text-pink-500 mx-auto mb-4 group-hover:scale-110 transition-transform" />
            <h3 className="text-lg font-semibold text-white mb-2">Type instead</h3>
            <p className="text-sm text-gray-400">Chat at your own pace</p>
            <p className="text-xs text-gray-500 mt-2">~3 minutes</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Create voice intake page (reuse existing conversation)**

Create `src/app/intake/[token]/voice/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Conversation } from '@/components/Conversation'

export default async function VoiceIntakePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  const { data: attendee } = await supabase
    .from('attendees')
    .select('*, events(*)')
    .eq('token', token)
    .single()

  if (!attendee) {
    notFound()
  }

  // Check if already completed
  if (attendee.status === 'completed' || attendee.status === 'matched') {
    redirect(`/intake/${token}/complete`)
  }

  // Update status to in_progress
  await supabase
    .from('attendees')
    .update({ status: 'in_progress' })
    .eq('id', attendee.id)

  const event = attendee.events as { name: string; questions: Array<{ field: string; label: string }> }

  return (
    <div className="min-h-screen bg-gray-950">
      <Conversation
        attendeeId={attendee.id}
        token={token}
        eventName={event.name}
        questions={event.questions}
        mode="voice"
      />
    </div>
  )
}
```

**Step 3: Create chat intake page**

Create `src/app/intake/[token]/chat/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { ChatConversation } from '@/components/ChatConversation'

export default async function ChatIntakePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  const { data: attendee } = await supabase
    .from('attendees')
    .select('*, events(*)')
    .eq('token', token)
    .single()

  if (!attendee) {
    notFound()
  }

  // Check if already completed
  if (attendee.status === 'completed' || attendee.status === 'matched') {
    redirect(`/intake/${token}/complete`)
  }

  // Update status to in_progress
  await supabase
    .from('attendees')
    .update({ status: 'in_progress' })
    .eq('id', attendee.id)

  const event = attendee.events as { name: string; questions: Array<{ field: string; label: string }> }

  return (
    <div className="min-h-screen bg-gray-950">
      <ChatConversation
        attendeeId={attendee.id}
        token={token}
        eventName={event.name}
        attendeeName={attendee.name}
        questions={event.questions}
      />
    </div>
  )
}
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Build may fail due to missing ChatConversation - that's expected, we'll create it next

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add intake landing page with voice/chat choice"
```

---

### Task 5.2: Create Chat Conversation Component

**Files:**
- Create: `src/components/ChatConversation.tsx`
- Create: `src/app/api/chat/route.ts`

**Step 1: Create chat API route with streaming**

Create `src/app/api/chat/route.ts`:
```typescript
import OpenAI from 'openai'
import { NextResponse } from 'next/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  const { messages, eventName, attendeeName, questions } = await request.json()

  const systemPrompt = `You are a friendly AI assistant helping gather information from attendees for ${eventName}.
Your goal is to have a natural conversation and learn about the attendee.

${attendeeName ? `The attendee's name is ${attendeeName}.` : ''}

You need to gather answers to these questions through natural conversation:
${questions.map((q: { label: string }, i: number) => `${i + 1}. ${q.label}`).join('\n')}

Guidelines:
- Be warm, friendly, and conversational
- Ask one question at a time
- If an answer is too brief, ask a follow-up to get more detail
- Once you have good answers to all questions, summarize what you learned and ask if they want to make any changes
- Keep responses concise (2-3 sentences max)
- When all questions are answered, end with: [COMPLETE]`

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    stream: true,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || ''
        controller.enqueue(encoder.encode(text))
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
```

**Step 2: Create ChatConversation component**

Create `src/components/ChatConversation.tsx`:
```typescript
'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, Loader2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatConversationProps {
  attendeeId: string
  token: string
  eventName: string
  attendeeName: string | null
  questions: Array<{ field: string; label: string }>
}

export function ChatConversation({
  attendeeId,
  token,
  eventName,
  attendeeName,
  questions,
}: ChatConversationProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Start conversation with greeting
  useEffect(() => {
    const startConversation = async () => {
      setIsLoading(true)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [],
          eventName,
          attendeeName,
          questions,
        }),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        assistantMessage += decoder.decode(value)
        setMessages([{ role: 'assistant', content: assistantMessage }])
      }

      setIsLoading(false)
    }

    startConversation()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: input }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: newMessages,
        eventName,
        attendeeName,
        questions,
      }),
    })

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let assistantMessage = ''

    while (reader) {
      const { done, value } = await reader.read()
      if (done) break
      assistantMessage += decoder.decode(value)
      setMessages([...newMessages, { role: 'assistant', content: assistantMessage }])
    }

    // Check if conversation is complete
    if (assistantMessage.includes('[COMPLETE]')) {
      setIsComplete(true)
      // Save responses and redirect
      await fetch('/api/submit-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendeeId,
          transcript: [...newMessages, { role: 'assistant', content: assistantMessage }],
        }),
      })
    }

    setIsLoading(false)
  }

  const handleComplete = () => {
    router.push(`/intake/${token}/complete`)
  }

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      <div className="text-center mb-4">
        <h1 className="text-xl font-semibold text-white">{eventName}</h1>
        <p className="text-sm text-gray-400">Chat with our AI assistant</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message, i) => (
          <div
            key={i}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-pink-500 text-white'
                  : 'bg-gray-800 text-gray-100'
              }`}
            >
              {message.content.replace('[COMPLETE]', '')}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl px-4 py-3">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {isComplete ? (
        <Button
          onClick={handleComplete}
          className="w-full bg-pink-500 hover:bg-pink-600"
        >
          Continue
        </Button>
      ) : (
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
            disabled={isLoading}
            className="bg-gray-800 border-gray-700"
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-pink-500 hover:bg-pink-600"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
```

**Step 3: Create submit-chat API route**

Create `src/app/api/submit-chat/route.ts`:
```typescript
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { NextResponse } from 'next/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  const { attendeeId, transcript } = await request.json()
  const supabase = await createClient()

  // Get attendee and event questions
  const { data: attendee } = await supabase
    .from('attendees')
    .select('*, events(*)')
    .eq('id', attendeeId)
    .single()

  if (!attendee) {
    return NextResponse.json({ error: 'Attendee not found' }, { status: 404 })
  }

  const event = attendee.events as { questions: Array<{ field: string; label: string }> }
  const transcriptText = transcript.map((m: { role: string; content: string }) =>
    `${m.role}: ${m.content}`
  ).join('\n')

  // Extract answers using GPT
  const extractionPrompt = `Extract the answers from this conversation transcript.

Questions to extract:
${event.questions.map((q: { field: string; label: string }) => `- ${q.field}: ${q.label}`).join('\n')}

Transcript:
${transcriptText}

Return a JSON object with the field names as keys and the extracted answers as values.
Only return the JSON, no other text.`

  const extraction = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: extractionPrompt }],
    response_format: { type: 'json_object' },
  })

  const answers = JSON.parse(extraction.choices[0].message.content || '{}')

  // Generate embedding
  const answerText = Object.values(answers).join(' ')
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: answerText,
  })
  const embedding = embeddingResponse.data[0].embedding

  // Extract topics
  const topicsPrompt = `Extract 3-5 topic tags from this text. Return as JSON array of strings.
Text: ${answerText}`

  const topicsResponse = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: topicsPrompt }],
    response_format: { type: 'json_object' },
  })

  const topicsData = JSON.parse(topicsResponse.choices[0].message.content || '{"topics":[]}')
  const topics = topicsData.topics || []

  // Save response
  const { error: responseError } = await supabase
    .from('responses')
    .upsert({
      attendee_id: attendeeId,
      answers,
      embedding,
      topics,
      mode: 'chat',
      transcript: transcriptText,
    })

  if (responseError) {
    return NextResponse.json({ error: responseError.message }, { status: 500 })
  }

  // Update attendee status
  await supabase
    .from('attendees')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', attendeeId)

  return NextResponse.json({ success: true })
}
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add chat conversation mode with streaming and answer extraction"
```

---

## Phase 6: Remaining Features (Summary)

The remaining tasks follow the same pattern. Here's the outline:

### Task 6.1: Schedule for Later Feature
- Create `/schedule/[token]` page with date/time picker
- Generate ICS file download
- Update attendee.scheduled_at

### Task 6.2: Email System with Resend
- Install Resend: `npm install resend`
- Create `/api/events/[id]/send-emails` route
- Create email templates
- Add "Send Emails" button to attendees page

### Task 6.3: Matching Algorithm
- Create `/api/events/[id]/generate-matches` route
- Implement pgvector similarity query
- Create matches page UI

### Task 6.4: Analytics & Trending Topics
- Create analytics page with topic aggregation
- Add word cloud visualization
- Export functionality

### Task 6.5: Completion Page & Consent
- Create `/intake/[token]/complete` page
- Add matching consent checkbox
- Update attendee preferences

---

## Execution Note

This plan covers the core functionality. Each remaining task (6.1-6.5) should be broken down into the same step-by-step format when implementing.

**Recommended order:**
1. Phase 1-5 first (core flow)
2. Task 6.5 (completion page)
3. Task 6.2 (email system)
4. Task 6.1 (scheduling)
5. Task 6.3 (matching)
6. Task 6.4 (analytics)
