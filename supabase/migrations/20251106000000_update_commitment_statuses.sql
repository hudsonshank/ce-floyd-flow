-- Add all Procore commitment statuses to the subcontract_status enum
-- This includes statuses for both Purchase Orders and Subcontracts

-- Drop the existing enum and recreate with all Procore statuses
ALTER TABLE subcontracts ALTER COLUMN status TYPE text;
DROP TYPE IF EXISTS subcontract_status CASCADE;

CREATE TYPE subcontract_status AS ENUM (
  -- Subcontract statuses
  'Draft',
  'Out for Bid',
  'Out for Signature',
  'Approved',
  'Complete',
  'Terminated',
  'Void',
  -- Purchase Order statuses
  'Processing',
  'Submitted',
  'Partially Received',
  'Received',
  'Closed'
);

ALTER TABLE subcontracts ALTER COLUMN status TYPE subcontract_status USING status::subcontract_status;
ALTER TABLE subcontracts ALTER COLUMN status SET DEFAULT 'Draft';
