-- Drop the existing PM policy that might have issues
DROP POLICY IF EXISTS "PMs can view their projects" ON public.projects;

-- Create a clearer PM policy that explicitly allows viewing projects with NULL pm_name
CREATE POLICY "PMs can view their assigned projects or unassigned projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'pm'::app_role
    AND (
      projects.pm_name = profiles.email 
      OR projects.pm_name IS NULL
    )
  )
);