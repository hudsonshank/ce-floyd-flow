-- Convert status column to text first
ALTER TABLE subcontracts ALTER COLUMN status TYPE text;

-- Drop the old enum type
DROP TYPE IF EXISTS subcontract_status CASCADE;

-- Update any "Executed" status to "Approved" (now that it's text)
UPDATE subcontracts SET status = 'Approved' WHERE status = 'Executed';

-- Create new enum with all Procore commitment statuses
CREATE TYPE subcontract_status AS ENUM (
  'Draft',
  'Out for Bid',
  'Out for Signature',
  'Approved',
  'Complete',
  'Terminated',
  'Void',
  'Processing',
  'Submitted',
  'Partially Received',
  'Received',
  'Closed'
);

-- Convert column back to enum type
ALTER TABLE subcontracts ALTER COLUMN status TYPE subcontract_status USING status::subcontract_status;
ALTER TABLE subcontracts ALTER COLUMN status SET DEFAULT 'Draft';