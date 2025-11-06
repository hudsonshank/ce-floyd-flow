-- Create a function to automatically create default attachment records for new subcontracts
create or replace function create_default_attachments()
returns trigger
language plpgsql
security definer
as $$
declare
  attachment_type text;
begin
  -- Create the required attachment types (F, G, H, COI, W9) with Missing status
  foreach attachment_type in array array['F', 'G', 'H', 'COI', 'W9']
  loop
    insert into attachments (subcontract_id, type, status)
    values (NEW.id, attachment_type, 'Missing')
    on conflict do nothing; -- In case attachments already exist
  end loop;

  return NEW;
end;
$$;

-- Create trigger to run after a subcontract is inserted
drop trigger if exists trigger_create_default_attachments on subcontracts;
create trigger trigger_create_default_attachments
  after insert on subcontracts
  for each row
  execute function create_default_attachments();

-- Add comment explaining the trigger
comment on function create_default_attachments is
  'Automatically creates default attachment records (F, G, H, COI, W9) with Missing status when a new subcontract is inserted.';
