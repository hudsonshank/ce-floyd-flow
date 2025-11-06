-- Backfill attachment records for existing subcontracts that don't have them
do $$
declare
  subcontract_record record;
  attachment_type text;
begin
  -- Loop through all subcontracts
  for subcontract_record in
    select id from subcontracts
  loop
    -- Create the required attachment types (F, G, H, COI, W9) with Missing status
    foreach attachment_type in array array['F', 'G', 'H', 'COI', 'W9']
    loop
      -- Insert attachment if it doesn't exist
      insert into attachments (subcontract_id, type, status)
      values (subcontract_record.id, attachment_type, 'Missing')
      on conflict do nothing;
    end loop;
  end loop;

  raise notice 'Backfilled attachments for existing subcontracts';
end;
$$;
