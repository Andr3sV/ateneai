-- Add campaign-related columns to existing tables (SAFE: only agents)
-- We add phone fields and external_id to the agents table only.

-- Add phone, phone_external_id and external_id columns to agents table
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS phone_external_id TEXT,
ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Add assigned_user_id to calls table to support user assignment on calls
ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS assigned_user_id BIGINT REFERENCES public.users_new(id);

-- Optional index to speed up filtering by assigned user
CREATE INDEX IF NOT EXISTS idx_calls_assigned_user_id ON public.calls(assigned_user_id);

-- Backfill agents in workspace 1 with sample data if missing
UPDATE public.agents 
SET 
  external_id = COALESCE(external_id, 'agent_' || id || '_' || LOWER(REPLACE(name, ' ', '_'))),
  phone = COALESCE(phone, '+34' || LPAD(FLOOR(RANDOM() * 900000000 + 100000000)::TEXT, 9, '0')),
  phone_external_id = COALESCE(phone_external_id, 'phone_' || id || '_' || LOWER(REPLACE(name, ' ', '_')))
WHERE workspace_id = 1;

-- Create a new table for batch calls
CREATE TABLE IF NOT EXISTS public.batch_calls (
    id SERIAL PRIMARY KEY,
    workspace_id INTEGER NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone_external_id TEXT,
    agent_external_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    total_recipients INTEGER DEFAULT 0,
    processed_recipients INTEGER DEFAULT 0,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_batch_calls_workspace_id ON public.batch_calls(workspace_id);
CREATE INDEX IF NOT EXISTS idx_batch_calls_status ON public.batch_calls(status);
CREATE INDEX IF NOT EXISTS idx_batch_calls_created_at ON public.batch_calls(created_at);

-- Create a table for batch call recipients
CREATE TABLE IF NOT EXISTS public.batch_call_recipients (
    id SERIAL PRIMARY KEY,
    batch_call_id INTEGER NOT NULL REFERENCES public.batch_calls(id) ON DELETE CASCADE,
    contact_id INTEGER REFERENCES public.contacts_new(id) ON DELETE SET NULL,
    phone_number TEXT NOT NULL,
    name TEXT,
    dynamic_variables TEXT[] DEFAULT '{}'::text[],
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'calling', 'completed', 'failed')),
    external_call_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for batch call recipients
CREATE INDEX IF NOT EXISTS idx_batch_call_recipients_batch_id ON public.batch_call_recipients(batch_call_id);
CREATE INDEX IF NOT EXISTS idx_batch_call_recipients_status ON public.batch_call_recipients(status);
CREATE INDEX IF NOT EXISTS idx_batch_call_recipients_contact_id ON public.batch_call_recipients(contact_id);

-- Create trigger function for updating updated_at
CREATE OR REPLACE FUNCTION set_updated_at_batch_calls()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_updated_at_batch_call_recipients()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_set_updated_at_batch_calls ON public.batch_calls;
CREATE TRIGGER trigger_set_updated_at_batch_calls
    BEFORE UPDATE ON public.batch_calls
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_batch_calls();

DROP TRIGGER IF EXISTS trigger_set_updated_at_batch_call_recipients ON public.batch_call_recipients;
CREATE TRIGGER trigger_set_updated_at_batch_call_recipients
    BEFORE UPDATE ON public.batch_call_recipients
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_batch_call_recipients();

-- Insert sample data for workspace 1
INSERT INTO public.batch_calls (workspace_id, name, phone_external_id, agent_external_id, status, total_recipients, processed_recipients)
VALUES 
    (1, 'Campaña de Energía Q1', 'phone_energy_campaign', 'agent_cold_energy_call_endesa_v2', 'completed', 150, 150),
    (1, 'Campaña de Alarmas Q2', 'phone_alarm_campaign', 'agent_cold_alarm_call', 'processing', 200, 45),
    (1, 'Campaña de Telecomunicaciones Q3', 'phone_telco_campaign', 'agent_cold_telco_call', 'pending', 100, 0)
ON CONFLICT DO NOTHING;

-- Insert sample recipients for the first campaign
INSERT INTO public.batch_call_recipients (batch_call_id, contact_id, phone_number, name, dynamic_variables, status)
SELECT 
    1,
    c.id,
    c.phone,
    c.name,
    ARRAY['source:sample']::text[],
    CASE 
        WHEN RANDOM() > 0.7 THEN 'completed'
        WHEN RANDOM() > 0.4 THEN 'calling'
        ELSE 'pending'
    END
FROM public.contacts_new c
WHERE c.workspace_id = 1 AND c.phone IS NOT NULL
LIMIT 50
ON CONFLICT DO NOTHING;

-- Update the batch call with the actual count
UPDATE public.batch_calls 
SET total_recipients = (SELECT COUNT(*) FROM public.batch_call_recipients WHERE batch_call_id = 1),
    processed_recipients = (SELECT COUNT(*) FROM public.batch_call_recipients WHERE batch_call_id = 1 AND status IN ('completed', 'calling'))
WHERE id = 1;
