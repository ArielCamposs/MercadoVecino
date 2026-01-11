-- Migration to add email column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Index for faster lookup during login specificity check
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- BACKFILL: Sync emails from auth.users to public.profiles for existing users
UPDATE public.profiles
SET email = auth.users.email
FROM auth.users
WHERE public.profiles.id = auth.users.id
AND public.profiles.email IS NULL;
