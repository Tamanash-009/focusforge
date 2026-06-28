create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  code text not null check (char_length(code) between 2 and 24),
  color text not null default '#38d6c9',
  weekly_target_minutes integer not null default 240 check (weekly_target_minutes between 30 and 3000),
  created_at timestamptz not null default now()
);

create table if not exists public.study_tasks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  task_type text not null check (task_type in ('reading', 'assignment', 'practice', 'review', 'exam')),
  status text not null default 'planned' check (status in ('planned', 'active', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  due_date date not null,
  estimate_minutes integer not null check (estimate_minutes between 15 and 240),
  notes text not null default '',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid references public.study_tasks(id) on delete set null,
  title text not null check (char_length(title) between 3 and 140),
  minutes integer not null check (minutes between 1 and 240),
  quality integer not null check (quality between 1 and 5),
  distractions integer not null default 0 check (distractions between 0 and 50),
  completed_at timestamptz not null default now()
);

create table if not exists public.study_notes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 100),
  summary text not null check (char_length(summary) between 8 and 400),
  tags text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.study_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('course_created', 'task_created', 'task_completed', 'focus_completed', 'note_created')),
  task_id text,
  session_id text,
  occurred_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists courses_profile_idx on public.courses(profile_id);
create index if not exists study_tasks_profile_status_due_idx on public.study_tasks(profile_id, status, due_date);
create index if not exists study_tasks_course_idx on public.study_tasks(course_id);
create index if not exists focus_sessions_profile_completed_idx on public.focus_sessions(profile_id, completed_at desc);
create index if not exists study_notes_profile_updated_idx on public.study_notes(profile_id, updated_at desc);
create index if not exists study_events_created_idx on public.study_events(created_at desc);

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.study_tasks enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.study_notes enable row level security;
alter table public.study_events enable row level security;

create policy "profiles own rows" on public.profiles
  for all using (clerk_user_id = auth.jwt() ->> 'sub')
  with check (clerk_user_id = auth.jwt() ->> 'sub');

create policy "courses own rows" on public.courses
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = courses.profile_id and p.clerk_user_id = auth.jwt() ->> 'sub'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = courses.profile_id and p.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

create policy "tasks own rows" on public.study_tasks
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = study_tasks.profile_id and p.clerk_user_id = auth.jwt() ->> 'sub'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = study_tasks.profile_id and p.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

create policy "sessions own rows" on public.focus_sessions
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = focus_sessions.profile_id and p.clerk_user_id = auth.jwt() ->> 'sub'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = focus_sessions.profile_id and p.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

create policy "notes own rows" on public.study_notes
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = study_notes.profile_id and p.clerk_user_id = auth.jwt() ->> 'sub'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = study_notes.profile_id and p.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

create policy "events own rows" on public.study_events
  for all using (
    profile_id is null or exists (
      select 1 from public.profiles p
      where p.id = study_events.profile_id and p.clerk_user_id = auth.jwt() ->> 'sub'
    )
  )
  with check (
    profile_id is null or exists (
      select 1 from public.profiles p
      where p.id = study_events.profile_id and p.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );
