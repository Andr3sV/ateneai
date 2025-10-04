-- Script para actualizar assigned_user_id a 17 en calls con phone_from = '+34911677200'
-- Busca registros con phone_from = '+34911677200' y les asigna assigned_user_id = 17

-- Primero, vamos a ver cuántos registros tienen phone_from = '+34911677200'
SELECT 
    COUNT(*) as total_records_with_phone,
    assigned_user_id,
    COUNT(*) as count_per_assigned_user
FROM calls 
WHERE phone_from = '+34911677200'
GROUP BY assigned_user_id
ORDER BY assigned_user_id;

-- Mostrar algunos registros de ejemplo para verificar
SELECT 
    id,
    phone_from,
    phone_to,
    agent_id,
    assigned_user_id,
    interest,
    created_at,
    status
FROM calls 
WHERE phone_from = '+34911677200'
ORDER BY created_at DESC
LIMIT 10;

-- Actualizar todos los registros con phone_from = '+34911677200', asignar assigned_user_id = 17
UPDATE calls 
SET 
    assigned_user_id = 17,
    updated_at = NOW()
WHERE phone_from = '+34911677200';

-- Verificar que la actualización se realizó correctamente
SELECT 
    COUNT(*) as total_updated_records,
    phone_from,
    assigned_user_id,
    COUNT(*) as count_per_assigned_user
FROM calls 
WHERE phone_from = '+34911677200'
GROUP BY phone_from, assigned_user_id
ORDER BY phone_from, assigned_user_id;

-- Mostrar algunos registros actualizados para confirmar
SELECT 
    id,
    phone_from,
    phone_to,
    agent_id,
    assigned_user_id,
    interest,
    created_at,
    updated_at,
    status
FROM calls 
WHERE phone_from = '+34911677200'
ORDER BY updated_at DESC
LIMIT 10;

