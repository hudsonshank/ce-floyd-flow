-- Update subcontracts SELECT policy to allow PMs to view subcontracts for unassigned projects
DROP POLICY IF EXISTS "Users can view subcontracts of accessible projects" ON public.subcontracts;

CREATE POLICY "Users can view subcontracts of accessible projects"
ON public.subcontracts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM projects p
    JOIN profiles pr ON (pr.user_id = auth.uid())
    WHERE p.id = subcontracts.project_id
      AND (
        pr.role = 'admin'::app_role
        OR pr.role = 'exec'::app_role
        OR (pr.role = 'pm'::app_role AND (p.pm_name = pr.email OR p.pm_name IS NULL))
      )
  )
);