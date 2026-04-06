
-- Create profiles table
create table public.profiles (
  id uuid references auth.users not null primary key,
  username text,
  has_completed_onboarding boolean default false,
  streak integer default 0,
  last_streak_date timestamp with time zone,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create plants table
create table public.plants (
  id text not null, -- using text ID from application (uuid/random string)
  user_id uuid references auth.users not null,
  species_id text not null,
  name text,
  common_name text,
  growth_stage float default 1,
  health float default 1,
  last_watered timestamp with time zone,
  added_at timestamp with time zone,
  position integer,
  was_neglected boolean default false,
  target_growth_stage float default 1,
  primary key (id, user_id)
);

-- Enable RLS
alter table public.plants enable row level security;

-- Plants policies
create policy "Users can view their own plants."
  on plants for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own plants."
  on plants for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own plants."
  on plants for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own plants."
  on plants for delete
  using ( auth.uid() = user_id );
