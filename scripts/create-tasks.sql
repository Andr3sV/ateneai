-- Create tasks table (workspace-scoped)
create table if not exists public.tasks (
  id bigserial primary key,
  workspace_id bigint not null references public.workspaces(id) on delete cascade,
  title text not null,
  due_date date,
  assignees jsonb not null default '[]'::jsonb, -- array of {id,name}
  contacts jsonb not null default '[]'::jsonb,  -- array of {id,name}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_workspace on public.tasks(workspace_id);
create index if not exists idx_tasks_due_date on public.tasks(due_date);

-- Trigger for updated_at
create or replace function public.set_updated_at_tasks()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute procedure public.set_updated_at_tasks();


