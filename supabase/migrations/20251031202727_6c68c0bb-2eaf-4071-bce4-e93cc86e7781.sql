-- Fix 1: Create user_roles table for secure role management
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, role 
FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Fix 2: Create oauth_tokens table for secure token storage
CREATE TABLE IF NOT EXISTS public.oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  procore_access_token text,
  procore_refresh_token text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on oauth_tokens with NO SELECT policies
ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Migrate tokens from profiles to oauth_tokens
INSERT INTO public.oauth_tokens (user_id, procore_access_token, procore_refresh_token)
SELECT user_id, procore_access_token, procore_refresh_token 
FROM public.profiles
WHERE procore_access_token IS NOT NULL OR procore_refresh_token IS NOT NULL
ON CONFLICT (user_id) DO UPDATE 
SET procore_access_token = EXCLUDED.procore_access_token,
    procore_refresh_token = EXCLUDED.procore_refresh_token,
    updated_at = now();

-- Drop old RLS policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Drop old policies on projects that reference profiles.role directly
DROP POLICY IF EXISTS "Admins can manage all projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can view all projects" ON public.projects;
DROP POLICY IF EXISTS "Execs can view all projects" ON public.projects;
DROP POLICY IF EXISTS "PMs can view their assigned projects or unassigned projects" ON public.projects;

-- Drop old policies on subcontracts
DROP POLICY IF EXISTS "Admins can manage subcontracts" ON public.subcontracts;
DROP POLICY IF EXISTS "Users can view subcontracts of accessible projects" ON public.subcontracts;

-- Drop old policies on attachments
DROP POLICY IF EXISTS "Admins and PMs can manage attachments" ON public.attachments;
DROP POLICY IF EXISTS "Users can view attachments of accessible subcontracts" ON public.attachments;

-- Drop old policies on reminders
DROP POLICY IF EXISTS "Admins and PMs can manage reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can view reminders of accessible subcontracts" ON public.reminders;

-- Create new secure RLS policies using has_role function

-- Profiles policies (no role column access)
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "No direct profile inserts" 
ON public.profiles 
FOR INSERT 
WITH CHECK (false);

-- Projects policies using has_role
CREATE POLICY "Admins can manage all projects" 
ON public.projects 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all projects" 
ON public.projects 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Execs can view all projects" 
ON public.projects 
FOR SELECT 
USING (public.has_role(auth.uid(), 'exec'));

CREATE POLICY "PMs can view their assigned projects or unassigned projects" 
ON public.projects 
FOR SELECT 
USING (
  public.has_role(auth.uid(), 'pm') 
  AND (
    projects.pm_name = (SELECT email FROM profiles WHERE user_id = auth.uid())
    OR projects.pm_name IS NULL
  )
);

-- Subcontracts policies using has_role
CREATE POLICY "Admins can manage subcontracts" 
ON public.subcontracts 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view subcontracts of accessible projects" 
ON public.subcontracts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM projects p
    WHERE p.id = subcontracts.project_id
      AND (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'exec')
        OR (
          public.has_role(auth.uid(), 'pm')
          AND (
            p.pm_name = (SELECT email FROM profiles WHERE user_id = auth.uid())
            OR p.pm_name IS NULL
          )
        )
      )
  )
);

-- Attachments policies using has_role
CREATE POLICY "Admins and PMs can manage attachments" 
ON public.attachments 
FOR ALL 
USING (
  EXISTS (
    SELECT 1
    FROM subcontracts sc
    JOIN projects p ON p.id = sc.project_id
    WHERE sc.id = attachments.subcontract_id
      AND (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'pm')
      )
  )
);

CREATE POLICY "Users can view attachments of accessible subcontracts" 
ON public.attachments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM subcontracts sc
    JOIN projects p ON p.id = sc.project_id
    WHERE sc.id = attachments.subcontract_id
      AND (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'exec')
        OR (
          public.has_role(auth.uid(), 'pm')
          AND (
            p.pm_name = (SELECT email FROM profiles WHERE user_id = auth.uid())
            OR p.pm_name IS NULL
          )
        )
      )
  )
);

-- Reminders policies using has_role
CREATE POLICY "Admins and PMs can manage reminders" 
ON public.reminders 
FOR ALL 
USING (
  EXISTS (
    SELECT 1
    FROM subcontracts sc
    JOIN projects p ON p.id = sc.project_id
    WHERE sc.id = reminders.subcontract_id
      AND (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'pm')
      )
  )
);

CREATE POLICY "Users can view reminders of accessible subcontracts" 
ON public.reminders 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM subcontracts sc
    JOIN projects p ON p.id = sc.project_id
    WHERE sc.id = reminders.subcontract_id
  )
);

-- Remove role and token columns from profiles (after data migration)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS procore_access_token;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS procore_refresh_token;

-- Create trigger for oauth_tokens updated_at
CREATE TRIGGER update_oauth_tokens_updated_at
BEFORE UPDATE ON public.oauth_tokens
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();