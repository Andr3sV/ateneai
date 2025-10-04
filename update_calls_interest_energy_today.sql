-- Script para actualizar interest a 'energy' en calls creados hoy (30 de septiembre 2024) CET
-- Busca registros creados hoy y cambia la columna interest a 'energy'

-- Primero, vamos a ver cuántos registros se crearon hoy
SELECT 
    COUNT(*) as total_records_today,
    interest,
    COUNT(*) as count_per_interest
FROM calls 
WHERE DATE(created_at) = '2024-09-30'
GROUP BY interest
ORDER BY interest;

-- Mostrar algunos registros de ejemplo para verificar
SELECT 
    id,
    phone_from,
    phone_to,
    interest,
    created_at,
    status
FROM calls 
WHERE DATE(created_at) = '2024-09-30'
ORDER BY created_at DESC
LIMIT 10;

-- Actualizar todos los registros creados hoy y cambiar interest a 'energy'
UPDATE calls 
SET 
    interest = 'energy',
    updated_at = NOW()
WHERE DATE(created_at) = '2024-09-30';

-- Verificar que la actualización se realizó correctamente
SELECT 
    COUNT(*) as total_updated_records,
    interest,
    COUNT(*) as count_per_interest
FROM calls 
WHERE DATE(created_at) = '2024-09-30'
GROUP BY interest
ORDER BY interest;

-- Mostrar algunos registros actualizados para confirmar
SELECT 
    id,
    phone_from,
    phone_to,
    interest,
    created_at,
    updated_at,
    status
FROM calls 
WHERE DATE(created_at) = '2024-09-30'
ORDER BY updated_at DESC
LIMIT 10;
