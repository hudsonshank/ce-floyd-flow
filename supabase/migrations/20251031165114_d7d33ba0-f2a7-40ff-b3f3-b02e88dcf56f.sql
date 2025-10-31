-- Add from_email column to reminders table to track sender
ALTER TABLE public.reminders
ADD COLUMN from_email text;

-- Add comment for clarity
COMMENT ON COLUMN public.reminders.from_email IS 'Email address of the user sending the reminder';
