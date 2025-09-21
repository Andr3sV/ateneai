-- Tabla para almacenar los leads del formulario de demo
CREATE TABLE IF NOT EXISTS demo_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Información personal
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  
  -- Información de empresa
  company TEXT NOT NULL,
  industry TEXT NOT NULL,
  team_size TEXT,
  
  -- Objetivos
  current_challenges TEXT,
  expected_results TEXT,
  
  -- Metadatos
  user_id TEXT, -- Si viene de Clerk
  source TEXT DEFAULT 'demo_form',
  status TEXT DEFAULT 'new' -- new, contacted, qualified, etc.
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_demo_leads_email ON demo_leads(email);
CREATE INDEX IF NOT EXISTS idx_demo_leads_company ON demo_leads(company);
CREATE INDEX IF NOT EXISTS idx_demo_leads_created_at ON demo_leads(created_at);
CREATE INDEX IF NOT EXISTS idx_demo_leads_status ON demo_leads(status);

-- RLS (Row Level Security) - opcional
ALTER TABLE demo_leads ENABLE ROW LEVEL SECURITY;

-- Política para que solo usuarios autenticados puedan insertar
CREATE POLICY "Users can insert demo leads" ON demo_leads
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
