-- Script para actualizar assigned_user_id a 17 en calls con agent_id = 14 del workspace 5
-- Busca registros con agent_id = 14 y workspace_id = 5, y les asigna assigned_user_id = 17

-- Primero, vamos a ver cuántos registros tienen agent_id = 14 en workspace 5
SELECT 
    COUNT(*) as total_records_with_agent_14,
    assigned_user_id,
    COUNT(*) as count_per_assigned_user
FROM calls 
WHERE agent_id = 14 AND workspace_id = 5
GROUP BY assigned_user_id
ORDER BY assigned_user_id;

-- Mostrar algunos registros de ejemplo para verificar
SELECT 
    id,
    phone_from,
    phone_to,
    agent_id,
    assigned_user_id,
    created_at,
    status
FROM calls 
WHERE agent_id = 14 AND workspace_id = 5
ORDER BY created_at DESC
LIMIT 10;

-- Actualizar todos los registros con agent_id = 14 y asignar assigned_user_id = 17
UPDATE calls 
SET 
    assigned_user_id = 17,
    updated_at = NOW()
WHERE agent_id = 14 AND workspace_id = 5;

-- Verificar que la actualización se realizó correctamente
SELECT 
    COUNT(*) as total_updated_records,
    agent_id,
    assigned_user_id,
    COUNT(*) as count_per_assignment
FROM calls 
WHERE agent_id = 14 AND workspace_id = 5
GROUP BY agent_id, assigned_user_id
ORDER BY agent_id, assigned_user_id;

-- Mostrar algunos registros actualizados para confirmar
SELECT 
    id,
    phone_from,
    phone_to,
    agent_id,
    assigned_user_id,
    created_at,
    updated_at,
    status
FROM calls 
WHERE agent_id = 14 AND workspace_id = 5
ORDER BY updated_at DESC
LIMIT 10;
