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
