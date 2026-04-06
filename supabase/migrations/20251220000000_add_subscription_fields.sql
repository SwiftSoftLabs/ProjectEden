-- Add subscription and background fields to profiles
alter table public.profiles
add column if not exists subscription_tier text default 'free',
add column if not exists selected_background text default 'greenhouse';

-- Ensure RLS allows users to update these fields (covered by existing policy, but good to note)
-- "Users can update own profile" using (auth.uid() = id) works for all columns.
