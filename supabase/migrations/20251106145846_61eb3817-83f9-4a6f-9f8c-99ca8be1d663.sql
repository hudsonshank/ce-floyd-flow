-- Enable pg_net extension for making HTTP requests from PostgreSQL
create extension if not exists pg_net;

-- Enable pg_cron extension for scheduled tasks
create extension if not exists pg_cron;

-- Create a queue table to track sync requests
create table if not exists procore_sync_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  status text not null default 'pending', -- pending, processing, completed, failed
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text,
  retry_count int not null default 0,
  unique(user_id, status) -- Only one pending/processing request per user
);

-- Enable RLS on the queue table
alter table procore_sync_queue enable row level security;

-- Create policy to allow service role to manage queue
create policy "Service role can manage sync queue"
  on procore_sync_queue
  for all
  to service_role
  using (true)
  with check (true);

-- Create an index on the queue table for better performance
create index if not exists idx_procore_sync_queue_status_user
  on procore_sync_queue(status, user_id, created_at);

-- Create a function that will queue sync requests for all users with OAuth tokens
create or replace function queue_procore_sync_for_all_users()
returns void
language plpgsql
security definer
as $$
declare
  user_record record;
  queue_count int := 0;
begin
  -- Loop through all users who have Procore tokens
  for user_record in
    select distinct user_id
    from oauth_tokens
    where procore_access_token is not null
      and procore_refresh_token is not null
  loop
    -- Add to queue (or update existing pending record)
    insert into procore_sync_queue (user_id, status, created_at)
    values (user_record.user_id, 'pending', now())
    on conflict (user_id, status)
    where status = 'pending'
    do update set created_at = now();

    queue_count := queue_count + 1;
  end loop;

  raise notice 'Queued % users for Procore sync', queue_count;
end;
$$;

-- Create a function to process the sync queue using pg_net
create or replace function process_procore_sync_queue()
returns void
language plpgsql
security definer
as $$
declare
  queue_item record;
  request_id bigint;
  function_url text;
begin
  -- Get the Supabase URL from the environment
  function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/procore-sync-processor';

  -- If URL not configured, try to construct it
  if function_url is null or function_url = '/functions/v1/procore-sync-processor' then
    -- This will need to be set in Supabase dashboard: Database Settings > Vault
    raise warning 'Supabase URL not configured. Set app.settings.supabase_url';
    return;
  end if;

  -- Process pending queue items (limit to avoid timeout)
  for queue_item in
    select id, user_id
    from procore_sync_queue
    where status = 'pending'
    order by created_at asc
    limit 10
  loop
    -- Mark as processing
    update procore_sync_queue
    set status = 'processing'
    where id = queue_item.id;

    -- Make HTTP request using pg_net
    select net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('user_id', queue_item.user_id::text)
    ) into request_id;

    raise notice 'Triggered sync for user % (request_id: %)', queue_item.user_id, request_id;
  end loop;
end;
$$;

-- Schedule queue population every 10 minutes
select cron.schedule(
  'procore-queue-sync-every-10-minutes',
  '*/10 * * * *',  -- Every 10 minutes
  $$select queue_procore_sync_for_all_users()$$
);

-- Schedule queue processing every minute (processes queued items)
select cron.schedule(
  'procore-process-queue-every-minute',
  '* * * * *',  -- Every minute
  $$select process_procore_sync_queue()$$
);

-- Add helpful comments
comment on table procore_sync_queue is
  'Queue for scheduled Procore syncs. Populated every 10 minutes by pg_cron, processed every minute.';

comment on function queue_procore_sync_for_all_users is
  'Adds all users with Procore OAuth tokens to the sync queue. Called by pg_cron every 10 minutes.';

comment on function process_procore_sync_queue is
  'Processes pending items in the sync queue by calling the procore-sync-processor Edge Function. Called by pg_cron every minute.';