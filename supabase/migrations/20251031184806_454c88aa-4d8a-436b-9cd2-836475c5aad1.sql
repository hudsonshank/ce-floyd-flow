-- Add Procore OAuth token columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN procore_access_token TEXT,
ADD COLUMN procore_refresh_token TEXT;