-- Script para arreglar la secuencia de autoincremento de batch_calls
-- Este problema ocurre cuando la secuencia se desincroniza con los IDs existentes

-- 1. Ver el estado actual
SELECT 
    'Estado actual de la secuencia' as info,
    last_value as ultimo_valor_secuencia
FROM batch_calls_id_seq;

-- 2. Ver el ID máximo en la tabla
SELECT 
    'ID máximo en la tabla' as info,
    MAX(id) as id_maximo
FROM batch_calls;

-- 3. Reiniciar la secuencia al valor correcto
-- Esto asegura que la próxima inserción use un ID que no existe
SELECT setval('batch_calls_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM batch_calls), false);

-- 4. Verificar que se arregló
SELECT 
    '✅ Secuencia actualizada' as resultado,
    last_value as nuevo_valor_secuencia
FROM batch_calls_id_seq;

-- Mensaje de confirmación
SELECT '🎉 La secuencia de batch_calls ha sido reparada. Puedes crear nuevas campañas ahora.' as mensaje;

