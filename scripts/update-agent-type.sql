-- Actualizar el agente existente del workspace 1 para que sea de tipo 'call'
UPDATE public.agents 
SET type = 'call' 
WHERE workspace_id = 1 AND name = 'atenea';

-- Verificar el resultado
SELECT 
    id, 
    name, 
    type, 
    workspace_id
FROM public.agents 
WHERE workspace_id = 1;
