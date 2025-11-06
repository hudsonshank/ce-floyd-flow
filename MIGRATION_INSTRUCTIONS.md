# Database Migration Instructions

## Issue
The database currently only supports 3 commitment statuses: 'Draft', 'Out for Signature', and 'Executed'. However, Procore has many more statuses that need to be captured.

## Solution
Run the migration SQL to update the `subcontract_status` enum to include all Procore commitment statuses.

## Steps to Apply Migration

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard/project/hdrkajhfpqkvnhuuoozr
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the entire contents of `supabase/migrations/20251106000000_update_commitment_statuses.sql`
5. Click "Run" or press Cmd/Ctrl + Enter
6. Verify the migration succeeded

### Option 2: Via Supabase CLI

```bash
# Link to the project (if not already linked)
npx supabase link --project-ref hdrkajhfpqkvnhuuoozr

# Push the migration
npx supabase db push
```

## After Migration

Once the migration is applied:

1. The `subcontracts.status` column will support these values:
   - **Subcontract statuses**: Draft, Out for Bid, Out for Signature, Approved, Complete, Terminated, Void
   - **Purchase Order statuses**: Processing, Submitted, Partially Received, Received, Closed

2. Run "Sync from Procore" in the app to re-sync all commitments with their correct statuses

3. Verify on the Document Tracker tab that statuses now show correctly (not just Draft/Executed)

## Migration File Location
`supabase/migrations/20251106000000_update_commitment_statuses.sql`
