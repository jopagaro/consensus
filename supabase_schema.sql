-- ============================================================
-- CONSENSUS — Supabase Schema
-- Run this in your Supabase project → SQL Editor
-- ============================================================

-- 1. Profiles (auto-created when a user signs up)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Public read" on profiles for select using (true);
create policy "Own update" on profiles for update using (auth.uid() = id);

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- 2. Categories
create table categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  emoji text default '🏆',
  status text not null default 'upcoming'
    check (status in ('upcoming', 'submission', 'voting', 'closed')),
  submission_start timestamptz,
  submission_end timestamptz,
  voting_start timestamptz,
  voting_end timestamptz,
  created_at timestamptz default now()
);

alter table categories enable row level security;
create policy "Public read" on categories for select using (true);
-- Only admins insert/update (handled via service role key from your admin panel)


-- 3. Submissions
create table submissions (
  id uuid default gen_random_uuid() primary key,
  category_id uuid references categories on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  photo_url text not null,
  caption text,
  score integer not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now(),
  -- One submission per user per category
  unique(category_id, user_id)
);

alter table submissions enable row level security;
create policy "Read approved" on submissions for select
  using (status = 'approved' or auth.uid() = user_id);
create policy "Own insert" on submissions for insert
  with check (auth.uid() = user_id);


-- 4. Votes
create table votes (
  id uuid default gen_random_uuid() primary key,
  submission_id uuid references submissions on delete cascade not null,
  voter_id uuid references auth.users on delete cascade not null,
  value smallint not null check (value in (1, -1)),
  created_at timestamptz default now(),
  -- One vote per user per submission
  unique(submission_id, voter_id)
);

alter table votes enable row level security;
create policy "Own insert" on votes for insert
  with check (auth.uid() = voter_id);
create policy "Own read" on votes for select
  using (auth.uid() = voter_id);


-- 5. Score update function (called from app after each vote)
create or replace function update_submission_score(
  p_submission_id uuid,
  p_delta integer
) returns void language plpgsql security definer as $$
begin
  update submissions
  set score = score + p_delta
  where id = p_submission_id;
end;
$$;


-- 6. Storage bucket for photos
-- Run in Supabase Dashboard → Storage → New Bucket
-- Name: photos | Public: true
-- (Or uncomment below if using SQL migration)
-- insert into storage.buckets (id, name, public) values ('photos', 'photos', true);


-- ============================================================
-- SEED: Starter categories (edit dates as needed)
-- ============================================================
insert into categories (name, description, emoji, status, submission_start, submission_end, voting_start, voting_end)
values
  (
    'Cutest Dog',
    'Submit a photo of your dog. The world will vote for the cutest.',
    '🐶',
    'submission',
    now(),
    now() + interval '4 days',
    now() + interval '4 days',
    now() + interval '18 days'
  ),
  (
    'Best Sunset',
    'Your best golden hour shot. One photo, no heavy edits.',
    '🌅',
    'submission',
    now(),
    now() + interval '4 days',
    now() + interval '4 days',
    now() + interval '18 days'
  ),
  (
    'Funniest Pet',
    'Cats, dogs, birds — whatever makes you laugh. Submit your best.',
    '😂',
    'upcoming',
    now() + interval '5 days',
    now() + interval '9 days',
    now() + interval '9 days',
    now() + interval '23 days'
  );
