-- Script para actualizar agent_id en la tabla calls
-- Busca registros con phone_from específicos y los asigna al agent_id 13

-- Primero, vamos a ver cuántos registros coinciden con esos números
SELECT 
    id,
    phone_from,
    phone_to,
    agent_id,
    created_at,
    status
FROM calls 
WHERE phone_from IN ('+34930347962', '+34881198794', '+34911670356')
ORDER BY created_at DESC;

-- Mostrar el conteo de registros que se van a actualizar
SELECT 
    COUNT(*) as total_records_to_update,
    phone_from,
    COUNT(*) as count_per_number
FROM calls 
WHERE phone_from IN ('+34930347962', '+34881198794', '+34911670356')
GROUP BY phone_from;

-- Actualizar todos los registros que coincidan con esos números
-- y asignarles agent_id = 13
UPDATE calls 
SET 
    agent_id = 13,
    updated_at = NOW()
WHERE phone_from IN ('+34930347962', '+34881198794', '+34911670356');

-- Verificar que la actualización se realizó correctamente
SELECT 
    id,
    phone_from,
    phone_to,
    agent_id,
    created_at,
    updated_at,
    status
FROM calls 
WHERE phone_from IN ('+34930347962', '+34881198794', '+34911670356')
ORDER BY updated_at DESC;

-- Mostrar el resumen final
SELECT 
    COUNT(*) as total_updated_records,
    phone_from,
    COUNT(*) as count_per_number,
    agent_id
FROM calls 
WHERE phone_from IN ('+34930347962', '+34881198794', '+34911670356')
GROUP BY phone_from, agent_id;

