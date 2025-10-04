-- Script para REINICIAR completamente la publicación realtime de la tabla calls
-- Este script corrige el problema donde el primer UPDATE no genera eventos

-- 1. REMOVER la tabla de la publicación realtime (si existe)
DO $$
BEGIN
    -- Verificar si la tabla está en la publicación antes de removerla
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'calls'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE calls;
        RAISE NOTICE '✅ Tabla calls removida de supabase_realtime';
    ELSE
        RAISE NOTICE 'ℹ️ La tabla calls no estaba en la publicación';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Error al remover tabla: %', SQLERRM;
END $$;

-- 2. Pequeña pausa (simulada con una consulta)
SELECT pg_sleep(1);

-- 3. AGREGAR la tabla de nuevo a la publicación realtime
ALTER PUBLICATION supabase_realtime ADD TABLE calls;

-- 4. Verificar que se agregó correctamente
SELECT 
    '✅ VERIFICACIÓN: Tabla calls en supabase_realtime' as status,
    COUNT(*) as count
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'calls';

-- 5. IMPORTANTE: Verificar que la réplica identity esté configurada correctamente
-- Esto es CRÍTICO para que Supabase pueda rastrear los cambios
SELECT 
    schemaname,
    tablename,
    CASE relreplident
        WHEN 'd' THEN 'default (primary key)'
        WHEN 'n' THEN 'nothing'
        WHEN 'f' THEN 'full'
        WHEN 'i' THEN 'index'
    END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_tables t ON t.schemaname = n.nspname AND t.tablename = c.relname
WHERE c.relname = 'calls';

-- 6. Si replica_identity NO es 'full' o 'default (primary key)', ejecutar esto:
-- CAMBIAR replica identity a FULL (esto permite rastrear todos los cambios)
ALTER TABLE calls REPLICA IDENTITY FULL;

-- 7. Verificar de nuevo
SELECT 
    '✅ VERIFICACIÓN: Replica Identity configurada' as status,
    CASE relreplident
        WHEN 'd' THEN 'default (primary key)'
        WHEN 'n' THEN 'nothing'
        WHEN 'f' THEN 'full'
        WHEN 'i' THEN 'index'
    END as replica_identity
FROM pg_class 
WHERE relname = 'calls';

-- 8. Verificar que existe una primary key (necesaria para realtime)
SELECT 
    '✅ VERIFICACIÓN: Primary Key' as status,
    a.attname as column_name,
    format_type(a.atttypid, a.atttypmod) as data_type
FROM pg_index i
JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
WHERE i.indrelid = 'calls'::regclass AND i.indisprimary;

-- 9. Verificar estado de la tabla
SELECT 
    '📊 INFO: Estado de la tabla calls' as info,
    (SELECT COUNT(*) FROM calls) as total_rows,
    (SELECT COUNT(DISTINCT workspace_id) FROM calls) as distinct_workspaces,
    (SELECT MAX(updated_at) FROM calls) as last_update;

-- 10. NOTA IMPORTANTE: Después de ejecutar este script, 
-- es posible que necesites:
-- a) Refrescar la conexión del cliente Supabase en el frontend
-- b) Esperar 5-10 segundos para que la réplica se sincronice
-- c) Hacer un hard refresh (Cmd+Shift+R o Ctrl+Shift+R) en el navegador

SELECT '✅ Script completado. Por favor:
1. Refresca el navegador (Cmd+Shift+R o Ctrl+Shift+R)
2. Espera 5-10 segundos
3. Intenta actualizar un registro en Supabase
4. Verifica los logs en console del navegador' as next_steps;

