-- Create a configuration table to store settings that PostgreSQL functions can access
CREATE TABLE IF NOT EXISTS system_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table
CREATE POLICY "Service role can manage system config"
  ON system_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert the required configuration values
INSERT INTO system_config (key, value)
VALUES 
  ('supabase_url', 'https://hdrkajhfpqkvnhuuoozr.supabase.co'),
  ('service_role_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkcmthamhmcHFrdm5odXVvb3pyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTkyMTU5NSwiZXhwIjoyMDc3NDk3NTk1fQ.6R1SRRGzCzmk5AKGy2JCHSU0Jzx3_PqNg1Y2p67aQ8k')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Update the process_procore_sync_queue function to read from the config table
CREATE OR REPLACE FUNCTION process_procore_sync_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  queue_item record;
  request_id bigint;
  function_url text;
  service_key text;
BEGIN
  -- Get configuration from system_config table
  SELECT value INTO function_url FROM system_config WHERE key = 'supabase_url';
  SELECT value INTO service_key FROM system_config WHERE key = 'service_role_key';

  IF function_url IS NULL THEN
    RAISE WARNING 'Supabase URL not configured in system_config table';
    RETURN;
  END IF;

  IF service_key IS NULL THEN
    RAISE WARNING 'Service role key not configured in system_config table';
    RETURN;
  END IF;

  function_url := function_url || '/functions/v1/procore-sync-processor';

  -- Process pending queue items (limit to avoid timeout)
  FOR queue_item IN
    SELECT id, user_id
    FROM procore_sync_queue
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT 10
  LOOP
    -- Mark as processing
    UPDATE procore_sync_queue
    SET status = 'processing'
    WHERE id = queue_item.id;

    -- Make HTTP request using pg_net
    SELECT net.http_post(
      url := function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := jsonb_build_object('user_id', queue_item.user_id::text)
    ) INTO request_id;

    RAISE NOTICE 'Triggered sync for user % (request_id: %)', queue_item.user_id, request_id;
  END LOOP;
END;
$$;