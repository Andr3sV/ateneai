-- Verificar el estado actual de la tabla agents
SELECT 
    id, 
    name, 
    email, 
    type, 
    workspace_id,
    created_at
FROM public.agents 
WHERE workspace_id = 1 
ORDER BY id;

-- Verificar si la columna type existe
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'agents' AND column_name = 'type';

-- Si la columna type no existe o está vacía, crearla y poblarla
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS type text;

-- Actualizar agentes existentes del workspace 1 para que sean de tipo 'call'
UPDATE public.agents 
SET type = 'call' 
WHERE workspace_id = 1 AND (type IS NULL OR type = '');

-- Crear índice si no existe
CREATE INDEX IF NOT EXISTS idx_agents_type ON public.agents(type);

-- Verificar el resultado final
SELECT 
    id, 
    name, 
    email, 
    type, 
    workspace_id
FROM public.agents 
WHERE workspace_id = 1 
ORDER BY id;
