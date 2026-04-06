
-- Add new columns to profiles table
alter table public.profiles 
add column if not exists full_name text,
add column if not exists avatar_url text;

-- Update RLS policies if necessary (existing ones likely cover update of own profile)
-- "Users can update own profile" policy should automatically allow updating these new columns
-- providing the USING (auth.uid() = id) clause remains true.
