-- Add useful project fields
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state_code text,
ADD COLUMN IF NOT EXISTS zip text,
ADD COLUMN IF NOT EXISTS county text,
ADD COLUMN IF NOT EXISTS completion_date date,
ADD COLUMN IF NOT EXISTS projected_finish_date date,
ADD COLUMN IF NOT EXISTS estimated_value numeric,
ADD COLUMN IF NOT EXISTS total_value numeric,
ADD COLUMN IF NOT EXISTS project_stage text,
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric;

-- Add useful subcontract fields
ALTER TABLE public.subcontracts
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS number text,
ADD COLUMN IF NOT EXISTS executed boolean DEFAULT false;