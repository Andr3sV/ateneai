-- Crear un nuevo agente para la sección de Calls
INSERT INTO public.agents (name, type, workspace_id, created_at)
VALUES (
    'Agente de Llamadas', 
    'call', 
    1, 
    NOW()
);

-- Crear un segundo agente para la sección de Calls
INSERT INTO public.agents (name, type, workspace_id, created_at)
VALUES (
    'Agente de Ventas', 
    'call', 
    1, 
    NOW()
);

-- Verificar que se crearon correctamente
SELECT 
    id, 
    name, 
    type, 
    workspace_id,
    created_at
FROM public.agents 
WHERE workspace_id = 1 
ORDER BY id;
