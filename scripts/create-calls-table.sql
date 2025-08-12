-- Create calls table for workspace-based schema
create table if not exists public.calls (
  id bigint generated always as identity primary key,
  workspace_id integer not null references public.workspaces(id) on delete cascade,
  contact_id integer references public.contacts_new(id) on delete set null,
  agent_id integer references public.agents(id) on delete set null,
  phone_from text,
  phone_to text,
  city text,
  status text check (status in ('lead','mql','client')),
  interest text check (interest in ('energy','alarm','telco')),
  type text check (type in ('outbound','inbound')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_calls_workspace on public.calls(workspace_id);
create index if not exists idx_calls_created_at on public.calls(created_at);
create index if not exists idx_calls_contact on public.calls(contact_id);
create index if not exists idx_calls_agent on public.calls(agent_id);
create index if not exists idx_calls_status on public.calls(status);
create index if not exists idx_calls_interest on public.calls(interest);
create index if not exists idx_calls_type on public.calls(type);

-- Trigger function to update updated_at (scoped to calls)
create or replace function public.set_updated_at_calls()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_calls_updated_at on public.calls;
create trigger trg_calls_updated_at
before update on public.calls
for each row execute procedure public.set_updated_at_calls();

-- Insert sample data for workspace 1 (only if workspace 1 exists)
insert into public.calls (workspace_id, contact_id, agent_id, phone_from, phone_to, city, status, interest, type, created_at)
select 
  1 as workspace_id,
  c.id as contact_id,
  a.id as agent_id,
  '+34612345678' as phone_from,
  c.phone as phone_to,
  c.country as city,
  case 
    when c.id % 3 = 0 then 'lead'
    when c.id % 3 = 1 then 'mql'
    else 'client'
  end as status,
  case 
    when c.id % 3 = 0 then 'energy'
    when c.id % 3 = 1 then 'alarm'
    else 'telco'
  end as interest,
  case 
    when c.id % 2 = 0 then 'outbound'
    else 'inbound'
  end as type,
  c.created_at - interval '1 day' * (c.id % 30) as created_at
from public.contacts_new c
cross join lateral (
  select id from public.agents 
  where workspace_id = 1 
  limit 1
) a
where c.workspace_id = 1
  and exists (select 1 from public.workspaces where id = 1)
  and not exists (select 1 from public.calls where workspace_id = 1)
limit 20;

-- Add type column to agents if it doesn't exist (for workspace 1)
alter table public.agents add column if not exists type text;

-- Update existing agents in workspace 1 to have type 'call' if not set
update public.agents 
set type = 'call' 
where workspace_id = 1 
  and (type is null or type = '');

-- Create index on agents.type if it doesn't exist
create index if not exists idx_agents_type on public.agents(type);


