-- Script para habilitar Supabase Realtime en la tabla calls
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar si la tabla está en la publicación realtime
SELECT 
    schemaname,
    tablename,
    'EXISTS' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'calls';

-- Si no aparece, ejecutar:
-- 2. Agregar la tabla calls a la publicación realtime
ALTER PUBLICATION supabase_realtime ADD TABLE calls;

-- 3. Verificar que se agregó correctamente
SELECT 
    schemaname,
    tablename,
    'ADDED' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'calls';

-- 4. Verificar que Row Level Security está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'calls';

-- Si rls_enabled es false, ejecutar:
-- 5. Habilitar RLS en la tabla calls
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- 6. Verificar políticas existentes
SELECT 
    policyname,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'calls';

-- 7. Crear política para SELECT si no existe (necesaria para realtime)
-- Esta política permite que los usuarios vean solo los calls de su workspace
DO $$
BEGIN
    -- Eliminar política si existe
    DROP POLICY IF EXISTS "Users can view calls from their workspace" ON calls;
    
    -- Crear nueva política
    CREATE POLICY "Users can view calls from their workspace"
    ON calls
    FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id 
            FROM users_new 
            WHERE clerk_user_id = (auth.jwt() ->> 'sub')
        )
    );
    
    RAISE NOTICE '✅ Política de SELECT creada correctamente';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Error al crear política: %', SQLERRM;
END $$;

-- 8. Verificar la configuración final
SELECT 
    '✅ Realtime Configuration for calls table' as status,
    (
        SELECT COUNT(*) 
        FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND tablename = 'calls'
    ) as in_realtime_publication,
    (
        SELECT rowsecurity 
        FROM pg_tables 
        WHERE tablename = 'calls'
    ) as rls_enabled,
    (
        SELECT COUNT(*) 
        FROM pg_policies 
        WHERE tablename = 'calls' 
          AND cmd = 'SELECT'
    ) as select_policies_count;

-- 9. Probar inserción de un registro (para verificar que todo funciona)
-- NOTA: Ajusta workspace_id según tu configuración
-- INSERT INTO calls (
--     workspace_id,
--     phone_from,
--     phone_to,
--     status,
--     interest,
--     type,
--     created_at,
--     updated_at
-- ) VALUES (
--     5,  -- Tu workspace_id
--     '+34111111111',
--     '+34222222222',
--     'lead',
--     'energy',
--     'inbound',
--     NOW(),
--     NOW()
-- ) RETURNING id, phone_from, phone_to, status, created_at;

-- 10. Información adicional útil
SELECT 
    'ℹ️ Additional Info' as info,
    (SELECT COUNT(*) FROM calls) as total_calls,
    (SELECT COUNT(DISTINCT workspace_id) FROM calls) as workspaces_with_calls,
    (SELECT MAX(created_at) FROM calls) as last_call_created;

