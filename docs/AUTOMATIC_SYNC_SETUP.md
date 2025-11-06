# Automatic Procore Sync Setup

This document explains how the automatic Procore sync works and how to configure it.

## Overview

The system automatically syncs data from Procore every 10 minutes using a combination of:

1. **pg_cron** - PostgreSQL cron scheduler (runs scheduled tasks)
2. **pg_net** - PostgreSQL HTTP client (makes requests to Edge Functions)
3. **procore_sync_queue** - Database table that queues sync requests
4. **procore-sync-processor** - Edge Function that processes the queue

## Architecture

```
Every 10 minutes:
  pg_cron → queue_procore_sync_for_all_users() → Adds users to queue

Every 1 minute:
  pg_cron → process_procore_sync_queue() → Processes queue items
    → pg_net.http_post() → Calls procore-sync-processor Edge Function
      → Calls procore-sync Edge Function for each user
        → Syncs data from Procore API
```

## Setup Instructions

### 1. Enable Required Extensions

The migration file `20251106150000_setup_procore_sync_cron.sql` automatically enables:
- `pg_cron` (for scheduling)
- `pg_net` (for HTTP requests)

### 2. Configure Supabase Settings

You need to set two configuration values in your Supabase project:

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to **Database** → **Vault** → **Secrets**
2. Add these secrets:
   - `app.settings.supabase_url` = `https://your-project.supabase.co`
   - `app.settings.service_role_key` = `your-service-role-key`

**Option B: Using SQL**

Run this in the SQL Editor (replace with your actual values):

```sql
-- Set Supabase URL
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://hdrkajhfpqkvnhuuoozr.supabase.co';

-- Set Service Role Key (keep this secret!)
ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key-here';
```

### 3. Deploy the Edge Function

Deploy the `procore-sync-processor` function:

```bash
supabase functions deploy procore-sync-processor
```

### 4. Run the Migration

```bash
supabase db push
```

Or apply it directly in the Supabase SQL Editor.

### 5. Verify Setup

Check that cron jobs are scheduled:

```sql
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname LIKE 'procore%';
```

You should see:
- `procore-queue-sync-every-10-minutes` (runs every 10 minutes)
- `procore-process-queue-every-minute` (runs every minute)

## How It Works

### Queue Population (Every 10 Minutes)

The `queue_procore_sync_for_all_users()` function:
1. Finds all users with Procore OAuth tokens
2. Adds them to the `procore_sync_queue` table with status = 'pending'
3. Uses `ON CONFLICT` to avoid duplicate pending requests

### Queue Processing (Every Minute)

The `process_procore_sync_queue()` function:
1. Finds up to 10 pending items in the queue
2. Marks them as 'processing'
3. Uses `pg_net.http_post()` to call the `procore-sync-processor` Edge Function
4. The Edge Function then calls `procore-sync` for each user

### The procore-sync-processor Edge Function

This function:
1. Receives a `user_id` in the request body
2. Calls the `procore-sync` Edge Function with that user's credentials
3. Updates the queue status to 'completed' or 'failed'
4. Logs any errors

## Monitoring

### Check Queue Status

```sql
SELECT
  status,
  count(*) as count,
  max(created_at) as last_created
FROM procore_sync_queue
GROUP BY status;
```

### View Recent Sync History

```sql
SELECT
  user_id,
  status,
  created_at,
  completed_at,
  error_message
FROM procore_sync_queue
ORDER BY created_at DESC
LIMIT 20;
```

### Check Cron Job History

```sql
SELECT
  jobid,
  jobname,
  runid,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobname LIKE 'procore%'
ORDER BY start_time DESC
LIMIT 20;
```

## Manual Triggering

### Manually Queue All Users

```sql
SELECT queue_procore_sync_for_all_users();
```

### Manually Process Queue

```sql
SELECT process_procore_sync_queue();
```

### Manually Sync a Specific User

Call the `procore-sync-processor` Edge Function directly:

```bash
curl -X POST \
  https://hdrkajhfpqkvnhuuoozr.supabase.co/functions/v1/procore-sync-processor \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user-uuid-here"}'
```

## Troubleshooting

### Syncs Not Running

1. **Check if cron jobs are scheduled:**
   ```sql
   SELECT * FROM cron.job WHERE jobname LIKE 'procore%';
   ```

2. **Check if pg_cron extension is enabled:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

3. **Check cron job logs:**
   ```sql
   SELECT * FROM cron.job_run_details
   WHERE jobname LIKE 'procore%'
   ORDER BY start_time DESC
   LIMIT 10;
   ```

### Queue Items Stuck in 'pending' or 'processing'

Reset stuck items:

```sql
-- Reset items that have been processing for more than 10 minutes
UPDATE procore_sync_queue
SET status = 'pending'
WHERE status = 'processing'
  AND created_at < now() - interval '10 minutes';
```

### Clear Old Queue Items

```sql
-- Delete completed/failed items older than 7 days
DELETE FROM procore_sync_queue
WHERE status IN ('completed', 'failed')
  AND completed_at < now() - interval '7 days';
```

## Adjusting Sync Frequency

To change from 10 minutes to a different interval:

```sql
-- First, unschedule the existing job
SELECT cron.unschedule('procore-queue-sync-every-10-minutes');

-- Then, reschedule with new interval (e.g., every 5 minutes)
SELECT cron.schedule(
  'procore-queue-sync-every-5-minutes',
  '*/5 * * * *',
  $$SELECT queue_procore_sync_for_all_users()$$
);
```

## Disabling Automatic Sync

To temporarily disable automatic syncing:

```sql
-- Disable both cron jobs
SELECT cron.unschedule('procore-queue-sync-every-10-minutes');
SELECT cron.unschedule('procore-process-queue-every-minute');
```

To re-enable, run the schedule commands again from the migration file.

## Notes

- **Rate Limits**: Procore API has rate limits. The current setup processes max 10 users per minute to avoid hitting limits.
- **Token Refresh**: The `procore-sync` function automatically refreshes expired tokens.
- **Error Handling**: Failed syncs are logged in the queue table with error messages.
- **Queue Cleanup**: Consider setting up a cleanup job to delete old completed/failed queue items.

## Future Enhancements

- Add retry logic for failed syncs (currently you can manually retry)
- Add email notifications for sync failures
- Create a UI dashboard to view sync status
- Implement exponential backoff for repeated failures
