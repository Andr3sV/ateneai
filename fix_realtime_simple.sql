-- Script SIMPLE para habilitar Realtime en la tabla calls
-- Ejecutar cada comando UNO POR UNO en Supabase SQL Editor

-- Paso 1: Verificar si la tabla está en la publicación
SELECT 
    'Verificando tabla en publicación...' as paso_1,
    COUNT(*) as esta_en_publicacion
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'calls';

-- Paso 2: Remover la tabla (si está)
-- Si el paso 1 muestra 1, ejecutar esto:
ALTER PUBLICATION supabase_realtime DROP TABLE calls;

-- Paso 3: Esperar 2 segundos
SELECT pg_sleep(2);

-- Paso 4: Agregar la tabla de nuevo
ALTER PUBLICATION supabase_realtime ADD TABLE calls;

-- Paso 5: Configurar REPLICA IDENTITY FULL (CRÍTICO!)
ALTER TABLE calls REPLICA IDENTITY FULL;

-- Paso 6: Verificar configuración
SELECT 
    '✅ Verificación final' as status,
    (
        SELECT COUNT(*) 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND tablename = 'calls'
    ) as en_publicacion,
    (
        SELECT CASE relreplident
            WHEN 'd' THEN 'default'
            WHEN 'n' THEN 'nothing'
            WHEN 'f' THEN 'full ✅'
            WHEN 'i' THEN 'index'
        END
        FROM pg_class 
        WHERE relname = 'calls'
    ) as replica_identity,
    (
        SELECT rowsecurity 
        FROM pg_tables 
        WHERE tablename = 'calls'
    ) as rls_enabled;

-- Paso 7: Verificar primary key
SELECT 
    '✅ Primary Key' as info,
    a.attname as column_name
FROM pg_index i
JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
WHERE i.indrelid = 'calls'::regclass AND i.indisprimary;

-- ✅ RESULTADO ESPERADO:
-- en_publicacion: 1
-- replica_identity: full ✅
-- rls_enabled: true
-- column_name: id

